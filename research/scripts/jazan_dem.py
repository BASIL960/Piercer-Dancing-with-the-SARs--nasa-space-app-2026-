"""Copernicus DEM 30 m on the Jazan 40 m grid (for the coastal-plain mask and hillshade)."""
import sys, os, pickle, numpy as np, rasterio; sys.path.insert(0, os.path.dirname(__file__))
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
from hls_pc import catalog
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/"
g = pickle.load(open(R + "gunw/grid40.pkl", "rb"))
its = list(catalog().search(collections=["cop-dem-glo-30"], bbox=[42.50, 16.80, 43.20, 17.85]).items())
dem = np.full((g["height"], g["width"]), np.nan, np.float32)
for it in its:
    with rasterio.open(it.assets["data"].href) as src:
        with WarpedVRT(src, crs=g["crs"], transform=g["transform"], width=g["width"], height=g["height"], resampling=Resampling.average, nodata=-32767) as v:
            a = v.read(1).astype(np.float32)
    ok = (a > -1000) & np.isnan(dem); dem[ok] = a[ok]
np.save(R + "dem40.npy", dem); print(len(its), "tiles", np.nanmin(dem), np.nanmax(dem), "plain<250m share %.2f" % np.nanmean(dem < 250))
