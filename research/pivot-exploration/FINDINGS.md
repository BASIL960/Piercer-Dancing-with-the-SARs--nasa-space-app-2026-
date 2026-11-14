# Center-pivot farms in Al-Jouf & Al-Qassim — exploratory look (13 Nov 2026)

> **Research only, made before the hackathon.** Per the Space Apps rules, nothing here should be submitted as-is.
> Rebuild anything you keep from 14 Nov onward.

## Study areas
| Site | Box (lat, lon) | Notes |
|---|---|---|
| Al-Jouf (Wadi As-Sirhan) | 29.65–30.35°N, 38.00–38.65°E | A grid of pivots and large rectangular plots |
| Al-Qassim (west of Buraydah) | 26.05–26.55°N, 43.15–43.75°E | Dense, older pivot cluster |

## What the images show
| Figure | Finding |
|---|---|
| `fig1_jouf_decades.png` | In March, green cropland went from **0 km² (1986) → 11 km² (1991) → ~378 km² (2000) → ~337 km² (2026)**. About 470 pivots were green in March 2026. The farm grid appeared within about 14 years. |
| `fig2_qassim_decades.png` | In March 2026 there was **~118 km²** of green cropland. That is the lowest of the four snapshots (1985: 159, 2000: 182, 2001: 336 km²). Many old circles show as pale, unplanted scars. |
| `fig5_nisar_timeseries.png` | NISAR every 12 days, Jun–Nov 2026. **Al-Jouf:** vegetated area falls from ~92 to ~42–47 km², which fits summer harvest and fallow. **Al-Qassim:** dips to ~110 km² in Sep, then climbs to ~139 km² by 4 Nov, which fits autumn planting. |
| `fig3_nisar_qassim_change.png` | Between 29 Sep and 4 Nov, NISAR shows about 9 km² of field-sized patches turning vegetated. Many are **whole circles switching on**. Almost nothing turned off. |
| `fig4_nisar_jouf_change.png` | Between 22 Jun and 8 Oct, about 29 km² of field-sized vegetation disappeared and about 7 km² appeared. |
| `anim_nisar_*.gif` | Time-lapse of each NISAR date (12-day steps, same orbit). |

## Caveats (be honest about these with the judges)
- **The NISAR images are the Worldview colour rendering, not calibrated values.** The colours are HH/VV in red and blue and HV/VH in green. Green ≈ vegetation volume. Areas were measured by thresholding colours, so they are approximate. For real numbers, download GCOV HDF5 files from ASF, which needs an Earthdata Login, and threshold the HV backscatter (γ⁰ in dB).
- **The NISAR data is PROVISIONAL** (Jun–Oct 2026). VALIDATED products cover acquisitions from 21 Oct 2026 onward and were released 6 Nov 2026. There is a permanent NISAR data gap from 27 Jul to 10 Aug 2026.
- **The historical images are Landsat WELD *monthly composites*, not single-day scenes.** The 2026 images are single-day HLS scenes. Composites can look greener. The big jump between Qassim March 2000 and March 2001 (182 → 336 km²) shows how sensitive these numbers are to the image used. Treat the decade comparison as indicative only.
- **Al-Jouf:** the rocky escarpment in the SW corner looks like vegetation to radar, so it is masked out of all measurements.
- **The radar pivot count is unreliable,** so it isn't shown. The optical pivot counts are rough: they count circular green blobs of 0.12–1.6 km².

## Hypotheses to test (the "physical drivers" the challenge asks for)
- **Seasonality.** Saudi pivot wheat is a winter crop, planted around Nov–Dec and harvested around Apr–May. That would explain the summer low and the November green-up in radar. *Check this against crop calendars or Ministry (MEWA) data.*
- **Long-term change and water.** Pivots draw on deep fossil aquifers (e.g. the Saq aquifer). Saudi policy phased out subsidized wheat and later restricted green fodder to save water. That could explain Qassim's lower peak-season green area. *Verify the dates and sources before stating them.*
- **Next, with NISAR GUNW (interferograms):** look for ground subsidence over heavily pumped farm zones.

## Data used (record for References — accessed 13 Nov 2026)
| Dataset | Source | Access |
|---|---|---|
| NISAR L2 GCOV (PROVISIONAL), Worldview layer `NISAR_L2_Geocoded_Polarimetric_Covariance` | NASA-ISRO, ASF DAAC, NASA GIBS | https://gibs.earthdata.nasa.gov (WMS) · https://search.asf.alaska.edu |
| HLS Sentinel-2 (S30) Nadir BRDF-adjusted reflectance | NASA LP DAAC, via GIBS | `HLS_S30_Nadir_BRDF_Adjusted_Reflectance` |
| Landsat WELD true-colour monthly composites | USGS/NASA, via GIBS | `Landsat_WELD_CorrectedReflectance_TrueColor_Global_Monthly` |
| NISAR Data User Guide | ASF | https://nisar-docs.asf.alaska.edu |

Scripts are in `scripts/` (`gibs.py` fetches images, `classify.py` holds the thresholds, `figures.py` builds the figures). Run them with Python 3.12 plus numpy, pillow, scipy, matplotlib, requests and truststore.
