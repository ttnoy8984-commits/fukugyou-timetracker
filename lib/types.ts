export interface Project {
  id: string;
  name: string;
  contractAmount: number;
  taxIncluded: boolean; // true: 税込, false: 税抜
  color: string;
  clientId?: string | null;
  completedAt?: string | null;
  taskIds?: string[]; // この案件でよく使うタスク（未設定・空なら全タスクを表示）
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  createdAt: string;
}

export interface Task {
  id: string;
  name: string;
  projectId?: string; // 旧データ互換用
  createdAt: string;
}

export interface TaskGroup {
  id: string;
  name: string;
  taskIds: string[];
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  projectId: string | null;
  taskId: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  note: string;
  date: string;
}

export interface AppData {
  projects: Project[];
  tasks: Task[];
  taskGroups: TaskGroup[];
  clients: Client[];
  entries: TimeEntry[];
}
