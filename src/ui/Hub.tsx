import { useEffect, useRef } from "react";
import { SITE_IDS, type NepalData, type OregonData, type SiteId } from "../data";
import { useStore } from "../store";
import { PLACES } from "../story";
import type { CSSProperties } from "react";
import { area, pct, useEngine, useSites } from "./bits";
import { Icon, PLACE_ACCENT } from "./icons";

/** Each place in one line, and its one number from the site data. */
function teaser(id: SiteId) {
  if (id === "nepal") return "A wall of water ran down a Himalayan valley. Cloud hid it from every camera for five weeks.";
  if (id === "oregon") return "Lightning lit the sagebrush. By October the hills looked green again. Radar disagreed.";
  return "Storms spilled off the mountains onto a desert plain. Radar mapped the wet ground through the storms, by day and by night.";
}
function stat(id: SiteId, sites: ReturnType<typeof useSites>): [string, string, string] {
  if (id === "nepal") return [String((sites.nepal as NepalData).pathKm), "km", "of valley in the surge's path"];
  if (id === "oregon") return [area((sites.oregon as OregonData).std.burned.km2), "km²", "burned, measured from orbit"];
  return [pct((sites.jazan.std as { green: { pct: number } }).green.pct), "%", "of the coastal plain turned green"];
}

/** The globe with the three places: each card stays beside its place and hides when it turns away. */
export function Hub() {
  const engine = useEngine();
  const sites = useSites();
  const hover = useStore((s) => s.hoverSite);
  const visited = useStore((s) => s.visited);
  const { openSite, setHoverSite, toFinale, setSourcesOpen } = useStore.getState();
  const cards = useRef<Partial<Record<SiteId, HTMLButtonElement | null>>>({});
  const marks = useRef<Partial<Record<SiteId, SVGGElement | null>>>({});
  const lines = useRef<Partial<Record<SiteId, SVGLineElement | null>>>({});
  const head = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!engine) return;
    return engine.onFrame(() => {
      const W = window.innerWidth, H = window.innerHeight, wide = W > 900;
      // cards keep clear of the pitch on the left
      const left = Math.max(24, (head.current?.getBoundingClientRect().right ?? 0) + 28);
      const placed: { x: number; y: number; w: number; h: number }[] = [];
      const hits = (r: { x: number; y: number; w: number; h: number }) => placed.some((q) => r.x < q.x + q.w + 12 && q.x < r.x + r.w + 12 && r.y < q.y + q.h + 12 && q.y < r.y + r.h + 12);
      for (const id of SITE_IDS) {
        const card = cards.current[id], mark = marks.current[id], line = lines.current[id];
        if (!card || !mark || !line) continue;
        const [lat, lon] = PLACES[id].marker;
        const p = engine.project(lat, lon);
        mark.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
        mark.style.opacity = p.front ? "1" : "0";
        if (wide) {
          const cw = card.offsetWidth, ch = card.offsetHeight;
          // beside its place; when two places are close on screen, the second card moves out of the first's way
          const fit = (right: boolean, dy: number) => {
            const x = Math.min(W - cw - 24, Math.max(left, right ? p.x + 56 : p.x - 56 - cw));
            const y = Math.min(H - ch - 76, Math.max(84, p.y - ch * 0.35 + dy));
            return { x, y, w: cw, h: ch };
          };
          // the card goes on the side of its place that faces away from the globe's centre, so it covers less of Earth
          const g = engine.globeOnScreen();
          const pref = p.x >= g.x;
          let spot = fit(pref, 0);
          if (p.front) {
            for (const cand of [fit(!pref, 0), fit(pref, ch + 20), fit(pref, -ch - 20), fit(!pref, ch + 20)]) { if (!hits(spot)) break; spot = cand; }
            placed.push(spot);
          }
          const { x, y } = spot;
          card.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
          card.style.opacity = p.front ? "1" : "0";
          card.style.pointerEvents = p.front ? "" : "none";
          card.tabIndex = p.front ? 0 : -1;
          const r = card.getBoundingClientRect();
          const ax = Math.min(r.right, Math.max(r.left, p.x)), ay = Math.min(r.bottom, Math.max(r.top, p.y));
          line.setAttribute("x1", String(ax)); line.setAttribute("y1", String(ay)); line.setAttribute("x2", String(p.x)); line.setAttribute("y2", String(p.y));
          line.style.opacity = p.front ? "1" : "0";
        } else {
          card.style.transform = ""; card.style.opacity = ""; card.style.pointerEvents = ""; card.tabIndex = 0; line.style.opacity = "0";
        }
      }
    });
  }, [engine]);

  const all = SITE_IDS.every((id) => visited[id] !== undefined);
  return (
    <section className="hub">
      <header className="hub-head" ref={head}>
        <p className="eyebrow">Three places · one radar · 2026</p>
        <h1>Pick a place to open its story.</h1>
        <p className="hub-lede">Each one changed at a different speed: in minutes, over weeks, across a season. Drag to turn the globe.</p>
      </header>
      <svg className="leaders" aria-hidden="true">
        {SITE_IDS.map((id) => (
          <g key={id} className={hover === id ? "hot" : ""} style={{ "--accent": PLACE_ACCENT[id] } as CSSProperties}>
            <line ref={(el) => { lines.current[id] = el; }} />
            <g ref={(el) => { marks.current[id] = el; }}><circle r="10" className="reticle" /><circle r="3" className="dot" /></g>
          </g>
        ))}
      </svg>
      <div className="hub-cards">
        {SITE_IDS.map((id) => {
          const P = PLACES[id], [v, unit, label] = stat(id, sites);
          return (
            <button key={id} ref={(el) => { cards.current[id] = el; }} className={`place-card card-${id}`} style={{ "--accent": PLACE_ACCENT[id] } as CSSProperties} onClick={() => openSite(id)}
              onPointerEnter={() => setHoverSite(id)} onPointerLeave={() => setHoverSite(null)} onFocus={() => setHoverSite(id)} onBlur={() => setHoverSite(null)}>
              <span className="card-top"><span className="chip-speed">{P.speed}</span><span className="card-when">{P.when}</span></span>
              <span className="card-name">{P.name}</span>
              <span className="card-place">{P.where}</span>
              <span className="card-stat"><b>{v}<small>{unit}</small></b><span>{label}</span></span>
              <span className="card-teaser">{teaser(id)}</span>
              <span className="card-go">Open the story<Icon.arrow size={15} /></span>
            </button>
          );
        })}
      </div>
      <div className="hub-foot">
        <button className="icon-btn" onClick={() => setSourcesOpen(true)}><span>Sources and method</span></button>
        {all && <button className="icon-btn" onClick={toFinale}><span>The whole season</span></button>}
      </div>
    </section>
  );
}
