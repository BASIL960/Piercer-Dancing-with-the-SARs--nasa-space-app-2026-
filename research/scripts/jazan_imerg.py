"""Exact NASA GPM IMERG V07 (Late run) rain over the Jazan box, read remotely from GES DISC with earthaccess + h5py.
Box: lat 16.4-18.6, lon 41.9-43.6 (0.1 deg cells, 22 rows north->south x 17 cols).
  daily  : GPM_3IMERGDL, 1 Jun - 13 Nov 2026
  half-h : GPM_3IMERGHHL, the 6.5 h before each NISAR pass and every half hour of selected storm / alert days."""
import truststore; truststore.inject_into_ssl()
import earthaccess, h5py, numpy as np, json, re, sys, os, datetime as dt
from concurrent.futures import ThreadPoolExecutor
OUT = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/imerg/"
earthaccess.login(strategy="netrc")
LAT0, LAT1, LON0, LON1 = 16.4, 18.6, 41.9, 43.6

def cut(h, grp):
    lon = h[grp + "lon"][()]; lat = h[grp + "lat"][()]
    i = np.where((lon > LON0) & (lon < LON1))[0]; j = np.where((lat > LAT0) & (lat < LAT1))[0]
    p = h[grp + "precipitation"][0, i[0]:i[-1] + 1, j[0]:j[-1] + 1].astype(float)   # [lon, lat]
    p[p < 0] = np.nan
    return np.round(p.T[::-1], 2)                                                        # rows north->south

def fetch(g, grp, key):
    for attempt in range(4):
        try:
            f = earthaccess.open([g], show_progress=False)[0]
            with h5py.File(f, "r") as h:
                units = h[grp + "precipitation"].attrs.get("units", b"")
                return key, cut(h, grp).tolist(), units.decode() if isinstance(units, bytes) else str(units)
        except Exception as e:
            err = e
    print("FAIL", key, err, flush=True); return key, None, None

mode = sys.argv[1]
if mode == "daily":
    r = earthaccess.search_data(short_name="GPM_3IMERGDL", temporal=("2026-06-01", "2026-11-13T23:59:59"))
    jobs = [(g, "", re.search(r"3IMERG\.(\d{8})", g["umm"]["GranuleUR"]).group(1)) for g in r]
    fn = OUT + "daily.json"
else:
    passes = {"064": ["2026-06-18", "2026-06-30", "2026-07-12", "2026-07-24", "2026-08-17", "2026-08-29", "2026-09-10", "2026-09-22", "2026-10-04", "2026-10-16", "2026-10-28"],
              "071": ["2026-06-19", "2026-07-01", "2026-07-13", "2026-07-25", "2026-08-18", "2026-08-30", "2026-09-11", "2026-09-23", "2026-10-05", "2026-10-17", "2026-10-29"]}
    hh = {"064": 15, "071": 2}
    want = set()
    for tr, ds in passes.items():
        for d in ds:
            t0 = dt.datetime.fromisoformat(d).replace(hour=hh[tr])
            for k in range(13): want.add((t0 - dt.timedelta(minutes=30 * k)).strftime("%Y%m%d-S%H%M%S"))
    days = sys.argv[2].split(",")
    jobs, fn = [], OUT + "halfhour.json"
    spans = sorted({w[:8] for w in want} | {d.replace("-", "") for d in days})
    for d8 in spans:
        d = f"{d8[:4]}-{d8[4:6]}-{d8[6:]}"
        r = earthaccess.search_data(short_name="GPM_3IMERGHHL", temporal=(d, d + "T23:59:59"))
        for g in r:
            k = re.search(r"3IMERG\.(\d{8}-S\d{6})", g["umm"]["GranuleUR"]).group(1)
            if k in want or d in days: jobs.append((g, "Grid/", k))
done = json.load(open(fn)) if os.path.exists(fn) else {}
jobs = [j for j in jobs if j[2] not in done]
print(mode, "to fetch", len(jobs), flush=True)
with ThreadPoolExecutor(12) as ex:
    for n, (k, grid, u) in enumerate(ex.map(lambda j: fetch(*j), jobs)):
        if grid is not None: done[k] = dict(grid=grid, units=u)
        if n % 20 == 0:
            print(n, k, u, flush=True); json.dump(done, open(fn, "w"))
json.dump(done, open(fn, "w")); print("done", len(done), flush=True)
