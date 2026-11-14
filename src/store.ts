import { create } from "zustand";
import type { SiteId, Sites } from "./data";
import { ORDER, PLACES, type Layer } from "./story";

export type Phase = "intro" | "hub" | "site" | "finale";

interface State {
  ready: boolean;
  progress: number;
  error: string | null;
  sites: Sites | null;

  phase: Phase;
  siteId: SiteId;
  chapter: number;
  /** time at the current place, UTC milliseconds */
  t: number;
  /** where a running animation of time is heading; null when time stands still */
  playTo: number | null;
  playing: boolean;
  /** smooth jumps of time (clicking an event, a chart point) */
  tTarget: number | null;
  layer: Layer;
  pass: "dusk" | "dawn";
  rain: boolean;
  overlays: boolean;
  /** the visitor has taken the camera; the story view is one click away */
  freeCam: boolean;
  /** bumps when the camera should return to the chapter's view */
  viewNonce: number;
  hoverSite: SiteId | null;
  visited: Partial<Record<SiteId, number>>;
  sourcesOpen: boolean;
  reducedMotion: boolean;

  setSites(s: Sites): void;
  setProgress(p: number): void;
  setReady(): void;
  setError(e: string): void;
  enter(): void;
  openSite(id: SiteId, chapter?: number): void;
  setChapter(i: number): void;
  next(): void;
  prev(): void;
  toHub(): void;
  toFinale(): void;
  setTime(t: number, smooth?: boolean): void;
  setPlaying(p: boolean): void;
  setLayer(l: Layer): void;
  setPass(p: "dusk" | "dawn"): void;
  setRain(r: boolean): void;
  setOverlays(o: boolean): void;
  setFreeCam(f: boolean): void;
  recenter(): void;
  setHoverSite(id: SiteId | null): void;
  setSourcesOpen(o: boolean): void;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Everything a chapter sets when it opens. */
function chapterState(id: SiteId, i: number, reducedMotion: boolean): Partial<State> {
  const ch = PLACES[id].chapters[i];
  const play = ch.play && !reducedMotion;
  return {
    chapter: i,
    t: play ? ch.play!.from : ch.play && reducedMotion ? ch.play.to : ch.t,
    playTo: play ? ch.play!.to : null,
    playing: !!play,
    tTarget: null,
    layer: ch.layer,
    rain: ch.fx?.rain ?? ch.layer === "season",
    freeCam: false,
    ...(ch.pass ? { pass: ch.pass } : {}),
  };
}

export const useStore = create<State>((set, get) => ({
  ready: false,
  progress: 0,
  error: null,
  sites: null,

  phase: "intro",
  siteId: "nepal",
  chapter: 0,
  t: PLACES.nepal.chapters[0].t,
  playTo: null,
  playing: false,
  tTarget: null,
  layer: "photo",
  pass: "dusk",
  rain: true,
  overlays: true,
  freeCam: false,
  viewNonce: 0,
  hoverSite: null,
  visited: {},
  sourcesOpen: false,
  reducedMotion: reduced,

  setSites: (sites) => set({ sites }),
  setProgress: (progress) => set({ progress }),
  setReady: () => set({ ready: true, progress: 1 }),
  setError: (error) => set({ error }),
  enter: () => set({ phase: "hub", freeCam: false, playing: false }),
  openSite: (id, chapter) => {
    const s = get();
    const resume = chapter ?? s.visited[id] ?? 0;
    set({ phase: "site", siteId: id, hoverSite: null, viewNonce: s.viewNonce + 1, ...chapterState(id, resume, s.reducedMotion), visited: { ...s.visited, [id]: resume } });
  },
  setChapter: (i) => {
    const s = get();
    const n = PLACES[s.siteId].chapters.length;
    const c = clamp(i, 0, n - 1);
    set({ ...chapterState(s.siteId, c, s.reducedMotion), viewNonce: s.viewNonce + 1, visited: { ...s.visited, [s.siteId]: c } });
  },
  next: () => {
    const s = get();
    if (s.phase === "intro") return s.enter();
    if (s.phase === "hub") return s.openSite(ORDER.find((id) => s.visited[id] === undefined) ?? ORDER[0], undefined);
    if (s.phase !== "site") return;
    const n = PLACES[s.siteId].chapters.length;
    if (s.chapter < n - 1) return s.setChapter(s.chapter + 1);
    const k = ORDER.indexOf(s.siteId);
    if (k < ORDER.length - 1) return s.openSite(ORDER[k + 1], 0);
    s.toFinale();
  },
  prev: () => {
    const s = get();
    if (s.phase === "finale") return s.openSite(ORDER[ORDER.length - 1], PLACES[ORDER[ORDER.length - 1]].chapters.length - 1);
    if (s.phase !== "site") return;
    if (s.chapter > 0) return s.setChapter(s.chapter - 1);
    const k = ORDER.indexOf(s.siteId);
    if (k > 0) return s.openSite(ORDER[k - 1], PLACES[ORDER[k - 1]].chapters.length - 1);
    s.toHub();
  },
  toHub: () => set({ phase: "hub", playing: false, playTo: null, freeCam: false, viewNonce: get().viewNonce + 1 }),
  toFinale: () => set({ phase: "finale", playing: false, playTo: null, freeCam: false, viewNonce: get().viewNonce + 1 }),
  setTime: (t, smooth = false) => {
    const tl = PLACES[get().siteId].timeline;
    const c = clamp(t, tl.start, tl.end);
    if (smooth && !get().reducedMotion) set({ tTarget: c, playing: false, playTo: null });
    else set({ t: c, tTarget: null, playing: false, playTo: null });
  },
  setPlaying: (playing) => {
    const s = get();
    if (!playing) return set({ playing: false });
    const tl = PLACES[s.siteId].timeline;
    const ch = PLACES[s.siteId].chapters[s.chapter];
    // play resumes toward the chapter's goal if there is one ahead, otherwise to the end of the timeline
    const to = ch.play && s.t < ch.play.to - 1 ? ch.play.to : tl.end;
    set({ playing: true, tTarget: null, playTo: to, t: s.t >= tl.end - 1 ? tl.start : s.t });
  },
  setLayer: (layer) => set({ layer }),
  setPass: (pass) => set({ pass }),
  setRain: (rain) => set({ rain }),
  setOverlays: (overlays) => set({ overlays }),
  setFreeCam: (freeCam) => { if (get().freeCam !== freeCam) set({ freeCam }); },
  recenter: () => set({ freeCam: false, viewNonce: get().viewNonce + 1 }),
  setHoverSite: (hoverSite) => set({ hoverSite }),
  setSourcesOpen: (sourcesOpen) => set({ sourcesOpen }),
}));

export const currentChapter = (s: { siteId: SiteId; chapter: number }) => PLACES[s.siteId].chapters[s.chapter];
