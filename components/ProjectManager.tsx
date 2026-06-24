"use client";

import { useState } from "react";
import { Project, Task, TaskTemplate } from "@/lib/types";
import { calcEffectiveHourlyRate, formatDuration } from "@/lib/storage";

interface Props {
  projects: Project[];
  tasks: Task[];
  templates: TaskTemplate[];
  onAddProject: (name: string, contractAmount: number, color: string, templateId?: string) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (projectId: string, name: string) => void;
  onAddTemplate: (name: string, taskNames: string[]) => void;
  onDeleteTemplate: (id: string) => void;
  getProjectTotalSeconds: (projectId: string) => number;
}

export default function ProjectManager({
  projects, tasks, templates,
  onAddProject, onDeleteProject, onAddTask,
  onAddTemplate, onDeleteTemplate,
  getProjectTotalSeconds,
}: Props) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [color, setColor] = useState("#1a1a1a");
  const [templateId, setTemplateId] = useState("");

  const [taskName, setTaskName] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // テンプレート作成
  const [tplName, setTplName] = useState("");
  const [tplTaskInput, setTplTaskInput] = useState("");
  const [tplTaskNames, setTplTaskNames] = useState<string[]>([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  function handleAddProject() {
    if (!name.trim() || !rate) return;
    onAddProject(name.trim(), Number(rate), color, templateId || undefined);
    setName(""); setRate(""); setColor("#1a1a1a"); setTemplateId("");
  }

  function handleAddTask() {
    if (!selectedProject || !taskName.trim()) return;
    onAddTask(selectedProject, taskName.trim());
    setTaskName("");
  }

  function handleAddTplTask() {
    const t = tplTaskInput.trim();
    if (!t || tplTaskNames.includes(t)) return;
    setTplTaskNames([...tplTaskNames, t]);
    setTplTaskInput("");
  }

  function handleSaveTemplate() {
    if (!tplName.trim() || tplTaskNames.length === 0) return;
    onAddTemplate(tplName.trim(), tplTaskNames);
    setTplName(""); setTplTaskNames([]); setTplTaskInput(""); setShowTemplateForm(false);
  }

  return (
    <div className="space-y-6">
      {/* テンプレート管理 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowTemplateForm(!showTemplateForm)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">タスクテンプレート</h2>
          <span className="text-gray-400 text-xs">{showTemplateForm ? "▲" : "▼"}</span>
        </button>

        {showTemplateForm && (
          <div className="border-t border-gray-100 p-6 space-y-3">
            {/* 既存テンプレート一覧 */}
            {templates.length > 0 && (
              <div className="space-y-2 mb-4">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{t.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{t.taskNames.join("・")}</div>
                    </div>
                    <button
                      onClick={() => onDeleteTemplate(t.id)}
                      className="text-gray-300 hover:text-red-400 text-xs ml-3 mt-0.5 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 新規テンプレート作成 */}
            <div className="text-xs font-medium text-gray-400 mb-1">新規テンプレート</div>
            <input
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="テンプレート名（例：動画編集）"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
            />
            <div className="flex gap-2">
              <input
                value={tplTaskInput}
                onChange={(e) => setTplTaskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTplTask(); }}}
                placeholder="タスク名を入力してEnter"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
              />
              <button
                onClick={handleAddTplTask}
                disabled={!tplTaskInput.trim()}
                className="bg-gray-200 hover:bg-gray-300 disabled:opacity-30 text-gray-700 text-sm font-medium px-4 rounded-xl transition-colors"
              >
                追加
              </button>
            </div>
            {tplTaskNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tplTaskNames.map((t) => (
                  <span key={t} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                    {t}
                    <button onClick={() => setTplTaskNames(tplTaskNames.filter((n) => n !== t))} className="text-gray-400 hover:text-red-400">✕</button>
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={handleSaveTemplate}
              disabled={!tplName.trim() || tplTaskNames.length === 0}
              className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium py-3 rounded-xl transition-colors"
            >
              テンプレートを保存
            </button>
          </div>
        )}
      </div>

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
        {templates.length > 0 && (
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
          >
            <option value="">テンプレートを使用しない</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}（{t.taskNames.join("・")}）</option>
            ))}
          </select>
        )}
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
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">タスクを個別追加</h2>
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
