"""Nepal numbers under DATA_STANDARD.md (30 m grid). Corridor = within 420 m of the DEM-traced flood route; control = 420 m-1.5 km."""
import json, glob, os, numpy as np
from scipy import ndimage
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/nepal/raw/"
dem = np.load(R + "dem30.npy"); H, W = dem.shape
# the same route as the page (nepal_prep.py): flow path from the highest point of the debris trail
from pysheds.grid import Grid
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
Pp = np.array(path); fp = dict(dist=list(np.concatenate([[0], np.cumsum(30 * np.hypot(*np.diff(Pp, axis=0).T))])))
line = np.zeros((H, W), bool)
for r, c in path: line[r, c] = True
dist = ndimage.distance_transform_edt(~line) * 30
corr = dist <= 420; ctrl = (dist > 420) & (dist <= 1500)
B = {k: v.astype(np.float32) for k, v in np.load(R + "comp_pre_filled.npz").items()}; A = {k: v.astype(np.float32) for k, v in np.load(R + "comp_post.npz").items()}
nd = lambda m: (m["nir"] - m["red"]) / (m["nir"] + m["red"] + 1e-6); mw = lambda m: (m["green"] - m["swir1"]) / (m["green"] + m["swir1"] + 1e-6)
ndB, ndA, mwB, mwA = nd(B), nd(A), mw(B), mw(A)
valid = np.isfinite(ndB) & np.isfinite(ndA)
out = dict(path_km=round(fp["dist"][-1] / 1000, 1), corridor_km2=round(float(corr.sum() * 0.0009), 1), corridor_valid=round(float(valid[corr].mean()), 3))
for lab, dn, wt in [("low", 0.10, 0.05), ("std", 0.15, 0.10), ("high", 0.20, 0.15)]:
    loss = valid & (ndB - ndA >= dn) & (ndA < 0.30)
    neww = valid & (mwA > wt) & ~(mwB > wt)
    cand = (loss | neww)
    M = cand & corr
    lab_, n = ndimage.label(M | line); keep = np.unique(lab_[line]); Mc = np.isin(lab_, keep[keep > 0]) & M
    out[f"stripped_{lab}"] = dict(km2=round(float(Mc.sum() * 0.0009), 1), share_of_corridor=round(float(Mc.sum() / corr.sum() * 100), 1),
                                  any_change_corridor_pct=round(float(cand[corr & valid].mean() * 100), 1), any_change_control_pct=round(float(cand[ctrl & valid].mean() * 100), 1))
# C: radar surface change
fs = sorted(glob.glob(R + "coh_098_*.npy")); Cx = {os.path.basename(f)[8:25]: np.load(f).astype(np.float32) for f in fs}
pre12 = [k for k in Cx if k[9:17] <= "20260726"]                       # 12-day pre-flood pairs (8 Jun - 26 Jul)
base = np.nanmax(np.stack([Cx[k] for k in pre12]), 0)
out["baseline_pairs"] = pre12; out["pairs"] = {}
for k in sorted(Cx):
    ch = ndimage.uniform_filter(np.nan_to_num(np.clip(base - Cx[k], 0, 1)), 3); ok = np.isfinite(Cx[k]) & np.isfinite(base)
    out["pairs"][k] = {f"t{t}": dict(corridor=round(float((ch > t)[corr & ok].mean() * 100), 1), control=round(float((ch > t)[ctrl & ok].mean() * 100), 1)) for t in (0.15, 0.2, 0.25)}
    out["pairs"][k]["valid_corridor"] = round(float(ok[corr].mean()), 3)
    out["pairs"][k]["median_coh_corridor"] = round(float(np.nanmedian(Cx[k][corr])), 2); out["pairs"][k]["median_coh_control"] = round(float(np.nanmedian(Cx[k][ctrl])), 2)
# cross-check: radar change in the flood pair on the stripped ground vs the rest of the corridor
for t in (0.15, 0.2, 0.25):
    ch = ndimage.uniform_filter(np.nan_to_num(np.clip(base - Cx["20260819_20260831"], 0, 1)), 3) > t
    loss = valid & (ndB - ndA >= 0.15) & (ndA < 0.30); neww = valid & (mwA > 0.10) & ~(mwB > 0.10)
    M = (loss | neww) & corr; lab_, n = ndimage.label(M | line); keep = np.unique(lab_[line]); Mc = np.isin(lab_, keep[keep > 0]) & M
    out[f"xcheck_t{t}"] = dict(radar_changed_on_stripped=round(float(ch[Mc].mean() * 100), 1), radar_changed_rest_of_corridor=round(float(ch[corr & ~Mc].mean() * 100), 1))
json.dump(out, open("C:/Users/B3B3/Desktop/workplase/nasa/research/std_nepal.json", "w"), indent=1)
print(json.dumps({k: v for k, v in out.items() if k != "pairs"}, indent=1))
for k, v in out["pairs"].items(): print(k, v["t0.2"], "| 0.15:", v["t0.15"], "| 0.25:", v["t0.25"], "| med", v["median_coh_corridor"], v["median_coh_control"])
