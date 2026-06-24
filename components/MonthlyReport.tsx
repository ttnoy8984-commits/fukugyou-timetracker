"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/storage";

interface TaskSummary {
  taskName: string;
  seconds: number;
}

interface ProjectSummary {
  seconds: number;
  contractAmount: number;
  effectiveRate: number;
  name: string;
  color: string;
  byTask: Record<string, TaskSummary>;
}

interface Props {
  getMonthlySummary: (year: number, month: number) => {
    byProject: Record<string, ProjectSummary>;
    entries: unknown[];
  };
}

export default function MonthlyReport({ getMonthlySummary }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const { byProject } = getMonthlySummary(year, month);
  const rows = Object.entries(byProject);
  const totalSeconds = rows.reduce((s, [, r]) => s + r.seconds, 0);
  const totalContract = rows.reduce((s, [, r]) => s + r.contractAmount, 0);

  const years = [now.getFullYear() - 1, now.getFullYear()];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* 月選択 */}
      <div className="flex gap-2">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
        >
          {years.map((y) => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
        >
          {months.map((m) => <option key={m} value={m}>{m}月</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
          <p className="text-sm text-gray-400">この月の記録はありません</p>
        </div>
      ) : (
        <>
          {/* 合計 */}
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

          {/* 案件別 */}
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
                    <div
                      className="px-6 py-4 space-y-2 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedProject(isExpanded ? null : projectId)}
                    >
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
                        <div
                          className="h-1 rounded-full"
                          style={{
                            backgroundColor: r.color,
                            width: totalSeconds > 0 ? `${(r.seconds / totalSeconds) * 100}%` : "0%",
                          }}
                        />
                      </div>
                    </div>

                    {/* タスク別内訳 */}
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
                                <div
                                  className="h-1 rounded-full"
                                  style={{
                                    backgroundColor: r.color,
                                    opacity: 0.6,
                                    width: r.seconds > 0 ? `${(t.seconds / r.seconds) * 100}%` : "0%",
                                  }}
                                />
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
    </div>
  );
}
