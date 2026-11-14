import { BufferAttribute, BufferGeometry, Vector3 } from "three";

export interface BBox { latMin: number; lonMin: number; latMax: number; lonMax: number }

export const DEG = Math.PI / 180;
export const EARTH_RADIUS_M = 6371000;

/** Unit sphere, y up. Longitude 0 faces +z, 90°E faces +x. */
export function toVec(lat: number, lon: number, r = 1, out = new Vector3()) {
  const p = lat * DEG, l = lon * DEG;
  return out.set(r * Math.cos(p) * Math.sin(l), r * Math.sin(p), r * Math.cos(p) * Math.cos(l));
}
export function toLatLon(v: Vector3) {
  const r = v.length();
  return { lat: Math.asin(v.y / r) / DEG, lon: Math.atan2(v.x, v.z) / DEG };
}
/** Local east / north / up directions at a point. east × north = up. */
export function localFrame(lat: number, lon: number) {
  const p = lat * DEG, l = lon * DEG;
  return {
    east: new Vector3(Math.cos(l), 0, -Math.sin(l)),
    north: new Vector3(-Math.sin(p) * Math.sin(l), Math.cos(p), -Math.sin(p) * Math.cos(l)),
    up: new Vector3(Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)),
  };
}

/**
 * A piece of the sphere covering a latitude/longitude box, with uv running west→east and
 * south→north. Vertices are stored relative to `origin` so close-up views keep float precision.
 */
export function patchGeometry(b: BBox, segLon: number, segLat: number, origin = new Vector3()) {
  const pos = new Float32Array((segLon + 1) * (segLat + 1) * 3);
  const uv = new Float32Array((segLon + 1) * (segLat + 1) * 2);
  const v = new Vector3();
  let k = 0, q = 0;
  for (let j = 0; j <= segLat; j++) {
    for (let i = 0; i <= segLon; i++) {
      const s = i / segLon, t = j / segLat;
      toVec(b.latMin + t * (b.latMax - b.latMin), b.lonMin + s * (b.lonMax - b.lonMin), 1, v).sub(origin);
      pos[k++] = v.x; pos[k++] = v.y; pos[k++] = v.z;
      uv[q++] = s; uv[q++] = t;
    }
  }
  const idx: number[] = [];
  const row = segLon + 1;
  for (let j = 0; j < segLat; j++) {
    for (let i = 0; i < segLon; i++) {
      const a = j * row + i, c = a + row;
      idx.push(a, a + 1, c, a + 1, c + 1, c); // counter-clockwise seen from outside
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("uv", new BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

export const bboxCentre = (b: BBox) => ({ lat: (b.latMin + b.latMax) / 2, lon: (b.lonMin + b.lonMax) / 2 });
