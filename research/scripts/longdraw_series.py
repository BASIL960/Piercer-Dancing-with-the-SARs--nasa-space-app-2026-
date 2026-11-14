import sys, os, time, collections; sys.path.insert(0, os.path.dirname(__file__))
from hls_pc import *
OUT = "C:/Users/B3B3/Desktop/workplase/nasa/research/oregon/raw/"
BB = [-118.15, 42.10, -117.10, 42.75]
for yr in range(2013, 2027):
    fn = OUT + f"ld90_{yr}.npz"
    if os.path.exists(fn): continue
    its = list(catalog().search(collections=["hls2-l30", "hls2-s30"], bbox=BB, datetime=f"{yr}-07-01/{yr}-08-31").items())
    by = collections.defaultdict(list)
    for it in its: by[(it.datetime.date().isoformat(), it.collection_id[-3:])].append(it)
    # need all tiles present and low cloud; prefer max tile count then lowest mean cloud
    ntile = max(len(v) for v in by.values()) if by else 0
    cands = sorted([(np.mean([i.properties.get("eo:cloud_cover", 100) for i in v]), k) for k, v in by.items() if len(v) >= ntile])
    if not cands: print(yr, "none", flush=True); continue
    cc, (d, s) = cands[0]
    t = time.time()
    m, g = mosaic(d, s, BB, res=90, want=("red", "green", "blue", "nir", "swir2"))
    np.savez_compressed(fn, date=d, sensor=s, **m)
    print(yr, d, s, "cloud %.0f" % cc, "valid %.2f" % np.isfinite(m["nir"]).mean(), "%.0fs" % (time.time() - t), flush=True)
print("DONE")
