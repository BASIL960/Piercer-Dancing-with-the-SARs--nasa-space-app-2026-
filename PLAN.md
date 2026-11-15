# Build plan: Dancing with the SARs

> **Superseded.** This is the original plan for the centre-pivot farm concept, kept for the record. The project became Piercer, a three-place story (Bhote Koshi, Big Grass Fire, Jazan); see [README.md](README.md) for what was built and [research/CLAIMS.md](research/CLAIMS.md) for every number it shows.

Written 14 Nov 2026, 12:37 pm (Saudi time). **This is planning only.** .

Related notes: [CHALLENGE.md](CHALLENGE.md) (official brief), [VIDEO_REFERENCE.md](VIDEO_REFERENCE.md) (the reference video).

---

## 1. What the evidence supports

### The archive (`pivot-exploration.zip`)

The archive holds satellite pictures of **center-pivot farms** (the green circles made by rotating irrigation arms) at two sites in Saudi Arabia.

| Site | Box | Radar (NISAR) | Optical |
|---|---|---|---|
| Al-Jouf (Wadi As-Sirhan) | 29.65–30.35°N, 38.00–38.65°E | 10 dates, 22 Jun – 1 Nov 2026 | Mar 1986, 1991, 2000 (Landsat WELD), 9 Mar 2026 (HLS) |
| Al-Qassim (west of Buraydah) | 26.05–26.55°N, 43.15–43.75°E | 11 dates, 25 Jun – 4 Nov 2026 | Mar 1985, 2000, 2001 (Landsat WELD), 8 Mar 2026 (HLS) |

It also holds pre-hackathon figures, two GIFs, a findings file and three Python scripts. Those were research and will **not** be used in the app.

### What I checked tonight

| Check | Result |
|---|---|
| Is it really NISAR? | Yes. I re-downloaded the Qassim 4 Nov 2026 scene from NASA GIBS with the same settings and it is **pixel-identical** to the archive file. The layer is `NISAR_L2_Geocoded_Polarimetric_Covariance`. |
| Geographic boxes | The PNGs carry no location metadata. The boxes come from `FINDINGS.md` and `gibs.py`. Image shapes match those boxes exactly (equal degrees per pixel), and the pixel-identical re-download confirms the Qassim box. |
| Radar and optical alignment | A checkerboard of the March 2026 optical image against radar shows pivot circles lining up across tile edges at both sites. |
| Radar dates | Every date at each site is a multiple of 12 days apart, so each site is one repeating orbit track. Date-to-date comparison is valid. |
| Data gap | GIBS lists no NISAR imagery from 27 Jul to 10 Aug 2026. This matches the gap in the archive. |
| What the colours mean | NASA's layer description: **green = cross-polarized return** (HV or VH), **red and blue = co-polarized return** (HH or VV). Vegetation looks green, dry sand blue, built-up or sparse areas orange/yellow. |
| Earlier numbers reproduce | Re-running the original colour thresholds gives the same Qassim series as `findings_raw.json` (141, 147, 142, 118, 151, …). |
| Can single pivots be tracked? | Yes. A quick test followed 68 pivots at Al-Jouf and 59 at Al-Qassim across all dates. Most switch on or off once in the season. The test missed many visible circles, so the real build needs a better detector (section 5). |

### Limits that shape the design

- **The radar images are NASA's colour rendering, not calibrated measurements.** Every number in the app must be labelled approximate.
- **The rendering shifts colour from date to date.** The background blue level varies a lot (Al-Jouf 18–58, Al-Qassim 36–66 on a 0–255 scale), while green stays steady (55–60 and 46–52). The old area threshold depends on blue, so it wobbles. Example: the Qassim "151 km²" spike on 24 Aug falls on the date with the lowest blue. The app will measure with the **green channel only**.
- **No elevation data is in the archive.** The app will not fake terrain from radar brightness. The sites stay flat.
- **The optical history mixes monthly composites (1985–2001) with single-day scenes (2026).** The decades comparison is indicative only.
- **The "overview" images have no documented box.** They will not be used. Context imagery will be fetched fresh from GIBS with known boxes.
- **Most radar dates are PROVISIONAL products.** Only acquisitions from 21 Oct 2026 onward are VALIDATED (per `FINDINGS.md`; to re-confirm against ASF).

---

## 2. The experience

**Working title: DAWRA (دورة)**, Arabic for "cycle" or "turn". It fits the pivot arm's rotation, the satellite's 12-day repeat and the crop season. The name is yours to change.

**The insight a visitor should leave with:** every 12 days, through cloud and dust, radar catches desert farms mid-step. In autumn 2026, Al-Qassim's circles switch on one by one as winter planting starts, while Al-Jouf's fade across the summer.

### Three altitudes (from the reference video's zoom-to-navigate idea)

1. **Orbit.** A slowly turning Earth. Two site cards sit in clear space with thin leader lines to their true positions in Saudi Arabia. Hovering moves a ring marker and shows a one-line description.
2. **Site.** The camera dives without a cut. The study-area imagery is mapped onto the globe at its real latitude and longitude, so the globe view and the close view are the same scene.
3. **Field.** Choosing one pivot flies the camera down to it and shows that field's own record.

### The three signature interactions

1. **The pivot dial (main time control).** A circular control shaped like a center pivot. The arm sweeps a seasonal clock. Each tick is a real NISAR pass. The data gap is a visible missing arc. Months with no radar data are left empty. Dragging the arm moves through the dates and the fields cross-fade. Arrow keys and a play button do the same.
2. **The score.** A dance-notation grid: one row per tracked pivot, one column per radar pass. A filled cell means the field was bright in the green (cross-polarized) channel. Hovering a row highlights its circle on the map. Clicking it dives to the field and shows a strip of every radar look at it.
3. **The radar lens.** A circular lens the visitor drags over the March 2026 optical image to reveal the radar view underneath. A second control splits the radar colours into their co-polarized and cross-polarized parts.

### Site chapters

| Chapter | What it shows | Evidence level |
|---|---|---|
| Before the circles | Optical images from the 1980s to 2026. Al-Jouf goes from bare desert to a farm grid. | Observation, indicative only |
| Radar eyes | The lens: optical against radar, and what the colours mean. | Observation |
| The dance | The dial, the score and the 12-day series. | Observation plus derived index |
| What changed | A gain/loss map between two chosen dates. | Derived |
| Fine print | What is uncertain, and what calibrated NISAR data could add. | Interpretation |

Every figure and caption carries one of four tags: **Observed**, **Derived**, **Interpretation**, **Illustrative**.

### Visual identity

- Dark, quiet interface so the imagery does the work. Thin type, translucent panels, a fixed bottom action bar.
- The circle is the repeating shape: globe, pivot, dial, lens.
- Gain and loss use blue and orange, which stay distinct for colour-blind visitors.
- An original look. Nothing is copied from the game in the reference video.

---

## 3. Honesty rules for the build

- Radar numbers are always labelled "approximate, from NASA's rendered imagery".
- The 12-day comparison is used because the dates support it. The decades comparison is shown with its caveat.
- Crop-calendar and aquifer explanations are shown as hypotheses, not findings, until sourced.
- Any cloud or atmosphere effect on the globe is tagged Illustrative.
- The tracked-pivot count is described as "pivots we could follow", not a census.

---

## 4. Technology

| Part | Choice | Why |
|---|---|---|
| App | Vite, React, TypeScript | Fast to build, easy to host as a static site |
| 3D | three.js through React Three Fiber, custom shaders | One scene from orbit to field; shaders for cross-fade, lens and change overlay |
| State | zustand | Small shared store for site, date, chapter, selected pivot |
| Data pipeline | Node with sharp | One toolchain, one `npm install` |
| Hosting | Any static host | The submission needs a public link |

No map library is needed: the imagery is two small boxes with known corners.

---

## 5. Data pipeline (reproducible)

All steps run from `npm` scripts and write a manifest with source file hashes, boxes, dates, layer names and access dates.

1. **Fetch context from NASA GIBS:** a Blue Marble globe texture and regional context with known boxes. Optionally re-download the raw scenes to confirm they match the archive.
2. **Prepare images:** convert each raw PNG to a full-size and a small preview WebP. The app loads previews first, then full size for the dates in view.
3. **Build the pivot catalog:** find circles with a disc-shaped matched filter on the green channel of each radar date and on the March 2026 optical image, then merge detections by centre.
4. **Measure each pivot on each date:** median green level inside the circle, compared with the scene background. Output an on/off state and a continuous value.
5. **Site series and change masks:** vegetated area per date using the green channel, and gain/loss masks between date pairs.

Checks built into the pipeline: the original thresholds must reproduce the earlier Qassim series, and a latitude/longitude-to-pixel test must land on known pivots.

---

## 6. Build order (14 Nov)

1. Scaffold the app and the image pipeline.
2. Globe, site cards and the dive to a correctly placed site. This gives a complete journey early.
3. Date cross-fade and the pivot dial.
4. Pivot catalog, the score and the field dive.
5. Radar lens and the decades chapter.
6. Change map and the fine-print panel.
7. Polish: loading feedback, keyboard use, reduced motion, small screens, frame rate.
8. README with setup, data attribution and limitations.

Each step is tested in a real browser before moving on.

---

## 7. Submission needs (from the Participant Guide)

- Deadline: **23:59 Saudi time, 15 Nov 2026**.
- Public project link (a public GitHub repo with a README).
- Demo: a 7-slide deck or a 30-second video, in English.
- A "Use of AI" statement. This project uses Claude for code and writing, and that must be disclosed.
- References listing every dataset, tool and library.

---

## 8. Decisions for you

| Decision | My default if you don't say |
|---|---|
| Project name | DAWRA |
| Languages | English interface, with the Arabic name shown beside the title |
| Which site opens first | Al-Qassim, because its autumn switch-on is the clearest story |
