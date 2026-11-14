// Types and loaders for the files written by scripts/stories/build.mjs (public/data/sites/<id>/site.json).
export type SiteId = "nepal" | "oregon" | "jazan";
export const SITE_IDS: SiteId[] = ["nepal", "oregon", "jazan"];

export type LatLon = [number, number];
export interface Grid { x0: number; y0: number; res: number; W: number; H: number }
export interface TerrainGrid { file: string; x0: number; y0: number; step: number; w: number; h: number; min: number; max: number }
export interface Place { name: string; kind: string; at: LatLon }

interface SiteBase {
  utm: { zone: number; south: boolean };
  context: Grid;
  detail: Grid;
  terrain: { context: TerrainGrid; detail: TerrainGrid };
  places: Place[];
  regions: { name: string; at: LatLon }[];
}

export interface Range { v: number; lo: number; hi: number }

export interface OregonData extends SiteBase {
  id: "oregon";
  lines: { name: string; pts: LatLon[] }[];
  perimeter: LatLon[][];
  areaHourly: number[];
  std: {
    perimeterKm2: number;
    burned: { km2: number; lo: number; hi: number; share: number; shareLo: number; shareHi: number };
    controlFlaggedPct: number;
    severity: { low: number; moderate_low: number; moderate_high: number; high: number };
    series: { date: string; burned_km2: number; valid_in_perimeter: number; share_of_final: number }[];
    jul29Bounds: [number, number];
    coh: Record<string, Record<string, Record<string, number>>>;
    hv: Record<string, Record<"hot" | "light" | "burned" | "control", { median_db: number; pct_of_pre: number; "darker1.5": number; "darker2.0": number; "darker2.5": number }>>;
    preDates: string[];
  };
}

export interface NepalData extends SiteBase {
  id: "nepal";
  flowline: LatLon[];
  flowMinutes: number[];
  elev: number[];
  areaMinutes: number[];
  pathKm: number; kmR: number; kmS: number; srcElev: number;
  radar: { img: string; label: string; d1: string; d2: string }[];
  std: {
    corridorKm2: number; pathKm: number;
    stripped: { km2: number; lo: number; hi: number; share: number; controlPct: number };
    pairs: Record<string, { corridor: number; control: number; corridorLo: number; corridorHi: number; controlLo: number; controlHi: number }>;
    baselinePairs: string[];
    xcheck: { stripped: number; rest: number; strippedLo: number; strippedHi: number };
  };
}

export interface JazanCoh { track: string; when: "dusk" | "dawn"; d1: string; d2: string; img: string; plain_changed: number; days: number }
export interface JazanGcov { track: string; when: "dusk" | "dawn"; date: string; img: string; brighter: number; darker: number }
export interface JazanHls { date: string; img: string; clear: number; ndvi_plain: number; green_share: number }
export interface JazanData extends SiteBase {
  id: "jazan";
  coh: JazanCoh[];
  gcov: JazanGcov[];
  hls: JazanHls[];
  rainGrid: { latMax: number; lonMin: number; cell: number; rows: number; cols: number };
  rain: { date: string; mm: number; max: number; grid: number[][] }[];
  hh: Record<string, number[][][]>;
  prepass: Record<string, { n: number; mean_mm: number; max_mm: number; wet_share: number }>;
  pins: Record<string, { at: LatLon; mm: number }>;
  season: { green_new_plain: number[]; green_new_all: number[]; water_new: number[]; water_june: number[]; plain_km2: number; already_green_plain: number };
  std: {
    plainKm2: number;
    cohPairs: Record<string, { days: number; valid: number; "t0.15": number; "t0.2": number; "t0.25": number }>;
    avg: { dusk: number; duskLo: number; duskHi: number; dawn: number; dawnLo: number; dawnHi: number };
    brightness: Record<string, Record<string, number>>;
    green: { km2: number; lo: number; hi: number; pct: number; pctLo: number; pctHi: number; bands: Record<string, { median_upday: Record<string, string> }> };
    xcheck: { flagged: number; not: number; flaggedLo: number; flaggedHi: number; notLo: number; notHi: number; ratios: number[] };
  };
}

export type SiteData = OregonData | NepalData | JazanData;
export interface Sites { nepal: NepalData; oregon: OregonData; jazan: JazanData }

export const dataUrl = (p: string) => `${import.meta.env.BASE_URL}data/${p}`;
export const siteUrl = (id: SiteId, p: string) => dataUrl(`sites/${id}/${p}`);

export async function loadSites(): Promise<Sites> {
  const get = async (id: SiteId) => {
    const res = await fetch(siteUrl(id, "site.json"));
    if (!res.ok) throw new Error(`Could not load ${id}/site.json (${res.status}). Run "npm run data" to build the data files.`);
    return res.json();
  };
  const [nepal, oregon, jazan] = await Promise.all(SITE_IDS.map(get));
  return { nepal, oregon, jazan };
}

export async function loadTerrain(id: SiteId, g: TerrainGrid): Promise<Int16Array> {
  const res = await fetch(siteUrl(id, g.file));
  if (!res.ok) throw new Error(`Could not load ${id}/${g.file}`);
  return new Int16Array(await res.arrayBuffer());
}

// ---------------------------------------------------------------- time
// Time is held as milliseconds since the epoch (UTC). Each place shows it in its own local time.
export const TZ: Record<SiteId, { offsetMin: number; label: string }> = {
  nepal: { offsetMin: 345, label: "Nepal time" },
  oregon: { offsetMin: 0, label: "UTC" },
  jazan: { offsetMin: 180, label: "Saudi time" },
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES = MONTHS;
/** A local wall-clock time at a place, as UTC milliseconds. */
export const local = (id: SiteId, y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h, mi) - TZ[id].offsetMin * 60000;
export const isoDay = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const parts = (id: SiteId, t: number) => { const d = new Date(t + TZ[id].offsetMin * 60000); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() }; };
export function fmtDay(id: SiteId, t: number, year = false) { const p = parts(id, t); return `${p.d} ${MONTHS[p.m]}${year ? ` ${p.y}` : ""}`; }
export function fmtClock(id: SiteId, t: number) { const p = parts(id, t); return `${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`; }
export function fmtIso(iso: string, year = false) { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]}${year ? ` ${y}` : ""}`; }
/** "20260819" -> "19 Aug" */
export const fmtCompact = (s: string) => fmtIso(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);

export const DAY = 86400000, HOUR = 3600000, MINUTE = 60000;
