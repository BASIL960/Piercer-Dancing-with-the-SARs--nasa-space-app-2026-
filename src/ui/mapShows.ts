// "Map shows": the acquisition behind the layer on screen at story time t, in words, so the map, the legend, the
// date on the timeline and the text can be checked against each other. It mirrors the frame choice in
// engine/sites.ts (the latest acquisition at or before t; nothing from later dates).
import { fmtCompact, fmtIso, HOUR, type JazanData, type NepalData, type SiteId, type Sites } from "../data";
import { OREGON_AFTER } from "../engine/sites";
import { NEPAL_T0, NISAR_PASS_NEPAL } from "../story";

export interface Shows {
  /** what is drawn, e.g. "Dusk pass, 10 Sep 2026, 18:39" */
  text: string;
  /** set when the chosen layer has nothing recorded yet at this date */
  none?: boolean;
  /** the layer is a summary that does not follow the timeline */
  fixed?: boolean;
}

const PASS_CLOCK = { dusk: [18, 39], dawn: [5, 39] } as const;
/** a Jazan pass time (Saudi time, UTC+3) as a timestamp */
const jazanPass = (iso: string, p: "dusk" | "dawn") => Date.parse(`${iso}T00:00:00Z`) - 3 * HOUR + (PASS_CLOCK[p][0] * 60 + PASS_CLOCK[p][1]) * 60000;
const Pass = (p: "dusk" | "dawn") => (p === "dusk" ? "Dusk pass (18:39)" : "Dawn pass (05:39)");
const latest = <T,>(xs: T[], when: (x: T) => number, t: number) => xs.filter((x) => when(x) <= t).pop();

export function mapShows(id: SiteId, layer: string, t: number, pass: "dusk" | "dawn", sites: Sites): Shows | null {
  if (id === "nepal") {
    const d = sites.nepal as NepalData;
    if (layer === "radar") {
      const r = latest(d.radar, (x) => NISAR_PASS_NEPAL(x.d2), t);
      if (!r) return { text: `No radar pair yet. The first ends on ${fmtCompact(d.radar[0].d2)}.`, none: true };
      const ms = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
      const days = Math.round((ms(r.d2) - ms(r.d1)) / 86400000);
      return { text: `Radar pair ${fmtCompact(r.d1)} → ${fmtCompact(r.d2)}: how much the echo changed in those ${days} days` };
    }
    if (layer === "before") return { text: "Cloud-free blend of May–August photos, before the flood.", fixed: true };
    if (layer === "scar") return { text: "October photos compared with the May–August blend: the end result.", fixed: true };
    const oct1 = Date.UTC(2026, 9, 1, 5), oct23 = Date.UTC(2026, 9, 23, 5);
    if (t < NEPAL_T0) return { text: "Cloud-free blend of May–August photos" };
    if (t < oct1) return { text: "No clear photo since 12 Aug. The pre-flood blend sits under a veil; the flood water is an estimate." };
    return { text: t < oct23 ? "Photo of 1 Oct, the first clear one since the flood" : "Blend of clear October photos" };
  }
  if (id === "oregon") {
    const set = (["tc", "fc", "rad"].includes(layer) ? layer : "tc") as keyof typeof OREGON_AFTER;
    const S = OREGON_AFTER[set];
    const after = latest(S.after, (a) => a[1], t);
    const date = (ms: number) => fmtIso(new Date(ms).toISOString().slice(0, 10));
    if (set === "rad") {
      if (!after) return { text: `Radar pass of 16 Jul, before the fire. NISAR's next pass over the fire was ${date(S.after[0][1])}, so no burn shows yet.`, none: true };
      return { text: `Radar pass of ${date(after[1])} over the burned ground; 16 Jul elsewhere` };
    }
    const kind = set === "fc" ? "false-colour" : "true-colour";
    if (!after) return { text: `Pre-fire ${kind} blend. Burned ground comes from the ${date(S.after[0][1])} photo, revealed along the estimated spread.` };
    return { text: `Burned ground from the ${kind} photo of ${date(after[1])}; pre-fire blend elsewhere` };
  }
  const d = sites.jazan as JazanData;
  if (layer === "change") {
    const c = latest(d.coh.filter((x) => x.when === pass), (x) => jazanPass(x.d2, pass), t);
    const first = d.coh.find((x) => x.when === pass);
    if (!c) return { text: `No ${pass} radar pair yet. The first ends on ${fmtIso(first!.d2)}.`, none: true };
    return { text: `${Pass(pass)}: ${fmtIso(c.d1)} → ${fmtIso(c.d2)}, ${c.days} days apart` };
  }
  if (layer === "wet" || layer === "season") {
    const g = latest(d.gcov.filter((x) => x.when === pass), (x) => jazanPass(x.date, pass), t);
    const wet = g ? `${Pass(pass).toLowerCase()} of ${fmtIso(g.date)}` : `no ${pass} pass yet`;
    if (layer === "wet") return g ? { text: `${Pass(pass)}, ${fmtIso(g.date)}, against the dry-season median` } : { text: `No ${pass} pass yet at this date.`, none: true };
    return { text: `Wet ground: ${wet}. Green and water: clear photos up to this date. Rain: IMERG, every half hour on storm days, daily otherwise.` };
  }
  if (layer === "photo") {
    const h = latest(d.hls, (x) => Date.parse(`${x.date}T00:00:00Z`) - 3 * HOUR + 10.5 * HOUR, t) ?? d.hls[0];
    return { text: `Clear photo of ${fmtIso(h.date)} (NASA HLS)` };
  }
  if (layer === "freq") {
    // the windows counted (research/scripts/jazan_rain_prep.py): this track's pairs starting on or after 24 July
    const w = d.coh.filter((x) => x.when === pass && x.d1 >= "2026-07-24");
    return { text: `${Pass(pass)}: ${w.length} rainy-season windows, ${fmtIso(w[0].d1)} – ${fmtIso(w[w.length - 1].d2)}, counted together.`, fixed: true };
  }
  return null;
}
