"""NISAR L2 GUNW coherence over the Jazan lowlands (all 12-day pairs Jul-Oct 2026, three tracks), resampled to a 40 m UTM grid.
Low coherence between two passes = the ground surface changed (water flow, wet soil, ploughing, sediment moved)."""
import sys, os, re, time, pickle, warnings
sys.path.insert(0, os.path.dirname(__file__)); warnings.filterwarnings("ignore")
import truststore; truststore.inject_into_ssl()
import numpy as np, h5py, earthaccess
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.transform import from_origin
from hls_pc import grid
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/gunw/"; os.makedirs(R, exist_ok=True)
BB = [42.50, 16.80, 43.20, 17.85]
g = grid(BB, 40, crs="EPSG:32638"); pickle.dump(g, open(R + "grid40.pkl", "wb"))
earthaccess.login(strategy="netrc")
found = earthaccess.search_data(short_name="NISAR_L2_GUNW_PROVISIONAL_V1", bounding_box=tuple(BB), temporal=("2026-06-01", "2026-11-14"))
base = "science/LSAR/GUNW/grids/frequencyA/wrappedInterferogram/"
for gr in found:
    ur = gr["umm"]["GranuleUR"]
    m = re.search(r"GUNW_\d+_(\d+)_([AD])_(\d+)_\d+_\d+_\w\w_(\d{8})T\d+_\d+T\d+_(\d{8})T", ur)
    if not m: continue
    track, ad, frame, d1, d2 = m.groups()
    if (track, frame) not in {("064", "080"), ("071", "010")}: continue   # the two frames that cover the whole area
    fn = R + f"coh_{track}_{frame}_{d1}_{d2}.npy"
    if os.path.exists(fn): continue
    t = time.time()
    try:
        h = h5py.File(earthaccess.open([gr])[0], "r")
        epsg = int(h[base + "projection"].attrs["epsg_code"])
        x0, s, x1, n = transform_bounds("EPSG:4326", f"EPSG:{epsg}", *BB)
        xs = h[base + "xCoordinates"][()]; ys = h[base + "yCoordinates"][()]
        c0, c1 = max(np.searchsorted(xs, x0) - 2, 0), np.searchsorted(xs, x1) + 2
        r0, r1 = max(np.searchsorted(-ys, -n) - 2, 0), np.searchsorted(-ys, -s) + 2
        if c1 - c0 < 10 or r1 - r0 < 10: print(ur[:60], "no overlap"); continue
        coh = h[base + "HH/coherenceMagnitude"][r0:r1, c0:c1].astype(np.float32)
        coh[(coh <= 0) | ~np.isfinite(coh)] = np.nan
        dx = float(xs[1] - xs[0]); dy = float(ys[0] - ys[1])
        dst = np.full((g["height"], g["width"]), np.nan, np.float32)
        reproject(coh, dst, src_transform=from_origin(xs[c0] - dx / 2, ys[r0] + dy / 2, dx, dy), src_crs=f"EPSG:{epsg}",
                  dst_transform=g["transform"], dst_crs=g["crs"], resampling=Resampling.average, src_nodata=np.nan, dst_nodata=np.nan)
        np.save(fn, dst); h.close(); del coh, h
        print(track, ad, frame, d1, d2, "valid %.2f" % np.isfinite(dst).mean(), "median %.2f" % np.nanmedian(dst), "%.0fs" % (time.time() - t), flush=True)
    except Exception as e:
        print(ur[:70], "ERR", str(e)[:120], flush=True)
print("DONE")
