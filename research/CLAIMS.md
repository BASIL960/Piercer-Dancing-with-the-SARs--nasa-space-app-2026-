# Claims table: every number on the three maps

Rules and labels: see `DATA_STANDARD.md`.

**Labels**

| Label | Meaning |
|---|---|
| M | Measured |
| D | Derived with a stated rule |
| R | Reported |
| I | Interpolated (animation only) |

**Ranges** = the same rule with its threshold nudged down and up:

| Rule | Thresholds |
|---|---|
| Coherence drop | 0.15 / 0.25 |
| Brightness | 1.5 / 2.5 dB |
| NDVI | 0.10 / 0.20 |
| dNBR | 0.075 / 0.125 |

Each derived number is listed with its control.

## Oregon: Big Grass Fire (23 Jul – 28 Aug 2026)
Map: https://claude.ai/artifact/Mjr8wmsxZPcz79C7K6gx29 · Scripts: `std_oregon.py`, `std_oregon_lib.py`, `std_oregon_radar.py` · Results: `std_oregon_optical.json`, `std_oregon_radar.json`

| Claim | Value (range) | Label | Rule / denominator | Control | Source |
|---|---|---|---|---|---|
| Official perimeter | 575,163 acres = 2,330 km² | R | NIFC final perimeter. Unburned islands are holes in it (even-odd rule) | – | NIFC |
| Burned ground | **1,810 km² (1,610–1,950)** | D | F: dNBR ≥ 0.10. Pre composite = median of 14 Jun, 3 Jul, 9 Jul; post = median of 23 Aug, 30 Aug; 60 m grid | 3% of land 2–10 km outside the perimeter passes the same test | NASA HLS v2 |
| Burned share of the perimeter | **78% (69–84%)** | D | 1,810 / 2,330 km² | as above | HLS + NIFC |
| Severity of burned ground | low 71%, moderate-low 22%, moderate-high 6.5%, high 0.7% | D | Key & Benson dNBR classes 0.10 / 0.27 / 0.44 / 0.66 | – | HLS |
| Busiest day | 26 Jul: 19% of all the fire's VIIRS detections first seen that day; half of the detection footprint by 1 Aug | M | count of first detections per day | – | NASA VIIRS 375 m |
| Burned by 24 Jul | 7% of the final burned area | D | F on the 24 Jul photo; 100% valid | – | HLS |
| Burned by 29 Jul (6 days after ignition) | **at least 40% (38–42%), at most 76% (73–78%)** | D | Lower bound = burned where visible. Upper bound adds the 37% of the perimeter hidden by smoke or cloud. "Half" is inside the bounds but is not stated as a fact | – | HLS |
| Burned by 3 / 10 / 23 Aug | 65% / 94% / 99% | D | F on each photo. Valid share: 91% / 100% / 100% | – | HLS |
| Radar gap | no NISAR passes from 26 Jul to 12 Aug | M | ASF granule search over the fire | – | ASF |
| Radar: shrub signal, 20 Oct | hot-burned ground (dNBR > 0.44): HV at **51% of pre-fire (−2.9 dB)**; all burned ground 71% (−1.5 dB). Darker than −2 dB: **81% (64–93%)** of hot-burned and 29% (15–50%) of all burned ground | D | B: HV vs the median of 22 Jun, 4 Jul and 16 Jul, track 114, 3×3 mean | land outside: 81% of pre-fire (−0.9 dB, summer drying); darker than −2 dB: 3.5% (1–10%) | NISAR L2 GCOV (calibrated HDF5) |
| Radar: shrub signal, 21 Aug (first pass after the gap) | hot-burned 65% of pre-fire; darker than −2 dB: 45% (31–64%) | D | as above | land outside: 91%; 0.7% (0.1–2%) | NISAR L2 GCOV |
| Radar: surface change across the fire | **38% (30–47%)** of burned ground changed; 88% (81–94%) of hot-burned | D | C: coherence ≥ 0.20 below the pre-fire baseline (best of 22 Jun→4 Jul and 4 Jul→16 Jul). **Exception:** the pair is 16 Jul → 21 Aug, 36 days, because of the data gap | land outside, same pair: 3.7% (1.1–9.1%). Later 12-day pairs: burned ≤ 1.3%, so the change happened during the fire | NISAR L2 GUNW |
| Acres and containment by date, crews | 300,000 ac (5%), 541,000 ac (41%), 578,000 ac (55%), 93% | R | – | – | NIFC, idahonews.com, Elkhorn Media |
| Burned-so-far and share tiles, moving fire front | – | I | VIIRS days + HLS edges, interpolated within each day; scaled so the end value equals the measured 1,810 km² | – | – |

## Nepal: Bhote Koshi flood (26 Aug 2026)
Map: https://claude.ai/artifact/A3xsfJUGk2oMPzGFRfzVJz · Scripts: `std_nepal.py`, `nepal_std_web.py` · Results: `std_nepal.json`

| Claim | Value (range) | Label | Rule / denominator | Control | Source |
|---|---|---|---|---|---|
| Route length | 59.5 km, 5,118 m start | M | DEM flow path (pysheds) from the collapse site | – | Copernicus DEM |
| Flood corridor | 48.5 km² | D | land ≤ 420 m from the route | – | DEM |
| Ground stripped | **11.7 km² (11.0–12.6)**, **24%** of the corridor | D | G− (NDVI drop ≥ 0.15 to < 0.30) or W (MNDWI > 0.10, new), October vs pre-flood composites | 3% of the slopes 420 m–1.5 km away | NASA HLS v2 |
| Radar, flood pair (19 → 31 Aug) | **38% (31–46%)** of the corridor changed vs **7.3% (4–13%)** of the slopes | D | C: coherence ≥ 0.20 below the pre-flood baseline (best of 4 pairs, 8 Jun – 26 Jul), track 098 | the slopes; and in time, the pre-flood pairs, where corridor and slopes are similar (16 vs 27%, 17 vs 19%, 26 vs 29%, 2.3 vs 0.7%, 21 vs 17%) | NISAR L2 GUNW |
| Radar sees the stripped ground | 82% (72–90%) of the stripped ground changed in the flood pair, vs 24% (18–32%) of the rest of the corridor | D | C inside vs outside the HLS stripped mask | – | NISAR + HLS |
| Collapse 08:37, Rasuwagadhi ≈ 09:00, Syabrubesi ≈ 09:10, Galchhi +9 m in 30 min | – | R | – | – | USGS seismic record, Kathmandu Post, OneIndia |
| Deaths 17 / 72 / 98 / 162 / 289; barrier lake 2 million m³ | – | R | – | – | OneIndia, Kathmandu Post, NDRRMA |
| Surge position, minute-by-minute stripped counter | – | I | arrival time = DEM path time, fitted to reported times; final value is the measured 11.7 km² | – | – |

**Not claimed (removed):** "the whole route shows as torn-up ground" (it was 38%); "about 16 km² stripped" (that used a 300 m line buffer, not the rule).

## Jazan: rainy season (Jun – Nov 2026)
Map: https://claude.ai/artifact/2q6QR4UaU1VQ11iWW3raF2 · Scripts: `std_jazan.py`, `std_jazan_xcheck.py`, `std_jazan_green.py` · Results: `std_jazan*.json`

| Claim | Value (range) | Label | Rule / denominator | Control | Source |
|---|---|---|---|---|---|
| Coastal plain | 4,260 km² | M | land 0.5–250 m | – | Copernicus DEM |
| Season rain | 169 mm (Jun 8, Jul 34, Aug 53, Sep 33, Oct 37, 1–13 Nov 5) | M | study-area mean | – | IMERG V07 Late, GES DISC |
| Wettest day | 12 Aug, 18.6 mm mean, 36 mm wettest cell; 6 Oct 10.9 mm; 24 Oct strongest cell 41 mm | M | – | – | IMERG |
| Rain before passes | before 5 of the 8 rainy-season dusk passes, > 5% of the area had rain in the 6.5 h before; before the dawn passes never (most 1.4%). 22 Sep: 2.4 mm, 49% of the area | M | P: cell > 1 mm | – | IMERG half-hourly |
| Radar change, dusk vs dawn | **33% (19–53%) vs 9% (4–18%)** of the plain, average of the rainy-season 12-day pairs; dusk ≥ 3× dawn at every threshold | D | C vs the best dry-season pair, per track | dry June–July pairs: about 1% dusk, 4.5% dawn | NISAR L2 GUNW, tracks 64 / 71 |
| Wet ground (radar brightening) | 17 Aug dusk 8% (4–13%), 18 Aug dawn 7% (4–13%); 10 Sep dusk 37% (23–54%), 11 Sep dawn 19% (9–34%) | D | B: HH > +2 dB vs the dry-season median, where photos show no green | dry-season passes: ≤ 0.2% | NISAR L2 GCOV |
| Radar predicts green | **69% (50–77%)** of the plain flagged by dawn radar in ≥ 3 of 6 rainy windows greened, vs **29% (17–35%)** elsewhere; 2.1–2.9× at every threshold pair | D | C (dawn) × G+ | the unflagged plain | NISAR + HLS |
| New green by 1 Nov | **1,390 km² (981–1,560)**, **33% (23–37%)** of the plain | D | G+: NDVI > 0.30, ≥ 0.15 above the June median, green in ≥ 60% of later clear photos, and not yet greened-down | June (time control) | NASA HLS v2 |
| Green wave | below 100 m: median 19 Oct (18–19 Oct); 100–250 m: 16 Sep (16–19 Sep). Foothills 27 Aug, but it moves 17 Aug – 16 Sep with the threshold, so it is **not claimed** | D | G+ first date, per pixel | – | HLS |
| Jizan Dam water | June < 0.6 km² in 8 of 9 clear photos (5 Jun: 1.4); 19 Oct and 4 Nov ≈ 2.5 km² | D | W: MNDWI > 0.10 | June | HLS |
| Alerts and warnings (16, 22, 26, 30 Aug; 13 Oct; 5 Nov), Wadi Bid flow 24 Oct | – | R | – | – | NCM via Dalil Saudi, Nl7za, Arab News, X post |
| Crop types (sorghum, millet, sesame) | – | R | not measured here | – | UN in Saudi Arabia |
| Blending between passes and photos, rain between half hours | – | I | – | – | – |

**Corrected under the standard**
- "at least 2 of 6 windows" → **3 of 6**. The numbers were already computed with 3; the text was wrong.
- "green spreads from the foothills to the sea in about seven weeks" → **the coast greens last**. The foothill date is not robust to the threshold.
- "about 1,391 km²" is now written to 3 significant figures, with a range.
