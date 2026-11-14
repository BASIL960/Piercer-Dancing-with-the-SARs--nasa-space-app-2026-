"""River network for the Bhote Koshi valley from Copernicus DEM, the flood path from the Lhende Khola headwaters
downstream, and a scour mask restricted to that valley floor."""
import sys, os, json, pickle, warnings
sys.path.insert(0, os.path.dirname(__file__)); warnings.filterwarnings("ignore")
import numpy as np
if not hasattr(np, "in1d"): np.in1d = np.isin          # pysheds still calls the removed numpy alias
import rasterio
from rasterio.warp import transform as wtr
from scipy import ndimage
from pysheds.grid import Grid
from PIL import Image

R = "C:/Users/B3B3/Desktop/workplase/nasa/research/nepal/raw/"
g = pickle.load(open(R + "grid30.pkl", "rb")); dem = np.load(R + "dem30.npy")
tif = R + "dem30.tif"
with rasterio.open(tif, "w", driver="GTiff", width=g["width"], height=g["height"], count=1, dtype="float32", crs=g["crs"], transform=g["transform"]) as dst:
    dst.write(dem, 1)
G = Grid.from_raster(tif); D = G.read_raster(tif)
D = G.resolve_flats(G.fill_depressions(G.fill_pits(D)))
dirmap = (64, 128, 1, 2, 4, 8, 16, 32)
fdir = G.flowdir(D, dirmap=dirmap); acc = G.accumulation(fdir, dirmap=dirmap)
fdir = np.asarray(fdir); acc = np.asarray(acc).astype(np.float64)
np.save(R + "acc30.npy", acc.astype(np.float32))
step = {64: (-1, 0), 128: (-1, 1), 1: (0, 1), 2: (1, 1), 4: (1, 0), 8: (1, -1), 16: (0, -1), 32: (-1, -1)}


def px(lat, lon):
    x, y = wtr("EPSG:4326", g["crs"], [lon], [lat]); T = g["transform"]
    return int((T.f - y[0]) / 30), int((x[0] - T.c) / 30)


def snap(rc, r=8, minacc=2000):
    r0, c0 = rc; win = acc[max(0, r0 - r):r0 + r + 1, max(0, c0 - r):c0 + r + 1].copy(); win[win < minacc] = 0
    i = np.unravel_index(np.argmax(win), win.shape); return (max(0, r0 - r) + i[0], max(0, c0 - r) + i[1])


def downstream(rc):
    path = [rc]; H, W = acc.shape
    while True:
        d = int(fdir[path[-1]]);
        if d not in step: break
        r, c = path[-1][0] + step[d][0], path[-1][1] + step[d][1]
        if not (0 <= r < H and 0 <= c < W): break
        path.append((r, c))
    return path


def upstream_main(rc, stop_acc=300):
    """follow the biggest tributary upstream until the catchment gets small (headwater)"""
    path = [rc]; H, W = acc.shape
    while True:
        r, c = path[-1]; best = None
        for d, (dr, dc) in step.items():
            rr, cc = r - dr, c - dc
            if 0 <= rr < H and 0 <= cc < W and int(fdir[rr, cc]) == d and (best is None or acc[rr, cc] > acc[best]):
                best = (rr, cc)
        if best is None or acc[best] < stop_acc: break
        path.append(best)
    return path[::-1]


PLACES = {"Rasuwagadhi": (28.2778, 85.3778), "Timure": (28.2528, 85.3667), "Syabrubesi": (28.1617, 85.3433),
          "Lhende Khola": (28.4343, 85.4427), "Gyirong": (28.3961, 85.3276), "Dhunche": (28.1128, 85.2961)}
lh = snap(px(*PLACES["Lhende Khola"]), r=12, minacc=3000)
up = upstream_main(lh)
down = downstream(lh)
path = up[:-1] + down
elev = np.array([dem[p] for p in path])
dist = np.concatenate([[0], np.cumsum([30 * np.hypot(a[0] - b[0], a[1] - b[1]) for a, b in zip(path[:-1], path[1:])])])
# where does the path pass the named places?
def nearest_on_path(lat, lon):
    r, c = px(lat, lon); P = np.array(path); k = int(np.argmin((P[:, 0] - r) ** 2 + (P[:, 1] - c) ** 2))
    return k, float(dist[k]), float(np.hypot(P[k, 0] - r, P[k, 1] - c) * 30)
info = {n: nearest_on_path(*ll) for n, ll in PLACES.items()}
print("path px", len(path), "length km %.1f" % (dist[-1] / 1000), "head elev %.0f m" % elev[0], "end elev %.0f" % elev[-1])
for n, (k, d, off) in info.items(): print(f"  {n:13s} at {d/1000:6.1f} km along path, {off:5.0f} m off, elev {elev[k]:.0f}")
# the Tibet branch: Bhote Koshi / Kerung main stem upstream of the confluence
conf = info["Rasuwagadhi"][0]
json.dump(dict(path=[list(map(int, p)) for p in path], dist=dist.tolist(), elev=elev.tolist(), places={n: dict(k=k, km=d / 1000) for n, (k, d, _) in info.items()}),
          open(R + "flood_path.json", "w"))
# scour mask: change candidates within 400 m of the flood path, connected to it
B = {k: v for k, v in np.load(R + "comp_pre_filled.npz").items()}; A = {k: v for k, v in np.load(R + "comp_post.npz").items()}
nd = lambda m: (m["nir"] - m["red"]) / (m["nir"] + m["red"] + 1e-6)
cand = ((nd(B) - nd(A) > 0.12) & (nd(A) < 0.35) & (A["swir1"] > 0.08)) | (((A["green"] - A["swir1"]) / (A["green"] + A["swir1"] + 1e-6) > 0.05) & (A["blue"] < 0.3))
line = np.zeros(acc.shape, bool)
for p in path: line[p] = True
corridor = ndimage.binary_dilation(line, iterations=14)            # ~420 m either side
M = cand & corridor
M = ndimage.binary_closing(M, iterations=2) & corridor
lab, n = ndimage.label(M | line); keep = np.unique(lab[line]); M = np.isin(lab, keep[keep > 0]) & (M | ndimage.binary_dilation(line, iterations=1))
np.save(R + "scour_mask.npy", M)
print("scour area km2 %.1f" % (M.sum() * 0.0009))
# quick look
s = lambda a, lo, hi: np.clip((a - lo) / (hi - lo), 0, 1)
rgb = np.dstack([s(A["red"], 0, .25), s(A["green"], 0, .22), s(A["blue"], 0, .2)]) ** .8
gry = rgb.mean(-1, keepdims=True) * 0.6 + 0.2
out = np.where(M[..., None], np.array([0.1, 0.85, 1.0]), gry)
out[ndimage.binary_dilation(line, iterations=1) & ~M] = [1, 0.7, 0.1]
for n, (k, d, off) in info.items():
    r, c = path[k]; out[max(0, r - 6):r + 7, max(0, c - 6):c + 7] = [1, 0.2, 0.6]
Image.fromarray((out * 255).astype(np.uint8)).resize((750, 1118)).save("../nepal/check_path.jpg", quality=85)
