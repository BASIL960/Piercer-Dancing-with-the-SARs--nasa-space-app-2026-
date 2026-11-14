"""Exploratory figures: center-pivot farms in Al-Jouf and Al-Qassim (research only, pre-hackathon)."""
import sys, glob, os, json, datetime as dt
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from classify import optical_veg, radar_veg, px_area_km2

RAW = "C:/Users/B3B3/Desktop/workplase/nasa/research/pivot-exploration/raw/"
OUT = "C:/Users/B3B3/Desktop/workplase/nasa/research/pivot-exploration/"
BOX = {"jouf": (29.65, 38.0, 30.35, 38.65), "qassim": (26.05, 43.15, 26.55, 43.75)}
NAME = {"jouf": "Al-Jouf (Wadi As-Sirhan)", "qassim": "Al-Qassim (west of Buraydah)"}
INK, INK2, SURF = "#0b0b0b", "#52514e", "#fcfcfb"
C = {"jouf": "#2a78d6", "qassim": "#eb6834"}
GAIN, LOSS = "#2a78d6", "#eb6834"
plt.rcParams.update({"font.family": "Segoe UI", "text.color": INK, "axes.labelcolor": INK2,
                     "xtick.color": INK2, "ytick.color": INK2, "figure.facecolor": SURF,
                     "axes.facecolor": SURF, "savefig.facecolor": SURF})
CREDIT_OPT = "Imagery: NASA GIBS/Worldview — Landsat WELD monthly composites (USGS/NASA), HLS Sentinel-2 (NASA). Green = vegetation detected by colour threshold (approximate). Black = no image data."
CREDIT_SAR = ("Radar: NASA-ISRO NISAR L-band L2 GCOV (PROVISIONAL), Worldview RGB rendering via NASA GIBS. "
              "Green = high cross-pol backscatter (vegetation volume). Approximate, from rendered imagery — not calibrated values.")


def farm_zone(k, shape):
    """Exclude the rocky escarpment in SW Al-Jouf that mimics vegetation in radar."""
    h, w = shape
    m = np.ones(shape, bool)
    if k == "jouf":
        yy, xx = np.mgrid[0:h, 0:w]
        m &= ~((xx < 0.42 * w) & (yy > 0.68 * h))
    return m


def count_pivots(veg, bbox):
    """Count roughly circular green blobs the size of a center pivot (0.12–1.6 km²)."""
    A = px_area_km2(bbox, veg.shape)
    lab, n = ndimage.label(ndimage.binary_opening(veg, iterations=1))
    if n == 0:
        return 0
    sl = ndimage.find_objects(lab)
    sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
    cnt = 0
    for i, s in enumerate(sl):
        area = sizes[i] * A
        if not (0.12 <= area <= 1.6):
            continue
        hh, ww = s[0].stop - s[0].start, s[1].stop - s[1].start
        fill = sizes[i] / (hh * ww)
        if 0.6 <= hh / ww <= 1.6 and 0.6 <= fill <= 0.95:
            cnt += 1
    return cnt


def stats(k, img, kind):
    veg, valid = (radar_veg if kind == "sar" else optical_veg)(img)
    veg &= farm_zone(k, veg.shape)
    A = px_area_km2(BOX[k], veg.shape)
    return veg, float(veg.sum() * A), count_pivots(veg, BOX[k])


def scalebar(ax, k, w_px, km=10):
    la0, lo0, la1, lo1 = BOX[k]
    km_per_px = (lo1 - lo0) * 111.32 * np.cos(np.radians((la0 + la1) / 2)) / w_px
    L = km / km_per_px
    x0, y0 = w_px * 0.05, ax.get_ylim()[0] * 0.95
    ax.plot([x0, x0 + L], [y0, y0], color="white", lw=4, solid_capstyle="butt")
    ax.plot([x0, x0 + L], [y0, y0], color=INK, lw=2, solid_capstyle="butt")
    ax.text(x0 + L / 2, y0 - w_px * 0.02, f"{km} km", ha="center", va="bottom", fontsize=9,
            color=INK, bbox=dict(fc="white", ec="none", alpha=0.8, pad=1.5))


def panel(ax, img, title, sub):
    ax.imshow(img)
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values():
        s.set_visible(False)
    ax.set_title(title, loc="left", fontsize=13, fontweight="bold", color=INK, pad=22)
    ax.text(0, 1.012, sub, transform=ax.transAxes, fontsize=10, color=INK2, va="bottom")


# ---------------------------------------------------------------- 1. decades (optical)
def decades(k, files, headline, finding, fname):
    ims, rows = [], []
    for label, f in files:
        im = Image.open(RAW + f).convert("RGB")
        veg, area, piv = stats(k, im, "opt")
        ims.append((label, im)); rows.append(dict(label=label, file=f, green_km2=round(area), pivots=piv))
    fig, axs = plt.subplots(1, len(ims), figsize=(4.6 * len(ims), 6.2))
    for ax, (label, im), r in zip(axs, ims, rows):
        panel(ax, im, label, f"Green cropland ≈ {r['green_km2']} km² · {r['pivots']} active pivots")
    scalebar(axs[0], k, ims[0][1].width)
    fig.suptitle(headline, x=0.012, y=0.985, ha="left", fontsize=19, fontweight="bold")
    fig.text(0.012, 0.915, finding, ha="left", fontsize=11.5, color=INK2)
    fig.text(0.012, 0.02, f"{NAME[k]} · {BOX[k][0]}–{BOX[k][2]}°N, {BOX[k][1]}–{BOX[k][3]}°E · " + CREDIT_OPT,
             fontsize=8.5, color=INK2)
    fig.subplots_adjust(left=0.01, right=0.99, top=0.80, bottom=0.06, wspace=0.03)
    fig.savefig(OUT + fname, dpi=110); plt.close(fig)
    return rows


# ---------------------------------------------------------------- 2. NISAR change map
def change(k, d0, d1, headline, finding_tpl, fname):
    a = Image.open(RAW + f"nisar_{k}_{d0}.png").convert("RGB")
    b = Image.open(RAW + f"nisar_{k}_{d1}.png").convert("RGB")
    va, area_a, pa = stats(k, a, "sar")
    vb, area_b, pb = stats(k, b, "sar")
    A = px_area_km2(BOX[k], va.shape)
    # clean single-pixel speckle before differencing
    va_c = ndimage.binary_opening(va, iterations=1); vb_c = ndimage.binary_opening(vb, iterations=1)
    gain = vb_c & ~ndimage.binary_dilation(va_c, iterations=1)
    loss = va_c & ~ndimage.binary_dilation(vb_c, iterations=1)

    def drop_small(m, min_km2=0.04):  # keep field-sized patches only (~small pivot or larger)
        lab, n = ndimage.label(m)
        if n == 0:
            return m
        sz = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
        keep = np.zeros(n + 1, bool); keep[1:] = sz * A >= min_km2
        return keep[lab]
    gain, loss = drop_small(gain), drop_small(loss)
    g_km2, l_km2 = gain.sum() * A, loss.sum() * A
    gray = np.asarray(b.convert("L")).astype(float)
    base = np.stack([gray * 0.30 + 175] * 3, -1).clip(0, 255)
    gain = ndimage.binary_dilation(gain, iterations=2)
    loss = ndimage.binary_dilation(loss, iterations=2) & ~gain
    ov = base.copy()
    ov[loss] = [235, 104, 52]
    ov[gain] = [42, 120, 214]
    ov = Image.fromarray(ov.astype(np.uint8))
    fmt = lambda d: dt.date.fromisoformat(d).strftime("%-d %b %Y") if os.name != "nt" else dt.date.fromisoformat(d).strftime("%#d %b %Y")
    fig, axs = plt.subplots(1, 3, figsize=(17, 7.0))
    panel(axs[0], a, f"NISAR · {fmt(d0)}", f"Vegetated ≈ {area_a:.0f} km²")
    panel(axs[1], b, f"NISAR · {fmt(d1)}", f"Vegetated ≈ {area_b:.0f} km²")
    panel(axs[2], ov, "What changed (field-sized patches ≥ 0.04 km²)",
          f"Blue: became vegetated ({g_km2:.0f} km²) · Orange: vegetation gone ({l_km2:.0f} km²)")
    scalebar(axs[0], k, a.width)
    fig.suptitle(headline, x=0.012, y=0.985, ha="left", fontsize=19, fontweight="bold")
    fig.text(0.012, 0.905, finding_tpl.format(g=g_km2, l=l_km2, a=area_a, b=area_b, pa=pa, pb=pb),
             ha="left", fontsize=11.5, color=INK2)
    fig.text(0.012, 0.02, f"{NAME[k]} · same orbit track, 12-day repeat · " + CREDIT_SAR, fontsize=8.5, color=INK2)
    fig.subplots_adjust(left=0.01, right=0.99, top=0.79, bottom=0.06, wspace=0.03)
    fig.savefig(OUT + fname, dpi=110); plt.close(fig)
    return dict(d0=d0, d1=d1, veg0=round(area_a), veg1=round(area_b), piv0=pa, piv1=pb, gain=round(g_km2), loss=round(l_km2))


# ---------------------------------------------------------------- 3. NISAR time series
def timeseries():
    ts = {}
    for k in BOX:
        rows = []
        for f in sorted(glob.glob(RAW + f"nisar_{k}_*.png")):
            d = os.path.basename(f)[len(f"nisar_{k}_"):-4]
            _, area, piv = stats(k, Image.open(f).convert("RGB"), "sar")
            rows.append((d, area, piv))
        ts[k] = rows
    fig, ax = plt.subplots(figsize=(11, 5.2))
    ax.axvspan(dt.date(2026, 7, 27), dt.date(2026, 8, 10), color="#e9e8e4", lw=0)
    ax.text(dt.date(2026, 8, 3), 160, "NISAR\ndata gap", ha="center", va="top", fontsize=9, color=INK2)
    for k, rows in ts.items():
        x = [dt.date.fromisoformat(r[0]) for r in rows]; y = [r[1] for r in rows]
        gi = next(i for i, d in enumerate(x) if d > dt.date(2026, 8, 1))
        xp = x[:gi] + [dt.date(2026, 8, 3)] + x[gi:]; yp = y[:gi] + [np.nan] + y[gi:]
        ax.plot(xp, yp, color=C[k], lw=2, marker="o", ms=7, mec=SURF, mew=2, label=NAME[k], zorder=3)
        ax.annotate(f"{NAME[k].split(' (')[0]}  {y[-1]:.0f} km²", (x[-1], y[-1]), xytext=(8, 0),
                    textcoords="offset points", va="center", fontsize=10, color=INK)
    ax.set_ylim(0, 165)
    ax.set_xlim(dt.date(2026, 6, 15), dt.date(2026, 12, 5))
    ax.set_ylabel("Vegetated area seen by radar (km²)")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b"))
    ax.grid(axis="y", color="#e6e5e1", lw=0.8); ax.set_axisbelow(True)
    for s in ["top", "right", "left"]:
        ax.spines[s].set_visible(False)
    ax.spines["bottom"].set_color("#c9c8c2")
    ax.tick_params(length=0)
    ax.legend(loc="lower left", bbox_to_anchor=(0, 1.0), ncol=2, frameon=False, fontsize=10)
    ax.set_title("Summer fallow, autumn green-up: NISAR every 12 days, Jun–Nov 2026", loc="left",
                 fontsize=15, fontweight="bold", pad=52)
    ax.text(0, 1.12, "Area with strong cross-polarized radar return (crops/trees), one orbit track per site",
            transform=ax.transAxes, fontsize=10.5, color=INK2)
    fig.text(0.01, 0.01, CREDIT_SAR, fontsize=8, color=INK2)
    fig.subplots_adjust(left=0.08, right=0.84, top=0.83, bottom=0.12)
    fig.savefig(OUT + "fig5_nisar_timeseries.png", dpi=120); plt.close(fig)
    return {k: [dict(date=d, veg_km2=round(a), pivots=p) for d, a, p in v] for k, v in ts.items()}


# ---------------------------------------------------------------- 4. animated GIFs
def gif(k):
    frames = []
    try:
        font = ImageFont.truetype("seguisb.ttf", 34); small = ImageFont.truetype("segoeui.ttf", 18)
    except OSError:
        font = small = ImageFont.load_default()
    for f in sorted(glob.glob(RAW + f"nisar_{k}_*.png")):
        d = dt.date.fromisoformat(os.path.basename(f)[len(f"nisar_{k}_"):-4])
        im = Image.open(f).convert("RGB"); W = 900
        im = im.resize((W, int(im.height * W / im.width)), Image.LANCZOS)
        dr = ImageDraw.Draw(im)
        dr.rectangle([0, 0, W, 78], fill=(11, 11, 11))
        dr.text((18, 8), d.strftime("%d %b %Y"), font=font, fill=(255, 255, 255))
        dr.text((20, 50), f"NISAR L-band radar · {NAME[k]}", font=small, fill=(195, 194, 183))
        frames.append(im.convert("P", palette=Image.ADAPTIVE, colors=200))
    frames[0].save(OUT + f"anim_nisar_{k}.gif", save_all=True, append_images=frames[1:],
                   duration=900, loop=0)


if __name__ == "__main__":
    res = {}
    res["jouf_decades"] = decades("jouf", [("March 1986", "weld_jouf_1986-03.png"), ("March 1991", "weld_jouf_1991-03.png"),
                                           ("March 2000", "weld_jouf_2000-03.png"), ("9 March 2026", "hls_jouf_2026-03-09.png")],
                                  "Al-Jouf: a farm grid grew out of bare desert", "Peak-season (March) green cropland went from none in 1986 to ~380 km² by 2000 — and the grid is still farmed in 2026 (~340 km², ~470 active pivots).", "fig1_jouf_decades.png")
    res["qassim_decades"] = decades("qassim", [("March 1985", "weld_qassim_1985-03.png"), ("March 2000", "weld_qassim_2000-03.png"),
                                               ("March 2001", "weld_qassim_2001-03.png"), ("8 March 2026", "hls_qassim_2026-03-08.png")],
                                    "Al-Qassim: fewer circles are green at the peak of the wheat season", "March 2026 shows ~120 km² of green cropland — the lowest of the four snapshots, 35–65% below 2000–2001. Many old circles are still visible as pale, unplanted scars.", "fig2_qassim_decades.png")
    res["timeseries"] = timeseries()
    res["jouf_change"] = change("jouf", "2026-06-22", "2026-10-08", "Al-Jouf from radar: summer crops come off the fields",
        "Between late June and early October the area NISAR sees as vegetated fell from ~{a:.0f} to ~{b:.0f} km² ({l:.0f} km² lost, {g:.0f} km² new) — consistent with summer harvest and fallow before winter planting.",
        "fig4_nisar_jouf_change.png")
    res["qassim_change"] = change("qassim", "2026-09-29", "2026-11-04", "Al-Qassim from radar: circles switch on as the winter season starts",
        "From late September to early November NISAR shows {g:.0f} km² becoming vegetated — many as complete circles — consistent with autumn planting under center pivots.",
        "fig3_nisar_qassim_change.png")
    for k in BOX: gif(k)
    json.dump(res, open(OUT + "findings_raw.json", "w"), indent=1)
    print(json.dumps(res, indent=1))
