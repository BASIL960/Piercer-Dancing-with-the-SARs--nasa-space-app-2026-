# Big Grass Fire (Oregon–Idaho, 2026): fire spread and recovery

> Research made 13–14 Nov 2026. Rebuild anything you keep inside the hackathon project.

All numbers follow `research/DATA_STANDARD.md` and are listed in `research/CLAIMS.md`.

## The story in five figures
| Figure | What it shows | Key number |
|---|---|---|
| `fig1_before_after_severity.png` | False colour (SWIR-NIR-Red, 30 m) on 9 Jul vs 30 Aug, plus a burn-severity map (dNBR) | The official perimeter is 575,163 ac (2,330 km²); **1,810 km² (1,610–1,950) burned, 78% (69–84%)** of it; the rest is unburned islands. Burn severity, share of burned ground: 71% low, 22% moderate-low, 6.5% moderate-high, 0.7% high. *(Standardized numbers: the figure itself was drawn with an older mask and shows slightly different values.)* |
| `fig2_progression.png` | Day-by-day spread from VIIRS fire detections, with news milestones (acres, % contained) | Lightning start 23 Jul. Biggest single day: **26 Jul**. 26 Jul has 19% of all VIIRS detections; half the VIIRS detection footprint by 1 Aug. On 29 Jul the photos show **at least 40%, at most 76%** of the final burned area burned (37% hidden by smoke); "half by 29 Jul" is withdrawn as a fact. Second surge 1–10 Aug |
| `fig3_frame_by_frame.png` | 9 satellite frames, 9 Jul → 24 Oct | Share of the final burned area: 7% (24 Jul) → ≥ 40% (29 Jul) → 65% (3 Aug) → 94% (10 Aug) → 99% (23 Aug). Then the area that still reads as burned shrinks to ~1,470 by 7 Oct, as ash blows away and grass greens up |
| `fig4_recovery_2026.png` | Optical (NBR) and radar (NISAR HV) for hot-burned land, lightly burned land and unburned land | *(The figure uses Worldview colours; the standardized numbers come from calibrated GCOV:)* by 20 Oct, HV where it burned hottest (dNBR > 0.44) is **51% of pre-fire** (−2.9 dB), against 81% on land outside (summer drying); 81% (64–93%) of it is more than 2 dB darker, against 3.5% outside. Across the fire, coherence dropped on 38% (30–47%) of burned ground vs 3.7% outside |
| `fig5_long_draw_recovery.png` | The 2012 Long Draw fire right next door (558,000 ac), Landsat each summer 2008–2025 | The scar faded from view within ~3 years, but has **never returned to the pre-fire level**. Since 2016 it has stayed ~0.9 points brighter in SWIR. This fits sagebrush being replaced by grass, which is still to be verified |
| `anim_big_grass.gif` | Every clear date, animated | 4.4 MB |

## Detective notes for the story
- **Origin:** a lightning strike near 42.65°N, 117.30°W, on the western edge of the scar. The fire then ran east into Idaho.
- **Unburned islands:** these show up as tan or green patches inside the white perimeter line in fig1 and fig3. A "where did crews hold it?" angle could compare them with roads, rivers and dozer lines.
- **Juniper highlands:** the green high ground in the north-centre burned hottest (dark red in the severity map), and that is where radar shows the biggest drop.
- **What comes next:** the Long Draw fire suggests the landscape will look healed within a few years but stay different for decades.

## Caveats
- **NISAR data:** the numbers now come from calibrated L2 GCOV and GUNW HDF5 files (`scripts/oregon_nisar.py`, `std_oregon_radar.py` → `research/std_oregon_radar.json`). `fig4` still shows the older Worldview-colour curve. There is no NISAR data over the fire from 26 Jul to 12 Aug 2026, so the coherence pair across the fire is 36 days.
- **VIIRS spread map:** VIIRS pixels are 375 m; the animation interpolates within each day and is scaled to the measured 1,810 km². Its counters are estimates.
- **Long Draw:** this is one Landsat scene per summer, so it is sensitive to how dry each year was. The 2026 value is excluded because Big Grass was burning next door. The brightness offset is small, about 1 percentage point of reflectance.
- **News figures:** acres and containment come from idahonews.com, Elkhorn Media Group and NIFC. Verify them before quoting.

## Data
- NASA HLS v2 (S30/L30) via Microsoft Planetary Computer STAC (`hls2-s30`, `hls2-l30`)
- Landsat Collection 2 Level-2 (`landsat-c2-l2`)
- VIIRS 375 m thermal anomalies via NASA GIBS; NISAR L2 GCOV and L2 GUNW (calibrated HDF5) from NASA Earthdata / ASF
- Fire perimeters: NIFC WFIGS 2026 and Interagency Fire Perimeter History

The script is `../scripts/oregon_figs.py`. Run `python oregon_figs.py [hero progression strip recovery longdraw gif]`.
