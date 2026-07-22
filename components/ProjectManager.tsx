"use client";

import { useState } from "react";
import { Client, Project, Task, TaskGroup } from "@/lib/types";
import { calcAmountExcludingTax, calcAmountIncludingTax, calcEffectiveHourlyRate, formatDuration } from "@/lib/storage";

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
  clients: Client[];
  onAddProject: (name: string, contractAmount: number, color: string, taxIncluded?: boolean, clientId?: string | null, taskIds?: string[]) => void;
  onUpdateProject: (id: string, name: string, contractAmount: number, color: string, taxIncluded?: boolean, clientId?: string | null, taskIds?: string[]) => void;
  onDeleteProject: (id: string) => void;
  onToggleProjectComplete: (id: string) => void;
  onAddTask: (name: string) => Task;
  onDeleteTask: (taskId: string) => void;
  onAddTaskGroup: (name: string) => void;
  onDeleteTaskGroup: (groupId: string) => void;
  onAddTasksToGroup: (groupId: string, taskIds: string[]) => void;
  onRemoveTaskFromGroup: (groupId: string, taskId: string) => void;
  onRenameTask: (taskId: string, name: string) => void;
  onRenameTaskGroup: (groupId: string, name: string) => void;
  onAddClient: (name: string) => Client;
  onRenameClient: (id: string, name: string) => void;
  onDeleteClient: (id: string) => void;
  getProjectTotalSeconds: (projectId: string) => number;
  getTaskTotalSeconds: (taskId: string) => number;
}

type Section = "projects" | "tasks" | "clients";
type ModalType = "project" | "editProject" | null;

// IME変換中のEnterを無視するヘルパー
function onEnterKey(fn: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) fn();
  };
}

export default function ProjectManager({
  projects, tasks, taskGroups, clients,
  onAddProject, onUpdateProject, onDeleteProject, onToggleProjectComplete,
  onAddTask, onDeleteTask, onAddTaskGroup, onDeleteTaskGroup,
  onAddTasksToGroup, onRemoveTaskFromGroup, onRenameTask, onRenameTaskGroup,
  onAddClient, onRenameClient, onDeleteClient,
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
  const [taxIncluded, setTaxIncluded] = useState(true);
  const [clientId, setClientId] = useState("");
  const [addingClientInline, setAddingClientInline] = useState(false);
  const [inlineClientName, setInlineClientName] = useState("");

  // 案件フォーム：関連タスク（グループ選択＋個別タスク選択＋新規追加の合算）
  const [projectTaskIds, setProjectTaskIds] = useState<string[]>([]);
  const [addingProjectTask, setAddingProjectTask] = useState(false);
  const [projectNewTaskName, setProjectNewTaskName] = useState("");

  // クライアント追加・編集
  const [newClientName, setNewClientName] = useState("");
  const [renamingClientId, setRenamingClientId] = useState<string | null>(null);
  const [renameClientValue, setRenameClientValue] = useState("");

  // 完了案件を表示するか
  const [showCompleted, setShowCompleted] = useState(false);

  // タスク追加
  const [newTaskName, setNewTaskName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);

  // グループへのタスク追加（複数選択）
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [pickTaskIds, setPickTaskIds] = useState<string[]>([]);

  // 名前変更
  const [renamingTaskId, setRenamingTaskId] = useState<string | null>(null);
  const [renameTaskValue, setRenameTaskValue] = useState("");
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameGroupValue, setRenameGroupValue] = useState("");

  function closeModal() {
    setModal(null); setEditingProject(null);
    setName(""); setRate(""); setColor("#6366f1");
    setTaxIncluded(true); setClientId("");
    setAddingClientInline(false); setInlineClientName("");
    setProjectTaskIds([]); setAddingProjectTask(false); setProjectNewTaskName("");
  }

  function toggleProjectTask(taskId: string) {
    setProjectTaskIds((prev) => prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]);
  }

  function toggleProjectTaskGroup(group: TaskGroup) {
    const allIncluded = group.taskIds.every((id) => projectTaskIds.includes(id));
    if (allIncluded) {
      setProjectTaskIds((prev) => prev.filter((id) => !group.taskIds.includes(id)));
    } else {
      setProjectTaskIds((prev) => [...prev, ...group.taskIds.filter((id) => !prev.includes(id))]);
    }
  }

  function handleAddProjectTaskInline() {
    if (!projectNewTaskName.trim()) return;
    const t = onAddTask(projectNewTaskName.trim());
    setProjectTaskIds((prev) => [...prev, t.id]);
    setProjectNewTaskName(""); setAddingProjectTask(false);
  }

  function handleAddClientInline() {
    if (!inlineClientName.trim()) return;
    const c = onAddClient(inlineClientName.trim());
    setClientId(c.id);
    setInlineClientName(""); setAddingClientInline(false);
  }

  function openEditProject(p: Project) {
    setEditingProject(p); setName(p.name); setRate(String(p.contractAmount)); setColor(p.color);
    setTaxIncluded(p.taxIncluded); setClientId(p.clientId ?? "");
    setProjectTaskIds(p.taskIds ?? []);
    setModal("editProject");
  }

  function handleAddProject() {
    if (!name.trim() || !rate) return;
    onAddProject(name.trim(), Number(rate), color, taxIncluded, clientId || null, projectTaskIds);
    closeModal();
  }

  function handleUpdateProject() {
    if (!editingProject || !name.trim() || !rate) return;
    onUpdateProject(editingProject.id, name.trim(), Number(rate), color, taxIncluded, clientId || null, projectTaskIds);
    closeModal();
  }

  function handleAddClient() {
    if (!newClientName.trim()) return;
    onAddClient(newClientName.trim());
    setNewClientName("");
  }

  function startRenameClient(c: Client) {
    setRenamingClientId(c.id); setRenameClientValue(c.name);
  }

  function saveRenameClient() {
    if (!renamingClientId || !renameClientValue.trim()) return;
    onRenameClient(renamingClientId, renameClientValue.trim());
    setRenamingClientId(null); setRenameClientValue("");
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
    if (pickTaskIds.length === 0) return;
    onAddTasksToGroup(groupId, pickTaskIds);
    setPickTaskIds([]); setAddingToGroup(null);
  }

  function togglePickTask(taskId: string) {
    setPickTaskIds((prev) => prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]);
  }

  function startRenameTask(t: Task) {
    setRenamingTaskId(t.id); setRenameTaskValue(t.name);
  }

  function saveRenameTask() {
    if (!renamingTaskId || !renameTaskValue.trim()) return;
    onRenameTask(renamingTaskId, renameTaskValue.trim());
    setRenamingTaskId(null); setRenameTaskValue("");
  }

  function startRenameGroup(g: TaskGroup) {
    setRenamingGroupId(g.id); setRenameGroupValue(g.name);
  }

  function saveRenameGroup() {
    if (!renamingGroupId || !renameGroupValue.trim()) return;
    onRenameTaskGroup(renamingGroupId, renameGroupValue.trim());
    setRenamingGroupId(null); setRenameGroupValue("");
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
        <button onClick={() => setSection("clients")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${section === "clients" ? "bg-gray-900 text-white font-medium" : "text-gray-400 hover:text-gray-600"}`}>
          クライアント
        </button>
      </div>

      {/* ===== 案件セクション ===== */}
      {section === "projects" && (
        <>
          <button onClick={() => setModal("project")}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium py-3 rounded-xl transition-colors">
            + 案件を追加
          </button>

          {projects.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
              <p className="text-sm text-gray-400">案件がありません</p>
            </div>
          ) : (
            <>
              {(() => {
                const activeProjects = projects.filter((p) => !p.completedAt);
                const completedProjects = projects.filter((p) => p.completedAt);
                const renderProject = (p: Project, i: number, arr: Project[]) => {
                  const totalSeconds = getProjectTotalSeconds(p.id);
                  const excludingTax = calcAmountExcludingTax(p.contractAmount, p.taxIncluded);
                  const effectiveRate = calcEffectiveHourlyRate(totalSeconds, excludingTax);
                  const isExpanded = expandedProject === p.id;
                  const client = clients.find((c) => c.id === p.clientId);
                  const isCompleted = !!p.completedAt;
                  return (
                    <div key={p.id} className={i > 0 ? "border-t border-gray-100" : ""}>
                      <div className={`flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${isCompleted ? "opacity-50" : ""}`}
                        onClick={() => setExpandedProject(isExpanded ? null : p.id)}>
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleProjectComplete(p.id); }}
                          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            isCompleted ? "bg-emerald-500 border-emerald-500" : "border-gray-300 hover:border-gray-400"
                          }`}
                          title={isCompleted ? "完了を解除" : "完了にする"}
                        >
                          {isCompleted && <span className="text-white text-xs">✓</span>}
                        </button>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium text-gray-800 ${isCompleted ? "line-through" : ""}`}>{p.name}</div>
                          <div className="text-xs text-gray-400">
                            {client && <span className="mr-2">{client.name}</span>}
                            契約 ¥{p.contractAmount.toLocaleString()}（{p.taxIncluded ? "税込" : "税抜"}）
                          </div>
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
                        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 space-y-2">
                          <div className="text-xs text-gray-500 space-y-0.5">
                            <div>税込金額：¥{Math.round(calcAmountIncludingTax(p.contractAmount, p.taxIncluded)).toLocaleString()}</div>
                            <div>税抜金額：¥{Math.round(excludingTax).toLocaleString()}</div>
                          </div>
                          <div className="flex gap-4 pt-1">
                            <button onClick={() => openEditProject(p)} className="text-xs text-gray-500 hover:text-gray-800 transition-colors">案件を編集</button>
                            <button onClick={() => { onDeleteProject(p.id); setExpandedProject(null); }} className="text-xs text-red-400 hover:text-red-600 transition-colors">削除</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                };
                return (
                  <>
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      {activeProjects.length === 0 ? (
                        <p className="px-6 py-8 text-sm text-gray-400 text-center">進行中の案件がありません</p>
                      ) : (
                        activeProjects.map((p, i, arr) => renderProject(p, i, arr))
                      )}
                    </div>
                    {completedProjects.length > 0 && (
                      <div>
                        <button onClick={() => setShowCompleted(!showCompleted)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors mb-2">
                          完了した案件（{completedProjects.length}件）{showCompleted ? "を隠す" : "を表示"}
                        </button>
                        {showCompleted && (
                          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            {completedProjects.map((p, i, arr) => renderProject(p, i, arr))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </>
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
                  const isRenaming = renamingTaskId === t.id;
                  return (
                    <div key={t.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                      {isRenaming ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            value={renameTaskValue}
                            onChange={(e) => setRenameTaskValue(e.target.value)}
                            onKeyDown={onEnterKey(saveRenameTask)}
                            autoFocus
                            className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-gray-500"
                          />
                          <button onClick={saveRenameTask} disabled={!renameTaskValue.trim()} className="text-xs text-white bg-gray-900 disabled:opacity-30 px-3 rounded-lg">保存</button>
                          <button onClick={() => setRenamingTaskId(null)} className="text-xs text-gray-400 px-2">✕</button>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <span className="text-sm text-gray-700">{t.name}</span>
                            {inGroups.length > 0 && (
                              <div className="flex gap-1 mt-0.5 flex-wrap">
                                {inGroups.map((g) => (
                                  <span key={g.id} className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">{g.name}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {sec > 0 && <span className="text-xs font-mono text-gray-400">{formatDuration(sec)}</span>}
                            <button onClick={() => startRenameTask(t)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">編集</button>
                            <button onClick={() => onDeleteTask(t.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">削除</button>
                          </div>
                        </>
                      )}
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
                const taskIds = g.taskIds ?? [];
                const groupTasks = tasks.filter((t) => taskIds.includes(t.id));
                const isExpanded = expandedGroup === g.id;
                const availableTasks = tasks.filter((t) => !taskIds.includes(t.id));
                const isRenamingGroup = renamingGroupId === g.id;
                return (
                  <div key={g.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {isRenamingGroup ? (
                      <div className="flex items-center gap-2 px-4 py-3">
                        <input
                          value={renameGroupValue}
                          onChange={(e) => setRenameGroupValue(e.target.value)}
                          onKeyDown={onEnterKey(saveRenameGroup)}
                          autoFocus
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-gray-500"
                        />
                        <button onClick={saveRenameGroup} disabled={!renameGroupValue.trim()} className="text-xs text-white bg-gray-900 disabled:opacity-30 px-3 py-1.5 rounded-lg">保存</button>
                        <button onClick={() => setRenamingGroupId(null)} className="text-xs text-gray-400 px-2">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedGroup(isExpanded ? null : g.id)}>
                        <div>
                          <span className="text-sm font-medium text-gray-800">{g.name}</span>
                          <span className="ml-2 text-xs text-gray-400">
                            {groupTasks.length > 0 ? groupTasks.map((t) => t.name).join("・") : "タスクなし"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); startRenameGroup(g); }} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">編集</button>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteTaskGroup(g.id); }} className="text-xs text-gray-300 hover:text-red-400 transition-colors">削除</button>
                          <span className="text-gray-300 text-xs">{isExpanded ? "▲" : "▼"}</span>
                        </div>
                      </div>
                    )}
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
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-white border border-gray-200 rounded-lg">
                              {availableTasks.length === 0 ? (
                                <span className="text-xs text-gray-400">追加できるタスクがありません</span>
                              ) : (
                                availableTasks.map((t) => {
                                  const checked = pickTaskIds.includes(t.id);
                                  return (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => togglePickTask(t.id)}
                                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                        checked
                                          ? "bg-gray-900 text-white border-gray-900"
                                          : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400"
                                      }`}
                                    >
                                      {checked ? "✓ " : ""}{t.name}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => { setAddingToGroup(null); setPickTaskIds([]); }}
                                className="flex-1 border border-gray-200 text-gray-500 text-xs py-2 rounded-lg hover:bg-gray-50 transition-colors">キャンセル</button>
                              <button onClick={() => handleAddToGroup(g.id)} disabled={pickTaskIds.length === 0}
                                className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-xs py-2 rounded-lg transition-colors">
                                {pickTaskIds.length > 0 ? `${pickTaskIds.length}件を追加` : "追加"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          availableTasks.length > 0 && (
                            <button onClick={() => { setAddingToGroup(g.id); setPickTaskIds([]); }}
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

      {/* ===== クライアントセクション ===== */}
      {section === "clients" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">クライアント一覧</span>
            <span className="text-xs text-gray-300">{clients.length}件</span>
          </div>
          {clients.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">クライアントがありません</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {clients.map((c) => {
                const isRenaming = renamingClientId === c.id;
                const projectCount = projects.filter((p) => p.clientId === c.id).length;
                return (
                  <div key={c.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    {isRenaming ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          value={renameClientValue}
                          onChange={(e) => setRenameClientValue(e.target.value)}
                          onKeyDown={onEnterKey(saveRenameClient)}
                          autoFocus
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-gray-500"
                        />
                        <button onClick={saveRenameClient} disabled={!renameClientValue.trim()} className="text-xs text-white bg-gray-900 disabled:opacity-30 px-3 rounded-lg">保存</button>
                        <button onClick={() => setRenamingClientId(null)} className="text-xs text-gray-400 px-2">✕</button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="text-sm text-gray-700">{c.name}</span>
                          {projectCount > 0 && <span className="ml-2 text-xs text-gray-300">案件{projectCount}件</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => startRenameClient(c)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">編集</button>
                          <button onClick={() => onDeleteClient(c.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">削除</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
            <input value={newClientName} onChange={(e) => setNewClientName(e.target.value)}
              onKeyDown={onEnterKey(handleAddClient)}
              placeholder="新しいクライアントを追加"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            <button onClick={handleAddClient} disabled={!newClientName.trim()}
              className="bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium px-4 rounded-lg transition-colors">
              追加
            </button>
          </div>
        </div>
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
                <div className="flex gap-2">
                  <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="契約金額（円）" type="number"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
                  <div className="flex bg-gray-100 rounded-xl p-1">
                    <button type="button" onClick={() => setTaxIncluded(true)}
                      className={`px-3 py-2 text-xs rounded-lg transition-colors ${taxIncluded ? "bg-white text-gray-900 font-medium shadow-sm" : "text-gray-400"}`}>税込</button>
                    <button type="button" onClick={() => setTaxIncluded(false)}
                      className={`px-3 py-2 text-xs rounded-lg transition-colors ${!taxIncluded ? "bg-white text-gray-900 font-medium shadow-sm" : "text-gray-400"}`}>税抜</button>
                  </div>
                </div>
                {addingClientInline ? (
                  <div className="flex gap-2">
                    <input value={inlineClientName} onChange={(e) => setInlineClientName(e.target.value)}
                      onKeyDown={onEnterKey(handleAddClientInline)}
                      placeholder="クライアント名" autoFocus
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
                    <button onClick={handleAddClientInline} disabled={!inlineClientName.trim()}
                      className="bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium px-4 rounded-xl transition-colors">追加</button>
                    <button onClick={() => { setAddingClientInline(false); setInlineClientName(""); }} className="text-gray-400 text-sm px-2">✕</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400">
                      <option value="">クライアントなし</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setAddingClientInline(true)}
                      className="border border-gray-200 hover:bg-gray-50 text-gray-500 text-sm px-4 rounded-xl transition-colors whitespace-nowrap">
                      + 新規
                    </button>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-sm text-gray-500">カラー</label>
                  <ColorPicker value={color} onChange={setColor} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">関連タスク（任意）</label>
                  {taskGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {taskGroups.map((g) => {
                        const active = g.taskIds.length > 0 && g.taskIds.every((id) => projectTaskIds.includes(id));
                        return (
                          <button key={g.id} type="button" onClick={() => toggleProjectTaskGroup(g)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              active ? "bg-indigo-500 text-white border-indigo-500" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400"
                            }`}>
                            {active ? "✓ " : ""}{g.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {tasks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                      {tasks.map((t) => {
                        const checked = projectTaskIds.includes(t.id);
                        return (
                          <button key={t.id} type="button" onClick={() => toggleProjectTask(t.id)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              checked ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                            }`}>
                            {checked ? "✓ " : ""}{t.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {addingProjectTask ? (
                    <div className="flex gap-2">
                      <input value={projectNewTaskName} onChange={(e) => setProjectNewTaskName(e.target.value)}
                        onKeyDown={onEnterKey(handleAddProjectTaskInline)}
                        placeholder="新規タスク名" autoFocus
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
                      <button onClick={handleAddProjectTaskInline} disabled={!projectNewTaskName.trim()}
                        className="bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-xs px-3 rounded-lg transition-colors">追加</button>
                      <button onClick={() => { setAddingProjectTask(false); setProjectNewTaskName(""); }} className="text-gray-400 text-xs px-2">✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setAddingProjectTask(true)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                      + 新規タスクを追加
                    </button>
                  )}
                </div>
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
                <div className="flex gap-2">
                  <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="契約金額（円）" type="number"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
                  <div className="flex bg-gray-100 rounded-xl p-1">
                    <button type="button" onClick={() => setTaxIncluded(true)}
                      className={`px-3 py-2 text-xs rounded-lg transition-colors ${taxIncluded ? "bg-white text-gray-900 font-medium shadow-sm" : "text-gray-400"}`}>税込</button>
                    <button type="button" onClick={() => setTaxIncluded(false)}
                      className={`px-3 py-2 text-xs rounded-lg transition-colors ${!taxIncluded ? "bg-white text-gray-900 font-medium shadow-sm" : "text-gray-400"}`}>税抜</button>
                  </div>
                </div>
                {addingClientInline ? (
                  <div className="flex gap-2">
                    <input value={inlineClientName} onChange={(e) => setInlineClientName(e.target.value)}
                      onKeyDown={onEnterKey(handleAddClientInline)}
                      placeholder="クライアント名" autoFocus
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
                    <button onClick={handleAddClientInline} disabled={!inlineClientName.trim()}
                      className="bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium px-4 rounded-xl transition-colors">追加</button>
                    <button onClick={() => { setAddingClientInline(false); setInlineClientName(""); }} className="text-gray-400 text-sm px-2">✕</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400">
                      <option value="">クライアントなし</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setAddingClientInline(true)}
                      className="border border-gray-200 hover:bg-gray-50 text-gray-500 text-sm px-4 rounded-xl transition-colors whitespace-nowrap">
                      + 新規
                    </button>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-sm text-gray-500">カラー</label>
                  <ColorPicker value={color} onChange={setColor} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">関連タスク（任意）</label>
                  {taskGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {taskGroups.map((g) => {
                        const active = g.taskIds.length > 0 && g.taskIds.every((id) => projectTaskIds.includes(id));
                        return (
                          <button key={g.id} type="button" onClick={() => toggleProjectTaskGroup(g)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              active ? "bg-indigo-500 text-white border-indigo-500" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400"
                            }`}>
                            {active ? "✓ " : ""}{g.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {tasks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                      {tasks.map((t) => {
                        const checked = projectTaskIds.includes(t.id);
                        return (
                          <button key={t.id} type="button" onClick={() => toggleProjectTask(t.id)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              checked ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                            }`}>
                            {checked ? "✓ " : ""}{t.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {addingProjectTask ? (
                    <div className="flex gap-2">
                      <input value={projectNewTaskName} onChange={(e) => setProjectNewTaskName(e.target.value)}
                        onKeyDown={onEnterKey(handleAddProjectTaskInline)}
                        placeholder="新規タスク名" autoFocus
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
                      <button onClick={handleAddProjectTaskInline} disabled={!projectNewTaskName.trim()}
                        className="bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-xs px-3 rounded-lg transition-colors">追加</button>
                      <button onClick={() => { setAddingProjectTask(false); setProjectNewTaskName(""); }} className="text-gray-400 text-xs px-2">✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setAddingProjectTask(true)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                      + 新規タスクを追加
                    </button>
                  )}
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
