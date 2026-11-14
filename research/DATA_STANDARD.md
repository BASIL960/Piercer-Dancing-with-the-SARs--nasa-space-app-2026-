# Data standard for the three NISAR maps (Oregon fire, Nepal flood, Jazan rain)

Every number on the maps, in the slides and in the findings files follows these rules. A number that doesn't is either fixed or removed.

## 1. Evidence labels
Every stated number carries one of these labels in `research/CLAIMS.md`:

| Label | Meaning | Example |
|---|---|---|
| **M: Measured** | Read directly from a calibrated product, with no threshold | IMERG rain in mm; NISAR γ⁰ in dB; elevation from the DEM |
| **D: Derived** | Computed from measurements with a rule in section 4; thresholds stated | "33% of the coastal plain changed" |
| **R: Reported** | From an official body or the news, quoted with source and date; never recomputed | deaths, acres, containment, alert texts |
| **I: Interpolated** | Animation only, filling the time between measurements | the moving fire front, the moving flood surge |

**I values are never quoted as findings.** A live counter that moves between observations is labelled "estimated between satellite looks".

## 2. Formatting
- **Area:** km². Acres appear only when quoting an official figure (R), with the km² conversion alongside.
- **How area is counted:** valid pixels × pixel area on the stated analysis grid:
  - 30 m = 0.0009 km²
  - 60 m = 0.0036 km²
  - 80 m = 0.0064 km²

  Cloudy or missing pixels are never counted as "no change". If less than 95% of the area of interest is valid, the valid share is stated.
- **Every percentage names its denominator**, for example: "X% of the coastal plain (4,256 km²)".
- **Rounding:**
  - Areas: 3 significant figures (1,820 km²; 15.7 km²).
  - Percentages: whole numbers; one decimal below 10%.
  - Radar: dB to 0.1; coherence to 0.01.
- **Ranges:** when the robustness check (section 5) moves a number by more than ±10%, the number is written as central value (low–high), e.g. "1,390 km² (1,150–1,610)".
- **Dates:** local time, with the zone stated once per map:
  - Saudi: UTC+3
  - Nepal: UTC+5:45
  - Oregon: dates only (days), UTC

## 3. Areas of interest (the denominators)
Each area of interest is paired with a **control**: the same measurement where or when the event did not happen. Each D number is reported next to its control.

| Map | Area of interest | Control |
|---|---|---|
| Oregon | Ground burned inside the official NIFC perimeter (rule F); the perimeter itself is R | Land 2–10 km outside the perimeter, same radar frame |
| Nepal | Flood corridor: valley floor within 420 m of the DEM-traced flood route, 59.5 km long | Slopes 420 m–1.5 km from the route (time control: the last pre-flood radar pair) |
| Jazan | Coastal plain: land 0.5–250 m elevation in the radar study box | Time control: the dry-season pairs and passes (June–July) |

## 4. Change rules (one set of thresholds for all maps)
| Code | What | Rule | Data |
|---|---|---|---|
| **C** | Radar surface change | 12-day coherence (3×3 mean) at least **0.20 below the pixel's pre-event baseline**. The baseline is the maximum of the pre-event 12-day pairs (≥2 pairs) on the **same track** | NISAR L2 GUNW, calibrated HDF5 |
| **B** | Radar brightness change | γ⁰ (HH or HV) in dB minus the pixel's **pre-event median** on the same track. "Brighter" = more than **+2.0 dB**; "darker" = below **−2.0 dB** | NISAR L2 GCOV, calibrated HDF5 (never colour-rendered map tiles) |
| **G+** | Vegetation gain | NDVI above **0.30** and at least **0.15 above** the pre-event median, still true in at least 60% of later clear photos | NASA HLS v2, Fmask cloud mask |
| **G−** | Vegetation loss | NDVI at least **0.15 below** the pre-event median and below **0.30** after the event | NASA HLS v2 |
| **W** | Open water | MNDWI above **0.10** | NASA HLS v2 |
| **F** | Burned (fire only) | dNBR at least **0.10**. Severity classes: 0.10 / 0.27 / 0.44 / 0.66 (Key & Benson 2006, USGS FIREMON) | NASA HLS v2, pre/post median composites |
| **P** | Rain | IMERG V07 precipitation; "area wet" = share of 0.1° cells above **1 mm** in the window | NASA GES DISC |

**Composites.** "Pre-event" and "post-event" are per-pixel medians of all clear HLS photos in a stated window, not single scenes.

## 5. Robustness check
Every D number is recomputed with its threshold nudged down and up:

| Rule | Low | Standard | High |
|---|---|---|---|
| C: coherence drop | 0.15 | 0.20 | 0.25 |
| B: brightness change | 1.5 dB | 2.0 dB | 2.5 dB |
| G±: NDVI change | 0.10 | 0.15 | 0.20 |
| W: MNDWI | 0.05 | 0.10 | 0.15 |
| F: dNBR | 0.075 | 0.10 | 0.125 |

If the low–high spread is more than ±10% of the standard value, the range is stated (section 2). Comparisons, such as dusk vs dawn or burned vs control, must keep the same direction at all three thresholds before they are called a finding.

## 6. What may be claimed
- **A cause** ("the rain made the ground change") only when a measurement shows both the cause and the effect, with timing. Otherwise write "consistent with" or name the open alternatives.
- **Crop or land-cover types** are never derived here; they are R with a citation.
- **Radar values must come from calibrated GCOV or GUNW files.** Numbers read from GIBS or Worldview colour tiles are not allowed.
