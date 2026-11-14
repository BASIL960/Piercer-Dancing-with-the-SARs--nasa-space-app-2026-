"""NASA HLS (Landsat + Sentinel-2) over the Jazan lowlands, every date Jun-Nov 2026, on the same 40 m grid as the NISAR coherence.
Saved per date (float16, clouds masked) when at least 30% of the area is clear."""
import sys, os, time, pickle, warnings
sys.path.insert(0, os.path.dirname(__file__)); warnings.filterwarnings("ignore")
import numpy as np, rasterio
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
from hls_pc import catalog, BANDS
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/"
OUT = R + "hls/"; os.makedirs(OUT, exist_ok=True)
g = pickle.load(open(R + "gunw/grid40.pkl", "rb")); BB = [42.50, 16.80, 43.20, 17.85]
WANT = ("red", "green", "blue", "nir", "swir1")


def rd(href, rs, nod):
    with rasterio.open(href) as src:
        with WarpedVRT(src, crs=g["crs"], transform=g["transform"], width=g["width"], height=g["height"], resampling=rs, nodata=nod) as v:
            return v.read(1)


its = []
for c in ["hls2-s30", "hls2-l30"]:
    its += list(catalog().search(collections=[c], bbox=BB, datetime="2026-06-01/2026-11-14", query={"eo:cloud_cover": {"lt": 60}}).items())
bydate = {}
for it in its: bydate.setdefault((it.datetime.date().isoformat(), it.collection_id[-3:]), []).append(it)
print(len(bydate), "date/sensor groups", flush=True)
for (d, sen), group in sorted(bydate.items(), reverse=len(sys.argv) > 1 and sys.argv[1] == 'rev'):
    fn = OUT + f"hls_{d}_{sen}.npz"
    if os.path.exists(fn) or os.path.exists(fn + ".skip"): continue
    t = time.time(); out = {b: np.full((g["height"], g["width"]), np.nan, np.float32) for b in WANT}
    try:
        for it in group:
            fm = rd(it.assets[BANDS[sen]["fmask"]].href, Resampling.nearest, 255)
            bad = (fm == 255) | ((fm >> 1) & 1).astype(bool) | ((fm >> 2) & 1).astype(bool) | ((fm >> 3) & 1).astype(bool)
            for b in WANT:
                a = rd(it.assets[BANDS[sen][b]].href, Resampling.average, -9999).astype(np.float32)
                ok = (a != -9999) & ~bad & np.isnan(out[b]); out[b][ok] = a[ok] * 1e-4
            del fm, bad
    except Exception as e:
        print(d, sen, "ERR", str(e)[:100], flush=True); continue
    v = float(np.isfinite(out["nir"]).mean())
    if v < 0.3: open(fn + ".skip", "w").write("%.2f" % v); print(d, sen, "skip valid %.2f" % v, flush=True); continue
    np.savez_compressed(fn, **{b: out[b].astype(np.float16) for b in WANT})
    print(d, sen, "valid %.2f" % v, "%.0fs" % (time.time() - t), flush=True)
print("DONE")
