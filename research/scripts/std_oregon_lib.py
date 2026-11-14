"""Shared Oregon masks under DATA_STANDARD.md (60 m): official perimeter (even-odd islands), burned (dNBR >= 0.10 from median composites), control 2-10 km outside."""
import os, sys, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from hls_pc import grid
from rasterio import features
from rasterio.enums import MergeAlg
from rasterio.warp import transform_geom
from scipy import ndimage
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/oregon/raw/"
BB = [-117.45, 42.0, -116.3, 42.95]
def load(n): return {k: v.astype(np.float32) for k, v in np.load(R + n).items()}
nbr = lambda m: (m["nir"] - m["swir2"]) / (m["nir"] + m["swir2"] + 1e-6)
def masks():
    g = grid(BB, 60); gj = json.load(open(R + "big_grass_perimeter.geojson"))["features"][0]["geometry"]
    shp = [(transform_geom("EPSG:4326", g["crs"], {"type": "Polygon", "coordinates": [p[0]]}), 1) for p in gj["coordinates"]]
    P = (features.rasterize(shp, out_shape=(g["height"], g["width"]), transform=g["transform"], merge_alg=MergeAlg.add, dtype="uint8") % 2).astype(bool)
    comp = lambda ds: np.nanmedian(np.stack([nbr(load(f"hls60_{d}.npz")) for d in ds]), 0)
    pre = comp(["2026-06-14", "2026-07-03", "2026-07-09"]); post = comp(["2026-08-23", "2026-08-30"])
    dn = pre - post; ok = np.isfinite(dn); B = ok & (dn >= 0.10) & P
    dist = ndimage.distance_transform_edt(~ndimage.binary_fill_holes(P)) * 60; ctrl = ok & (dist > 2000) & (dist <= 10000)
    return P, B, dn, ok, ctrl, pre, load, nbr
