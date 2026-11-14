"""Calibrated NISAR over the Big Grass Fire: track 114 D frame 067 (covers the whole perimeter), 60 m UTM 11N grid
(same grid as the hls60 files). GUNW 12-day coherence (all pairs) and GCOV gamma0 HH/HV in dB (every pass)."""
import sys, os, re, time, pickle, warnings
sys.path.insert(0, os.path.dirname(__file__)); warnings.filterwarnings("ignore")
import truststore; truststore.inject_into_ssl()
import numpy as np, h5py, earthaccess
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.transform import from_origin
from hls_pc import grid
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/oregon/raw/nisar/"; os.makedirs(R, exist_ok=True)
BB = [-117.45, 42.0, -116.3, 42.95]
g = grid(BB, 60); pickle.dump(g, open(R + "grid60.pkl", "wb"))
earthaccess.login(strategy="netrc")
TR, FR = "114", "067"

def put(h, base, path):
    epsg = int(h[base + "projection"].attrs["epsg_code"])
    x0, s, x1, n = transform_bounds("EPSG:4326", f"EPSG:{epsg}", *BB)
    xs = h[base + "xCoordinates"][()]; ys = h[base + "yCoordinates"][()]
    c0, c1 = max(np.searchsorted(xs, x0) - 2, 0), np.searchsorted(xs, x1) + 2
    r0, r1 = max(np.searchsorted(-ys, -n) - 2, 0), np.searchsorted(-ys, -s) + 2
    a = h[base + path][r0:r1, c0:c1].astype(np.float32); a[(a <= 0) | ~np.isfinite(a)] = np.nan
    dx = float(xs[1] - xs[0]); dy = float(ys[0] - ys[1])
    dst = np.full((g["height"], g["width"]), np.nan, np.float32)
    reproject(a, dst, src_transform=from_origin(xs[c0] - dx / 2, ys[r0] + dy / 2, dx, dy), src_crs=f"EPSG:{epsg}",
              dst_transform=g["transform"], dst_crs=g["crs"], resampling=Resampling.average, src_nodata=np.nan, dst_nodata=np.nan)
    return dst

for sn in ["NISAR_L2_GUNW_PROVISIONAL_V1", "NISAR_L2_GCOV_PROVISIONAL_V1", "NISAR_L2_GCOV_V1"]:
    for gr in earthaccess.search_data(short_name=sn, bounding_box=tuple(BB), temporal=("2026-06-01", "2026-11-14")):
        ur = gr["umm"]["GranuleUR"]
        if f"_{TR}_D_{FR}_" not in ur: continue
        ds = re.findall(r"_(\d{8})T", ur)
        gunw = "GUNW" in sn
        fn = R + (f"coh_{ds[0]}_{ds[2] if len(ds) > 2 else ds[1]}.npy" if gunw else f"gcov_{ds[0]}.npz")
        if os.path.exists(fn): continue
        t = time.time()
        try:
            h = h5py.File(earthaccess.open([gr], show_progress=False)[0], "r")
            if gunw:
                base = "science/LSAR/GUNW/grids/frequencyA/wrappedInterferogram/"
                np.save(fn, put(h, base, "HH/coherenceMagnitude"))
            else:
                base = "science/LSAR/GCOV/grids/frequencyA/"
                np.savez_compressed(fn, **{p: (10 * np.log10(put(h, base, p))).astype(np.float16) for p in ["HHHH", "HVHV"] if base + p in h})
            h.close(); print(os.path.basename(fn), ur[-60:], "%.0fs" % (time.time() - t), flush=True)
        except Exception as e:
            print(ur[:80], "ERR", str(e)[:150], flush=True)
print("DONE")
