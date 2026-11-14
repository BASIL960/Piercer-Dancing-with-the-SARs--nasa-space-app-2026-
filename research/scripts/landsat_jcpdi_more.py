"""Extra Landsat scenes for the Jazan industrial city site: up to 4 clear scenes per year so each year gets a median."""
import sys, os, time; sys.path.insert(0, os.path.dirname(__file__))
from landsat_jazan_lib import fetch, OUT
from hls_pc import catalog, grid
bb = [42.27, 17.17, 42.52, 17.40]; g = grid(bb, 30, crs="EPSG:32638")
for yr in range(1987, 2027):
    its = list(catalog().search(collections=["landsat-c2-l2"], bbox=bb, datetime=f"{yr}-01-01/{yr}-12-31",
                                query={"eo:cloud_cover": {"lt": 25}}).items())
    full = [i for i in its if i.bbox[0] <= bb[0] and i.bbox[1] <= bb[1] and i.bbox[2] >= bb[2] and i.bbox[3] >= bb[3]]
    full.sort(key=lambda i: (i.properties["platform"] == "landsat-7" and yr > 2003, i.properties["eo:cloud_cover"]))
    have = [f for f in os.listdir(OUT) if f.startswith(f"jcpdi_{yr}")]
    for it in full[:max(0, 4 - len(have))]:
        fn = OUT + f"jcpdi_{it.datetime.date().isoformat()}.npz"
        if os.path.exists(fn): continue
        t = time.time()
        try: v = fetch("jcpdi", it, g, fn)
        except Exception as e: print(yr, "ERR", e, flush=True); continue
        print(it.datetime.date(), it.properties["platform"], "valid %.2f" % v, "%.0fs" % (time.time() - t), flush=True)
print("DONE")
