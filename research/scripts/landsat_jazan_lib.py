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


