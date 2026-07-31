"use client";

import { useState } from "react";
import { Project, Task, TimeEntry } from "@/lib/types";
import { formatDuration } from "@/lib/storage";

interface Props {
  projects: Project[];
  tasks: Task[];
  activeEntry: TimeEntry | null;
  elapsed: number;
  isPaused: boolean;
  onStart: (projectId: string | null, taskId: string | null, note: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => string | null;
  onUpdate: (id: string, projectId: string, taskId: string, note: string) => void;
  onManualAdd: (projectId: string | null, taskId: string | null, date: string, startTime: string, endTime: string, note: string) => void;
}

export default function Timer({ projects, tasks, activeEntry, elapsed, isPaused, onStart, onPause, onResume, onStop, onUpdate, onManualAdd }: Props) {
  const [mode, setMode] = useState<"timer" | "manual">("timer");

  // タイマー用
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [note, setNote] = useState("");

  // 停止後の案件割り当てモーダル
  const [assignEntryId, setAssignEntryId] = useState<string | null>(null);
  const [assignProjectId, setAssignProjectId] = useState("");
  const [assignTaskId, setAssignTaskId] = useState("");
  const [assignNote, setAssignNote] = useState("");

  // 手入力用
  const [mProjectId, setMProjectId] = useState("");
  const [mTaskId, setMTaskId] = useState("");
  const [mDate, setMDate] = useState(new Date().toISOString().slice(0, 10));
  const [mStart, setMStart] = useState("");
  const [mEnd, setMEnd] = useState("");
  const [mNote, setMNote] = useState("");
  const [mError, setMError] = useState("");

  function tasksForProject(pid: string) {
    const project = projects.find((p) => p.id === pid);
    if (!project || !project.taskIds || project.taskIds.length === 0) return tasks;
    return tasks.filter((t) => project.taskIds!.includes(t.id));
  }

  const filteredTasks = projectId ? tasksForProject(projectId) : tasks;
  const mFilteredTasks = mProjectId ? tasksForProject(mProjectId) : tasks;
  const activeProject = projects.find((p) => p.id === activeEntry?.projectId);
  const activeTask = tasks.find((t) => t.id === activeEntry?.taskId);

  function handleStart() {
    onStart(projectId || null, taskId || null, note);
    setNote("");
  }

  function handleStop() {
    const unassignedId = onStop();
    if (unassignedId) {
      setAssignEntryId(unassignedId);
      setAssignProjectId("");
      setAssignTaskId("");
      setAssignNote("");
    }
  }

  function handleAssign() {
    if (!assignEntryId || !assignProjectId || !assignTaskId) return;
    onUpdate(assignEntryId, assignProjectId, assignTaskId, assignNote);
    setAssignEntryId(null);
  }

  function handleManualAdd() {
    setMError("");
    if (!mDate || !mStart || !mEnd) {
      setMError("日付と時刻を入力してください");
      return;
    }
    const start = new Date(`${mDate}T${mStart}`);
    if (isNaN(start.getTime()) || isNaN(new Date(`${mDate}T${mEnd}`).getTime())) {
      setMError("時刻の形式が正しくありません");
      return;
    }
    onManualAdd(mProjectId || null, mTaskId || null, mDate, mStart, mEnd, mNote);
    setMStart(""); setMEnd(""); setMNote("");
  }

  // 入力から所要時間を表示（終了時刻が開始時刻以前なら日を跨いだとみなす）
  const previewDuration = (() => {
    if (!mStart || !mEnd || !mDate) return null;
    const start = new Date(`${mDate}T${mStart}`);
    let end = new Date(`${mDate}T${mEnd}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    return formatDuration(Math.floor((end.getTime() - start.getTime()) / 1000));
  })();

  return (
    <div className="space-y-4">
      {/* モード切替 */}
      <div className="flex bg-white border border-line-2 rounded-xl p-1">
        <button
          onClick={() => setMode("timer")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
            mode === "timer" ? "bg-accent-strong text-white font-medium" : "text-ink-3 hover:text-ink-2"
          }`}
        >
          タイマー
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
            mode === "manual" ? "bg-accent-strong text-white font-medium" : "text-ink-3 hover:text-ink-2"
          }`}
        >
          手入力
        </button>
      </div>

      {mode === "timer" ? (
        <div className="bg-white rounded-2xl p-8 space-y-4 border border-line-2">
          {activeEntry ? (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeProject?.color ?? "#d1d5db" }} />
                  <span className="text-sm text-ink-2">
                    {activeProject ? `${activeProject.name} / ${activeTask?.name ?? "—"}` : "案件未設定（停止後に設定できます）"}
                  </span>
                </div>
                {activeEntry.note && <p className="text-sm text-ink-3 pl-4">{activeEntry.note}</p>}
              </div>
              <div className="text-center">
                <div className={`text-6xl font-mono font-light tracking-tight ${isPaused ? "text-amber-700" : "text-ink"}`}>
                  {formatDuration(elapsed)}
                </div>
                {isPaused && <p className="text-xs text-amber-700 mt-1">一時停止中</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={isPaused ? onResume : onPause}
                  className="flex-1 border border-line text-ink-2 hover:bg-tint text-sm font-medium py-3 rounded-xl transition-colors"
                >
                  {isPaused ? "再開" : "一時停止"}
                </button>
                <button
                  onClick={handleStop}
                  className="flex-1 bg-accent-strong hover:bg-accent-deep text-white text-sm font-medium py-3 rounded-xl transition-colors"
                >
                  停止
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-sm font-medium text-ink-3 uppercase tracking-wider">新しい作業</h2>
              <select
                value={projectId}
                onChange={(e) => { setProjectId(e.target.value); setTaskId(""); }}
                className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              >
                <option value="">案件（後で設定可）</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              >
                <option value="">タスク（後で設定可）</option>
                {filteredTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="メモ（任意）"
                className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              />
              <button
                onClick={handleStart}
                className="w-full bg-accent-strong hover:bg-accent-deep text-white text-sm font-medium py-3 rounded-xl transition-colors"
              >
                開始
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 space-y-4 border border-line-2">
          <h2 className="text-sm font-medium text-ink-3 uppercase tracking-wider">手入力</h2>

          <select
            value={mProjectId}
            onChange={(e) => { setMProjectId(e.target.value); setMTaskId(""); }}
            className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
          >
            <option value="">案件を選択</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={mTaskId}
            onChange={(e) => setMTaskId(e.target.value)}
            className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
          >
            <option value="">タスク（後で設定可）</option>
            {mFilteredTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <div>
            <label className="text-xs text-ink-3 mb-1 block">日付</label>
            <input
              type="date"
              value={mDate}
              onChange={(e) => setMDate(e.target.value)}
              className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-ink-3 mb-1 block">開始時刻</label>
              <input
                type="time"
                value={mStart}
                onChange={(e) => setMStart(e.target.value)}
                className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <span className="text-ink-3 pb-3">〜</span>
            <div className="flex-1">
              <label className="text-xs text-ink-3 mb-1 block">終了時刻</label>
              <input
                type="time"
                value={mEnd}
                onChange={(e) => setMEnd(e.target.value)}
                className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {previewDuration && (
            <div className="text-center text-sm text-ink-2">
              作業時間：<span className="font-mono font-medium text-ink">{previewDuration}</span>
            </div>
          )}

          <input
            value={mNote}
            onChange={(e) => setMNote(e.target.value)}
            placeholder="メモ（任意）"
            className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
          />

          {mError && <p className="text-xs text-red-700">{mError}</p>}

          <button
            onClick={handleManualAdd}
            disabled={!mDate || !mStart || !mEnd}
            className="w-full bg-accent-strong hover:bg-accent-deep disabled:opacity-30 text-white text-sm font-medium py-3 rounded-xl transition-colors"
          >
            記録する
          </button>
        </div>
      )}

      {projects.length === 0 && (
        <p className="text-center text-sm text-ink-3">まず「案件」タブで案件とタスクを登録してください</p>
      )}

      {/* 停止後の案件割り当てモーダル */}
      {assignEntryId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-ink">作業を記録しました</h3>
              <p className="text-xs text-ink-3 mt-1">案件とタスクを割り当ててください（後でログから編集もできます）</p>
            </div>
            <select
              value={assignProjectId}
              onChange={(e) => { setAssignProjectId(e.target.value); setAssignTaskId(""); }}
              className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
            >
              <option value="">案件を選択</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select
              value={assignTaskId}
              onChange={(e) => setAssignTaskId(e.target.value)}
              className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
            >
              <option value="">タスクを選択</option>
              {(assignProjectId ? tasksForProject(assignProjectId) : tasks).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <input
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
              placeholder="メモ（任意）"
              className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setAssignEntryId(null)}
                className="flex-1 border border-line text-ink-2 text-sm font-medium py-3 rounded-xl hover:bg-tint transition-colors"
              >
                後で設定する
              </button>
              <button
                onClick={handleAssign}
                disabled={!assignProjectId || !assignTaskId}
                className="flex-1 bg-accent-strong hover:bg-accent-deep disabled:opacity-30 text-white text-sm font-medium py-3 rounded-xl transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
