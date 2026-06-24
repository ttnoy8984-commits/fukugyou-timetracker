"use client";

import { useState } from "react";
import { Project, Task, TimeEntry } from "@/lib/types";
import { formatDuration } from "@/lib/storage";

interface Props {
  projects: Project[];
  tasks: Task[];
  activeEntry: TimeEntry | null;
  elapsed: number;
  onStart: (projectId: string, taskId: string, note: string) => void;
  onStop: () => void;
}

export default function Timer({ projects, tasks, activeEntry, elapsed, onStart, onStop }: Props) {
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [note, setNote] = useState("");

  const filteredTasks = tasks.filter((t) => t.projectId === projectId);
  const activeProject = projects.find((p) => p.id === (activeEntry?.projectId ?? projectId));
  const activeTask = tasks.find((t) => t.id === activeEntry?.taskId);

  function handleStart() {
    if (!projectId || !taskId) return;
    onStart(projectId, taskId, note);
    setNote("");
  }

  return (
    <div className="space-y-6">
      {activeEntry ? (
        <div className="bg-white rounded-2xl p-8 space-y-6 border border-gray-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeProject?.color ?? "#1a1a1a" }} />
              <span className="text-sm text-gray-500">{activeProject?.name} / {activeTask?.name}</span>
            </div>
            {activeEntry.note && <p className="text-sm text-gray-400 pl-4">{activeEntry.note}</p>}
          </div>

          <div className="text-center">
            <div className="text-6xl font-mono font-light text-gray-900 tracking-tight">
              {formatDuration(elapsed)}
            </div>
          </div>

          <button
            onClick={onStop}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium py-3 rounded-xl transition-colors"
          >
            停止
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 space-y-4 border border-gray-100">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">新しい作業</h2>

          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setTaskId(""); }}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
          >
            <option value="">案件を選択</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            disabled={!projectId}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 disabled:opacity-40"
          >
            <option value="">タスクを選択</option>
            {filteredTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="メモ（任意）"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
          />

          <button
            onClick={handleStart}
            disabled={!projectId || !taskId}
            className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium py-3 rounded-xl transition-colors"
          >
            開始
          </button>
        </div>
      )}

      {projects.length === 0 && (
        <p className="text-center text-sm text-gray-400">まず「案件」タブで案件とタスクを登録してください</p>
      )}
    </div>
  );
}
