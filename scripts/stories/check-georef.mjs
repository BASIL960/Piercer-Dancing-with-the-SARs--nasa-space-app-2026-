// Prints the recovered georeference for each site and checks it against independent points.
//   node scripts/stories/check-georef.mjs
import fs from "node:fs";
import path from "node:path";
import { SITE_SOURCES, solve, pxToLonLat } from "./georef.mjs";

const R = path.resolve("data-src/research/research");
// Independent checks: well-known places whose coordinates come from gazetteers (approximate, ~100 m),
// matched to the labels the research pipeline placed on its maps.
const KNOWN = {
  oregon: { "Jordan Valley": [-117.0529, 42.9743] },
  nepal: { Syabrubesi: [85.3446, 28.1606], Dhunche: [85.2955, 28.1136] },
  jazan: { Jazan: [42.5511, 16.8892], "Abu Arish": [42.8325, 16.9689], Sabya: [42.6252, 17.1495] },
};

for (const id of Object.keys(SITE_SOURCES)) {
  const d = JSON.parse(fs.readFileSync(path.join(R, SITE_SOURCES[id].dir, "data.json"), "utf8"));
  const g = solve(id, d);
  console.log(`\n${id}: UTM ${g.zone}N origin E=${g.cx0.toFixed(1)} N=${g.cy0.toFixed(1)} res=${g.res} m` +
    (g.maxResidualM !== null ? `  pin residual max ${g.maxResidualM.toFixed(1)} m` : ""));
  const nw = pxToLonLat(g, 0, 0), se = pxToLonLat(g, d.context.W, d.context.H);
  console.log(`  context NW ${nw[1].toFixed(4)}, ${nw[0].toFixed(4)}   SE ${se[1].toFixed(4)}, ${se[0].toFixed(4)}`);
  for (const pl of d.places) {
    const k = KNOWN[id][pl.name];
    const [lon, lat] = pxToLonLat(g, ...pl.p);
    let note = "";
    if (k) {
      const dx = (lon - k[0]) * 111320 * Math.cos((lat * Math.PI) / 180), dy = (lat - k[1]) * 110540;
      note = `   vs gazetteer ${Math.hypot(dx, dy).toFixed(0)} m`;
    }
    console.log(`  ${pl.name.padEnd(34)} ${lat.toFixed(4)}, ${lon.toFixed(4)}${note}`);
  }
  if (id === "jazan") {
    // rain cells: IMERG 0.1° grid; corners were stored in context pixels
    const c = d.rain_corners, nwC = pxToLonLat(g, ...c[0][0]), seC = pxToLonLat(g, ...c[c.length - 1][c[0].length - 1]);
    console.log(`  rain grid ${c.length - 1}x${c[0].length - 1} cells, corner NW ${nwC[1].toFixed(3)}, ${nwC[0].toFixed(3)}  SE ${seC[1].toFixed(3)}, ${seC[0].toFixed(3)}`);
  }
}
