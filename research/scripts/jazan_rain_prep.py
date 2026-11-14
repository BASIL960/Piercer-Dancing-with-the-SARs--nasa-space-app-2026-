"""Web data for 'Jazan's rainy season seen by NISAR at dusk and dawn'.
All layers are real measurements on one 40 m UTM grid (EPSG:32638), written at 80 m for the browser:
  * NISAR L2 GUNW coherence, 12-day pairs, track 064 (descending, 18:39 local) and 071 (ascending, 05:39 local)
  * NISAR L2 GCOV HH backscatter, every pass, as change from each track's own dry-season median
  * NASA HLS true colour, every date with >=30% clear view (gaps filled from the previous date, stated in the page)
  * NASA GPM IMERG rain from GIBS (daily and 30-min images decoded through the GIBS colour table)."""
import os, glob, json, math, pickle, datetime as dt, numpy as np
from PIL import Image
from scipy import ndimage
from rasterio.warp import transform as wtr

R = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/"
WEB = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/rain_web/"
os.makedirs(WEB, exist_ok=True)
g = pickle.load(open(R + "gunw/grid40.pkl", "rb")); T = g["transform"]; CRS = g["crs"]; W, H = g["width"], g["height"]
K = 2                                                    # 40 m -> 80 m for the browser
W2, H2 = W // K, H // K
dem = np.load(R + "dem40.npy"); land = dem > 0.5; plain = land & (dem < 250)
LOCAL = dict(D=dt.timedelta(hours=3))


def down(a):
    a = a[:H2 * K, :W2 * K]
    return np.nanmean(a.reshape(H2, K, W2, K), axis=(1, 3))


def save_grey(a, name, q=88):
    Image.fromarray((np.clip(np.nan_to_num(a, nan=0), 0, 1) * 255).astype(np.uint8), "L").save(WEB + name, quality=q, optimize=True)


def save_rgb(a, name, q=84):
    Image.fromarray((np.clip(np.nan_to_num(a, nan=0.25), 0, 1) * 255).astype(np.uint8)).save(WEB + name, quality=q, optimize=True)


def iso(d8): return f"{d8[:4]}-{d8[4:6]}-{d8[6:]}"


meta = dict(coh=[], gcov=[], hls=[])
plain2 = down(plain.astype(np.float32)) > 0.5

# ---------------------------------------------------------------- NISAR coherence: change = dry-season coherence minus the pair's coherence
TRACK = {"064": dict(frame="080", when="dusk", hhmm="18:39"), "071": dict(frame="010", when="dawn", hhmm="05:39")}
ARTIFACT = {("071", "20260619", "20260701"), ("071", "20260701", "20260713")}   # stripes from processing, visible by eye; not shown
freq = {}
for tr, info in TRACK.items():
    fs = sorted(glob.glob(R + f"gunw/coh_{tr}_{info['frame']}_*.npy"))
    A = {(os.path.basename(f)[12:20], os.path.basename(f)[21:29]): np.load(f) for f in fs}
    keys = sorted(A)
    dry = np.nanmax(np.stack([A[k] for k in keys[:3]]), 0)        # max of the three June-July pairs: robust to the striped pairs
    cnt = np.zeros((H, W), np.float32); nv = np.zeros((H, W), np.float32)
    for d1, d2 in keys:
        if (tr, d1, d2) in ARTIFACT: continue
        wet = d1 >= "20260724"
        ch = np.clip(dry - A[(d1, d2)], 0, 0.6)
        ch = ndimage.uniform_filter(np.nan_to_num(ch), 3)
        ok = np.isfinite(A[(d1, d2)]) & land
        if wet: cnt += (ch > 0.2) & ok; nv += ok
        c2 = down(np.where(land, ch, 0)); name = f"coh_{tr}_{d1}_{d2}.jpg"
        save_grey(c2 / 0.5, name)
        share = float(np.nanmean((ch > 0.2)[plain & ok]))
        meta["coh"].append(dict(track=tr, when=info["when"], d1=iso(d1), d2=iso(d2), img=name, plain_changed=round(share * 100, 1),
                                days=(dt.date.fromisoformat(iso(d2)) - dt.date.fromisoformat(iso(d1))).days))
        print("coh", tr, d1, d2, "%.1f%%" % (share * 100))
    freq[tr] = np.where(nv > 0, cnt / np.maximum(nv, 1), 0)
# how often each place changed, dawn track (no fresh-rain bias), wet-season pairs only
save_grey(down(np.where(land, freq["071"], 0)) / 0.6, "freq_dawn.jpg")
save_grey(down(np.where(land, freq["064"], 0)) / 0.8, "freq_dusk.jpg")

# ---------------------------------------------------------------- NISAR GCOV backscatter: HH change from the track's dry-season median (dB)
gc = sorted(glob.glob(R + "gcov/gcov_*.npz"))
base_img = None
for tr in TRACK:
    fs = [f for f in gc if f"gcov_{tr}_" in f]
    if not fs: continue
    HH = {os.path.basename(f)[9:17]: np.load(f)["HHHH"].astype(np.float32) for f in fs}
    dry_d = [d for d in sorted(HH) if d <= "20260725"]
    dry = np.nanmedian(np.stack([HH[d] for d in dry_d]), 0) if dry_d else None
    if dry is None: continue
    if base_img is None:                                       # grey radar base: dry-season HH, -22..-2 dB
        base_img = down(dry); save_grey((base_img + 22) / 20, "radar_base.jpg")
    for d in sorted(HH):
        an = ndimage.uniform_filter(np.nan_to_num(HH[d] - dry), 3)
        a2 = down(np.where(land, an, 0)); name = f"gcov_{tr}_{d}.jpg"
        save_grey((a2 + 6) / 12, name)                         # -6 dB -> 0, 0 -> 0.5, +6 dB -> 1
        wet = float(np.nanmean((an > 2)[plain])); dark = float(np.nanmean((an < -3)[plain]))
        meta["gcov"].append(dict(track=tr, when=TRACK[tr]["when"], date=iso(d), img=name, brighter=round(wet * 100, 1), darker=round(dark * 100, 1)))
        print("gcov", tr, d, "brighter>2dB %.1f%%, darker<-3dB %.1f%%" % (wet * 100, dark * 100))

# ---------------------------------------------------------------- HLS true colour + greenness
hs = sorted(glob.glob(R + "hls/hls_*.npz"))
prev = None


def s(a, lo, hi): return np.clip((a - lo) / (hi - lo), 0, 1)


bydate = {}
for f in hs: bydate.setdefault(os.path.basename(f)[4:14], []).append(f)
for d in sorted(bydate):
    m = None
    for f in bydate[d]:
        z = {k: v.astype(np.float32) for k, v in np.load(f).items()}
        if m is None: m = z
        else:
            for k in m: h_ = ~np.isfinite(m[k]); m[k][h_] = z[k][h_]
    valid = np.isfinite(m["nir"])
    nd = (m["nir"] - m["red"]) / (m["nir"] + m["red"] + 1e-6)
    rgb = np.dstack([s(m["red"], .02, .30), s(m["green"], .02, .27), s(m["blue"], .01, .24)]) ** 0.85
    if prev is not None: rgb = np.where(valid[..., None], rgb, prev)
    prev = rgb
    name = f"hls_{d}.jpg"; save_rgb(np.dstack([down(rgb[..., c]) for c in range(3)]), name)
    pv = valid & plain
    meta["hls"].append(dict(date=d, img=name, clear=round(float(valid[land].mean()) * 100), ndvi_plain=round(float(np.nanmedian(nd[pv])), 3) if pv.sum() > 1000 else None,
                            green_share=round(float(np.nanmean((nd > 0.3)[pv])) * 100, 1) if pv.sum() > 1000 else None))
    print("hls", d, meta["hls"][-1]["clear"], meta["hls"][-1]["ndvi_plain"], meta["hls"][-1]["green_share"])

# ---------------------------------------------------------------- cross-check: did radar-flagged ground turn green later? (pixel by pixel on the plain)
def ndvi_comp(d0, d1):
    fs_ = [f for f in hs if d0 <= os.path.basename(f)[4:14] <= d1]
    if not fs_: return None
    out = np.full((H, W), np.nan, np.float32)
    for r0 in range(0, H, 400):                                  # row blocks keep memory low
        st = []
        for f in fs_:
            z = np.load(f); nir = z["nir"][r0:r0 + 400].astype(np.float32); red = z["red"][r0:r0 + 400].astype(np.float32)
            st.append((nir - red) / (nir + red + 1e-6))
        out[r0:r0 + 400] = np.nanmedian(np.stack(st), 0)
    return out


n_jun, n_oct = ndvi_comp("2026-06-01", "2026-07-10"), ndvi_comp("2026-10-15", "2026-11-14")
xcheck = None
if n_jun is not None and n_oct is not None:
    greened = (n_oct - n_jun > 0.15) & (n_oct > 0.3)
    flagged = freq["071"] >= 0.34                                   # radar change in at least 1 of 3 wet-season dawn windows
    ok = plain & np.isfinite(n_jun) & np.isfinite(n_oct)
    p_flag = float(greened[ok & flagged].mean()); p_not = float(greened[ok & ~flagged].mean())
    xcheck = dict(green_if_flagged=round(p_flag * 100, 1), green_if_not=round(p_not * 100, 1),
                  flagged_share=round(float(flagged[ok].mean()) * 100, 1), greened_share=round(float(greened[ok].mean()) * 100, 1))
    print("cross-check", xcheck)

# ---------------------------------------------------------------- rain (IMERG via GIBS)
im = json.load(open(R + "imerg_jazan_gibs_full.json")); pre = json.load(open(R + "imerg30_prepass.json"))
rain = [dict(date=k, rate=v["mean"], peak=v["max"], grid=v["grid"]) for k, v in sorted(im.items())]
prepass = {k: dict(mean_mm=v["mean_mm"], max_mm=v["max_mm"], wet_share=v["wet_share"]) for k, v in pre.items()}

# ---------------------------------------------------------------- context (Landsat 160 m), gaps filled, colour-matched to an HLS frame
z = np.load(R + "ctx_jazan_160.npz"); cx0, cy0, CR, CW, CH = float(z["x0"]), float(z["y0"]), int(z["res"]), int(z["W"]), int(z["H"])
c = z["rgb"]
for i in range(3):
    a = c[i]; m_ = np.isnan(a)
    if m_.any():
        idx = ndimage.distance_transform_edt(m_, return_distances=False, return_indices=True); c[i] = a[tuple(idx)]
ctx = np.dstack([s(c[0], .02, .30), s(c[1], .02, .27), s(c[2], .01, .24)]) ** 0.85
ref = None
for e in reversed(meta["hls"]):
    if e["clear"] > 90: ref = np.asarray(Image.open(WEB + e["img"])).astype(np.float32) / 255; break
if ref is not None:
    k = CR // (40 * K); hh, ww = H2 // k, W2 // k
    blk = ref[:hh * k, :ww * k].reshape(hh, k, ww, k, 3).mean((1, 3))
    ox, oy = int(round((T.c - cx0) / CR)), int(round((cy0 - T.f) / CR))
    sub = ctx[oy:oy + hh, ox:ox + ww]; blk = blk[:sub.shape[0], :sub.shape[1]]
    mm = np.zeros(sub.shape[:2], bool); mm[:10] = mm[-10:] = True; mm[:, :10] = mm[:, -10:] = True
    for ci in range(3):
        A_ = np.vstack([sub[..., ci][mm], np.ones(mm.sum())]).T; gg, oo = np.linalg.lstsq(A_, blk[..., ci][mm], rcond=None)[0]
        ctx[..., ci] = np.clip(ctx[..., ci] * gg + oo, 0, 1); print("ctx gain", ci, round(gg, 2), round(oo, 3))
save_rgb(ctx, "context.jpg")


def to_px(lon, lat):
    xs, ys = wtr("EPSG:4326", CRS, [lon], [lat]); return [round((xs[0] - cx0) / CR, 2), round((cy0 - ys[0]) / CR, 2)]


# rain grid geometry: GIBS request box (lat 16.4-18.6, lon 41.9-43.6) sampled at the centre of every 10th pixel of 170x220
rg = dict(lat0=18.6, lon0=41.9, dlat=2.2 / 22, dlon=1.7 / 17, rows=22, cols=17)
corners = []
for r_ in range(rg["rows"] + 1):
    corners.append([to_px(rg["lon0"] + c_ * rg["dlon"], rg["lat0"] - r_ * rg["dlat"]) for c_ in range(rg["cols"] + 1)])
vec = dict(
    detail=dict(x=(T.c - cx0) / CR, y=(cy0 - T.f) / CR, w=W * 40 / CR, h=H * 40 / CR, W=W2, H=H2),
    context=dict(W=CW, H=CH, res=CR), meta=meta, rain=rain, prepass=prepass, rain_corners=corners, xcheck=xcheck,
    places=[dict(name="Jazan", p=to_px(42.5511, 16.8892)), dict(name="Sabya", p=to_px(42.6254, 17.1495)),
            dict(name="Abu Arish", p=to_px(42.8325, 16.9689)), dict(name="Baysh Dam", p=to_px(42.658, 17.666), kind="dam"),
            dict(name="Jizan Dam", p=to_px(42.9575, 17.0492), kind="dam"), dict(name="Samtah", p=to_px(42.944, 16.596)),
            dict(name="Ahad al-Masarihah", p=to_px(42.8733, 16.7106)), dict(name="Al-Shuqaiq", p=to_px(42.0, 17.73)),
            dict(name="Fayfa (mountains)", p=to_px(43.11, 17.26), kind="peak")],
    regions=[dict(name="RED SEA", p=to_px(42.15, 17.25)), dict(name="SARAWAT MOUNTAINS", p=to_px(43.45, 17.55)), dict(name="YEMEN", p=to_px(43.3, 16.45))],
)
json.dump(vec, open(WEB + "data.json", "w"))
print("saved", len(meta["coh"]), "coh", len(meta["gcov"]), "gcov", len(meta["hls"]), "hls")
