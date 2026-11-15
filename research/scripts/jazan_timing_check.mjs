// INDICATIVE timing check for the Jazan "radar change vs later green" association. Not a finding.
//   node research/scripts/jazan_timing_check.mjs
//
// Question: does the dawn radar flag ground change BEFORE each pixel's green-up date, or only around/after it?
// std_jazan_xcheck.py measures a spatial association only (flagged in >= 3 of 6 rainy windows vs green by
// November). It contains no ordering in time, so it cannot support "the radar marked the ground first".
//
// Inputs are the published web frames, because the raw GUNW rasters are not in this repository:
//   radar/coh_071_*.jpg  smoothed coherence drop vs the dry baseline, value/255 * 0.5 (JPEG, lossy, 80 m)
//   season_a.png         R = green-up day after 1 June (first clear HLS photo, rule G+), lossless
//   season_b.png         B flags: 85 already green in June, 170 June water, 255 both
//   terrain-detail.bin   Copernicus DEM on a 183 m grid, for the coastal-plain mask (0.5-250 m)
// DATA_STANDARD forbids quoting numbers read from display images, so the output is labelled indicative. It is
// used only to decide what the app may claim; none of its numbers appear in the app.
//
// Test: for plain pixels whose green-up date falls inside the radar record, compare how often the dawn radar
// flagged them in windows that ENDED before green-up with windows that BEGAN after it. Each is divided by the
// flag rate of never-green plain in the same window, so the season's overall wetness cancels out (lift = 1
// means no more change than never-green ground at that time).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = path.resolve("public/data/sites/jazan");
const site = JSON.parse(fs.readFileSync(path.join(DIR, "site.json"), "utf8"));
const d = site.detail, W = d.W, H = d.H;
const img = async (f) => sharp(path.join(DIR, f)).raw().toBuffer({ resolveWithObject: true });
const A = await img("season_a.png"), B = await img("season_b.png");
const px = (im, k, c = 0) => im.data[k * im.info.channels + c];
const t = site.terrain.detail, dem = new Int16Array(fs.readFileSync(path.join(DIR, t.file)).buffer.slice(0));
const plain = new Uint8Array(W * H);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const E = d.x0 + (i + 0.5) * d.res, N = d.y0 - (j + 0.5) * d.res;
  const x = Math.floor((E - t.x0) / t.step), y = Math.floor((t.y0 - N) / t.step);
  if (x < 0 || y < 0 || x >= t.w || y >= t.h) continue;
  const z = dem[y * t.w + x];
  plain[j * W + i] = z >= 0.5 && z <= 250 ? 1 : 0;
}
const day = (iso) => (Date.parse(iso) - Date.parse("2026-06-01")) / 864e5;
// the six rainy-season dawn windows of std_jazan_xcheck.py (track 71, first pass on or after 24 Jul)
const wins = site.coh.filter((c) => c.when === "dawn" && c.d1 >= "2026-07-24");
const frames = [];
for (const w of wins) frames.push({ d1: day(w.d1), d2: day(w.d2), im: await img(w.img) });
const firstEnd = Math.min(...frames.map((f) => f.d2)), lastEnd = Math.max(...frames.map((f) => f.d2));
const results = {};
for (const thr of [0.15, 0.2, 0.25]) {
  const cut = (thr / 0.5) * 255;
  const base = frames.map(() => [0, 0]);
  const green = [];
  for (let k = 0; k < W * H; k++) {
    if (!plain[k]) continue;
    const flags = px(B, k, 2);
    if (flags === 85 || flags === 170 || flags === 255) continue;   // already green, or water, in June
    const up = px(A, k, 0);
    const f = frames.map((fr) => px(fr.im, k) > cut);
    if (up === 255) { f.forEach((v, n) => { base[n][0] += v ? 1 : 0; base[n][1]++; }); continue; }
    green.push({ up, f });
  }
  const rate = base.map(([a, n]) => a / n);
  const before = [0, 0], after = [0, 0], lead = [];
  let inside = 0, flagged3 = 0, flagged3Lead = 0;
  for (const p of green) {
    const first = p.f.indexOf(true);
    if (p.f.filter(Boolean).length >= 3) { flagged3++; if (frames[first].d2 <= p.up - 6) flagged3Lead++; }
    if (p.up <= firstEnd || p.up >= lastEnd) continue;
    inside++;
    frames.forEach((fr, n) => {
      if (fr.d2 <= p.up) { before[0] += p.f[n] ? 1 : 0; before[1] += rate[n]; }
      else if (fr.d1 >= p.up) { after[0] += p.f[n] ? 1 : 0; after[1] += rate[n]; }
    });
    if (first >= 0) lead.push(frames[first].d2 - p.up);
  }
  lead.sort((a, b) => a - b);
  results[`drop>${thr}`] = {
    neverGreenFlagRatePct: rate.map((r) => +(r * 100).toFixed(1)),
    greenPixels: green.length,
    greenUpInsideRadarRecord: inside,
    liftInWindowsBeforeGreenUp: +(before[0] / before[1]).toFixed(2),
    liftInWindowsAfterGreenUp: +(after[0] / after[1]).toFixed(2),
    medianDaysFromGreenUpToFirstFlag: lead.length ? lead[Math.floor(lead.length / 2)] : null,
    flaggedInAtLeast3Windows: flagged3,
    ofThoseFirstFlaggedAtLeast6DaysBeforeGreenUpPct: +((flagged3Lead / flagged3) * 100).toFixed(1),
    greenUpAfterLastRadarWindowPct: +((green.filter((p) => p.up >= lastEnd).length / green.length) * 100).toFixed(1),
  };
}
const out = { label: "INDICATIVE: computed from lossy web frames, not the GUNW rasters. Not a finding; never quoted in the app.", windows: wins.map((w) => `${w.d1} > ${w.d2}`), results };
fs.writeFileSync(path.resolve("research/jazan_timing_check.json"), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify(out, null, 1));
