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

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">月次レポート</h2>

      <div className="flex gap-2">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {years.map((y) => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {months.map((m) => <option key={m} value={m}>{m}月</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">この月の記録はありません</p>
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="text-sm font-medium">{r.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono text-gray-700">{formatDuration(r.seconds)}</span>
                    <span className="ml-3 text-sm font-bold text-emerald-600">
                      ¥{Math.round(r.earnings).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor: r.color,
                      width: totalSeconds > 0 ? `${(r.seconds / totalSeconds) * 100}%` : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-500">合計時間</span>
              <div className="text-2xl font-mono font-bold text-gray-800">{formatDuration(totalSeconds)}</div>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500">合計報酬</span>
              <div className="text-2xl font-bold text-emerald-600">¥{Math.round(totalEarnings).toLocaleString()}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
