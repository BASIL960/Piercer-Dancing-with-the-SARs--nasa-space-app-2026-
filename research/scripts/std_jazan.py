"""Jazan numbers under DATA_STANDARD.md, each at the low / standard / high threshold."""
import os, glob, json, numpy as np, datetime as dt
from scipy import ndimage
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/"
dem = np.load(R + "dem40.npy"); land = dem > 0.5; plain = land & (dem < 250)
out = {"plain_km2_40m": round(float(plain.sum() * 0.0016), 1)}
# ---- C: coherence change, % of plain per pair
ART = {("071", "20260619", "20260701"), ("071", "20260701", "20260713")}
pairs = {}
for tr, fr in [("064", "080"), ("071", "010")]:
    fs = sorted(glob.glob(R + f"gunw/coh_{tr}_{fr}_*.npy")); A = {(os.path.basename(f)[12:20], os.path.basename(f)[21:29]): np.load(f) for f in fs}
    keys = sorted(A); dry = np.nanmax(np.stack([A[k] for k in keys[:3]]), 0)
    for d1, d2 in keys:
        if (tr, d1, d2) in ART: continue
        ch = ndimage.uniform_filter(np.nan_to_num(np.clip(dry - A[(d1, d2)], 0, 0.6)), 3); ok = np.isfinite(A[(d1, d2)]) & plain
        days = (dt.date.fromisoformat(f"{d2[:4]}-{d2[4:6]}-{d2[6:]}") - dt.date.fromisoformat(f"{d1[:4]}-{d1[4:6]}-{d1[6:]}")).days
        pairs[f"{tr}_{d1}_{d2}"] = dict(days=days, valid=round(float(ok.sum() / plain.sum()), 3), **{f"t{th}": round(float((ch > th)[ok].mean() * 100), 1) for th in (0.15, 0.2, 0.25)})
out["coh_pairs"] = pairs
for tr in ("064", "071"):
    for th in ("t0.15", "t0.2", "t0.25"):
        L = [v[th] for k, v in pairs.items() if k.startswith(tr) and k[4:12] >= "20260724" and v["days"] == 12]
        out[f"coh_avg_{tr}_{th}"] = round(float(np.mean(L)), 1)
        out[f"coh_dry_{tr}_{th}"] = [v[th] for k, v in pairs.items() if k.startswith(tr) and k[4:12] < "20260724"]
# ---- B: brightness vs dry median, % of plain brighter / darker
bs = {}
for tr in ("064", "071"):
    fs = sorted(glob.glob(R + f"gcov/gcov_{tr}_*.npz")); HH = {os.path.basename(f)[9:17]: np.load(f)["HHHH"].astype(np.float32) for f in fs}
    dry = np.nanmedian(np.stack([HH[d] for d in sorted(HH) if d <= "20260725"]), 0)
    for d in sorted(HH):
        an = ndimage.uniform_filter(np.nan_to_num(HH[d] - dry), 3)
        bs[f"{tr}_{d}"] = {f"b{th}": round(float((an > th)[plain].mean() * 100), 1) for th in (1.5, 2.0, 2.5)}
        bs[f"{tr}_{d}"]["dark2"] = round(float((an < -2)[plain].mean() * 100), 1)
out["brightness"] = bs
# ---- G+: new green on the plain by 1 Nov, and the green-wave medians, at NDVI rise 0.10 / 0.15 / 0.20
z = np.load(R + "season80.npz"); ND = z["ndvi"].astype(np.float32); dates = list(z["dates"]); dem8 = z["dem"]
dayn = np.array([(dt.date.fromisoformat(d) - dt.date(2026, 6, 1)).days for d in dates]); land8 = dem8 > 0.5; plain8 = land8 & (dem8 < 250)
clear = np.isfinite(ND); june = dayn <= 39
base = np.nanmedian(ND[june], 0); base = np.where(np.isfinite(base), base, np.nanmedian(ND, 0))
for dlt in (0.10, 0.15, 0.20):
    green = clear & (ND > 0.3) & (ND > base + dlt) & land8
    gl = np.zeros_like(green, np.int16); cl = np.zeros_like(green, np.int16)
    for i in range(len(dates) - 2, -1, -1): gl[i] = gl[i + 1] + green[i + 1]; cl[i] = cl[i + 1] + clear[i + 1]
    ok = green & (cl >= 2) & (gl >= 0.6 * cl); up = np.full(base.shape, 999)
    for i in range(len(dates)):
        m = ok[i] & (up == 999) & ~june[i]; up[m] = dayn[i]
    r = dict(new_green_plain_km2_by_1nov=round(float(((up <= 153) & plain8).sum() * 0.0064)),
             share_of_plain=round(float(((up <= 153) & plain8).sum() / plain8.sum() * 100), 1))
    for a, b in [(250, 500), (100, 250), (0.5, 100)]:
        m = land8 & (dem8 >= a) & (dem8 < b) & (up != 999); md = int(np.median(up[m]))
        r[f"median_{a}_{b}"] = (dt.date(2026, 6, 1) + dt.timedelta(days=md)).isoformat()
    out[f"green_d{dlt}"] = r
# ---- radar flagged -> greened cross-check at C 0.15/0.20/0.25 (dawn track, >=2 of 6 wet windows)
print(json.dumps({k: v for k, v in out.items() if k not in ("coh_pairs", "brightness")}, indent=1))
for k in ["064_20260817", "071_20260818", "064_20260910", "071_20260911"]: print("B", k, out["brightness"][k])
json.dump(out, open("C:/Users/B3B3/Desktop/workplase/nasa/research/std_jazan.json", "w"), indent=1)
