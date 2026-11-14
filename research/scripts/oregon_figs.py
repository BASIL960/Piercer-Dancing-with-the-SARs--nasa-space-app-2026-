"""Big Grass Fire (Oregon/Idaho, 2026): ignition -> spread -> containment -> early recovery,
plus the 2012 Long Draw burn next door as a 14-year recovery preview. Research figures (pre-hackathon)."""
import sys, os, glob, json, datetime as dt
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from scipy import ndimage
import rasterio
from rasterio.features import rasterize
from rasterio.warp import transform_geom, reproject, Resampling
from rasterio.transform import from_bounds
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.colors import LinearSegmentedColormap, ListedColormap, BoundaryNorm
from hls_pc import grid, nbr, ndvi

RAW = "C:/Users/B3B3/Desktop/workplase/nasa/research/oregon/raw/"
OUT = "C:/Users/B3B3/Desktop/workplase/nasa/research/oregon/"
BB = [-117.45, 42.0, -116.3, 42.95]
INK, INK2, MUTED, SURF, GRID = "#0b0b0b", "#52514e", "#8a8984", "#fcfcfb", "#e6e5e1"
BLUE, ORANGE = "#2a78d6", "#eb6834"
ORAMP = LinearSegmentedColormap.from_list("oramp", ["#f7b48f", "#eb6834", "#b8461b", "#6e2508"])
plt.rcParams.update({"font.family": "Segoe UI", "text.color": INK, "axes.labelcolor": INK2, "xtick.color": INK2,
                     "ytick.color": INK2, "figure.facecolor": SURF, "axes.facecolor": SURF, "savefig.facecolor": SURF})
CREDIT = ("NASA HLS v2 (Landsat 8/9 + Sentinel-2, 30 m) via Microsoft Planetary Computer · NASA VIIRS active-fire detections (NOAA-20/21, S-NPP) via NASA GIBS · "
          "NASA-ISRO NISAR L2 GCOV via GIBS · Fire perimeter: NIFC WFIGS (575,163 ac, cause: natural/lightning).")


def utm_grid(res):
    return grid(BB, res)


def perim_mask(g):
    gj = json.load(open(RAW + "big_grass_perimeter.geojson"))["features"][0]["geometry"]
    geom = transform_geom("EPSG:4326", g["crs"], gj)
    return rasterize([(geom, 1)], out_shape=(g["height"], g["width"]), transform=g["transform"], fill=0, dtype="uint8").astype(bool)


def perim_outline(mask):
    return mask & ~ndimage.binary_erosion(mask, iterations=2)


def load(tag, d):
    z = np.load(RAW + f"{tag}_{d}.npz")
    return {k: z[k] for k in z.files}


def stretch(a, lo, hi):
    return np.clip((a - lo) / (hi - lo), 0, 1)


def false_color(m, lo=(0.02, 0.05, 0.02), hi=(0.38, 0.40, 0.26)):
    """SWIR2-NIR-Red: healthy vegetation green, bare ground pink/tan, fresh burn dark maroon/brown."""
    rgb = np.dstack([stretch(m["swir2"], lo[0], hi[0]), stretch(m["nir"], lo[1], hi[1]), stretch(m["red"], lo[2], hi[2])])
    rgb = rgb ** 0.85
    return np.nan_to_num(rgb, nan=0.92)


def true_color(m):
    rgb = np.dstack([stretch(m["red"], 0.02, 0.30), stretch(m["green"], 0.02, 0.27), stretch(m["blue"], 0.01, 0.22)]) ** 0.8
    return np.nan_to_num(rgb, nan=0.92)


def viirs_on(g):
    first = np.load(RAW + "viirs_firstday.npy").astype(np.float32)
    H, W = first.shape
    src_t = from_bounds(-118.0, 41.9, -115.8, 43.4, W, H)
    dst = np.zeros((g["height"], g["width"]), np.float32)
    reproject(first, dst, src_transform=src_t, src_crs="EPSG:4326", dst_transform=g["transform"], dst_crs=g["crs"],
              resampling=Resampling.max)
    return dst  # day index 1.. (1 = 2026-07-20)


def km2(mask, res):
    return float(mask.sum()) * (res / 1000) ** 2


def clean_axes(ax):
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values(): s.set_visible(False)


def scalebar(ax, res, km=20, y_frac=0.95, color="white"):
    x0 = ax.get_xlim()[0] + (ax.get_xlim()[1] - ax.get_xlim()[0]) * 0.04
    y0 = ax.get_ylim()[0] + (ax.get_ylim()[1] - ax.get_ylim()[0]) * (1 - y_frac) * -1 if False else ax.get_ylim()[0] * y_frac
    L = km * 1000 / res
    ax.plot([x0, x0 + L], [y0, y0], color="black", lw=5, solid_capstyle="butt")
    ax.plot([x0, x0 + L], [y0, y0], color="white", lw=3, solid_capstyle="butt")
    ax.text(x0 + L / 2, y0 - 12, f"{km} km", ha="center", va="bottom", fontsize=9, color="white",
            bbox=dict(fc="black", ec="none", alpha=0.55, pad=1.5))


# ===================================================================== 1. HERO: before / after / severity (30 m)
def hero():
    g = utm_grid(30); P = perim_mask(g); O = perim_outline(P)
    pre, post, late = load("hls30", "2026-07-09"), load("hls30", "2026-08-30"), load("hls30", "2026-10-24")
    dnbr = nbr(pre) - nbr(post)
    sev = np.full(dnbr.shape, 0, np.uint8)
    for i, t in enumerate([0.10, 0.27, 0.44, 0.66]):
        sev[dnbr >= t] = i + 1
    sev[~np.isfinite(dnbr)] = 0
    # summary inside perimeter
    names = ["Unburned/very low", "Low", "Moderate-low", "Moderate-high", "High"]
    frac = {names[i]: float(((sev == i) & P).sum() / P.sum()) for i in range(5)}
    burned = km2(P & (sev >= 1), 30)
    fig, axs = plt.subplots(1, 3, figsize=(18.5, 7.9))
    for ax, img, t, sub in [(axs[0], false_color(pre), "Before · 9 Jul 2026", "False colour (SWIR-NIR-Red): sagebrush steppe in tan/green"),
                            (axs[1], false_color(post), "After · 30 Aug 2026", "Burned ground turns deep red")]:
        img = img.copy(); img[O] = [1, 1, 1]
        ax.imshow(img); clean_axes(ax)
        ax.set_title(t, loc="left", fontsize=14, fontweight="bold", pad=22)
        ax.text(0, 1.012, sub, transform=ax.transAxes, fontsize=10, color=INK2)
    base = np.dstack([np.nan_to_num(post["red"], nan=0.2)] * 3); base = (stretch(base, 0.02, 0.35) * 0.55 + 0.42)
    cols = ["#f7b48f", "#eb6834", "#b8461b", "#6e2508"]
    sevrgb = base.copy()
    for i, c in enumerate(cols):
        sevrgb[sev == i + 1] = matplotlib.colors.to_rgb(c)
    sevrgb[O] = [0.05, 0.05, 0.05]
    axs[2].imshow(sevrgb); clean_axes(axs[2])
    axs[2].set_title("Burn severity (dNBR)", loc="left", fontsize=14, fontweight="bold", pad=22)
    axs[2].text(0, 1.012, f"≈{burned:,.0f} km² changed inside the perimeter · black line = official perimeter", transform=axs[2].transAxes, fontsize=10, color=INK2)
    from matplotlib.patches import Patch
    axs[2].legend(handles=[Patch(color=c, label=l) for c, l in zip(cols, names[1:])], loc="lower right", fontsize=9,
                  frameon=True, facecolor="white", edgecolor="none", title="dNBR class", title_fontsize=9)
    for ax in axs: scalebar(ax, 30)
    fig.suptitle("Big Grass Fire: 575,000 acres in four weeks — but not all of it burned", x=0.008, y=0.99, ha="left", fontsize=20, fontweight="bold")
    fig.text(0.008, 0.925, f"Lightning ignition 23 Jul 2026, ~25 mi SW of Jordan Valley, Oregon · 93% contained by ~23 Aug · the official perimeter is 2,330 km², satellites show ≈{burned:,.0f} km² actually burned; the rest are unburned islands.",
             fontsize=11.5, color=INK2)
    fig.text(0.008, 0.015, CREDIT + " dNBR = NBR(9 Jul) − NBR(30 Aug); classes after Key & Benson (2006).", fontsize=8, color=INK2)
    fig.subplots_adjust(left=0.005, right=0.995, top=0.83, bottom=0.05, wspace=0.02)
    fig.savefig(OUT + "fig1_before_after_severity.png", dpi=110); plt.close(fig)
    return dict(burned_km2=round(burned), severity_fraction={k: round(v, 3) for k, v in frac.items()})


# ===================================================================== 2. PROGRESSION MAP + growth curve
NEWS = [("2026-07-28", 300000, "28 Jul · 300k ac · 5% contained", (-10, 6), "right"), ("2026-08-10", 541079, "10 Aug · 541k ac · 41%", (10, -14), "left"),
        ("2026-08-15", 578448, "15 Aug · 578k ac · 55%", (0, 10), "center"), ("2026-08-23", 578637, "23 Aug · 93% contained", (6, -22), "right")]


def progression():
    g = utm_grid(60); P = perim_mask(g); O = perim_outline(P)
    day = viirs_on(g)
    Pd = ndimage.binary_dilation(P, iterations=17)  # ~1 km slack for 375 m pixels
    day[~Pd] = 0
    d0 = dt.date(2026, 7, 20)
    post = load("hls60", "2026-08-23")
    gray = np.nan_to_num(post["red"] * 0.5 + post["nir"] * 0.5, nan=0.25)
    base = np.dstack([stretch(gray, 0.03, 0.35) * 0.5 + 0.45] * 3)
    img = base.copy()
    last = int(day.max())
    norm = plt.Normalize(4, 28)  # 23 Jul .. 16 Aug
    rgba = ORAMP(norm(np.clip(day, 4, 28)))[..., :3]
    m = day > 0
    img[m] = rgba[m]
    img[O] = [0.05, 0.05, 0.05]
    fig = plt.figure(figsize=(19, 8.4))
    ax = fig.add_axes([0.005, 0.13, 0.50, 0.74]); ax.imshow(img); clean_axes(ax)
    # origin star (EONET ignition point)
    from rasterio.warp import transform as wtr
    xs, ys = wtr("EPSG:4326", g["crs"], [-117.30335], [42.6498])
    col = (xs[0] - g["transform"].c) / 60; row = (g["transform"].f - ys[0]) / 60
    ax.plot(col, row, marker="*", ms=22, mfc="white", mec=INK, mew=1.5, zorder=5)
    ax.annotate("Ignition · lightning\n23 Jul", (col, row), xytext=(-150, -55), textcoords="offset points", fontsize=10,
                arrowprops=dict(arrowstyle="-", color=INK, lw=1), bbox=dict(fc="white", ec="none", alpha=0.85, pad=2))
    ax.set_title("Where the fire burned each day", loc="left", fontsize=14, fontweight="bold", pad=22)
    ax.text(0, 1.012, "First VIIRS satellite fire detection per pixel (375 m), inside the official perimeter (black)", transform=ax.transAxes, fontsize=10, color=INK2)
    cax = fig.add_axes([0.13, 0.075, 0.25, 0.02])
    cb = fig.colorbar(plt.cm.ScalarMappable(norm=norm, cmap=ORAMP), cax=cax, orientation="horizontal")
    ticks = [4, 10, 16, 22, 28]
    cb.set_ticks(ticks); cb.set_ticklabels([(d0 + dt.timedelta(t - 1)).strftime("%-d %b" if os.name != "nt" else "%#d %b") for t in ticks])
    cb.outline.set_visible(False); cax.tick_params(labelsize=9, length=0)
    scalebar(ax, 60)
    # growth curve
    ax2 = fig.add_axes([0.57, 0.13, 0.41, 0.70])
    days = np.arange(1, last + 1)
    new = np.array([((day == k) & P).sum() * 0.0036 for k in days])
    cum = np.cumsum(new)
    dates = [d0 + dt.timedelta(int(k) - 1) for k in days]
    scale = 2327.6 / cum[-1]  # VIIRS footprint over-counts: index cumulative detections to official final area
    ax2.bar(dates, new * scale, width=0.8, color="#f7b48f", label="New area detected that day")
    ax2.plot(dates, cum * scale, color=ORANGE, lw=2.2, label="Cumulative burned area (VIIRS, scaled to final perimeter)")
    for d, ac, lab, off, ha in NEWS:
        x = dt.date.fromisoformat(d); y = ac * 0.004047
        ax2.plot(x, y, "o", ms=8, mfc=SURF, mec=INK, mew=1.6, zorder=4)
        ax2.annotate(lab, (x, y), xytext=off, textcoords="offset points", fontsize=9, color=INK, ha=ha)
    ax2.plot([], [], "o", ms=8, mfc=SURF, mec=INK, mew=1.6, label="Reported size & containment (news)")
    ax2.set_ylabel("Area (km²)"); ax2.set_ylim(0, 2700)
    ax2.xaxis.set_major_formatter(mdates.DateFormatter("%-d %b" if os.name != "nt" else "%#d %b"))
    ax2.grid(axis="y", color=GRID, lw=0.8); ax2.set_axisbelow(True)
    for s in ["top", "right", "left"]: ax2.spines[s].set_visible(False)
    ax2.spines["bottom"].set_color("#c9c8c2"); ax2.tick_params(length=0)
    ax2.legend(loc="upper left", bbox_to_anchor=(0, 1.0), frameon=False, fontsize=9.5)
    big = dates[int(np.argmax(new))]
    ax2.set_title(f"Half the area burned in the first {(dt.date.fromisoformat(str(dates[int(np.searchsorted(cum, cum[-1] / 2))])) - dt.date(2026,7,23)).days + 1} days", loc="left", fontsize=14, fontweight="bold", pad=22)
    ax2.text(0, 1.012, f"Largest single-day run: {big.strftime('%#d %b' if os.name=='nt' else '%-d %b')} · a second surge 1–10 Aug · new lightning starts 25–27 Aug",
             transform=ax2.transAxes, fontsize=10, color=INK2)
    fig.suptitle("Big Grass Fire: from a single lightning strike to 575,000 acres", x=0.008, y=0.985, ha="left", fontsize=20, fontweight="bold")
    fig.text(0.008, 0.012, CREDIT + " News: idahonews.com, Elkhorn Media Group, NIFC.", fontsize=8, color=INK2)
    fig.savefig(OUT + "fig2_progression.png", dpi=110); plt.close(fig)
    half = dates[int(np.searchsorted(cum, cum[-1] / 2))]
    return dict(peak_day=big.isoformat(), half_area_by=half.isoformat(),
                daily_km2={d.isoformat(): round(float(v * scale), 1) for d, v in zip(dates, new) if v > 0})


# ===================================================================== 3. TIME STRIP (60 m) with burned area per frame
def strip():
    g = utm_grid(60); P = perim_mask(g); O = perim_outline(P)
    files = sorted(glob.glob(RAW + "hls60_*.npz"))
    dates = [os.path.basename(f)[6:16] for f in files]
    pre = load("hls60", "2026-07-09"); nb0 = nbr(pre)
    pick = ["2026-07-09", "2026-07-24", "2026-07-29", "2026-08-03", "2026-08-10", "2026-08-23", "2026-09-17", "2026-10-07", "2026-10-24"]
    late = load("hls60", "2026-10-17")
    pick = [d for d in pick if d in dates]
    ys, xs = np.nonzero(ndimage.binary_dilation(P, iterations=30))
    r0, r1, c0, c1 = ys.min(), ys.max(), xs.min(), xs.max()
    fig, axs = plt.subplots(3, 3, figsize=(17, 15.5))
    rows = []
    for ax, d in zip(axs.flat, pick):
        m = load("hls60", d)
        if d == "2026-10-24":  # fill the swath edge with the 17 Oct scene
            m = {k: np.where(np.isfinite(v), v, late[k]) for k, v in m.items()}
        img = false_color(m); img[O] = [1, 1, 1]
        burnt = (nb0 - nbr(m)) > 0.1
        a = km2(burnt & P & np.isfinite(nbr(m)), 60); cov = float(np.isfinite(m["nir"])[P].mean())
        rows.append(dict(date=d, burned_km2=round(a), valid=round(cov, 2)))
        ax.imshow(img[r0:r1, c0:c1]); clean_axes(ax)
        lab = dt.date.fromisoformat(d).strftime("%#d %b %Y" if os.name == "nt" else "%-d %b %Y") + (" (+17 Oct)" if d == "2026-10-24" else "")
        ax.set_title(lab, loc="left", fontsize=13, fontweight="bold", pad=18)
        verb = "burned so far" if d <= "2026-08-23" else "still reads as burned (scar fading)"
        sub = "pre-fire baseline" if d == "2026-07-09" else f"≈{a:,.0f} km² {verb}" + ("" if cov > 0.9 else f" · clouds/gaps {1-cov:.0%}")
        ax.text(0, 1.01, sub, transform=ax.transAxes, fontsize=10, color=INK2)
    fig.suptitle("Big Grass Fire, frame by frame (false colour: burn = deep red, green = live vegetation, white line = final perimeter)",
                 x=0.01, y=0.995, ha="left", fontsize=18, fontweight="bold")
    fig.text(0.01, 0.006, CREDIT + " Burned = NBR drop > 0.1 vs 9 Jul.", fontsize=8, color=INK2)
    fig.subplots_adjust(left=0.005, right=0.995, top=0.94, bottom=0.025, wspace=0.02, hspace=0.12)
    fig.savefig(OUT + "fig3_frame_by_frame.png", dpi=100); plt.close(fig)
    return rows


# ===================================================================== 4. RECOVERY: optical + radar by burn severity
def _style(ax):
    ax.axvspan(dt.date(2026, 7, 23), dt.date(2026, 8, 23), color="#f3e7df", lw=0)
    ax.text(dt.date(2026, 8, 7), 1.0, "fire active", transform=ax.get_xaxis_transform(), ha="center", va="top", fontsize=9, color=INK2)
    ax.grid(axis="y", color=GRID, lw=0.8); ax.set_axisbelow(True)
    for s in ["top", "right", "left"]: ax.spines[s].set_visible(False)
    ax.spines["bottom"].set_color("#c9c8c2"); ax.tick_params(length=0)
    ax.xaxis.set_major_locator(mdates.MonthLocator()); ax.xaxis.set_major_formatter(mdates.DateFormatter("%b"))
    ax.set_xlim(dt.date(2026, 5, 28), dt.date(2026, 11, 3))


def recovery():
    g = utm_grid(60); P = perim_mask(g)
    dn = nbr(load("hls60", "2026-07-09")) - nbr(load("hls60", "2026-08-30"))
    dist = ndimage.distance_transform_edt(~P) * 60
    groups = [("Burned hot (dNBR > 0.44: juniper & tall shrub)", P & (dn > 0.44), "#6e2508"),
              ("Burned lightly (dNBR 0.1–0.27: grass & low sage)", P & (dn > 0.1) & (dn < 0.27), ORANGE),
              ("Unburned land 3–15 km outside", (dist > 3000) & (dist < 15000), BLUE)]
    opt = []
    for f in sorted(glob.glob(RAW + "hls60_*.npz")):
        d = os.path.basename(f)[6:16]; b = nbr(load("hls60", d))
        if np.isfinite(b[P]).mean() < 0.6: continue
        opt.append((d, [float(np.nanmedian(b[m])) for _, m, _ in groups]))
    rad = []
    for f in sorted(glob.glob(RAW + "nisar_*.png")):
        d = os.path.basename(f)[6:16]
        a = np.asarray(Image.open(f).convert("RGBA")).astype(np.float32)
        H, W = a.shape[:2]; gx = a[..., 1].copy(); gx[a[..., 3] == 0] = np.nan  # green = cross-pol (HV)
        dst = np.full((g["height"], g["width"]), np.nan, np.float32)
        reproject(gx, dst, src_transform=from_bounds(*BB, W, H), src_crs="EPSG:4326", dst_transform=g["transform"], dst_crs=g["crs"],
                  resampling=Resampling.average, src_nodata=np.nan, dst_nodata=np.nan)
        rad.append((d, [float(np.nanmean(dst[m])) for _, m, _ in groups]))
    base = np.mean([r[1] for r in rad if r[0] < "2026-07-23"], axis=0)
    fig, axs = plt.subplots(1, 2, figsize=(18, 6.6))
    for ax in axs: _style(ax)
    xo = [dt.date.fromisoformat(r[0]) for r in opt]; xr = [dt.date.fromisoformat(r[0]) for r in rad]
    for i, (lab, _, c) in enumerate(groups):
        axs[0].plot(xo, [r[1][i] for r in opt], color=c, lw=2, marker="o", ms=7, mec=SURF, mew=2, label=lab)
        axs[1].plot(xr, [100 * r[1][i] / base[i] for r in rad], color=c, lw=2, marker="o", ms=7, mec=SURF, mew=2)
    axs[0].set_ylabel("Median NBR (higher = more live vegetation)")
    axs[1].set_ylabel("Radar HV brightness, % of pre-fire level")
    axs[1].axhline(100, color="#c9c8c2", lw=1)
    hot_now = 100 * rad[-1][1][0] / base[0]; out_now = 100 * rad[-1][1][2] / base[2]
    axs[0].set_title("Optical: the scar opens fast; October rain greens the grass a little", loc="left", fontsize=14, fontweight="bold", pad=28)
    axs[0].text(0, 1.03, "NASA HLS (Landsat + Sentinel-2), every clear day June–October 2026", transform=axs[0].transAxes, fontsize=10, color=INK2)
    axs[1].set_title(f"Radar: where it burned hot, {100-hot_now:.0f}% of the shrub signal is gone", loc="left", fontsize=14, fontweight="bold", pad=28)
    axs[1].text(0, 1.03, f"NISAR every 12 days, same orbit, no clouds · unburned land: {100-out_now:.0f}% seasonal drying · no NISAR data 27 Jul–10 Aug",
                transform=axs[1].transAxes, fontsize=10, color=INK2)
    fig.legend(*axs[0].get_legend_handles_labels(), loc="lower center", ncol=3, frameon=False, fontsize=10.5, bbox_to_anchor=(0.5, 0.045))
    fig.text(0.008, 0.008, CREDIT + " Radar = green (HV) channel of the Worldview NISAR rendering, vs 22 Jun–16 Jul mean (approximate).",
             fontsize=8, color=INK2)
    fig.subplots_adjust(left=0.05, right=0.99, top=0.86, bottom=0.17, wspace=0.16)
    fig.savefig(OUT + "fig4_recovery_2026.png", dpi=110); plt.close(fig)
    names = ["hot", "light", "outside"]
    return dict(optical_nbr=[dict(date=d, **{n: round(v, 3) for n, v in zip(names, vals)}) for d, vals in opt],
                radar_pct_of_prefire=[dict(date=d, **{n: round(100 * v / b, 1) for n, v, b in zip(names, vals, base)}) for d, vals in rad])


# ===================================================================== 5. LONG DRAW 2012: 14-year recovery preview
def longdraw():
    g = grid([-118.15, 42.10, -117.10, 42.75], 90)

    def rz(fn):
        gj = json.load(open(RAW + fn))["features"][0]["geometry"]
        return rasterize([(transform_geom("EPSG:4326", g["crs"], gj), 1)], out_shape=(g["height"], g["width"]), transform=g["transform"], fill=0).astype(bool)
    L = rz("long_draw_2012.geojson"); BG = ndimage.binary_dilation(rz("big_grass_perimeter.geojson"), iterations=20)
    core = ndimage.binary_erosion(L, iterations=4) & ~BG
    dist = ndimage.distance_transform_edt(~L) * 90
    ring = (dist > 3000) & (dist < 15000) & ~BG
    rows = []
    for f in sorted(glob.glob(RAW + "ld_landsat_*.npz")):
        z = np.load(f); yr = int(os.path.basename(f)[11:15])
        s = z["swir22"]
        if np.isfinite(s[core]).mean() < 0.7: continue
        rows.append(dict(year=yr, date=str(z["date"]), scar=100 * float(np.nanmedian(s[core]) - np.nanmedian(s[ring])),
                         img=np.nan_to_num(np.dstack([stretch(z["swir22"], 0.02, 0.38), stretch(z["nir08"], 0.05, 0.40), stretch(z["red"], 0.02, 0.26)]) ** 0.85, nan=0.92)))
    O = L & ~ndimage.binary_erosion(L, iterations=3)
    fig = plt.figure(figsize=(19, 10.5))
    show = [r for r in rows if r["year"] in (2011, 2013, 2015, 2020, 2025)]
    for i, r in enumerate(show):
        ax = fig.add_axes([0.005 + i * 0.199, 0.50, 0.195, 0.36]); im = r["img"].copy(); im[O] = [1, 1, 0.55]
        ax.imshow(im); clean_axes(ax)
        ax.set_title(str(r["year"]) + (" · before" if r["year"] < 2012 else f" · {r['year']-2012} yr after"), loc="left", fontsize=12.5, fontweight="bold", pad=6)
    ax = fig.add_axes([0.07, 0.08, 0.90, 0.32])
    pre = np.mean([r["scar"] for r in rows if r["year"] < 2012])
    good = [r for r in rows if r["year"] != 2026]
    ax.axhspan(pre - 0.25, pre + 0.25, color="#e8f0fb", lw=0)
    ax.text(2008.1, pre - 0.3, "pre-fire level", fontsize=9.5, color=INK2, va="top")
    ax.axvline(2012, color=INK2, lw=1, ls=(0, (3, 3)))
    ax.text(2011.9, max(r["scar"] for r in good), "Long Draw Fire\nJuly 2012", fontsize=9.5, color=INK2, va="top", ha="right")
    ax.plot([r["year"] for r in good], [r["scar"] for r in good], color=ORANGE, lw=2.2, marker="o", ms=8, mec=SURF, mew=2)
    r26 = [r for r in rows if r["year"] == 2026]
    if r26:
        ax.plot(2026, r26[0]["scar"], "o", ms=8, mfc=SURF, mec=ORANGE, mew=2)
        ax.annotate("2026: Big Grass Fire burning next door\n(smoke and ash, not comparable)", (2026, r26[0]["scar"]), xytext=(-12, 0),
                    textcoords="offset points", ha="right", va="center", fontsize=9, color=INK2)
    late = np.mean([r["scar"] for r in good if r["year"] >= 2016])
    ax.set_ylabel("Scar brightness\n(SWIR, burn minus surroundings, %)")
    for s in ["top", "right", "left"]: ax.spines[s].set_visible(False)
    ax.grid(axis="y", color=GRID, lw=0.8); ax.set_axisbelow(True); ax.tick_params(length=0)
    yrs = [r["year"] for r in rows]; ax.set_xticks(yrs); ax.set_xticklabels([str(y) for y in yrs], fontsize=9)
    fig.suptitle("What comes next? The 2012 Long Draw burn faded from view in ~3 years, but never fully healed",
                 x=0.008, y=0.985, ha="left", fontsize=20, fontweight="bold")
    fig.text(0.008, 0.925, "Landsat false colour each summer (yellow line = 2012 perimeter, 558,000 ac, right next to Big Grass). Burned sagebrush leaves brighter soil and dry grass. "
             f"Since 2016 the scar has stayed ≈{late - pre:.1f} points brighter than before the fire.", fontsize=11.5, color=INK2)
    fig.text(0.008, 0.01, "Landsat 5 / 8 / 9 Collection 2 Level-2 (NASA/USGS) via Microsoft Planetary Computer · one clear summer scene per year (2012 has no clean scene) · "
             "perimeter: NIFC Interagency Fire Perimeter History · Big Grass area masked out.", fontsize=8, color=INK2)
    fig.savefig(OUT + "fig5_long_draw_recovery.png", dpi=105); plt.close(fig)
    return dict(prefire=round(pre, 2), mean_since_2016=round(late, 2), years=[dict(year=r["year"], date=r["date"], scar=round(r["scar"], 2)) for r in rows])


# ===================================================================== 6. Animated GIF (false colour, all dates)
def gif():
    from PIL import ImageDraw, ImageFont
    g = utm_grid(60); P = perim_mask(g); O = perim_outline(P)
    ys, xs = np.nonzero(ndimage.binary_dilation(P, iterations=30)); r0, r1, c0, c1 = ys.min(), ys.max(), xs.min(), xs.max()
    try: f1 = ImageFont.truetype("seguisb.ttf", 30); f2 = ImageFont.truetype("segoeui.ttf", 17)
    except OSError: f1 = f2 = ImageFont.load_default()
    frames = []
    for f in sorted(glob.glob(RAW + "hls60_*.npz")):
        d = os.path.basename(f)[6:16]; m = load("hls60", d)
        if np.isfinite(m["nir"])[P].mean() < 0.85: continue
        img = false_color(m); img[O] = [1, 1, 1]
        im = Image.fromarray((img[r0:r1, c0:c1] * 255).astype(np.uint8)); W = 640
        im = im.resize((W, int(im.height * W / im.width)), Image.LANCZOS)
        dr = ImageDraw.Draw(im); dr.rectangle([0, 0, W, 70], fill=(11, 11, 11))
        dr.text((16, 6), dt.date.fromisoformat(d).strftime("%d %b %Y"), font=f1, fill=(255, 255, 255))
        dr.text((18, 44), "Big Grass Fire · NASA HLS false colour (burn = deep red)", font=f2, fill=(195, 194, 183))
        frames.append(im.convert("P", palette=Image.ADAPTIVE, colors=128))
    frames[0].save(OUT + "anim_big_grass.gif", save_all=True, append_images=frames[1:], duration=[1100] * len(frames), loop=0)
    return len(frames)


if __name__ == "__main__":
    which = sys.argv[1:] or ["hero", "progression", "strip", "recovery", "longdraw", "gif"]
    res = {}
    if os.path.exists(OUT + "oregon_findings.json"):
        res = json.load(open(OUT + "oregon_findings.json"))
    for w in which:
        res[w] = globals()[w]()
        print(w, "ok", flush=True)
    json.dump(res, open(OUT + "oregon_findings.json", "w"), indent=1, default=str)
