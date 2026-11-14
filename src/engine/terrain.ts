import { BufferAttribute, BufferGeometry, Vector3 } from "three";
import type { Grid, TerrainGrid } from "../data";
import { toVec } from "./geo";
import { latLonToUtm, utmToLatLon } from "./utm";

export interface Heights extends TerrainGrid { data: Int16Array }

/** Bilinear DEM height (metres) at a UTM position, or null outside the grid. */
export function heightAt(g: Heights, E: number, N: number): number | null {
  const fx = (E - g.x0) / g.step - 0.5, fy = (g.y0 - N) / g.step - 0.5;
  if (fx < -0.5 || fy < -0.5 || fx > g.w - 0.5 || fy > g.h - 0.5) return null;
  const x = Math.max(0, Math.min(g.w - 2, Math.floor(fx))), y = Math.max(0, Math.min(g.h - 2, Math.floor(fy)));
  const ax = Math.min(1, Math.max(0, fx - x)), ay = Math.min(1, Math.max(0, fy - y));
  const v = (i: number, j: number) => g.data[j * g.w + i];
  return (v(x, y) * (1 - ax) + v(x + 1, y) * ax) * (1 - ay) + (v(x, y + 1) * (1 - ax) + v(x + 1, y + 1) * ax) * ay;
}

/** Terrain for a site: detail DEM where it exists, the coarser regional DEM elsewhere. */
export class Ground {
  constructor(readonly zone: number, readonly south: boolean, readonly coarse: Heights, readonly fine: Heights) {}
  at(lat: number, lon: number) {
    const [E, N] = latLonToUtm(lat, lon, this.zone, this.south);
    return Math.max(0, heightAt(this.fine, E, N) ?? heightAt(this.coarse, E, N) ?? 0);
  }
}

/**
 * A mesh covering an image grid (north-up UTM), draped on the sphere and carrying DEM heights in aH.
 * uv runs west→east and north→south, matching the image rows, so textures are used without flipping.
 * A skirt hangs from the edges so seams between this mesh and its neighbour never show sky.
 */
export function terrainGeometry(img: Grid, utm: { zone: number; south: boolean }, h: Heights, segX: number, segY: number, origin: Vector3, skirtM = 0) {
  const nx = segX + 1, ny = segY + 1;
  const ring = skirtM > 0 ? 2 * (segX + segY) : 0;
  const pos = new Float32Array((nx * ny + ring) * 3), uv = new Float32Array((nx * ny + ring) * 2), hh = new Float32Array(nx * ny + ring);
  const grad = new Float32Array((nx * ny + ring) * 2);
  const v = new Vector3();
  const Wm = img.W * img.res, Hm = img.H * img.res;
  const put = (k: number, s: number, t: number, dz: number) => {
    const E = img.x0 + s * Wm, N = img.y0 - t * Hm;
    const [lat, lon] = utmToLatLon(E, N, utm.zone, utm.south);
    toVec(lat, lon, 1, v).sub(origin);
    pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
    uv[k * 2] = s; uv[k * 2 + 1] = t;
    hh[k] = Math.max(0, heightAt(h, E, N) ?? 0) - dz;
  };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) put(j * nx + i, i / segX, j / segY, 0);
  // slope of the ground (metres per metre, east and north), for smooth shading at any exaggeration
  const dx = Wm / segX, dy = Hm / segY;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = hh[j * nx + Math.max(0, i - 1)], b = hh[j * nx + Math.min(segX, i + 1)];
    const c = hh[Math.max(0, j - 1) * nx + i], d = hh[Math.min(segY, j + 1) * nx + i];
    const k = j * nx + i;
    grad[k * 2] = (b - a) / (dx * (Math.min(segX, i + 1) - Math.max(0, i - 1)));
    grad[k * 2 + 1] = (c - d) / (dy * (Math.min(segY, j + 1) - Math.max(0, j - 1))); // rows run south, so north is up the grid
  }
  const idx: number[] = [];
  for (let j = 0; j < segY; j++) for (let i = 0; i < segX; i++) {
    const a = j * nx + i, c = a + nx;
    idx.push(a, c, a + 1, a + 1, c, c + 1);
  }
  if (ring) {
    // walk the border once, clockwise from the north-west corner
    const border: number[] = [];
    for (let i = 0; i < segX; i++) border.push(i);
    for (let j = 0; j < segY; j++) border.push(j * nx + segX);
    for (let i = segX; i > 0; i--) border.push(segY * nx + i);
    for (let j = segY; j > 0; j--) border.push(j * nx);
    border.forEach((b, n) => {
      const k = nx * ny + n;
      put(k, uv[b * 2], uv[b * 2 + 1], skirtM);
      hh[k] = hh[b] - skirtM;
    });
    for (let n = 0; n < border.length; n++) {
      const a = border[n], b = border[(n + 1) % border.length], a2 = nx * ny + n, b2 = nx * ny + ((n + 1) % border.length);
      idx.push(a, a2, b, b, a2, b2, a, b, a2, b, b2, a2); // both windings: the skirt is seen from either side
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("uv", new BufferAttribute(uv, 2));
  g.setAttribute("aH", new BufferAttribute(hh, 1));
  g.setAttribute("aGrad", new BufferAttribute(grad, 2));
  g.setIndex(idx);
  return g;
}
