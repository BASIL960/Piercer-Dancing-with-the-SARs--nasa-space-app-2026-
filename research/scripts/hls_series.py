import sys, os, time; sys.path.insert(0, os.path.dirname(__file__))
from hls_pc import *
OUT = "C:/Users/B3B3/Desktop/workplase/nasa/research/oregon/raw/"
BB = [-117.45, 42.0, -116.3, 42.95]
S60 = [("2026-06-04","s30"),("2026-06-14","s30"),("2026-07-03","l30"),("2026-07-09","s30"),("2026-07-24","s30"),
       ("2026-07-29","s30"),("2026-08-03","s30"),("2026-08-10","s30"),("2026-08-12","l30"),("2026-08-20","l30"),
       ("2026-08-23","s30"),("2026-08-30","s30"),("2026-09-17","s30"),("2026-09-22","s30"),("2026-09-29","l30"),
       ("2026-10-07","s30"),("2026-10-15","l30"),("2026-10-17","s30"),("2026-10-24","s30")]
S30 = [("2026-07-09","s30"),("2026-08-30","s30"),("2026-10-24","s30")]
for res, lst, tag in [(60, S60, "hls60"), (30, S30, "hls30")]:
    for d, s in lst:
        fn = OUT + f"{tag}_{d}.npz"
        if os.path.exists(fn): continue
        t = time.time()
        try:
            m, g = mosaic(d, s, BB, res=res)
            if m is None: print(tag, d, "no items", flush=True); continue
            np.savez_compressed(fn, **m)
            print(tag, d, s, "valid %.2f" % np.isfinite(m["nir"]).mean(), "%.0fs" % (time.time() - t), flush=True)
        except Exception as e:
            print(tag, d, "ERR", e, flush=True)
print("DONE")
