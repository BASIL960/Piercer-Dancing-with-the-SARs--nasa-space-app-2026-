"""Oregon radar frames for the web map from calibrated NISAR L2 GCOV (track 114 D), replacing the GIBS-rendered PNGs.
Fixed dB stretches on every date so brightness is comparable: R = HH (-22..-2 dB), G = HV (-30..-10 dB), B = HH."""
import numpy as np
from PIL import Image
R = "C:/Users/B3B3/Desktop/workplase/nasa/research/oregon/raw/nisar/"; WEB = "C:/Users/B3B3/Desktop/workplase/nasa/research/oregon/anim/web/"
W30, H30 = 3175, 3525
st = lambda x, lo, hi: np.clip((np.nan_to_num(x, nan=lo) - lo) / (hi - lo), 0, 1)
for d in ["2026-07-16", "2026-08-21", "2026-09-26", "2026-10-20"]:
    z = np.load(R + f"gcov_{d.replace('-', '')}.npz"); hh = z["HHHH"].astype(np.float32)[:1762, :1587]; hv = z["HVHV"].astype(np.float32)[:1762, :1587]
    r, g = st(hh, -22, -2), st(hv, -30, -10)
    rgb = np.dstack([r, g, r * 0.85]) ** 0.85
    Image.fromarray((rgb * 255).astype(np.uint8)).resize((W30, H30), Image.BILINEAR).save(WEB + f"radar_{d}.jpg", quality=85)
    print(d, "valid", round(float(np.isfinite(hv).mean()), 3))
