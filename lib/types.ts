export interface Project {
  id: string;
  name: string;
  contractAmount: number;
  color: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  taskId: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  note: string;
  date: string;
}

export interface AppData {
  projects: Project[];
  tasks: Task[];
  entries: TimeEntry[];
}
