import { useEffect, useRef } from "react";
import { SITE_IDS, type NepalData, type OregonData, type SiteId } from "../data";
import { useStore } from "../store";
import { PLACES } from "../story";
import { area, pct, useEngine, useSites } from "./bits";

/** One line per place that makes you want to go there. Numbers from the site data. */
function teaser(id: SiteId, sites: ReturnType<typeof useSites>) {
  if (id === "nepal") { const d = sites.nepal as NepalData; return `A wall of water ran ${d.pathKm} km down a Himalayan valley. Cloud hid it from every camera for five weeks.`; }
  if (id === "oregon") { const d = sites.oregon as OregonData; return `Lightning started a fire that burned ${area(d.std.burned.km2)} km². By October the hills looked green again. Radar disagreed.`; }
  const g = sites.jazan.std as { green: { pct: number } };
  return `Storms spilled off the mountains onto a desert plain. Radar mapped the wet ground; ${pct(g.green.pct)}% of the plain turned green after.`;
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

  useEffect(() => {
    if (!engine) return;
    return engine.onFrame(() => {
      const W = window.innerWidth, H = window.innerHeight, wide = W > 900;
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
            const x = Math.min(W - cw - 24, Math.max(24, right ? p.x + 56 : p.x - 56 - cw));
            const y = Math.min(H - ch - 70, Math.max(110, p.y - ch * 0.35 + dy));
            return { x, y, w: cw, h: ch };
          };
          const pref = p.x < W * 0.62;
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
      <header className="hub-head">
        <h1>Three places, one season</h1>
        <p>Between June and November 2026, NISAR passed over each of these places every 12 days. Turn the globe, or pick one. The journey runs from the fastest change to the slowest.</p>
      </header>
      <svg className="leaders" aria-hidden="true">
        {SITE_IDS.map((id) => (
          <g key={id} className={hover === id ? "hot" : ""}>
            <line ref={(el) => { lines.current[id] = el; }} />
            <g ref={(el) => { marks.current[id] = el; }}><circle r="10" className="reticle" /><circle r="2.4" className="dot" /></g>
          </g>
        ))}
      </svg>
      <div className="hub-cards">
        {SITE_IDS.map((id) => {
          const P = PLACES[id];
          return (
            <button key={id} ref={(el) => { cards.current[id] = el; }} className={`place-card card-${id}`} onClick={() => openSite(id)}
              onPointerEnter={() => setHoverSite(id)} onPointerLeave={() => setHoverSite(null)} onFocus={() => setHoverSite(id)} onBlur={() => setHoverSite(null)}>
              <span className="speed">{P.speed}</span>
              <span className="card-name">{P.name}</span>
              <span className="card-place">{P.where} · {P.when}</span>
              <span className="card-teaser">{teaser(id, sites)}</span>
              <span className="card-go">{visited[id] !== undefined ? "Continue" : "Go there"}</span>
            </button>
          );
        })}
      </div>
      <div className="hub-foot">
        <button className="quiet" onClick={() => setSourcesOpen(true)}>Sources and method</button>
        {all && <button className="quiet" onClick={toFinale}>The whole season</button>}
      </div>
    </section>
  );
}
