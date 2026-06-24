import { AppData, Project, Task, TaskTemplate, TimeEntry } from "./types";

const KEY = "fukugyou_data";

const defaultData: AppData = { projects: [], tasks: [], entries: [], templates: [] };

export function loadData(): AppData {
  if (typeof window === "undefined") return defaultData;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw);
    // 旧データ（hourlyRate）を新形式（contractAmount）に変換
    const projects = (parsed.projects ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      contractAmount: p.contractAmount ?? p.hourlyRate ?? 0,
    }));
    return { ...defaultData, ...parsed, projects };
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

export function createTemplate(name: string, taskNames: string[]): TaskTemplate {
  return {
    id: crypto.randomUUID(),
    name,
    taskNames,
    createdAt: new Date().toISOString(),
  };
}

export function calcEffectiveHourlyRate(totalSeconds: number, contractAmount: number): number {
  if (totalSeconds === 0) return 0;
  return contractAmount / (totalSeconds / 3600);
}
