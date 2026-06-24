"use client";

import { useCallback, useEffect, useState } from "react";
import { AppData, TimeEntry } from "./types";
import {
  calcEffectiveHourlyRate,
  createEntry,
  createProject,
  createTask,
  loadData,
  saveData,
} from "./storage";

export function useAppData() {
  const [data, setData] = useState<AppData>({ projects: [], tasks: [], entries: [] });
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);

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
    if (!activeEntry) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(activeEntry.startTime).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [activeEntry]);

  const persist = useCallback((next: AppData) => {
    setData(next);
    saveData(next);
  }, []);

  const addProject = useCallback(
    (name: string, contractAmount: number, color: string) => {
      const p = createProject(name, contractAmount, color);
      persist({ ...data, projects: [...data.projects, p] });
      return p;
    },
    [data, persist]
  );

  const deleteProject = useCallback(
    (id: string) => {
      persist({
        projects: data.projects.filter((p) => p.id !== id),
        tasks: data.tasks.filter((t) => t.projectId !== id),
        entries: data.entries.filter((e) => e.projectId !== id),
      });
    },
    [data, persist]
  );

  const addTask = useCallback(
    (projectId: string, name: string) => {
      const t = createTask(projectId, name);
      persist({ ...data, tasks: [...data.tasks, t] });
      return t;
    },
    [data, persist]
  );

  const startTimer = useCallback(
    (projectId: string, taskId: string, note: string) => {
      if (activeEntry) return;
      const entry = createEntry(projectId, taskId, note);
      persist({ ...data, entries: [...data.entries, entry] });
      setActiveEntry(entry);
      setElapsed(0);
    },
    [activeEntry, data, persist]
  );

  const stopTimer = useCallback(() => {
    if (!activeEntry) return;
    const now = new Date().toISOString();
    const duration = Math.floor((Date.now() - new Date(activeEntry.startTime).getTime()) / 1000);
    const updated = { ...activeEntry, endTime: now, durationSeconds: duration };
    persist({ ...data, entries: data.entries.map((e) => (e.id === activeEntry.id ? updated : e)) });
    setActiveEntry(null);
    setElapsed(0);
  }, [activeEntry, data, persist]);

  const addManualEntry = useCallback(
    (projectId: string, taskId: string, date: string, startTime: string, endTime: string, note: string) => {
      const startISO = new Date(`${date}T${startTime}`).toISOString();
      const endISO = new Date(`${date}T${endTime}`).toISOString();
      const durationSeconds = Math.floor((new Date(endISO).getTime() - new Date(startISO).getTime()) / 1000);
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

  // 案件ごとの合計作業時間を返す
  const getProjectTotalSeconds = useCallback(
    (projectId: string) => {
      return data.entries
        .filter((e) => e.projectId === projectId && e.endTime !== null)
        .reduce((sum, e) => sum + e.durationSeconds, 0);
    },
    [data]
  );

  // 月次集計（案件ごとの作業時間＋実質時給）
  const getMonthlySummary = useCallback(
    (year: number, month: number) => {
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      const monthEntries = data.entries.filter(
        (e) => e.date.startsWith(prefix) && e.endTime !== null
      );
      const byProject: Record<string, { seconds: number; contractAmount: number; effectiveRate: number; name: string; color: string }> = {};
      for (const e of monthEntries) {
        const project = data.projects.find((p) => p.id === e.projectId);
        if (!project) continue;
        if (!byProject[e.projectId]) {
          byProject[e.projectId] = {
            seconds: 0,
            contractAmount: project.contractAmount,
            effectiveRate: 0,
            name: project.name,
            color: project.color,
          };
        }
        byProject[e.projectId].seconds += e.durationSeconds;
      }
      // 実質時給を計算
      for (const key of Object.keys(byProject)) {
        const row = byProject[key];
        row.effectiveRate = calcEffectiveHourlyRate(row.seconds, row.contractAmount);
      }
      return { byProject, entries: monthEntries };
    },
    [data]
  );

  return {
    data,
    activeEntry,
    elapsed,
    addProject,
    deleteProject,
    addTask,
    startTimer,
    stopTimer,
    deleteEntry,
    addManualEntry,
    getProjectTotalSeconds,
    getMonthlySummary,
  };
}
