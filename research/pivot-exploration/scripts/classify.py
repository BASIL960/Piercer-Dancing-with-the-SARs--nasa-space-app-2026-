import numpy as np
from PIL import Image
def optical_veg(img):
    a=np.asarray(img.convert("RGBA")).astype(int); r,g,b,al=a[...,0],a[...,1],a[...,2],a[...,3]
    valid=(al>0)&((r+g+b)>30)
    veg=valid&(g>=r+3)&(g>b+10)
    return veg,valid
def radar_veg(img):
    a=np.asarray(img.convert("RGBA")).astype(int); r,g,b,al=a[...,0],a[...,1],a[...,2],a[...,3]
    valid=(al>0)&((r+g+b)>20)
    veg=valid&(g>=110)&(g>r*1.12)&(g>b*1.6)
    return veg,valid
def px_area_km2(bbox,shape):
    la0,lo0,la1,lo1=bbox; h,w=shape
    lat=np.radians((la0+la1)/2)
    return ((lo1-lo0)*111.32*np.cos(lat)/w)*((la1-la0)*110.57/h)
