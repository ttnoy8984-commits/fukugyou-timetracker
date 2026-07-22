export interface Project {
  id: string;
  name: string;
  contractAmount: number;
  color: string;
  createdAt: string;
}

export interface Task {
  id: string;
  name: string;
  groupId?: string;
  projectId?: string; // 旧データ互換用
  createdAt: string;
}

export interface TaskGroup {
  id: string;
  name: string;
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

export interface TaskTemplate {
  id: string;
  name: string;
  taskNames: string[];
  createdAt: string;
}

export interface AppData {
  projects: Project[];
  tasks: Task[];
  taskGroups: TaskGroup[];
  entries: TimeEntry[];
  templates: TaskTemplate[];
}
