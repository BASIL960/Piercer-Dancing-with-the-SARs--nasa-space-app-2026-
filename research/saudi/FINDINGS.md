# Jazan: the industrial city build-out, 1987–2026

**Map:** https://claude.ai/artifact/FnjnxBGHx4b6knocDZTmVn (private until shared). Source: `saudi/web/`.

## Why this event
- Qassim and the other Jazan options were each about one year of change, or farms that hardly grow.
- This one is 40 years of Landsat over the same 27 km of shore: bare coast, then a port, a refinery and a city road grid.
- NISAR passes this coast about every 6 days in 2026 (33 dates Jun–Nov), so the radar layer is solid.

## Method
**Data**
- Landsat C2 L2, 1987–2026.
- Each year is the median of 2–4 clear passes, 143 scenes in total.

**Change detection**
- Each year is first matched to the 1987–2004 baseline by band percentiles. This removes sensor differences (Landsat 5 vs 8) and wet/dry year differences.
- A 30 m pixel counts as changed when:
  - its rms band difference is above max(0.04, 2.5 × its own baseline noise), and
  - it stays changed in ≥80% of later years, with at least 3 later observations.
- Exclusions:
  - pixels that are water in both the baseline and the final years
  - farm plots east of 42.47° E
  - specks under 20 px

**Change type** comes from MNDWI, comparing the baseline with the final years:
- water where there was land = harbour dug
- land where there was sea = land from the sea
- anything else = built or cleared ground

**Within-year growth order is interpolated.** A BFS spreads outward from the area that was already changed. Only the year itself is measured.

## Results
**Ground transformed by 2026: 32.4 km²**
- 27.2 km² built or cleared
- 4.4 km² land from the sea
- 0.9 km² harbour dug

This is conservative:
- Faint new roads inside the city grid are partly missed.
- The official city area is 266 km² (Saudipedia), most of it still empty plots.

**Timeline seen on the photos**
- **2006–2009:** rectangular ponds on the shore south of the site (most likely a fish farm; not the city).
- **2011:** a blue-roofed construction camp and access roads appear.
- **2013:** the refinery plot is being graded.
- **2014:** the port starts as sand fill pushed into the sea.
- **2016:** biggest single-year jump, together with 2014 and 2022.

**NISAR 2026** (median of 20 GCOV passes): the refinery's tanks and process units are the brightest radar targets on the coast, and the city's road grid is clearly outlined.

## Dated facts used in the page
- **Nov 2006:** Jazan Economic City announced, $26.7 bn plan (Financial Express, via Wikipedia).
- **Jul 2015:** Royal Commission for Jubail and Yanbu takes charge (Saudipedia).
- **Oct–Nov 2019:** first crude cargoes arrive for commissioning (S&P Global Platts; MEES).
- **Sep 2020:** first product cargo, 475,000 bbl of gasoil, to Singapore (Platts/Kpler).
- **2021:** refinery start-up, 400,000 b/d design; IGCC power plant up to 3.8 GW; about $21 bn (Aramco; MEES).

## Second Jazan story (data downloaded, not built into a page)
**Baysh Dam reservoir** (17.666 N, 42.658 E), one Landsat scene per month, 2000–2026. Water area by MNDWI:
- **2000–2008:** about 0 km² (dam built 2003–2009).
- **Sep 2009:** first water.
- **2011–2014:** about 5–5.6 km².
- **2024:** about 3–3.7 km² (gates opened Aug 2024).
- **2026:** down to about 1.4–2.3 km².

Some summer scenes drop to about 0 and still need checking against haze.

## Scripts (`research/scripts/`)
- `landsat_jazan.py`, `landsat_jcpdi_more.py`: downloads
- `jcpdi_change.py`: year-of-change raster
- `saudi_context.py`: 120 m context mosaic
- `jazan_prep.py`: web data
