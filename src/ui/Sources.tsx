import { useEffect, useRef, type KeyboardEvent } from "react";
import { useStore } from "../store";
import { EVIDENCE, Tag, type Evidence } from "./bits";

const DATA: [string, string, string][] = [
  ["NISAR L2 GUNW (interferometric coherence)", "Radar ground change between 12-day passes. Nepal track 98; Oregon track 114; Jazan tracks 64 (18:39) and 71 (05:39).", "NASA-ISRO NISAR, ASF DAAC. Provisional products, calibrated HDF5."],
  ["NISAR L2 GCOV (calibrated backscatter γ⁰)", "Wet ground (HH) in Jazan; shrub structure (HV) after the Oregon fire; radar views of the fire.", "NASA-ISRO NISAR, ASF DAAC. Never read from colour map tiles."],
  ["NASA HLS v2 (Landsat 8/9 + Sentinel-2)", "Photos, burn extent and severity (dNBR), stripped ground, green-up and open water (NDVI, MNDWI), with the Fmask cloud mask.", "NASA LP DAAC, via Microsoft Planetary Computer."],
  ["NASA GPM IMERG V07, Late run", "Rain over Jazan: daily, and every half hour before radar passes and on 10 storm days.", "NASA GES DISC. The Final run will replace it."],
  ["NASA VIIRS 375 m active fire", "Day-by-day spread of the Big Grass Fire.", "NASA FIRMS / GIBS."],
  ["Copernicus DEM GLO-30", "Terrain in the 3D view, the Nepal flood route, the Jazan coastal plain (0.5–250 m).", "ESA, AWS Open Data. Read here directly from the public tiles."],
  ["NIFC fire perimeters", "The official Big Grass perimeter (575,163 acres).", "National Interagency Fire Center (reported)."],
  ["Globe", "Blue Marble shaded relief and bathymetry.", "NASA Earth Observatory, via NASA GIBS."],
];

const RULES: [string, string][] = [
  ["Radar change (C)", "12-day coherence at least 0.20 below the pixel's pre-event baseline, on the same track (range: 0.15 / 0.25)."],
  ["Radar brightness (B)", "γ⁰ more than 2 dB above or below the pixel's pre-event median (range: 1.5 / 2.5 dB)."],
  ["Plants gained or lost (G±)", "NDVI crossing 0.30 with a change of at least 0.15 against the pre-event median (range: 0.10 / 0.20)."],
  ["Open water (W)", "MNDWI above 0.10 (range: 0.05 / 0.15)."],
  ["Burned (F)", "dNBR at least 0.10 (range: 0.075 / 0.125); severity classes after Key & Benson."],
  ["Rain (P)", "IMERG; an area counts as wet where a 0.1° cell has more than 1 mm."],
];

export function Sources() {
  const close = () => useStore.getState().setSourcesOpen(false);
  const box = useRef<HTMLDivElement>(null);
  // focus moves into the dialog, stays there while it is open, and goes back to what opened it
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    box.current?.focus();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, []);
  const trap = (e: KeyboardEvent) => {
    if (e.key !== "Tab" || !box.current) return;
    const f = [...box.current.querySelectorAll<HTMLElement>("a[href], button, [tabindex='0']")].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1], at = document.activeElement;
    if (e.shiftKey && (at === first || at === box.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
  };
  return (
    <div className="sheet-back" onClick={close}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sources-title" tabIndex={-1} ref={box} onClick={(e) => e.stopPropagation()} onKeyDown={trap}>
        <button className="quiet sheet-close" onClick={close}>Close</button>
        <h2 id="sources-title">Sources and method</h2>
        <p>Piercer draws on the team's research (the <code>research</code> folder of the project repository): one data standard for all three places, with every number listed with its rule, its comparison and its source in <code>research/CLAIMS.md</code>. This site reprojects those results onto the globe; it does not measure anything new.</p>

        <h3>How each statement is labelled</h3>
        <ul className="labels">
          {(Object.keys(EVIDENCE) as Evidence[]).map((k) => <li key={k}><Tag kind={k} /> {EVIDENCE[k].hint}</li>)}
        </ul>

        <h3>Data</h3>
        <table>
          <tbody>
            {DATA.map(([what, use, who]) => <tr key={what}><th scope="row">{what}</th><td>{use}<br /><span className="who">{who}</span></td></tr>)}
          </tbody>
        </table>

        <h3>Rules, the same at every place</h3>
        <ul>{RULES.map(([k, v]) => <li key={k}><b>{k}.</b> {v}</li>)}</ul>
        <p>Every derived number is compared with a control (the same measurement where or when the event did not happen) and recomputed with its threshold nudged down and up. When that moves it by more than 10%, the range is shown in brackets. Comparisons are only called findings when they keep the same direction at all three thresholds.</p>

        <h3>Placing the layers on the globe</h3>
        <p>The research layers are north-up UTM grids. Their origins were recovered from points of known position (the Jazan rain-cell pins agree to 1.1 m) and checked against town positions and the research's own elevation profile along the Nepal flood route (median difference 20 m). Terrain is raised for legibility: ×1.15 in Nepal, ×2.4 in Oregon, ×2.2 in Jazan.</p>

        <h3>Limits</h3>
        <ul>
          <li>NISAR products are provisional. There is no NISAR data at any of the three places from 27 July to 10 August 2026; over the Oregon fire the gap runs from 26 July to 12 August, and the radar pair across the fire spans 36 days.</li>
          <li>Coherence loss says that the ground changed, not why.</li>
          <li>In Jazan, ground the radar flagged often was more likely to be green by November. That is a match in place, not in time: it has not been shown that the radar saw the change before the plants came up.</li>
          <li>The Oregon burned share on each date comes from a single photo, so it can read low when part of the fire is hidden or the photo differs from the pre-fire blend; only full views are quoted.</li>
          <li>Moving fire and flood fronts, and counters that grow between observations, are estimates for the animation. Their end values are measured.</li>
          <li>Green and water dates are the first clear photo showing the change, so they can be a few days late.</li>
          <li>Deaths, acres, containment and alert texts are reported by the sources named beside them and were not recomputed.</li>
          <li>Lighting, clouds on the globe, the cloud veil over the Nepal photos and the stars are illustration.</li>
        </ul>

        <h3>Built with</h3>
        <p>three.js, React, Vite, zustand, proj4, geotiff.js and sharp. Typefaces: Reem Kufi and Readex Pro. Code and text were written with help from Claude, an AI assistant made by Anthropic.</p>
        <p>NASA does not endorse this project. It was made for the NASA Space Apps Challenge 2026, Dancing with the SARs.</p>
      </div>
    </div>
  );
}
