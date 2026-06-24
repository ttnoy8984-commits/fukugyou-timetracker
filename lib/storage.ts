import { AppData, Project, Task, TimeEntry } from "./types";

const KEY = "fukugyou_data";

const defaultData: AppData = { projects: [], tasks: [], entries: [] };

export function loadData(): AppData {
  if (typeof window === "undefined") return defaultData;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : defaultData;
  } catch {
    return defaultData;
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function createProject(name: string, contractAmount: number, color: string): Project {
  return {
    id: crypto.randomUUID(),
    name,
    contractAmount,
    color,
    createdAt: new Date().toISOString(),
  };
}

export function createTask(projectId: string, name: string): Task {
  return {
    id: crypto.randomUUID(),
    projectId,
    name,
    createdAt: new Date().toISOString(),
  };
}

export function createEntry(
  projectId: string,
  taskId: string,
  note: string
): TimeEntry {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    projectId,
    taskId,
    startTime: now,
    endTime: null,
    durationSeconds: 0,
    note,
    date: now.slice(0, 10),
  };
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function calcEffectiveHourlyRate(totalSeconds: number, contractAmount: number): number {
  if (totalSeconds === 0) return 0;
  return contractAmount / (totalSeconds / 3600);
}
