"use client";

import { useState } from "react";
import { Project, Task, TimeEntry } from "@/lib/types";
import { formatDuration } from "@/lib/storage";

interface Props {
  entries: TimeEntry[];
  projects: Project[];
  tasks: Task[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, projectId: string, taskId: string, date: string, startTime: string, endTime: string, note: string) => void;
}

type SortKey = "date" | "duration";
type SortDir = "asc" | "desc";

export default function EntryLog({ entries, projects, tasks, onDelete, onUpdate }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterProjectId, setFilterProjectId] = useState("");

  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editProjectId, setEditProjectId] = useState("");
  const [editTaskId, setEditTaskId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <span className="text-gray-200 ml-1">↕</span>;
    return <span className="text-gray-600 ml-1">{sortDir === "desc" ? "↓" : "↑"}</span>;
  }

  const completed = entries
    .filter((e) => e.endTime !== null)
    .filter((e) => !filterProjectId || e.projectId === filterProjectId)
    .sort((a, b) => {
      let diff = 0;
      if (sortKey === "date") diff = a.startTime.localeCompare(b.startTime);
      if (sortKey === "duration") diff = a.durationSeconds - b.durationSeconds;
      return sortDir === "desc" ? -diff : diff;
    })
    .slice(0, 100);

  function openEdit(e: TimeEntry) {
    setEditingEntry(e);
    setEditProjectId(e.projectId);
    setEditTaskId(e.taskId);
    setDate(e.date);
    const start = new Date(e.startTime);
    const end = new Date(e.endTime!);
    setStartTime(`${String(start.getHours()).padStart(2,"0")}:${String(start.getMinutes()).padStart(2,"0")}`);
    setEndTime(`${String(end.getHours()).padStart(2,"0")}:${String(end.getMinutes()).padStart(2,"0")}`);
    setNote(e.note);
    setError("");
  }

  function handleSave() {
    if (!editingEntry) return;
    if (!editProjectId || !editTaskId) { setError("案件とタスクを選択してください"); return; }
    const s = new Date(`${date}T${startTime}`);
    const en = new Date(`${date}T${endTime}`);
    if (isNaN(s.getTime()) || isNaN(en.getTime())) { setError("時刻が正しくありません"); return; }
    if (en <= s) { setError("終了は開始より後にしてください"); return; }
    onUpdate(editingEntry.id, editProjectId, editTaskId, date, startTime, endTime, note);
    setEditingEntry(null);
  }

  const previewDuration = (() => {
    if (!startTime || !endTime || !date) return null;
    const s = new Date(`${date}T${startTime}`);
    const e = new Date(`${date}T${endTime}`);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) return null;
    return formatDuration(Math.floor((e.getTime() - s.getTime()) / 1000));
  })();

  const editFilteredTasks = tasks.filter((t) => t.projectId === editProjectId);

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* フィルター */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="text-xs text-gray-400">案件：</span>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterProjectId("")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                !filterProjectId ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-400"
              }`}
            >
              すべて
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setFilterProjectId(filterProjectId === p.id ? "" : p.id)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                  filterProjectId === p.id ? "text-white border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-400"
                }`}
                style={filterProjectId === p.id ? { backgroundColor: p.color, borderColor: p.color } : {}}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: filterProjectId === p.id ? "white" : p.color }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {completed.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">記録がありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-800 whitespace-nowrap"
                    onClick={() => handleSort("date")}
                  >
                    日付{sortIcon("date")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">案件</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">タスク</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">メモ</th>
                  <th
                    className="text-right px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-800 whitespace-nowrap"
                    onClick={() => handleSort("duration")}
                  >
                    時間{sortIcon("duration")}
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {completed.map((e) => {
                  const project = projects.find((p) => p.id === e.projectId);
                  const task = tasks.find((t) => t.id === e.taskId);
                  return (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{e.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project?.color ?? "#ccc" }} />
                          <span className="text-gray-800 font-medium text-xs">{project?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{task?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px] truncate">{e.note || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700 text-xs whitespace-nowrap">{formatDuration(e.durationSeconds)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => openEdit(e)} className="text-xs text-gray-400 hover:text-gray-700">編集</button>
                          <button onClick={() => onDelete(e.id)} className="text-xs text-gray-300 hover:text-red-400">削除</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 編集モーダル */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setEditingEntry(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900">ログを編集</h3>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">案件</label>
              <select
                value={editProjectId}
                onChange={(e) => { setEditProjectId(e.target.value); setEditTaskId(""); }}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
              >
                <option value="">案件を選択</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">タスク</label>
              <select
                value={editTaskId}
                onChange={(e) => setEditTaskId(e.target.value)}
                disabled={!editProjectId}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 disabled:opacity-40"
              >
                <option value="">タスクを選択</option>
                {editFilteredTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">日付</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">開始時刻</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
              </div>
              <span className="text-gray-400 pb-3">〜</span>
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">終了時刻</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
              </div>
            </div>

            {previewDuration && (
              <div className="text-center text-sm text-gray-500">
                作業時間：<span className="font-mono font-medium text-gray-800">{previewDuration}</span>
              </div>
            )}

            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="メモ（任意）"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setEditingEntry(null)} className="flex-1 border border-gray-200 text-gray-500 text-sm font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">キャンセル</button>
              <button onClick={handleSave} className="flex-1 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium py-3 rounded-xl transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
