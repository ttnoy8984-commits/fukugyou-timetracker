"use client";

import { useState } from "react";
import { Project, Task, TaskTemplate } from "@/lib/types";
import { calcEffectiveHourlyRate, formatDuration } from "@/lib/storage";

const PRESET_COLORS = [
  "#ef4444", // 赤
  "#f97316", // オレンジ
  "#eab308", // 黄
  "#22c55e", // 緑
  "#14b8a6", // ティール
  "#3b82f6", // 青
  "#6366f1", // インディゴ
  "#a855f7", // 紫
  "#ec4899", // ピンク
  "#64748b", // グレー
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-8 h-8 rounded-full border-2 transition-transform ${value === c ? "border-gray-800 scale-110" : "border-transparent"}`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

interface Props {
  projects: Project[];
  tasks: Task[];
  templates: TaskTemplate[];
  onAddProject: (name: string, contractAmount: number, color: string, templateId?: string) => void;
  onUpdateProject: (id: string, name: string, contractAmount: number, color: string) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (projectId: string, name: string) => void;
  onAddTemplate: (name: string, taskNames: string[]) => void;
  onUpdateTemplate: (id: string, name: string, taskNames: string[]) => void;
  onDeleteTemplate: (id: string) => void;
  getProjectTotalSeconds: (projectId: string) => number;
  getTaskTotalSeconds: (taskId: string) => number;
}

type ModalType = "project" | "task" | "template" | "editProject" | null;

export default function ProjectManager({
  projects, tasks, templates,
  onAddProject, onUpdateProject, onDeleteProject, onAddTask,
  onAddTemplate, onUpdateTemplate, onDeleteTemplate,
  getProjectTotalSeconds, getTaskTotalSeconds,
}: Props) {
  const [modal, setModal] = useState<ModalType>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // 案件追加フォーム
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [templateId, setTemplateId] = useState("");

  // タスク追加フォーム
  const [taskName, setTaskName] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

  // テンプレートフォーム
  const [tplName, setTplName] = useState("");
  const [tplTaskInput, setTplTaskInput] = useState("");
  const [tplTaskNames, setTplTaskNames] = useState<string[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  function closeModal() {
    setModal(null);
    setEditingProject(null);
    setName(""); setRate(""); setColor("#6366f1"); setTemplateId("");
    setTaskName(""); setSelectedProject("");
    setTplName(""); setTplTaskInput(""); setTplTaskNames([]);
    setEditingTemplateId(null);
  }

  function openEditTemplate(t: { id: string; name: string; taskNames: string[] }) {
    setEditingTemplateId(t.id);
    setTplName(t.name);
    setTplTaskNames([...t.taskNames]);
    setTplTaskInput("");
  }

  function handleSaveTemplateEdit() {
    if (!editingTemplateId || !tplName.trim() || tplTaskNames.length === 0) return;
    onUpdateTemplate(editingTemplateId, tplName.trim(), tplTaskNames);
    setEditingTemplateId(null);
    setTplName(""); setTplTaskInput(""); setTplTaskNames([]);
  }

  function openEditProject(p: Project) {
    setEditingProject(p);
    setName(p.name);
    setRate(String(p.contractAmount));
    setColor(p.color);
    setModal("editProject");
  }

  function handleUpdateProject() {
    if (!editingProject || !name.trim() || !rate) return;
    onUpdateProject(editingProject.id, name.trim(), Number(rate), color);
    closeModal();
  }

  function handleAddProject() {
    if (!name.trim() || !rate) return;
    onAddProject(name.trim(), Number(rate), color, templateId || undefined);
    closeModal();
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
    closeModal();
  }

  return (
    <div className="space-y-4">
      {/* アクションボタン */}
      <div className="flex gap-2">
        <button
          onClick={() => setModal("project")}
          className="flex-1 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium py-3 rounded-xl transition-colors"
        >
          + 案件を追加
        </button>
        <button
          onClick={() => setModal("task")}
          className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium py-3 rounded-xl transition-colors"
        >
          + タスクを追加
        </button>
        <button
          onClick={() => setModal("template")}
          className="border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-3 rounded-xl transition-colors"
        >
          テンプレート
        </button>
      </div>

      {/* 案件一覧 */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
          <p className="text-sm text-gray-400">案件がありません</p>
          <p className="text-xs text-gray-300 mt-1">「案件を追加」から登録してください</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {projects.map((p, i) => {
            const projectTasks = tasks.filter((t) => t.projectId === p.id);
            const totalSeconds = getProjectTotalSeconds(p.id);
            const effectiveRate = calcEffectiveHourlyRate(totalSeconds, p.contractAmount);
            const isExpanded = expandedProject === p.id;
            return (
              <div key={p.id} className={i > 0 ? "border-t border-gray-100" : ""}>
                <div
                  className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedProject(isExpanded ? null : p.id)}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{p.name}</div>
                    <div className="text-xs text-gray-400">契約 ¥{p.contractAmount.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    {totalSeconds > 0 ? (
                      <>
                        <div className="text-sm text-gray-700">¥{Math.round(effectiveRate).toLocaleString()}/h</div>
                        <div className="text-xs text-gray-400">{formatDuration(totalSeconds)}</div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-400">未作業</div>
                    )}
                  </div>
                  <span className="text-gray-300 text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 space-y-3">
                    {projectTasks.length === 0 ? (
                      <p className="text-xs text-gray-400">タスクなし</p>
                    ) : (
                      <>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">タスク別作業時間</p>
                        {projectTasks.map((t) => {
                          const taskSec = getTaskTotalSeconds(t.id);
                          return (
                            <div key={t.id}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-600">{t.name}</span>
                                <span className="text-xs font-mono text-gray-500">
                                  {taskSec > 0 ? formatDuration(taskSec) : "未作業"}
                                </span>
                              </div>
                              {taskSec > 0 && totalSeconds > 0 && (
                                <div className="w-full bg-gray-200 rounded-full h-1">
                                  <div
                                    className="h-1 rounded-full"
                                    style={{
                                      backgroundColor: p.color,
                                      opacity: 0.6,
                                      width: `${(taskSec / totalSeconds) * 100}%`,
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                    <div className="flex gap-4 pt-1">
                      <button
                        onClick={() => openEditProject(p)}
                        className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => { onDeleteProject(p.id); setExpandedProject(null); }}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* モーダル */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>

            {/* 案件追加 */}
            {modal === "project" && (
              <>
                <h3 className="text-base font-semibold text-gray-900">案件を追加</h3>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="案件名"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
                />
                <input
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="契約金額（円）"
                  type="number"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
                />
                <div className="space-y-1">
                  <label className="text-sm text-gray-500">カラー</label>
                  <ColorPicker value={color} onChange={setColor} />
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
                <div className="flex gap-2 pt-1">
                  <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-500 text-sm font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">キャンセル</button>
                  <button onClick={handleAddProject} disabled={!name.trim() || !rate} className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium py-3 rounded-xl transition-colors">追加</button>
                </div>
              </>
            )}

            {/* タスク追加 */}
            {modal === "task" && (
              <>
                <h3 className="text-base font-semibold text-gray-900">タスクを追加</h3>
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
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
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
                <button onClick={closeModal} className="w-full border border-gray-200 text-gray-500 text-sm font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">閉じる</button>
              </>
            )}

            {/* テンプレート */}
            {modal === "template" && (
              <>
                <h3 className="text-base font-semibold text-gray-900">タスクテンプレート</h3>
                {templates.length > 0 && (
                  <div className="space-y-2">
                    {templates.map((t) => (
                      <div key={t.id}>
                        {editingTemplateId === t.id ? (
                          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                            <input
                              value={tplName}
                              onChange={(e) => setTplName(e.target.value)}
                              placeholder="テンプレート名"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                            />
                            <div className="flex gap-2">
                              <input
                                value={tplTaskInput}
                                onChange={(e) => setTplTaskInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTplTask(); }}}
                                placeholder="タスクを追加してEnter"
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                              />
                              <button onClick={handleAddTplTask} disabled={!tplTaskInput.trim()} className="bg-gray-200 hover:bg-gray-300 disabled:opacity-30 text-gray-700 text-xs px-3 rounded-lg transition-colors">追加</button>
                            </div>
                            {tplTaskNames.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {tplTaskNames.map((n) => (
                                  <span key={n} className="flex items-center gap-1 bg-white text-gray-700 text-xs px-2.5 py-1 rounded-full border border-gray-200">
                                    {n}
                                    <button onClick={() => setTplTaskNames(tplTaskNames.filter((x) => x !== n))} className="text-gray-400 hover:text-red-400">✕</button>
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button onClick={() => { setEditingTemplateId(null); setTplName(""); setTplTaskNames([]); setTplTaskInput(""); }} className="flex-1 border border-gray-200 text-gray-500 text-xs py-2 rounded-lg hover:bg-gray-50 transition-colors">キャンセル</button>
                              <button onClick={handleSaveTemplateEdit} disabled={!tplName.trim() || tplTaskNames.length === 0} className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-xs py-2 rounded-lg transition-colors">保存</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between p-3 bg-gray-50 rounded-xl">
                            <div>
                              <div className="text-sm font-medium text-gray-800">{t.name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{t.taskNames.join("・")}</div>
                            </div>
                            <div className="flex gap-2 ml-3">
                              <button onClick={() => openEditTemplate(t)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">編集</button>
                              <button onClick={() => onDeleteTemplate(t.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">削除</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!editingTemplateId && (
                  <div className="border-t border-gray-100 pt-3 space-y-3">
                    <p className="text-xs text-gray-400">新規テンプレート</p>
                    <input
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      placeholder="テンプレート名"
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
                      <button onClick={handleAddTplTask} disabled={!tplTaskInput.trim()} className="bg-gray-200 hover:bg-gray-300 disabled:opacity-30 text-gray-700 text-sm px-4 rounded-xl transition-colors">追加</button>
                    </div>
                    {tplTaskNames.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tplTaskNames.map((n) => (
                          <span key={n} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                            {n}
                            <button onClick={() => setTplTaskNames(tplTaskNames.filter((x) => x !== n))} className="text-gray-400 hover:text-red-400">✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <button onClick={handleSaveTemplate} disabled={!tplName.trim() || tplTaskNames.length === 0} className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium py-3 rounded-xl transition-colors">保存</button>
                  </div>
                )}
                <button onClick={closeModal} className="w-full border border-gray-200 text-gray-500 text-sm font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">閉じる</button>
              </>
            )}

            {/* 案件編集 */}
            {modal === "editProject" && (
              <>
                <h3 className="text-base font-semibold text-gray-900">案件を編集</h3>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="案件名"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
                />
                <input
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="契約金額（円）"
                  type="number"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
                />
                <div className="space-y-1">
                  <label className="text-sm text-gray-500">カラー</label>
                  <ColorPicker value={color} onChange={setColor} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-500 text-sm font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">キャンセル</button>
                  <button onClick={handleUpdateProject} disabled={!name.trim() || !rate} className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium py-3 rounded-xl transition-colors">保存</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
