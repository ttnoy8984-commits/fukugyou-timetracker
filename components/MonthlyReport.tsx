"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/storage";

interface ProjectSummary {
  seconds: number;
  earnings: number;
  name: string;
  color: string;
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

  const { byProject } = getMonthlySummary(year, month);
  const rows = Object.values(byProject);
  const totalSeconds = rows.reduce((s, r) => s + r.seconds, 0);
  const totalEarnings = rows.reduce((s, r) => s + r.earnings, 0);

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
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">合計時間</p>
              <p className="text-3xl font-mono font-light text-gray-900">{formatDuration(totalSeconds)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">合計報酬</p>
              <p className="text-3xl font-light text-gray-900">¥{Math.round(totalEarnings).toLocaleString()}</p>
            </div>
          </div>

          {/* 案件別 */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">案件別</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {rows.map((r) => (
                <div key={r.name} className="px-6 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className="text-sm text-gray-800">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-gray-500">{formatDuration(r.seconds)}</span>
                      <span className="text-sm text-gray-800">¥{Math.round(r.earnings).toLocaleString()}</span>
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
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
