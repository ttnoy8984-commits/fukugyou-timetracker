"use client";

import { useState } from "react";
import { Project, Task } from "@/lib/types";
import { calcEffectiveHourlyRate, formatDuration } from "@/lib/storage";

interface Props {
  projects: Project[];
  tasks: Task[];
  onAddProject: (name: string, contractAmount: number, color: string) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (projectId: string, name: string) => void;
  getProjectTotalSeconds: (projectId: string) => number;
}

export default function ProjectManager({ projects, tasks, onAddProject, onDeleteProject, onAddTask, getProjectTotalSeconds }: Props) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [color, setColor] = useState("#1a1a1a");
  const [taskName, setTaskName] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  function handleAddProject() {
    if (!name.trim() || !rate) return;
    onAddProject(name.trim(), Number(rate), color);
    setName(""); setRate(""); setColor("#1a1a1a");
  }

  function handleAddTask() {
    if (!selectedProject || !taskName.trim()) return;
    onAddTask(selectedProject, taskName.trim());
    setTaskName("");
  }

  return (
    <div className="space-y-6">
      {/* 新規案件 */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-3">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">新規案件</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="案件名"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
        />
        <div className="flex gap-3">
          <input
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="契約金額（円）"
            type="number"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">色</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
            />
          </div>
        </div>
        <button
          onClick={handleAddProject}
          disabled={!name.trim() || !rate}
          className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium py-3 rounded-xl transition-colors"
        >
          追加
        </button>
      </div>

      {/* 新規タスク */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-3">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">新規タスク</h2>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
        >
          <option value="">案件を選択</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="タスク名"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
          />
          <button
            onClick={handleAddTask}
            disabled={!selectedProject || !taskName.trim()}
            className="bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium px-5 rounded-xl transition-colors"
          >
            追加
          </button>
        </div>
      </div>

      {/* 案件一覧 */}
      {projects.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">案件一覧</h2>
          </div>
          {projects.map((p, i) => {
            const projectTasks = tasks.filter((t) => t.projectId === p.id);
            const totalSeconds = getProjectTotalSeconds(p.id);
            const effectiveRate = calcEffectiveHourlyRate(totalSeconds, p.contractAmount);
            return (
              <div key={p.id} className={i > 0 ? "border-t border-gray-100" : ""}>
                <div
                  className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedProject(expandedProject === p.id ? null : p.id)}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{p.name}</div>
                    <div className="text-xs text-gray-400">契約 ¥{p.contractAmount.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    {totalSeconds > 0 ? (
                      <>
                        <div className="text-sm text-gray-700">実質 ¥{Math.round(effectiveRate).toLocaleString()}/h</div>
                        <div className="text-xs text-gray-400">{formatDuration(totalSeconds)}</div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-400">未作業</div>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                    className="text-gray-300 hover:text-red-400 text-xs transition-colors ml-2"
                  >
                    削除
                  </button>
                  <span className="text-gray-300 text-xs">{expandedProject === p.id ? "▲" : "▼"}</span>
                </div>
                {expandedProject === p.id && (
                  <div className="px-6 pb-4 space-y-1">
                    {projectTasks.length === 0 ? (
                      <p className="text-xs text-gray-400">タスクなし</p>
                    ) : (
                      projectTasks.map((t) => (
                        <div key={t.id} className="text-sm text-gray-500 pl-5">· {t.name}</div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
