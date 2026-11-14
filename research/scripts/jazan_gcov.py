"""NISAR L2 GCOV radar backscatter (gamma0 HH and HV) over the Jazan lowlands, every pass Jun-Nov 2026, onto the 40 m grid.
HH responds to soil moisture/roughness and standing water (very dark); HV responds to vegetation volume."""
import sys, os, re, time, pickle, warnings
sys.path.insert(0, os.path.dirname(__file__)); warnings.filterwarnings("ignore")
import truststore; truststore.inject_into_ssl()
import numpy as np, h5py, earthaccess
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.transform import from_origin
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/"
OUT = R + "gcov/"; os.makedirs(OUT, exist_ok=True)
g = pickle.load(open(R + "gunw/grid40.pkl", "rb")); BB = [42.50, 16.80, 43.20, 17.85]
earthaccess.login(strategy="netrc")
found = []
for sn in ["NISAR_L2_GCOV_PROVISIONAL_V1", "NISAR_L2_GCOV_V1"]:
    found += earthaccess.search_data(short_name=sn, bounding_box=tuple(BB), temporal=("2026-06-01", "2026-11-14"))
base = "science/LSAR/GCOV/grids/frequencyA/"
for gr in sorted(found, key=lambda x: x["umm"]["GranuleUR"]):
    ur = gr["umm"]["GranuleUR"]
    m = re.search(r"GCOV_\d+_(\d+)_([AD])_(\d+)_(\d+)_(\w{4})_\w_(\d{8})T", ur)
    if not m: continue
    track, ad, frame, mode, pol, d = m.groups()
    if (track, frame) not in {("064", "080"), ("071", "010")} or not mode.startswith("4"): continue
    if len(sys.argv) > 1 and d not in sys.argv[1:]: continue
    fn = OUT + f"gcov_{track}_{d}.npz"
    if os.path.exists(fn): continue
    t = time.time()
    try:
        h = h5py.File(earthaccess.open([gr])[0], "r")
        epsg = int(h[base + "projection"].attrs["epsg_code"])
        x0, s, x1, n = transform_bounds("EPSG:4326", f"EPSG:{epsg}", *BB)
        xs = h[base + "xCoordinates"][()]; ys = h[base + "yCoordinates"][()]
        c0, c1 = max(np.searchsorted(xs, x0) - 2, 0), np.searchsorted(xs, x1) + 2
        r0, r1 = max(np.searchsorted(-ys, -n) - 2, 0), np.searchsorted(-ys, -s) + 2
        dx = float(xs[1] - xs[0]); dy = float(ys[0] - ys[1]); res = {}
        for p in ["HHHH", "HVHV"]:
            if base + p not in h: continue
            a = h[base + p][r0:r1, c0:c1].astype(np.float32); a[(a <= 0) | ~np.isfinite(a)] = np.nan
            dst = np.full((g["height"], g["width"]), np.nan, np.float32)
            reproject(a, dst, src_transform=from_origin(xs[c0] - dx / 2, ys[r0] + dy / 2, dx, dy), src_crs=f"EPSG:{epsg}",
                      dst_transform=g["transform"], dst_crs=g["crs"], resampling=Resampling.average, src_nodata=np.nan, dst_nodata=np.nan)
            res[p] = (10 * np.log10(dst)).astype(np.float16); del a
        h.close()
        if not res: print(ur[:70], "no pol"); continue
        np.savez_compressed(fn, **res)
        print(track, ad, d, list(res), "valid %.2f" % np.isfinite(res["HHHH"].astype(np.float32)).mean(), "%.0fs" % (time.time() - t), flush=True)
    except Exception as e:
        print(ur[:70], "ERR", str(e)[:150], flush=True)
print("DONE")
