"""Oregon numbers under DATA_STANDARD.md. Optical at 60 m (pre/post median composites of every clear HLS date) and 30 m (single dates)."""
import sys, os, glob, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from hls_pc import grid
from rasterio import features
from rasterio.warp import transform_geom
from scipy import ndimage
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/oregon/raw/"
BB = [-117.45, 42.0, -116.3, 42.95]
def perim(g):
    gj = json.load(open(R + "big_grass_perimeter.geojson"))["features"][0]["geometry"]
    # the NIFC file stores unburned islands as separate polygons inside the main one: count them out (even-odd),
    # which reproduces the official 575,163 ac to 0.1%
    from rasterio.enums import MergeAlg
    shp = [(transform_geom("EPSG:4326", g["crs"], {"type": "Polygon", "coordinates": [p[0]]}), 1) for p in gj["coordinates"]]
    cnt = features.rasterize(shp, out_shape=(g["height"], g["width"]), transform=g["transform"], merge_alg=MergeAlg.add, dtype="uint8")
    return (cnt % 2).astype(bool)
def load(n): return {k: v.astype(np.float32) for k, v in np.load(R + n).items()}
nbr = lambda m: (m["nir"] - m["swir2"]) / (m["nir"] + m["swir2"] + 1e-6)
g60 = grid(BB, 60); P = perim(g60); A60 = 0.0036
out = dict(perimeter_km2_60m=round(float(P.sum() * A60), 1))
pre_d = ["2026-06-14", "2026-07-03", "2026-07-09"]; post_d = ["2026-08-23", "2026-08-30"]
def comp(ds):
    st = np.stack([nbr(load(f"hls60_{d}.npz")) for d in ds]); return np.nanmedian(st, 0)
pre, post = comp(pre_d), comp(post_d)
dn = pre - post; ok = np.isfinite(dn)
out["valid_in_perimeter"] = round(float(ok[P].mean()), 3)
for t in (0.075, 0.10, 0.125):
    b = ok & (dn >= t) & P
    out[f"burned_t{t}"] = dict(km2=round(float(b.sum() * A60)), share_of_perimeter=round(float(b.sum() / P.sum() * 100), 1))
b = ok & (dn >= 0.10) & P
sev = {}
for name, lo, hi in [("low", 0.10, 0.27), ("moderate_low", 0.27, 0.44), ("moderate_high", 0.44, 0.66), ("high", 0.66, 9)]:
    sev[name] = round(float((b & (dn >= lo) & (dn < hi)).sum() / b.sum() * 100), 1)
out["severity_share_of_burned"] = sev
# outside control (2-10 km outside the perimeter): how much "burned" signal the rule finds where nothing burned
Pall = ndimage.binary_fill_holes(P); dist = ndimage.distance_transform_edt(~Pall) * 60; ctrl = (dist > 2000) & (dist <= 10000)
out["control_flagged_pct"] = round(float((ok & (dn >= 0.10))[ctrl].mean() * 100), 2)
# burned area at each clear date (vs the pre composite), only where valid; and when half the final area was reached
series = []
final = b.sum()
for f in sorted(glob.glob(R + "hls60_*.npz")):
    d = os.path.basename(f)[6:16]
    if d <= "2026-07-09": continue
    x = nbr(load(f"hls60_{d}.npz")); v = np.isfinite(x) & ok
    bb = v & ((pre - x) >= 0.10) & P
    series.append(dict(date=d, burned_km2=round(float(bb.sum() * A60)), valid_in_perimeter=round(float(v[P].mean()), 3), share_of_final=round(float(bb.sum() / final * 100), 1)))
out["series"] = series
json.dump(out, open("C:/Users/B3B3/Desktop/workplase/nasa/research/std_oregon_optical.json", "w"), indent=1)
print(json.dumps({k: v for k, v in out.items() if k != "series"}, indent=1))
for s in series: print(s)
