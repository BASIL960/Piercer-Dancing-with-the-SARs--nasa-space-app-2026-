"""Merge exact IMERG V07 Late (GES DISC) and the season products into rain_web/data.json.
Grids: 0.1 deg cells, 22 rows (lat 18.55 -> 16.45) x 17 cols (lon 41.95 -> 43.55). Daily in mm/day, half-hourly in mm/h.
'Study area' statistics use the cells inside the radar study box (lat 16.8-17.85, lon 42.5-43.2)."""
import json, numpy as np, datetime as dt, pickle
from rasterio.warp import transform as wtr
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/raw/"; WEB = "C:/Users/B3B3/Desktop/workplase/nasa/research/saudi/rain_web/"
D = json.load(open(WEB + "data.json"))
lat = 18.55 - 0.1 * np.arange(22); lon = 41.95 + 0.1 * np.arange(17)
box = (lat[:, None] > 16.8) & (lat[:, None] < 17.85) & (lon[None] > 42.5) & (lon[None] < 43.2)
daily = json.load(open(R + "imerg/daily.json"))
rain = []
for k in sorted(daily):
    g = np.array(daily[k]["grid"], float)
    rain.append(dict(date=f"{k[:4]}-{k[4:6]}-{k[6:]}", mm=round(float(np.nanmean(g[box])), 2), max=round(float(np.nanmax(g[box])), 1),
                     area10=round(float(np.mean(g[box] > 10)), 3), grid=np.round(np.nan_to_num(g), 1).tolist()))
D["rain"] = rain; D["rain_units"] = "mm/day"
# half-hourly
import os
hh = json.load(open(R + "imerg/halfhour.json")) if os.path.exists(R + "imerg/halfhour.json") else {}
full = {}
for k, v in hh.items(): full.setdefault(k[:8], {})[k[10:14]] = v["grid"]
D["hh"] = {f"{d[:4]}-{d[4:6]}-{d[6:]}": [np.round(np.nan_to_num(np.array(v[s], float)), 1).tolist() for s in sorted(v)] for d, v in full.items() if len(v) == 48}
# rain in the 6.5 h before each pass (13 half-hours ending with the one that contains the pass)
pre = {}
hhmm = {"064": 15, "071": 2}
for key in D["prepass"]:
    tr, d = key.split("_"); t0 = dt.datetime.fromisoformat(d).replace(hour=hhmm[tr])
    acc, n = np.zeros((22, 17)), 0
    for k in range(13):
        s = (t0 - dt.timedelta(minutes=30 * k)).strftime("%Y%m%d-S%H%M%S")
        if s in hh: acc += np.nan_to_num(np.array(hh[s]["grid"], float)) * 0.5; n += 1
    if n < 13: pre[key] = D["prepass"][key]; print(key, "half-hours missing, kept old"); continue
    pre[key] = dict(n=n, mean_mm=round(float(acc[box].mean()), 2), max_mm=round(float(acc[box].max()), 1), wet_share=round(float((acc[box] > 1).mean()), 3))
    print(key, pre[key])
D["prepass"] = pre
# where it rained hardest on each day (for event pins), within the study box
g40 = pickle.load(open(R + "gunw/grid40.pkl", "rb")); CRS = g40["crs"]
cx0 = D["detail"]["x"]; z = np.load(R + "ctx_jazan_160.npz"); X0, Y0, CR = float(z["x0"]), float(z["y0"]), int(z["res"])
def to_px(lo, la):
    xs, ys = wtr("EPSG:4326", CRS, [lo], [la]); return [round((xs[0] - X0) / CR, 2), round((Y0 - ys[0]) / CR, 2)]
pins = {}
for r in rain:
    g = np.where(box, np.array(r["grid"]), -1); i, j = np.unravel_index(np.argmax(g), g.shape)
    pins[r["date"]] = dict(p=to_px(float(lon[j]), float(lat[i])), mm=round(float(g[i, j]), 1), lon=round(float(lon[j]), 2), lat=round(float(lat[i]), 2))
D["pins"] = pins
D["season"] = json.load(open(WEB + "season.json"))
# facts quoted in the page
first = next(r for r in rain if r["date"] >= "2026-07-01" and r["mm"] >= 1.0)
s_ = np.load(R + "season_derived.npz"); z_ = np.load(R + "season80.npz"); dem_ = z_["dem"]; up_ = s_["up"]; land_ = dem_ > 0.5
def band(a, b):
    m = land_ & (dem_ >= a) & (dem_ < b) & (up_ != 255); d = int(np.median(up_[m]))
    return (dt.date(2026, 6, 1) + dt.timedelta(days=d)).strftime("%-d %b") if False else f"{(dt.date(2026,6,1)+dt.timedelta(days=d)).day} {(dt.date(2026,6,1)+dt.timedelta(days=d)).strftime('%b')}"
D["facts"] = dict(first_storm=first["date"], first_storm_mm=first["mm"], first_storm_max=first["max"], band_250_500=band(250, 500), band_100_250=band(100, 250), band_0_100=band(0.5, 100))
print("facts", D["facts"])
json.dump(D, open(WEB + "data.json", "w"))
# facts used in the event texts
wet = [r for r in rain if r["mm"] >= 1]
print("first day with study-area mean >= 1 mm:", wet[0]["date"] if wet else None)
for m in ["06", "07", "08", "09", "10", "11"]:
    R_ = [r for r in rain if r["date"][5:7] == m]
    a = max(R_, key=lambda r: r["mm"]); b = max(R_, key=lambda r: r["max"])
    print(m, "total mean %.0f mm" % sum(r["mm"] for r in R_), "| wettest day", a["date"], a["mm"], "| strongest cell", b["date"], b["max"])
print("season total (study-area mean) %.0f mm" % sum(r["mm"] for r in rain))
top = sorted(rain, key=lambda r: -r["mm"])[:8]; print("top days", [(r["date"], r["mm"], r["max"]) for r in top])
print("hh full days", sorted(D["hh"]))
