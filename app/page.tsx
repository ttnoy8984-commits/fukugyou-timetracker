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
    data, activeEntry, elapsed,
    addProject, deleteProject, addTask, addTemplate, deleteTemplate,
    startTimer, stopTimer, addManualEntry, deleteEntry, getProjectTotalSeconds, getTaskTotalSeconds, getMonthlySummary,
  } = useAppData();

  const [tab, setTab] = useState<Tab>("timer");
  const [showSeed, setShowSeed] = useState(false);

  function handleLoadSeed() {
    const d = loadSeedData();
    window.location.reload();
    void d;
  }

  return (
    <div className="min-h-screen bg-[#f8f8f7]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">副業タイムトラッカー</h1>
          </div>
          <div className="flex items-center gap-3">
            {activeEntry && (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-900 rounded-full animate-pulse" />
                <span className="text-sm font-mono text-gray-700">
                  {String(Math.floor(elapsed / 3600)).padStart(2, "0")}:
                  {String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:
                  {String(elapsed % 60).padStart(2, "0")}
                </span>
              </div>
            )}
            <div className="relative">
              <button
                onClick={() => setShowSeed(!showSeed)}
                className="text-xs text-gray-300 hover:text-gray-500 transition-colors"
              >
                ⋯
              </button>
              {showSeed && (
                <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-50 w-44">
                  <button
                    onClick={handleLoadSeed}
                    className="w-full text-left text-xs text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
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
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-6 flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 text-sm transition-colors border-b-2 ${
                tab === t.key
                  ? "border-gray-900 text-gray-900 font-medium"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-xl mx-auto px-6 py-8">
        {tab === "timer" && (
          <Timer
            projects={data.projects}
            tasks={data.tasks}
            activeEntry={activeEntry}
            elapsed={elapsed}
            onStart={startTimer}
            onStop={stopTimer}
            onManualAdd={addManualEntry}
          />
        )}
        {tab === "projects" && (
          <ProjectManager
            projects={data.projects}
            tasks={data.tasks}
            templates={data.templates ?? []}
            onAddProject={addProject}
            onDeleteProject={deleteProject}
            onAddTask={addTask}
            onAddTemplate={addTemplate}
            onDeleteTemplate={deleteTemplate}
            getProjectTotalSeconds={getProjectTotalSeconds}
            getTaskTotalSeconds={getTaskTotalSeconds}
          />
        )}
        {tab === "log" && (
          <EntryLog
            entries={data.entries}
            projects={data.projects}
            tasks={data.tasks}
            onDelete={deleteEntry}
          />
        )}
        {tab === "report" && (
          <MonthlyReport getMonthlySummary={getMonthlySummary} />
        )}
      </main>
    </div>
  );
}
