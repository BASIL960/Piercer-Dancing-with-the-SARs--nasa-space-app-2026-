"""Download every HLS scene over the Bhote Koshi / Gyirong valley (Mar-Nov 2026) at 30 m, cloud-masked."""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import hls_pc
from hls_pc import catalog

BB = [85.15, 28.05, 85.60, 28.65]          # lon/lat: Syabrubesi/Dhunche (S) to Gyirong/Tibet (N)
CRS = "EPSG:32645"
OUT = "C:/Users/B3B3/Desktop/workplase/nasa/research/nepal/raw/"
os.makedirs(OUT, exist_ok=True)
hls_pc.grid.__defaults__ = (CRS,)           # UTM 45N for Nepal

items = []
for sensor in ("s30", "l30"):
    for it in catalog().search(collections=[f"hls2-{sensor}"], bbox=BB, datetime="2026-03-01/2026-11-14").items():
        items.append((it.datetime.date().isoformat(), sensor, it.properties.get("eo:cloud_cover", 100)))
days = {}
for d, s, cc in items:
    days.setdefault((d, s), []).append(cc)
todo = sorted(k for k, v in days.items() if min(v) < 85)
print(len(items), "items;", len(todo), "date/sensor pairs to fetch", flush=True)
log = []
for d, s in todo:
    fn = OUT + f"hls30_{d}_{s}.npz"
    if os.path.exists(fn):
        continue
    t = time.time()
    try:
        m, g = hls_pc.mosaic(d, s, BB, res=30)
    except Exception as e:
        print(d, s, "ERR", e, flush=True); continue
    if m is None:
        continue
    valid = float(np.isfinite(m["nir"]).mean())
    log.append(dict(date=d, sensor=s, valid=round(valid, 3)))
    if valid > 0.05:
        np.savez_compressed(fn, **{k: v.astype(np.float16) for k, v in m.items()})
    print(d, s, f"valid {valid:.2f}", f"{time.time()-t:.0f}s", flush=True)
json.dump(log, open(OUT + "hls_log.json", "w"), indent=0)
print("DONE")
