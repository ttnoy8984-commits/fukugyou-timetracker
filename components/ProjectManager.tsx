"use client";

import { useState } from "react";
import { Project, Task, TaskGroup, TaskTemplate } from "@/lib/types";
import { calcEffectiveHourlyRate, formatDuration } from "@/lib/storage";

const PRESET_COLORS = [
  "#ef4444","#f97316","#eab308","#22c55e","#14b8a6",
  "#3b82f6","#6366f1","#a855f7","#ec4899","#64748b",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className={`w-8 h-8 rounded-full border-2 transition-transform ${value === c ? "border-gray-800 scale-110" : "border-transparent"}`}
          style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}

interface Props {
  projects: Project[];
  tasks: Task[];
  taskGroups: TaskGroup[];
  templates: TaskTemplate[];
  onAddProject: (name: string, contractAmount: number, color: string, templateId?: string) => void;
  onUpdateProject: (id: string, name: string, contractAmount: number, color: string) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (name: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTaskGroup: (name: string) => void;
  onDeleteTaskGroup: (groupId: string) => void;
  onAddTaskToGroup: (groupId: string, taskId: string) => void;
  onRemoveTaskFromGroup: (groupId: string, taskId: string) => void;
  onAddTemplate: (name: string, taskNames: string[]) => void;
  onUpdateTemplate: (id: string, name: string, taskNames: string[]) => void;
  onDeleteTemplate: (id: string) => void;
  getProjectTotalSeconds: (projectId: string) => number;
  getTaskTotalSeconds: (taskId: string) => number;
}

type Section = "projects" | "tasks";
type ModalType = "project" | "editProject" | "template" | null;

// IME変換中のEnterを無視するヘルパー
function onEnterKey(fn: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) fn();
  };
}

export default function ProjectManager({
  projects, tasks, taskGroups, templates,
  onAddProject, onUpdateProject, onDeleteProject,
  onAddTask, onDeleteTask, onAddTaskGroup, onDeleteTaskGroup,
  onAddTaskToGroup, onRemoveTaskFromGroup,
  onAddTemplate, onUpdateTemplate, onDeleteTemplate,
  getProjectTotalSeconds, getTaskTotalSeconds,
}: Props) {
  const [section, setSection] = useState<Section>("projects");
  const [modal, setModal] = useState<ModalType>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // 案件フォーム
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [templateId, setTemplateId] = useState("");

  // テンプレートフォーム
  const [tplName, setTplName] = useState("");
  const [tplTaskInput, setTplTaskInput] = useState("");
  const [tplTaskNames, setTplTaskNames] = useState<string[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // タスク追加
  const [newTaskName, setNewTaskName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);

  // グループへのタスク追加 (groupId → 選択中taskId)
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [pickTaskId, setPickTaskId] = useState("");

  function closeModal() {
    setModal(null); setEditingProject(null);
    setName(""); setRate(""); setColor("#6366f1"); setTemplateId("");
    setTplName(""); setTplTaskInput(""); setTplTaskNames([]); setEditingTemplateId(null);
  }

  function openEditProject(p: Project) {
    setEditingProject(p); setName(p.name); setRate(String(p.contractAmount)); setColor(p.color);
    setModal("editProject");
  }

  function handleAddProject() {
    if (!name.trim() || !rate) return;
    onAddProject(name.trim(), Number(rate), color, templateId || undefined);
    closeModal();
  }

  function handleUpdateProject() {
    if (!editingProject || !name.trim() || !rate) return;
    onUpdateProject(editingProject.id, name.trim(), Number(rate), color);
    closeModal();
  }

  function handleAddTask() {
    if (!newTaskName.trim()) return;
    onAddTask(newTaskName.trim());
    setNewTaskName("");
  }

  function handleAddGroup() {
    if (!newGroupName.trim()) return;
    onAddTaskGroup(newGroupName.trim());
    setNewGroupName(""); setAddingGroup(false);
  }

  function handleAddToGroup(groupId: string) {
    if (!pickTaskId) return;
    onAddTaskToGroup(groupId, pickTaskId);
    setPickTaskId(""); setAddingToGroup(null);
  }

  function openEditTemplate(t: TaskTemplate) {
    setEditingTemplateId(t.id); setTplName(t.name); setTplTaskNames([...t.taskNames]); setTplTaskInput("");
  }

  function handleSaveTemplate() {
    if (!tplName.trim() || tplTaskNames.length === 0) return;
    onAddTemplate(tplName.trim(), tplTaskNames); closeModal();
  }

  function handleSaveTemplateEdit() {
    if (!editingTemplateId || !tplName.trim() || tplTaskNames.length === 0) return;
    onUpdateTemplate(editingTemplateId, tplName.trim(), tplTaskNames);
    setEditingTemplateId(null); setTplName(""); setTplTaskNames([]); setTplTaskInput("");
  }

  function handleAddTplTask() {
    const t = tplTaskInput.trim();
    if (!t || tplTaskNames.includes(t)) return;
    setTplTaskNames([...tplTaskNames, t]); setTplTaskInput("");
  }

  return (
    <div className="space-y-4">
      {/* セクション切替 */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1">
        <button onClick={() => setSection("projects")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${section === "projects" ? "bg-gray-900 text-white font-medium" : "text-gray-400 hover:text-gray-600"}`}>
          案件
        </button>
        <button onClick={() => setSection("tasks")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${section === "tasks" ? "bg-gray-900 text-white font-medium" : "text-gray-400 hover:text-gray-600"}`}>
          タスク
        </button>
      </div>

      {/* ===== 案件セクション ===== */}
      {section === "projects" && (
        <>
          <div className="flex gap-2">
            <button onClick={() => setModal("project")}
              className="flex-1 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium py-3 rounded-xl transition-colors">
              + 案件を追加
            </button>
            <button onClick={() => setModal("template")}
              className="border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-3 rounded-xl transition-colors">
              テンプレート
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
              <p className="text-sm text-gray-400">案件がありません</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {projects.map((p, i) => {
                const totalSeconds = getProjectTotalSeconds(p.id);
                const effectiveRate = calcEffectiveHourlyRate(totalSeconds, p.contractAmount);
                const isExpanded = expandedProject === p.id;
                return (
                  <div key={p.id} className={i > 0 ? "border-t border-gray-100" : ""}>
                    <div className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedProject(isExpanded ? null : p.id)}>
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
                      <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                        <div className="flex gap-4">
                          <button onClick={() => openEditProject(p)} className="text-xs text-gray-500 hover:text-gray-800 transition-colors">案件を編集</button>
                          <button onClick={() => { onDeleteProject(p.id); setExpandedProject(null); }} className="text-xs text-red-400 hover:text-red-600 transition-colors">削除</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== タスクセクション ===== */}
      {section === "tasks" && (
        <>
          {/* タスク一覧 */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">タスク一覧</span>
              <span className="text-xs text-gray-300">{tasks.length}件</span>
            </div>
            {tasks.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">タスクがありません</p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {tasks.map((t) => {
                  const sec = getTaskTotalSeconds(t.id);
                  const inGroups = taskGroups.filter((g) => g.taskIds.includes(t.id));
                  return (
                    <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <span className="text-sm text-gray-700">{t.name}</span>
                        {inGroups.length > 0 && (
                          <div className="flex gap-1 mt-0.5">
                            {inGroups.map((g) => (
                              <span key={g.id} className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">{g.name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {sec > 0 && <span className="text-xs font-mono text-gray-400">{formatDuration(sec)}</span>}
                        <button onClick={() => onDeleteTask(t.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">削除</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* タスク追加 */}
            <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
              <input value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={onEnterKey(handleAddTask)}
                placeholder="新しいタスクを追加"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
              <button onClick={handleAddTask} disabled={!newTaskName.trim()}
                className="bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium px-4 rounded-lg transition-colors">
                追加
              </button>
            </div>
          </div>

          {/* グループ */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">タスクグループ</span>
            {addingGroup ? (
              <div className="flex gap-2">
                <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={onEnterKey(handleAddGroup)}
                  placeholder="グループ名" autoFocus
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400" />
                <button onClick={handleAddGroup} disabled={!newGroupName.trim()}
                  className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg disabled:opacity-30">追加</button>
                <button onClick={() => { setAddingGroup(false); setNewGroupName(""); }} className="text-gray-400 text-sm px-2">✕</button>
              </div>
            ) : (
              <button onClick={() => setAddingGroup(true)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">+ グループを追加</button>
            )}
          </div>

          {taskGroups.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
              <p className="text-sm text-gray-400">グループがありません</p>
              <p className="text-xs text-gray-300 mt-1">グループを作ってタスクをまとめると、案件登録時に使えます</p>
            </div>
          ) : (
            <div className="space-y-2">
              {taskGroups.map((g) => {
                const groupTasks = tasks.filter((t) => g.taskIds.includes(t.id));
                const isExpanded = expandedGroup === g.id;
                const availableTasks = tasks.filter((t) => !g.taskIds.includes(t.id));
                return (
                  <div key={g.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedGroup(isExpanded ? null : g.id)}>
                      <div>
                        <span className="text-sm font-medium text-gray-800">{g.name}</span>
                        <span className="ml-2 text-xs text-gray-400">
                          {groupTasks.length > 0 ? groupTasks.map((t) => t.name).join("・") : "タスクなし"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); onDeleteTaskGroup(g.id); }} className="text-xs text-gray-300 hover:text-red-400 transition-colors">削除</button>
                        <span className="text-gray-300 text-xs">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-gray-50">
                        {groupTasks.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {groupTasks.map((t) => (
                              <span key={t.id} className="flex items-center gap-1 bg-white border border-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-full">
                                {t.name}
                                <button onClick={() => onRemoveTaskFromGroup(g.id, t.id)} className="text-gray-300 hover:text-red-400 ml-1">✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                        {addingToGroup === g.id ? (
                          <div className="flex gap-2">
                            <select value={pickTaskId} onChange={(e) => setPickTaskId(e.target.value)}
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400">
                              <option value="">タスクを選択</option>
                              {availableTasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button onClick={() => handleAddToGroup(g.id)} disabled={!pickTaskId}
                              className="bg-gray-900 text-white text-xs px-3 rounded-lg disabled:opacity-30">追加</button>
                            <button onClick={() => { setAddingToGroup(null); setPickTaskId(""); }} className="text-gray-400 text-xs px-2">✕</button>
                          </div>
                        ) : (
                          availableTasks.length > 0 && (
                            <button onClick={() => { setAddingToGroup(g.id); setPickTaskId(""); }}
                              className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                              + タスクを追加
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* モーダル */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>

            {modal === "project" && (
              <>
                <h3 className="text-base font-semibold text-gray-900">案件を追加</h3>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="案件名" autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
                <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="契約金額（円）" type="number"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
                <div className="space-y-1">
                  <label className="text-sm text-gray-500">カラー</label>
                  <ColorPicker value={color} onChange={setColor} />
                </div>
                {templates.length > 0 && (
                  <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400">
                    <option value="">テンプレートを使用しない</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}（{t.taskNames.join("・")}）</option>)}
                  </select>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-500 text-sm font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">キャンセル</button>
                  <button onClick={handleAddProject} disabled={!name.trim() || !rate} className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium py-3 rounded-xl transition-colors">追加</button>
                </div>
              </>
            )}

            {modal === "editProject" && (
              <>
                <h3 className="text-base font-semibold text-gray-900">案件を編集</h3>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="案件名" autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
                <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="契約金額（円）" type="number"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
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

            {modal === "template" && (
              <>
                <h3 className="text-base font-semibold text-gray-900">タスクテンプレート</h3>
                {templates.length > 0 && (
                  <div className="space-y-2">
                    {templates.map((t) => (
                      <div key={t.id}>
                        {editingTemplateId === t.id ? (
                          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                            <input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="テンプレート名"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
                            <div className="flex gap-2">
                              <input value={tplTaskInput} onChange={(e) => setTplTaskInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); handleAddTplTask(); } }}
                                placeholder="タスクを追加してEnter"
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
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
                              <button onClick={() => { setEditingTemplateId(null); setTplName(""); setTplTaskNames([]); setTplTaskInput(""); }}
                                className="flex-1 border border-gray-200 text-gray-500 text-xs py-2 rounded-lg hover:bg-gray-50 transition-colors">キャンセル</button>
                              <button onClick={handleSaveTemplateEdit} disabled={!tplName.trim() || tplTaskNames.length === 0}
                                className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-xs py-2 rounded-lg transition-colors">保存</button>
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
                    <input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="テンプレート名"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
                    <div className="flex gap-2">
                      <input value={tplTaskInput} onChange={(e) => setTplTaskInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); handleAddTplTask(); } }}
                        placeholder="タスク名を入力してEnter"
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
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
                    <button onClick={handleSaveTemplate} disabled={!tplName.trim() || tplTaskNames.length === 0}
                      className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium py-3 rounded-xl transition-colors">保存</button>
                  </div>
                )}
                <button onClick={closeModal} className="w-full border border-gray-200 text-gray-500 text-sm font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">閉じる</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
