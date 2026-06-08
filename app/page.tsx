"use client";

import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
import Timer from "@/components/Timer";
import ProjectManager from "@/components/ProjectManager";
import EntryLog from "@/components/EntryLog";
import MonthlyReport from "@/components/MonthlyReport";

type Tab = "timer" | "projects" | "log" | "report";

export default function Home() {
  const {
    data,
    activeEntry,
    elapsed,
    addProject,
    deleteProject,
    addTask,
    startTimer,
    stopTimer,
    deleteEntry,
    getMonthlySummary,
  } = useAppData();

  const [tab, setTab] = useState<Tab>("timer");

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "timer", label: "タイマー", icon: "⏱" },
    { key: "projects", label: "案件", icon: "📁" },
    { key: "log", label: "ログ", icon: "📋" },
    { key: "report", label: "レポート", icon: "📊" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-indigo-700">副業タイムトラッカー</h1>
            <p className="text-xs text-gray-400">Side Job Time Tracker</p>
          </div>
          {activeEntry && (
            <div className="flex items-center gap-2 bg-indigo-50 rounded-full px-3 py-1">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-sm font-mono font-bold text-indigo-600">
                {String(Math.floor(elapsed / 3600)).padStart(2, "0")}:
                {String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:
                {String(elapsed % 60).padStart(2, "0")}
              </span>
            </div>
          )}
        </div>
      </header>

      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 flex">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium transition border-b-2 ${
                tab === t.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
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
