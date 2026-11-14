// UTM (WGS84) to latitude/longitude, after Snyder (1987), USGS Professional Paper 1395, eq. 8-12 to 8-25.
// Accurate to well under a metre within a zone, which is far finer than any layer drawn here.
const A = 6378137, F = 1 / 298.257223563, K0 = 0.9996;
const E2 = F * (2 - F), EP2 = E2 / (1 - E2);
const E1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
const DEG = 180 / Math.PI;

export function utmToLatLon(E: number, N: number, zone: number, south = false): [number, number] {
  const x = E - 500000, y = south ? N - 10000000 : N;
  const M = y / K0;
  const mu = M / (A * (1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 * E2 * E2) / 256));
  const p1 = mu + (1.5 * E1 - (27 / 32) * E1 ** 3) * Math.sin(2 * mu) + ((21 / 16) * E1 ** 2 - (55 / 32) * E1 ** 4) * Math.sin(4 * mu)
    + ((151 / 96) * E1 ** 3) * Math.sin(6 * mu) + ((1097 / 512) * E1 ** 4) * Math.sin(8 * mu);
  const s = Math.sin(p1), c = Math.cos(p1), t = Math.tan(p1);
  const C1 = EP2 * c * c, T1 = t * t;
  const N1 = A / Math.sqrt(1 - E2 * s * s);
  const R1 = (A * (1 - E2)) / Math.pow(1 - E2 * s * s, 1.5);
  const D = x / (N1 * K0);
  const lat = p1 - ((N1 * t) / R1) * (D * D / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * EP2) * D ** 4) / 24
    + ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * EP2 - 3 * C1 * C1) * D ** 6) / 720);
  const lon0 = (zone - 1) * 6 - 180 + 3;
  const lon = lon0 + (DEG * (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * EP2 + 24 * T1 * T1) * D ** 5) / 120)) / c;
  return [lat * DEG, lon];
}

/** Lat/lon to UTM in a given zone (Snyder eq. 8-9, 8-10). */
export function latLonToUtm(lat: number, lon: number, zone: number, south = false): [number, number] {
  const p = lat / DEG, lon0 = ((zone - 1) * 6 - 180 + 3) / DEG;
  const s = Math.sin(p), c = Math.cos(p), t = Math.tan(p);
  const N = A / Math.sqrt(1 - E2 * s * s), T = t * t, C = EP2 * c * c, Aa = c * (lon / DEG - lon0);
  const M = A * ((1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 ** 3) / 256) * p - ((3 * E2) / 8 + (3 * E2 * E2) / 32 + (45 * E2 ** 3) / 1024) * Math.sin(2 * p)
    + ((15 * E2 * E2) / 256 + (45 * E2 ** 3) / 1024) * Math.sin(4 * p) - ((35 * E2 ** 3) / 3072) * Math.sin(6 * p));
  const E = K0 * N * (Aa + ((1 - T + C) * Aa ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * EP2) * Aa ** 5) / 120) + 500000;
  let Nn = K0 * (M + N * t * (Aa * Aa / 2 + ((5 - T + 9 * C + 4 * C * C) * Aa ** 4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * EP2) * Aa ** 6) / 720));
  if (south) Nn += 10000000;
  return [E, Nn];
}
