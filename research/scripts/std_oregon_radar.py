"""Oregon radar numbers under DATA_STANDARD.md from calibrated NISAR (track 114 D frame 067), 60 m grid."""
import sys, os, glob, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from scipy import ndimage
import importlib.util
spec = importlib.util.spec_from_file_location("so", os.path.join(os.path.dirname(__file__), "std_oregon_lib.py"))
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/oregon/raw/"; N = R + "nisar/"
from std_oregon_lib import masks
P, B, dn, ok, ctrl, pre, load, nbr = masks()
hot = B & (dn > 0.44); light = B & (dn >= 0.10) & (dn < 0.27); inside_unb = P & ok & (dn < 0.05)
out = {}
# 29 Jul bounds: burned where visible, plus finally-burned ground that was hidden that day
x = nbr(load("hls60_2026-07-29.npz")); v = np.isfinite(x) & ok
seen = (v & ((pre - x) >= 0.10) & P).sum(); hidden_final = (B & ~v).sum()
out["jul29_bounds_pct_of_final"] = [round(float(seen / B.sum() * 100), 1), round(float((seen + hidden_final) / B.sum() * 100), 1)]
# C: coherence change vs the pre-fire baseline (max of the two pre-fire 12-day pairs)
C = {os.path.basename(f)[4:21]: np.load(f) for f in sorted(glob.glob(N + "coh_*.npy"))}
base = np.nanmax(np.stack([C["20260622_20260704"], C["20260704_20260716"]]), 0)
out["coh"] = {}
for k in sorted(C):
    ch = ndimage.uniform_filter(np.nan_to_num(np.clip(base - C[k], 0, 1)), 3); okc = np.isfinite(C[k])
    out["coh"][k] = {f"t{t}": {n: round(float((ch > t)[m & okc].mean() * 100), 1) for n, m in [("burned", B), ("hot", hot), ("light", light), ("control", ctrl)]} for t in (0.15, 0.2, 0.25)}
    out["coh"][k]["median"] = {n: round(float(np.nanmedian(C[k][m])), 2) for n, m in [("burned", B), ("control", ctrl)]}
# B: HV and HH change vs the pre-fire median, by group; share darker than -2 dB (and -1.5 / -2.5)
G = {os.path.basename(f)[5:13]: {p: v.astype(np.float32) for p, v in np.load(f).items()} for f in sorted(glob.glob(N + "gcov_*.npz"))}
pre_d = [d for d in G if d <= "20260716"]
out["gcov_pre_dates"] = pre_d
for pol in ("HVHV", "HHHH"):
    med = np.nanmedian(np.stack([G[d][pol] for d in pre_d]), 0); res = {}
    for d in sorted(G):
        if d in pre_d: continue
        dd = ndimage.uniform_filter(np.nan_to_num(G[d][pol] - med), 3)
        res[d] = {n: dict(median_db=round(float(np.median(dd[m])), 2), pct_of_pre=round(float(10 ** (np.median(dd[m]) / 10) * 100)),
                          **{f"darker{t}": round(float((dd < -t)[m].mean() * 100), 1) for t in (1.5, 2.0, 2.5)}) for n, m in [("hot", hot), ("light", light), ("burned", B), ("control", ctrl)]}
    out[pol] = res
json.dump(out, open("C:/Users/B3B3/Desktop/workplase/nasa/research/std_oregon_radar.json", "w"), indent=1)
print("29 Jul bounds", out["jul29_bounds_pct_of_final"])
for k, v in out["coh"].items(): print("coh", k, v["t0.2"], "| 0.15", v["t0.15"]["burned"], v["t0.15"]["control"], "| 0.25", v["t0.25"]["burned"], v["t0.25"]["control"])
for pol in ("HVHV",):
    for d, v in out[pol].items(): print(pol, d, {n: (x["median_db"], x["pct_of_pre"], x["darker2.0"]) for n, x in v.items()})
