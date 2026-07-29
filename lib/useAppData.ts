"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppData, TimeEntry } from "./types";
import {
  calcAmountExcludingTax,
  calcEffectiveHourlyRate,
  createClient,
  createEntry,
  createProject,
  createTask,
  createTaskGroup,
  loadData,
  saveData,
} from "./storage";

export function useAppData() {
  const [data, setData] = useState<AppData>({ projects: [], tasks: [], taskGroups: [], clients: [], entries: [] });
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // 一時停止中に積算した秒数
  const pausedSecondsRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const d = loadData();
    setData(d);
    const running = d.entries.find((e) => e.endTime === null);
    if (running) {
      setActiveEntry(running);
      setElapsed(Math.floor((Date.now() - new Date(running.startTime).getTime()) / 1000));
    }
  }, []);

  useEffect(() => {
    if (!activeEntry || isPaused) return;
    const id = setInterval(() => {
      const raw = Math.floor((Date.now() - new Date(activeEntry.startTime).getTime()) / 1000);
      setElapsed(raw - pausedSecondsRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [activeEntry, isPaused]);

  const persist = useCallback((next: AppData) => {
    setData(next);
    saveData(next);
  }, []);

  const addProject = useCallback(
    (
      name: string,
      contractAmount: number,
      color: string,
      taxIncluded: boolean = true,
      clientId: string | null = null,
      taskIds: string[] = []
    ) => {
      const p = createProject(name, contractAmount, color, taxIncluded, clientId, taskIds);
      persist({ ...data, projects: [...data.projects, p] });
      return p;
    },
    [data, persist]
  );

  const updateProject = useCallback(
    (
      id: string,
      name: string,
      contractAmount: number,
      color: string,
      taxIncluded: boolean = true,
      clientId: string | null = null,
      taskIds: string[] = []
    ) => {
      persist({
        ...data,
        projects: data.projects.map((p) =>
          p.id === id ? { ...p, name, contractAmount, color, taxIncluded, clientId, taskIds } : p
        ),
      });
    },
    [data, persist]
  );

  const toggleProjectComplete = useCallback(
    (id: string) => {
      persist({
        ...data,
        projects: data.projects.map((p) =>
          p.id === id ? { ...p, completedAt: p.completedAt ? null : new Date().toISOString() } : p
        ),
      });
    },
    [data, persist]
  );

  const addClient = useCallback(
    (name: string) => {
      const c = createClient(name);
      persist({ ...data, clients: [...(data.clients ?? []), c] });
      return c;
    },
    [data, persist]
  );

  const renameClient = useCallback(
    (id: string, name: string) => {
      persist({ ...data, clients: (data.clients ?? []).map((c) => c.id === id ? { ...c, name } : c) });
    },
    [data, persist]
  );

  const deleteClient = useCallback(
    (id: string) => {
      persist({
        ...data,
        clients: (data.clients ?? []).filter((c) => c.id !== id),
        projects: data.projects.map((p) => p.clientId === id ? { ...p, clientId: null } : p),
      });
    },
    [data, persist]
  );

  const deleteProject = useCallback(
    (id: string) => {
      persist({
        ...data,
        projects: data.projects.filter((p) => p.id !== id),
        entries: data.entries.filter((e) => e.projectId !== id),
      });
    },
    [data, persist]
  );

  const addTask = useCallback(
    (name: string) => {
      const t = createTask(name);
      persist({ ...data, tasks: [...data.tasks, t] });
      return t;
    },
    [data, persist]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      persist({
        ...data,
        tasks: data.tasks.filter((t) => t.id !== taskId),
        taskGroups: (data.taskGroups ?? []).map((g) => ({ ...g, taskIds: g.taskIds.filter((id) => id !== taskId) })),
      });
    },
    [data, persist]
  );

  const addTaskGroup = useCallback(
    (name: string) => {
      const g = createTaskGroup(name);
      persist({ ...data, taskGroups: [...(data.taskGroups ?? []), g] });
      return g;
    },
    [data, persist]
  );

  const deleteTaskGroup = useCallback(
    (groupId: string) => {
      persist({ ...data, taskGroups: (data.taskGroups ?? []).filter((g) => g.id !== groupId) });
    },
    [data, persist]
  );

  const addTasksToGroup = useCallback(
    (groupId: string, taskIds: string[]) => {
      persist({
        ...data,
        taskGroups: (data.taskGroups ?? []).map((g) =>
          g.id === groupId
            ? { ...g, taskIds: [...g.taskIds, ...taskIds.filter((id) => !g.taskIds.includes(id))] }
            : g
        ),
      });
    },
    [data, persist]
  );

  const renameTask = useCallback(
    (taskId: string, name: string) => {
      persist({ ...data, tasks: data.tasks.map((t) => t.id === taskId ? { ...t, name } : t) });
    },
    [data, persist]
  );

  const renameTaskGroup = useCallback(
    (groupId: string, name: string) => {
      persist({ ...data, taskGroups: (data.taskGroups ?? []).map((g) => g.id === groupId ? { ...g, name } : g) });
    },
    [data, persist]
  );

  const removeTaskFromGroup = useCallback(
    (groupId: string, taskId: string) => {
      persist({
        ...data,
        taskGroups: (data.taskGroups ?? []).map((g) =>
          g.id === groupId ? { ...g, taskIds: g.taskIds.filter((id) => id !== taskId) } : g
        ),
      });
    },
    [data, persist]
  );

  const startTimer = useCallback(
    (projectId: string | null, taskId: string | null, note: string) => {
      if (activeEntry) return;
      const entry = createEntry(projectId, taskId, note);
      pausedSecondsRef.current = 0;
      pausedAtRef.current = null;
      persist({ ...data, entries: [...data.entries, entry] });
      setActiveEntry(entry);
      setIsPaused(false);
      setElapsed(0);
    },
    [activeEntry, data, persist]
  );

  const pauseTimer = useCallback(() => {
    if (!activeEntry || isPaused) return;
    pausedAtRef.current = Date.now();
    setIsPaused(true);
  }, [activeEntry, isPaused]);

  const resumeTimer = useCallback(() => {
    if (!activeEntry || !isPaused || pausedAtRef.current === null) return;
    pausedSecondsRef.current += Math.floor((Date.now() - pausedAtRef.current) / 1000);
    pausedAtRef.current = null;
    setIsPaused(false);
  }, [activeEntry, isPaused]);

  const stopTimer = useCallback((): string | null => {
    if (!activeEntry) return null;
    let totalPaused = pausedSecondsRef.current;
    if (isPaused && pausedAtRef.current !== null) {
      totalPaused += Math.floor((Date.now() - pausedAtRef.current) / 1000);
    }
    const now = new Date().toISOString();
    const rawDuration = Math.floor((Date.now() - new Date(activeEntry.startTime).getTime()) / 1000);
    const duration = rawDuration - totalPaused;
    const updated = { ...activeEntry, endTime: now, durationSeconds: Math.max(0, duration), pausedSeconds: totalPaused };
    persist({ ...data, entries: data.entries.map((e) => (e.id === activeEntry.id ? updated : e)) });
    const stoppedId = activeEntry.id;
    const hadProject = !!activeEntry.projectId;
    setActiveEntry(null);
    setIsPaused(false);
    pausedSecondsRef.current = 0;
    pausedAtRef.current = null;
    setElapsed(0);
    // 案件未割り当ての場合はIDを返して呼び元でモーダルを出す
    return hadProject ? null : stoppedId;
  }, [activeEntry, isPaused, data, persist]);

  const assignEntry = useCallback(
    (id: string, projectId: string, taskId: string, note: string) => {
      persist({
        ...data,
        entries: data.entries.map((e) =>
          e.id === id ? { ...e, projectId, taskId, note: note || e.note } : e
        ),
      });
    },
    [data, persist]
  );

  const updateEntry = useCallback(
    (id: string, projectId: string | null, taskId: string | null, date: string, startTime: string, endTime: string, note: string, pausedSeconds?: number) => {
      const start = new Date(`${date}T${startTime}`);
      let end = new Date(`${date}T${endTime}`);
      // 終了時刻が開始時刻以前なら日を跨いだとみなす
      if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      const startISO = start.toISOString();
      const endISO = end.toISOString();
      const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
      persist({
        ...data,
        entries: data.entries.map((e) =>
          e.id === id ? { ...e, projectId, taskId, date, startTime: startISO, endTime: endISO, durationSeconds, note, pausedSeconds: pausedSeconds ?? e.pausedSeconds } : e
        ),
      });
    },
    [data, persist]
  );

  const addManualEntry = useCallback(
    (projectId: string | null, taskId: string | null, date: string, startTime: string, endTime: string, note: string) => {
      const start = new Date(`${date}T${startTime}`);
      let end = new Date(`${date}T${endTime}`);
      // 終了時刻が開始時刻以前なら日を跨いだとみなす
      if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      const startISO = start.toISOString();
      const endISO = end.toISOString();
      const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
      const entry = {
        id: crypto.randomUUID(),
        projectId,
        taskId,
        startTime: startISO,
        endTime: endISO,
        durationSeconds,
        note,
        date,
      };
      persist({ ...data, entries: [...data.entries, entry] });
    },
    [data, persist]
  );

  const deleteEntry = useCallback(
    (id: string) => {
      persist({ ...data, entries: data.entries.filter((e) => e.id !== id) });
    },
    [data, persist]
  );

  const getProjectTotalSeconds = useCallback(
    (projectId: string) => {
      return data.entries
        .filter((e) => e.projectId === projectId && e.endTime !== null)
        .reduce((sum, e) => sum + e.durationSeconds, 0);
    },
    [data]
  );

  const getTaskTotalSeconds = useCallback(
    (taskId: string) => {
      return data.entries
        .filter((e) => e.taskId === taskId && e.endTime !== null)
        .reduce((sum, e) => sum + e.durationSeconds, 0);
    },
    [data]
  );

  const getProjectTaskBreakdown = useCallback(
    (projectId: string) => {
      const byTask: Record<string, { taskName: string; seconds: number }> = {};
      for (const e of data.entries) {
        if (e.projectId !== projectId || e.endTime === null || !e.taskId) continue;
        const task = data.tasks.find((t) => t.id === e.taskId);
        if (!task) continue;
        if (!byTask[e.taskId]) byTask[e.taskId] = { taskName: task.name, seconds: 0 };
        byTask[e.taskId].seconds += e.durationSeconds;
      }
      return Object.values(byTask).sort((a, b) => b.seconds - a.seconds);
    },
    [data]
  );

  const getMonthlySummary = useCallback(
    (year: number, month: number) => {
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      const monthEntries = data.entries.filter(
        (e) => e.date.startsWith(prefix) && e.endTime !== null
      );
      const byProject: Record<string, {
        seconds: number; contractAmount: number; effectiveRate: number;
        name: string; color: string;
        byTask: Record<string, { taskName: string; seconds: number }>;
      }> = {};
      for (const e of monthEntries) {
        const project = data.projects.find((p) => p.id === e.projectId);
        const task = data.tasks.find((t) => t.id === e.taskId);
        if (!project || !e.projectId) continue;
        if (!byProject[e.projectId]) {
          byProject[e.projectId] = {
            seconds: 0, contractAmount: project.contractAmount, effectiveRate: 0,
            name: project.name, color: project.color, byTask: {},
          };
        }
        byProject[e.projectId].seconds += e.durationSeconds;
        if (task && e.taskId) {
          if (!byProject[e.projectId].byTask[e.taskId]) {
            byProject[e.projectId].byTask[e.taskId] = { taskName: task.name, seconds: 0 };
          }
          byProject[e.projectId].byTask[e.taskId].seconds += e.durationSeconds;
        }
      }
      // 時給は案件の全期間合計時間・税抜金額で計算（月跨ぎ対応）
      for (const [projectId, row] of Object.entries(byProject)) {
        const totalSeconds = data.entries
          .filter((e) => e.projectId === projectId && e.endTime !== null)
          .reduce((sum, e) => sum + e.durationSeconds, 0);
        const project = data.projects.find((p) => p.id === projectId);
        const excludingTax = project ? calcAmountExcludingTax(project.contractAmount, project.taxIncluded) : row.contractAmount;
        row.effectiveRate = calcEffectiveHourlyRate(totalSeconds, excludingTax);
      }

      // 契約金額合計は「その月に完了した案件」だけを対象にする（複数月にまたがる案件の二重計上を防ぐ）
      const completedThisMonth = data.projects.filter(
        (p) => p.completedAt && p.completedAt.slice(0, 7) === prefix
      );
      const completedContractTotal = completedThisMonth.reduce((sum, p) => sum + p.contractAmount, 0);
      const completedContractTotalExcludingTax = completedThisMonth.reduce(
        (sum, p) => sum + calcAmountExcludingTax(p.contractAmount, p.taxIncluded), 0
      );

      return { byProject, entries: monthEntries, completedContractTotal, completedContractTotalExcludingTax, completedCount: completedThisMonth.length };
    },
    [data]
  );

  const getProjectSummaries = useCallback(() => {
    return data.projects.map((p) => {
      const projectEntries = data.entries.filter((e) => e.projectId === p.id && e.endTime !== null);
      const totalSeconds = projectEntries.reduce((sum, e) => sum + e.durationSeconds, 0);
      const excludingTax = calcAmountExcludingTax(p.contractAmount, p.taxIncluded);
      const effectiveRate = calcEffectiveHourlyRate(totalSeconds, excludingTax);
      const byTask: Record<string, { taskName: string; seconds: number }> = {};
      for (const e of projectEntries) {
        if (!e.taskId) continue;
        const task = data.tasks.find((t) => t.id === e.taskId);
        if (!task) continue;
        if (!byTask[e.taskId]) byTask[e.taskId] = { taskName: task.name, seconds: 0 };
        byTask[e.taskId].seconds += e.durationSeconds;
      }
      return {
        id: p.id, name: p.name, color: p.color,
        contractAmount: p.contractAmount, excludingTaxAmount: excludingTax,
        totalSeconds, effectiveRate, byTask,
        completedAt: p.completedAt ?? null,
      };
    }).filter((p) => p.totalSeconds > 0 || p.contractAmount > 0);
  }, [data]);

  return {
    data,
    activeEntry,
    elapsed,
    isPaused,
    addProject,
    deleteProject,
    toggleProjectComplete,
    addClient,
    renameClient,
    deleteClient,
    addTask,
    deleteTask,
    addTaskGroup,
    deleteTaskGroup,
    addTasksToGroup,
    removeTaskFromGroup,
    renameTask,
    renameTaskGroup,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    addManualEntry,
    updateProject,
    updateEntry,
    deleteEntry,
    getProjectTotalSeconds,
    getTaskTotalSeconds,
    getProjectTaskBreakdown,
    assignEntry,
    getMonthlySummary,
    getProjectSummaries,
  };
}
