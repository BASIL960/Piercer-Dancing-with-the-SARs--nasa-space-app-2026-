# Slide brief: "Dancing with the SARs", team Lūx Stellārum

**For the slide-making AI:** this is the full content brief. Use only the numbers and claims written here: each one was checked against data or a source. Keep the caveats on the slides marked "caveat". Where an image is needed, use the listed screenshots or figure files, or a placeholder that names the view to capture from the live map.

## 1. Context
- **Event:** NASA Space Apps Challenge 2026, Riyadh.
- **Challenge:** "Dancing with the SARs". Use NASA-ISRO **NISAR** radar data to show change on Earth.
- **Submission deadline:** 15 Nov 2026, 23:59 Saudi time.
- **Our angle:** three real 2026 events. In each one, NISAR radar shows something optical satellites can't, because they're blocked by clouds, night, smoke or dust. We back the radar up with NASA optical imagery, NASA rainfall data and dated news or official reports.
- **Why radar matters (one line):** NISAR's L-band radar sees through clouds and darkness. Comparing two passes 12 days apart shows where the ground surface changed (a measure called coherence), and radar brightness shows wetness and vegetation structure (called backscatter).

## 2. Interactive maps (live demos)
All three are private until shared from each page's Share menu.

| # | Event | Link |
|---|---|---|
| 1 | Jazan, Saudi Arabia: rainy season 2026 (main story) | https://claude.ai/artifact/2q6QR4UaU1VQ11iWW3raF2 |
| 2 | Big Grass Fire, Oregon–Idaho, 2026 | https://claude.ai/artifact/Mjr8wmsxZPcz79C7K6gx29 |
| 3 | Bhote Koshi glacier flood, Nepal, 26 Aug 2026 | https://claude.ai/artifact/A3xsfJUGk2oMPzGFRfzVJz |

---

## 3. Case study A (headline): Jazan's rainy season, storms, wet ground and a green wave
**One-sentence story:** Afternoon storms over the Sarawat mountains soak the Jazan coastal plain. NISAR sees the ground get wet through cloud and darkness, and the plain greens after, the low coastal land last, in mid-October.

### Data (all real, no synthetic layers)
- **NISAR L2 GUNW coherence (ground change):** 16 pairs of passes 12 days apart, 18 Jun – 29 Oct 2026, from two orbits:
  - track 64 descending, at **18:39** Saudi time ("dusk")
  - track 71 ascending, at **05:39** ("dawn")
- **NISAR L2 GCOV HH backscatter (wet ground):** 22 passes.
- **NASA GPM IMERG V07 rainfall** (exact values from NASA GES DISC, 0.1° cells):
  - daily, 1 Jun – 13 Nov
  - half-hourly before every radar pass and through 10 storm/alert days
  - 884 files in total
- **NASA HLS v2 photos** (Landsat 8/9 + Sentinel-2): 69 dates.
- **Copernicus DEM:** "coastal plain" means land below 250 m (4,260 km²).

### What the map shows (Season view colours)
- **Lilac:** rain falling.
- **Blue:** wet ground seen by the radar.
- **Deep blue:** open water.
- **Green:** new green since June.
- **Dark green:** already green in June.
- **Tan:** dried or harvested.

Playback slows down on alert days so you can watch the storm move every half hour. Each alert pops up as a card on the map showing the official alert text, that day's rain, and what the next radar pass saw.

### Key findings
1. **The coast greens last.**
   - Median date the ground turned green: **19 Oct** below 100 m near the sea (18–19 Oct at every threshold); **16 Sep** at 100–250 m (16–19 Sep).
   - The foothill date (27 Aug) moves between 17 Aug and 16 Sep with the threshold, so do **not** state "7 weeks from the foothills".
   - By 1 Nov, **1,390 km² (981–1,560)** of the coastal plain was newly green: **33% (23–37%)** of it.
2. **Radar and photos agree.** Of the plain that the dawn radar flagged as changed in at least **3** of 6 rainy-season windows, **69% (50–77%)** turned clearly green later, against **29% (17–35%)** elsewhere: 2.1–2.9 times as likely at every threshold. The radar picked out where the plants would come up (crop type is not measured).
3. **Dusk and dawn disagree, and that is a finding.**
   - Over the same 12-day windows, the dusk pass shows **33% (19–53%)** of the plain changed on average; the dawn pass shows **9% (4–18%)**. In the dry June–July pairs: about 1% and 4.5%. Dusk is at least 3× dawn at every threshold.
   - Rain had fallen on more than 5% of the area in the 6 h before **5 of 8** rainy-season dusk passes, but before **none** of the dawn passes.
   - A second possible cause is afternoon wind moving crops.
   - Conclusion: the dawn pass measures lasting change; the dusk pass catches each storm's fresh footprint.
4. **The rain itself** (IMERG, average over the study area):
   - Season total **169 mm**.
   - By month: Jun 8 mm, Jul 34, **Aug 53**, Sep 33, Oct 37, Nov 1–13 5.
   - Wettest day: **12 Aug** (18.6 mm area average, 36 mm in the wettest cell).
   - Strongest single cell: **41 mm on 24 Oct**, the same day a resident filmed Wadi Bid in flood.
5. **A dam lake filled up.** Near the Jizan Dam, 8 of 9 clear June photos show less than 0.6 km² of open water. On 19 Oct and 4 Nov there was about **2.5 km²**.
6. **What the green is.** On the plain it is most likely rain-fed farmland plus wild plants on the wadi fans. Sorghum, pearl millet and sesame are the region's main rain-fed crops ([UN in Saudi Arabia, 14 Nov 2024](https://saudiarabia.un.org/en/node/284255)). Crop type was not measured.

### Timeline of official alerts and reports
| Date (2026) | Event | Source |
|---|---|---|
| 12 Aug | Wettest day of the season | NASA IMERG |
| 16 Aug | Weather warning: heavy rain over several Jazan governorates | NCM via [Dalil Saudi](https://dalylsaudi.com/news457005.html) |
| 22 Aug | Red alert; Civil Defense: keep out of wadi beds (3rd-wettest day, 29 mm peak cell) | [Dalil Saudi](https://dalylsaudi.com/news456975.html) |
| 26 Aug | Red alert until 21:00: heavy rain, hail, torrents in the mountains | NCM via [Dalil Saudi](https://dalylsaudi.com/news456975.html) |
| 30 Aug | Another red alert for the mountain governorates | NCM via [Dalil Saudi](https://dalylsaudi.com/news457005.html) |
| 22 Sep | Most rain before any radar pass (2.4 mm average in 6 h, 49% of the area) | NASA IMERG + NISAR |
| 6 Oct | October's wettest day | NASA IMERG |
| 13 Oct | Thunderstorm and hail warning; torrents possible | NCM via [Nl7za](https://nl7za.com/saudi/saudi-weather-tuesday-midday-jazan-floods-hail-till-10pm-dammam-42-2026-10-13) |
| 24 Oct | Wadi Bid flows (resident video); strongest rain cell of the season | [X post](https://x.com/rashud2/status/2114118615004016895) + IMERG |
| 5 Nov | Nationwide thunderstorm and flash-flood warning | [Arab News](https://www.arabnews.com/saudi-arabia/saudi-arabia-braces-for-thunderstorms-flash-floods-across-most-regions-through-tuesday-3010103) |

### Caveats (put on a slide)
- The NISAR products are still **provisional**.
- The rain is IMERG's **Late run** (near-real-time); NASA's Final run comes out in about 3.5 months.
- Green and water dates are the **first clear photo** showing the change, so they can be a few days late (longer under summer dust haze).
- Between measurements the animation **blends**. A radar frame appears at its pass time and fades in over one day.
- **Coherence loss** says the ground changed, not why.
- **"Wet ground"** (radar brightness more than 2 dB above the dry season) can include growing plants, so it is drawn only where photos show no green.
- Two June–July dawn radar pairs had processing stripes and were excluded. Two Jul–Aug pairs span 24 days instead of 12 and are left out of the averages.
- Radar was tested as a reservoir detector and was too noisy (wind, mountain shadow), so it is not used for that.

---

## 4. Case study B: Big Grass Fire, Oregon–Idaho, 2026
**One-sentence story:** A lightning-started rangeland fire ran east into Idaho. Calibrated NISAR radar shows the shrubs are gone where it burned hottest, even where the photos already look green again.

**Key facts**
- **Start:** lightning on **23 Jul 2026** near 42.65°N, 117.30°W.
- **Official vs actual burn:** the official perimeter is **575,163 acres (2,330 km²)**; **1,810 km² (1,610–1,950)** actually burned, **78% (69–84%)** of it. The rest is unburned islands. Only 3% of the land outside the perimeter passes the same burn test. (The old "≈1,820" and "a third unburned" are replaced.)
- **Speed:**
  - Busiest day: **26 Jul**, with 19% of all the fire's VIIRS detections.
  - **29 Jul** (6 days after the start): photos show **at least 40%** of the final burned area already burned, **at most 76%**, because 37% was hidden by smoke. Do **not** say "half" as a fact.
  - There was a second surge on 1–10 Aug.
- **Burned area over time (share of the final burned area):** 7% (24 Jul) → at least 40% (29 Jul) → 65% (3 Aug) → 94% (10 Aug) → 99% (23 Aug).
- **Burn severity (share of burned ground):** 71% low, 22% moderate-low, 6.5% moderate-high, 0.7% high.
- **The radar view (calibrated NISAR GCOV and GUNW, track 114):**
  - Across the fire (16 Jul → 21 Aug, a 36-day pair because of the data gap), **38% (30–47%)** of the burned ground changed, and 88% where it burned hottest. Outside the fire: 3.7%.
  - By 20 Oct, the shrub signal (HV) on the hottest-burned ground was **51% of pre-fire**, against 81% on unburned land outside (summer drying). **81% (64–93%)** of that ground is more than 2 dB darker than before; outside, 3.5%.
  - The old "72% of pre-fire" came from Worldview colour tiles and is withdrawn.
- **Long-term clue:** the 2012 Long Draw fire next door (558,000 acres) faded from view within about 3 years, but has **never returned to pre-fire levels**. It has stayed about 0.9 points brighter in short-wave infrared since 2016. This is consistent with sagebrush being replaced by grass, which is not yet verified.

**Data**
- NASA HLS v2
- Landsat Collection 2
- VIIRS 375 m fire detections (NASA FIRMS / GIBS)
- NISAR GCOV
- NIFC fire perimeters

**Caveats**
- NISAR values are calibrated (L2 GCOV γ⁰ and L2 GUNW coherence, provisional products).
- NISAR has no passes over the fire from 26 Jul to 12 Aug.
- The animated fire front and the burned-so-far counter are interpolated and labelled as estimates.
- News acreage and containment figures come from idahonews.com, Elkhorn Media and NIFC.

**Figures on disk** (`research/oregon/`)
- `fig1_before_after_severity.png`
- `fig2_progression.png`
- `fig3_frame_by_frame.png`
- `fig4_recovery_2026.png`
- `fig5_long_draw_recovery.png`
- `anim_big_grass.gif`

---

## 5. Case study C: Bhote Koshi glacier flood, Rasuwa, Nepal, 26 Aug 2026
**One-sentence story:** An ice-and-rock avalanche on Langtang Lirung sent a wall of water down the valley in under an hour. NISAR's first radar pair spanning the flood shows 38% of the flood corridor changed against 7% of the slopes beside it, a month before clouds cleared enough for a photo.

**Timeline** (Nepal time, from news sources)
| Time | Event | Source |
|---|---|---|
| 08:37 | Ice and rock collapse from Langtang Lirung (about 5,100 m); seismometers record the jolt | USGS, Kathmandu Post |
| ≈09:00 | Surge hits Rasuwagadhi border crossing and Timure | Kathmandu Post |
| ≈09:10 | Reaches Syabrubesi, 14 km downstream; river gauge destroyed | OneIndia |
| ~55 min after collapse | At Galchhi on the Trishuli, the river rises 9 m in 30 minutes | Kathmandu Post |
| 26 Aug, evening | 98 deaths confirmed | OneIndia |
| 27 Aug | 162 deaths confirmed; China reports a 2 million m³ barrier lake on the Tibetan side | OneIndia, Kathmandu Post |
| 10 Sep | Government toll reaches **289**, with hundreds missing | Kathmandu Post |

**Radar and photos**
- NISAR's last pass before the flood was 19 Aug; the first after was 31 Aug (track 098). In that pair, **38% (31–46%)** of the flood corridor (ground within 420 m of the 59.5 km route, 48.5 km²) changed, against **7% (4–13%)** of the slopes 420 m–1.5 km away. In the five pre-flood pairs, corridor and slopes changed by similar amounts. Rule: coherence at least 0.20 below the pre-flood baseline.
- Of the ground the photos later show as stripped, **82% (72–90%)** had changed in the radar pair, against 24% of the rest of the corridor.
- The first clear optical photo came only on **1 Oct**.
- By 23 Oct, **11.7 km² (11.0–12.6)** of ground was stripped along the 59.5 km route: **24%** of the flood corridor (NASA HLS: plants lost or new water). Only 3% of the slopes beside it pass the same test.
- Do **not** say "the whole route is torn up" or "16 km²" (old numbers, replaced).

**Caveats**
- Surge timing between the reported times is interpolated.
- The flood route is traced along the valley floor using the Copernicus DEM.

---

## 6. Suggested slide outline (12–14 slides)
1. **Title:** "Seeing through clouds: NISAR radar and three 2026 events". Team Lūx Stellārum, NASA Space Apps 2026, Riyadh.
2. **The problem:** optical satellites go blind in storms, smoke and at night, exactly when things change fastest.
3. **What NISAR measures:** coherence (did the ground change between two passes?) and backscatter (wetness, vegetation). L-band, through clouds, day and night. Use one simple diagram.
4. **Our method:** NISAR first, then confirmed with NASA HLS photos, NASA IMERG rainfall, elevation data, and dated official alerts and news. **One data standard for all three maps** (`DATA_STANDARD.md`): one change threshold per measurement, every number labelled measured / derived / reported / interpolated, every derived number compared with a control and given a range when the threshold moves. Every number is in `CLAIMS.md`.
5. **Jazan: the setting.** Map of the coastal plain, the Sarawat mountains and the two radar passes (18:39 / 05:39).
6. **Jazan: the season in numbers.** Monthly rain bar chart (8 / 34 / 53 / 33 / 37 / 5 mm) with alert markers on the timeline.
7. **Jazan: the coast greens last.** 16 Sep at 100–250 m → 19 Oct below 100 m; 1,390 km² (981–1,560) newly green, 33% (23–37%) of the plain. Screenshot of the Season view in mid-September.
8. **Jazan: radar change and later green line up.** 69% (50–77%) of the plain the dawn radar flagged in ≥ 3 of 6 rainy windows was green by November, vs 29% (17–35%) elsewhere. This is a spatial association, not a forecast: the analysis does not order the radar change before green-up (see `CLAIMS.md`).
9. **Jazan: dusk vs dawn.** 33% (19–53%) vs 9% (4–18%); rain before 5 of 8 dusk passes vs none at dawn. A small two-line chart.
10. **Jazan: alerts on the map.** Screenshot of the 22 Aug red-alert card plus the 24 Oct Wadi Bid example, with sources.
11. **Oregon fire:** at least 40% burned in 6 days; 1,810 km² burned, 78% of the 2,330 km² perimeter; radar: hottest-burned shrub signal at 51% of pre-fire vs 81% outside.
12. **Nepal flood:** 08:37 collapse → Syabrubesi by 09:10; radar pair to 31 Aug: 38% of the flood corridor changed vs 7% of the slopes; a photo only on 1 Oct; 11.7 km² stripped (24% of the corridor); 289 dead (reported).
13. **Caveats and honesty:** provisional products, Late-run rain, interpolated animation (see the lists above).
14. **Impact and next steps:**
    - flood warnings and crop monitoring for Jazan farmers and Civil Defense (a lead-time test for crops is still to be done)
    - rapid damage mapping when clouds block photos
    - re-run with final NISAR and IMERG products

## 7. Visual style hints
- Dark "storm-night" maps.
- Fonts: Barlow Semi Condensed (headings), Barlow (body), IBM Plex Mono (numbers).
- Jazan colours:

  | Use | Colour |
  |---|---|
  | Rain | lilac `#f0c8ff` |
  | Wet ground | blue `#2a9fd8` |
  | Open water | deep blue `#3046d8` |
  | New green | `#3fcf78` |
  | Already green in June | dark green `#22593f` |
  | Dried or harvested | tan `#b5803a` |
  | Dusk pass | orange `#eb6834` |
  | Dawn pass | blue `#3987e5` |
  | Red alert | `#e5484d` |

- One chart per idea; no dual axes.

## 8. Data credits (for the last slide)
- NASA-ISRO NISAR (via ASF DAAC)
- NASA GPM IMERG V07 (GES DISC)
- NASA HLS v2 (via Microsoft Planetary Computer)
- Landsat Collection 2 (USGS)
- VIIRS and NASA GIBS / Worldview
- Copernicus DEM GLO-30
- NIFC fire perimeters
- News and official sources linked above: NCM, Saudi Civil Defense, Kathmandu Post, OneIndia, ICIMOD, NDRRMA, Arab News, Dalil Saudi, Nl7za, UN in Saudi Arabia
