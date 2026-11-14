// The globe: NASA Blue Marble shaded relief and bathymetry, from NASA GIBS (WMS, EPSG:4326), 4096 x 2048.
//   node scripts/stories/globe.mjs [--force]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const out = path.resolve("public/data/globe/globe.webp");
if (fs.existsSync(out) && !process.argv.includes("--force")) { console.log("globe.webp exists (use --force to fetch again)"); process.exit(0); }
const url = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0"
  + "&LAYERS=BlueMarble_ShadedRelief_Bathymetry&STYLES=&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=4096&HEIGHT=2048&FORMAT=image/jpeg";
const res = await fetch(url);
if (!res.ok) throw new Error(`GIBS ${res.status}`);
fs.mkdirSync(path.dirname(out), { recursive: true });
await sharp(Buffer.from(await res.arrayBuffer())).webp({ quality: 84, effort: 5 }).toFile(out);
console.log("wrote", out);
