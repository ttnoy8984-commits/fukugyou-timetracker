"use client";

import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
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
    addProject, deleteProject, addTask,
    startTimer, stopTimer, deleteEntry, getProjectTotalSeconds, getMonthlySummary,
  } = useAppData();

  const [tab, setTab] = useState<Tab>("timer");

  return (
    <div className="min-h-screen bg-[#f8f8f7]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">副業タイムトラッカー</h1>
          </div>
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
          />
        )}
        {tab === "projects" && (
          <ProjectManager
            projects={data.projects}
            tasks={data.tasks}
            onAddProject={addProject}
            onDeleteProject={deleteProject}
            onAddTask={addTask}
            getProjectTotalSeconds={getProjectTotalSeconds}
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
