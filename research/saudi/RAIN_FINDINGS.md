# Jazan rainy season 2026: storms, wet ground and a green wave

**Map:** https://claude.ai/artifact/2q6QR4UaU1VQ11iWW3raF2 (private until shared). Source: `saudi/rain_web/`.

## Data (all real, no synthetic layers)
| Layer | Product | Amount |
|---|---|---|
| Radar ground change | NISAR L2 GUNW coherence (PROVISIONAL_V1), HH | 16 pairs (9 per track, minus 2 striped dawn pairs), 18 Jun – 29 Oct |
| Radar wet ground | NISAR L2 GCOV HH backscatter | 22 passes |
| Rain | GPM IMERG V07 **Late run, exact values from NASA GES DISC**, 0.1° | daily 1 Jun – 13 Nov (165 files); half-hourly for the 6.5 h before all 22 passes and for 10 full storm/alert days (719 files) |
| Green, water, photos | NASA HLS v2 (Landsat 8/9 + Sentinel-2) | 69 dates (91 scenes), ≥30% clear |
| Plain mask | Copernicus DEM 30 m | land 0.5–250 m |

**Tracks:** 64 descending, frame 80, 18:39 Saudi time ("dusk"); 71 ascending, frame 10, 05:39 ("dawn").

## Scripts (`research/scripts/`)
| Script | What it does |
|---|---|
| `jazan_imerg.py` | Reads IMERG from GES DISC remotely (`daily` or `hh <days>`) |
| `jazan_season_stack.py` | Builds 80 m NDVI and MNDWI stacks for every HLS date |
| `jazan_season_derive.py` | Per-pixel green-up/green-down and water-appears/water-gone dates |
| `jazan_season_web.py` | `season_a.png`, `season_b.png` (lossless) and `season.json` |
| `jazan_rain_update.py` | Merges rain, pre-pass rain, event pins, season stats and page facts into `data.json` |
| `jazan_rain_prep.py` | Radar and photo frames (from the earlier version) |

## Method
All numbers follow `research/DATA_STANDARD.md`; every number is listed in `research/CLAIMS.md`.
- **Ground changed:** the pair's coherence is at least 0.2 below the best of the track's dry June–July pairs (after 3×3 smoothing).
- **Wet ground:** HH more than 2 dB above the track's dry-season median. It is drawn only where the photos show no green, because growing plants also brighten radar.
- **New green:** first clear photo with NDVI > 0.3 and > June median + 0.15, still green in ≥ 60% of later clear photos (at least 2). **Green-down:** first later clear photo where it is not green and < 30% of later photos are.
- **Open water:** MNDWI > 0.1, same persistence rule. Specks under 4 px are dropped.
- **Animation (the page states this):** radar frames appear at their pass time and fade in over a day. Photos blend from one clear date to the next. Daily rain blends between days; on the 10 storm days, half-hourly rain blends between half hours. Green and water appear on the date of the first clear photo showing them, so they can lag by the gap between clear photos.

## Results
### Rain (exact IMERG, study-area average)

| Month | Rain |
|---|---|
| Jun | 8 mm |
| Jul | 34 mm |
| Aug | 53 mm |
| Sep | 33 mm |
| Oct | 37 mm |
| Nov 1–13 | 5 mm |
| **Season** | **169 mm** |

**Top days**

| Date | Study-area mean | Wettest cell | Note |
|---|---|---|---|
| 12 Aug | 18.6 mm | 36 mm | Wettest day of the season |
| 6 Oct | 10.9 mm | 31 mm | |
| 22 Aug | 6.9 mm | 29 mm | Red alert day |
| 24 Oct | 6.2 mm | 41 mm | Strongest cell of the season; same day as the Wadi Bid flood video |

**Correction to the earlier version:** with the GIBS-decoded values I had called 17 Jul the "first storm". The exact data shows light rain from 1 Jun, so that label was dropped.

### Green wave (HLS, per pixel)
- Median green-up date by height:

  | Elevation | Median green-up |
  |---|---|
  | 250–500 m | 27 Aug |
  | 100–250 m | 16 Sep |
  | 0–100 m | 19 Oct |

  Under the robustness check (NDVI rise 0.10 / 0.20), 0–100 m stays at 18–19 Oct and 100–250 m at 16–19 Sep, but 250–500 m moves from 17 Aug to 16 Sep. **Claim:** the coast greens last, about a month after 100–250 m. The old "about 7 weeks from the foothills" is withdrawn.
- **New green on the coastal plain by 1 Nov:** 1,390 km² (981–1,560), 33% (23–37%) of the 4,260 km² plain. This matches the independent cross-check (33.0% "clearly greener").
- **What the green is:** on the plain it is most likely rain-fed farmland plus wild plants on the wadi fans. Crop type is not measured. Sorghum, pearl millet and sesame are the region's main rain-fed crops ([UN in Saudi Arabia, 14 Nov 2024](https://saudiarabia.un.org/en/node/284255)).

### Water (HLS)
**Jizan Dam area**
- In 8 of the 9 clear June photos, open water was under 0.6 km². The 5 Jun photo shows 1.4 km².
- On 19 Oct and 4 Nov it was about 2.5 km².

**Limits**
- Summer dust haze makes the water index fail on some July and August photos.
- Radar darkness was tested as a water detector at both dams. It is too noisy (wind on the lake, mountain shadow), so it is not used.

### Radar: dusk vs dawn
**Share of the coastal plain that changed**

Rule C (coherence at least 0.20 below the best dry pair). Central values below; ranges for 0.15 / 0.25 are in `std_jazan.json`.

| Window | Dusk | Dawn |
|---|---|---|
| Jun – Jul (dry) | 0.8–1.6% | 4.5% |
| 24 Jul – 17/18 Aug (24-day pair) | 33.3% | 20.9% |
| 17 – 29 Aug | 34.1% | 5.2% |
| 29 Aug – 10 Sep | 40.5% | 6.4% |
| 10 – 22 Sep | 42.2% | 10.4% |
| 22 Sep – 4 Oct | 27.6% | 9.1% |
| 4 – 16 Oct | 22.7% | 13.1% |

**Averages, 12-day pairs only:** dusk 33% (19–53%), dawn 9% (4–18%). Dusk is at least 3× dawn at every threshold.

**Rain in the 6.5 h before each pass** (exact half-hourly IMERG):
- Dusk passes: more than 5% of the area got rain before 5 of the 8 rainy-season passes.
- Dawn passes: none. The most was 1.4% of the area, before the 30 Aug pass.
- Most rain before any pass: 22 Sep dusk, 2.4 mm average, with more than 1 mm on 49% of the area.
- Largest area: 17 Aug dusk, 74% of the area.
- Counter-example: before the 30 Jun dusk pass, 21% of the area had rain, yet only about 1% of the plain changed. Two causes are left open.

**Radar–photo cross-check**
- Plain flagged by the dawn radar in at least 3 of 6 wet windows: 69% (50–77%) greened. (The earlier text said "2 of 6"; the numbers were computed with 3.)
- Rest of the plain: 29% (17–35%). Ratio 2.1–2.9× across all 9 threshold combinations (`std_jazan_xcheck.json`).

**Radar wet ground (rule B, HH > +2 dB):** 17 Aug dusk 8% (4–13%), 18 Aug dawn 7% (4–13%); 10 Sep dusk 37% (23–54%), 11 Sep dawn 19% (9–34%). Dry-season passes: 0.2% or less.

## Assumptions and limits
- **NISAR products are provisional.**
- **Two 24-day pairs** are shown, but left out of the averages.
- **Two striped dawn pairs** are excluded.
- **Coherence loss says the surface changed, not why.**
- **Wet ground** can include rougher or vegetated surfaces. It is masked where photos show green.
- **IMERG Late run** is a near-real-time product; the Final run will replace it in about 3.5 months.
- **Event rings** on the map mark IMERG's wettest cell that day, not the place named in the report.

## Dated events and sources
- **12 Aug:** wettest day of the season (IMERG).
- **16 Aug:** NCM warning. [Dalil Saudi](https://dalylsaudi.com/news457005.html)
- **22 Aug and 26 Aug:** red alerts, and the Civil Defense warning on 22 Aug. [Dalil Saudi](https://dalylsaudi.com/news456975.html)
- **30 Aug:** red alert. [Dalil Saudi](https://dalylsaudi.com/news457005.html)
- **22 Sep:** the radar pass with the most rain just before it (IMERG).
- **6 Oct:** October's wettest day (IMERG).
- **13 Oct:** thunderstorms and hail warning. [Nl7za](https://nl7za.com/saudi/saudi-weather-tuesday-midday-jazan-floods-hail-till-10pm-dammam-42-2026-10-13)
- **24 Oct:** Wadi Bid flows. [X post](https://x.com/rashud2/status/2114118615004016895)
- **5 Nov:** nationwide thunderstorm and flash-flood warning. [Arab News](https://www.arabnews.com/saudi-arabia/saudi-arabia-braces-for-thunderstorms-flash-floods-across-most-regions-through-tuesday-3010103)
