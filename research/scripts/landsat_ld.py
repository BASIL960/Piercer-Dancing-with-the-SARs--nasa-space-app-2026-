"""Yearly mid-summer Landsat C2 L2 scene over the 2012 Long Draw burn (pre-fire 2008-2011, recovery 2013-2026)."""
import sys, os, time; sys.path.insert(0, os.path.dirname(__file__))
from hls_pc import catalog, grid
import numpy as np, rasterio
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
OUT = "C:/Users/B3B3/Desktop/workplase/nasa/research/oregon/raw/"
BB = [-118.15, 42.10, -117.10, 42.75]
g = grid(BB, 90)
def read(href, nod):
    with rasterio.open(href) as src:
        with WarpedVRT(src, crs=g["crs"], transform=g["transform"], width=g["width"], height=g["height"],
                       resampling=Resampling.average, nodata=nod) as v:
            return v.read(1).astype(np.float32)
for yr in [2008, 2009, 2010, 2011] + list(range(2013, 2027)):
    fn = OUT + f"ld_landsat_{yr}.npz"
    if os.path.exists(fn): continue
    plats = ["landsat-5"] if yr <= 2011 else ["landsat-8", "landsat-9"]
    its = list(catalog().search(collections=["landsat-c2-l2"], bbox=BB, datetime=f"{yr}-06-20/{yr}-08-31",
                                query={"platform": {"in": plats}, "eo:cloud_cover": {"lt": 15}}).items())
    # the scene must contain the whole box
    full = [i for i in its if i.bbox[0] <= BB[0] and i.bbox[1] <= BB[1] and i.bbox[2] >= BB[2] and i.bbox[3] >= BB[3]]
    if not full: print(yr, "no full scene", len(its), flush=True); continue
    it = sorted(full, key=lambda i: (i.properties["eo:cloud_cover"], abs(i.datetime.month * 31 + i.datetime.day - 7 * 31 - 15)))[0]
    t = time.time()
    qa = read(it.assets["qa_pixel"].href, 1).astype(np.uint16)
    bad = (qa == 1) | ((qa >> 3) & 1).astype(bool) | ((qa >> 4) & 1).astype(bool) | ((qa >> 1) & 1).astype(bool)
    out = {}
    for b in ["red", "nir08", "swir22"]:
        a = read(it.assets[b].href, 0)
        a = np.where((a == 0) | bad, np.nan, a * 0.0000275 - 0.2)
        out[b] = a.astype(np.float32)
    np.savez_compressed(fn, date=it.datetime.date().isoformat(), platform=it.properties["platform"], **out)
    print(yr, it.datetime.date(), it.properties["platform"], "cc", it.properties["eo:cloud_cover"],
          "valid %.2f" % np.isfinite(out["nir08"]).mean(), "%.0fs" % (time.time() - t), flush=True)
print("DONE")
