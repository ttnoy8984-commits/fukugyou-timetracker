"use client";

import { useEffect, useState } from "react";
import { calcAmountIncludingTax, formatDuration } from "@/lib/storage";
import { DonutChart, TimeBars, StatTile, foldToTop, rankColor, Slice, TimeBar } from "./charts";

interface TaskSummary { taskName: string; seconds: number; }

interface ProjectSummary {
  seconds: number; contractAmount: number; taxIncluded: boolean; effectiveRate: number;
  name: string; color: string; clientName: string;
  byTask: Record<string, TaskSummary>;
}

interface ProjectTotal {
  id: string; name: string; color: string;
  contractAmount: number; includingTaxAmount: number; totalSeconds: number; effectiveRate: number;
  byTask: Record<string, TaskSummary>;
}

interface ClientSummary {
  id: string; name: string; totalSeconds: number; includingTaxAmount: number;
  projectCount: number; effectiveRate: number;
}

interface Props {
  getMonthlySummary: (year: number, month: number) => {
    byProject: Record<string, ProjectSummary>;
    entries: { date: string; durationSeconds: number }[];
    completedContractTotal: number;
    completedContractTotalExcludingTax: number;
    completedCount: number;
  };
  getProjectSummaries: () => ProjectTotal[];
  getClientSummaries: () => ClientSummary[];
}

type ReportTab = "monthly" | "yearly" | "projects" | "clients";
const TARGET_RATE_KEY = "fukugyou_target_rate";

function hours(seconds: number) {
  return `${(seconds / 3600).toFixed(1)}h`;
}

function targetRateSub(actual: number, target: number | null) {
  if (!target) return "確定金額 ÷ 作業時間";
  const diff = Math.round(actual - target);
  return diff >= 0 ? `目標+¥${diff.toLocaleString()}` : `目標-¥${Math.abs(diff).toLocaleString()}`;
}

function targetRateTone(actual: number, target: number | null): "neutral" | "good" | "bad" {
  if (!target) return "neutral";
  return actual >= target ? "good" : "bad";
}

// 前月との比較。前月の実績がない場合は比較しようがないので出さない
function momDelta(curr: number, prev: number): { text: string; tone: "good" | "bad" | "neutral" } | null {
  if (prev <= 0) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  if (pct === 0) return { text: "先月と同水準", tone: "neutral" };
  const sign = pct > 0 ? "+" : "";
  return { text: `先月比 ${sign}${pct}%`, tone: pct > 0 ? "good" : "bad" };
}

export default function MonthlyReport({ getMonthlySummary, getProjectSummaries, getClientSummaries }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<ReportTab>("monthly");
  const [targetRate, setTargetRate] = useState<number | null>(null);
  const [targetRateInput, setTargetRateInput] = useState("");

  // 目標時給は表示設定なので他のデータとは別にlocalStorageへ直接保存する
  useEffect(() => {
    const saved = localStorage.getItem(TARGET_RATE_KEY);
    if (saved) { setTargetRate(Number(saved)); setTargetRateInput(saved); }
  }, []);

  function handleTargetRateChange(v: string) {
    setTargetRateInput(v);
    const n = v === "" ? null : Number(v);
    if (n === null || isNaN(n)) {
      setTargetRate(null);
      localStorage.removeItem(TARGET_RATE_KEY);
    } else {
      setTargetRate(n);
      localStorage.setItem(TARGET_RATE_KEY, String(n));
    }
  }

  const years = [now.getFullYear() - 1, now.getFullYear()];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // ===== 月次 =====
  const { byProject, entries: monthEntries, completedContractTotal, completedContractTotalExcludingTax, completedCount } = getMonthlySummary(year, month);
  const rows = Object.entries(byProject).sort((a, b) => b[1].seconds - a[1].seconds);
  const totalSeconds = rows.reduce((s, [, r]) => s + r.seconds, 0);
  const monthAvgRate = totalSeconds > 0 ? completedContractTotal / (totalSeconds / 3600) : 0;

  const monthProjectSlices = foldToTop(
    rows,
    ([, r]) => r.seconds, ([, r]) => r.name
  );
  const monthTaskTotals: Record<string, number> = {};
  rows.forEach(([, r]) => {
    Object.values(r.byTask).forEach((t) => {
      monthTaskTotals[t.taskName] = (monthTaskTotals[t.taskName] ?? 0) + t.seconds;
    });
  });
  const monthTaskSlices: Slice[] = foldToTop(
    Object.entries(monthTaskTotals),
    ([, sec]) => sec, ([name]) => name
  );

  // 日別の作業時間（その月の日数ぶん、作業がない日も0で並べる）
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailySeconds: Record<number, number> = {};
  monthEntries.forEach((e) => {
    const day = Number(e.date.slice(8, 10));
    dailySeconds[day] = (dailySeconds[day] ?? 0) + e.durationSeconds;
  });
  const dailyBars: TimeBar[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dow = new Date(year, month - 1, day).getDay();
    return {
      key: day,
      label: String(day),
      seconds: dailySeconds[day] ?? 0,
      muted: dow === 0 || dow === 6, // 土日は淡く
    };
  });
  const workedDays = dailyBars.filter((d) => d.seconds > 0).length;

  // 先月比（月をまたぐ場合は年も繰り下げる）
  const prevMonthDate = new Date(year, month - 2, 1);
  const prevSummary = getMonthlySummary(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1);
  const prevTotalSeconds = Object.values(prevSummary.byProject).reduce((s, r) => s + r.seconds, 0);
  const totalSecondsDelta = momDelta(totalSeconds, prevTotalSeconds);
  const contractTotalDelta = momDelta(completedContractTotal, prevSummary.completedContractTotal);

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
  const yearClientTotals: Record<string, number> = {};
  const yearTaskTotals: Record<string, number> = {};
  monthlyBreakdown.forEach((m) => {
    Object.values(m.byProject).forEach((r) => {
      yearClientTotals[r.clientName] = (yearClientTotals[r.clientName] ?? 0) + r.seconds;
      Object.values(r.byTask).forEach((t) => {
        yearTaskTotals[t.taskName] = (yearTaskTotals[t.taskName] ?? 0) + t.seconds;
      });
    });
  });
  const yearClientSlices = foldToTop(
    Object.entries(yearClientTotals),
    ([, sec]) => sec, ([name]) => name
  );
  const yearTaskSlices: Slice[] = foldToTop(
    Object.entries(yearTaskTotals),
    ([, sec]) => sec, ([name]) => name
  );

  // ===== 案件分析 =====
  const projectSummaries = getProjectSummaries().sort((a, b) => b.effectiveRate - a.effectiveRate);
  const maxRate = projectSummaries[0]?.effectiveRate ?? 0;
  // 目標時給がトップの案件より高い場合もバー内に収まるよう、両者の大きい方をスケールの基準にする
  const barScaleMax = Math.max(maxRate, targetRate ?? 0);
  const targetMarkerPct = targetRate && barScaleMax > 0 ? (targetRate / barScaleMax) * 100 : null;

  function rateColor(rate: number, max: number) {
    // 目標時給が設定されていればそれを基準に、なければ最高時給案件との相対比較で判定する
    if (targetRate) {
      const ratio = rate / targetRate;
      if (ratio >= 1) return "text-emerald-700";
      if (ratio >= 0.7) return "text-amber-700";
      return "text-red-700";
    }
    if (max === 0) return "text-ink-3";
    const ratio = rate / max;
    if (ratio >= 0.8) return "text-emerald-700";
    if (ratio >= 0.5) return "text-amber-700";
    return "text-red-700";
  }

  // ===== クライアント別 =====
  const clientSummaries = getClientSummaries().sort((a, b) => b.totalSeconds - a.totalSeconds);
  const maxClientSeconds = clientSummaries[0]?.totalSeconds ?? 0;

  const tabs: { key: ReportTab; label: string }[] = [
    { key: "monthly", label: "月次" },
    { key: "yearly", label: "年次" },
    { key: "projects", label: "案件分析" },
    { key: "clients", label: "クライアント別" },
  ];

  return (
    <div className="space-y-4">
      {/* タブ切替・目標時給 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 bg-line-2 rounded-xl p-1 w-fit">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setReportTab(t.key)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${reportTab === t.key ? "bg-white text-accent-text font-medium shadow-sm" : "text-ink-3 hover:text-ink-2"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-ink-3 bg-white border border-line-2 rounded-xl px-3 py-2">
          目標時給
          <input
            type="number"
            inputMode="numeric"
            value={targetRateInput}
            onChange={(e) => handleTargetRateChange(e.target.value)}
            placeholder="未設定"
            className="w-20 text-right font-mono text-ink focus:outline-none placeholder:text-ink-3"
          />
          円/h
        </label>
      </div>

      {/* ===== 月次 ===== */}
      {reportTab === "monthly" && (
        <>
          <div className="flex gap-2">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
              {years.map((y) => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
              {months.map((m) => <option key={m} value={m}>{m}月</option>)}
            </select>
          </div>

          {rows.length === 0 && completedCount === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-line-2 text-center">
              <p className="text-sm text-ink-3">この月の記録はありません</p>
            </div>
          ) : (
            <>
              {/* KPI */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="作業時間" value={formatDuration(totalSeconds)} accent sub={`${rows.length}案件`} delta={totalSecondsDelta ?? undefined} />
                <StatTile label="確定金額（税込）" value={`¥${Math.round(completedContractTotal).toLocaleString()}`}
                  sub={`完了${completedCount}件 · 税抜 ¥${Math.round(completedContractTotalExcludingTax).toLocaleString()}`}
                  delta={contractTotalDelta ?? undefined} />
                <StatTile label="平均時給" value={monthAvgRate > 0 ? `¥${Math.round(monthAvgRate).toLocaleString()}` : "—"}
                  sub={monthAvgRate > 0 ? targetRateSub(monthAvgRate, targetRate) : "完了案件なし"}
                  subTone={monthAvgRate > 0 ? targetRateTone(monthAvgRate, targetRate) : "neutral"} />
                <StatTile label="稼働日あたり" value={workedDays > 0 ? hours(totalSeconds / workedDays) : "—"} sub={`稼働${workedDays}日`} />
              </div>

              {/* 日別の作業時間 */}
              <div className="bg-white rounded-2xl border border-line-2 p-5">
                <h2 className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-4">日別の作業時間</h2>
                <TimeBars
                  data={dailyBars}
                  formatValue={formatDuration}
                  labelEvery={2}
                  gap="gap-[3px]"
                />
                <p className="text-xs text-ink-3 mt-3">淡い列は土日です</p>
              </div>

              {/* 比率チャート */}
              <div className="grid lg:grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-line-2 p-5">
                  <h2 className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-4">案件別の時間比率</h2>
                  <DonutChart slices={monthProjectSlices} formatValue={hours} centerLabel="合計" />
                </div>
                <div className="bg-white rounded-2xl border border-line-2 p-5">
                  <h2 className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-4">タスク別の時間比率</h2>
                  <DonutChart slices={monthTaskSlices} formatValue={hours} centerLabel="合計" />
                </div>
              </div>

              {/* 案件別（表としても機能する詳細） */}
              <div className="bg-white rounded-2xl border border-line-2 overflow-hidden">
                <div className="px-6 py-4 border-b border-line-2">
                  <h2 className="text-sm font-medium text-ink-3 uppercase tracking-wider">案件別の詳細</h2>
                </div>
                <div className="divide-y divide-line-2">
                  {rows.map(([projectId, r], ri) => {
                    const taskRows = Object.values(r.byTask).sort((a, b) => b.seconds - a.seconds);
                    const isExpanded = expandedProject === projectId;
                    const c = rankColor(ri);
                    return (
                      <div key={projectId}>
                        <div className="px-6 py-4 space-y-2 cursor-pointer hover:bg-tint transition-colors"
                          onClick={() => setExpandedProject(isExpanded ? null : projectId)}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                              <span className="text-sm font-medium text-ink truncate">{r.name}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-xs text-ink-3">¥{Math.round(calcAmountIncludingTax(r.contractAmount, r.taxIncluded)).toLocaleString()}</span>
                              <span className="text-sm font-mono text-ink-2">{formatDuration(r.seconds)}</span>
                              <span className="text-sm text-ink-2">¥{Math.round(r.effectiveRate).toLocaleString()}/h</span>
                              <span className="text-ink-3 text-xs">{isExpanded ? "▲" : "▼"}</span>
                            </div>
                          </div>
                          <div className="w-full bg-line-2 rounded-full h-1">
                            <div className="h-1 rounded-full" style={{
                              backgroundColor: c,
                              width: totalSeconds > 0 ? `${(r.seconds / totalSeconds) * 100}%` : "0%",
                            }} />
                          </div>
                        </div>
                        {isExpanded && taskRows.length > 0 && (
                          <div className="px-6 pb-4 space-y-2 border-t border-line-2 bg-tint">
                            <p className="text-xs text-ink-3 pt-3 uppercase tracking-wider">タスク別</p>
                            {taskRows.map((t) => (
                              <div key={t.taskName}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-ink-2">{t.taskName}</span>
                                  <span className="text-xs font-mono text-ink-2">{formatDuration(t.seconds)}</span>
                                </div>
                                <div className="w-full bg-line rounded-full h-1">
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
            className="border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
            {years.map((y) => <option key={y} value={y}>{y}年</option>)}
          </select>

          {yearTotalSeconds === 0 && yearCompletedCount === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-line-2 text-center">
              <p className="text-sm text-ink-3">この年の記録はありません</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="年間作業時間" value={formatDuration(yearTotalSeconds)} accent sub={`稼働${activeMonths}ヶ月`} />
                <StatTile label="年間確定金額" value={`¥${Math.round(yearTotalContract).toLocaleString()}`} sub={`完了${yearCompletedCount}件・税込`} />
                <StatTile label="平均時給" value={yearAvgRate > 0 ? `¥${Math.round(yearAvgRate).toLocaleString()}` : "—"}
                  sub={yearAvgRate > 0 ? targetRateSub(yearAvgRate, targetRate) : "完了案件なし"}
                  subTone={yearAvgRate > 0 ? targetRateTone(yearAvgRate, targetRate) : "neutral"} />
                <StatTile label="月平均" value={activeMonths > 0 ? hours(yearTotalSeconds / activeMonths) : "—"} sub="稼働月あたり" />
              </div>

              <div className="bg-white rounded-2xl border border-line-2 p-5">
                <h2 className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-4">月別の作業時間</h2>
                <TimeBars
                  data={monthlyBreakdown.map((m) => ({
                    key: m.month,
                    label: `${m.month}`,
                    seconds: m.seconds,
                    extra: m.count > 0 ? `¥${Math.round(m.amount).toLocaleString()}` : undefined,
                  }))}
                  formatValue={formatDuration}
                />
              </div>

              <div className="grid lg:grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-line-2 p-5">
                  <h2 className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-4">クライアント別の時間比率</h2>
                  <DonutChart slices={yearClientSlices} formatValue={hours} centerLabel="年間" />
                </div>
                <div className="bg-white rounded-2xl border border-line-2 p-5">
                  <h2 className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-4">タスク別の時間比率</h2>
                  <DonutChart slices={yearTaskSlices} formatValue={hours} centerLabel="年間" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-line-2 overflow-hidden">
                <div className="px-6 py-4 border-b border-line-2">
                  <h2 className="text-sm font-medium text-ink-3 uppercase tracking-wider">月別の詳細</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line-2 bg-tint">
                      <th className="text-left px-6 py-2.5 text-xs font-medium text-ink-2">月</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-ink-2">作業時間</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-ink-2">完了</th>
                      <th className="text-right px-6 py-2.5 text-xs font-medium text-ink-2">確定金額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-2">
                    {monthlyBreakdown.map((m) => (
                      <tr key={m.month} className={m.seconds === 0 && m.count === 0 ? "opacity-40" : ""}>
                        <td className="px-6 py-2.5 text-ink-2">{m.month}月</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-ink-2">{m.seconds > 0 ? formatDuration(m.seconds) : "—"}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-ink-2">{m.count > 0 ? `${m.count}件` : "—"}</td>
                        <td className="px-6 py-2.5 text-right text-xs text-ink-2">{m.amount > 0 ? `¥${Math.round(m.amount).toLocaleString()}` : "—"}</td>
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
            <div className="bg-white rounded-2xl p-8 border border-line-2 text-center">
              <p className="text-sm text-ink-3">記録がありません</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-ink-3">
                時給の高い順。時給は案件の全期間合計時間・税込金額で計算しています。
                {targetMarkerPct !== null && <> バーの<span className="inline-block w-0.5 h-2.5 bg-ink-3 align-middle mx-0.5" />は目標時給の位置です。</>}
              </p>
              <div className="bg-white rounded-2xl border border-line-2 overflow-hidden">
                <div className="divide-y divide-line-2">
                  {projectSummaries.map((p, i) => {
                    const taskRows = Object.values(p.byTask).sort((a, b) => b.seconds - a.seconds);
                    const isExpanded = expandedProject === p.id;
                    return (
                      <div key={p.id}>
                        <div className="px-6 py-4 cursor-pointer hover:bg-tint transition-colors"
                          onClick={() => setExpandedProject(isExpanded ? null : p.id)}>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-ink-3 w-4">{i + 1}</span>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                            <span className="text-sm font-medium text-ink flex-1 truncate">{p.name}</span>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-base font-mono font-medium ${rateColor(p.effectiveRate, maxRate)}`}>
                                ¥{Math.round(p.effectiveRate).toLocaleString()}<span className="text-xs font-normal">/h</span>
                              </p>
                              <p className="text-xs text-ink-3">{formatDuration(p.totalSeconds)} · ¥{Math.round(p.includingTaxAmount).toLocaleString()}</p>
                            </div>
                            <span className="text-ink-3 text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
                          </div>
                          <div className="mt-2 ml-7 w-full bg-line-2 rounded-full h-1.5 relative">
                            <div className="h-1.5 rounded-full transition-all" style={{
                              backgroundColor: p.color,
                              width: barScaleMax > 0 ? `${(p.effectiveRate / barScaleMax) * 100}%` : "0%",
                            }} />
                            {targetMarkerPct !== null && (
                              <div
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-3 bg-ink-3 rounded-full"
                                style={{ left: `${targetMarkerPct}%` }}
                                title={`目標 ¥${targetRate?.toLocaleString()}/h`}
                              />
                            )}
                          </div>
                        </div>
                        {isExpanded && taskRows.length > 0 && (
                          <div className="px-6 pb-4 border-t border-line-2 bg-tint space-y-2">
                            <p className="text-xs text-ink-3 pt-3 uppercase tracking-wider">タスク別作業時間</p>
                            {taskRows.map((t) => (
                              <div key={t.taskName}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-ink-2">{t.taskName}</span>
                                  <span className="text-xs font-mono text-ink-2">{formatDuration(t.seconds)}</span>
                                </div>
                                <div className="w-full bg-line rounded-full h-1">
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

      {/* ===== クライアント別 ===== */}
      {reportTab === "clients" && (
        <>
          {clientSummaries.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-line-2 text-center">
              <p className="text-sm text-ink-3">記録がありません</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-ink-3">作業時間が多い順。全期間の合計時間・税込金額で計算しています。</p>
              <div className="bg-white rounded-2xl border border-line-2 overflow-hidden">
                <div className="divide-y divide-line-2">
                  {clientSummaries.map((c, i) => (
                    <div key={c.id} className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-ink-3 w-4">{i + 1}</span>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: rankColor(i) }} />
                        <span className="text-sm font-medium text-ink flex-1 truncate">{c.name}</span>
                        <span className="text-xs text-ink-3 flex-shrink-0">{c.projectCount}案件</span>
                        <div className="text-right flex-shrink-0 w-28">
                          <p className={`text-sm font-mono font-medium ${rateColor(c.effectiveRate, maxRate)}`}>
                            ¥{Math.round(c.effectiveRate).toLocaleString()}<span className="text-xs font-normal">/h</span>
                          </p>
                          <p className="text-xs text-ink-3">{formatDuration(c.totalSeconds)} · ¥{Math.round(c.includingTaxAmount).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="mt-2 ml-7 w-full bg-line-2 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{
                          backgroundColor: rankColor(i),
                          width: maxClientSeconds > 0 ? `${(c.totalSeconds / maxClientSeconds) * 100}%` : "0%",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
