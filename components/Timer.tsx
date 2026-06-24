"use client";

import { useState } from "react";
import { Project, Task, TimeEntry } from "@/lib/types";
import { formatDuration } from "@/lib/storage";

interface Props {
  projects: Project[];
  tasks: Task[];
  activeEntry: TimeEntry | null;
  elapsed: number;
  onStart: (projectId: string, taskId: string, note: string) => void;
  onStop: () => void;
  onManualAdd: (projectId: string, taskId: string, date: string, startTime: string, endTime: string, note: string) => void;
}

export default function Timer({ projects, tasks, activeEntry, elapsed, onStart, onStop, onManualAdd }: Props) {
  const [mode, setMode] = useState<"timer" | "manual">("timer");

  // タイマー用
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [note, setNote] = useState("");

  // 手入力用
  const [mProjectId, setMProjectId] = useState("");
  const [mTaskId, setMTaskId] = useState("");
  const [mDate, setMDate] = useState(new Date().toISOString().slice(0, 10));
  const [mStart, setMStart] = useState("");
  const [mEnd, setMEnd] = useState("");
  const [mNote, setMNote] = useState("");
  const [mError, setMError] = useState("");

  const filteredTasks = tasks.filter((t) => t.projectId === projectId);
  const mFilteredTasks = tasks.filter((t) => t.projectId === mProjectId);
  const activeProject = projects.find((p) => p.id === activeEntry?.projectId);
  const activeTask = tasks.find((t) => t.id === activeEntry?.taskId);

  function handleStart() {
    if (!projectId || !taskId) return;
    onStart(projectId, taskId, note);
    setNote("");
  }

  function handleManualAdd() {
    setMError("");
    if (!mProjectId || !mTaskId || !mDate || !mStart || !mEnd) {
      setMError("すべての項目を入力してください");
      return;
    }
    const start = new Date(`${mDate}T${mStart}`);
    const end = new Date(`${mDate}T${mEnd}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setMError("時刻の形式が正しくありません");
      return;
    }
    if (end <= start) {
      setMError("終了時刻は開始時刻より後にしてください");
      return;
    }
    onManualAdd(mProjectId, mTaskId, mDate, mStart, mEnd, mNote);
    setMStart(""); setMEnd(""); setMNote("");
  }

  // 入力から所要時間を表示
  const previewDuration = (() => {
    if (!mStart || !mEnd || !mDate) return null;
    const start = new Date(`${mDate}T${mStart}`);
    const end = new Date(`${mDate}T${mEnd}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
    return formatDuration(Math.floor((end.getTime() - start.getTime()) / 1000));
  })();

  return (
    <div className="space-y-4">
      {/* モード切替 */}
      <div className="flex bg-white border border-gray-100 rounded-xl p-1">
        <button
          onClick={() => setMode("timer")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
            mode === "timer" ? "bg-gray-900 text-white font-medium" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          タイマー
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
            mode === "manual" ? "bg-gray-900 text-white font-medium" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          手入力
        </button>
      </div>

      {mode === "timer" ? (
        <div className="bg-white rounded-2xl p-8 space-y-4 border border-gray-100">
          {activeEntry ? (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeProject?.color ?? "#1a1a1a" }} />
                  <span className="text-sm text-gray-500">{activeProject?.name} / {activeTask?.name}</span>
                </div>
                {activeEntry.note && <p className="text-sm text-gray-400 pl-4">{activeEntry.note}</p>}
              </div>
              <div className="text-center">
                <div className="text-6xl font-mono font-light text-gray-900 tracking-tight">
                  {formatDuration(elapsed)}
                </div>
              </div>
              <button
                onClick={onStop}
                className="w-full bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium py-3 rounded-xl transition-colors"
              >
                停止
              </button>
            </>
          ) : (
            <>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">新しい作業</h2>
              <select
                value={projectId}
                onChange={(e) => { setProjectId(e.target.value); setTaskId(""); }}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
              >
                <option value="">案件を選択</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                disabled={!projectId}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 disabled:opacity-40"
              >
                <option value="">タスクを選択</option>
                {filteredTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="メモ（任意）"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
              />
              <button
                onClick={handleStart}
                disabled={!projectId || !taskId}
                className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium py-3 rounded-xl transition-colors"
              >
                開始
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 space-y-4 border border-gray-100">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">手入力</h2>

          <select
            value={mProjectId}
            onChange={(e) => { setMProjectId(e.target.value); setMTaskId(""); }}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
          >
            <option value="">案件を選択</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={mTaskId}
            onChange={(e) => setMTaskId(e.target.value)}
            disabled={!mProjectId}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 disabled:opacity-40"
          >
            <option value="">タスクを選択</option>
            {mFilteredTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">日付</label>
            <input
              type="date"
              value={mDate}
              onChange={(e) => setMDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">開始時刻</label>
              <input
                type="time"
                value={mStart}
                onChange={(e) => setMStart(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
            <span className="text-gray-400 pb-3">〜</span>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">終了時刻</label>
              <input
                type="time"
                value={mEnd}
                onChange={(e) => setMEnd(e.target.value)}
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
            value={mNote}
            onChange={(e) => setMNote(e.target.value)}
            placeholder="メモ（任意）"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
          />

          {mError && <p className="text-xs text-red-500">{mError}</p>}

          <button
            onClick={handleManualAdd}
            disabled={!mProjectId || !mTaskId || !mDate || !mStart || !mEnd}
            className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-30 text-white text-sm font-medium py-3 rounded-xl transition-colors"
          >
            記録する
          </button>
        </div>
      )}

      {projects.length === 0 && (
        <p className="text-center text-sm text-gray-400">まず「案件」タブで案件とタスクを登録してください</p>
      )}
    </div>
  );
}
