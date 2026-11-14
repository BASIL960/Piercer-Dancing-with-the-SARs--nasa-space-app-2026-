# Drastic-change events in the NISAR era: candidate catalogue (research, 13 Nov 2026)

> Research only. Nothing here should be submitted as-is; rebuild from 14 Nov.
> Quick-look images are in `quicklooks/`. Figures from the news are provisional and sources disagree, so verify them before quoting.

## What NASA data can cover
| Data | Time span | Sees through cloud? | Best for |
|---|---|---|---|
| NISAR L-band GCOV (radar) | Oct 2025 – now. BETA subset Oct 2025–Jan 2026, PROVISIONAL Jun–Oct 2026, VALIDATED from 21 Oct 2026. 12-day repeat. Permanent gap 27 Jul–10 Aug 2026 | **Yes** (also night and smoke) | Floods, forest loss, burn scars in vegetation, debris flows, crops |
| NISAR GUNW (interferograms) | Same span | Yes | Earthquake and volcano ground movement, subsidence. **Needs an Earthdata Login and an ASF download** |
| HLS optical (Landsat + Sentinel-2) | 2013 – now, every 2–3 days | No | Natural-colour "proof" images, burn scars, fire spread |
| Landsat WELD | 1984 – 2001 | No | Decades-long "before" pictures |
| NASA EONET | Ongoing | n/a | Event list with dates, locations and fire sizes |

---

## ★ 1. Bhote Koshi ice-avalanche flood, Nepal–Tibet (26 Aug 2026)
**Why it's strong:** a dramatic human story; radar sees what optical couldn't (monsoon clouds); and it has a clear origin → impact → aftermath arc.

- **Origin:** an ice avalanche (ICIMOD; early reports said a glacial-lake outburst) on the Tibetan side near Gyirong. The water came down the Lhende Khola into the Bhote Koshi.
- **Timeline:**
  - **26 Aug, ~09:00:** the flood wave hits Timure and Syabrubesi (Rasuwa).
  - The Miteri (Friendship) bridge and the Rasuwagadhi dry port are destroyed. 13–15 hydropower projects are hit (Chilime, Rasuwagadhi, Trishuli-3A, Upper Trishuli-1).
  - **26 Aug:** Army helicopters are sent, but one turns back because the Timure helipad was swept away.
  - **28 Aug:** a debris dam forms a *new barrier lake* at the Chochhen Kola / Purepu Changpo confluence. It overflows, and rescue is halted.
  - **30 Aug:** the Nepal Army reports about 2,700 people rescued, with 8,300+ troops deployed.
  - **31 Aug:** China reports the barrier lake fully drained.
  - **~14 Sep:** foreign teams (e.g. Australia's DART) head home, and the search continues inside the hydropower tunnels.
- **Toll:** reports range from 160 to 538 dead, with hundreds to 1,000+ missing. These figures conflict.
- **NASA data:**
  - NISAR on 19 Aug (before), 31 Aug (the day the lake drained), and 12 and 24 Sep.
  - HLS on 12 Aug (clear, before) and 1 Oct (first clear image after): the valley floor is scoured into a wide grey debris channel.
  - The radar difference (19 → 31 Aug) traces the flood path along the river while optical was blind under cloud.
- **Detective angles:**
  - Trace the debris channel upstream to find the source.
  - Find the barrier lake in radar.
  - Measure how far downstream the scour reached.
  - Mark the destroyed bridge, dry port and hydropower sites.
- Box used: 28.13–28.33°N, 85.28–85.46°E (zoom) · 28.05–28.40°N, 85.20–85.50°E (wide)

## ★ 2. Big Grass megafire, Oregon–Idaho (23 Jul – late Aug 2026)
**Why it's strong:** a perfect "origin → spread → containment" story, with daily optical frames and a radar burn signal in the shrub- and juniper-covered hills.

- **Origin:** a lightning strike on 23 Jul 2026, about 25 mi SW of Jordan Valley, Malheur County, OR. The EONET point is at 42.65°N, 117.30°W.
- **Spread:**
  - **28 Jul:** about 300,000 acres, 5% contained.
  - **~10 Aug:** about 541,000 acres, 41% contained.
  - **mid-Aug:** about 578,000 acres, 55–72% contained. Storms sparked new fires nearby.
  - **~23 Aug:** about 578,600 acres, 93% contained, and command is handed off.
- **Response:** 1,050 personnel, 15 hand crews, 39 dozers, 63 engines, 34 water tenders and 6 helicopters. 615 homes were threatened, there was 1 injury and no deaths, and evacuations were later lifted.
- **NASA data:**
  - HLS on 11 Jul (nothing), 24 Jul (ignition scar with live fire), 29 Jul (huge run east), and 3, 10 and 30 Aug (full scar).
  - NISAR on 20 Jul, 13 Aug and 25 Aug. Radar darkening shows where juniper and shrub hills burned.
- **Detective angles:**
  - Map the burn extent on each date to get the spread rate.
  - Find where the fire front *stopped* along roads, rivers or dozer lines, i.e. where crews held it.
  - Mark unburned islands inside the scar.
- Box used: 42.30–43.10°N, 117.60–116.30°W

## 3. Kruger National Park floods, South Africa (Jan 2026)
- **Story:**
  - Persistent heavy rain made the Sabie, Crocodile, Letaba, Sand, Luvuvhu and Limpopo rivers overflow together.
  - 631 people (67 of them children) were evacuated from 4 rest camps by helicopter.
  - At one point the park had a single exit, via the Crocodile Bridge.
  - On 22 Jan, 14 camps were still closed, with damage estimated at R0.5–1 bn.
  - There were 19 deaths in the wider region.
- **NASA data:**
  - NISAR on 31 Dec (before), 12 Jan (peak) and 24 Jan (receding). BETA data.
  - Radar shows river channels and about half the scene brighter on 12 Jan (waterlogged ground).
  - The optical image from 22 Jan is cloud-covered.
- **Note:** the NISAR imagery of the neighbouring Mozambique Limpopo floods (NASA has published a visualization) isn't in the no-login Worldview layer, so it would need an ASF download.

## 4. Amazon: decades of clearing, 2026 drought fires, and a record-low deforestation rate
- **Story:** Brazilian Amazon deforestation alerts hit their lowest level since 2013 (Aug 2025–Jul 2026, −36%). But El Niño drought fuelled a surge of fires from Sep 2026, mostly set deliberately to clear pasture, and degradation now outpaces clear-cutting.
- **NASA data:** NISAR every 12 days from Aug to Oct 2026 over Pará (−2.9°, −50.4°). Clearings are crisp in radar while optical shows smoke and cloud (19 Oct). Landsat 1984–2001 + HLS 2026 provide the long-term story.
- **Caveat:** in this test box the radar change during the 2026 fires was subtle. A better story might be a long-term deforestation front such as Rondônia, or a recovery angle using the falling deforestation rate.

## 5. Earthquakes (need an ASF download of GUNW, the interferograms)
| Event | Date | Location (lat, lon) | Notes |
|---|---|---|---|
| Baqen County, Tibet, M7.0 | 22 Oct 2026 | 32.34, 93.78 | Mapped surface rupture (~0.9 m left-lateral). Right after the VALIDATED data start |
| Caracas coast, Venezuela, M7.5 (+ M7.2) | 24 Jun 2026 | 10.60, −67.22 | USGS RED alert, shallow (10 km) |
| Panama, M7.7 | 9 Oct 2026 | 7.61, −80.76 | Shallow, orange alert |
| Flores, Indonesia, M7.8 | 14 Aug 2026 | −8.34, 121.34 | Shallow, orange alert |
| Kumamoto, Japan, M6.8 | 28 Jul 2026 | 32.62, 130.66 | RED alert. Falls inside the NISAR data gap |

## Other big events found (EONET), not yet checked
- **Morrill wildfire, Nebraska:** about 573,000 acres, Mar 2026. Not in the no-login NISAR layer.
- **Hayli Gubbi volcano, Ethiopia:** 23 Nov 2025.
- **Pakistan:** 2026 monsoon floods, "worst in a decade". Locations and dates still need to be pinned down.

## Sources (accessed 13 Nov 2026)
NASA: EONET API, GIBS/Worldview (NISAR GCOV, HLS, WELD), ASF NISAR Data User Guide, NASA SVS 5661 (NISAR Mozambique floods).
News and agencies: USGS earthquake catalogue · Kathmandu Post · Onlinekhabar · ICIMOD · Al Jazeera · NPR/AP · Spotlight Nepal · Nepal Red Cross · idahonews.com · Elkhorn Media Group · Daily Maverick · EWN · News24 · Mongabay · Euronews · MercoPress · Inside Climate News.
