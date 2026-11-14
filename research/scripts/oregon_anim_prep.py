"""Data for the Big Grass map animation.
Builds (all in UTM 11N):
  * a wide context map (MODIS true colour 10 Jul 2026 x ASTER shaded relief) at 240 m
  * detail optical images at 30 m (true + false colour) for before / during / after / recovery, gaps filled from neighbour dates
  * NISAR radar frames on the same detail grid
  * a fire ARRIVAL-TIME raster at 30 m: day from VIIRS detections, clamped by HLS burned/unburned observations,
    within-day timing by breadth-first search outward from the previous day's burned area
  * vectors (perimeter, state lines, towns) in context-pixel coordinates, plus area-vs-time series
"""
import sys, os, json, math, datetime as dt
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from scipy import ndimage
import rasterio
from rasterio.warp import reproject, Resampling, transform as wtransform, transform_bounds, transform_geom
from rasterio.transform import from_bounds, from_origin
from rasterio.features import rasterize
import shapely.geometry as sg
import hls_pc
from hls_pc import grid, nbr

RAW = "C:/Users/B3B3/Desktop/workplase/nasa/research/oregon/raw/"
ANIM = "C:/Users/B3B3/Desktop/workplase/nasa/research/oregon/anim/"
WEB = ANIM + "web/"
os.makedirs(WEB, exist_ok=True)
BB = [-117.45, 42.0, -116.3, 42.95]
WIDE = (41.3, -119.2, 43.75, -114.6)          # lat0, lon0, lat1, lon1 (GIBS order)
CRS = "EPSG:32611"
T0 = dt.datetime(2026, 7, 23)                 # hour 0 = 23 Jul 2026 00:00 (ignition day)

g30 = grid(BB, 30); g60 = grid(BB, 60)
W30, H30 = g30["width"], g30["height"]
X0, Y0 = g30["transform"].c, g30["transform"].f
# context grid (240 m) snapped so that detail pixels align
cw, cs, ce, cn = transform_bounds("EPSG:4326", CRS, WIDE[1], WIDE[0], WIDE[3], WIDE[2])
CR = 240
cx0 = X0 - math.ceil((X0 - cw) / CR) * CR; cy0 = Y0 + math.ceil((cn - Y0) / CR) * CR
CW = int((ce - cx0) // CR); CH = int((cy0 - cs) // CR)
gctx = dict(crs=CRS, transform=from_origin(cx0, cy0, CR, CR), width=CW, height=CH)
print("detail", W30, H30, "context", CW, CH, flush=True)


def load(tag, d):
    z = np.load(RAW + f"{tag}_{d}.npz"); return {k: z[k].astype(np.float32) for k in z.files}


def up2(a):  # 60 m -> 30 m
    return np.repeat(np.repeat(a, 2, 0), 2, 1)[:H30, :W30]


def fill_from(m, others):
    """fill NaN gaps (clouds, swath edges) from other scenes, in order"""
    m = {k: v.copy() for k, v in m.items()}
    for o in others:
        for k in m:
            if k in o:
                hole = ~np.isfinite(m[k]); m[k][hole] = o[k][hole]
    return m


def stretch(a, lo, hi): return np.clip((a - lo) / (hi - lo), 0, 1)


def tc(m):
    return np.dstack([stretch(m["red"], 0.03, 0.30), stretch(m["green"], 0.03, 0.27), stretch(m["blue"], 0.02, 0.22)]) ** 0.85


def fc(m):
    return np.dstack([stretch(m["swir2"], 0.02, 0.38), stretch(m["nir"], 0.05, 0.40), stretch(m["red"], 0.02, 0.26)]) ** 0.85


def save_rgb(rgb, name, q=88):
    Image.fromarray((np.nan_to_num(rgb, nan=0.5) * 255).astype(np.uint8)).save(WEB + name, quality=q, optimize=True)


# ------------------------------------------------------------------ 30 m optical scenes (download missing ones)
def hls30(d, sensor="s30"):
    fn = RAW + f"hls30_{d}.npz"
    if not os.path.exists(fn):
        m, _ = hls_pc.mosaic(d, sensor, BB, res=30)
        np.savez_compressed(fn, **m); print("downloaded", d, flush=True)
    return load("hls30", d)


scenes = {d: hls30(d) for d in ["2026-07-09", "2026-08-30", "2026-09-17", "2026-10-07", "2026-10-17", "2026-10-24"]}
s60 = {d: {k: up2(v) for k, v in load("hls60", d).items()} for d in ["2026-07-03", "2026-07-24", "2026-08-03", "2026-08-10", "2026-08-23", "2026-09-22", "2026-09-29"]}
fixed = {
    "pre": fill_from(scenes["2026-07-09"], [s60["2026-07-03"]]),
    "post": fill_from(scenes["2026-08-30"], [s60["2026-08-23"]]),
    "sep17": fill_from(scenes["2026-09-17"], [s60["2026-09-22"], scenes["2026-08-30"]]),
    "oct07": fill_from(scenes["2026-10-07"], [s60["2026-09-29"], scenes["2026-09-17"]]),
    "oct24": fill_from(scenes["2026-10-24"], [scenes["2026-10-17"], scenes["2026-10-07"]]),
}
for k, m in fixed.items():
    print(k, "gaps left %.4f" % (~np.isfinite(m["nir"])).mean(), flush=True)
    save_rgb(tc(m), f"opt_tc_{k}.jpg"); save_rgb(fc(m), f"opt_fc_{k}.jpg")

# ------------------------------------------------------------------ burned mask at 30 m
P30 = rasterize([(transform_geom("EPSG:4326", CRS, json.load(open(RAW + "big_grass_perimeter.geojson"))["features"][0]["geometry"]), 1)],
                out_shape=(H30, W30), transform=g30["transform"], fill=0).astype(bool)
dn30 = nbr(fixed["pre"]) - nbr(fixed["post"])
B30 = (dn30 > 0.10) & ndimage.binary_dilation(P30, iterations=33)
B30 = ndimage.binary_opening(B30, iterations=1)
lab, n = ndimage.label(B30); sz = ndimage.sum(B30, lab, range(1, n + 1))
B30 = np.isin(lab, 1 + np.nonzero(sz >= 30)[0])
B30 = B30 | (ndimage.binary_closing(B30, iterations=2) & ~ndimage.binary_dilation(~ndimage.binary_closing(B30, iterations=2), iterations=0))
print("burned km2 (30 m):", B30.sum() * 0.0009, flush=True)

# ------------------------------------------------------------------ arrival day at 60 m
B60 = B30[::2, ::2][:g60["height"], :g60["width"]]
first = np.load(RAW + "viirs_firstday.npy").astype(np.float32)          # 1 = 20 Jul
vd = np.zeros((g60["height"], g60["width"]), np.float32)
reproject(first, vd, src_transform=from_bounds(-118.0, 41.9, -115.8, 43.4, first.shape[1], first.shape[0]), src_crs="EPSG:4326",
          dst_transform=g60["transform"], dst_crs=CRS, resampling=Resampling.nearest)
vd = np.where((vd >= 4) & (vd <= 45), vd - 4, 0)                          # 0-based fire day: 0 = 23 Jul
has = vd > 0
has |= False
vday = np.where(has, vd, np.nan)
# nearest VIIRS detection (within 2 km)
dist, (iy, ix) = ndimage.distance_transform_edt(~has, return_indices=True)
vnear = np.where(dist * 60 <= 2000, vday[iy, ix], np.nan)
# HLS observations: [lower, upper] bounds of the burn day
obs = [("2026-07-24", s60["2026-07-24"]), ("2026-07-29", {k: up2(v) for k, v in load("hls60", "2026-07-29").items()}),
       ("2026-08-03", s60["2026-08-03"]), ("2026-08-10", s60["2026-08-10"]), ("2026-08-23", s60["2026-08-23"]),
       ("2026-08-30", fixed["post"])]
nb0 = nbr(fixed["pre"])[::2, ::2]
lo = np.zeros_like(vd); upb = np.full_like(vd, 38.0)                      # upper default = 30 Aug
for d, m in obs:
    k = (dt.date.fromisoformat(d) - T0.date()).days + 0.6                 # overpass ~ late morning
    nb = nbr(m)[::2, ::2]; valid = np.isfinite(nb)
    burnt = valid & ((nb0 - nb) > 0.10)
    upb = np.where(burnt & (upb > k), k, upb)
    lo = np.where(valid & ~burnt & (k > lo) & (k < upb), k, lo)
est = np.where(np.isfinite(vnear), vnear + 0.5, (lo + upb) / 2)
est = np.clip(est, lo, upb)
est[~B60] = np.nan
kday = np.floor(est)
print("day range", np.nanmin(kday), np.nanmax(kday), flush=True)

# ------------------------------------------------------------------ within-day BFS from the previous day's edge
ix_, iy_ = wtransform("EPSG:4326", CRS, [-117.30335], [42.6498])
ic = int((ix_[0] - g60["transform"].c) / 60); ir = int((g60["transform"].f - iy_[0]) / 60)
arr = np.full(vd.shape, np.nan, np.float32)
done = np.zeros(vd.shape, bool)
cross = ndimage.generate_binary_structure(2, 2)
for k in np.unique(kday[np.isfinite(kday)]):
    R = (kday == k)
    steps = np.full(vd.shape, -1, np.int32)
    seeds = R & ndimage.binary_dilation(done, structure=cross)
    if not seeds.any() or k == 0:
        # first day: start at the ignition point (snap to nearest burned pixel)
        rr, cc = np.nonzero(R); j = np.argmin((rr - ir) ** 2 + (cc - ic) ** 2); seeds = np.zeros_like(R); seeds[rr[j], cc[j]] = True
    front = seeds.copy(); steps[front] = 0; reached = front.copy(); s = 0
    while True:
        # spot fires / pockets not connected to yesterday's edge: seed them at the point nearest the burned area
        if not front.any():
            rest = R & ~reached
            if not rest.any(): break
            lab, n = ndimage.label(rest, structure=cross)
            dd = ndimage.distance_transform_edt(~(done | reached))
            new = np.zeros_like(R)
            for c in range(1, n + 1):
                idx = np.flatnonzero(lab == c); j = idx[np.argmin(dd.flat[idx])]; new.flat[j] = True
            front = new; steps[front] = s; reached |= front
            continue
        s += 1
        nxt = ndimage.binary_dilation(front, structure=cross) & R & ~reached
        steps[nxt] = s; reached |= nxt; front = nxt
    mx = max(steps[R].max(), 1)
    arr[R] = k + 0.98 * steps[R] / mx
    done |= R
hours60 = arr * 24.0
# smooth the time field slightly so fronts are not blocky, then up-sample to 30 m and keep 30 m burn edges
ok = np.isfinite(hours60)
num = ndimage.gaussian_filter(np.where(ok, hours60, 0), 1.0); den = ndimage.gaussian_filter(ok.astype(np.float32), 1.0)
hs = np.where(den > 0.05, num / np.maximum(den, 1e-6), np.nan)
h30 = ndimage.zoom(np.nan_to_num(hs, nan=-1), 2, order=1)[:H30, :W30]
bad = (h30 < 0) & B30
if bad.any():
    _, (jy, jx) = ndimage.distance_transform_edt(h30 < 0, return_indices=True); h30 = np.where(bad, h30[jy, jx], h30)
h30 = np.where(B30, np.clip(h30, 0, 65535 / 4), 0)
q = np.round(h30 * 4).astype(np.uint16)                       # quarter-hour resolution
rgba = np.dstack([(q >> 8).astype(np.uint8), (q & 255).astype(np.uint8), (B30 * 255).astype(np.uint8), np.full(q.shape, 255, np.uint8)])
Image.fromarray(rgba, "RGBA").save(WEB + "arrival.png", optimize=True)

# area vs time (km2), hourly
hrs = np.arange(0, int(h30[B30].max()) + 2)
cum = np.searchsorted(np.sort(h30[B30]), hrs, side="right") * 0.0009
# ------------------------------------------------------------------ NISAR radar frames on the detail grid
radar = {}
for d in ["2026-07-16", "2026-08-21", "2026-09-26", "2026-10-20"]:
    a = np.asarray(Image.open(RAW + f"nisar_{d}.png").convert("RGBA")).astype(np.float32)
    out = np.zeros((H30 // 2, W30 // 2, 4), np.float32)
    g = dict(transform=from_origin(X0, Y0, 60, 60))
    for c in range(4):
        dst = np.zeros((H30 // 2, W30 // 2), np.float32)
        reproject(a[..., c], dst, src_transform=from_bounds(*BB, a.shape[1], a.shape[0]), src_crs="EPSG:4326",
                  dst_transform=g["transform"], dst_crs=CRS, resampling=Resampling.bilinear)
        out[..., c] = dst
    rgb = out[..., :3] / 255
    rgb = np.clip(rgb * 1.15, 0, 1)
    Image.fromarray((rgb * 255).astype(np.uint8)).resize((W30, H30), Image.BILINEAR).save(WEB + f"radar_{d}.jpg", quality=85)
    radar[d] = True

# ------------------------------------------------------------------ context map
def gibs_to_ctx(path, resamp=Resampling.bilinear):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    out = np.zeros((CH, CW, 3), np.float32)
    for c in range(3):
        reproject(a[..., c], out[..., c], src_transform=from_bounds(WIDE[1], WIDE[0], WIDE[3], WIDE[2], a.shape[1], a.shape[0]),
                  src_crs="EPSG:4326", dst_transform=gctx["transform"], dst_crs=CRS, resampling=resamp)
    return out / 255


from gibs import getmap
cpath = ANIM + "ctx_modis_2026-07-10.png"
if not os.path.exists(cpath):
    getmap("MODIS_Terra_CorrectedReflectance_TrueColor", WIDE, "2026-07-10", w=2400, h=1733).save(cpath)
col = gibs_to_ctx(cpath); rel = gibs_to_ctx(ANIM + "ctx_ASTER_GDEM_Greyscale_Shaded_Relief.png")[..., 0]
shade = 0.62 + 0.55 * (rel - rel.mean())
ctx = np.clip(col * shade[..., None], 0, 1)
save_rgb(ctx, "context.jpg", q=86)

# ------------------------------------------------------------------ vectors in context-pixel coordinates
def to_px(lon, lat):
    xs, ys = wtransform("EPSG:4326", CRS, lon, lat)
    return [[round((x - cx0) / CR, 2), round((cy0 - y) / CR, 2)] for x, y in zip(xs, ys)]


per = sg.shape(json.load(open(RAW + "big_grass_perimeter.geojson"))["features"][0]["geometry"]).simplify(0.002)
polys = [list(p.exterior.coords) for p in (per.geoms if hasattr(per, "geoms") else [per]) if p.area > 2e-5]
vec = dict(
    detail=dict(x=(X0 - cx0) / CR, y=(cy0 - Y0) / CR, w=W30 * 30 / CR, h=H30 * 30 / CR, W=W30, H=H30),
    context=dict(W=CW, H=CH, res=CR),
    perimeter=[to_px([c[0] for c in p], [c[1] for c in p]) for p in polys],
    lines=[dict(name="OR / ID", pts=to_px([-117.0268] * 2, [42.0, 43.75])),
           dict(name="OR / NV", pts=to_px([-119.2, -117.0268], [42.0, 42.0])),
           dict(name="ID / NV", pts=to_px([-117.0268, -114.6], [42.0, 42.0]))],
    places=[dict(name="Jordan Valley", p=to_px([-117.0538], [42.9743])[0]),
            dict(name="Ignition · lightning, 23 Jul", p=to_px([-117.30335], [42.6498])[0], kind="origin")],
    regions=[dict(name="OREGON", p=to_px([-118.4], [43.35])[0]), dict(name="IDAHO", p=to_px([-115.6], [43.35])[0]),
             dict(name="NEVADA", p=to_px([-117.6], [41.6])[0])],
    area_hourly=[round(float(v), 1) for v in cum],
    burned_km2=round(float(B30.sum() * 0.0009)),
)
json.dump(vec, open(WEB + "data.json", "w"))
print("saved; burned", vec["burned_km2"], "km2; hours", len(hrs), flush=True)
