"use client";

import { Fragment, useEffect, useState } from "react";
import { Client, Project, Task, TaskGroup } from "@/lib/types";
import { calcAmountExcludingTax, calcAmountIncludingTax, calcEffectiveHourlyRate, formatDuration } from "@/lib/storage";

// 明度・彩度を揃えて色相だけ回した中間色。並べたときにトーンが揃って見える
const PRESET_COLORS = [
  "#4c8cd2","#00a0a0","#0fa17a","#589c55","#a3a53e",
  "#c59634","#c66e45","#ca6862","#c3678d","#9576c9",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className={`w-8 h-8 rounded-full border-2 transition-transform ${value === c ? "border-accent-strong scale-110" : "border-transparent"}`}
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
  onToggleProjectComplete: (id: string, date?: string) => void;
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
  getProjectTaskBreakdown: (projectId: string) => { taskName: string; seconds: number }[];
}

type Section = "projects" | "tasks" | "clients";
type ProjectSortKey = "name" | "client" | "amount" | "rate" | "duration";
type SortDir = "asc" | "desc";
type ModalType = "project" | "editProject" | null;
const TARGET_RATE_KEY = "fukugyou_target_rate";

// 目標時給に対する消化率で色分け（レポートの案件分析タブと同じ基準）
function burnColor(rate: number, target: number | null): string {
  if (!target) return "text-ink-2";
  const ratio = rate / target;
  if (ratio >= 1) return "text-good";
  if (ratio >= 0.7) return "text-warn";
  return "text-bad";
}

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
  getProjectTotalSeconds, getTaskTotalSeconds, getProjectTaskBreakdown,
}: Props) {
  const [section, setSection] = useState<Section>("projects");
  const [projectSortKey, setProjectSortKey] = useState<ProjectSortKey>("name");
  const [projectSortDir, setProjectSortDir] = useState<SortDir>("asc");
  const [modal, setModal] = useState<ModalType>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // 案件フォーム
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [color, setColor] = useState("#4c8cd2");
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
  const [completingProjectId, setCompletingProjectId] = useState<string | null>(null);
  const [completeDate, setCompleteDate] = useState(() => new Date().toISOString().slice(0, 10));

  // 目標時給（レポートタブで設定した値をそのまま流用し、進行中案件の消化率アラートに使う）
  const [targetRate, setTargetRate] = useState<number | null>(null);
  useEffect(() => {
    const saved = localStorage.getItem(TARGET_RATE_KEY);
    if (saved) setTargetRate(Number(saved));
  }, []);

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
    setName(""); setRate(""); setColor("#4c8cd2");
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
      <div className="flex gap-1 bg-surface border border-line-2 rounded-xl p-1">
        <button onClick={() => setSection("projects")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${section === "projects" ? "bg-accent-strong text-white font-medium" : "text-ink-3 hover:text-ink-2"}`}>
          案件
        </button>
        <button onClick={() => setSection("tasks")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${section === "tasks" ? "bg-accent-strong text-white font-medium" : "text-ink-3 hover:text-ink-2"}`}>
          タスク
        </button>
        <button onClick={() => setSection("clients")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${section === "clients" ? "bg-accent-strong text-white font-medium" : "text-ink-3 hover:text-ink-2"}`}>
          クライアント
        </button>
      </div>

      {/* ===== 案件セクション ===== */}
      {section === "projects" && (
        <>
          <button onClick={() => setModal("project")}
            className="w-full bg-accent-strong hover:bg-accent-deep text-white text-sm font-medium py-3 rounded-xl transition-colors">
            + 案件を追加
          </button>

          {projects.length === 0 ? (
            <div className="bg-surface rounded-2xl p-8 border border-line-2 text-center">
              <p className="text-sm text-ink-3">案件がありません</p>
            </div>
          ) : (
            <>
              {(() => {
                function handleProjectSort(key: ProjectSortKey) {
                  if (projectSortKey === key) setProjectSortDir(projectSortDir === "desc" ? "asc" : "desc");
                  else { setProjectSortKey(key); setProjectSortDir("asc"); }
                }
                function sortIcon(key: ProjectSortKey) {
                  if (projectSortKey !== key) return <span className="text-ink-3 ml-0.5">↕</span>;
                  return <span className="text-ink-2 ml-0.5">{projectSortDir === "desc" ? "↓" : "↑"}</span>;
                }
                function rowsFor(list: Project[]) {
                  const rows = list.map((p) => {
                    const totalSeconds = getProjectTotalSeconds(p.id);
                    const includingTax = calcAmountIncludingTax(p.contractAmount, p.taxIncluded);
                    const effectiveRate = calcEffectiveHourlyRate(totalSeconds, includingTax);
                    const client = clients.find((c) => c.id === p.clientId);
                    return { p, totalSeconds, effectiveRate, client };
                  });
                  rows.sort((a, b) => {
                    let diff = 0;
                    switch (projectSortKey) {
                      case "name": diff = a.p.name.localeCompare(b.p.name); break;
                      case "client": diff = (a.client?.name ?? "").localeCompare(b.client?.name ?? ""); break;
                      case "amount": diff = a.p.contractAmount - b.p.contractAmount; break;
                      case "rate": diff = a.effectiveRate - b.effectiveRate; break;
                      case "duration": diff = a.totalSeconds - b.totalSeconds; break;
                    }
                    return projectSortDir === "desc" ? -diff : diff;
                  });
                  return rows;
                }

                const activeRows = rowsFor(projects.filter((p) => !p.completedAt));
                const completedRows = rowsFor(projects.filter((p) => p.completedAt));
                const burnAlertCount = targetRate
                  ? activeRows.filter((r) => r.totalSeconds > 0 && r.effectiveRate < targetRate).length
                  : 0;

                const headerRow = (
                  <tr className="border-b border-line-2 bg-tint">
                    <th className="px-4 py-3 w-8" />
                    <th className="text-left px-2 py-3 whitespace-nowrap">
                      <button onClick={() => handleProjectSort("name")} className="text-xs font-medium text-ink-2 hover:text-ink">
                        案件名{sortIcon("name")}
                      </button>
                    </th>
                    <th className="text-left px-2 py-3 whitespace-nowrap">
                      <button onClick={() => handleProjectSort("client")} className="text-xs font-medium text-ink-2 hover:text-ink">
                        クライアント{sortIcon("client")}
                      </button>
                    </th>
                    <th className="text-right px-2 py-3 whitespace-nowrap">
                      <button onClick={() => handleProjectSort("amount")} className="text-xs font-medium text-ink-2 hover:text-ink">
                        契約金額{sortIcon("amount")}
                      </button>
                    </th>
                    <th className="text-right px-2 py-3 whitespace-nowrap">
                      <button onClick={() => handleProjectSort("rate")} className="text-xs font-medium text-ink-2 hover:text-ink">
                        時給{sortIcon("rate")}
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 whitespace-nowrap">
                      <button onClick={() => handleProjectSort("duration")} className="text-xs font-medium text-ink-2 hover:text-ink">
                        作業時間{sortIcon("duration")}
                      </button>
                    </th>
                  </tr>
                );

                function renderRows(rows: ReturnType<typeof rowsFor>) {
                  return rows.map(({ p, totalSeconds, effectiveRate, client }) => {
                    const isExpanded = expandedProject === p.id;
                    const isCompleted = !!p.completedAt;
                    return (
                      <Fragment key={p.id}>
                        <tr className={`border-b border-line-2 cursor-pointer hover:bg-tint transition-colors ${isCompleted ? "opacity-50" : ""}`}
                          onClick={() => setExpandedProject(isExpanded ? null : p.id)}>
                          <td className="px-4 py-3 relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isCompleted) { onToggleProjectComplete(p.id); return; }
                                setCompleteDate(new Date().toISOString().slice(0, 10));
                                setCompletingProjectId(completingProjectId === p.id ? null : p.id);
                              }}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isCompleted ? "bg-good-strong border-good-strong" : "border-line hover:border-accent"
                              }`}
                              title={isCompleted ? "完了を解除" : "完了にする"}
                            >
                              {isCompleted && <span className="text-white text-xs">✓</span>}
                            </button>
                            {completingProjectId === p.id && (
                              <div onClick={(e) => e.stopPropagation()}
                                className="absolute left-0 top-8 z-20 bg-surface border border-line rounded-xl shadow-lg p-3 w-56 space-y-2">
                                <label className="text-xs text-ink-3 block">完了日</label>
                                <input type="date" value={completeDate} onChange={(e) => setCompleteDate(e.target.value)}
                                  className="w-full border border-line rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-accent" />
                                <div className="flex gap-2">
                                  <button onClick={() => setCompletingProjectId(null)}
                                    className="flex-1 border border-line text-ink-2 text-xs py-1.5 rounded-lg hover:bg-tint transition-colors">キャンセル</button>
                                  <button onClick={() => { onToggleProjectComplete(p.id, completeDate); setCompletingProjectId(null); }}
                                    className="flex-1 bg-accent-strong hover:bg-accent-deep text-white text-xs py-1.5 rounded-lg transition-colors">完了にする</button>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                              <span className={`text-sm text-ink whitespace-nowrap ${isCompleted ? "line-through" : ""}`}>{p.name}</span>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-xs text-ink-2 whitespace-nowrap">{client?.name ?? "—"}</td>
                          <td className="px-2 py-3 text-right text-xs text-ink-2 whitespace-nowrap">
                            ¥{p.contractAmount.toLocaleString()}
                            <span className="text-ink-3 ml-1">{p.taxIncluded ? "込" : "抜"}</span>
                          </td>
                          <td className="px-2 py-3 text-right text-xs whitespace-nowrap">
                            {totalSeconds > 0 ? (
                              <span className={!isCompleted ? burnColor(effectiveRate, targetRate) : "text-ink-2"}>
                                {!isCompleted && targetRate && effectiveRate < targetRate * 0.7 && "⚠ "}
                                ¥{Math.round(effectiveRate).toLocaleString()}
                              </span>
                            ) : <span className="text-ink-3">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-mono text-ink-2 whitespace-nowrap">
                            {totalSeconds > 0 ? formatDuration(totalSeconds) : "—"}
                          </td>
                        </tr>
                        {isExpanded && (() => {
                          const taskRows = getProjectTaskBreakdown(p.id);
                          return (
                            <tr>
                              <td colSpan={6} className="border-b border-line-2 bg-tint px-6 py-4 space-y-3">
                                <div className="text-xs text-ink-2 space-y-0.5">
                                  <div>税込金額：¥{Math.round(calcAmountIncludingTax(p.contractAmount, p.taxIncluded)).toLocaleString()}</div>
                                  <div>税抜金額：¥{Math.round(calcAmountExcludingTax(p.contractAmount, p.taxIncluded)).toLocaleString()}</div>
                                </div>
                                {taskRows.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs text-ink-3 uppercase tracking-wider">タスク別作業時間</p>
                                    {taskRows.map((t) => (
                                      <div key={t.taskName}>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs text-ink-2">{t.taskName}</span>
                                          <span className="text-xs font-mono text-ink-2">{formatDuration(t.seconds)}</span>
                                        </div>
                                        <div className="w-full bg-line rounded-full h-1">
                                          <div className="h-1 rounded-full" style={{
                                            backgroundColor: p.color, opacity: 0.6,
                                            width: totalSeconds > 0 ? `${(t.seconds / totalSeconds) * 100}%` : "0%",
                                          }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex gap-4 pt-1">
                                  <button onClick={() => openEditProject(p)} className="text-xs text-ink-2 hover:text-ink transition-colors">案件を編集</button>
                                  <button onClick={() => { onDeleteProject(p.id); setExpandedProject(null); }} className="text-xs text-bad hover:text-bad-strong transition-colors">削除</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })()}
                      </Fragment>
                    );
                  });
                }

                return (
                  <>
                    {burnAlertCount > 0 && (
                      <div className="bg-accent-50 border border-warn/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
                        <span className="text-warn text-sm">⚠</span>
                        <p className="text-xs text-ink-2">
                          目標時給（¥{targetRate?.toLocaleString()}/h）を下回っている進行中の案件が
                          <span className="font-medium text-warn mx-0.5">{burnAlertCount}件</span>
                          あります
                        </p>
                      </div>
                    )}
                    <div className="bg-surface rounded-2xl border border-line-2 overflow-x-auto">
                      {activeRows.length === 0 ? (
                        <p className="px-6 py-8 text-sm text-ink-3 text-center">進行中の案件がありません</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>{headerRow}</thead>
                          <tbody>{renderRows(activeRows)}</tbody>
                        </table>
                      )}
                    </div>
                    {completedRows.length > 0 && (
                      <div>
                        <button onClick={() => setShowCompleted(!showCompleted)} className="text-xs text-accent-text hover:text-accent-deep transition-colors mb-2">
                          完了した案件（{completedRows.length}件）{showCompleted ? "を隠す" : "を表示"}
                        </button>
                        {showCompleted && (
                          <div className="bg-surface rounded-2xl border border-line-2 overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>{headerRow}</thead>
                              <tbody>{renderRows(completedRows)}</tbody>
                            </table>
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
          <div className="bg-surface rounded-2xl border border-line-2 overflow-hidden">
            <div className="px-4 py-3 border-b border-line-2 flex items-center justify-between">
              <span className="text-xs font-medium text-ink-3 uppercase tracking-wider">タスク一覧</span>
              <span className="text-xs text-ink-3">{tasks.length}件</span>
            </div>
            {tasks.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-3 text-center">タスクがありません</p>
            ) : (
              <div className="divide-y divide-line-2 max-h-64 overflow-y-auto">
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
                            className="flex-1 border border-line rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-ink-3"
                          />
                          <button onClick={saveRenameTask} disabled={!renameTaskValue.trim()} className="text-xs text-white bg-accent-strong disabled:opacity-30 px-3 rounded-lg">保存</button>
                          <button onClick={() => setRenamingTaskId(null)} className="text-xs text-ink-3 px-2">✕</button>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <span className="text-sm text-ink-2">{t.name}</span>
                            {inGroups.length > 0 && (
                              <div className="flex gap-1 mt-0.5 flex-wrap">
                                {inGroups.map((g) => (
                                  <span key={g.id} className="text-xs bg-line-2 text-ink-3 px-2 py-0.5 rounded-full">{g.name}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {sec > 0 && <span className="text-xs font-mono text-ink-3">{formatDuration(sec)}</span>}
                            <button onClick={() => startRenameTask(t)} className="text-xs text-ink-3 hover:text-ink-2 transition-colors">編集</button>
                            <button onClick={() => onDeleteTask(t.id)} className="text-xs text-ink-3 hover:text-bad transition-colors">削除</button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* タスク追加 */}
            <div className="border-t border-line-2 px-4 py-3 flex gap-2">
              <input value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={onEnterKey(handleAddTask)}
                placeholder="新しいタスクを追加"
                className="flex-1 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              <button onClick={handleAddTask} disabled={!newTaskName.trim()}
                className="bg-accent-strong hover:bg-accent-deep disabled:opacity-30 text-white text-sm font-medium px-4 rounded-lg transition-colors">
                追加
              </button>
            </div>
          </div>

          {/* グループ */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-2">タスクグループ</span>
            {addingGroup ? (
              <div className="flex gap-2">
                <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={onEnterKey(handleAddGroup)}
                  placeholder="グループ名" autoFocus
                  className="border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
                <button onClick={handleAddGroup} disabled={!newGroupName.trim()}
                  className="bg-accent-strong text-white text-sm px-3 py-1.5 rounded-lg disabled:opacity-30">追加</button>
                <button onClick={() => { setAddingGroup(false); setNewGroupName(""); }} className="text-ink-3 text-sm px-2">✕</button>
              </div>
            ) : (
              <button onClick={() => setAddingGroup(true)} className="text-xs text-ink-3 hover:text-ink-2 transition-colors">+ グループを追加</button>
            )}
          </div>

          {taskGroups.length === 0 ? (
            <div className="bg-surface rounded-2xl p-6 border border-line-2 text-center">
              <p className="text-sm text-ink-3">グループがありません</p>
              <p className="text-xs text-ink-3 mt-1">グループを作ってタスクをまとめると、案件登録時に使えます</p>
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
                  <div key={g.id} className="bg-surface rounded-2xl border border-line-2 overflow-hidden">
                    {isRenamingGroup ? (
                      <div className="flex items-center gap-2 px-4 py-3">
                        <input
                          value={renameGroupValue}
                          onChange={(e) => setRenameGroupValue(e.target.value)}
                          onKeyDown={onEnterKey(saveRenameGroup)}
                          autoFocus
                          className="flex-1 border border-line rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-ink-3"
                        />
                        <button onClick={saveRenameGroup} disabled={!renameGroupValue.trim()} className="text-xs text-white bg-accent-strong disabled:opacity-30 px-3 py-1.5 rounded-lg">保存</button>
                        <button onClick={() => setRenamingGroupId(null)} className="text-xs text-ink-3 px-2">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-tint"
                        onClick={() => setExpandedGroup(isExpanded ? null : g.id)}>
                        <div>
                          <span className="text-sm font-medium text-ink">{g.name}</span>
                          <span className="ml-2 text-xs text-ink-3">
                            {groupTasks.length > 0 ? groupTasks.map((t) => t.name).join("・") : "タスクなし"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); startRenameGroup(g); }} className="text-xs text-ink-3 hover:text-ink-2 transition-colors">編集</button>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteTaskGroup(g.id); }} className="text-xs text-ink-3 hover:text-bad transition-colors">削除</button>
                          <span className="text-ink-3 text-xs">{isExpanded ? "▲" : "▼"}</span>
                        </div>
                      </div>
                    )}
                    {isExpanded && (
                      <div className="border-t border-line-2 px-4 py-3 space-y-2 bg-tint">
                        {groupTasks.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {groupTasks.map((t) => (
                              <span key={t.id} className="flex items-center gap-1 bg-surface border border-line text-ink-2 text-xs px-3 py-1.5 rounded-full">
                                {t.name}
                                <button onClick={() => onRemoveTaskFromGroup(g.id, t.id)} className="text-ink-3 hover:text-bad ml-1">✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                        {addingToGroup === g.id ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-surface border border-line rounded-lg">
                              {availableTasks.length === 0 ? (
                                <span className="text-xs text-ink-3">追加できるタスクがありません</span>
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
                                          ? "bg-accent-strong text-white border-accent-strong"
                                          : "bg-tint text-ink-2 border-line hover:border-accent"
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
                                className="flex-1 border border-line text-ink-2 text-xs py-2 rounded-lg hover:bg-tint transition-colors">キャンセル</button>
                              <button onClick={() => handleAddToGroup(g.id)} disabled={pickTaskIds.length === 0}
                                className="flex-1 bg-accent-strong hover:bg-accent-deep disabled:opacity-30 text-white text-xs py-2 rounded-lg transition-colors">
                                {pickTaskIds.length > 0 ? `${pickTaskIds.length}件を追加` : "追加"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          availableTasks.length > 0 && (
                            <button onClick={() => { setAddingToGroup(g.id); setPickTaskIds([]); }}
                              className="text-xs text-ink-3 hover:text-ink-2 transition-colors">
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
        <div className="bg-surface rounded-2xl border border-line-2 overflow-hidden">
          <div className="px-4 py-3 border-b border-line-2 flex items-center justify-between">
            <span className="text-xs font-medium text-ink-3 uppercase tracking-wider">クライアント一覧</span>
            <span className="text-xs text-ink-3">{clients.length}件</span>
          </div>
          {clients.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-3 text-center">クライアントがありません</p>
          ) : (
            <div className="divide-y divide-line-2">
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
                          className="flex-1 border border-line rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-ink-3"
                        />
                        <button onClick={saveRenameClient} disabled={!renameClientValue.trim()} className="text-xs text-white bg-accent-strong disabled:opacity-30 px-3 rounded-lg">保存</button>
                        <button onClick={() => setRenamingClientId(null)} className="text-xs text-ink-3 px-2">✕</button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="text-sm text-ink-2">{c.name}</span>
                          {projectCount > 0 && <span className="ml-2 text-xs text-ink-3">案件{projectCount}件</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => startRenameClient(c)} className="text-xs text-ink-3 hover:text-ink-2 transition-colors">編集</button>
                          <button onClick={() => onDeleteClient(c.id)} className="text-xs text-ink-3 hover:text-bad transition-colors">削除</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="border-t border-line-2 px-4 py-3 flex gap-2">
            <input value={newClientName} onChange={(e) => setNewClientName(e.target.value)}
              onKeyDown={onEnterKey(handleAddClient)}
              placeholder="新しいクライアントを追加"
              className="flex-1 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <button onClick={handleAddClient} disabled={!newClientName.trim()}
              className="bg-accent-strong hover:bg-accent-deep disabled:opacity-30 text-white text-sm font-medium px-4 rounded-lg transition-colors">
              追加
            </button>
          </div>
        </div>
      )}

      {/* モーダル */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-surface rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>

            {modal === "project" && (
              <>
                <h3 className="text-base font-semibold text-ink">案件を追加</h3>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="案件名" autoFocus
                  className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent" />
                <div className="flex gap-2">
                  <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="契約金額（円）" type="number"
                    className="flex-1 border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent" />
                  <div className="flex bg-line-2 rounded-xl p-1">
                    <button type="button" onClick={() => setTaxIncluded(true)}
                      className={`px-3 py-2 text-xs rounded-lg transition-colors ${taxIncluded ? "bg-surface text-ink font-medium shadow-sm" : "text-ink-3"}`}>税込</button>
                    <button type="button" onClick={() => setTaxIncluded(false)}
                      className={`px-3 py-2 text-xs rounded-lg transition-colors ${!taxIncluded ? "bg-surface text-ink font-medium shadow-sm" : "text-ink-3"}`}>税抜</button>
                  </div>
                </div>
                {addingClientInline ? (
                  <div className="flex gap-2">
                    <input value={inlineClientName} onChange={(e) => setInlineClientName(e.target.value)}
                      onKeyDown={onEnterKey(handleAddClientInline)}
                      placeholder="クライアント名" autoFocus
                      className="flex-1 border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent" />
                    <button onClick={handleAddClientInline} disabled={!inlineClientName.trim()}
                      className="bg-accent-strong hover:bg-accent-deep disabled:opacity-30 text-white text-sm font-medium px-4 rounded-xl transition-colors">追加</button>
                    <button onClick={() => { setAddingClientInline(false); setInlineClientName(""); }} className="text-ink-3 text-sm px-2">✕</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                      className="flex-1 border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent">
                      <option value="">クライアントなし</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setAddingClientInline(true)}
                      className="border border-line hover:bg-tint text-ink-2 text-sm px-4 rounded-xl transition-colors whitespace-nowrap">
                      + 新規
                    </button>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-sm text-ink-2">カラー</label>
                  <ColorPicker value={color} onChange={setColor} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-ink-2">関連タスク（任意）</label>
                  {taskGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {taskGroups.map((g) => {
                        const active = g.taskIds.length > 0 && g.taskIds.every((id) => projectTaskIds.includes(id));
                        return (
                          <button key={g.id} type="button" onClick={() => toggleProjectTaskGroup(g)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              active ? "bg-accent-strong text-white border-accent-strong" : "bg-tint text-ink-2 border-line hover:border-accent"
                            }`}>
                            {active ? "✓ " : ""}{g.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {tasks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-tint border border-line rounded-lg max-h-32 overflow-y-auto">
                      {tasks.map((t) => {
                        const checked = projectTaskIds.includes(t.id);
                        return (
                          <button key={t.id} type="button" onClick={() => toggleProjectTask(t.id)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              checked ? "bg-accent-strong text-white border-accent-strong" : "bg-surface text-ink-2 border-line hover:border-accent"
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
                        className="flex-1 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                      <button onClick={handleAddProjectTaskInline} disabled={!projectNewTaskName.trim()}
                        className="bg-accent-strong hover:bg-accent-deep disabled:opacity-30 text-white text-xs px-3 rounded-lg transition-colors">追加</button>
                      <button onClick={() => { setAddingProjectTask(false); setProjectNewTaskName(""); }} className="text-ink-3 text-xs px-2">✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setAddingProjectTask(true)} className="text-xs text-ink-3 hover:text-ink-2 transition-colors">
                      + 新規タスクを追加
                    </button>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={closeModal} className="flex-1 border border-line text-ink-2 text-sm font-medium py-3 rounded-xl hover:bg-tint transition-colors">キャンセル</button>
                  <button onClick={handleAddProject} disabled={!name.trim() || !rate} className="flex-1 bg-accent-strong hover:bg-accent-deep disabled:opacity-30 text-white text-sm font-medium py-3 rounded-xl transition-colors">追加</button>
                </div>
              </>
            )}

            {modal === "editProject" && (
              <>
                <h3 className="text-base font-semibold text-ink">案件を編集</h3>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="案件名" autoFocus
                  className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent" />
                <div className="flex gap-2">
                  <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="契約金額（円）" type="number"
                    className="flex-1 border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent" />
                  <div className="flex bg-line-2 rounded-xl p-1">
                    <button type="button" onClick={() => setTaxIncluded(true)}
                      className={`px-3 py-2 text-xs rounded-lg transition-colors ${taxIncluded ? "bg-surface text-ink font-medium shadow-sm" : "text-ink-3"}`}>税込</button>
                    <button type="button" onClick={() => setTaxIncluded(false)}
                      className={`px-3 py-2 text-xs rounded-lg transition-colors ${!taxIncluded ? "bg-surface text-ink font-medium shadow-sm" : "text-ink-3"}`}>税抜</button>
                  </div>
                </div>
                {addingClientInline ? (
                  <div className="flex gap-2">
                    <input value={inlineClientName} onChange={(e) => setInlineClientName(e.target.value)}
                      onKeyDown={onEnterKey(handleAddClientInline)}
                      placeholder="クライアント名" autoFocus
                      className="flex-1 border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent" />
                    <button onClick={handleAddClientInline} disabled={!inlineClientName.trim()}
                      className="bg-accent-strong hover:bg-accent-deep disabled:opacity-30 text-white text-sm font-medium px-4 rounded-xl transition-colors">追加</button>
                    <button onClick={() => { setAddingClientInline(false); setInlineClientName(""); }} className="text-ink-3 text-sm px-2">✕</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                      className="flex-1 border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent">
                      <option value="">クライアントなし</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setAddingClientInline(true)}
                      className="border border-line hover:bg-tint text-ink-2 text-sm px-4 rounded-xl transition-colors whitespace-nowrap">
                      + 新規
                    </button>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-sm text-ink-2">カラー</label>
                  <ColorPicker value={color} onChange={setColor} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-ink-2">関連タスク（任意）</label>
                  {taskGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {taskGroups.map((g) => {
                        const active = g.taskIds.length > 0 && g.taskIds.every((id) => projectTaskIds.includes(id));
                        return (
                          <button key={g.id} type="button" onClick={() => toggleProjectTaskGroup(g)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              active ? "bg-accent-strong text-white border-accent-strong" : "bg-tint text-ink-2 border-line hover:border-accent"
                            }`}>
                            {active ? "✓ " : ""}{g.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {tasks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-tint border border-line rounded-lg max-h-32 overflow-y-auto">
                      {tasks.map((t) => {
                        const checked = projectTaskIds.includes(t.id);
                        return (
                          <button key={t.id} type="button" onClick={() => toggleProjectTask(t.id)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              checked ? "bg-accent-strong text-white border-accent-strong" : "bg-surface text-ink-2 border-line hover:border-accent"
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
                        className="flex-1 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                      <button onClick={handleAddProjectTaskInline} disabled={!projectNewTaskName.trim()}
                        className="bg-accent-strong hover:bg-accent-deep disabled:opacity-30 text-white text-xs px-3 rounded-lg transition-colors">追加</button>
                      <button onClick={() => { setAddingProjectTask(false); setProjectNewTaskName(""); }} className="text-ink-3 text-xs px-2">✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setAddingProjectTask(true)} className="text-xs text-ink-3 hover:text-ink-2 transition-colors">
                      + 新規タスクを追加
                    </button>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={closeModal} className="flex-1 border border-line text-ink-2 text-sm font-medium py-3 rounded-xl hover:bg-tint transition-colors">キャンセル</button>
                  <button onClick={handleUpdateProject} disabled={!name.trim() || !rate} className="flex-1 bg-accent-strong hover:bg-accent-deep disabled:opacity-30 text-white text-sm font-medium py-3 rounded-xl transition-colors">保存</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
