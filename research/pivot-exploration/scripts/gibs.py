import truststore; truststore.inject_into_ssl()
import requests, io, os, sys
from PIL import Image
import numpy as np
WMS="https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
def getmap(layer, bbox, date=None, w=1024, h=None, fmt="image/png"):
    """bbox=(lat_min, lon_min, lat_max, lon_max)"""
    la0,lo0,la1,lo1=bbox
    if h is None: h=int(round(w*(la1-la0)/(lo1-lo0)))
    p=dict(SERVICE="WMS",VERSION="1.3.0",REQUEST="GetMap",LAYERS=layer,CRS="EPSG:4326",
           BBOX=f"{la0},{lo0},{la1},{lo1}",WIDTH=w,HEIGHT=h,FORMAT=fmt,TRANSPARENT="TRUE",STYLES="")
    if date: p["TIME"]=date
    r=requests.get(WMS,params=p,timeout=120); r.raise_for_status()
    if not r.headers.get("content-type","").startswith("image"):
        raise RuntimeError(r.text[:300])
    return Image.open(io.BytesIO(r.content)).convert("RGBA")
def coverage(img):
    a=np.asarray(img)
    return float(((a[...,3]>0)&(a[...,:3].sum(-1)>0)).mean())
