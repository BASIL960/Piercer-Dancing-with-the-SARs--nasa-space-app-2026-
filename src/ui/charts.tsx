// Small SVG charts. One idea per chart, no dual axes. Every value drawn comes from the site data.
import type { ReactNode } from "react";
import { fmtCompact, fmtIso, isoDay, DAY, HOUR, type JazanData, type NepalData, type OregonData } from "../data";
import { JAZAN_T0, NEPAL_T0, NISAR_PASS_NEPAL, OREGON_T0 } from "../story";
import { pct } from "./bits";

const W = 320;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function Frame({ h, label, children, w = W }: { h: number; label: string; children: ReactNode; w?: number }) {
  return <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>{children}</svg>;
}
const monthTicks = (x: (t: number) => number, y0: number, y1: number, from: number, to: number) => {
  const out: ReactNode[] = [];
  const d = new Date(from);
  for (let m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).getTime(); m <= to; m = Date.UTC(new Date(m).getUTCFullYear(), new Date(m).getUTCMonth() + 1, 1)) {
    out.push(<g key={m}><line x1={x(m)} x2={x(m)} y1={y0} y2={y1} className="grid" /><text x={x(m) + 2} y={y1 + 11}>{MONTHS[new Date(m).getUTCMonth()]}</text></g>);
  }
  return out;
};

// ---------------------------------------------------------------- Nepal
/** Elevation along the flood route (Copernicus DEM), with the surge front while it runs. */
export function ProfileChart({ d, t }: { d: NepalData; t: number }) {
  const H = 120, top = 12, bot = 20, n = d.elev.length, lo = 600, hi = 5400;
  const X = (i: number) => 6 + ((W - 12) * i) / (n - 1), Y = (v: number) => top + (H - top - bot) * (1 - (v - lo) / (hi - lo));
  const path = d.elev.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const m = (t - NEPAL_T0) / 60000, fm = d.flowMinutes;
  let i = -1;
  if (m >= 0 && m <= fm[fm.length - 1] + 30) { i = 0; while (i < fm.length - 1 && fm[i + 1] <= m) i++; }
  const at = (km: number) => Math.round((km / d.pathKm) * (n - 1));
  return (
    <Frame h={H} label={`Elevation along the ${d.pathKm} km flood route, from ${d.elev[0]} m to ${d.elev[n - 1]} m`}>
      {[1000, 3000, 5000].map((v) => <g key={v}><line x1={6} x2={W - 6} y1={Y(v)} y2={Y(v)} className="grid" /><text x={W - 6} y={Y(v) - 2} textAnchor="end">{v.toLocaleString("en-GB")} m</text></g>)}
      <path d={`${path} L${X(n - 1)},${H - bot} L${X(0)},${H - bot}Z`} className="area water" />
      <path d={path} className="line water" />
      {[["Rasuwagadhi", d.kmR], ["Syabrubesi", d.kmS]].map(([name, km]) => (
        <g key={name as string}><line x1={X(at(km as number))} x2={X(at(km as number))} y1={top} y2={H - bot} className="mark" /><text x={X(at(km as number))} y={H - 6} textAnchor="middle">{name}</text></g>
      ))}
      <text x={6} y={H - 6}>source</text>
      {i >= 0 && <circle cx={X(at((i / (fm.length - 1)) * d.pathKm))} cy={Y(d.elev[at((i / (fm.length - 1)) * d.pathKm)])} r={4.5} className="dot surge" />}
    </Frame>
  );
}

/** Rule C per radar pair: corridor vs slopes beside it, with the threshold range as whiskers. */
export function PairsChart({ d, t, onPick }: { d: NepalData; t: number; onPick: (t: number) => void }) {
  const H = 150, top = 16, bot = 30, keys = Object.keys(d.std.pairs).sort();
  const n = keys.length, bw = (W - 30) / n, hiV = 80;
  const Y = (v: number) => top + (H - top - bot) * (1 - Math.min(v, hiV) / hiV);
  let cur = 0;
  keys.forEach((k, i) => { if (t >= NISAR_PASS_NEPAL(k.slice(9))) cur = i; });
  return (
    <Frame h={H} label="Share of ground that changed between radar passes, flood corridor against the slopes beside it">
      {[20, 40, 60].map((v) => <g key={v}><line x1={24} x2={W} y1={Y(v)} y2={Y(v)} className="grid" /><text x={0} y={Y(v) + 3}>{v}%</text></g>)}
      {keys.map((k, i) => {
        const p = d.std.pairs[k], x = 26 + i * bw, flood = k === "20260819_20260831";
        return (
          // the pairs are one tab stop (the pair on the map); arrow keys step through them, as clicking does
          <g key={k} className={`pair${i === cur ? " now" : ""}${flood ? " flood" : ""}`} onClick={() => onPick(NISAR_PASS_NEPAL(k.slice(9)) + 60000)} role="button" tabIndex={i === cur ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(NISAR_PASS_NEPAL(k.slice(9)) + 60000); return; }
              const j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -1;
              if (j < 0 || j >= n) return;
              e.preventDefault(); e.stopPropagation();
              onPick(NISAR_PASS_NEPAL(keys[j].slice(9)) + 60000);
              e.currentTarget.parentElement?.querySelectorAll<SVGGElement>(".pair")[j]?.focus();
            }}
            aria-label={`${fmtCompact(k.slice(0, 8))} to ${fmtCompact(k.slice(9))}: corridor ${pct(p.corridor)}%, slopes ${pct(p.control)}%`}>
            <rect x={x - 1} y={top - 6} width={bw - 2} height={H - top - bot + 8} className="hit" />
            <rect x={x + 1} y={Y(p.corridor)} width={bw * 0.36} height={H - bot - Y(p.corridor)} className="bar corridor" />
            <line x1={x + 1 + bw * 0.18} x2={x + 1 + bw * 0.18} y1={Y(p.corridorHi)} y2={Y(p.corridorLo)} className="whisker" />
            <rect x={x + 2 + bw * 0.38} y={Y(p.control)} width={bw * 0.36} height={H - bot - Y(p.control)} className="bar control" />
            <line x1={x + 2 + bw * 0.56} x2={x + 2 + bw * 0.56} y1={Y(p.controlHi)} y2={Y(p.controlLo)} className="whisker" />
            <text x={x + bw * 0.42} y={H - bot + 11} textAnchor="middle" className="small">{fmtCompact(k.slice(9)).split(" ")[0]}</text>
            <text x={x + bw * 0.42} y={H - bot + 21} textAnchor="middle" className="small">{fmtCompact(k.slice(9)).split(" ")[1]}</text>
            {flood && <text x={x + bw * 0.4} y={top - 4} textAnchor="middle" className="label">flood</text>}
          </g>
        );
      })}
    </Frame>
  );
}

/** Clear photos against radar passes, around the flood. */
export function PassesStrip({ d, t }: { d: NepalData; t: number }) {
  const H = 78, from = Date.UTC(2026, 7, 1), to = Date.UTC(2026, 9, 20);
  const X = (v: number) => 8 + ((W - 16) * (v - from)) / (to - from);
  const passes = [...new Set(d.radar.flatMap((r) => [r.d1, r.d2]))].map((s) => NISAR_PASS_NEPAL(s)).filter((v) => v >= from && v <= to);
  const photos = [isoDay("2026-08-12"), isoDay("2026-10-01")];
  return (
    <Frame h={H} label="Clear optical photos and radar passes over the valley, August to October 2026">
      {monthTicks(X, 6, H - 16, from, to)}
      <rect x={X(NEPAL_T0)} y={6} width={X(isoDay("2026-10-01")) - X(NEPAL_T0)} height={H - 22} className="veil" />
      <text x={X(NEPAL_T0) + 4} y={17} className="label">no clear photo</text>
      <text x={8} y={33} className="small">photos</text>
      {photos.map((p) => <rect key={p} x={X(p) - 3} y={25} width={6} height={10} rx={1.5} className="photo" />)}
      <text x={8} y={56} className="small">radar</text>
      {passes.map((p) => <circle key={p} cx={X(p)} cy={52} r={3.6} className="pass" />)}
      <line x1={X(NEPAL_T0)} x2={X(NEPAL_T0)} y1={4} y2={H - 16} className="event" />
      <line x1={X(t)} x2={X(t)} y1={4} y2={H - 16} className="cursor" />
    </Frame>
  );
}

// ---------------------------------------------------------------- Oregon
/** Share of the final burned area: measured on clear photos (with how much was visible); the curve is the animation's estimate. */
export function BurnChart({ d, t }: { d: OregonData; t: number }) {
  const H = 132, top = 12, bot = 18, from = Date.UTC(2026, 6, 22, 12), to = Date.UTC(2026, 7, 31);
  const X = (v: number) => 26 + ((W - 32) * (v - from)) / (to - from), Y = (v: number) => top + (H - top - bot) * (1 - v / 100);
  const fin = d.areaHourly[d.areaHourly.length - 1];
  let p = `M${X(from)},${Y(0)}`;
  for (let h = 0; h < d.areaHourly.length; h += 3) p += ` L${X(OREGON_T0 + h * HOUR).toFixed(1)},${Y((d.areaHourly[h] / fin) * 100).toFixed(1)}`;
  const s = d.std.series;
  return (
    <Frame h={H} label="Share of the final burned area burned by each date">
      {[25, 50, 75, 100].map((v) => <g key={v}><line x1={26} x2={W - 4} y1={Y(v)} y2={Y(v)} className="grid" /><text x={0} y={Y(v) + 3}>{v}%</text></g>)}
      {monthTicks(X, top, H - bot, from, to)}
      <rect x={X(Date.UTC(2026, 6, 26))} y={top} width={X(Date.UTC(2026, 7, 12)) - X(Date.UTC(2026, 6, 26))} height={H - top - bot} className="gap" />
      <text x={X(Date.UTC(2026, 6, 26)) + 3} y={H - bot - 4} className="small">no radar passes</text>
      <path d={p} className="line estimate" />
      {s.map((o) => {
        const x = X(isoDay(o.date) + 18 * HOUR);
        if (o.date === "2026-07-29") return <g key={o.date}><line x1={x} x2={x} y1={Y(d.std.jul29Bounds[0])} y2={Y(d.std.jul29Bounds[1])} className="whisker strong" /><circle cx={x} cy={Y(d.std.jul29Bounds[0])} r={3.4} className="dot fire" /><text x={x + 5} y={Y(d.std.jul29Bounds[1]) + 3} className="small">≤{Math.round(d.std.jul29Bounds[1])}% (smoke)</text></g>;
        return <circle key={o.date} cx={x} cy={Y(Math.min(100, o.share_of_final))} r={o.valid_in_perimeter < 0.95 ? 2.6 : 3.4} className={`dot fire${o.valid_in_perimeter < 0.95 ? " partial" : ""}`}><title>{`${fmtIso(o.date)}: ${pct(o.share_of_final)}% of the final burned area, ${Math.round(o.valid_in_perimeter * 100)}% of the perimeter visible`}</title></circle>;
      })}
      <line x1={X(Math.min(t, to))} x2={X(Math.min(t, to))} y1={top} y2={H - bot} className="cursor" />
    </Frame>
  );
}

/** Radar HV after the fire as a share of its pre-fire level: hottest-burned, all burned, unburned outside. */
export function HvChart({ d, t }: { d: OregonData; t: number }) {
  const H = 132, top = 14, bot = 18, from = Date.UTC(2026, 7, 14), to = Date.UTC(2026, 9, 27);
  const X = (v: number) => 26 + ((W - 30) * (v - from)) / (to - from), Y = (v: number) => top + (H - top - bot) * (1 - (v - 40) / 65);
  const dates = Object.keys(d.std.hv).sort(), at = (s: string) => isoDay(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);
  const rows = [["hot", "burned hottest"], ["burned", "all burned"], ["control", "unburned outside"]] as const;
  return (
    <Frame h={H} label="Radar HV after the fire as a share of its pre-fire level">
      {[50, 75, 100].map((v) => <g key={v}><line x1={26} x2={W - 4} y1={Y(v)} y2={Y(v)} className="grid" /><text x={0} y={Y(v) + 3}>{v}%</text></g>)}
      {monthTicks(X, top, H - bot, from, to)}
      {rows.map(([k, name]) => {
        const p = dates.map((s, i) => `${i ? "L" : "M"}${X(at(s)).toFixed(1)},${Y(d.std.hv[s][k].pct_of_pre).toFixed(1)}`).join(" ");
        const last = d.std.hv[dates[dates.length - 1]][k].pct_of_pre;
        return (
          <g key={k} className={`hv ${k}`}>
            <path d={p} className="line" />
            {dates.map((s) => <circle key={s} cx={X(at(s))} cy={Y(d.std.hv[s][k].pct_of_pre)} r={2.6} className="dot"><title>{`${fmtCompact(s)}: ${name} ${d.std.hv[s][k].pct_of_pre}% of pre-fire`}</title></circle>)}
            <text x={X(at(dates[dates.length - 1])) - 4} y={Y(last) + (k === "burned" ? 11 : -5)} textAnchor="end" className="small">{name} {last}%</text>
          </g>
        );
      })}
      <line x1={X(Math.min(Math.max(t, from), to))} x2={X(Math.min(Math.max(t, from), to))} y1={top} y2={H - bot} className="cursor" />
    </Frame>
  );
}

/** Horizontal bars, 0–100%, each with its threshold range. */
export function CompareBars({ rows, label }: { rows: { name: string; v: number; lo?: number; hi?: number; kind: string }[]; label: string }) {
  const rowH = 30, H = rows.length * rowH + 8, x0 = 112, X = (v: number) => x0 + ((W - x0 - 34) * v) / 100;
  return (
    <Frame h={H} label={label}>
      {rows.map((r, i) => {
        const y = 6 + i * rowH;
        return (
          <g key={r.name}>
            <text x={0} y={y + 14} className="rowlabel">{r.name}</text>
            <rect x={x0} y={y + 4} width={W - x0 - 34} height={14} className="track" />
            <rect x={x0} y={y + 4} width={Math.max(1.5, X(r.v) - x0)} height={14} className={`bar ${r.kind}`} />
            {r.lo !== undefined && r.hi !== undefined && <line x1={X(r.lo)} x2={X(r.hi)} y1={y + 11} y2={y + 11} className="whisker" />}
            <text x={W} y={y + 15} textAnchor="end" className="value">{pct(r.v)}%</text>
          </g>
        );
      })}
    </Frame>
  );
}

// ---------------------------------------------------------------- Jazan
const JDAY = (iso: string) => isoDay(iso) - 3 * HOUR;
/** Daily rain over the study area (NASA IMERG), with official alerts. */
export function RainChart({ d, t, alerts, onPick }: { d: JazanData; t: number; alerts: { t: number; kind: string }[]; onPick: (t: number) => void }) {
  const H = 120, top = 14, bot = 18, from = JAZAN_T0, to = JAZAN_T0 + 166 * DAY;
  const X = (v: number) => 22 + ((W - 26) * (v - from)) / (to - from);
  const mx = Math.ceil(Math.max(...d.rain.map((r) => r.mm)) / 5) * 5, Y = (v: number) => top + (H - top - bot) * (1 - v / mx);
  return (
    <Frame h={H} label="Rain on each day over the Jazan study area, NASA IMERG, June to November 2026">
      {[mx / 2, mx].map((v) => <g key={v}><line x1={22} x2={W - 4} y1={Y(v)} y2={Y(v)} className="grid" /><text x={0} y={Y(v) + 3}>{v}</text></g>)}
      <text x={0} y={top - 4} className="small">mm/day</text>
      {monthTicks(X, top, H - bot, from, to)}
      {d.rain.map((r) => r.mm > 0.05 && (
        <rect key={r.date} x={X(JDAY(r.date) + 12 * HOUR) - 0.9} y={Y(r.mm)} width={1.8} height={H - bot - Y(r.mm)} className="bar rain" onClick={() => onPick(JDAY(r.date) + 15 * HOUR)}>
          <title>{`${fmtIso(r.date)}: ${r.mm.toFixed(1)} mm on average, ${Math.round(r.max)} mm in the wettest cell`}</title>
        </rect>
      ))}
      {alerts.map((a) => <rect key={a.t} x={X(a.t) - 2.5} y={3} width={5} height={5} transform={`rotate(45 ${X(a.t)} 5.5)`} className={`alert ${a.kind}`} />)}
      <line x1={X(t)} x2={X(t)} y1={top} y2={H - bot} className="cursor" />
    </Frame>
  );
}

/** Rule C share of the coastal plain, per 12-day pair, dusk against dawn. */
export function DuskDawnChart({ d, t, pass }: { d: JazanData; t: number; pass: "dusk" | "dawn" }) {
  const H = 132, top = 14, bot = 18, from = Date.UTC(2026, 5, 15), to = Date.UTC(2026, 9, 31);
  const X = (v: number) => 22 + ((W - 26) * (v - from)) / (to - from), Y = (v: number) => top + (H - top - bot) * (1 - v / 60);
  const series = (track: string) => Object.entries(d.std.cohPairs).filter(([k]) => k.startsWith(track)).map(([k, v]) => ({ a: isoDay(`${k.slice(4, 8)}-${k.slice(8, 10)}-${k.slice(10, 12)}`), b: isoDay(`${k.slice(13, 17)}-${k.slice(17, 19)}-${k.slice(19, 21)}`), v }));
  const line = (s: ReturnType<typeof series>) => s.map((p, i) => `${i ? "L" : "M"}${X((p.a + p.b) / 2).toFixed(1)},${Y(p.v["t0.2"]).toFixed(1)}`).join(" ");
  return (
    <Frame h={H} label="Share of the coastal plain where radar saw the ground change, dusk passes against dawn passes">
      {[20, 40, 60].map((v) => <g key={v}><line x1={22} x2={W - 4} y1={Y(v)} y2={Y(v)} className="grid" /><text x={0} y={Y(v) + 3}>{v}%</text></g>)}
      {monthTicks(X, top, H - bot, from, to)}
      {(["064", "071"] as const).map((tr) => {
        const s = series(tr), on = (tr === "064") === (pass === "dusk");
        return (
          <g key={tr} className={`series ${tr === "064" ? "dusk" : "dawn"}${on ? " on" : ""}`}>
            <path d={line(s)} className="line" />
            {s.map((p) => (
              <g key={p.a}>
                <line x1={X(p.a)} x2={X(p.b)} y1={Y(p.v["t0.2"])} y2={Y(p.v["t0.2"])} className="span" />
                <line x1={X((p.a + p.b) / 2)} x2={X((p.a + p.b) / 2)} y1={Y(p.v["t0.15"])} y2={Y(p.v["t0.25"])} className="whisker" />
                <circle cx={X((p.a + p.b) / 2)} cy={Y(p.v["t0.2"])} r={p.v.days > 12 ? 2.4 : 3.2} className={`dot${p.v.days > 12 ? " partial" : ""}`}><title>{`${tr === "064" ? "Dusk" : "Dawn"} ${fmtIso(new Date(p.a).toISOString().slice(0, 10))} → ${fmtIso(new Date(p.b).toISOString().slice(0, 10))}: ${pct(p.v["t0.2"])}%${p.v.days > 12 ? " (24-day pair, not in the averages)" : ""}`}</title></circle>
              </g>
            ))}
          </g>
        );
      })}
      <g transform={`translate(26,${top + 2})`} className="key"><rect width={10} height={3} y={-3} className="dusk" /><text x={14} y={1}>dusk 18:39</text><rect x={80} width={10} height={3} y={-3} className="dawn" /><text x={94} y={1}>dawn 05:39</text></g>
      <line x1={X(t)} x2={X(t)} y1={top} y2={H - bot} className="cursor" />
    </Frame>
  );
}

/** Newly green coastal plain, km², from the per-pixel green-up dates (HLS). */
export function GreenChart({ d, t }: { d: JazanData; t: number }) {
  const H = 116, top = 12, bot = 18, G = d.season.green_new_plain, from = JAZAN_T0, to = JAZAN_T0 + G.length * DAY;
  const X = (v: number) => 30 + ((W - 34) * (v - from)) / (to - from);
  const mx = Math.ceil(Math.max(...G) / 500) * 500, Y = (v: number) => top + (H - top - bot) * (1 - v / mx);
  const p = G.map((v, i) => `${i ? "L" : "M"}${X(from + (i + 10.5 / 24) * DAY).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const i = Math.max(0, Math.min(G.length - 1, Math.floor((t - from) / DAY - 10.5 / 24)));
  return (
    <Frame h={H} label="Area of the coastal plain newly green since June, by date">
      {[mx / 2, mx].map((v) => <g key={v}><line x1={30} x2={W - 4} y1={Y(v)} y2={Y(v)} className="grid" /><text x={0} y={Y(v) + 3}>{v.toLocaleString("en-GB")}</text></g>)}
      <text x={0} y={top - 3} className="small">km²</text>
      {monthTicks(X, top, H - bot, from, to)}
      <path d={`${p} L${X(to)},${Y(0)} L${X(from)},${Y(0)}Z`} className="area green" />
      <path d={p} className="line green" />
      <circle cx={X(from + (i + 10.5 / 24) * DAY)} cy={Y(G[i])} r={3.6} className="dot green" />
      <line x1={X(t)} x2={X(t)} y1={top} y2={H - bot} className="cursor" />
    </Frame>
  );
}

// ---------------------------------------------------------------- the season, all three places
export interface SeasonRow { id: string; label: string; spans: { a: number; b: number; kind: string; label?: string }[]; passes: number[] }
export function SeasonChart({ rows, gap }: { rows: SeasonRow[]; gap: [number, number] }) {
  const SW = 620, rowH = 38, top = 22, H = top + rows.length * rowH + 18, from = Date.UTC(2026, 5, 1), to = Date.UTC(2026, 10, 14);
  const X = (v: number) => 92 + ((SW - 96) * (v - from)) / (to - from);
  return (
    <Frame w={SW} h={H} label="The 2026 season at all three places: when each change happened and when NISAR passed">
      {monthTicks(X, top - 6, H - 16, from, to)}
      <rect x={X(gap[0])} y={top - 6} width={X(gap[1]) - X(gap[0])} height={H - top - 10} className="gap" />
      <text x={X(gap[0]) + (X(gap[1]) - X(gap[0])) / 2} y={top - 10} textAnchor="middle" className="small">no NISAR data</text>
      {rows.map((r, i) => {
        const y = top + i * rowH;
        return (
          <g key={r.id}>
            <text x={0} y={y + 15} className="rowlabel">{r.label}</text>
            {r.spans.map((s) => <rect key={s.a} x={X(s.a)} y={y + 4} width={Math.max(3, X(s.b) - X(s.a))} height={14} rx={2} className={`span ${s.kind}`}><title>{s.label}</title></rect>)}
            {r.passes.map((p) => <circle key={p} cx={X(p)} cy={y + 25} r={1.9} className="pass" />)}
          </g>
        );
      })}
    </Frame>
  );
}
