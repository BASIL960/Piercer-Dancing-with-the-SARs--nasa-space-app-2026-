"""Stack every HLS date at 80 m: NDVI and MNDWI (water index) per date, plus a clear-view mask. Writes saudi/raw/season80.npz."""
import os, glob, numpy as np, pickle
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/"
g = pickle.load(open(R + "gunw/grid40.pkl", "rb")); W, H = g["width"], g["height"]; K = 2; W2, H2 = W // K, H // K
def down(a):
    a = a[:H2 * K, :W2 * K]
    with np.errstate(all="ignore"): return np.nanmean(a.reshape(H2, K, W2, K), axis=(1, 3))
hs = sorted(f for f in glob.glob(R + "hls/hls_*.npz"))
bydate = {}
for f in hs: bydate.setdefault(os.path.basename(f)[4:14], []).append(f)
dates = sorted(bydate); N = len(dates)
NDVI = np.full((N, H2, W2), np.nan, np.float16); MNDWI = np.full((N, H2, W2), np.nan, np.float16)
for i, d in enumerate(dates):
    m = None
    for f in bydate[d]:
        z = {k: v.astype(np.float32) for k, v in np.load(f).items() if k in ("nir", "red", "green", "swir1")}
        if m is None: m = z
        else:
            for k in m: h_ = ~np.isfinite(m[k]); m[k][h_] = z[k][h_]
    with np.errstate(all="ignore"):
        NDVI[i] = down((m["nir"] - m["red"]) / (m["nir"] + m["red"] + 1e-6))
        MNDWI[i] = down((m["green"] - m["swir1"]) / (m["green"] + m["swir1"] + 1e-6))
    print(i, d, flush=True)
dem = np.load(R + "dem40.npy"); dem2 = down(dem.astype(np.float32))
np.savez(R + "season80.npz", ndvi=NDVI, mndwi=MNDWI, dates=np.array(dates), dem=dem2.astype(np.float32))
