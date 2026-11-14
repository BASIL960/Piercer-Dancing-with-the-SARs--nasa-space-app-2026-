"""Jazan radar->greening cross-check under DATA_STANDARD.md, at coherence-drop and NDVI thresholds low/std/high.
Flagged = dawn-track coherence change (rule C) in at least 3 of the 6 rainy-season windows."""
import os, glob, json, numpy as np
from scipy import ndimage
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/"
dem = np.load(R + "dem40.npy"); plain = (dem > 0.5) & (dem < 250); H, W = dem.shape
fs = sorted(glob.glob(R + "gunw/coh_071_010_*.npy")); A = {(os.path.basename(f)[12:20], os.path.basename(f)[21:29]): np.load(f) for f in fs}
keys = sorted(A); dry = np.nanmax(np.stack([A[k] for k in keys[:3]]), 0)
ART = {("20260619", "20260701"), ("20260701", "20260713")}
wet = [k for k in keys if k[0] >= "20260724" and k not in ART]
hs = sorted(glob.glob(R + "hls/hls_*.npz"))
def ndvi_comp(d0, d1):
    fs_ = [f for f in hs if d0 <= os.path.basename(f)[4:14] <= d1]; out = np.full((H, W), np.nan, np.float32)
    for r0 in range(0, H, 400):
        st = []
        for f in fs_:
            z = np.load(f); nir = z["nir"][r0:r0 + 400].astype(np.float32); red = z["red"][r0:r0 + 400].astype(np.float32); st.append((nir - red) / (nir + red + 1e-6))
        out[r0:r0 + 400] = np.nanmedian(np.stack(st), 0)
    return out
nj, no = ndvi_comp("2026-06-01", "2026-07-10"), ndvi_comp("2026-10-15", "2026-11-14")
ok = plain & np.isfinite(nj) & np.isfinite(no)
res = {"n_windows": len(wet)}
for t in (0.15, 0.2, 0.25):
    cnt = np.zeros((H, W), np.int16)
    for k in wet:
        ch = ndimage.uniform_filter(np.nan_to_num(np.clip(dry - A[k], 0, 0.6)), 3); cnt += (ch > t) & np.isfinite(A[k])
    fl = cnt >= 3
    for dlt in (0.10, 0.15, 0.20):
        gr = (no - nj > dlt) & (no > 0.3)
        res[f"c{t}_n{dlt}"] = dict(flagged_share=round(float(fl[ok].mean() * 100), 1), green_if_flagged=round(float(gr[ok & fl].mean() * 100), 1), green_if_not=round(float(gr[ok & ~fl].mean() * 100), 1))
        print(t, dlt, res[f"c{t}_n{dlt}"], flush=True)
json.dump(res, open("C:/Users/B3B3/Desktop/workplase/nasa/research/std_jazan_xcheck.json", "w"), indent=1)
