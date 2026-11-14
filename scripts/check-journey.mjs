// Drives the running app in headless Chrome through the whole journey and saves a screenshot of each step.
//   npm run dev   (in another terminal)
//   node scripts/check-journey.mjs [url] [outdir] [WxH] [only,...]
// Also exercises interruption: dragging mid-flight, changing chapter mid-flight, scrubbing during playback.
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const url = process.argv[2] || "http://localhost:5173/";
const out = path.resolve(process.argv[3] || "shots");
const [vw, vh] = (process.argv[4] || "1440x900").split("x").map(Number);
const only = process.argv[5] ? process.argv[5].split(",") : null;
await fs.mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
const problems = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("response", (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });

const st = (fn, arg) => page.evaluate(([f, a]) => new Function("s", "a", f)(window.__piercer.getState(), a), [fn, arg]);
const wait = (ms) => page.waitForTimeout(ms);
let n = 0;
const shot = async (name) => {
  n++;
  if (only && !only.some((o) => name.includes(o))) return;
  await page.screenshot({ path: path.join(out, `${String(n).padStart(2, "0")}-${name}.png`) });
  console.log("shot", name);
};
// the engine picks up a story change on its next frame, so give it a moment before waiting for the flight to end
const settle = async (ms = 600) => { await wait(250); await page.waitForFunction(() => !window.__engine?.flying, null, { timeout: 15000 }).catch(() => {}); await wait(ms); };

await page.goto(url);
try {
  await page.waitForFunction(() => window.__piercer?.getState().ready, null, { timeout: 90000 });
} catch (e) {
  const s = await page.evaluate(() => { const s = window.__piercer?.getState(); return s ? { progress: s.progress, error: s.error } : "store missing"; });
  console.log("NOT READY", JSON.stringify(s), "\n" + problems.join("\n"));
  await page.screenshot({ path: path.join(out, "not-ready.png") });
  await browser.close();
  process.exit(1);
}
await wait(1500);
await shot("intro");

await st("s.enter()"); await settle(1200);
await shot("hub");

const places = { nepal: 6, oregon: 6, jazan: 6 };
for (const [id, count] of Object.entries(places)) {
  await st(`s.openSite("${id}", 0)`);
  await settle(1800);
  for (let i = 0; i < count; i++) {
    if (i > 0) { await st(`s.setChapter(${i})`); await settle(900); }
    // let guided playback run a little, then finish it so the screenshot shows the chapter's end state
    const s = await st("return { playing: s.playing, to: s.playTo }");
    if (s.playing) { await wait(1500); await st("if (s.playTo) s.setTime(s.playTo)"); await wait(900); }
    await shot(`${id}-${i}`);
  }
}

// layer switches and pass toggles
await st('s.openSite("oregon", 4)'); await settle(900);
await st('s.setLayer("rad")'); await wait(1400); await shot("oregon-green-radar");
await st('s.openSite("jazan", 2)'); await settle(900);
await st('s.setPass("dawn")'); await wait(1000); await shot("jazan-duskdawn-dawn");

// interruption: drag during a long flight, then change chapter while flying, then recentre
await st('s.openSite("nepal", 0)'); await wait(700);
await page.mouse.move(vw * 0.55, vh * 0.45); await page.mouse.down(); await page.mouse.move(vw * 0.6, vh * 0.5, { steps: 8 }); await page.mouse.up();
const free = await st("return s.freeCam");
await wait(500); await shot("interrupt-drag");
await st("s.setChapter(1)"); await wait(400); await st("s.setChapter(3)"); await settle(800);
await shot("interrupt-chapter-hop");
await st("s.setChapter(1)"); await wait(1200); await st("s.setTime(s.t + 3600e3*4)"); await wait(500);
const afterScrub = await st("return { playing: s.playing, t: s.t }");
await shot("interrupt-scrub");

await st("s.toFinale()"); await settle(1500);
await shot("finale");

console.log(`free camera after drag: ${free}; playing after scrub: ${afterScrub.playing}`);
console.log(problems.length ? `PROBLEMS:\n${[...new Set(problems)].join("\n")}` : "no console errors, warnings or failed requests");
await browser.close();
