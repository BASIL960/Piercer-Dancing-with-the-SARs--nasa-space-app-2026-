"""Year each pixel of the Jazan industrial city site was first transformed (and stayed transformed), from yearly
Landsat medians 1987-2026 compared with the pre-2005 baseline."""
import glob, os, json, numpy as np
from scipy import ndimage
L = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/landsat/"
OUT = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/"
B = ["blue", "green", "red", "nir08", "swir16", "swir22"]
fs = sorted(glob.glob(L + "jcpdi_*.npz")); years = sorted({int(os.path.basename(f)[6:10]) for f in fs})
Y = {}
for y in years:
    st = []
    for f in fs:
        if int(os.path.basename(f)[6:10]) != y: continue
        z = np.load(f); a = np.stack([z[b].astype(np.float32) for b in B]); a[a < -0.05] = np.nan; st.append(a)
    Y[y] = np.nanmedian(np.stack(st), 0) if len(st) > 1 else st[0]
    print(y, len(st), "valid %.2f" % np.isfinite(Y[y][3]).mean(), flush=True)
yrs = np.array(years); S = np.stack([Y[y] for y in years])          # T,6,H,W
np.save(OUT + "jcpdi_yearly.npy", S.astype(np.float16)); json.dump(years, open(OUT + "jcpdi_years.json", "w"))
base_y = yrs <= 2004
# radiometric matching: Landsat 5/7/8/9 and wet/dry years differ globally; map each year's band percentiles onto the baseline's
ref = np.nanmedian(S[base_y], 0)
Q = [2, 10, 25, 50, 75, 90, 98]
for i in range(len(yrs)):
    for b in range(6):
        x = S[i, b]; ok = np.isfinite(x) & np.isfinite(ref[b])
        if ok.sum() < 1000: continue
        qa, qb = np.percentile(x[ok], Q), np.percentile(ref[b][ok], Q)
        S[i, b] = np.interp(x, qa, qb, left=None, right=None) + np.where(x < qa[0], x - qa[0], 0) + np.where(x > qa[-1], x - qa[-1], 0)
base = np.nanmedian(S[base_y], 0); noise = np.nanstd(S[base_y], 0)
d = np.sqrt(np.nansum((S - base) ** 2, 1)) / np.sqrt(6)            # rms band difference, T,H,W
nz = np.sqrt(np.nansum(noise ** 2, 0) / 6)
valid = np.isfinite(S[:, 3])
thr = np.maximum(0.04, 2.5 * nz)
ch = (d > thr) & valid
T = len(yrs); cy = np.zeros(d.shape[1:], np.int16)
# from the end backwards: fraction of valid years from t onward that are changed
cnt_ch = np.cumsum(ch[::-1], 0)[::-1]; cnt_v = np.cumsum(valid[::-1], 0)[::-1]
frac = cnt_ch / np.maximum(cnt_v, 1)
strong = d > 1.6 * thr
ok = ch & (frac >= 0.8) & ((cnt_v >= 3) | ((cnt_v == 2) & (frac >= 0.999)) | ((cnt_v == 1) & strong)) & (yrs[:, None, None] > 2004)
first = np.where(ok.any(0), np.argmax(ok, 0), -1)
cy = np.where(first >= 0, yrs[np.clip(first, 0, T - 1)], 0).astype(np.int16)
# open sea stays sea (turbidity and glint are not construction)
mnd = lambda a: (a[1] - a[4]) / (a[1] + a[4] + 1e-6)
sea = (mnd(base) > 0.05) & (mnd(np.nanmedian(S[-3:], 0)) > 0.05)
cy[sea] = 0
# clean: majority-ish median filter on the year map, drop specks
m = cy > 0
cy_f = ndimage.median_filter(np.where(m, cy, 0), 3); m2 = m | (cy_f > 0)
lab, n = ndimage.label(m2, structure=np.ones((3, 3))); sz = ndimage.sum(m2, lab, range(1, n + 1)); keep = np.isin(lab, 1 + np.nonzero(sz >= 20)[0])
cy_f = np.where(keep, np.where(cy > 0, cy, cy_f), 0).astype(np.int16)
np.save(OUT + "jcpdi_changeyear.npy", cy_f)
u, c = np.unique(cy_f[cy_f > 0], return_counts=True)
cum = 0
for a, b in zip(u, c): cum += b; print(a, "%.2f km2  cum %.1f" % (b * 0.0009, cum * 0.0009))
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
s = lambda a, lo, hi: np.clip((a - lo) / (hi - lo), 0, 1)
last = S[-1]; rgb = np.nan_to_num(np.dstack([s(last[2], .03, .35), s(last[1], .03, .32), s(last[0], .02, .28)]) ** .8)
fig, ax = plt.subplots(1, 2, figsize=(18, 9))
ax[0].imshow(rgb); ax[1].imshow(rgb * 0.5 + 0.25)
im = ax[1].imshow(np.ma.masked_equal(cy_f, 0), cmap="plasma", vmin=2005, vmax=2026); plt.colorbar(im, ax=ax[1], shrink=.7)
for a in ax: a.axis("off")
plt.tight_layout(); plt.savefig("../saudi/check_changeyear.jpg", dpi=55)
