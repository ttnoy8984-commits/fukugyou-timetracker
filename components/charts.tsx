"use client";

import { useState } from "react";

export interface Slice {
  label: string;
  value: number;
  color: string;
}

/**
 * ドーナツチャート（部分‑全体をひと目で見るため）。
 * セグメントは最大6つまで。それ以上は呼び出し側で「その他」にまとめる。
 * セグメント間に2px相当の隙間を空け、凡例で必ず直接ラベルを付ける
 * （色だけに情報を持たせないため）。
 */
export function DonutChart({
  slices,
  formatValue,
  centerLabel,
}: {
  slices: Slice[];
  formatValue: (v: number) => string;
  centerLabel: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) {
    return <p className="text-sm text-gray-400 text-center py-8">データがありません</p>;
  }

  const R = 40;
  const C = 2 * Math.PI * R;
  const GAP = 1.6; // viewBox単位 ≒ 2px

  let offset = 0;
  const arcs = slices.map((s, i) => {
    const frac = s.value / total;
    const raw = C * frac;
    const len = Math.max(raw - GAP, 0.6);
    const arc = { ...s, i, len, offset, frac };
    offset += raw;
    return arc;
  });

  const active = hovered !== null ? arcs[hovered] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-40 h-40 -rotate-90">
          {arcs.map((a) => (
            <circle
              key={a.i}
              cx="50" cy="50" r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={hovered === a.i ? 15 : 12}
              strokeDasharray={`${a.len} ${C - a.len}`}
              strokeDashoffset={-a.offset}
              className="transition-all cursor-default"
              onMouseEnter={() => setHovered(a.i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
          {active ? (
            <>
              <span className="text-[10px] text-gray-500 text-center leading-tight line-clamp-2">{active.label}</span>
              <span className="text-sm font-mono font-medium text-gray-900">{Math.round(active.frac * 100)}%</span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">{centerLabel}</span>
              <span className="text-sm font-mono font-medium text-gray-900">{formatValue(total)}</span>
            </>
          )}
        </div>
      </div>

      {/* 凡例：色だけに頼らないよう必ずラベルと数値を出す */}
      <ul className="flex-1 w-full space-y-1.5 min-w-0">
        {arcs.map((a) => (
          <li
            key={a.i}
            className={`flex items-center gap-2 text-xs rounded px-1.5 py-1 -mx-1.5 transition-colors ${hovered === a.i ? "bg-gray-50" : ""}`}
            onMouseEnter={() => setHovered(a.i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: a.color }} />
            <span className="text-gray-700 truncate flex-1 min-w-0">{a.label}</span>
            <span className="font-mono text-gray-500 flex-shrink-0">{formatValue(a.value)}</span>
            <span className="font-mono text-gray-400 w-9 text-right flex-shrink-0">{Math.round(a.frac * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** KPIカード。数字そのものが主役なのでグラフにはしない。 */
export function StatTile({
  label, value, sub, accent,
}: {
  label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
      <p className={`font-light text-gray-900 ${accent ? "text-2xl font-mono" : "text-2xl"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

/** 月別推移のカラムチャート（時系列の大小比較なので単一色） */
export function MonthlyBars({
  data, formatValue,
}: {
  data: { month: number; seconds: number; amount: number; count: number }[];
  formatValue: (v: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.seconds), 1);

  return (
    <div>
      <div className="flex items-end gap-1.5 h-32">
        {data.map((d, i) => {
          const h = (d.seconds / max) * 100;
          return (
            <div
              key={d.month}
              className="flex-1 flex flex-col justify-end h-full relative"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {hovered === i && d.seconds > 0 && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap z-10">
                  {formatValue(d.seconds)}
                  {d.count > 0 && <span className="text-gray-300 ml-1.5">¥{Math.round(d.amount).toLocaleString()}</span>}
                </div>
              )}
              <div
                className="w-full rounded-t transition-colors"
                style={{
                  height: `${Math.max(h, d.seconds > 0 ? 2 : 0)}%`,
                  backgroundColor: hovered === i ? "#2a78d6" : "#86b6ef",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {data.map((d) => (
          <div key={d.month} className="flex-1 text-center text-[10px] text-gray-400">{d.month}</div>
        ))}
      </div>
    </div>
  );
}

/** 上位n件＋「その他」にまとめる（ドーナツは6セグメントが上限） */
export function foldToTop<T>(
  items: T[],
  getValue: (x: T) => number,
  getLabel: (x: T) => string,
  getColor: (x: T) => string,
  topN = 5
): Slice[] {
  const sorted = [...items].filter((x) => getValue(x) > 0).sort((a, b) => getValue(b) - getValue(a));
  const head = sorted.slice(0, topN).map((x) => ({ label: getLabel(x), value: getValue(x), color: getColor(x) }));
  const tail = sorted.slice(topN);
  if (tail.length > 0) {
    head.push({
      label: `その他（${tail.length}件）`,
      value: tail.reduce((s, x) => s + getValue(x), 0),
      color: "#c3c2b7",
    });
  }
  return head;
}
