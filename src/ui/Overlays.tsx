import { useEffect, useRef } from "react";
import type { LatLon, NepalData, OregonData, SiteId } from "../data";
import { currentChapter, useStore } from "../store";
import { NEPAL_T0 } from "../story";
import { useEngine, useSites } from "./bits";

/**
 * Vector marks drawn over the 3D view: places, the flood route, the fire perimeter. They are projected onto the
 * drawn (exaggerated) terrain every frame, so they stay on the ground as the camera moves.
 */
export function Overlays() {
  const engine = useEngine();
  const sites = useSites();
  const phase = useStore((s) => s.phase);
  const siteId = useStore((s) => s.siteId);
  const chapter = useStore((s) => s.chapter);
  const shown = useStore((s) => s.overlays);
  const svg = useRef<SVGSVGElement>(null);
  const ov = phase === "site" ? currentChapter({ siteId, chapter }).overlays ?? {} : {};

  const places = phase === "site" && ov.places ? sites[siteId].places.filter((p) => (siteId === "jazan" && p.kind === "dam" ? true : p.kind !== "origin" || siteId === "nepal")) : [];
  const regions = phase === "site" && ov.places ? sites[siteId].regions : [];
  const route = phase === "site" && siteId === "nepal" && ov.route;
  const perim = phase === "site" && siteId === "oregon" && ov.perimeter;
  const ignition = phase === "site" && siteId === "oregon" && ov.ignition;

  useEffect(() => {
    // runs again whenever the labels come back: the SVG is a new element then and must be positioned afresh
    if (!engine || phase !== "site" || !shown) return;
    const el = svg.current;
    if (!el) return;
    const id = siteId as SiteId;
    const nodes = {
      places: [...el.querySelectorAll<SVGGElement>("[data-place]")],
      regions: [...el.querySelectorAll<SVGTextElement>("[data-region]")],
      routeAll: el.querySelector<SVGPathElement>("[data-route-all]"),
      routeDone: el.querySelector<SVGPathElement>("[data-route-done]"),
      front: el.querySelector<SVGCircleElement>("[data-front]"),
      perim: [...el.querySelectorAll<SVGPathElement>("[data-perim]")],
      ign: el.querySelector<SVGGElement>("[data-ignition]"),
    };
    // a path that lifts the pen wherever a point is behind the camera or over the horizon
    const pts = (ll: LatLon[], close = false) => {
      let s = "", pen = false, all = true;
      for (const [lat, lon] of ll) {
        const p = engine.project(lat, lon, id);
        if (!p.front) { pen = false; all = false; continue; }
        s += `${pen ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        pen = true;
      }
      return close && all && s ? `${s}Z` : s;
    };
    return engine.onFrame(() => {
      const st = useStore.getState();
      const fade = Math.min(1, Math.max(0, (0.12 - engine.distance) / 0.06));
      el.style.opacity = String(fade);
      if (fade <= 0) return;
      // labels keep out of the top bar
      const clear = (p: { y: number; front: boolean }) => p.front && p.y > 70;
      for (const g of nodes.places) {
        const [lat, lon] = g.dataset.place!.split(",").map(Number);
        const p = engine.project(lat, lon, id);
        g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
        g.style.display = clear(p) ? "" : "none";
      }
      for (const t of nodes.regions) {
        const [lat, lon] = t.dataset.region!.split(",").map(Number);
        const p = engine.project(lat, lon, id);
        t.setAttribute("x", p.x.toFixed(1)); t.setAttribute("y", p.y.toFixed(1));
        t.style.display = clear(p) ? "" : "none";
      }
      if (nodes.routeAll) {
        const d = sites.nepal as NepalData;
        nodes.routeAll.setAttribute("d", pts(d.flowline));
        const m = (st.t - NEPAL_T0) / 60000, fm = d.flowMinutes;
        let i = -1;
        if (m >= 0) { i = 0; while (i < fm.length - 1 && fm[i + 1] <= m) i++; }
        nodes.routeDone!.setAttribute("d", i >= 0 ? pts(d.flowline.slice(0, i + 1)) : "");
        if (i >= 0 && m < fm[fm.length - 1] + 5) {
          const [lat, lon] = d.flowline[i], p = engine.project(lat, lon, id);
          nodes.front!.setAttribute("cx", p.x.toFixed(1)); nodes.front!.setAttribute("cy", p.y.toFixed(1)); nodes.front!.style.display = "";
        } else nodes.front!.style.display = "none";
      }
      nodes.perim.forEach((poly, k) => poly.setAttribute("d", pts((sites.oregon as OregonData).perimeter[k], true)));
      if (nodes.ign) {
        const ig = (sites.oregon as OregonData).places.find((p) => p.kind === "origin")!.at;
        const p = engine.project(ig[0], ig[1], id);
        nodes.ign.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
        nodes.ign.style.display = p.front ? "" : "none";
      }
    });
  }, [engine, phase, siteId, chapter, sites, route, perim, ignition, places.length, shown]);

  if (phase !== "site" || !shown) return null;
  return (
    <svg ref={svg} className="overlays" aria-hidden="true">
      {perim && (sites.oregon as OregonData).perimeter.map((_, k) => <path key={k} data-perim className="perimeter" />)}
      {route && <><path data-route-all className="route" /><path data-route-done className="route done" /><circle data-front r={5} className="front" /></>}
      {regions.map((r) => <text key={r.name} data-region={r.at.join(",")} className="region" textAnchor="middle">{r.name}</text>)}
      {places.map((p) => (
        <g key={p.name} data-place={p.at.join(",")} className={`place ${p.kind}`}>
          {p.kind === "peak" ? <path d="M-6,4 L0,-6 L6,4Z" /> : p.kind === "dam" ? <rect x={-4} y={-4} width={8} height={8} /> : p.kind === "origin" ? <path d="M0,-8 L2.4,-2.5 8,-2.5 3.5,1 5.2,7 0,3.4 -5.2,7 -3.5,1 -8,-2.5 -2.4,-2.5Z" /> : <circle r={3.2} />}
          <text x={9} y={4}>{p.name}</text>
        </g>
      ))}
      {ignition && <g data-ignition className="ignition"><circle r={11} className="pulse" /><path d="M0,-9 L2.6,-2.8 9,-2.8 3.9,1.2 5.8,7.6 0,3.8 -5.8,7.6 -3.9,1.2 -9,-2.8 -2.6,-2.8Z" /><text x={13} y={4}>Lightning, 23 Jul</text></g>}
    </svg>
  );
}
