"use client";

import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { loadSeedData } from "@/lib/seed";
import Timer from "@/components/Timer";
import ProjectManager from "@/components/ProjectManager";
import EntryLog from "@/components/EntryLog";
import MonthlyReport from "@/components/MonthlyReport";

type Tab = "timer" | "projects" | "log" | "report";

const tabs: { key: Tab; label: string }[] = [
  { key: "timer", label: "タイマー" },
  { key: "projects", label: "案件" },
  { key: "log", label: "ログ" },
  { key: "report", label: "レポート" },
];

export default function Home() {
  const {
    data, activeEntry, elapsed, isPaused,
    addProject, updateProject, deleteProject, toggleProjectComplete, addTask, deleteTask, addTaskGroup, deleteTaskGroup, addTasksToGroup, removeTaskFromGroup, renameTask, renameTaskGroup, addClient, renameClient, deleteClient,
    startTimer, pauseTimer, resumeTimer, stopTimer, addManualEntry, assignEntry, updateEntry, deleteEntry, getProjectTotalSeconds, getTaskTotalSeconds, getProjectTaskBreakdown, getMonthlySummary, getProjectSummaries,
  } = useAppData();

  const [tab, setTab] = useState<Tab>("timer");
  const [showSeed, setShowSeed] = useState(false);

  function handleLoadSeed() {
    const d = loadSeedData();
    window.location.reload();
    void d;
  }

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <header className="bg-white border-b border-line-2">
        <div className="max-w-xl sm:max-w-2xl lg:max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-ink tracking-tight">副業タイムトラッカー</h1>
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
                <div className="absolute right-0 top-6 bg-white border border-line rounded-xl shadow-lg p-2 z-50 w-44">
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
              className={`py-3 text-sm transition-colors border-b-2 ${
                tab === t.key
                  ? "border-accent-strong text-ink font-medium"
                  : "border-transparent text-ink-3 hover:text-ink-2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-xl sm:max-w-2xl lg:max-w-4xl mx-auto px-6 py-8">
        {tab === "timer" && (
          <Timer
            projects={data.projects}
            tasks={data.tasks}
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
            projects={data.projects}
            tasks={data.tasks}
            clients={data.clients ?? []}
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
            taskGroups={data.taskGroups ?? []}
            getProjectTotalSeconds={getProjectTotalSeconds}
            getTaskTotalSeconds={getTaskTotalSeconds}
            getProjectTaskBreakdown={getProjectTaskBreakdown}
          />
        )}
        {tab === "log" && (
          <EntryLog
            entries={data.entries}
            projects={data.projects}
            tasks={data.tasks}
            onDelete={deleteEntry}
            onUpdate={updateEntry}
          />
        )}
        {tab === "report" && (
          <MonthlyReport getMonthlySummary={getMonthlySummary} getProjectSummaries={getProjectSummaries} />
        )}
      </main>
    </div>
  );
}
