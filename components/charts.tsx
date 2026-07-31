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
    return <p className="text-sm text-ink-3 text-center py-8">データがありません</p>;
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
    <div className="flex flex-col items-center gap-4">
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
              <span className="text-[10px] text-ink-2 text-center leading-tight line-clamp-2">{active.label}</span>
              <span className="text-sm font-mono font-medium text-ink">{Math.round(active.frac * 100)}%</span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-ink-3 uppercase tracking-wider">{centerLabel}</span>
              <span className="text-sm font-mono font-medium text-ink">{formatValue(total)}</span>
            </>
          )}
        </div>
      </div>

      {/* 凡例：色だけに頼らないよう必ずラベルと数値を出す */}
      <ul className="flex-1 w-full space-y-1.5 min-w-0">
        {arcs.map((a) => (
          <li
            key={a.i}
            className={`flex items-center gap-2 text-xs rounded px-1.5 py-1 -mx-1.5 transition-colors ${hovered === a.i ? "bg-tint" : ""}`}
            onMouseEnter={() => setHovered(a.i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: a.color }} />
            <span className="text-ink-2 truncate flex-1 min-w-0">{a.label}</span>
            <span className="font-mono text-ink-2 flex-shrink-0">{formatValue(a.value)}</span>
            <span className="font-mono text-ink-3 w-9 text-right flex-shrink-0">{Math.round(a.frac * 100)}%</span>
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
    <div className="bg-white rounded-2xl border border-line-2 px-5 py-4">
      <p className="text-xs text-ink-3 uppercase tracking-wider mb-1.5">{label}</p>
      <p className={`font-light text-ink ${accent ? "text-2xl font-mono" : "text-2xl"}`}>{value}</p>
      {sub && <p className="text-xs text-ink-3 mt-1">{sub}</p>}
    </div>
  );
}

export interface TimeBar {
  key: string | number;
  label: string;
  seconds: number;
  /** ツールチップに時間と併記する補足（金額など） */
  extra?: string;
  /** 土日など、目立たせなくてよい列 */
  muted?: boolean;
}

/**
 * 時間の推移を見るカラムチャート（月別・日別で共用）。
 * 時系列の大小比較なので色は単一。Y軸はきりのいい時間に丸めて目盛りを出す。
 */
export function TimeBars({
  data, formatValue, labelEvery = 1, height = "h-32", gap = "gap-1.5",
}: {
  data: TimeBar[];
  formatValue: (v: number) => string;
  /** ラベルを何本おきに出すか（日別は本数が多いので間引く） */
  labelEvery?: number;
  height?: string;
  gap?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxSeconds = Math.max(...data.map((d) => d.seconds), 1);

  // 軸の上限を「きりのいい時間」に丸める（例: 実測37h → 目盛りは0/10/20/30/40h）
  const maxHours = maxSeconds / 3600;
  const step =
    maxHours <= 2 ? 0.5 : maxHours <= 5 ? 1 : maxHours <= 10 ? 2
    : maxHours <= 25 ? 5 : maxHours <= 50 ? 10 : maxHours <= 100 ? 20 : 50;
  const axisMaxHours = Math.ceil(maxHours / step) * step;
  const axisMaxSeconds = axisMaxHours * 3600;
  const tickCount = Math.round(axisMaxHours / step) + 1;
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    Number((axisMaxHours - i * step).toFixed(1))
  );

  return (
    <div className="flex gap-2">
      {/* Y軸（時間の目盛り） */}
      <div className={`flex flex-col justify-between ${height} text-[10px] text-ink-3 text-right w-8 flex-shrink-0`}>
        {ticks.map((t) => <div key={t}>{t}h</div>)}
      </div>

      <div className="flex-1 min-w-0">
        <div className={`relative ${height}`}>
          {/* 横方向のグリッド線 */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {ticks.map((t) => <div key={t} className="border-t border-line-2 w-full" />)}
          </div>
          <div className={`absolute inset-0 flex items-end ${gap}`}>
            {data.map((d, i) => {
              const h = (d.seconds / axisMaxSeconds) * 100;
              return (
                <div
                  key={d.key}
                  className="flex-1 flex flex-col justify-end h-full relative"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {hovered === i && d.seconds > 0 && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full bg-accent-strong text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap z-10">
                      <span className="text-accent-100 mr-1.5">{d.label}</span>
                      {formatValue(d.seconds)}
                      {d.extra && <span className="text-accent-100 ml-1.5">{d.extra}</span>}
                    </div>
                  )}
                  <div
                    className="w-full rounded-t transition-colors"
                    style={{
                      height: `${Math.max(h, d.seconds > 0 ? 2 : 0)}%`,
                      backgroundColor:
                        hovered === i ? "#1d7979" : d.muted ? "#9ecfce" : "#28a6a5",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className={`flex ${gap} mt-1.5`}>
          {data.map((d, i) => (
            <div key={d.key} className="flex-1 text-center text-[10px] text-ink-3">
              {i % labelEvery === 0 ? d.label : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 検証済みカテゴリカルパレット（固定順・循環生成しない）。
 * 彩度を 0.12 前後に落とした中間色。原色寄りだと画面がうるさくなるため。
 * ただし落としすぎると灰色に見えて判別できなくなるので、
 * OKLCH彩度 0.10 を下回らない範囲で調整してある。
 * この並び順自体がCVD（色覚特性）で隣り合う色を判別できることの担保なので、順番は変えない。
 */
export const PALETTE = ["#3a7ec6", "#d57447", "#29a37e", "#d09f38", "#ca6d93", "#428340", "#8061b2", "#c05853"];
export const OTHER_COLOR = "#b8bcbc";

/** 一覧側の色。ドーナツと同じ「時間の多い順」に割り当てるので上位は必ず一致する。 */
export function rankColor(index: number) {
  return PALETTE[index % PALETTE.length];
}

/**
 * 上位n件＋「その他」にまとめる（ドーナツは6セグメントが上限）。
 * 色はパレットの固定順で先頭から割り当てる。案件の登録色は重複しがちで
 * 円グラフだと隣同士が同じ色になり判別できなくなるため、グラフ内では使わない。
 */
export function foldToTop<T>(
  items: T[],
  getValue: (x: T) => number,
  getLabel: (x: T) => string,
  topN = 5
): Slice[] {
  const sorted = [...items].filter((x) => getValue(x) > 0).sort((a, b) => getValue(b) - getValue(a));
  const head = sorted.slice(0, topN).map((x, i) => ({
    label: getLabel(x), value: getValue(x), color: PALETTE[i],
  }));
  const tail = sorted.slice(topN);
  if (tail.length > 0) {
    head.push({
      label: `その他（${tail.length}件）`,
      value: tail.reduce((s, x) => s + getValue(x), 0),
      color: OTHER_COLOR,
    });
  }
  return head;
}
