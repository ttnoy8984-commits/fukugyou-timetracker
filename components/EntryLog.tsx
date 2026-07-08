"use client";

import { useState } from "react";
import { Project, Task, TimeEntry } from "@/lib/types";
import { formatDuration } from "@/lib/storage";

interface Props {
  entries: TimeEntry[];
  projects: Project[];
  tasks: Task[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, date: string, startTime: string, endTime: string, note: string) => void;
}

export default function EntryLog({ entries, projects, tasks, onDelete, onUpdate }: Props) {
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const completed = entries
    .filter((e) => e.endTime !== null)
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, 50);

  function openEdit(e: TimeEntry) {
    setEditingEntry(e);
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
    const s = new Date(`${date}T${startTime}`);
    const en = new Date(`${date}T${endTime}`);
    if (isNaN(s.getTime()) || isNaN(en.getTime())) { setError("時刻が正しくありません"); return; }
    if (en <= s) { setError("終了は開始より後にしてください"); return; }
    onUpdate(editingEntry.id, date, startTime, endTime, note);
    setEditingEntry(null);
  }

  const previewDuration = (() => {
    if (!startTime || !endTime || !date) return null;
    const s = new Date(`${date}T${startTime}`);
    const e = new Date(`${date}T${endTime}`);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) return null;
    return formatDuration(Math.floor((e.getTime() - s.getTime()) / 1000));
  })();

  if (completed.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
        <p className="text-sm text-gray-400">まだ記録がありません</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">作業ログ</h2>
        </div>
        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
          {completed.map((e) => {
            const project = projects.find((p) => p.id === e.projectId);
            const task = tasks.find((t) => t.id === e.taskId);
            return (
              <div key={e.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project?.color ?? "#ccc" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {project?.name} <span className="text-gray-400 font-normal">/ {task?.name}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {e.date}{e.note && ` · ${e.note}`}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-mono text-gray-700">{formatDuration(e.durationSeconds)}</div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  <button onClick={() => openEdit(e)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">編集</button>
                  <button onClick={() => onDelete(e.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">削除</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 編集モーダル */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setEditingEntry(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900">ログを編集</h3>

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
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <span className="text-gray-400 pb-3">〜</span>
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">終了時刻</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>

            {previewDuration && (
              <div className="text-center text-sm text-gray-500">
                作業時間：<span className="font-mono font-medium text-gray-800">{previewDuration}</span>
              </div>
            )}

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="メモ（任意）"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
            />

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
