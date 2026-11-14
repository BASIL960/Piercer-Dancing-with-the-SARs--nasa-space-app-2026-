"""Web data for the Jazan industrial-city map (same viewer family as the Oregon and Nepal pages).
Inputs: jcpdi_yearly.npy / jcpdi_years.json / jcpdi_changeyear.npy (jcpdi_change.py), ctx_landsat_120.npz (saudi_context.py),
NISAR GCOV renders from GIBS (raw/nisar)."""
import os, json, glob, math, numpy as np
from PIL import Image
from scipy import ndimage
from rasterio.warp import reproject, Resampling, transform as wtr
from rasterio.transform import from_bounds
import sys; sys.path.insert(0, os.path.dirname(__file__))
from hls_pc import grid

R = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/"
WEB = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/web/"
os.makedirs(WEB, exist_ok=True)
BB = [42.27, 17.17, 42.52, 17.40]
g = grid(BB, 30, crs="EPSG:32638"); CRS = g["crs"]; X0, Y0 = g["transform"].c, g["transform"].f; W, H = g["width"], g["height"]
S = np.load(R + "jcpdi_yearly.npy").astype(np.float32); years = json.load(open(R + "jcpdi_years.json"))
cy = np.load(R + "jcpdi_changeyear.npy").astype(np.int32)
T = len(years)
# the industrial city lies between the shore and ~42.47 E; farm plots further inland change for other reasons
lon_cut = int((42.47 - BB[0]) / (BB[2] - BB[0]) * W)
cy[:, lon_cut:] = 0


def s(a, lo, hi): return np.clip((a - lo) / (hi - lo), 0, 1)


def tc(a): return np.dstack([s(a[2], .03, .33), s(a[1], .03, .30), s(a[0], .02, .27)]) ** 0.85


def save(rgb, name, q=84):
    Image.fromarray((np.clip(np.nan_to_num(rgb, nan=0.3), 0, 1) * 255).astype(np.uint8)).save(WEB + name, quality=q, optimize=True)


# ---------------------------------------------------------------- yearly photos, gaps filled from the nearest year that has data
filled = S.copy()
for i in range(T):
    for k in sorted(range(T), key=lambda j: (abs(j - i), j > i)):
        if k == i: continue
        hole = ~np.isfinite(filled[i, 3])
        if not hole.any(): break
        filled[i][:, hole] = S[k][:, hole]
for i, y in enumerate(years): save(tc(filled[i]), f"y{y}.jpg")
print("photos", len(years))

# ---------------------------------------------------------------- change type: harbour dug from land, land reclaimed from the sea, built/cleared ground
def mndwi(a): return (a[1] - a[4]) / (a[1] + a[4] + 1e-6)
base = np.nanmedian(S[np.array(years) <= 2004], 0); fin = np.nanmedian(S[-3:], 0)
wb, wf = mndwi(base) > 0.05, mndwi(fin) > 0.05
typ = np.where(cy > 0, 3, 0)                    # 3 = built / cleared ground
typ[(cy > 0) & ~wb & wf] = 1                    # 1 = water where there was land (harbour basins, channels)
typ[(cy > 0) & wb & ~wf] = 2                    # 2 = land where there was sea (reclamation, breakwaters)
typ = ndimage.median_filter(typ, 3); typ[cy == 0] = 0; typ[(cy > 0) & (typ == 0)] = 3

# ---------------------------------------------------------------- order inside each year: spread outward from what already existed
frac = np.zeros(cy.shape, np.float32)
for y in sorted(set(cy[cy > 0].tolist())):
    Ry = cy == y; old = (cy > 0) & (cy < y)
    seeds = Ry & ndimage.binary_dilation(old, iterations=1)
    lab, n = ndimage.label(Ry, structure=np.ones((3, 3)))
    hit = set(np.unique(lab[seeds]).tolist())
    for k in range(1, n + 1):
        if k in hit: continue
        rr, cc = np.nonzero(lab == k); j = np.argmin((rr - rr.mean()) ** 2 + (cc - cc.mean()) ** 2); seeds[rr[j], cc[j]] = True
    dist = np.full(cy.shape, -1, np.int32); cur = seeds.copy(); dist[cur] = 0; step = 0
    while True:
        step += 1
        nxt = ndimage.binary_dilation(cur, iterations=1, structure=np.ones((3, 3))) & Ry & (dist < 0)
        if not nxt.any(): break
        dist[nxt] = step; cur = cur | nxt
    m = Ry & (dist >= 0)
    frac[m] = dist[m] / max(1, dist[m].max())
    print(y, "px", int(Ry.sum()), "bfs steps", step)
code = np.where(cy > 0, (cy - 1980) * 1000 + np.round(frac * 999), 0).astype(np.uint32)
rgba = np.dstack([(code >> 8).astype(np.uint8), (code & 255).astype(np.uint8), (typ * 80).astype(np.uint8), np.full(code.shape, 255, np.uint8)])
Image.fromarray(rgba, "RGBA").save(WEB + "arrival.png", optimize=True)

# area by year and type (km2, cumulative)
area = {n: [] for n in ["harbour", "reclaimed", "built"]}
for y in years:
    for k, n in [(1, "harbour"), (2, "reclaimed"), (3, "built")]:
        area[n].append(round(float(((cy > 0) & (cy <= y) & (typ == k)).sum() * 0.0009), 2))
print({k: v[-1] for k, v in area.items()})

# first year the port/refinery zone shows real earthworks (>0.5 km2 cumulative in the core block)
lon2c = lambda lo: int((lo - BB[0]) / (BB[2] - BB[0]) * W); lat2r = lambda la: int((BB[3] - la) / (BB[3] - BB[1]) * H)
core = np.zeros(cy.shape, bool); core[lat2r(17.33):lat2r(17.27), lon2c(42.30):lon2c(42.40)] = True
first_auto = next(y for y in years if (((cy > 0) & (cy <= y) & core).sum() * 0.0009) > 0.5)
# checked by eye on the yearly photos: a blue-roofed site camp and access roads first appear in the 2011 photo
first = 2012
first_text = f"2011 · A blue-roofed construction camp and the first access roads appear. By {first_auto} the refinery plot is being graded."
print("first", first)
# ---------------------------------------------------------------- NISAR 2026: median of 20 passes (Jun-Oct), onto the detail grid
fs = sorted(glob.glob(R + "nisar/jcpdi_*.png"))
a = np.median(np.stack([np.asarray(Image.open(f).convert("RGB")).astype(np.float32) for f in fs]), 0)
out = np.zeros((H, W, 3), np.float32)
for c in range(3):
    reproject(a[..., c], out[..., c], src_transform=from_bounds(BB[0], BB[1], BB[2], BB[3], a.shape[1], a.shape[0]), src_crs="EPSG:4326",
              dst_transform=g["transform"], dst_crs=CRS, resampling=Resampling.bilinear)
save(np.clip(out / 255 * 1.35, 0, 1), "radar_2026.jpg", q=86)
nisar_dates = [os.path.basename(f)[6:16] for f in fs]

# ---------------------------------------------------------------- context (Landsat 8/9 dry-season mosaic, 120 m), colour-matched to the 2026 detail photo
z = np.load(R + "ctx_landsat_120.npz"); cx0, cy0, CR, CW, CH = float(z["x0"]), float(z["y0"]), int(z["res"]), int(z["W"]), int(z["H"])
ctx = tc(z["rgb"][::-1])            # stored as red,green,blue; tc() wants the Landsat band order blue,green,red
k4 = CR // 30; det = tc(filled[-1]); hh, ww = H // k4, W // k4
blk = det[:hh * k4, :ww * k4].reshape(hh, k4, ww, k4, 3).mean((1, 3))
ox, oy = int(round((X0 - cx0) / CR)), int(round((cy0 - Y0) / CR))
sub = ctx[oy:oy + hh, ox:ox + ww]; blk = blk[:sub.shape[0], :sub.shape[1]]
m = np.zeros(sub.shape[:2], bool); m[:12] = m[-12:] = True; m[:, :12] = m[:, -12:] = True
m &= np.isfinite(sub).all(-1) & np.isfinite(blk).all(-1)
for c in range(3):
    A_ = np.vstack([sub[..., c][m], np.ones(m.sum())]).T; gg, oo = np.linalg.lstsq(A_, blk[..., c][m], rcond=None)[0]
    print("ctx match", c, round(gg, 2), round(oo, 3)); ctx[..., c] = np.clip(ctx[..., c] * gg + oo, 0, 1)
save(ctx, "context.jpg")


def to_px(lon, lat):
    xs, ys = wtr("EPSG:4326", CRS, [lon], [lat]); return [round((xs[0] - cx0) / CR, 2), round((cy0 - ys[0]) / CR, 2)]


vec = dict(
    detail=dict(x=(X0 - cx0) / CR, y=(cy0 - Y0) / CR, w=W * 30 / CR, h=H * 30 / CR, W=W, H=H),
    context=dict(W=CW, H=CH, res=CR),
    years=years, area=area, nisar_dates=nisar_dates, first=first, first_text=first_text,
    places=[dict(name="Jazan", p=to_px(42.5511, 16.8892)), dict(name="Sabya", p=to_px(42.6254, 17.1495)),
            dict(name="Abu Arish", p=to_px(42.8325, 16.9689)), dict(name="Baysh Dam", p=to_px(42.658, 17.666)),
            dict(name="Ahad al-Masarihah", p=to_px(42.8733, 16.7106)),
            dict(name="Port & refinery", p=to_px(42.343, 17.296), kind="site")],
    regions=[dict(name="RED SEA", p=to_px(42.02, 17.35)), dict(name="JAZAN PROVINCE", p=to_px(42.80, 17.50))],
)
json.dump(vec, open(WEB + "data.json", "w"))
print("saved")
