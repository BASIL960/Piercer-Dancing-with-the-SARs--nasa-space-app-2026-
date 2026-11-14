// Downloads the team's research repository (processing scripts, standardized results, web-ready layers)
// into data-src/research, which scripts/stories/build.mjs reads.
//   node scripts/stories/fetch-research.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REPO = "BASIL960/Piercer-Dancing-with-the-SARs--nasa-space-app-2026-";
const dest = path.resolve("data-src/research");
if (fs.existsSync(path.join(dest, "research", "CLAIMS.md"))) { console.log("data-src/research already present"); process.exit(0); }
const zip = path.join(os.tmpdir(), "piercer-research.zip"), tmp = fs.mkdtempSync(path.join(os.tmpdir(), "piercer-"));
console.log(`downloading ${REPO} ...`);
const res = await fetch(`https://codeload.github.com/${REPO}/zip/refs/heads/main`);
if (!res.ok) throw new Error(`GitHub ${res.status}`);
fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
// bsdtar (Windows 10+, macOS) and GNU tar with libarchive both read zip files
execFileSync("tar", ["-xf", zip, "-C", tmp]);
const inner = fs.readdirSync(tmp)[0];
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.renameSync(path.join(tmp, inner), dest);
console.log("extracted to", dest);
