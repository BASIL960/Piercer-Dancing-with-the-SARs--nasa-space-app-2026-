"""Season-animation assets (80 m, same grid as the other web frames). Lossless PNGs, read with NEAREST filtering:
  season_a.png  R = green-up day, G = green-down day, B = water-appears day          (days after 1 Jun; 255 = never)
  season_b.png  R = water-gone day, G = NDVI rise (peak - June), B = flags: 85 already green in June, 170 June water, 255 both
plus season.json: per-day areas (km2) for the panel."""
import json, numpy as np
from PIL import Image
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/"; WEB = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/rain_web/"
s = np.load(R + "season_derived.npz"); w = np.load(R + "season_water.npz"); z = np.load(R + "season80.npz"); dem = z["dem"]
up, dn, base, peak, always, perm = s["up"], s["down"], s["base"].astype(np.float32), s["peak"].astype(np.float32), s["always"], s["perm"]
wup, wdn = w["wup"], w["wdn"]
land = dem > 0.5; plain = land & (dem < 250)
rise = np.clip(np.nan_to_num(peak - base), 0, 0.6) / 0.6
flags = np.where(always & perm, 255, np.where(perm, 170, np.where(always, 85, 0))).astype(np.uint8)
Image.fromarray(np.dstack([up, dn, wup]).astype(np.uint8), "RGB").save(WEB + "season_a.png", optimize=True)
Image.fromarray(np.dstack([wdn, (rise * 254).astype(np.uint8), flags]).astype(np.uint8), "RGB").save(WEB + "season_b.png", optimize=True)
A = 0.0064
days = range(0, 167)
out = dict(green_new_plain=[], green_new_all=[], water_new=[], water_june=[], plain_km2=round(float(plain.sum() * A), 1), already_green_plain=round(float((always & plain).sum() * A), 1))
for d in days:
    g = (up <= d) & ((dn == 255) | (dn > d))
    out["green_new_plain"].append(round(float((g & plain).sum() * A), 1)); out["green_new_all"].append(round(float(g.sum() * A), 1))
    out["water_new"].append(round(float(((wup <= d) & ((wdn == 255) | (wdn > d))).sum() * A), 2))
    out["water_june"].append(round(float((perm & ((wdn == 255) | (wdn > d))).sum() * A), 2))
json.dump(out, open(WEB + "season.json", "w"))
print("new green on plain by 1 Nov:", out["green_new_plain"][153], "km2 of", out["plain_km2"], "| new water", out["water_new"][160], "| June water left", out["water_june"][160])
