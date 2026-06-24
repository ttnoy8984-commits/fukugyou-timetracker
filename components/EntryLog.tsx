"use client";

import { Project, Task, TimeEntry } from "@/lib/types";
import { formatDuration } from "@/lib/storage";

interface Props {
  entries: TimeEntry[];
  projects: Project[];
  tasks: Task[];
  onDelete: (id: string) => void;
}

export default function EntryLog({ entries, projects, tasks, onDelete }: Props) {
  const completed = entries
    .filter((e) => e.endTime !== null)
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, 50);

  if (completed.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
        <p className="text-sm text-gray-400">まだ記録がありません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">作業ログ</h2>
      </div>
      <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
        {completed.map((e) => {
          const project = projects.find((p) => p.id === e.projectId);
          const task = tasks.find((t) => t.id === e.taskId);
          return (
            <div key={e.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project?.color ?? "#ccc" }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {project?.name} <span className="text-gray-400 font-normal">/ {task?.name}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {e.date}{e.note && ` · ${e.note}`}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-mono text-gray-700">{formatDuration(e.durationSeconds)}</div>
              </div>
              <button
                onClick={() => onDelete(e.id)}
                className="text-gray-200 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
