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
  /** real seconds left to rest on a note's point during playback */
  hold: number;
  /** playback speed multiplier, chosen by the visitor */
  speed: number;
  /** the reading panel on the left and the map-view panel on the right */
  storyOpen: boolean;
  panelOpen: boolean;
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
  /** the "moving around the map" card */
  helpOpen: boolean;
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
  /** playback has reached note i: open it at its point and rest there for a moment */
  reach(i: number): void;
  setSpeed(s: number): void;
  setStoryOpen(o: boolean): void;
  setPanelOpen(o: boolean): void;
  toLanding(): void;
  setLayer(l: Layer): void;
  setPass(p: "dusk" | "dawn"): void;
  setRain(r: boolean): void;
  setOverlays(o: boolean): void;
  setFreeCam(f: boolean): void;
  recenter(): void;
  setHoverSite(id: SiteId | null): void;
  setSourcesOpen(o: boolean): void;
  setHelpOpen(o: boolean): void;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** How long playback rests on each note's point, in real seconds. */
export const HOLD = 1.5;

/** The note that owns time t: the last one whose point is at or before it. Notes and time never disagree. */
export function chapterAt(id: SiteId, t: number) {
  const chs = PLACES[id].chapters;
  let k = 0;
  for (let i = 0; i < chs.length; i++) if (t >= chs[i].t - 1) k = i;
  return k;
}

/** What a note sets when it becomes the current one: its map view and camera. Time is set by the caller. */
function chapterState(id: SiteId, i: number): Partial<State> {
  const ch = PLACES[id].chapters[i];
  return {
    chapter: i,
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
  hold: 0,
  speed: 0.5,
  storyOpen: true,
  panelOpen: true,
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
  helpOpen: false,
  reducedMotion: reduced,

  setSites: (sites) => set({ sites }),
  setProgress: (progress) => set({ progress }),
  setReady: () => set({ ready: true, progress: 1 }),
  setError: (error) => set({ error }),
  enter: () => set({ phase: "hub", freeCam: false, playing: false }),
  // a place always opens on its first note, at the first point of its timeline
  openSite: (id, chapter = 0) => {
    const s = get();
    const ch = PLACES[id].chapters[chapter];
    set({ phase: "site", siteId: id, hoverSite: null, viewNonce: s.viewNonce + 1, ...chapterState(id, chapter), t: ch.t, tTarget: null, playing: false, playTo: null, hold: 0, visited: { ...s.visited, [id]: Math.max(chapter, s.visited[id] ?? 0) } });
  },
  // picking a note moves time to its point; if the timeline was playing it plays on from there
  setChapter: (i) => {
    const s = get();
    const n = PLACES[s.siteId].chapters.length;
    const c = clamp(i, 0, n - 1);
    set({ ...chapterState(s.siteId, c), t: PLACES[s.siteId].chapters[c].t, tTarget: null, hold: 0, viewNonce: s.viewNonce + 1, visited: { ...s.visited, [s.siteId]: Math.max(c, s.visited[s.siteId] ?? 0) } });
  },
  reach: (i) => {
    const s = get();
    set({ ...chapterState(s.siteId, i), t: PLACES[s.siteId].chapters[i].t, hold: HOLD, visited: { ...s.visited, [s.siteId]: Math.max(i, s.visited[s.siteId] ?? 0) } });
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
  toLanding: () => set({ phase: "intro", playing: false, playTo: null, freeCam: false, hoverSite: null, viewNonce: get().viewNonce + 1 }),
  toFinale: () => set({ phase: "finale", playing: false, playTo: null, freeCam: false, viewNonce: get().viewNonce + 1 }),
  // scrubbing or jumping: time moves, and the note (and with it the camera) follows
  setTime: (t, smooth = false) => {
    const s = get();
    const tl = PLACES[s.siteId].timeline;
    const c = clamp(t, tl.start, tl.end);
    const k = chapterAt(s.siteId, c);
    const note = k !== s.chapter ? { ...chapterState(s.siteId, k), visited: { ...s.visited, [s.siteId]: Math.max(k, s.visited[s.siteId] ?? 0) } } : {};
    if (smooth && !s.reducedMotion) set({ ...note, tTarget: c, playing: false, playTo: null, hold: 0 });
    else set({ ...note, t: c, tTarget: null, playing: false, playTo: null, hold: 0 });
  },
  // play runs to the end of the timeline, resting on every note on the way; at the end it starts over
  setPlaying: (playing) => {
    const s = get();
    if (!playing) return set({ playing: false, hold: 0 });
    const tl = PLACES[s.siteId].timeline;
    if (s.t >= tl.end - 1) {
      set({ ...chapterState(s.siteId, 0), t: tl.start, tTarget: null, playing: true, playTo: tl.end, hold: 0 });
      return;
    }
    set({ playing: true, tTarget: null, playTo: tl.end, hold: 0 });
  },
  setSpeed: (speed) => set({ speed }),
  setStoryOpen: (storyOpen) => set({ storyOpen }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setLayer: (layer) => set({ layer }),
  setPass: (pass) => set({ pass }),
  setRain: (rain) => set({ rain }),
  setOverlays: (overlays) => set({ overlays }),
  setFreeCam: (freeCam) => { if (get().freeCam !== freeCam) set({ freeCam }); },
  recenter: () => set({ freeCam: false, viewNonce: get().viewNonce + 1 }),
  setHoverSite: (hoverSite) => set({ hoverSite }),
  setSourcesOpen: (sourcesOpen) => set({ sourcesOpen }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
}));

export const currentChapter = (s: { siteId: SiteId; chapter: number }) => PLACES[s.siteId].chapters[s.chapter];
