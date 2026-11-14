// Builds public/data/sites/* from the team's research outputs (data-src/research, a copy of the GitHub repo).
//   node scripts/stories/build.mjs [oregon|nepal|jazan ...] [--no-images]
//
// Nothing here measures anything new. It reprojects the research layers onto the globe, adds terrain from the
// Copernicus DEM, converts the imagery for the browser and copies the standardized numbers (research/std_*.json)
// so that every figure on screen can be traced to the file it came from.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { SITE_SOURCES, solve, pxToLonLat } from "./georef.mjs";
import { sampleDEM } from "./dem.mjs";

const RESEARCH = path.resolve("data-src/research/research");
const OUT = path.resolve("public/data/sites");
const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith("--"));
const noImages = args.includes("--no-images");
const log = (...a) => console.log(...a);
const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const r1 = (v) => Math.round(v * 10) / 10;
const ll = (g, p) => { const [lon, lat] = pxToLonLat(g, p[0], p[1]); return [+lat.toFixed(5), +lon.toFixed(5)]; };

async function image(src, dst, { quality = 80, lossless = false } = {}) {
  if (noImages && fs.existsSync(dst)) return;
  const ext = path.extname(dst);
  if (ext === ".png") { fs.copyFileSync(src, dst); return; } // data textures stay bit-exact
  await sharp(src).webp({ quality, lossless, effort: 5 }).toFile(dst);
}

async function terrain(g, d, dir) {
  const res = g.res;
  const ctxWm = d.context.W * res, ctxHm = d.context.H * res;
  const detX0 = g.cx0 + d.detail.x * res, detY0 = g.cy0 - d.detail.y * res;
  const detWm = d.detail.w * res, detHm = d.detail.h * res;
  const make = async (name, x0, y0, wM, hM, n) => {
    const step = Math.max(wM, hM) / n;
    const grid = { def: g.def, x0, y0, step, w: Math.ceil(wM / step), h: Math.ceil(hM / step) };
    log(`  terrain ${name}: ${grid.w}x${grid.h} at ${step.toFixed(0)} m`);
    const dem = await sampleDEM(grid, log);
    fs.writeFileSync(path.join(dir, `terrain-${name}.bin`), Buffer.from(dem.data.buffer));
    return { file: `terrain-${name}.bin`, x0, y0, step: +step.toFixed(3), w: grid.w, h: grid.h, min: dem.min, max: dem.max };
  };
  return {
    context: await make("context", g.cx0, g.cy0, ctxWm, ctxHm, 420),
    detail: await make("detail", detX0, detY0, detWm, detHm, 640),
  };
}

function frame(g, d) {
  const res = g.res;
  return {
    utm: { zone: g.zone, south: g.south },
    context: { x0: +g.cx0.toFixed(2), y0: +g.cy0.toFixed(2), res, W: d.context.W, H: d.context.H },
    detail: { x0: +(g.cx0 + d.detail.x * res).toFixed(2), y0: +(g.cy0 - d.detail.y * res).toFixed(2), res: (d.detail.w * res) / d.detail.W, W: d.detail.W, H: d.detail.H },
    georef: { maxPinResidualM: g.maxResidualM, method: "origin solved from points with known lat/lon (scripts/stories/georef.mjs)" },
  };
}

// ---------------------------------------------------------------- Big Grass Fire
async function oregon() {
  const src = path.join(RESEARCH, SITE_SOURCES.oregon.dir), dir = path.join(OUT, "oregon");
  fs.mkdirSync(dir, { recursive: true });
  const d = readJSON(path.join(src, "data.json"));
  const g = solve("oregon", d);
  const opt = readJSON(path.join(RESEARCH, "std_oregon_optical.json"));
  const rad = readJSON(path.join(RESEARCH, "std_oregon_radar.json"));
  const images = [
    ["context.jpg", "context.webp"], ["arrival.png", "arrival.png"],
    ...["pre", "post", "sep17", "oct07", "oct24"].flatMap((k) => [[`opt_tc_${k}.jpg`, `tc_${k}.webp`], [`opt_fc_${k}.jpg`, `fc_${k}.webp`]]),
    ...["2026-07-16", "2026-08-21", "2026-09-26", "2026-10-20"].map((k) => [`radar_${k}.jpg`, `radar_${k}.webp`]),
  ];
  for (const [a, b] of images) { await image(path.join(src, a), path.join(dir, b)); log(`  ${b}`); }
  const site = {
    id: "oregon",
    ...frame(g, d),
    terrain: await terrain(g, d, dir),
    places: d.places.map((p) => ({ name: p.name, kind: p.kind ?? "town", at: ll(g, p.p) })),
    regions: d.regions.map((r) => ({ name: r.name, at: ll(g, r.p) })),
    lines: d.lines.map((l) => ({ name: l.name, pts: l.pts.map((p) => ll(g, p)) })),
    perimeter: d.perimeter.map((ring) => ring.map((p) => ll(g, p))),
    areaHourly: d.area_hourly.map(r1),
    // standardized numbers: research/std_oregon_optical.json, std_oregon_radar.json (rules in DATA_STANDARD.md)
    std: {
      perimeterKm2: d.perimeter_km2,
      burned: { km2: opt["burned_t0.1"].km2, lo: opt["burned_t0.125"].km2, hi: opt["burned_t0.075"].km2,
        share: opt["burned_t0.1"].share_of_perimeter, shareLo: opt["burned_t0.125"].share_of_perimeter, shareHi: opt["burned_t0.075"].share_of_perimeter },
      controlFlaggedPct: opt.control_flagged_pct,
      severity: opt.severity_share_of_burned,
      series: opt.series.filter((s) => s.date <= "2026-08-30"),
      jul29Bounds: rad.jul29_bounds_pct_of_final,
      coh: rad.coh,
      // HV (shrub structure) per pass after the fire, against the median of the pre-fire passes
      hv: rad.HVHV,
      preDates: rad.gcov_pre_dates,
    },
  };
  fs.writeFileSync(path.join(dir, "site.json"), JSON.stringify(site));
  return site;
}

// ---------------------------------------------------------------- Bhote Koshi flood
async function nepal() {
  const src = path.join(RESEARCH, SITE_SOURCES.nepal.dir), dir = path.join(OUT, "nepal");
  fs.mkdirSync(dir, { recursive: true });
  const d = readJSON(path.join(src, "data.json"));
  const g = solve("nepal", d);
  const std = readJSON(path.join(RESEARCH, "std_nepal.json"));
  const images = [
    ["context.jpg", "context.webp"], ["arrival.png", "arrival.png"],
    ["opt_pre.jpg", "opt_pre.webp"], ["opt_post.jpg", "opt_post.webp"], ["opt_aug12.jpg", "opt_aug12.webp"], ["opt_oct01.jpg", "opt_oct01.webp"],
    ...d.radar.map((r) => [r.img, r.img.replace(".jpg", ".webp")]),
  ];
  for (const [a, b] of images) { await image(path.join(src, a), path.join(dir, b)); log(`  ${b}`); }
  const site = {
    id: "nepal",
    ...frame(g, d),
    terrain: await terrain(g, d, dir),
    places: d.places.map((p) => ({ name: p.name, kind: p.kind ?? "town", at: ll(g, p.p) })),
    regions: d.regions.map((r) => ({ name: r.name, at: ll(g, r.p) })),
    flowline: d.flowline.map((p) => ll(g, p)),
    flowMinutes: d.flow_minutes.map(r1),
    elev: d.elev.map(Math.round),
    areaMinutes: d.area_minutes.map((v) => Math.round(v * 100) / 100),
    pathKm: d.path_km, kmR: d.km_R, kmS: d.km_S, srcElev: d.src_elev,
    radar: d.radar.map((r) => ({ img: r.img.replace(".jpg", ".webp"), label: r.label, d1: r.img.slice(6, 14), d2: r.img.slice(15, 23) })),
    std: {
      corridorKm2: std.corridor_km2, pathKm: std.path_km,
      stripped: { km2: std.stripped_std.km2, lo: std.stripped_high.km2, hi: std.stripped_low.km2, share: std.stripped_std.share_of_corridor, controlPct: std.stripped_std.any_change_control_pct },
      pairs: Object.fromEntries(Object.entries(std.pairs).map(([k, v]) => [k, {
        corridor: v["t0.2"].corridor, control: v["t0.2"].control,
        corridorLo: v["t0.25"].corridor, corridorHi: v["t0.15"].corridor, controlLo: v["t0.25"].control, controlHi: v["t0.15"].control,
      }])),
      baselinePairs: std.baseline_pairs,
      xcheck: { stripped: std["xcheck_t0.2"].radar_changed_on_stripped, rest: std["xcheck_t0.2"].radar_changed_rest_of_corridor,
        strippedLo: std["xcheck_t0.25"].radar_changed_on_stripped, strippedHi: std["xcheck_t0.15"].radar_changed_on_stripped },
    },
  };
  fs.writeFileSync(path.join(dir, "site.json"), JSON.stringify(site));
  return site;
}

// ---------------------------------------------------------------- Jazan rainy season
async function jazan() {
  const src = path.join(RESEARCH, SITE_SOURCES.jazan.dir), dir = path.join(OUT, "jazan");
  fs.mkdirSync(path.join(dir, "hls"), { recursive: true });
  fs.mkdirSync(path.join(dir, "radar"), { recursive: true });
  const d = readJSON(path.join(src, "data.json"));
  const g = solve("jazan", d);
  const std = readJSON(path.join(RESEARCH, "std_jazan.json"));
  const green = readJSON(path.join(RESEARCH, "std_jazan_green.json"));
  const xcheck = readJSON(path.join(RESEARCH, "std_jazan_xcheck.json"));
  await image(path.join(src, "context.jpg"), path.join(dir, "context.webp"));
  for (const f of ["season_a.png", "season_b.png"]) await image(path.join(src, f), path.join(dir, f));
  // single-band radar frames: grey JPEGs exactly as the research wrote them (re-encoding would only lose detail)
  for (const f of [...d.meta.coh.map((c) => c.img), ...d.meta.gcov.map((c) => c.img), "freq_dusk.jpg", "freq_dawn.jpg", "radar_base.jpg"])
    if (!noImages || !fs.existsSync(path.join(dir, "radar", f))) fs.copyFileSync(path.join(src, f), path.join(dir, "radar", f));
  for (const h of d.meta.hls) await image(path.join(src, h.img), path.join(dir, "hls", h.img.replace(".jpg", ".webp")), { quality: 78 });
  log(`  ${d.meta.hls.length} photos, ${d.meta.coh.length + d.meta.gcov.length} radar frames`);
  const site = {
    id: "jazan",
    ...frame(g, d),
    terrain: await terrain(g, d, dir),
    places: d.places.map((p) => ({ name: p.name, kind: p.kind ?? "town", at: ll(g, p.p) })),
    regions: d.regions.map((r) => ({ name: r.name, at: ll(g, r.p) })),
    coh: d.meta.coh.map((c) => ({ ...c, img: `radar/${c.img}` })),
    gcov: d.meta.gcov.map((c) => ({ ...c, img: `radar/${c.img}` })),
    hls: d.meta.hls.map((h) => ({ ...h, img: `hls/${h.img.replace(".jpg", ".webp")}` })),
    // IMERG V07 Late, 0.1° cells: rows run north to south from 18.6 N, columns west to east from 41.9 E
    rainGrid: { latMax: 18.6, lonMin: 41.9, cell: 0.1, rows: d.rain[0].grid.length, cols: d.rain[0].grid[0].length },
    rain: d.rain.map((r) => ({ date: r.date, mm: r.mm, max: r.max, grid: r.grid })),
    hh: d.hh,
    prepass: d.prepass,
    pins: Object.fromEntries(Object.entries(d.pins).map(([k, p]) => [k, { at: [p.lat, p.lon], mm: p.mm }])),
    season: d.season,
    std: {
      plainKm2: d.season.plain_km2,
      cohPairs: std.coh_pairs,
      avg: { dusk: std["coh_avg_064_t0.2"], duskLo: std["coh_avg_064_t0.25"], duskHi: std["coh_avg_064_t0.15"],
        dawn: std["coh_avg_071_t0.2"], dawnLo: std["coh_avg_071_t0.25"], dawnHi: std["coh_avg_071_t0.15"] },
      brightness: std.brightness,
      green: { km2: green["0.15"].present_km2, lo: green["0.2"].present_km2, hi: green["0.1"].present_km2,
        pct: green["0.15"].pct_plain, pctLo: green["0.2"].pct_plain, pctHi: green["0.1"].pct_plain, bands: green },
      // central value at the standard thresholds; the range spans all nine threshold combinations (as in CLAIMS.md)
      xcheck: (() => {
        const all = Object.values(xcheck).filter((v) => typeof v === "object");
        const f = all.map((v) => v.green_if_flagged), n = all.map((v) => v.green_if_not);
        return { flagged: xcheck["c0.2_n0.15"].green_if_flagged, not: xcheck["c0.2_n0.15"].green_if_not,
          flaggedLo: Math.min(...f), flaggedHi: Math.max(...f), notLo: Math.min(...n), notHi: Math.max(...n),
          ratios: all.map((v) => v.green_if_flagged / v.green_if_not) };
      })(),
    },
  };
  fs.writeFileSync(path.join(dir, "site.json"), JSON.stringify(site));
  return site;
}

const BUILD = { nepal, oregon, jazan };
fs.mkdirSync(OUT, { recursive: true });
for (const id of Object.keys(BUILD)) {
  if (only.length && !only.includes(id)) continue;
  log(`\n${id}`);
  const s = await BUILD[id]();
  log(`  ok: terrain ${s.terrain.detail.min}–${s.terrain.detail.max} m`);
}
fs.writeFileSync(path.resolve("public/data/manifest.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: "data-src/research (team research repo: research/*/web, research/std_*.json); terrain: Copernicus DEM GLO-30",
  rules: "research/DATA_STANDARD.md · every number: research/CLAIMS.md",
}, null, 1));
log("\ndone");
