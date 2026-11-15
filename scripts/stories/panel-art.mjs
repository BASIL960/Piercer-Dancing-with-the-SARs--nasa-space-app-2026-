// Story-panel art: one portrait crop per chapter, cut from the same imagery the map shows, toned so text reads
// on top of it. Writes public/story/<site>-<chapter>.webp. Captions and sources live in src/ui/panelArt.ts.
//   node scripts/stories/panel-art.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SITES = "public/data/sites";
const OUT = "public/story";
fs.mkdirSync(OUT, { recursive: true });

// crop: [left, top, width, height] as fractions of the source; tone: how it is treated
//   photo  - colour kept, slightly muted
//   veil   - the photo under a white, blurred haze: "no clear photo"
//   radar  - a single-band radar product as a duotone in the place's colour
const A = {
  nepal: [
    ["valley", "nepal/opt_pre.webp", [0.08, 0.18, 0.84, 0.82], "photo"],
    ["surge", "nepal/opt_post.webp", [0.2, 0.42, 0.62, 0.58], "photo"],
    ["blind", "nepal/opt_pre.webp", [0.1, 0.25, 0.8, 0.75], "veil"],
    ["radar", "nepal/radar_20260819_20260831.webp", [0.05, 0.2, 0.9, 0.8], "photo"],
    ["scar", "nepal/opt_post.webp", [0.3, 0.55, 0.5, 0.45], "photo"],
    ["meaning", "nepal/opt_post.webp", [0.05, 0.1, 0.9, 0.9], "photo"],
  ],
  oregon: [
    ["spark", "oregon/tc_pre.webp", [0.0, 0.3, 0.5, 0.7], "photo"],
    ["run", "oregon/fc_post.webp", [0.0, 0.15, 0.62, 0.85], "photo"],
    ["gap", "oregon/fc_post.webp", [0.38, 0.1, 0.62, 0.9], "photo"],
    ["islands", "oregon/tc_post.webp", [0.2, 0.0, 0.62, 1.0], "photo"],
    ["green", "oregon/radar_2026-10-20.webp", [0.15, 0.05, 0.6, 0.95], "photo"],
    ["meaning", "oregon/radar_2026-10-20.webp", [0.3, 0.1, 0.6, 0.9], "photo"],
  ],
  jazan: [
    ["mountains", "jazan/context.webp", [0.4, 0.0, 0.6, 1.0], "photo"],
    ["wet", "jazan/radar/gcov_064_20260910.jpg", [0.05, 0.1, 0.9, 0.9], "radar"],
    ["duskdawn", "jazan/radar/coh_064_20260910_20260922.jpg", [0.05, 0.1, 0.9, 0.9], "radar"],
    ["wave", "jazan/hls/hls_2026-11-04.webp", [0.1, 0.05, 0.8, 0.95], "photo"],
    ["foretold", "jazan/radar/freq_dawn.jpg", [0.05, 0.05, 0.9, 0.95], "radar"],
    ["meaning", "jazan/hls/hls_2026-11-04.webp", [0.4, 0.45, 0.6, 0.55], "photo"],
  ],
};
// the duotone ends: night, then the place's colour
const TINT = { nepal: [127, 230, 255], oregon: [235, 104, 52], jazan: [120, 205, 150] };

const W = 600;
for (const [site, list] of Object.entries(A)) {
  for (const [ch, src, [l, t, w, h], tone] of list) {
    const file = path.join(SITES, src);
    const m = await sharp(file).metadata();
    const L = Math.round(l * m.width), T = Math.round(t * m.height);
    const box = { left: L, top: T, width: Math.min(m.width - L, Math.round(w * m.width)), height: Math.min(m.height - T, Math.round(h * m.height)) };
    // portrait 3:5, centred in the box
    const H = Math.round(W * 5 / 3);
    let img = sharp(file).extract(box).resize(W, H, { fit: "cover", position: "centre" });
    if (tone === "photo") img = img.modulate({ saturation: 0.78, brightness: 0.92 });
    if (tone === "veil") img = img.modulate({ saturation: 0.25, brightness: 1.35 }).blur(14).linear(0.55, 110);
    if (tone === "radar") {
      const g = await img.greyscale().normalise().raw().toBuffer({ resolveWithObject: true });
      const [r, gg, b] = TINT[site], n = [7, 11, 29];
      const px = g.data, ch3 = Buffer.alloc((px.length / g.info.channels) * 3);
      for (let i = 0, j = 0; i < px.length; i += g.info.channels, j += 3) {
        const v = px[i] / 255, e = Math.pow(v, 0.9);
        ch3[j] = n[0] + (r - n[0]) * e; ch3[j + 1] = n[1] + (gg - n[1]) * e; ch3[j + 2] = n[2] + (b - n[2]) * e;
      }
      img = sharp(ch3, { raw: { width: g.info.width, height: g.info.height, channels: 3 } });
    }
    const out = path.join(OUT, `${site}-${ch}.webp`);
    await img.webp({ quality: 55 }).toFile(out);
    console.log(out, (fs.statSync(out).size / 1024).toFixed(0), "KB");
  }
}
