// Independent checks on the built site data.
//   node scripts/stories/verify.mjs
// 1. Alignment: our terrain, sampled along the research's flood route, must match the elevation profile the
//    research measured along it (both Copernicus DEM, so any offset would mean the layers are misplaced).
// 2. Denominator: the Jazan coastal plain (land 0.5–250 m inside the radar box) must come out near the
//    research's 4,260 km².
// 3. Every image and terrain file a site.json refers to must exist.
import fs from "node:fs";
import path from "node:path";
import proj4 from "proj4";

const OUT = path.resolve("public/data/sites");
const site = (id) => JSON.parse(fs.readFileSync(path.join(OUT, id, "site.json"), "utf8"));
const grid = (id, t) => ({ ...t, data: new Int16Array(fs.readFileSync(path.join(OUT, id, t.file)).buffer.slice(0)) });
const utm = (s) => `+proj=utm +zone=${s.utm.zone} +datum=WGS84 +units=m +no_defs`;
function sample(g, E, N) {
  const fx = (E - g.x0) / g.step - 0.5, fy = (g.y0 - N) / g.step - 0.5;
  const x = Math.max(0, Math.min(g.w - 2, Math.floor(fx))), y = Math.max(0, Math.min(g.h - 2, Math.floor(fy)));
  const ax = fx - x, ay = fy - y, v = (i, j) => g.data[j * g.w + i];
  return (v(x, y) * (1 - ax) + v(x + 1, y) * ax) * (1 - ay) + (v(x, y + 1) * (1 - ax) + v(x + 1, y + 1) * ax) * ay;
}
let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failed++; };

// 1. Nepal flood route
{
  const s = site("nepal"), g = grid("nepal", s.terrain.detail), fwd = proj4("EPSG:4326", utm(s));
  const diffs = s.flowline.map(([lat, lon], i) => { const [E, N] = fwd.forward([lon, lat]); return sample(g, E, N) - s.elev[i]; });
  const abs = diffs.map(Math.abs).sort((a, b) => a - b);
  const med = abs[Math.floor(abs.length / 2)], p90 = abs[Math.floor(abs.length * 0.9)];
  const bias = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  check(med < 60 && Math.abs(bias) < 40, `Nepal: terrain vs research route profile, median |Δ| ${med.toFixed(0)} m, 90th pct ${p90.toFixed(0)} m, mean bias ${bias.toFixed(0)} m (route drops ${s.elev[0]}→${s.elev.at(-1)} m)`);
}
// 2. Jazan coastal plain
{
  const s = site("jazan"), g = grid("jazan", s.terrain.detail);
  const d = s.detail, cell = g.step * g.step / 1e6;
  let km2 = 0;
  for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
    const E = g.x0 + (i + 0.5) * g.step, N = g.y0 - (j + 0.5) * g.step;
    if (E > d.x0 + d.W * d.res || N < d.y0 - d.H * d.res) continue;
    const z = g.data[j * g.w + i];
    if (z >= 0.5 && z <= 250) km2 += cell;
  }
  check(Math.abs(km2 - s.std.plainKm2) / s.std.plainKm2 < 0.08, `Jazan: coastal plain from our terrain ${km2.toFixed(0)} km² vs research ${s.std.plainKm2} km² (coarser grid, sea edge differs)`);
}
// 2b. statements written as words in the copy, recomputed from the data they rest on
{
  const s = site("jazan");
  const month = (m) => s.rain.filter((r) => r.date.slice(5, 7) === m).reduce((a, r) => a + r.mm, 0);
  const total = s.rain.reduce((a, r) => a + r.mm, 0);
  check(Math.round(total) === 169, `Jazan: season rain ${total.toFixed(1)} mm (copy says 169 mm)`);
  check(Math.round(month("08")) === 53, `Jazan: August rain ${month("08").toFixed(1)} mm (copy says 53 mm)`);
  const wettest = [...s.rain].sort((a, b) => b.mm - a.mm)[0];
  check(wettest.date === "2026-08-12" && wettest.mm.toFixed(1) === "18.6" && Math.round(wettest.max) === 36, `Jazan: wettest day ${wettest.date}, ${wettest.mm} mm mean, ${wettest.max} mm cell (copy: 12 Aug, 18.6, 36)`);
  // the research's rainy season for passes: 24/25 July to 28/29 October (RAIN_FINDINGS.md)
  const rainy = (k) => k >= "2026-07-24" && k <= "2026-10-29";
  const dusk = Object.entries(s.prepass).filter(([k]) => k.startsWith("064") && rainy(k.slice(4)));
  const dawn = Object.entries(s.prepass).filter(([k]) => k.startsWith("071") && rainy(k.slice(4)));
  const wetDusk = dusk.filter(([, v]) => v.wet_share > 0.05).length, wetDawn = dawn.filter(([, v]) => v.wet_share > 0.05).length;
  check(wetDusk === 5 && dusk.length === 8 && wetDawn === 0, `Jazan: rain on >5% of the area before ${wetDusk} of ${dusk.length} rainy-season dusk passes, ${wetDawn} of ${dawn.length} dawn passes (copy: 5 of 8, none)`);
  const n = site("nepal");
  check(n.std.pairs["20260819_20260831"].corridor > 3 * n.std.pairs["20260819_20260831"].control
    && Object.entries(n.std.pairs).filter(([k]) => k < "20260819").every(([, v]) => v.corridor < 1.5 * v.control + 2),
    "Nepal: only the pair spanning the flood separates corridor from slopes (copy: 'In every pair before the flood ... similar amounts')");
  const o = site("oregon"), hv = o.std.hv["20261020"];
  check(hv.hot.pct_of_pre === 51 && hv.control.pct_of_pre === 81, `Oregon: HV on 20 Oct ${hv.hot.pct_of_pre}% (hottest) vs ${hv.control.pct_of_pre}% (outside)`);
  // the burn series is one photo per date: every reading below an earlier one must be a partly hidden date
  // (the chart note says the dips are single-photo limits, not regrowth, and the text quotes full views only)
  {
    let best = 0; const dips = [];
    for (const s of o.std.series) { if (s.share_of_final < best - 1) dips.push(s); best = Math.max(best, s.share_of_final); }
    const quoted = ["2026-08-10", "2026-08-23"].map((k) => o.std.series.find((s) => s.date === k));
    check(dips.length > 0 && dips.every((s) => s.valid_in_perimeter < 0.95) && quoted.every((s) => s.valid_in_perimeter >= 0.95),
      `Oregon: burn-series dips only on partly hidden photos (${dips.map((s) => `${s.date} ${s.share_of_final}%, ${Math.round(s.valid_in_perimeter * 100)}% visible`).join("; ")}); quoted dates are full views`);
  }
  const acres = Math.round(o.std.perimeterKm2 * 247.105);
  check(Math.abs(acres - 575163) / 575163 < 0.001, `Oregon: perimeter ${o.std.perimeterKm2} km² = ${acres.toLocaleString("en-GB")} acres (copy: 575,163 acres, NIFC)`);
  // typed values in the Jazan closing chapter and the xcheck ratio range in CLAIMS.md / README
  const r = s.std.xcheck.ratios;
  check(Math.min(...r).toFixed(1) === "2.2" && Math.max(...r).toFixed(1) === "2.9", `Jazan: flagged-vs-rest ratios ${Math.min(...r).toFixed(2)}–${Math.max(...r).toFixed(2)} (docs: 2.2–2.9×)`);
}
// 3. files
for (const id of ["nepal", "oregon", "jazan"]) {
  const s = site(id), dir = path.join(OUT, id);
  const refs = [s.terrain.context.file, s.terrain.detail.file, "context.webp"];
  if (id === "nepal") refs.push("arrival.png", "opt_pre.webp", "opt_post.webp", "opt_aug12.webp", "opt_oct01.webp", ...s.radar.map((r) => r.img));
  if (id === "oregon") refs.push("arrival.png");
  if (id === "jazan") refs.push("season_a.png", "season_b.png", ...s.coh.map((c) => c.img), ...s.gcov.map((c) => c.img), ...s.hls.map((h) => h.img));
  const missing = refs.filter((f) => !fs.existsSync(path.join(dir, f)));
  check(!missing.length, `${id}: ${refs.length} referenced files present${missing.length ? `; missing ${missing.join(", ")}` : ""}`);
}
process.exit(failed ? 1 : 0);
