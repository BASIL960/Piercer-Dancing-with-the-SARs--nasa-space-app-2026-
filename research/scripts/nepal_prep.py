"""Data for the Bhote Koshi flood map (same format as the Oregon page)."""
import sys, os, json, math, pickle, glob, warnings
sys.path.insert(0, os.path.dirname(__file__)); warnings.filterwarnings("ignore")
import numpy as np
if not hasattr(np, "in1d"): np.in1d = np.isin
from PIL import Image
from scipy import ndimage
from rasterio.warp import reproject, Resampling, transform as wtr, transform_bounds
from rasterio.transform import from_bounds, from_origin
from gibs import getmap

R = "C:/Users/B3B3/Desktop/workplase/nasa/research/nepal/raw/"
WEB = "C:/Users/B3B3/Desktop/workplase/nasa/research/nepal/web/"
os.makedirs(WEB, exist_ok=True)
g = pickle.load(open(R + "grid30.pkl", "rb")); T = g["transform"]; CRS = g["crs"]; W, H = g["width"], g["height"]
X0, Y0 = T.c, T.f
BB = [85.15, 28.05, 85.60, 28.65]
dem = np.load(R + "dem30.npy"); acc = np.load(R + "acc30.npy")


def load(n): return {k: v.astype(np.float32) for k, v in np.load(R + n).items()}


def stretch(a, lo, hi): return np.clip((a - lo) / (hi - lo), 0, 1)


def tc(m):
    return np.dstack([stretch(m["red"], 0.0, 0.26), stretch(m["green"], 0.0, 0.23), stretch(m["blue"], 0.0, 0.21)]) ** 0.8


def save(rgb, name, q=86):
    Image.fromarray((np.clip(np.nan_to_num(rgb, nan=0.5), 0, 1) * 255).astype(np.uint8)).save(WEB + name, quality=q, optimize=True)


pre = load("comp_pre_filled.npz"); post = load("comp_post.npz")
# a single-date look on 1 Oct (first clear view), gaps from the October composite
d1 = load("hls30_2026-10-01_s30.npz")
for k in d1: h = ~np.isfinite(d1[k]); d1[k][h] = post[k][h]
# the last clear look before the flood (12 Aug), gaps from the pre composite
d0 = load("hls30_2026-08-12_s30.npz")
for k in d0: h = ~np.isfinite(d0[k]); d0[k][h] = pre[k][h]
save(tc(pre), "opt_pre.jpg"); save(tc(d0), "opt_aug12.jpg"); save(tc(d1), "opt_oct01.jpg"); save(tc(post), "opt_post.jpg")

# ---------------------------------------------------------------- flood path from the top of the scour trail
C = np.load(R + "scour_component.npy")
fdir = None
# re-derive flow direction quickly from pysheds output saved by nepal_hydro (recompute here to stay self-contained)
import rasterio
from pysheds.grid import Grid
G = Grid.from_raster(R + "dem30.tif"); Dm = G.read_raster(R + "dem30.tif")
Dm = G.resolve_flats(G.fill_depressions(G.fill_pits(Dm)))
dirmap = (64, 128, 1, 2, 4, 8, 16, 32); fdir = np.asarray(G.flowdir(Dm, dirmap=dirmap))
step = {64: (-1, 0), 128: (-1, 1), 1: (0, 1), 2: (1, 1), 4: (1, 0), 8: (1, -1), 16: (0, -1), 32: (-1, -1)}
rr, cc = np.nonzero(C); k = np.argmax(dem[rr, cc]); src = (int(rr[k]), int(cc[k]))
path = [src]
while True:
    d = int(fdir[path[-1]])
    if d not in step: break
    r, c = path[-1][0] + step[d][0], path[-1][1] + step[d][1]
    if not (0 <= r < H and 0 <= c < W): break
    path.append((r, c))
P = np.array(path)
dist = np.concatenate([[0], np.cumsum(30 * np.hypot(*np.diff(P, axis=0).T))])


def px(lat, lon):
    x, y = wtr("EPSG:4326", CRS, [lon], [lat]); return (Y0 - y[0]) / 30, (x[0] - X0) / 30


def on_path(lat, lon):
    r, c = px(lat, lon); j = int(np.argmin((P[:, 0] - r) ** 2 + (P[:, 1] - c) ** 2)); return j, dist[j]


jR, dR = on_path(28.2778, 85.3778); jS, dS = on_path(28.1617, 85.3433)
print("path %.1f km; source elev %.0f m; Rasuwagadhi at %.1f km, Syabrubesi at %.1f km" % (dist[-1] / 1000, dem[src], dR / 1000, dS / 1000))
# time anchors (minutes after 08:37 on 26 Aug): Rasuwagadhi ~09:00, Syabrubesi ~10 min later
tR, tS = 23.0, 33.0
vS = (dS - dR) / (tS - tR)                                     # m per minute below Rasuwagadhi
tmin = np.where(dist <= dR, tR * dist / dR, tR + (dist - dR) / vS)
# every scour pixel takes the time of the nearest point of the flood path, plus a small lateral delay
line = np.zeros((H, W), bool); line[P[:, 0], P[:, 1]] = True
idx = np.full((H, W), -1, np.int32); idx[P[:, 0], P[:, 1]] = np.arange(len(P))
dd, (iy, ix) = ndimage.distance_transform_edt(~line, return_indices=True)
flood = C | ndimage.binary_dilation(line, iterations=1)
arr = tmin[idx[iy, ix]] + dd * 30 / 600.0                      # 600 m/min sideways spread
arr = np.where(flood, arr, 0)
q = np.round(arr * 60).astype(np.uint32)                       # seconds after 08:37
rgba = np.dstack([(q >> 8).astype(np.uint8), (q & 255).astype(np.uint8), (flood * 255).astype(np.uint8), np.full(q.shape, 255, np.uint8)])
Image.fromarray(rgba, "RGBA").save(WEB + "arrival.png", optimize=True)
print("flood pixels km2 %.1f; last arrival %.0f min" % (flood.sum() * 0.0009, arr[flood].max()))

# ---------------------------------------------------------------- context map (wider region, clear MODIS day after the monsoon)
WIDE = (27.55, 84.55, 29.10, 86.25)   # lat0 lon0 lat1 lon1
cw, cs, ce, cn = transform_bounds("EPSG:4326", CRS, WIDE[1], WIDE[0], WIDE[3], WIDE[2])
CR = 240
cx0 = X0 - math.ceil((X0 - cw) / CR) * CR; cy0 = Y0 + math.ceil((cn - Y0) / CR) * CR
CW, CH = int((ce - cx0) // CR), int((cy0 - cs) // CR)
ctr = from_origin(cx0, cy0, CR, CR)
Wg = 2400; Hg = int(Wg * (WIDE[2] - WIDE[0]) / ((WIDE[3] - WIDE[1]) * math.cos(math.radians(28.3))))
best = None
for day in ["2026-10-%02d" % i for i in range(15, 32)] + ["2026-11-%02d" % i for i in range(1, 12)]:
    try:
        a = np.asarray(getmap("MODIS_Terra_CorrectedReflectance_TrueColor", WIDE, day, w=600, h=int(600 * Hg / Wg))).astype(float)
        sc = (a[..., :3].min(-1) > 200).mean() + (a[..., 3] == 0).mean()
        if best is None or sc < best[0]: best = (sc, day)
    except Exception: pass
print("context day", best)
cp = R + f"ctx_modis_{best[1]}.png"
if not os.path.exists(cp): getmap("MODIS_Terra_CorrectedReflectance_TrueColor", WIDE, best[1], w=Wg, h=Hg).save(cp)
rp = R + "ctx_relief.png"
if not os.path.exists(rp): getmap("ASTER_GDEM_Greyscale_Shaded_Relief", WIDE, None, w=Wg, h=Hg).save(rp)


def to_ctx(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32) / 255; out = np.zeros((CH, CW, 3), np.float32)
    for c in range(3):
        reproject(a[..., c], out[..., c], src_transform=from_bounds(WIDE[1], WIDE[0], WIDE[3], WIDE[2], a.shape[1], a.shape[0]),
                  src_crs="EPSG:4326", dst_transform=ctr, dst_crs=CRS, resampling=Resampling.bilinear)
    return out


col = to_ctx(cp); rel = to_ctx(rp)[..., 0]
ctx = np.clip(col * (0.62 + 0.55 * (rel - rel.mean()))[..., None], 0, 1)
# colour-match to the October HLS composite along the detail border
k8 = 8; post_tc = tc(post); hh, ww = H // k8, W // k8
blk = post_tc[:hh * k8, :ww * k8].reshape(hh, k8, ww, k8, 3).mean((1, 3))
ox, oy = int(round((X0 - cx0) / CR)), int(round((cy0 - Y0) / CR))
sub = ctx[oy:oy + hh, ox:ox + ww]; blk = blk[:sub.shape[0], :sub.shape[1]]
m = np.zeros(sub.shape[:2], bool); m[:30] = m[-30:] = True; m[:, :30] = m[:, -30:] = True
for c in range(3):
    A_ = np.vstack([sub[..., c][m], np.ones(m.sum())]).T; gg, oo = np.linalg.lstsq(A_, blk[..., c][m], rcond=None)[0]
    ctx[..., c] = np.clip(ctx[..., c] * gg + oo, 0, 1)
save(ctx, "context.jpg")


def to_px(lon, lat):
    xs, ys = wtr("EPSG:4326", CRS, lon, lat)
    return [[round((x - cx0) / CR, 2), round((cy0 - y) / CR, 2)] for x, y in zip(xs, ys)]


def path_px(rows_cols):
    out = []
    for r, c in rows_cols:
        out.append([round((X0 + c * 30 - cx0) / CR, 2), round((cy0 - (Y0 - r * 30)) / CR, 2)])
    return out


slon, slat = wtr(CRS, "EPSG:4326", [X0 + src[1] * 30], [Y0 - src[0] * 30])
vec = dict(
    detail=dict(x=(X0 - cx0) / CR, y=(cy0 - Y0) / CR, w=W * 30 / CR, h=H * 30 / CR, W=W, H=H),
    context=dict(W=CW, H=CH, res=CR),
    flowline=path_px(path[::4]),
    flow_minutes=[round(float(v), 2) for v in tmin[::4]],
    places=[dict(name="Rasuwagadhi border crossing", p=to_px([85.3778], [28.2778])[0]),
            dict(name="Timure", p=to_px([85.3667], [28.2528])[0]),
            dict(name="Syabrubesi", p=to_px([85.3433], [28.1617])[0]),
            dict(name="Dhunche", p=to_px([85.2961], [28.1128])[0]),
            dict(name="Gyirong (Tibet)", p=to_px([85.3276], [28.3961])[0]),
            dict(name="Langtang Lirung 7,227 m", p=to_px([85.5167], [28.2564])[0], kind="peak"),
            dict(name="Source: ice and rock collapse", p=to_px([slon[0]], [slat[0]])[0], kind="origin")],
    regions=[dict(name="NEPAL", p=to_px([85.05], [27.85])[0]), dict(name="TIBET (CHINA)", p=to_px([85.6], [28.85])[0])],
    path_km=round(float(dist[-1] / 1000), 1), src_elev=int(dem[src]), src_latlon=[round(float(slat[0]), 4), round(float(slon[0]), 4)],
    km_R=round(float(dR / 1000), 1), km_S=round(float(dS / 1000), 1),
    scour_km2=round(float(flood.sum() * 0.0009), 1),
)
json.dump(vec, open(WEB + "data.json", "w"))
print("saved", vec["scour_km2"], "km2")
