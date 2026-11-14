"""Landsat C2 L2 over two Jazan sites: Baysh Dam reservoir (one clear scene per month, 2000-2026) and
Jazan City for Primary & Downstream Industries (one clear scene per year, 1987-2026)."""
import sys, os, time, json; sys.path.insert(0, os.path.dirname(__file__))
from hls_pc import catalog, grid
import numpy as np, rasterio
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
OUT = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/landsat/"
os.makedirs(OUT, exist_ok=True)
SITES = {"baysh": dict(bb=[42.60, 17.60, 42.82, 17.76], mode="month", years=range(2000, 2027)),
         "jcpdi": dict(bb=[42.27, 17.17, 42.52, 17.40], mode="year", years=range(1987, 2027))}
BANDS = ["blue", "green", "red", "nir08", "swir16", "swir22"]


def read(href, g, nod):
    with rasterio.open(href) as src:
        with WarpedVRT(src, crs=g["crs"], transform=g["transform"], width=g["width"], height=g["height"],
                       resampling=Resampling.nearest, nodata=nod) as v:
            return v.read(1)


def fetch(site, it, g, fn):
    qa = read(it.assets["qa_pixel"].href, g, 1).astype(np.uint16)
    bad = (qa == 1) | ((qa >> 3) & 1).astype(bool) | ((qa >> 4) & 1).astype(bool) | ((qa >> 1) & 1).astype(bool)
    out = {}
    for b in BANDS:
        a = read(it.assets[b].href, g, 0).astype(np.float32)
        out[b] = np.where((a == 0) | bad, np.nan, a * 0.0000275 - 0.2).astype(np.float16)
    v = float(np.isfinite(out["nir08"].astype(np.float32)).mean())
    np.savez_compressed(fn, date=it.datetime.date().isoformat(), platform=it.properties["platform"], **out)
    return v


for site, cfg in SITES.items():
    bb = cfg["bb"]; g = grid(bb, 30, crs="EPSG:32638")
    for yr in cfg["years"]:
        its = list(catalog().search(collections=["landsat-c2-l2"], bbox=bb, datetime=f"{yr}-01-01/{yr}-12-31",
                                    query={"eo:cloud_cover": {"lt": 40}}).items())
        full = [i for i in its if i.bbox[0] <= bb[0] and i.bbox[1] <= bb[1] and i.bbox[2] >= bb[2] and i.bbox[3] >= bb[3]]
        # prefer L8/9 > L5 > L7 (SLC-off stripes after May 2003)
        rank = lambda i: (i.properties["platform"] == "landsat-7" and i.datetime.year > 2003, i.properties["eo:cloud_cover"])
        groups = {}
        for i in full:
            key = i.datetime.month if cfg["mode"] == "month" else (0 if i.datetime.month in (1, 2, 3, 11, 12) else 1)
            groups.setdefault(key, []).append(i)
        picks = [sorted(v, key=rank)[0] for k, v in sorted(groups.items())]
        if cfg["mode"] == "year":
            picks = picks[:1]
        for it in picks:
            fn = OUT + f"{site}_{it.datetime.date().isoformat()}.npz"
            if os.path.exists(fn): continue
            t = time.time()
            try:
                v = fetch(site, it, g, fn)
            except Exception as e:
                print(site, it.id, "ERR", e, flush=True); continue
            print(site, it.datetime.date(), it.properties["platform"], "cc", round(it.properties["eo:cloud_cover"], 1),
                  "valid %.2f" % v, "%.0fs" % (time.time() - t), flush=True)
print("DONE")
