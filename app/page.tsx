"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { loadSeedData } from "@/lib/seed";
import { Favorite, Project, TimeEntry } from "@/lib/types";
import Timer from "@/components/Timer";
import ProjectManager from "@/components/ProjectManager";
import EntryLog from "@/components/EntryLog";
import MonthlyReport from "@/components/MonthlyReport";
import UndoToast from "@/components/UndoToast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { IconChart, IconFolder, IconList, IconStopwatch, IconTimer } from "@/components/icons";

type PendingUndo =
  | { type: "entry"; message: string; entry: TimeEntry }
  | { type: "project"; message: string; project: Project; entries: TimeEntry[]; favorites: Favorite[] };

type PendingDelete =
  | { type: "entry"; id: string }
  | { type: "project"; id: string; name: string };

type Tab = "timer" | "projects" | "log" | "report";
type ThemeChoice = "system" | "light" | "dark";
const THEME_KEY = "fukugyou_theme";

const tabs: { key: Tab; label: string; icon: (p: { className?: string }) => React.JSX.Element }[] = [
  { key: "timer", label: "タイマー", icon: IconTimer },
  { key: "projects", label: "案件", icon: IconFolder },
  { key: "log", label: "ログ", icon: IconList },
  { key: "report", label: "レポート", icon: IconChart },
];

/** 0→A, 1→B, ... 25→Z, 26→AA */
function letter(i: number) {
  let s = "";
  do { s = String.fromCharCode(65 + (i % 26)) + s; i = Math.floor(i / 26) - 1; } while (i >= 0);
  return s;
}

export default function Home() {
  const {
    data, activeEntry, elapsed, isPaused,
    addProject, updateProject, deleteProject, toggleProjectComplete, addTask, deleteTask, addTaskGroup, deleteTaskGroup, addTasksToGroup, removeTaskFromGroup, renameTask, renameTaskGroup, addClient, renameClient, deleteClient,
    startTimer, pauseTimer, resumeTimer, stopTimer, addManualEntry, assignEntry, updateEntry, deleteEntry, getProjectTotalSeconds, getTaskTotalSeconds, getProjectTaskBreakdown, getMonthlySummary, getWeeklySummary, getProjectSummaries, getClientSummaries,
    restoreEntry, restoreProject, addFavorite, deleteFavorite, importData,
  } = useAppData();

  const [tab, setTab] = useState<Tab>("timer");
  const [showSeed, setShowSeed] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [undoToast, setUndoToast] = useState<PendingUndo | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [theme, setTheme] = useState<ThemeChoice>("system");

  // layout.tsxのインラインスクリプトが初回ペイント前にdata-theme属性を反映済みなので、
  // ここではUI表示用にlocalStorageの選択値をstateへ読み込むだけ
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  function handleThemeChange(next: ThemeChoice) {
    setTheme(next);
    if (next === "system") {
      localStorage.removeItem(THEME_KEY);
      document.documentElement.removeAttribute("data-theme");
    } else {
      localStorage.setItem(THEME_KEY, next);
      document.documentElement.setAttribute("data-theme", next);
    }
  }

  // 削除の取り消し用トースト。数秒で自動的に消える
  // undo実行時は最新のrestoreEntry/restoreProject（=最新のdataを閉じ込めた関数）を使うため、
  // ここでは復元に必要な生データだけをstateに保持し、関数はここで閉じ込めない
  function showUndo(pending: PendingUndo) {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoToast(pending);
    undoTimeoutRef.current = setTimeout(() => setUndoToast(null), 7000);
  }

  // 削除前に一度確認を挟む（アプリ内モーダル。ブラウザ標準のconfirm()は位置・見た目を調整できないため）。
  // 削除後の取り消しトーストはそのまま二重の保険として残す
  function handleDeleteEntry(id: string) {
    if (!data.entries.some((e) => e.id === id)) return;
    setPendingDelete({ type: "entry", id });
  }

  function handleDeleteProject(id: string) {
    const project = data.projects.find((p) => p.id === id);
    if (!project) return;
    setPendingDelete({ type: "project", id, name: project.name });
  }

  function confirmPendingDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.type === "entry") {
      const entry = data.entries.find((e) => e.id === pendingDelete.id);
      deleteEntry(pendingDelete.id);
      if (entry) showUndo({ type: "entry", message: "ログを削除しました", entry });
    } else {
      const project = data.projects.find((p) => p.id === pendingDelete.id);
      if (project) {
        const relatedEntries = data.entries.filter((e) => e.projectId === pendingDelete.id);
        const relatedFavorites = data.favorites.filter((f) => f.projectId === pendingDelete.id);
        deleteProject(pendingDelete.id);
        showUndo({ type: "project", message: `「${project.name}」を削除しました`, project, entries: relatedEntries, favorites: relatedFavorites });
      }
    }
    setPendingDelete(null);
  }

  // 全データのバックアップ（JSON）。localStorageのみの運用なのでブラウザ削除等に備えた保険
  function handleExportData() {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `時給ノート_バックアップ_${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowSeed(false);
  }

  function handleImportClick() {
    if (activeEntry) {
      alert("タイマー実行中はインポートできません。先に停止してください。");
      return;
    }
    setShowSeed(false);
    importFileRef.current?.click();
  }

  function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを連続で選び直せるようにリセット
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.entries)) {
          alert("バックアップファイルの形式が正しくありません");
          return;
        }
        if (!window.confirm("現在のデータをすべて上書きします。よろしいですか？")) return;
        importData(parsed);
        alert("データを復元しました");
      } catch {
        alert("ファイルの読み込みに失敗しました");
      }
    };
    reader.readAsText(file);
  }

  function handleLoadSeed() {
    const d = loadSeedData();
    window.location.reload();
    void d;
  }

  // タイマー稼働中は他のタブを見ていても気づけるよう、ブラウザタブのタイトルに経過時間を出す
  useEffect(() => {
    if (!activeEntry) {
      document.title = "時給ノート";
      return;
    }
    const h = String(Math.floor(elapsed / 3600)).padStart(2, "0");
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
    const s = String(elapsed % 60).padStart(2, "0");
    document.title = `${isPaused ? "⏸" : "⏱"} ${h}:${m}:${s} — 時給ノート`;
    return () => { document.title = "時給ノート"; };
  }, [activeEntry, elapsed, isPaused]);

  /*
   * スクショ共有用のマスク。全部を「****」にすると円グラフの凡例が
   * 区別できなくなり数字が読めないので、案件A/クライアントBのように
   * 通し記号に置き換える（実名は伏せつつ内訳は読める）。
   * 記号は登録順で決まるので、月を切り替えても同じ案件は同じ記号のまま。
   */
  const mask = useMemo(() => {
    const project = new Map<string, string>();
    data.projects.forEach((p, i) => project.set(p.id, `案件${letter(i)}`));
    const client = new Map<string, string>();
    data.clients.forEach((c, i) => client.set(c.name, `クライアント${letter(i)}`));
    return { project, client };
  }, [data.projects, data.clients]);

  const viewData = useMemo(() => {
    if (!privacy) return data;
    return {
      ...data,
      projects: data.projects.map((p) => ({ ...p, name: mask.project.get(p.id) ?? p.name })),
      clients: data.clients.map((c) => ({ ...c, name: mask.client.get(c.name) ?? c.name })),
      entries: data.entries.map((e) => ({ ...e, note: e.note ? "***" : "" })),
    };
  }, [privacy, data, mask]);

  // レポートは集計済みの値を返すので、そちらにもマスクをかける
  const viewMonthlySummary = (y: number, m: number) => {
    const s = getMonthlySummary(y, m);
    if (!privacy) return s;
    return {
      ...s,
      byProject: Object.fromEntries(
        Object.entries(s.byProject).map(([id, r]) => [
          id,
          { ...r, name: mask.project.get(id) ?? r.name, clientName: mask.client.get(r.clientName) ?? r.clientName },
        ])
      ),
    };
  };

  const viewProjectSummaries = () => {
    const list = getProjectSummaries();
    if (!privacy) return list;
    return list.map((p) => ({ ...p, name: mask.project.get(p.id) ?? p.name }));
  };

  const viewWeeklySummary = (weekStart: string) => {
    const s = getWeeklySummary(weekStart);
    if (!privacy) return s;
    return {
      ...s,
      byProject: Object.fromEntries(
        Object.entries(s.byProject).map(([id, r]) => [
          id,
          { ...r, name: mask.project.get(id) ?? r.name, clientName: mask.client.get(r.clientName) ?? r.clientName },
        ])
      ),
    };
  };

  const viewClientSummaries = () => {
    const list = getClientSummaries();
    if (!privacy) return list;
    return list.map((c) => ({ ...c, name: mask.client.get(c.name) ?? c.name }));
  };

  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <header className="bg-surface border-b border-line-2">
        <div className="max-w-xl sm:max-w-2xl lg:max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-ink tracking-tight flex items-center gap-2">
              <IconStopwatch className="w-5 h-5 text-accent flex-shrink-0" />
              時給ノート
            </h1>
            {privacy && (
              <p className="text-[10px] text-accent-text mt-0.5">案件名を伏せて表示中</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeEntry && (
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? "bg-warn" : "bg-accent-strong animate-pulse"}`} />
                <span className="text-sm font-mono text-ink-2">
                  {String(Math.floor(elapsed / 3600)).padStart(2, "0")}:
                  {String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:
                  {String(elapsed % 60).padStart(2, "0")}
                </span>
              </div>
            )}
            <div className="relative">
              <button
                onClick={() => setShowSeed(!showSeed)}
                className="text-xs text-ink-3 hover:text-ink-2 transition-colors"
              >
                ⋯
              </button>
              {showSeed && (
                <div className="absolute right-0 top-6 bg-surface border border-line rounded-xl shadow-lg p-2 z-50 w-56">
                  <button
                    onClick={() => { setPrivacy(!privacy); setShowSeed(false); }}
                    className="w-full text-left text-xs text-ink-2 hover:text-ink px-3 py-2 rounded-lg hover:bg-tint transition-colors flex items-center justify-between gap-2"
                  >
                    <span>案件名を伏せる</span>
                    <span className={`w-8 h-4 rounded-full flex-shrink-0 relative transition-colors ${privacy ? "bg-accent-strong" : "bg-line"}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-surface transition-all ${privacy ? "left-4" : "left-0.5"}`} />
                    </span>
                  </button>
                  <button
                    onClick={handleLoadSeed}
                    className="w-full text-left text-xs text-ink-2 hover:text-ink px-3 py-2 rounded-lg hover:bg-tint transition-colors"
                  >
                    サンプルデータを読み込む
                  </button>
                  <div className="my-1 border-t border-line" />
                  <div className="px-3 py-2">
                    <p className="text-xs text-ink-2 mb-1.5">テーマ</p>
                    <div className="flex gap-1 bg-tint rounded-lg p-1">
                      {([
                        { key: "system", label: "端末" },
                        { key: "light", label: "ライト" },
                        { key: "dark", label: "ダーク" },
                      ] as { key: ThemeChoice; label: string }[]).map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => handleThemeChange(opt.key)}
                          className={`flex-1 text-[11px] py-1.5 rounded-md transition-colors ${
                            theme === opt.key ? "bg-surface text-ink font-medium shadow-sm" : "text-ink-3 hover:text-ink-2"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="my-1 border-t border-line" />
                  <button
                    onClick={handleExportData}
                    className="w-full text-left text-xs text-ink-2 hover:text-ink px-3 py-2 rounded-lg hover:bg-tint transition-colors"
                  >
                    データをバックアップ（JSON）
                  </button>
                  <button
                    onClick={handleImportClick}
                    className="w-full text-left text-xs text-ink-2 hover:text-ink px-3 py-2 rounded-lg hover:bg-tint transition-colors"
                  >
                    バックアップから復元
                  </button>
                </div>
              )}
              <input
                ref={importFileRef}
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-surface border-b border-line-2 sticky top-0 z-10">
        <div className="max-w-xl sm:max-w-2xl lg:max-w-4xl mx-auto px-6 flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 text-sm transition-colors border-b-2 flex items-center gap-1.5 ${
                tab === t.key
                  ? "border-accent-strong text-ink font-medium"
                  : "border-transparent text-ink-3 hover:text-ink-2"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-xl sm:max-w-2xl lg:max-w-4xl mx-auto px-6 py-8">
        {tab === "timer" && (
          <Timer
            projects={viewData.projects}
            tasks={viewData.tasks}
            favorites={data.favorites}
            activeEntry={activeEntry}
            elapsed={elapsed}
            isPaused={isPaused}
            onStart={startTimer}
            onPause={pauseTimer}
            onResume={resumeTimer}
            onStop={stopTimer}
            onUpdate={assignEntry}
            onManualAdd={addManualEntry}
            onAddFavorite={addFavorite}
            onDeleteFavorite={deleteFavorite}
          />
        )}
        {tab === "projects" && (
          <ProjectManager
            projects={viewData.projects}
            tasks={viewData.tasks}
            clients={viewData.clients ?? []}
            onAddProject={addProject}
            onUpdateProject={updateProject}
            onDeleteProject={handleDeleteProject}
            onToggleProjectComplete={toggleProjectComplete}
            onAddTask={addTask}
            onDeleteTask={deleteTask}
            onAddTaskGroup={addTaskGroup}
            onDeleteTaskGroup={deleteTaskGroup}
            onAddTasksToGroup={addTasksToGroup}
            onRemoveTaskFromGroup={removeTaskFromGroup}
            onRenameTask={renameTask}
            onRenameTaskGroup={renameTaskGroup}
            onAddClient={addClient}
            onRenameClient={renameClient}
            onDeleteClient={deleteClient}
            taskGroups={viewData.taskGroups ?? []}
            getProjectTotalSeconds={getProjectTotalSeconds}
            getTaskTotalSeconds={getTaskTotalSeconds}
            getProjectTaskBreakdown={getProjectTaskBreakdown}
          />
        )}
        {tab === "log" && (
          <EntryLog
            entries={viewData.entries}
            projects={viewData.projects}
            tasks={viewData.tasks}
            onDelete={handleDeleteEntry}
            onUpdate={updateEntry}
          />
        )}
        {tab === "report" && (
          <MonthlyReport
            getMonthlySummary={viewMonthlySummary}
            getWeeklySummary={viewWeeklySummary}
            getProjectSummaries={viewProjectSummaries}
            getClientSummaries={viewClientSummaries}
          />
        )}
      </main>

      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete.type === "entry" ? "このログを削除しますか？" : `「${pendingDelete.name}」を削除しますか？`}
          message={pendingDelete.type === "project" ? "紐づくログもすべて削除されます" : undefined}
          onConfirm={confirmPendingDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {undoToast && (
        <UndoToast
          message={undoToast.message}
          onUndo={() => {
            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
            if (undoToast.type === "entry") {
              restoreEntry(undoToast.entry);
            } else {
              restoreProject(undoToast.project, undoToast.entries, undoToast.favorites);
            }
            setUndoToast(null);
          }}
          onDismiss={() => {
            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
            setUndoToast(null);
          }}
        />
      )}
    </div>
  );
}
