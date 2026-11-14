"""Robustness of the Jazan page's 'new green on the plain by 1 Nov' (green-up and not yet green-down) at NDVI rise 0.10/0.15/0.20."""
import numpy as np, json, datetime as dt
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/"
z = np.load(R + "season80.npz"); ND = z["ndvi"].astype(np.float32); dates = list(z["dates"]); dem = z["dem"]
dayn = np.array([(dt.date.fromisoformat(d) - dt.date(2026, 6, 1)).days for d in dates])
N, H, W = ND.shape; land = dem > 0.5; plain = land & (dem < 250); clear = np.isfinite(ND); june = dayn <= 39
with np.errstate(all="ignore"): base = np.nanmedian(ND[june], 0)
base = np.where(np.isfinite(base), base, np.nanmedian(ND, 0))
out = {}
for dlt in (0.10, 0.15, 0.20):
    green = clear & (ND > 0.3) & (ND > base + dlt) & land
    gl = np.zeros_like(green, np.int16); cl = np.zeros_like(green, np.int16)
    for i in range(N - 2, -1, -1): gl[i] = gl[i + 1] + green[i + 1]; cl[i] = cl[i + 1] + clear[i + 1]
    ok = green & (cl >= 2) & (gl >= 0.6 * cl)
    up = np.full((H, W), 255, np.uint8); dn = np.full((H, W), 255, np.uint8)
    for i in range(N):
        m = ok[i] & (up == 255) & ~june[i]; up[m] = dayn[i]
    for i in range(N):
        m = (up != 255) & (dayn[i] > up) & clear[i] & ~green[i] & (gl[i] < 0.3 * np.maximum(cl[i], 1)) & (cl[i] >= 1) & (dn == 255); dn[m] = dayn[i]
    g = (up <= 153) & ((dn == 255) | (dn > 153)) & plain
    med = {}
    for lo, hi in ((0.5, 100), (100, 250), (250, 500)):
        sel = (up != 255) & land & (dem >= lo) & (dem < hi)
        med[f"{int(lo)}-{hi}"] = str(dt.date(2026, 6, 1) + dt.timedelta(int(np.median(up[sel])))) if sel.any() else None
    out[str(dlt)] = dict(present_km2=round(float(g.sum() * 0.0064)), pct_plain=round(float(g.sum() / plain.sum() * 100), 1), median_upday=med)
    print(dlt, out[str(dlt)])
json.dump(out, open("../std_jazan_green.json", "w"), indent=1)
