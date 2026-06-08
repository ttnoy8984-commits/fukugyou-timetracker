"use client";

import { useCallback, useEffect, useState } from "react";
import { AppData, Project, Task, TimeEntry } from "./types";
import {
  calcEarnings,
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
    // Restore in-progress entry
    const running = d.entries.find((e) => e.endTime === null);
    if (running) {
      setActiveEntry(running);
      const start = new Date(running.startTime).getTime();
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }
  }, []);

  useEffect(() => {
    if (!activeEntry) return;
    const id = setInterval(() => {
      const start = new Date(activeEntry.startTime).getTime();
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [activeEntry]);

  const persist = useCallback((next: AppData) => {
    setData(next);
    saveData(next);
  }, []);

  const addProject = useCallback(
    (name: string, hourlyRate: number, color: string) => {
      const p = createProject(name, hourlyRate, color);
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
      const next = { ...data, entries: [...data.entries, entry] };
      persist(next);
      setActiveEntry(entry);
      setElapsed(0);
    },
    [activeEntry, data, persist]
  );

  const stopTimer = useCallback(() => {
    if (!activeEntry) return;
    const now = new Date().toISOString();
    const start = new Date(activeEntry.startTime).getTime();
    const duration = Math.floor((Date.now() - start) / 1000);
    const updated = { ...activeEntry, endTime: now, durationSeconds: duration };
    const entries = data.entries.map((e) => (e.id === activeEntry.id ? updated : e));
    persist({ ...data, entries });
    setActiveEntry(null);
    setElapsed(0);
  }, [activeEntry, data, persist]);

  const deleteEntry = useCallback(
    (id: string) => {
      persist({ ...data, entries: data.entries.filter((e) => e.id !== id) });
    },
    [data, persist]
  );

  // Monthly summary
  const getMonthlySummary = useCallback(
    (year: number, month: number) => {
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      const monthEntries = data.entries.filter(
        (e) => e.date.startsWith(prefix) && e.endTime !== null
      );
      const byProject: Record<string, { seconds: number; earnings: number; name: string; color: string }> = {};
      for (const e of monthEntries) {
        const project = data.projects.find((p) => p.id === e.projectId);
        if (!project) continue;
        if (!byProject[e.projectId]) {
          byProject[e.projectId] = { seconds: 0, earnings: 0, name: project.name, color: project.color };
        }
        byProject[e.projectId].seconds += e.durationSeconds;
        byProject[e.projectId].earnings += calcEarnings(e.durationSeconds, project.hourlyRate);
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
    getMonthlySummary,
  };
}
