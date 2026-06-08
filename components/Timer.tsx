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
    <div className="bg-white rounded-2xl shadow p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">タイマー</h2>

      {activeEntry ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: activeProject?.color ?? "#6366f1" }}
            />
            <span className="font-medium text-gray-700">{activeProject?.name}</span>
            <span className="text-sm text-gray-500">/ {activeTask?.name}</span>
          </div>
          {activeEntry.note && (
            <p className="text-sm text-gray-500">{activeEntry.note}</p>
          )}
          <div className="text-5xl font-mono font-bold text-center py-4 text-indigo-600">
            {formatDuration(elapsed)}
          </div>
          <button
            onClick={onStop}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition"
          >
            停止
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setTaskId(""); }}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">案件を選択...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            disabled={!projectId}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
          >
            <option value="">タスクを選択...</option>
            {filteredTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="メモ（任意）"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={handleStart}
            disabled={!projectId || !taskId}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition"
          >
            開始
          </button>
        </div>
      )}
    </div>
  );
}
