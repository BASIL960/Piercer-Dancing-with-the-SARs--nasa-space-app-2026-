// Elevation from the Copernicus DEM GLO-30 (ESA, public COGs on AWS Open Data, no login).
// Tiles are 1° x 1° Cloud-Optimized GeoTIFFs; only the overview level that matches the requested spacing is read,
// through HTTP range requests, so a whole region costs a few megabytes.
import fs from "node:fs";
import path from "node:path";
import proj4 from "proj4";
import { fromUrl } from "geotiff";

const BASE = "https://copernicus-dem-30m.s3.amazonaws.com";
const CACHE = path.resolve("data-src/cache/dem");

function tileName(lat, lon) {
  const ns = lat >= 0 ? "N" : "S", ew = lon >= 0 ? "E" : "W";
  const la = String(Math.abs(lat)).padStart(2, "0"), lo = String(Math.abs(lon)).padStart(3, "0");
  return `Copernicus_DSM_COG_10_${ns}${la}_00_${ew}${lo}_00_DEM`;
}

/** One tile at one overview level, cached on disk as raw Float32 so rebuilds are offline. */
async function loadTile(lat, lon, wantDeg) {
  const name = tileName(lat, lon);
  fs.mkdirSync(CACHE, { recursive: true });
  const probe = path.join(CACHE, `${name}.json`);
  if (fs.existsSync(probe)) {
    const meta = JSON.parse(fs.readFileSync(probe, "utf8"));
    if (meta.missing) return null;
    const lvl = meta.levels.find((l) => l.deg <= wantDeg * 1.01) ?? meta.levels[0];
    const bin = path.join(CACHE, `${name}.${lvl.w}.f32`);
    if (fs.existsSync(bin)) return { ...lvl, data: new Float32Array(fs.readFileSync(bin).buffer.slice(0)) };
  }
  let tiff;
  try { tiff = await fromUrl(`${BASE}/${name}/${name}.tif`); } catch (e) {
    // the collection has no tile where there is only sea
    fs.writeFileSync(probe, JSON.stringify({ missing: true }));
    return null;
  }
  const n = await tiff.getImageCount();
  const levels = [];
  for (let i = 0; i < n; i++) {
    const im = await tiff.getImage(i);
    levels.push({ i, w: im.getWidth(), h: im.getHeight(), deg: 1 / im.getHeight() });
  }
  levels.sort((a, b) => b.deg - a.deg); // coarse first
  fs.writeFileSync(probe, JSON.stringify({ levels: levels.map(({ i, w, h, deg }) => ({ i, w, h, deg })) }));
  const lvl = levels.find((l) => l.deg <= wantDeg * 1.01) ?? levels[levels.length - 1];
  const im = await tiff.getImage(lvl.i);
  const [band] = await im.readRasters({ interleave: false });
  const data = Float32Array.from(band);
  fs.writeFileSync(path.join(CACHE, `${name}.${lvl.w}.f32`), Buffer.from(data.buffer));
  return { ...lvl, data };
}

/**
 * Samples elevation (metres) on a north-up UTM grid.
 * grid = { def, x0, y0, step, w, h }: sample (i, j) sits at E = x0 + (i + 0.5) * step, N = y0 - (j + 0.5) * step.
 */
export async function sampleDEM(grid, log = () => {}) {
  const inv = proj4(grid.def, "EPSG:4326");
  const pts = new Float64Array(grid.w * grid.h * 2);
  let latMin = 90, latMax = -90, lonMin = 180, lonMax = -180;
  for (let j = 0; j < grid.h; j++) for (let i = 0; i < grid.w; i++) {
    const [lon, lat] = inv.forward([grid.x0 + (i + 0.5) * grid.step, grid.y0 - (j + 0.5) * grid.step]);
    const k = (j * grid.w + i) * 2; pts[k] = lon; pts[k + 1] = lat;
    latMin = Math.min(latMin, lat); latMax = Math.max(latMax, lat); lonMin = Math.min(lonMin, lon); lonMax = Math.max(lonMax, lon);
  }
  const wantDeg = grid.step / 111320 / 1.5; // a little finer than the output spacing
  const tiles = new Map();
  for (let la = Math.floor(latMin); la <= Math.floor(latMax); la++)
    for (let lo = Math.floor(lonMin); lo <= Math.floor(lonMax); lo++) {
      const t = await loadTile(la, lo, wantDeg);
      tiles.set(`${la},${lo}`, t);
      log(`  DEM ${tileName(la, lo)}: ${t ? `${t.w}x${t.h}` : "sea (no tile)"}`);
    }
  const out = new Int16Array(grid.w * grid.h);
  let lo = Infinity, hi = -Infinity;
  for (let k = 0; k < out.length; k++) {
    const lon = pts[k * 2], lat = pts[k * 2 + 1];
    const t = tiles.get(`${Math.floor(lat)},${Math.floor(lon)}`);
    let z = 0;
    if (t) {
      // pixel-is-area: row 0 is the tile's north edge
      const fx = (lon - Math.floor(lon)) * t.w - 0.5, fy = (Math.floor(lat) + 1 - lat) * t.h - 0.5;
      const x0 = Math.max(0, Math.min(t.w - 1, Math.floor(fx))), y0 = Math.max(0, Math.min(t.h - 1, Math.floor(fy)));
      const x1 = Math.min(t.w - 1, x0 + 1), y1 = Math.min(t.h - 1, y0 + 1), ax = Math.min(1, Math.max(0, fx - x0)), ay = Math.min(1, Math.max(0, fy - y0));
      const v = (x, y) => t.data[y * t.w + x];
      z = (v(x0, y0) * (1 - ax) + v(x1, y0) * ax) * (1 - ay) + (v(x0, y1) * (1 - ax) + v(x1, y1) * ax) * ay;
      if (!Number.isFinite(z) || z < -1000) z = 0;
    }
    out[k] = Math.round(z);
    lo = Math.min(lo, out[k]); hi = Math.max(hi, out[k]);
  }
  return { data: out, min: lo, max: hi };
}
