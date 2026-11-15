import type { ReactElement } from "react";
import type { SiteId } from "../data";

/** Line icons on a 24px grid, drawn in currentColor. */
const base = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const Icon = {
  /** a surge of water: the flood */
  flood: (p: { size?: number }) => (
    <svg {...base} width={p.size ?? 18} height={p.size ?? 18}><path d="M2 9c2.5 0 2.5-2.5 5-2.5S9.5 9 12 9s2.5-2.5 5-2.5S19.5 9 22 9" /><path d="M2 14c2.5 0 2.5-2.5 5-2.5s2.5 2.5 5 2.5 2.5-2.5 5-2.5 2.5 2.5 5 2.5" /><path d="M2 19c2.5 0 2.5-2.5 5-2.5s2.5 2.5 5 2.5 2.5-2.5 5-2.5 2.5 2.5 5 2.5" strokeOpacity=".55" /></svg>
  ),
  fire: (p: { size?: number }) => (
    <svg {...base} width={p.size ?? 18} height={p.size ?? 18}><path d="M12 22c4 0 7-2.7 7-6.6 0-3.3-2.2-5.4-3.6-7.6-.6 1.8-1.6 2.9-2.9 3.3.4-3.3-.9-6.3-3.6-9.1.2 3.6-1.6 5.6-3.3 7.6C4.3 11.2 5 13 5 15.4 5 19.3 8 22 12 22z" /><path d="M12 22c-1.7 0-3-1.2-3-3 0-1.6 1.2-2.6 2-3.9.5 1 1.1 1.5 1.8 1.6-.1-1 .3-2 1-2.8.7 1.4 1.2 2.6 1.2 4.1 0 2.4-1.3 4-3 4z" strokeOpacity=".6" /></svg>
  ),
  rain: (p: { size?: number }) => (
    <svg {...base} width={p.size ?? 18} height={p.size ?? 18}><path d="M7 15.5a4.5 4.5 0 1 1 1.1-8.9A5.5 5.5 0 0 1 18.5 8a3.8 3.8 0 0 1-.5 7.5H7z" /><path d="M8 18.5l-1 2M12 18.5l-1 2M16 18.5l-1 2" /></svg>
  ),
  season: (p: { size?: number }) => (
    <svg {...base} width={p.size ?? 18} height={p.size ?? 18}><circle cx="12" cy="12" r="5.5" /><ellipse cx="12" cy="12" rx="10.5" ry="4" transform="rotate(-24 12 12)" strokeOpacity=".65" /><circle cx="20.4" cy="8.2" r="1.3" fill="currentColor" stroke="none" /></svg>
  ),
  globe: (p: { size?: number }) => (
    <svg {...base} width={p.size ?? 18} height={p.size ?? 18}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.5 3.9 5.5 3.9 9s-1.3 6.5-3.9 9c-2.6-2.5-3.9-5.5-3.9-9S9.4 5.5 12 3z" /></svg>
  ),
  sources: (p: { size?: number }) => (
    <svg {...base} width={p.size ?? 18} height={p.size ?? 18}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" /><path d="M6.5 8h2.5M15 8h2.5M6.5 11h2.5M15 11h2.5" strokeOpacity=".6" /></svg>
  ),
  layers: (p: { size?: number }) => (
    <svg {...base} width={p.size ?? 16} height={p.size ?? 16}><path d="M12 3l9 4.8-9 4.8-9-4.8z" /><path d="M3 12.2l9 4.8 9-4.8" strokeOpacity=".7" /><path d="M3 16.6l9 4.8 9-4.8" strokeOpacity=".45" /></svg>
  ),
  arrow: (p: { size?: number }) => (
    <svg {...base} width={p.size ?? 16} height={p.size ?? 16}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  recenter: (p: { size?: number }) => (
    <svg {...base} width={p.size ?? 16} height={p.size ?? 16}><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
  ),
  play: (p: { size?: number }) => (<svg viewBox="0 0 16 16" width={p.size ?? 15} height={p.size ?? 15} aria-hidden="true"><path d="M4 2.2l9.5 5.8L4 13.8z" fill="currentColor" /></svg>),
  pause: (p: { size?: number }) => (<svg viewBox="0 0 16 16" width={p.size ?? 15} height={p.size ?? 15} aria-hidden="true"><path d="M3.5 2h3.2v12H3.5zM9.3 2h3.2v12H9.3z" fill="currentColor" /></svg>),
  prev: (p: { size?: number }) => (<svg viewBox="0 0 16 16" width={p.size ?? 13} height={p.size ?? 13} aria-hidden="true"><path d="M3 2.5h1.8v11H3zM13.5 2.8v10.4L5.8 8z" fill="currentColor" /></svg>),
  next: (p: { size?: number }) => (<svg viewBox="0 0 16 16" width={p.size ?? 13} height={p.size ?? 13} aria-hidden="true"><path d="M11.2 2.5H13v11h-1.8zM2.5 2.8v10.4L10.2 8z" fill="currentColor" /></svg>),
};

/** Each place keeps one icon and one accent everywhere: nav, card, chip. */
export const PLACE_ICON: Record<SiteId, (p: { size?: number }) => ReactElement> = { nepal: Icon.flood, oregon: Icon.fire, jazan: Icon.rain };
export const PLACE_ACCENT: Record<SiteId, string> = { nepal: "var(--water)", oregon: "var(--fire)", jazan: "var(--green)" };

/** The logo files (public/brand): lime is the default on the app's dark ground; olive, white and black are for other grounds. */
export const LOGO = {
  horizontal: (c: "green" | "olive" | "white" | "black" = "green") => `${import.meta.env.BASE_URL}brand/piercer-logo-horizontal-${c}.svg`,
  mark: (c: "green" | "olive" | "white" | "black" = "green") => `${import.meta.env.BASE_URL}brand/piercer-mark-${c}.svg`,
};

/** The Piercer logo: the mark and the name, in lime. */
export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  const img = <img className={`brand-logo ${size}`} src={LOGO.horizontal("green")} alt="Piercer" draggable={false} />;
  // in the top bar on a narrow screen, the mark alone
  return size === "md" ? <picture><source media="(max-width: 900px)" srcSet={LOGO.mark("green")} />{img}</picture> : img;
}
