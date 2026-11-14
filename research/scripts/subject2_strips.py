"""Contact sheets of NISAR radar over a full year: Thwaites Glacier and Kilauea."""
import glob, os, datetime as dt, numpy as np
from PIL import Image
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/subject2/"
plt.rcParams.update({"font.family": "Segoe UI", "figure.facecolor": "#fcfcfb", "text.color": "#0b0b0b"})
def sheet(pat, title, sub, out, ncol):
    fs = sorted(glob.glob(R + "raw/" + pat))
    n = len(fs); nrow = -(-n // ncol)
    im0 = Image.open(fs[0]); asp = im0.height / im0.width
    fig, axs = plt.subplots(nrow, ncol, figsize=(4.6 * ncol, 4.6 * ncol * asp * nrow / ncol + 1.4))
    for ax in axs.flat: ax.axis("off")
    for ax, f in zip(axs.flat, fs):
        a = np.asarray(Image.open(f).convert("RGBA")).astype(float) / 255
        rgb = a[..., :3] * a[..., 3:] + 0.92 * (1 - a[..., 3:])
        ax.imshow(rgb); d = dt.date.fromisoformat(os.path.basename(f)[-14:-4])
        cov = (a[..., 3] > 0).mean()
        ax.set_title(d.strftime("%#d %b %Y") + ("" if cov > 0.85 else f"  (partial swath)"), loc="left", fontsize=12, fontweight="bold")
    fig.suptitle(title, x=0.01, ha="left", fontsize=17, fontweight="bold", y=0.995)
    fig.text(0.01, 0.955, sub, fontsize=10.5, color="#52514e")
    fig.subplots_adjust(left=0.005, right=0.995, top=0.91, bottom=0.01, wspace=0.02, hspace=0.12)
    fig.savefig(R + out, dpi=90); plt.close(fig); print(out, n)
sheet("nisar_thw_*.png", "Thwaites Glacier, Antarctica: one year of NISAR radar (Nov 2025 – Oct 2026)",
      "NASA-ISRO NISAR L2 GCOV via NASA GIBS. Radar works through polar night and cloud. Bright = rough ice and crevasses, dark = smooth sea ice or open water. 68 passes are available; 9 shown.",
      "thwaites_year.png", 3)
sheet("nisar_kilauea_*.png", "Kīlauea, Hawaiʻi: one year of NISAR radar (Nov 2025 – Nov 2026)",
      "NASA-ISRO NISAR L2 GCOV via NASA GIBS. Halemaʻumaʻu summit eruption episodes 40–56 fall in this window. 54 passes are available; 10 shown.",
      "kilauea_year.png", 5)
