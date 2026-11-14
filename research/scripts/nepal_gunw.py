"""NISAR L2 GUNW coherence subsets over the Bhote Koshi valley (track 098 ascending, every 12-day pair Jul-Oct 2026),
resampled onto the 30 m HLS grid. Low coherence between two dates = the ground surface changed (scour, debris, water)."""
import sys, os, pickle, re, time, warnings
sys.path.insert(0, os.path.dirname(__file__)); warnings.filterwarnings("ignore")
import truststore; truststore.inject_into_ssl()
import numpy as np, h5py, earthaccess
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_origin

R = "C:/Users/B3B3/Desktop/workplase/nasa/research/nepal/raw/"
g = pickle.load(open(R + "grid30.pkl", "rb")); T = g["transform"]
x0, y1 = T.c, T.f; x1 = x0 + g["width"] * 30; y0 = y1 - g["height"] * 30
earthaccess.login(strategy="netrc")
found = []
for sn in ["NISAR_L2_GUNW_PROVISIONAL_V1", "NISAR_L2_GUNW_V1"]:
    try:
        found += earthaccess.search_data(short_name=sn, bounding_box=(85.30, 28.15, 85.45, 28.40), temporal=("2026-06-15", "2026-11-14"))
    except Exception as e:
        print(sn, "search failed", e)
seen = set()
for gr in found:
    ur = gr["umm"]["GranuleUR"]
    m = re.search(r"GUNW_\d+_(\d+)_([AD])_\d+_\d+_\d+_\w\w_(\d{8})T\d+_\d+T\d+_(\d{8})T", ur)
    if not m: continue
    track, ad, d1, d2 = m.groups()
    if track != "098": continue
    key = (d1, d2)
    if key in seen: continue
    seen.add(key)
    fn = R + f"coh_098_{d1}_{d2}.npy"
    if os.path.exists(fn): continue
    t = time.time()
    h = h5py.File(earthaccess.open([gr])[0], "r")
    base = "science/LSAR/GUNW/grids/frequencyA/wrappedInterferogram/"
    xs = h[base + "xCoordinates"][()]; ys = h[base + "yCoordinates"][()]
    c0, c1 = np.searchsorted(xs, x0) - 2, np.searchsorted(xs, x1) + 2
    r0, r1 = np.searchsorted(-ys, -y1) - 2, np.searchsorted(-ys, -y0) + 2
    c0, r0 = max(c0, 0), max(r0, 0)
    coh = h[base + "HH/coherenceMagnitude"][r0:r1, c0:c1].astype(np.float32)
    coh[(coh <= 0) | ~np.isfinite(coh)] = np.nan
    dst = np.full((g["height"], g["width"]), np.nan, np.float32)
    reproject(coh, dst, src_transform=from_origin(xs[c0] - 10, ys[r0] + 10, 20, 20), src_crs=g["crs"], dst_transform=T, dst_crs=g["crs"],
              resampling=Resampling.average, src_nodata=np.nan, dst_nodata=np.nan)
    np.save(fn, dst)
    print(track, ad, d1, d2, "valid %.2f" % np.isfinite(dst).mean(), "median coh %.2f" % np.nanmedian(dst), "%.0fs" % (time.time() - t), flush=True)
print("DONE")
