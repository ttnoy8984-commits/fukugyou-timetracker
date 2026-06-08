"use client";

import { Project, Task, TimeEntry } from "@/lib/types";
import { calcEarnings, formatDuration } from "@/lib/storage";

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
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-3">作業ログ</h2>
        <p className="text-sm text-gray-400">まだ記録がありません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">作業ログ</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {completed.map((e) => {
          const project = projects.find((p) => p.id === e.projectId);
          const task = tasks.find((t) => t.id === e.taskId);
          const earnings = project ? calcEarnings(e.durationSeconds, project.hourlyRate) : 0;
          return (
            <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project?.color ?? "#ccc" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{project?.name}</span>
                  <span className="text-xs text-gray-400 truncate">/ {task?.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{e.date}</span>
                  {e.note && <span className="truncate">{e.note}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-mono text-gray-700">{formatDuration(e.durationSeconds)}</div>
                <div className="text-xs text-emerald-600 font-medium">¥{Math.round(earnings).toLocaleString()}</div>
              </div>
              <button
                onClick={() => onDelete(e.id)}
                className="text-gray-300 hover:text-red-400 text-xs ml-1"
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
