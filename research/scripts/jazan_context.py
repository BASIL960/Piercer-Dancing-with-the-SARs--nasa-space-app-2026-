"""Wide context mosaic around the Jazan lowlands radar study area (Landsat 8/9 dry season, 160 m)."""
import sys, os, math, numpy as np; sys.path.insert(0, os.path.dirname(__file__))
from hls_pc import catalog, grid
import rasterio
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
from rasterio.transform import from_origin
OUT = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/"
import pickle; g = pickle.load(open(OUT + "gunw/grid40.pkl", "rb")); X0, Y0 = g["transform"].c, g["transform"].f
WIDE = [41.80, 16.30, 43.85, 18.30]
from rasterio.warp import transform_bounds
w, s, e, n = transform_bounds("EPSG:4326", "EPSG:32638", *WIDE)
CR = 160
cx0 = X0 - math.ceil((X0 - w) / CR) * CR; cy0 = Y0 + math.ceil((n - Y0) / CR) * CR
CW, CH = int((e - cx0) // CR), int((cy0 - s) // CR); T = from_origin(cx0, cy0, CR, CR)
print("context", CW, CH, "origin", cx0, cy0)
its = list(catalog().search(collections=["landsat-c2-l2"], bbox=WIDE, datetime="2025-10-15/2026-04-30",
                            query={"eo:cloud_cover": {"lt": 8}, "platform": {"in": ["landsat-8", "landsat-9"]}}).items())
its.sort(key=lambda i: i.properties["eo:cloud_cover"]); print(len(its), "items")
B = ["red", "green", "blue"]; stack = []


def rd(href, rs, nod):
    with rasterio.open(href) as src:
        with WarpedVRT(src, crs="EPSG:32638", transform=T, width=CW, height=CH, resampling=rs, nodata=nod) as v: return v.read(1)


for it in its[:24]:
    qa = rd(it.assets["qa_pixel"].href, Resampling.nearest, 1).astype(np.uint16)
    bad = (qa == 1) | ((qa >> 3) & 1).astype(bool) | ((qa >> 4) & 1).astype(bool) | ((qa >> 1) & 1).astype(bool)
    a = np.stack([rd(it.assets[b].href, Resampling.average, 0).astype(np.float32) for b in B])
    a = np.where((a == 0) | bad, np.nan, a * 0.0000275 - 0.2); stack.append(a)
    print(it.id, "%.2f" % np.isfinite(a[0]).mean(), flush=True)
med = np.nanmedian(np.stack(stack), 0)
np.savez_compressed(OUT + "ctx_jazan_160.npz", rgb=med.astype(np.float32), x0=cx0, y0=cy0, res=CR, W=CW, H=CH)
print("gaps %.3f" % np.isnan(med[0]).mean())
