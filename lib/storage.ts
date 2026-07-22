import { AppData, Client, Project, Task, TaskGroup, TaskTemplate, TimeEntry } from "./types";

const KEY = "fukugyou_data";
export const TAX_RATE = 0.1;

const defaultData: AppData = { projects: [], tasks: [], taskGroups: [], clients: [], entries: [], templates: [] };

export function loadData(): AppData {
  if (typeof window === "undefined") return defaultData;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw);

    // 旧データ（hourlyRate）を新形式（contractAmount）に変換。taxIncluded等のデフォルト値も補完
    const projects = (parsed.projects ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      contractAmount: p.contractAmount ?? p.hourlyRate ?? 0,
      taxIncluded: typeof p.taxIncluded === "boolean" ? p.taxIncluded : true,
      clientId: p.clientId ?? null,
      completedAt: p.completedAt ?? null,
    }));

    // 旧タスク（projectId付き）を共通タスクに昇格。名前重複は1つに統合しつつentryのtaskIdを付け替え
    const rawTasks: (Task & { projectId?: string })[] = parsed.tasks ?? [];
    const nameToId = new Map<string, string>();
    const idRemap = new Map<string, string>(); // 旧ID → 新（代表）ID
    const tasks: Task[] = [];
    for (const t of rawTasks) {
      const key = t.name.trim();
      if (nameToId.has(key)) {
        idRemap.set(t.id, nameToId.get(key)!);
      } else {
        nameToId.set(key, t.id);
        const { projectId: _p, ...rest } = t;
        void _p;
        tasks.push(rest);
      }
    }
    const entries = (parsed.entries ?? []).map((e: Record<string, unknown>) => ({
      ...e,
      taskId: e.taskId && idRemap.has(e.taskId as string) ? idRemap.get(e.taskId as string) : e.taskId,
    }));

    const taskGroups = (parsed.taskGroups ?? []).map((g: Record<string, unknown>) => ({
      ...g,
      taskIds: Array.isArray(g.taskIds) ? g.taskIds : [],
    }));

    return {
      ...defaultData,
      ...parsed,
      projects,
      tasks,
      taskGroups,
      clients: parsed.clients ?? [],
      entries,
    };
  } catch {
    return defaultData;
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function createProject(
  name: string,
  contractAmount: number,
  color: string,
  taxIncluded: boolean = true,
  clientId: string | null = null
): Project {
  return {
    id: crypto.randomUUID(),
    name,
    contractAmount,
    taxIncluded,
    color,
    clientId,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
}

export function createClient(name: string): Client {
  return { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
}

// 税抜金額を計算（contractAmountがtaxIncludedなら税抜に変換、そうでなければそのまま）
export function calcAmountExcludingTax(contractAmount: number, taxIncluded: boolean): number {
  return taxIncluded ? contractAmount / (1 + TAX_RATE) : contractAmount;
}

// 税込金額を計算
export function calcAmountIncludingTax(contractAmount: number, taxIncluded: boolean): number {
  return taxIncluded ? contractAmount : contractAmount * (1 + TAX_RATE);
}

export function createTask(name: string): Task {
  return { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
}

export function createTaskGroup(name: string): TaskGroup {
  return { id: crypto.randomUUID(), name, taskIds: [], createdAt: new Date().toISOString() };
}

export function createEntry(
  projectId: string | null,
  taskId: string | null,
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
