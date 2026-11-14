import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/** Story time for the panels, at most ~15 updates a second (the 3D view runs at full rate on its own). */
export function useStoryTime() {
  const [t, setT] = useState(() => useStore.getState().t);
  useEffect(() => {
    let last = 0, pending = 0, raf = 0;
    const unsub = useStore.subscribe((s) => {
      pending = s.t;
      if (raf) return;
      raf = requestAnimationFrame(function tick(now) {
        if (now - last >= 66) { last = now; setT(pending); raf = 0; } else raf = requestAnimationFrame(tick);
      });
    });
    return () => { unsub(); cancelAnimationFrame(raf); };
  }, []);
  return t;
}
import type { Engine } from "../engine/Engine";
import { useStore } from "../store";

export const EngineContext = createContext<Engine | null>(null);
export const useEngine = () => useContext(EngineContext);
export const useSites = () => useStore((s) => s.sites!);

// The labels of research/DATA_STANDARD.md, plus two for words that are not numbers.
export type Evidence = "measured" | "derived" | "reported" | "interpolated" | "interpretation" | "illustrative";
export const EVIDENCE: Record<Evidence, { label: string; hint: string }> = {
  measured: { label: "Measured", hint: "Read directly from a calibrated NASA or ESA product, with no threshold." },
  derived: { label: "Derived", hint: "Computed from measurements with a stated rule, checked against a control and with its threshold nudged up and down." },
  reported: { label: "Reported", hint: "From an official body or the news, quoted with its source. Not recomputed here." },
  interpolated: { label: "Estimated", hint: "Animation between real observations. Never quoted as a finding." },
  interpretation: { label: "Interpretation", hint: "Our reading of why. Consistent with the evidence, not proven by it." },
  illustrative: { label: "Illustrative", hint: "Added for orientation or looks. Not data." },
};

/** How far a statement can be trusted. The mark differs by shape as well as by word. */
export function Tag({ kind }: { kind: Evidence }) {
  const e = EVIDENCE[kind];
  return (
    <span className={`tag tag-${kind}`} title={e.hint} tabIndex={0} aria-label={`${e.label}: ${e.hint}`}>
      <i aria-hidden="true" />
      {e.label}
    </span>
  );
}
export const Tags = ({ kinds }: { kinds: Evidence[] }) => <span className="tags">{kinds.map((k) => <Tag key={k} kind={k} />)}</span>;

/** Percentages: whole numbers, one decimal below 10 (DATA_STANDARD §2). */
export const pct = (v: number) => (Math.abs(v) < 10 ? v.toFixed(1).replace(/\.0$/, "") : String(Math.round(v)));
/** Areas: 3 significant figures, with thousands separators. */
export function area(v: number) {
  const e = Math.pow(10, Math.floor(Math.log10(Math.abs(v) || 1)) - 2);
  const r = Math.round(v / e) * e;
  return r >= 1000 ? Math.round(r).toLocaleString("en-GB") : r >= 100 ? String(Math.round(r)) : r.toFixed(r < 10 ? 2 : 1).replace(/\.?0+$/, "");
}
/** "(31–46%)" style ranges, low first. */
export const range = (lo: number, hi: number, f: (v: number) => string = pct, unit = "") => `(${f(Math.min(lo, hi))}–${f(Math.max(lo, hi))}${unit})`;

/** A number with its uncertainty, styled so the central value reads first. */
export function Num({ v, lo, hi, unit = "%", f = pct }: { v: number; lo?: number; hi?: number; unit?: string; f?: (v: number) => string }) {
  return (
    <span className="num">
      <b>{f(v)}{unit === "%" ? "%" : unit ? ` ${unit}` : ""}</b>
      {lo !== undefined && hi !== undefined && <span className="range"> {range(lo, hi, f)}</span>}
    </span>
  );
}

export const Src = ({ children, href }: { children: ReactNode; href?: string }) =>
  href ? <a className="src" href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span className="src">{children}</span>;
