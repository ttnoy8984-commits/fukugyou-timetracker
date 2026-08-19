"use client";

import { useState } from "react";
import { Project, Task, TimeEntry } from "@/lib/types";
import { formatDuration } from "@/lib/storage";

interface Props {
  entries: TimeEntry[];
  projects: Project[];
  tasks: Task[];
  onEdit: (entry: TimeEntry) => void;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CalendarView({ entries, projects, tasks, onEdit }: Props) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = toDateStr(now);

  function changeMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDate(null);
  }

  function goToday() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(null);
  }

  // 日別に集計（週次と同じく月曜始まりのグリッド）
  const daySeconds: Record<string, number> = {};
  const dayProjects: Record<string, string[]> = {};
  entries.forEach((e) => {
    if (e.endTime === null) return;
    daySeconds[e.date] = (daySeconds[e.date] ?? 0) + e.durationSeconds;
    if (e.projectId) {
      if (!dayProjects[e.date]) dayProjects[e.date] = [];
      if (!dayProjects[e.date].includes(e.projectId)) dayProjects[e.date].push(e.projectId);
    }
  });

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0=月 ... 6=日
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstWeekday + 1;
    const date = new Date(viewYear, viewMonth, dayNum);
    const dateStr = toDateStr(date);
    return {
      dateStr,
      label: date.getDate(),
      inMonth: date.getMonth() === viewMonth,
      isToday: dateStr === todayStr,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      seconds: daySeconds[dateStr] ?? 0,
      projectIds: dayProjects[dateStr] ?? [],
    };
  });

  const monthTotalSeconds = cells
    .filter((c) => c.inMonth)
    .reduce((s, c) => s + c.seconds, 0);

  const selectedEntries = selectedDate
    ? entries
        .filter((e) => e.date === selectedDate && e.endTime !== null)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => changeMonth(-1)}
          className="border border-line rounded-xl px-3 py-2.5 text-sm text-ink-2 hover:bg-tint transition-colors"
        >
          ←
        </button>
        <div className="border border-line rounded-xl px-4 py-2.5 text-sm text-ink flex-1 text-center">
          {viewYear}年{viewMonth + 1}月
          <span className="text-ink-3 text-xs ml-2">合計 {formatDuration(monthTotalSeconds)}</span>
        </div>
        <button
          onClick={() => changeMonth(1)}
          className="border border-line rounded-xl px-3 py-2.5 text-sm text-ink-2 hover:bg-tint transition-colors"
        >
          →
        </button>
        {!(viewYear === now.getFullYear() && viewMonth === now.getMonth()) && (
          <button onClick={goToday} className="text-xs text-accent-text hover:text-accent-deep whitespace-nowrap">
            今月
          </button>
        )}
      </div>

      <div className="bg-surface rounded-2xl border border-line-2 p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["月", "火", "水", "木", "金", "土", "日"].map((d) => (
            <div key={d} className="text-center text-[10px] text-ink-3 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c) => (
            <button
              key={c.dateStr}
              onClick={() => setSelectedDate(c.dateStr === selectedDate ? null : c.dateStr)}
              disabled={!c.inMonth}
              className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-start text-left transition-colors ${
                !c.inMonth ? "opacity-0 pointer-events-none" :
                selectedDate === c.dateStr ? "bg-accent-strong" :
                c.seconds > 0 ? "bg-accent-100 hover:bg-accent-50" : "hover:bg-tint"
              } ${c.isToday ? "ring-1 ring-accent" : ""}`}
            >
              <span className={`text-[11px] mt-0.5 ${
                selectedDate === c.dateStr ? "text-white" :
                c.isWeekend ? "text-ink-3" : "text-ink-2"
              }`}>
                {c.label}
              </span>
              {c.seconds > 0 && (
                <span className={`text-[9px] font-mono mt-0.5 ${selectedDate === c.dateStr ? "text-accent-100" : "text-accent-text"}`}>
                  {(c.seconds / 3600).toFixed(1)}h
                </span>
              )}
              {c.projectIds.length > 0 && (
                <div className="flex gap-0.5 mt-auto mb-0.5 flex-wrap justify-center">
                  {c.projectIds.slice(0, 4).map((pid) => {
                    const p = projects.find((pr) => pr.id === pid);
                    return (
                      <span
                        key={pid}
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: p?.color ?? "#ccc" }}
                      />
                    );
                  })}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div className="bg-surface rounded-2xl border border-line-2 overflow-hidden">
          <div className="px-5 py-3 border-b border-line-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-ink">{selectedDate}</h3>
            <span className="text-xs text-ink-3">{formatDuration(daySeconds[selectedDate] ?? 0)}</span>
          </div>
          {selectedEntries.length === 0 ? (
            <p className="text-sm text-ink-3 text-center py-6">この日の記録はありません</p>
          ) : (
            <div className="divide-y divide-line-2">
              {selectedEntries.map((e) => {
                const project = projects.find((p) => p.id === e.projectId);
                const task = tasks.find((t) => t.id === e.taskId);
                const start = new Date(e.startTime);
                const fmt = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
                const end = new Date(start.getTime() + e.durationSeconds * 1000);
                return (
                  <div key={e.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project?.color ?? "#ccc" }} />
                      <div className="min-w-0">
                        <p className="text-sm text-ink truncate">{project?.name ?? "—"} {task ? `/ ${task.name}` : ""}</p>
                        <p className="text-xs text-ink-3">{fmt(start)}〜{fmt(end)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-mono text-ink-2">{formatDuration(e.durationSeconds)}</span>
                      <button onClick={() => onEdit(e)} className="text-xs text-ink-3 hover:text-ink-2">編集</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
