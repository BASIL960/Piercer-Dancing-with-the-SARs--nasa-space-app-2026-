// Recovers where each research map sits on Earth.
//
// The research pipeline (data-src/research/research/scripts/*_prep.py) drew every layer on a north-up UTM grid
// and stored positions as "context pixels": p = [(E - cx0) / res, (cy0 - N) / res]. It did not save the grid
// origin (cx0, cy0), but it did save points whose latitude and longitude are known exactly (the ignition point,
// the flood source, every IMERG rain-cell pin). One such point fixes the origin; the others check it.
import proj4 from "proj4";

export const SITE_SOURCES = {
  // Big Grass Fire. oregon_anim_prep.py: CRS = EPSG:32611; ignition from NIFC/EONET at (42.6498 N, -117.30335 E).
  oregon: { dir: "oregon/anim/web", zone: 11, south: false },
  // Bhote Koshi flood. nepal_prep.py: grid30.pkl, UTM 45N (85 E). Source point stored in data.json as src_latlon.
  nepal: { dir: "nepal/web", zone: 45, south: false },
  // Jazan rainy season. jazan_rain_prep.py: EPSG:32638. Every IMERG pin has lat/lon and its context pixel.
  jazan: { dir: "saudi/rain_web", zone: 38, south: false },
};

export const utmDef = (zone, south = false) => `+proj=utm +zone=${zone}${south ? " +south" : ""} +datum=WGS84 +units=m +no_defs`;

/** Known points for each site: [lon, lat, px, py] (px, py in context pixels). */
export function anchors(id, d) {
  if (id === "oregon") {
    const ig = d.places.find((p) => p.kind === "origin");
    return { fit: [[-117.30335, 42.6498, ...ig.p]], check: [] };
  }
  if (id === "nepal") {
    const src = d.places.find((p) => p.kind === "origin");
    return { fit: [[d.src_latlon[1], d.src_latlon[0], ...src.p]], check: [] };
  }
  if (id === "jazan") {
    const pins = Object.values(d.pins);
    const uniq = new Map(pins.map((p) => [`${p.lon},${p.lat}`, [p.lon, p.lat, ...p.p]]));
    const all = [...uniq.values()];
    return { fit: all, check: all };
  }
  throw new Error(id);
}

/** Solves the context-grid origin in UTM metres and returns residuals for the check points. */
export function solve(id, d) {
  const src = SITE_SOURCES[id];
  const def = utmDef(src.zone, src.south);
  const fwd = proj4("EPSG:4326", def);
  const res = d.context.res;
  const { fit, check } = anchors(id, d);
  let sx = 0, sy = 0;
  for (const [lon, lat, px, py] of fit) {
    const [E, N] = fwd.forward([lon, lat]);
    sx += E - px * res; sy += N + py * res;
  }
  const cx0 = sx / fit.length, cy0 = sy / fit.length;
  const resid = check.map(([lon, lat, px, py]) => {
    const [E, N] = fwd.forward([lon, lat]);
    return Math.hypot(E - (cx0 + px * res), N - (cy0 - py * res));
  });
  return { def, zone: src.zone, south: src.south, cx0, cy0, res, maxResidualM: resid.length ? Math.max(...resid) : null };
}

/** Lat/lon of a context-pixel position. */
export function pxToLonLat(g, px, py) {
  return proj4(g.def, "EPSG:4326").forward([g.cx0 + px * g.res, g.cy0 - py * g.res]);
}
