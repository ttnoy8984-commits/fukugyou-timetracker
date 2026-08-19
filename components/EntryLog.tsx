"use client";

import { useState } from "react";
import { Project, Task, TimeEntry } from "@/lib/types";
import { formatDuration } from "@/lib/storage";
import CalendarView from "./CalendarView";

interface Props {
  entries: TimeEntry[];
  projects: Project[];
  tasks: Task[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, projectId: string | null, taskId: string | null, date: string, startTime: string, endTime: string, note: string, pausedSeconds?: number) => void;
}

type SortKey = "date" | "duration" | "project" | "task";
type SortDir = "asc" | "desc";

export default function EntryLog({ entries, projects, tasks, onDelete, onUpdate }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterProject, setFilterProject] = useState("");
  const [filterTask, setFilterTask] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editProjectId, setEditProjectId] = useState("");
  const [editTaskId, setEditTaskId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [pausedMinutes, setPausedMinutes] = useState("0");
  const [error, setError] = useState("");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <span className="text-ink-3 ml-0.5">↕</span>;
    return <span className="text-ink-2 ml-0.5">{sortDir === "desc" ? "↓" : "↑"}</span>;
  }

  const activeFilters = [filterProject, filterTask, filterDateFrom, filterDateTo, searchQuery].filter(Boolean).length;
  // 完了案件は絞り込み・編集の選択肢からは外す（過去ログの表示・並び替えには引き続き使う）
  const selectableProjects = projects.filter((p) => !p.completedAt);

  const query = searchQuery.trim().toLowerCase();
  const filtered = entries
    .filter((e) => e.endTime !== null)
    .filter((e) => !filterProject || e.projectId === filterProject)
    .filter((e) => !filterTask || e.taskId === filterTask)
    .filter((e) => !filterDateFrom || e.date >= filterDateFrom)
    .filter((e) => !filterDateTo || e.date <= filterDateTo)
    .filter((e) => {
      if (!query) return true;
      const projectName = projects.find((p) => p.id === e.projectId)?.name ?? "";
      const taskName = tasks.find((t) => t.id === e.taskId)?.name ?? "";
      return (
        e.note.toLowerCase().includes(query) ||
        projectName.toLowerCase().includes(query) ||
        taskName.toLowerCase().includes(query)
      );
    });

  const totalFilteredSeconds = filtered.reduce((sum, e) => sum + e.durationSeconds, 0);

  const completed = filtered
    .sort((a, b) => {
      let diff = 0;
      if (sortKey === "date") {
        diff = a.startTime.localeCompare(b.startTime);
      } else if (sortKey === "duration") {
        diff = a.durationSeconds - b.durationSeconds;
      } else if (sortKey === "project") {
        // 未設定は常に先頭にまとめる
        const an = projects.find((p) => p.id === a.projectId)?.name ?? "";
        const bn = projects.find((p) => p.id === b.projectId)?.name ?? "";
        if (!an && bn) diff = -1;
        else if (an && !bn) diff = 1;
        else diff = an.localeCompare(bn);
      } else if (sortKey === "task") {
        const an = tasks.find((t) => t.id === a.taskId)?.name ?? "";
        const bn = tasks.find((t) => t.id === b.taskId)?.name ?? "";
        if (!an && bn) diff = -1;
        else if (an && !bn) diff = 1;
        else diff = an.localeCompare(bn);
      }
      return sortDir === "desc" ? -diff : diff;
    })
    .slice(0, 100);

  function openEdit(e: TimeEntry) {
    setEditingEntry(e);
    setEditProjectId(e.projectId ?? "");
    setEditTaskId(e.taskId ?? "");
    setDate(e.date);
    const start = new Date(e.startTime);
    // 終了時刻は「開始＋実働時間」で計算する（一時停止分を含む実時計の終了時刻を使うと、
    // そのまま保存した際に休憩時間が無視されて上書きされてしまうため）
    const end = new Date(start.getTime() + e.durationSeconds * 1000);
    setStartTime(`${String(start.getHours()).padStart(2,"0")}:${String(start.getMinutes()).padStart(2,"0")}`);
    setEndTime(`${String(end.getHours()).padStart(2,"0")}:${String(end.getMinutes()).padStart(2,"0")}`);
    setNote(e.note);
    setPausedMinutes(String(Math.round((e.pausedSeconds ?? 0) / 60)));
    setError("");
  }

  function handleSave() {
    if (!editingEntry) return;
    const s = new Date(`${date}T${startTime}`);
    let en = new Date(`${date}T${endTime}`);
    if (isNaN(s.getTime()) || isNaN(en.getTime())) { setError("時刻が正しくありません"); return; }
    // 終了時刻が開始時刻以前なら日を跨いだとみなす
    if (en <= s) en = new Date(en.getTime() + 24 * 60 * 60 * 1000);
    const pausedSeconds = Math.max(0, Number(pausedMinutes) || 0) * 60;
    onUpdate(editingEntry.id, editProjectId || null, editTaskId || null, date, startTime, endTime, note, pausedSeconds);
    setEditingEntry(null);
  }

  const previewDuration = (() => {
    if (!startTime || !endTime || !date) return null;
    const s = new Date(`${date}T${startTime}`);
    let e = new Date(`${date}T${endTime}`);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    if (e <= s) e = new Date(e.getTime() + 24 * 60 * 60 * 1000);
    return formatDuration(Math.floor((e.getTime() - s.getTime()) / 1000));
  })();

  const editFilteredTasks = tasks;

  function handleExportCsv() {
    const rows = [...filtered].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const header = ["日付", "案件", "タスク", "開始", "終了", "作業時間(分)", "休憩(分)", "メモ"];
    const lines = rows.map((e) => {
      const project = projects.find((p) => p.id === e.projectId);
      const task = tasks.find((t) => t.id === e.taskId);
      const start = new Date(e.startTime);
      const end = e.endTime ? new Date(e.endTime) : null;
      const fmtTime = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      const cells = [
        e.date,
        project?.name ?? "",
        task?.name ?? "",
        fmtTime(start),
        end ? fmtTime(end) : "",
        String(Math.round(e.durationSeconds / 60)),
        String(Math.round((e.pausedSeconds ?? 0) / 60)),
        e.note ?? "",
      ];
      // CSVエスケープ：カンマ・改行・引用符を含む値のみダブルクオートで囲む
      return cells.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",");
    });
    // Excelでの文字化け対策にBOMを付与
    const csv = "﻿" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `時給ノート_ログ_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* フィルターバー */}
      <div className="bg-surface rounded-2xl border border-line-2 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ink-3 uppercase tracking-wider">絞り込み</span>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-tint rounded-lg p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${viewMode === "list" ? "bg-surface text-ink font-medium shadow-sm" : "text-ink-3 hover:text-ink-2"}`}
              >
                リスト
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${viewMode === "calendar" ? "bg-surface text-ink font-medium shadow-sm" : "text-ink-3 hover:text-ink-2"}`}
              >
                カレンダー
              </button>
            </div>
            <button
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              className="text-xs text-ink-3 hover:text-ink-2 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              CSV書き出し（{filtered.length}件）
            </button>
            {activeFilters > 0 && (
              <button
                onClick={() => { setFilterProject(""); setFilterTask(""); setFilterDateFrom(""); setFilterDateTo(""); setSearchQuery(""); }}
                className="text-xs text-accent-text hover:text-accent-deep"
              >
                クリア（{activeFilters}件）
              </button>
            )}
          </div>
        </div>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="メモ・案件名・タスク名で検索"
          className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <label className="text-xs text-ink-3 mb-1 block">案件</label>
            <select
              value={filterProject}
              onChange={(e) => { setFilterProject(e.target.value); setFilterTask(""); }}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            >
              <option value="">すべて</option>
              {selectableProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-ink-3 mb-1 block">タスク</label>
            <select
              value={filterTask}
              onChange={(e) => setFilterTask(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            >
              <option value="">すべて</option>
              {(filterProject ? tasks.filter((t) => t.projectId === filterProject) : tasks).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-ink-3 mb-1 block">開始日</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-ink-3 mb-1 block">終了日</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <CalendarView entries={filtered} projects={projects} tasks={tasks} onEdit={openEdit} />
      ) : (
      <>
      {/* テーブル */}
      <div className="bg-surface rounded-2xl border border-line-2 overflow-hidden">
        {completed.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-3">
            {activeFilters > 0 ? "条件に一致する記録がありません" : "記録がありません"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line-2 bg-tint">
                  <th className="text-left px-4 py-3 whitespace-nowrap">
                    <button onClick={() => handleSort("date")} className="text-xs font-medium text-ink-2 hover:text-ink">
                      日付{sortIcon("date")}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">
                    <button onClick={() => handleSort("project")} className="text-xs font-medium text-ink-2 hover:text-ink">
                      案件{sortIcon("project")}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">
                    <button onClick={() => handleSort("task")} className="text-xs font-medium text-ink-2 hover:text-ink">
                      タスク{sortIcon("task")}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-ink-2 whitespace-nowrap">メモ</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-ink-2 whitespace-nowrap">休憩</th>
                  <th className="text-right px-4 py-3 whitespace-nowrap">
                    <button onClick={() => handleSort("duration")} className="text-xs font-medium text-ink-2 hover:text-ink">
                      時間{sortIcon("duration")}
                    </button>
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line-2">
                {completed.map((e) => {
                  const project = projects.find((p) => p.id === e.projectId);
                  const task = tasks.find((t) => t.id === e.taskId);
                  return (
                    <tr key={e.id} className="hover:bg-tint transition-colors group">
                      <td className="px-4 py-3 text-ink-2 whitespace-nowrap text-xs">{e.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project?.color ?? "#ccc" }} />
                          <span className="text-ink font-medium text-xs">{project?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-2 text-xs whitespace-nowrap">{task?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-3 text-xs max-w-[120px] truncate">{e.note || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">
                        {e.pausedSeconds ? <span className="text-warn">{formatDuration(e.pausedSeconds)}</span> : <span className="text-ink-3">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-ink-2 text-xs whitespace-nowrap">{formatDuration(e.durationSeconds)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => openEdit(e)} className="text-xs text-ink-3 hover:text-ink-2">編集</button>
                          <button onClick={() => onDelete(e.id)} className="text-xs text-ink-3 hover:text-bad">削除</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {completed.length > 0 && (
          <div className="border-t border-line-2 px-4 py-3 flex items-center justify-between bg-tint">
            <span className="text-xs text-ink-3">{filtered.length}件</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-ink-3">合計</span>
              <span className="text-sm font-mono font-medium text-ink-2">{formatDuration(totalFilteredSeconds)}</span>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* 編集モーダル */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setEditingEntry(null)}>
          <div className="bg-surface rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-ink">ログを編集</h3>
            <div>
              <label className="text-xs text-ink-3 mb-1 block">案件</label>
              <select value={editProjectId} onChange={(e) => { setEditProjectId(e.target.value); setEditTaskId(""); }}
                className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent">
                <option value="">案件を選択</option>
                {selectableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-3 mb-1 block">タスク</label>
              <select value={editTaskId} onChange={(e) => setEditTaskId(e.target.value)} disabled={!editProjectId}
                className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent disabled:opacity-40">
                <option value="">タスクを選択</option>
                {editFilteredTasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-3 mb-1 block">日付</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent" />
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-ink-3 mb-1 block">開始時刻</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent" />
              </div>
              <span className="text-ink-3 pb-3">〜</span>
              <div className="flex-1">
                <label className="text-xs text-ink-3 mb-1 block">終了時刻</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent" />
              </div>
            </div>
            {previewDuration && (
              <div className="text-center text-sm text-ink-2">
                作業時間：<span className="font-mono font-medium text-ink">{previewDuration}</span>
              </div>
            )}
            <div>
              <label className="text-xs text-ink-3 mb-1 block">休憩時間（分）</label>
              <input type="number" min="0" value={pausedMinutes} onChange={(e) => setPausedMinutes(e.target.value)}
                className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent" />
              <p className="text-xs text-ink-3 mt-1">上の「作業時間」には含まれていません（タイマーの一時停止時間、または手動で記録する休憩）</p>
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="メモ（任意）"
              className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent" />
            {error && <p className="text-xs text-bad">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setEditingEntry(null)} className="flex-1 border border-line text-ink-2 text-sm font-medium py-3 rounded-xl hover:bg-tint transition-colors">キャンセル</button>
              <button onClick={handleSave} className="flex-1 bg-accent-strong hover:bg-accent-deep text-white text-sm font-medium py-3 rounded-xl transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
