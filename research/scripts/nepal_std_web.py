"""Rebuild the Nepal map's stated numbers under DATA_STANDARD.md:
  arrival.png (flood pixels = standard stripped-ground mask), area_minutes, scour_km2, and coh_series (rule C, corridor vs control)."""
import json, glob, os, numpy as np, warnings
warnings.filterwarnings("ignore")
from PIL import Image
from scipy import ndimage
from rasterio.warp import transform as wtr
import pickle
from pysheds.grid import Grid
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/nepal/raw/"; WEB = "C:/Users/B3B3/Desktop/workplase/nasa/research/nepal/web/"
g = pickle.load(open(R + "grid30.pkl", "rb")); T = g["transform"]; CRS = g["crs"]; X0, Y0 = T.c, T.f
dem = np.load(R + "dem30.npy"); H, W = dem.shape
G = Grid.from_raster(R + "dem30.tif"); Dm = G.read_raster(R + "dem30.tif"); Dm = G.resolve_flats(G.fill_depressions(G.fill_pits(Dm)))
fdir = np.asarray(G.flowdir(Dm, dirmap=(64, 128, 1, 2, 4, 8, 16, 32)))
step = {64: (-1, 0), 128: (-1, 1), 1: (0, 1), 2: (1, 1), 4: (1, 0), 8: (1, -1), 16: (0, -1), 32: (-1, -1)}
Cm = np.load(R + "scour_component.npy"); rr, cc = np.nonzero(Cm); k = np.argmax(dem[rr, cc]); path = [(int(rr[k]), int(cc[k]))]
while True:
    d = int(fdir[path[-1]])
    if d not in step: break
    r, c = path[-1][0] + step[d][0], path[-1][1] + step[d][1]
    if not (0 <= r < H and 0 <= c < W): break
    path.append((r, c))
P = np.array(path); dist = np.concatenate([[0], np.cumsum(30 * np.hypot(*np.diff(P, axis=0).T))])
def on_path(lat, lon):
    x, y = wtr("EPSG:4326", CRS, [lon], [lat]); r, c = (Y0 - y[0]) / 30, (x[0] - X0) / 30
    j = int(np.argmin((P[:, 0] - r) ** 2 + (P[:, 1] - c) ** 2)); return dist[j]
dR, dS = on_path(28.2778, 85.3778), on_path(28.1617, 85.3433); tR, tS = 23.0, 33.0; vS = (dS - dR) / (tS - tR)
tmin = np.where(dist <= dR, tR * dist / dR, tR + (dist - dR) / vS)
line = np.zeros((H, W), bool); line[P[:, 0], P[:, 1]] = True
dd, (iy, ix) = ndimage.distance_transform_edt(~line, return_indices=True); idx = np.full((H, W), -1, np.int32); idx[P[:, 0], P[:, 1]] = np.arange(len(P))
corr = dd * 30 <= 420; ctrl = (dd * 30 > 420) & (dd * 30 <= 1500)
# standard stripped ground: G- (NDVI drop >= 0.15 and post NDVI < 0.30) or new W (MNDWI > 0.10), in the corridor, connected to the route
B = {k: v.astype(np.float32) for k, v in np.load(R + "comp_pre_filled.npz").items()}; A = {k: v.astype(np.float32) for k, v in np.load(R + "comp_post.npz").items()}
nd = lambda m: (m["nir"] - m["red"]) / (m["nir"] + m["red"] + 1e-6); mw = lambda m: (m["green"] - m["swir1"]) / (m["green"] + m["swir1"] + 1e-6)
valid = np.isfinite(nd(B)) & np.isfinite(nd(A))
cand = valid & (((nd(B) - nd(A) >= 0.15) & (nd(A) < 0.30)) | ((mw(A) > 0.10) & ~(mw(B) > 0.10)))
M = cand & corr; lab, n = ndimage.label(M | line); keep = np.unique(lab[line]); flood = np.isin(lab, keep[keep > 0]) & M
arr = np.where(flood, tmin[idx[iy, ix]] + dd * 30 / 600.0, 0)
q = np.round(arr * 60).astype(np.uint32)
Image.fromarray(np.dstack([(q >> 8).astype(np.uint8), (q & 255).astype(np.uint8), (flood * 255).astype(np.uint8), np.full(q.shape, 255, np.uint8)]), "RGBA").save(WEB + "arrival.png", optimize=True)
D = json.load(open(WEB + "data.json"))
mx = int(np.ceil(arr[flood].max())); D["area_minutes"] = [round(float(((arr <= m) & flood).sum() * 0.0009), 2) for m in range(mx + 1)]
D["scour_km2"] = round(float(flood.sum() * 0.0009), 1); D["corridor_km2"] = round(float(corr.sum() * 0.0009), 1)
# rule C per pair: % of corridor and of control changed vs the pre-flood baseline (max of the four 12-day pre-flood pairs)
fs = sorted(glob.glob(R + "coh_098_*.npy")); Cx = {os.path.basename(f)[8:25]: np.load(f).astype(np.float32) for f in fs}
base = np.nanmax(np.stack([Cx[k] for k in Cx if k[9:17] <= "20260726"]), 0)
lab_ = lambda k: f"{int(k[6:8])} {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][int(k[4:6]) - 1]} → {int(k[15:17])} {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][int(k[13:15]) - 1]}"
S = []
for k in sorted(Cx):
    ch = ndimage.uniform_filter(np.nan_to_num(np.clip(base - Cx[k], 0, 1)), 3); ok = np.isfinite(Cx[k]) & np.isfinite(base)
    S.append(dict(label=lab_(k), d1=k[:8], d2=k[9:17], route=round(float((ch > 0.2)[corr & ok].mean() * 100), 1), sides=round(float((ch > 0.2)[ctrl & ok].mean() * 100), 1),
                  route_lo=round(float((ch > 0.25)[corr & ok].mean() * 100), 1), route_hi=round(float((ch > 0.15)[corr & ok].mean() * 100), 1),
                  sides_lo=round(float((ch > 0.25)[ctrl & ok].mean() * 100), 1), sides_hi=round(float((ch > 0.15)[ctrl & ok].mean() * 100), 1)))
D["coh_series"] = S; D["coh_units"] = "% changed (rule C)"
json.dump(D, open(WEB + "data.json", "w"))
print("stripped", D["scour_km2"], "km2 of corridor", D["corridor_km2"], "| last arrival min", mx)
for s in S: print(s)
# radar frames: grey = coherence (bright = unchanged), pink = rule C (>= 0.20 below the pre-flood baseline), same as the stated numbers
for k in sorted(Cx):
    c = np.nan_to_num(Cx[k], nan=0.0); grey = np.clip((c - 0.05) / 0.85, 0, 1) ** 0.9
    ch = ndimage.uniform_filter(np.nan_to_num(np.clip(base - Cx[k], 0, 1)), 3) > 0.2
    rgb = np.dstack([grey, grey, grey]) * 0.92 + 0.04
    rgb[ch] = rgb[ch] * 0.35 + np.array([1.0, 0.36, 0.54]) * 0.65
    Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).save(WEB + f"radar_{k}.jpg", quality=86, optimize=True)
print("radar frames rewritten")
