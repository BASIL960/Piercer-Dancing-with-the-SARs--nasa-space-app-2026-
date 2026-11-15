// The shape of the journey: places, chapters, camera, layers and time. The words live in ui/copy.tsx;
// every number comes from the site data (research/std_*.json via scripts/stories/build.mjs).
import { DAY, HOUR, MINUTE, local, type LatLon, type SiteId } from "./data";

export type Layer = string;
export interface ViewSpec { at: LatLon; km: number; tilt: number; heading: number }
export interface ChapterDef {
  id: string;
  view: ViewSpec;
  layer: Layer;
  /** where time sits when the chapter opens */
  t: number;
  /** guided playback when the chapter opens (skipped under reduced motion); `rate` overrides the timeline's
   *  speed inside this window, in simulated ms per real second */
  play?: { from: number; to: number; rate?: number };
  follow?: "surge";
  /** the radar pass this chapter's words are about (Jazan) */
  pass?: "dusk" | "dawn";
  /** which layers this chapter offers in its switcher */
  layers?: Layer[];
  overlays?: { places?: boolean; route?: boolean; perimeter?: boolean; ignition?: boolean; dams?: boolean };
  /** shader extras for this chapter */
  fx?: { fire?: number; tint?: number; scar?: number; veil?: boolean; rain?: boolean };
}

export interface Timeline {
  start: number;
  end: number;
  /** piecewise map from time to slider position 0..1, so short events get room */
  segs: [number, number][];
  /** playback speed: simulated milliseconds per real second at time t */
  rate: (t: number) => number;
  ticks: { t: number; label: string }[];
  phases: { s: number; label: string }[];
}

export interface PlaceDef {
  id: SiteId;
  speed: string;      // the timescale this place stands for
  name: string;
  where: string;
  when: string;
  marker: LatLon;     // on the globe
  exag: number;       // vertical exaggeration of the terrain
  hub: ViewSpec;      // how the globe turns to face it
  timeline: Timeline;
  chapters: ChapterDef[];
}

const N = (mo: number, d: number, h = 0, mi = 0) => local("nepal", 2026, mo, d, h, mi);
const O = (mo: number, d: number, h = 0) => Date.UTC(2026, mo - 1, d, h);
const J = (mo: number, d: number, h = 0, mi = 0) => local("jazan", 2026, mo, d, h, mi);

export const NEPAL_T0 = N(8, 26, 8, 37);          // collapse, recorded by seismometers
export const OREGON_T0 = O(7, 23);                // arrival.png hour 0
export const JAZAN_T0 = J(6, 1);                  // research map day 0
export const NISAR_PASS_NEPAL = (iso8: string) => local("nepal", +iso8.slice(0, 4), +iso8.slice(4, 6), +iso8.slice(6, 8), 23, 40);

function piecewise(segs: [number, number][]) {
  return {
    toS: (t: number) => {
      if (t <= segs[0][0]) return 0;
      for (let i = 0; i < segs.length - 1; i++) if (t <= segs[i + 1][0]) return segs[i][1] + ((segs[i + 1][1] - segs[i][1]) * (t - segs[i][0])) / (segs[i + 1][0] - segs[i][0]);
      return 1;
    },
    fromS: (s: number) => {
      for (let i = 0; i < segs.length - 1; i++) if (s <= segs[i + 1][1]) return segs[i][0] + ((segs[i + 1][0] - segs[i][0]) * (s - segs[i][1])) / (segs[i + 1][1] - segs[i][1]);
      return segs[segs.length - 1][0];
    },
  };
}
export const sliderOf = (tl: Timeline) => piecewise(tl.segs);

export const PLACES: Record<SiteId, PlaceDef> = {
  nepal: {
    id: "nepal",
    speed: "Minutes",
    name: "Bhote Koshi",
    where: "Rasuwa, Nepal",
    when: "26 August 2026",
    marker: [28.22, 85.4],
    exag: 1.15,
    hub: { at: [28.22, 85.4], km: 9000, tilt: 0, heading: 0 },
    timeline: {
      start: N(8, 12), end: N(10, 26),
      segs: [[N(8, 12), 0], [N(8, 26, 8, 25), 0.12], [N(8, 26, 9, 35), 0.64], [N(9, 1), 0.8], [N(10, 26), 1]],
      rate: (t) => (t < N(8, 26, 8, 25) ? 1.1 * DAY : t < N(8, 26, 9, 35) ? 1.5 * MINUTE : t < N(9, 1) ? 30 * HOUR : 3.5 * DAY),
      ticks: [[N(8, 12), "12 Aug"], [N(8, 26, 8, 37), "08:37"], [N(8, 26, 9), "09:00"], [N(8, 26, 9, 20), "09:20"], [N(8, 28), "28 Aug"], [N(9, 15), "15 Sep"], [N(10, 26), "26 Oct"]].map(([t, label]) => ({ t: t as number, label: label as string })),
      phases: [{ s: 0, label: "Before" }, { s: 0.125, label: "26 August, minute by minute" }, { s: 0.645, label: "Rescue" }, { s: 0.805, label: "Aftermath" }],
    },
    chapters: [
      { id: "valley", view: { at: [28.205, 85.405], km: 78, tilt: 58, heading: -12 }, layer: "photo", t: N(8, 20), overlays: { places: true }, layers: ["photo", "radar"] },
      { id: "surge", view: { at: [28.29, 85.5], km: 26, tilt: 52, heading: 235 }, layer: "photo", t: N(8, 26, 8, 30), play: { from: N(8, 26, 8, 30), to: N(8, 26, 9, 32) }, follow: "surge", overlays: { places: true, route: true } },
      { id: "blind", view: { at: [28.2, 85.4], km: 64, tilt: 38, heading: 0 }, layer: "photo", t: N(8, 27), play: { from: N(8, 27), to: N(10, 2) }, overlays: { places: true, route: true }, fx: { veil: true } },
      { id: "radar", view: { at: [28.205, 85.405], km: 60, tilt: 18, heading: 0 }, layer: "radar", t: NISAR_PASS_NEPAL("20260831"), overlays: { places: true }, layers: ["radar", "photo"] },
      { id: "scar", view: { at: [28.225, 85.37], km: 24, tilt: 55, heading: 15 }, layer: "scar", t: N(10, 25), overlays: { places: true }, layers: ["scar", "photo", "before"] },
      { id: "meaning", view: { at: [28.21, 85.42], km: 115, tilt: 32, heading: -8 }, layer: "scar", t: N(10, 25), overlays: { places: true, route: true } },
    ],
  },
  oregon: {
    id: "oregon",
    speed: "Weeks",
    name: "Big Grass Fire",
    where: "Oregon–Idaho, USA",
    when: "23 July – 28 August 2026",
    marker: [42.72, -117.0],
    exag: 2.4,
    hub: { at: [42.72, -117.0], km: 9000, tilt: 0, heading: 0 },
    timeline: {
      start: O(7, 22, 12), end: O(10, 25),
      segs: [[O(7, 22, 12), 0], [O(8, 28), 0.72], [O(10, 25), 1]],
      rate: (t) => (t < O(8, 28) ? 16 * HOUR : 70 * HOUR),
      ticks: [[O(7, 23), "23 Jul"], [O(8, 1), "1 Aug"], [O(8, 10), "10 Aug"], [O(8, 20), "20 Aug"], [O(9, 1), "1 Sep"], [O(10, 1), "1 Oct"], [O(10, 24), "24 Oct"]].map(([t, label]) => ({ t: t as number, label: label as string })),
      phases: [{ s: 0, label: "The fire" }, { s: 0.725, label: "After the fire" }],
    },
    chapters: [
      { id: "spark", view: { at: [42.66, -117.25], km: 38, tilt: 55, heading: 70 }, layer: "tc", t: O(7, 23, 20), overlays: { places: true, ignition: true } },
      { id: "run", view: { at: [42.72, -117.02], km: 150, tilt: 40, heading: 25 }, layer: "tc", t: O(7, 23, 12), play: { from: O(7, 23, 12), to: O(7, 29, 12) }, overlays: { places: true, ignition: true }, layers: ["tc", "fc"] },
      { id: "gap", view: { at: [42.7, -116.98], km: 165, tilt: 30, heading: 15 }, layer: "fc", t: O(7, 29, 12), play: { from: O(7, 29, 12), to: O(8, 30) }, overlays: { places: true, ignition: true }, layers: ["fc", "tc"] },
      { id: "islands", view: { at: [42.73, -117.0], km: 140, tilt: 8, heading: 0 }, layer: "fc", t: O(8, 30, 12), overlays: { places: true, perimeter: true }, layers: ["fc", "tc", "rad"], fx: { fire: 0 } },
      { id: "green", view: { at: [42.84, -116.95], km: 52, tilt: 48, heading: 20 }, layer: "tc", t: O(10, 24, 12), overlays: { perimeter: true }, layers: ["tc", "rad", "fc"], fx: { fire: 0, tint: 0 } },
      { id: "meaning", view: { at: [42.72, -117.0], km: 175, tilt: 28, heading: 10 }, layer: "rad", t: O(10, 24, 12), overlays: { places: true, perimeter: true }, fx: { fire: 0, tint: 0 } },
    ],
  },
  jazan: {
    id: "jazan",
    speed: "A season",
    name: "Jazan",
    where: "Saudi Arabia",
    when: "June – November 2026",
    marker: [17.2, 42.75],
    exag: 2.2,
    hub: { at: [17.2, 42.75], km: 9000, tilt: 0, heading: 0 },
    timeline: {
      start: J(6, 1), end: J(11, 14),
      segs: [[J(6, 1), 0], [J(11, 14), 1]],
      rate: () => 5.5 * DAY,
      ticks: [[J(6, 1), "Jun"], [J(7, 1), "Jul"], [J(8, 1), "Aug"], [J(9, 1), "Sep"], [J(10, 1), "Oct"], [J(11, 1), "Nov"]].map(([t, label]) => ({ t: t as number, label: label as string })),
      phases: [],
    },
    chapters: [
      // the wettest day, half hour by half hour (about 7 seconds), ending on that day so the readout matches the text
      { id: "mountains", view: { at: [17.18, 42.86], km: 120, tilt: 60, heading: 78 }, layer: "season", t: J(8, 12, 9), play: { from: J(8, 12, 9), to: J(8, 12, 23, 30), rate: 2 * HOUR }, overlays: { places: true }, fx: { rain: true }, layers: ["season", "photo"] },
      // both radar chapters open just after the dawn pass that follows the dusk pass in the text (dusk 18:39,
      // dawn 05:39 the next morning), so the pass switch shows exactly the two acquisitions the words compare
      { id: "wet", view: { at: [17.12, 42.72], km: 95, tilt: 30, heading: 40 }, layer: "wet", pass: "dusk", t: J(9, 11, 6), overlays: { places: true }, layers: ["wet", "season", "photo"] },
      { id: "duskdawn", view: { at: [17.12, 42.72], km: 105, tilt: 22, heading: 25 }, layer: "change", pass: "dusk", t: J(9, 23, 6), overlays: { places: true }, layers: ["change", "wet"] },
      { id: "wave", view: { at: [17.12, 42.82], km: 150, tilt: 50, heading: 72 }, layer: "season", t: J(8, 1), play: { from: J(8, 1), to: J(11, 4, 12) }, overlays: { places: true }, fx: { rain: true }, layers: ["season", "photo"] },
      { id: "foretold", view: { at: [17.12, 42.75], km: 120, tilt: 15, heading: 0 }, layer: "freq", pass: "dawn", t: J(11, 1, 12), overlays: { places: true }, layers: ["freq", "season"] },
      { id: "meaning", view: { at: [17.06, 42.93], km: 32, tilt: 50, heading: 40 }, layer: "photo", t: J(11, 4, 12), overlays: { places: true, dams: true }, layers: ["photo", "season"] },
    ],
  },
};

export const ORDER: SiteId[] = ["nepal", "oregon", "jazan"];

/** Season-wide context for the finale: one axis, June to November 2026, UTC. */
export const SEASON = { start: Date.UTC(2026, 5, 1), end: Date.UTC(2026, 10, 14) };
