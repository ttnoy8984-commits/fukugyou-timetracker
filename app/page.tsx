"use client";

import { useMemo, useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { loadSeedData } from "@/lib/seed";
import Timer from "@/components/Timer";
import ProjectManager from "@/components/ProjectManager";
import EntryLog from "@/components/EntryLog";
import MonthlyReport from "@/components/MonthlyReport";
import { IconChart, IconFolder, IconList, IconStopwatch, IconTimer } from "@/components/icons";

type Tab = "timer" | "projects" | "log" | "report";

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
    startTimer, pauseTimer, resumeTimer, stopTimer, addManualEntry, assignEntry, updateEntry, deleteEntry, getProjectTotalSeconds, getTaskTotalSeconds, getProjectTaskBreakdown, getMonthlySummary, getProjectSummaries,
  } = useAppData();

  const [tab, setTab] = useState<Tab>("timer");
  const [showSeed, setShowSeed] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  function handleLoadSeed() {
    const d = loadSeedData();
    window.location.reload();
    void d;
  }

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

  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <header className="bg-white border-b border-line-2">
        <div className="max-w-xl sm:max-w-2xl lg:max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-ink tracking-tight flex items-center gap-2">
              <IconStopwatch className="w-5 h-5 text-accent flex-shrink-0" />
              副業タイムトラッカー
            </h1>
            {privacy && (
              <p className="text-[10px] text-accent-text mt-0.5">案件名を伏せて表示中</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeEntry && (
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? "bg-amber-400" : "bg-accent-strong animate-pulse"}`} />
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
                <div className="absolute right-0 top-6 bg-white border border-line rounded-xl shadow-lg p-2 z-50 w-56">
                  <button
                    onClick={() => { setPrivacy(!privacy); setShowSeed(false); }}
                    className="w-full text-left text-xs text-ink-2 hover:text-ink px-3 py-2 rounded-lg hover:bg-tint transition-colors flex items-center justify-between gap-2"
                  >
                    <span>案件名を伏せる</span>
                    <span className={`w-8 h-4 rounded-full flex-shrink-0 relative transition-colors ${privacy ? "bg-accent-strong" : "bg-line"}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${privacy ? "left-4" : "left-0.5"}`} />
                    </span>
                  </button>
                  <button
                    onClick={handleLoadSeed}
                    className="w-full text-left text-xs text-ink-2 hover:text-ink px-3 py-2 rounded-lg hover:bg-tint transition-colors"
                  >
                    サンプルデータを読み込む
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-line-2 sticky top-0 z-10">
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
            activeEntry={activeEntry}
            elapsed={elapsed}
            isPaused={isPaused}
            onStart={startTimer}
            onPause={pauseTimer}
            onResume={resumeTimer}
            onStop={stopTimer}
            onUpdate={assignEntry}
            onManualAdd={addManualEntry}
          />
        )}
        {tab === "projects" && (
          <ProjectManager
            projects={viewData.projects}
            tasks={viewData.tasks}
            clients={viewData.clients ?? []}
            onAddProject={addProject}
            onUpdateProject={updateProject}
            onDeleteProject={deleteProject}
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
            onDelete={deleteEntry}
            onUpdate={updateEntry}
          />
        )}
        {tab === "report" && (
          <MonthlyReport getMonthlySummary={viewMonthlySummary} getProjectSummaries={viewProjectSummaries} />
        )}
      </main>
    </div>
  );
}
