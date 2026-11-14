"""Read NASA HLS v2 (Landsat L30 / Sentinel-2 S30) bands from Microsoft Planetary Computer
and mosaic them onto one UTM grid. Returns surface reflectance (0-1) with clouds masked to NaN."""
import truststore; truststore.inject_into_ssl()
import numpy as np, rasterio, pystac_client, planetary_computer
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
from rasterio.warp import transform_bounds
from rasterio.transform import from_origin

STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"
# common band names -> per-sensor asset keys
BANDS = {"s30": dict(blue="B02", green="B03", red="B04", nir="B8A", swir1="B11", swir2="B12", fmask="Fmask"),
         "l30": dict(blue="B02", green="B03", red="B04", nir="B05", swir1="B06", swir2="B07", fmask="Fmask")}
_cat = None


def catalog():
    global _cat
    if _cat is None:
        _cat = pystac_client.Client.open(STAC, modifier=planetary_computer.sign_inplace)
    return _cat


def grid(bbox_ll, res, crs="EPSG:32611"):
    w, s, e, n = transform_bounds("EPSG:4326", crs, *bbox_ll)
    W, H = int(np.ceil((e - w) / res)), int(np.ceil((n - s) / res))
    return dict(crs=crs, transform=from_origin(w, n, res, res), width=W, height=H)


def items_for(date, sensor, bbox_ll):
    s = catalog().search(collections=[f"hls2-{sensor}"], bbox=bbox_ll, datetime=f"{date}T00:00:00Z/{date}T23:59:59Z")
    return list(s.items())


def mosaic(date, sensor, bbox_ll, res=30, want=("red", "green", "blue", "nir", "swir1", "swir2")):
    g = grid(bbox_ll, res)
    out = {b: np.full((g["height"], g["width"]), np.nan, np.float32) for b in want}
    its = items_for(date, sensor, bbox_ll)
    if not its:
        return None, g
    for it in its:
        # cloud / shadow / adjacent mask from Fmask (bits 1,2,3)
        with rasterio.open(it.assets[BANDS[sensor]["fmask"]].href) as src:
            with WarpedVRT(src, crs=g["crs"], transform=g["transform"], width=g["width"], height=g["height"],
                           resampling=Resampling.nearest, nodata=255) as v:
                fm = v.read(1)
        bad = (fm == 255) | ((fm >> 1) & 1).astype(bool) | ((fm >> 2) & 1).astype(bool) | ((fm >> 3) & 1).astype(bool)
        for b in want:
            with rasterio.open(it.assets[BANDS[sensor][b]].href) as src:
                with WarpedVRT(src, crs=g["crs"], transform=g["transform"], width=g["width"], height=g["height"],
                               resampling=Resampling.average if res > 30 else Resampling.nearest, nodata=-9999) as v:
                    a = v.read(1).astype(np.float32)
            ok = (a != -9999) & ~bad & np.isnan(out[b])
            out[b][ok] = a[ok] * 1e-4
    return out, g


def nbr(m):
    return (m["nir"] - m["swir2"]) / (m["nir"] + m["swir2"] + 1e-6)


def ndvi(m):
    return (m["nir"] - m["red"]) / (m["nir"] + m["red"] + 1e-6)
