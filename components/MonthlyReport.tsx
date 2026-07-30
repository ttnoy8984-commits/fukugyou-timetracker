"use client";

import { useState } from "react";
import { calcAmountIncludingTax, formatDuration } from "@/lib/storage";
import { DonutChart, MonthlyBars, StatTile, foldToTop, entityColor, Slice } from "./charts";

interface TaskSummary { taskName: string; seconds: number; }

interface ProjectSummary {
  seconds: number; contractAmount: number; taxIncluded: boolean; effectiveRate: number;
  name: string; color: string;
  byTask: Record<string, TaskSummary>;
}

interface ProjectTotal {
  id: string; name: string; color: string;
  contractAmount: number; includingTaxAmount: number; totalSeconds: number; effectiveRate: number;
  byTask: Record<string, TaskSummary>;
}

interface Props {
  getMonthlySummary: (year: number, month: number) => {
    byProject: Record<string, ProjectSummary>;
    entries: unknown[];
    completedContractTotal: number;
    completedContractTotalExcludingTax: number;
    completedCount: number;
  };
  getProjectSummaries: () => ProjectTotal[];
}

type ReportTab = "monthly" | "yearly" | "projects";

function hours(seconds: number) {
  return `${(seconds / 3600).toFixed(1)}h`;
}

export default function MonthlyReport({ getMonthlySummary, getProjectSummaries }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<ReportTab>("monthly");

  const years = [now.getFullYear() - 1, now.getFullYear()];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // ===== 月次 =====
  const { byProject, completedContractTotal, completedContractTotalExcludingTax, completedCount } = getMonthlySummary(year, month);
  const rows = Object.entries(byProject);
  const totalSeconds = rows.reduce((s, [, r]) => s + r.seconds, 0);
  const monthAvgRate = totalSeconds > 0 ? completedContractTotal / (totalSeconds / 3600) : 0;

  const monthProjectSlices = foldToTop(
    rows,
    ([, r]) => r.seconds, ([, r]) => r.name, ([id]) => entityColor(id)
  );
  const monthTaskTotals: Record<string, number> = {};
  rows.forEach(([, r]) => {
    Object.values(r.byTask).forEach((t) => {
      monthTaskTotals[t.taskName] = (monthTaskTotals[t.taskName] ?? 0) + t.seconds;
    });
  });
  const monthTaskSlices: Slice[] = foldToTop(
    Object.entries(monthTaskTotals),
    ([, sec]) => sec, ([name]) => name, ([name]) => entityColor(name)
  );

  // ===== 年次 =====
  const monthlyBreakdown = months.map((m) => {
    const s = getMonthlySummary(year, m);
    const seconds = Object.values(s.byProject).reduce((sum, r) => sum + r.seconds, 0);
    return {
      month: m, seconds,
      amount: s.completedContractTotal,
      count: s.completedCount,
      byProject: s.byProject,
    };
  });
  const yearTotalSeconds = monthlyBreakdown.reduce((s, m) => s + m.seconds, 0);
  const yearTotalContract = monthlyBreakdown.reduce((s, m) => s + m.amount, 0);
  const yearCompletedCount = monthlyBreakdown.reduce((s, m) => s + m.count, 0);
  const yearAvgRate = yearTotalSeconds > 0 ? yearTotalContract / (yearTotalSeconds / 3600) : 0;
  const activeMonths = monthlyBreakdown.filter((m) => m.seconds > 0).length;

  // 年間の案件別・タスク別を積み上げ
  const yearProjectTotals: Record<string, { id: string; name: string; seconds: number }> = {};
  const yearTaskTotals: Record<string, number> = {};
  monthlyBreakdown.forEach((m) => {
    Object.entries(m.byProject).forEach(([pid, r]) => {
      if (!yearProjectTotals[pid]) yearProjectTotals[pid] = { id: pid, name: r.name, seconds: 0 };
      yearProjectTotals[pid].seconds += r.seconds;
      Object.values(r.byTask).forEach((t) => {
        yearTaskTotals[t.taskName] = (yearTaskTotals[t.taskName] ?? 0) + t.seconds;
      });
    });
  });
  const yearProjectSlices = foldToTop(
    Object.values(yearProjectTotals),
    (r) => r.seconds, (r) => r.name, (r) => entityColor(r.id)
  );
  const yearTaskSlices: Slice[] = foldToTop(
    Object.entries(yearTaskTotals),
    ([, sec]) => sec, ([name]) => name, ([name]) => entityColor(name)
  );

  // ===== 案件分析 =====
  const projectSummaries = getProjectSummaries().sort((a, b) => b.effectiveRate - a.effectiveRate);
  const maxRate = projectSummaries[0]?.effectiveRate ?? 0;

  function rateColor(rate: number, max: number) {
    if (max === 0) return "text-gray-400";
    const ratio = rate / max;
    if (ratio >= 0.8) return "text-emerald-600";
    if (ratio >= 0.5) return "text-amber-500";
    return "text-red-400";
  }

  const tabs: { key: ReportTab; label: string }[] = [
    { key: "monthly", label: "月次" },
    { key: "yearly", label: "年次" },
    { key: "projects", label: "案件分析" },
  ];

  return (
    <div className="space-y-4">
      {/* タブ切替 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setReportTab(t.key)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${reportTab === t.key ? "bg-white text-gray-900 font-medium shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== 月次 ===== */}
      {reportTab === "monthly" && (
        <>
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

          {rows.length === 0 && completedCount === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
              <p className="text-sm text-gray-400">この月の記録はありません</p>
            </div>
          ) : (
            <>
              {/* KPI */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="作業時間" value={formatDuration(totalSeconds)} accent sub={`${rows.length}案件`} />
                <StatTile label="確定金額（税込）" value={`¥${Math.round(completedContractTotal).toLocaleString()}`}
                  sub={`完了${completedCount}件 · 税抜 ¥${Math.round(completedContractTotalExcludingTax).toLocaleString()}`} />
                <StatTile label="平均時給" value={monthAvgRate > 0 ? `¥${Math.round(monthAvgRate).toLocaleString()}` : "—"}
                  sub={monthAvgRate > 0 ? "確定金額 ÷ 作業時間" : "完了案件なし"} />
                <StatTile label="1日あたり" value={hours(totalSeconds / new Date(year, month, 0).getDate())} sub="月平均" />
              </div>

              {/* 比率チャート */}
              <div className="grid lg:grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">案件別の時間比率</h2>
                  <DonutChart slices={monthProjectSlices} formatValue={hours} centerLabel="合計" />
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">タスク別の時間比率</h2>
                  <DonutChart slices={monthTaskSlices} formatValue={hours} centerLabel="合計" />
                </div>
              </div>

              {/* 案件別（表としても機能する詳細） */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">案件別の詳細</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {rows.map(([projectId, r]) => {
                    const taskRows = Object.values(r.byTask).sort((a, b) => b.seconds - a.seconds);
                    const isExpanded = expandedProject === projectId;
                    const c = entityColor(projectId);
                    return (
                      <div key={projectId}>
                        <div className="px-6 py-4 space-y-2 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedProject(isExpanded ? null : projectId)}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                              <span className="text-sm font-medium text-gray-800 truncate">{r.name}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-xs text-gray-400">¥{Math.round(calcAmountIncludingTax(r.contractAmount, r.taxIncluded)).toLocaleString()}</span>
                              <span className="text-sm font-mono text-gray-500">{formatDuration(r.seconds)}</span>
                              <span className="text-sm text-gray-700">¥{Math.round(r.effectiveRate).toLocaleString()}/h</span>
                              <span className="text-gray-300 text-xs">{isExpanded ? "▲" : "▼"}</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1">
                            <div className="h-1 rounded-full" style={{
                              backgroundColor: c,
                              width: totalSeconds > 0 ? `${(r.seconds / totalSeconds) * 100}%` : "0%",
                            }} />
                          </div>
                        </div>
                        {isExpanded && taskRows.length > 0 && (
                          <div className="px-6 pb-4 space-y-2 border-t border-gray-50 bg-gray-50">
                            <p className="text-xs text-gray-400 pt-3 uppercase tracking-wider">タスク別</p>
                            {taskRows.map((t) => (
                              <div key={t.taskName}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-gray-600">{t.taskName}</span>
                                  <span className="text-xs font-mono text-gray-500">{formatDuration(t.seconds)}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1">
                                  <div className="h-1 rounded-full" style={{
                                    backgroundColor: c, opacity: 0.6,
                                    width: r.seconds > 0 ? `${(t.seconds / r.seconds) * 100}%` : "0%",
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

      {/* ===== 年次 ===== */}
      {reportTab === "yearly" && (
        <>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400">
            {years.map((y) => <option key={y} value={y}>{y}年</option>)}
          </select>

          {yearTotalSeconds === 0 && yearCompletedCount === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
              <p className="text-sm text-gray-400">この年の記録はありません</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="年間作業時間" value={formatDuration(yearTotalSeconds)} accent sub={`稼働${activeMonths}ヶ月`} />
                <StatTile label="年間確定金額" value={`¥${Math.round(yearTotalContract).toLocaleString()}`} sub={`完了${yearCompletedCount}件・税込`} />
                <StatTile label="平均時給" value={yearAvgRate > 0 ? `¥${Math.round(yearAvgRate).toLocaleString()}` : "—"} sub="確定金額 ÷ 作業時間" />
                <StatTile label="月平均" value={activeMonths > 0 ? hours(yearTotalSeconds / activeMonths) : "—"} sub="稼働月あたり" />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">月別の作業時間</h2>
                <MonthlyBars data={monthlyBreakdown} formatValue={formatDuration} />
              </div>

              <div className="grid lg:grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">案件別の時間比率</h2>
                  <DonutChart slices={yearProjectSlices} formatValue={hours} centerLabel="年間" />
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">タスク別の時間比率</h2>
                  <DonutChart slices={yearTaskSlices} formatValue={hours} centerLabel="年間" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">月別の詳細</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500">月</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">作業時間</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">完了</th>
                      <th className="text-right px-6 py-2.5 text-xs font-medium text-gray-500">確定金額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {monthlyBreakdown.map((m) => (
                      <tr key={m.month} className={m.seconds === 0 && m.count === 0 ? "opacity-40" : ""}>
                        <td className="px-6 py-2.5 text-gray-700">{m.month}月</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-600">{m.seconds > 0 ? formatDuration(m.seconds) : "—"}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-gray-500">{m.count > 0 ? `${m.count}件` : "—"}</td>
                        <td className="px-6 py-2.5 text-right text-xs text-gray-700">{m.amount > 0 ? `¥${Math.round(m.amount).toLocaleString()}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ===== 案件分析 ===== */}
      {reportTab === "projects" && (
        <>
          {projectSummaries.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
              <p className="text-sm text-gray-400">記録がありません</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400">時給の高い順。時給は案件の全期間合計時間・税込金額で計算しています。</p>
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
                            <span className="text-sm font-medium text-gray-800 flex-1 truncate">{p.name}</span>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-base font-mono font-medium ${rateColor(p.effectiveRate, maxRate)}`}>
                                ¥{Math.round(p.effectiveRate).toLocaleString()}<span className="text-xs font-normal">/h</span>
                              </p>
                              <p className="text-xs text-gray-400">{formatDuration(p.totalSeconds)} · ¥{Math.round(p.includingTaxAmount).toLocaleString()}</p>
                            </div>
                            <span className="text-gray-300 text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
                          </div>
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
