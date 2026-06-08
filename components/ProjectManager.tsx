"use client";

import { useState } from "react";
import { Project, Task } from "@/lib/types";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

interface Props {
  projects: Project[];
  tasks: Task[];
  onAddProject: (name: string, hourlyRate: number, color: string) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (projectId: string, name: string) => void;
}

export default function ProjectManager({ projects, tasks, onAddProject, onDeleteProject, onAddTask }: Props) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [taskName, setTaskName] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  function handleAddProject() {
    if (!name.trim() || !rate) return;
    onAddProject(name.trim(), Number(rate), color);
    setName(""); setRate(""); setColor(COLORS[0]);
  }

  function handleAddTask() {
    if (!selectedProject || !taskName.trim()) return;
    onAddTask(selectedProject, taskName.trim());
    setTaskName("");
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-5">
      <h2 className="text-xl font-bold text-gray-800">案件・タスク管理</h2>

      {/* Add project */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-600">新規案件</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="案件名"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <div className="flex gap-2">
          <input
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="時給（円）"
            type="number"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex gap-1 items-center">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 ${color === c ? "border-gray-700" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <button
          onClick={handleAddProject}
          disabled={!name.trim() || !rate}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-bold py-2 rounded-lg transition"
        >
          案件を追加
        </button>
      </div>

      {/* Add task */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-600">新規タスク</h3>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">案件を選択...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="タスク名"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={handleAddTask}
            disabled={!selectedProject || !taskName.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white text-sm font-bold px-4 rounded-lg transition"
          >
            追加
          </button>
        </div>
      </div>

      {/* Project list */}
      <div className="space-y-2">
        {projects.map((p) => {
          const projectTasks = tasks.filter((t) => t.projectId === p.id);
          return (
            <div key={p.id} className="border rounded-lg overflow-hidden">
              <div
                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedProject(expandedProject === p.id ? null : p.id)}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="font-medium text-sm flex-1">{p.name}</span>
                <span className="text-xs text-gray-500">¥{p.hourlyRate.toLocaleString()}/h</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                  className="text-red-400 hover:text-red-600 text-xs ml-1"
                >
                  削除
                </button>
                <span className="text-gray-400 text-xs">{expandedProject === p.id ? "▲" : "▼"}</span>
              </div>
              {expandedProject === p.id && (
                <div className="border-t bg-gray-50 px-4 py-2 space-y-1">
                  {projectTasks.length === 0 ? (
                    <p className="text-xs text-gray-400">タスクなし</p>
                  ) : (
                    projectTasks.map((t) => (
                      <div key={t.id} className="text-sm text-gray-600">・{t.name}</div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
