"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/storage";

interface TaskSummary { taskName: string; seconds: number; }

interface ProjectSummary {
  seconds: number; contractAmount: number; effectiveRate: number;
  name: string; color: string;
  byTask: Record<string, TaskSummary>;
}

interface ProjectTotal {
  id: string; name: string; color: string;
  contractAmount: number; totalSeconds: number; effectiveRate: number;
  byTask: Record<string, TaskSummary>;
}

interface Props {
  getMonthlySummary: (year: number, month: number) => {
    byProject: Record<string, ProjectSummary>;
    entries: unknown[];
  };
  getProjectSummaries: () => ProjectTotal[];
}

type ReportTab = "monthly" | "projects";

export default function MonthlyReport({ getMonthlySummary, getProjectSummaries }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<ReportTab>("monthly");

  const { byProject } = getMonthlySummary(year, month);
  const rows = Object.entries(byProject);
  const totalSeconds = rows.reduce((s, [, r]) => s + r.seconds, 0);
  const totalContract = rows.reduce((s, [, r]) => s + r.contractAmount, 0);

  const years = [now.getFullYear() - 1, now.getFullYear()];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const projectSummaries = getProjectSummaries().sort((a, b) => b.effectiveRate - a.effectiveRate);
  const maxRate = projectSummaries[0]?.effectiveRate ?? 0;

  function rateColor(rate: number, max: number) {
    if (max === 0) return "text-gray-400";
    const ratio = rate / max;
    if (ratio >= 0.8) return "text-emerald-600";
    if (ratio >= 0.5) return "text-amber-500";
    return "text-red-400";
  }

  return (
    <div className="space-y-4">
      {/* タブ切替 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setReportTab("monthly")}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${reportTab === "monthly" ? "bg-white text-gray-900 font-medium shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
        >
          月次
        </button>
        <button
          onClick={() => setReportTab("projects")}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${reportTab === "projects" ? "bg-white text-gray-900 font-medium shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
        >
          案件分析
        </button>
      </div>

      {reportTab === "monthly" && (
        <>
          {/* 月選択 */}
          <div className="flex gap-2">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400">
              {years.map((y) => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400">
              {months.map((m) => <option key={m} value={m}>{m}月</option>)}
            </select>
          </div>

          {rows.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
              <p className="text-sm text-gray-400">この月の記録はありません</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">合計作業時間</p>
                  <p className="text-3xl font-mono font-light text-gray-900">{formatDuration(totalSeconds)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">契約金額合計</p>
                  <p className="text-3xl font-light text-gray-900">¥{Math.round(totalContract).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">案件別</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {rows.map(([projectId, r]) => {
                    const taskRows = Object.values(r.byTask).sort((a, b) => b.seconds - a.seconds);
                    const isExpanded = expandedProject === projectId;
                    return (
                      <div key={projectId}>
                        <div className="px-6 py-4 space-y-2 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedProject(isExpanded ? null : projectId)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                              <span className="text-sm font-medium text-gray-800">{r.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-mono text-gray-500">{formatDuration(r.seconds)}</span>
                              <span className="text-sm text-gray-700">¥{Math.round(r.effectiveRate).toLocaleString()}/h</span>
                              <span className="text-gray-300 text-xs">{isExpanded ? "▲" : "▼"}</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1">
                            <div className="h-1 rounded-full" style={{
                              backgroundColor: r.color,
                              width: totalSeconds > 0 ? `${(r.seconds / totalSeconds) * 100}%` : "0%",
                            }} />
                          </div>
                        </div>
                        {isExpanded && taskRows.length > 0 && (
                          <div className="px-6 pb-4 space-y-2 border-t border-gray-50 bg-gray-50">
                            <p className="text-xs text-gray-400 pt-3 uppercase tracking-wider">タスク別</p>
                            {taskRows.map((t) => (
                              <div key={t.taskName} className="flex items-center gap-3">
                                <div className="flex-1">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-gray-600">{t.taskName}</span>
                                    <span className="text-xs font-mono text-gray-500">{formatDuration(t.seconds)}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1">
                                    <div className="h-1 rounded-full" style={{
                                      backgroundColor: r.color, opacity: 0.6,
                                      width: r.seconds > 0 ? `${(t.seconds / r.seconds) * 100}%` : "0%",
                                    }} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {reportTab === "projects" && (
        <>
          {projectSummaries.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
              <p className="text-sm text-gray-400">記録がありません</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400">時給の高い順。時給は案件の全期間合計時間で計算しています。</p>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {projectSummaries.map((p, i) => {
                    const taskRows = Object.values(p.byTask).sort((a, b) => b.seconds - a.seconds);
                    const isExpanded = expandedProject === p.id;
                    return (
                      <div key={p.id}>
                        <div className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedProject(isExpanded ? null : p.id)}>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-gray-300 w-4">{i + 1}</span>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                            <span className="text-sm font-medium text-gray-800 flex-1">{p.name}</span>
                            <div className="text-right">
                              <p className={`text-base font-mono font-medium ${rateColor(p.effectiveRate, maxRate)}`}>
                                ¥{Math.round(p.effectiveRate).toLocaleString()}<span className="text-xs font-normal">/h</span>
                              </p>
                              <p className="text-xs text-gray-400">{formatDuration(p.totalSeconds)} · ¥{p.contractAmount.toLocaleString()}</p>
                            </div>
                            <span className="text-gray-300 text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
                          </div>
                          {/* 時給バー */}
                          <div className="mt-2 ml-7 w-full bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full transition-all" style={{
                              backgroundColor: p.color,
                              width: maxRate > 0 ? `${(p.effectiveRate / maxRate) * 100}%` : "0%",
                            }} />
                          </div>
                        </div>
                        {isExpanded && taskRows.length > 0 && (
                          <div className="px-6 pb-4 border-t border-gray-50 bg-gray-50 space-y-2">
                            <p className="text-xs text-gray-400 pt-3 uppercase tracking-wider">タスク別作業時間</p>
                            {taskRows.map((t) => (
                              <div key={t.taskName}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-gray-600">{t.taskName}</span>
                                  <span className="text-xs font-mono text-gray-500">{formatDuration(t.seconds)}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1">
                                  <div className="h-1 rounded-full" style={{
                                    backgroundColor: p.color, opacity: 0.6,
                                    width: p.totalSeconds > 0 ? `${(t.seconds / p.totalSeconds) * 100}%` : "0%",
                                  }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
