"""Per-pixel season products at 80 m from the HLS stack (real observations; dates are the first clear photo showing the change):
  green-up day : first clear date where NDVI > 0.3 and > June baseline + 0.15, and >= 60% of the later clear photos agree (>= 2 later photos)
  green-down   : first clear date after green-up where it is no longer green and < 30% of later clear photos are green
  water        : MNDWI > 0.1; per date 'water' for animation, plus 'permanent' (water in >= 60% of June photos)."""
import numpy as np, json
from PIL import Image
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/"
z = np.load(R + "season80.npz"); ND = z["ndvi"].astype(np.float32); MW = z["mndwi"].astype(np.float32); dates = list(z["dates"]); dem = z["dem"]
import datetime as dt
dayn = np.array([(dt.date.fromisoformat(d) - dt.date(2026, 6, 1)).days for d in dates])
N, H, W = ND.shape
land = dem > 0.5
clear = np.isfinite(ND)
june = dayn <= 39                                      # 1 Jun - 10 Jul
with np.errstate(all="ignore"):
    base = np.nanmedian(ND[june], 0)
base = np.where(np.isfinite(base), base, np.nanmedian(ND, 0))
green = clear & (ND > 0.3) & (ND > base + 0.15) & land
# later counts (strictly after each date)
gl = np.zeros_like(green, np.int16); cl = np.zeros_like(green, np.int16)
for i in range(N - 2, -1, -1):
    gl[i] = gl[i + 1] + green[i + 1]; cl[i] = cl[i + 1] + clear[i + 1]
ok_up = green & (cl >= 2) & (gl >= 0.6 * cl)
up = np.full((H, W), 255, np.uint8); down = np.full((H, W), 255, np.uint8)
for i in range(N):
    m = ok_up[i] & (up == 255) & ~june[i]               # must start after the June baseline period
    up[m] = dayn[i]
for i in range(N):
    m = (up != 255) & (dayn[i] > up) & clear[i] & ~green[i] & (gl[i] < 0.3 * np.maximum(cl[i], 1)) & (cl[i] >= 1) & (down == 255)
    down[m] = dayn[i]
peak = np.nanmax(np.where(clear, ND, -1), 0)
always = land & (base > 0.3)                           # already green in June (palms, mangroves, irrigated farms)
# water
wat = clear & (MW > 0.1) & land
with np.errstate(all="ignore"):
    perm = (wat[june].sum(0) >= 0.6 * np.maximum(clear[june].sum(0), 1)) & (clear[june].sum(0) >= 3)
print("green-up pixels km2", ((up != 255).sum() * 0.0064), "on plain", ((up != 255) & (dem < 250) & land).sum() * 0.0064)
print("green-down km2", (down != 255).sum() * 0.0064, "already green km2", always.sum() * 0.0064, "perm water km2", perm.sum() * 0.0064)
hist = np.bincount(up[up != 255] // 7, minlength=25); print("green-up by week", hist.tolist())
np.savez(R + "season_derived.npz", up=up, down=down, base=base.astype(np.float16), peak=peak.astype(np.float16), always=always, perm=perm, wat=wat, clear=clear, dayn=dayn)
# diagnostic picture: green-up day coloured, water blue
rgb = np.zeros((H, W, 3), np.uint8); rgb[land] = 40
u = up.astype(float); m = up != 255
rgb[m] = np.stack([(u[m] / 160 * 255), 200 - u[m] / 160 * 120, 60 + 0 * u[m]], -1).clip(0, 255).astype(np.uint8)
late = wat[dayn >= 130].any(0) & ~perm
rgb[late] = [60, 140, 255]; rgb[perm] = [0, 40, 200]
Image.fromarray(rgb).save("C:/Users/B3B3/.claude/jobs/bc3eccd3/tmp/diag_season.png")

# ---- water appearing / disappearing, same rule as greening (robust to single hazy dates where the water index fails)
from scipy import ndimage
wl = np.zeros_like(wat, np.int16); cl2 = np.zeros_like(wat, np.int16)
for i in range(N - 2, -1, -1):
    wl[i] = wl[i + 1] + wat[i + 1]; cl2[i] = cl2[i + 1] + clear[i + 1]
wup = np.full((H, W), 255, np.uint8); wdn = np.full((H, W), 255, np.uint8)
for i in range(N):
    m = wat[i] & (cl2[i] >= 2) & (wl[i] >= 0.6 * cl2[i]) & (wup == 255) & ~june[i] & ~perm
    wup[m] = dayn[i]
for i in range(N):
    m = (perm | (wup != 255)) & (dayn[i] > np.where(wup == 255, 0, wup)) & ~june[i] & clear[i] & ~wat[i] & (wl[i] < 0.3 * np.maximum(cl2[i], 1)) & (cl2[i] >= 2) & (wdn == 255)
    wdn[m] = dayn[i]
lab, n = ndimage.label(wup != 255); sz = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
small = np.isin(lab, np.where(sz < 4)[0] + 1); wup[small] = 255
print("new water km2", (wup != 255).sum() * 0.0064, "perm", perm.sum() * 0.0064, "perm gone", (perm & (wdn != 255)).sum() * 0.0064)
np.savez(R + "season_water.npz", wup=wup, wdn=wdn)
