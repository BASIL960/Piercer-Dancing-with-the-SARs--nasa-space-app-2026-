import { useEffect, useRef, useState } from "react";
import { loadSites, SITE_IDS } from "../data";
import { Engine } from "../engine/Engine";
import { useStore } from "../store";
import { PLACES } from "../story";
import { EngineContext } from "./bits";
import { Finale } from "./Finale";
import { Hub } from "./Hub";
import { Intro } from "./Intro";
import { Overlays } from "./Overlays";
import { SiteHud } from "./SiteHud";
import { Sources } from "./Sources";

/** What went wrong, in words for a visitor; the technical detail stays one click away. */
function Failure({ error }: { error: string }) {
  const webgl = /webgl|context/i.test(error);
  return (
    <div className="failure" role="alert">
      <h1>{webgl ? "This browser could not start the 3D view" : "The story could not be loaded"}</h1>
      <p>{webgl
        ? "Piercer draws the Earth with WebGL. Turn on hardware acceleration in your browser settings, or try an up-to-date Chrome, Edge, Firefox or Safari."
        : "Part of the satellite data did not arrive. Check your connection and reload the page."}</p>
      <p><button className="primary" onClick={() => location.reload()}>Reload</button></p>
      <details><summary>Details</summary><p className="note">{error}</p></details>
    </div>
  );
}

function Header() {
  const phase = useStore((s) => s.phase);
  const siteId = useStore((s) => s.siteId);
  const { toHub, openSite, toFinale, setSourcesOpen } = useStore.getState();
  return (
    <header className="topbar">
      <button className="brand" onClick={toHub} aria-label="Piercer: back to the globe">Piercer</button>
      <nav aria-label="Places">
        {SITE_IDS.map((id) => (
          <button key={id} aria-current={phase === "site" && siteId === id ? "page" : undefined} onClick={() => openSite(id)}>
            <span className="speed">{PLACES[id].speed}</span> {PLACES[id].name}
          </button>
        ))}
        <button aria-current={phase === "finale" ? "page" : undefined} onClick={toFinale}><span className="speed">All</span> The season</button>
      </nav>
      <button className="quiet" onClick={() => setSourcesOpen(true)}>Sources</button>
    </header>
  );
}

export function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const phase = useStore((s) => s.phase);
  const ready = useStore((s) => s.ready);
  const error = useStore((s) => s.error);
  const sourcesOpen = useStore((s) => s.sourcesOpen);

  useEffect(() => {
    let dead = false;
    let made: Engine | undefined;
    (async () => {
      try {
        const sites = await loadSites();
        if (dead) return;
        useStore.getState().setSites(sites);
        made = new Engine(canvas.current!, sites);
        await made.load((p) => useStore.getState().setProgress(p));
        if (dead) return made.dispose();
        setEngine(made);
        if (import.meta.env.DEV) (window as unknown as { __engine: Engine }).__engine = made;
        useStore.getState().setReady();
      } catch (err) {
        useStore.getState().setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => { dead = true; made?.dispose(); };
  }, []);

  // keyboard: arrows move through chapters, space plays, R recentres, +/- zoom, Alt+arrows move the camera
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState();
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      if (e.key === "Escape") {
        if (st.sourcesOpen) st.setSourcesOpen(false);
        else if (st.phase === "site" || st.phase === "finale") st.toHub();
        return;
      }
      if (st.sourcesOpen || !st.ready) return;
      if (e.altKey && engine && e.key.startsWith("Arrow")) {
        engine.nudge(({ ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" } as const)[e.key as "ArrowLeft"]);
        e.preventDefault(); return;
      }
      if ((e.key === "ArrowRight" || e.key === "PageDown") && st.phase !== "intro") { st.next(); e.preventDefault(); }
      else if ((e.key === "ArrowLeft" || e.key === "PageUp") && (st.phase === "site" || st.phase === "finale")) { st.prev(); e.preventDefault(); }
      else if (e.key === " " && st.phase === "site" && (!el || el === document.body || el.tagName === "CANVAS")) { st.setPlaying(!st.playing); e.preventDefault(); }
      else if ((e.key === "r" || e.key === "R") && st.phase !== "intro") st.recenter();
      else if ((e.key === "+" || e.key === "=") && engine) engine.nudge("in");
      else if ((e.key === "-" || e.key === "_") && engine) engine.nudge("out");
      else if ((e.key === "q" || e.key === "Q") && engine) engine.nudge("rotL");
      else if ((e.key === "e" || e.key === "E") && engine) engine.nudge("rotR");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine]);

  return (
    <EngineContext.Provider value={engine}>
      <canvas ref={canvas} className="stage" aria-label="Three-dimensional view of Earth and the study sites. Drag to move, scroll to zoom, right-drag or shift-drag to turn and tilt. Everything shown is also described in the panels." />
      <Overlays />
      <div className={`hud phase-${phase}`}>
        {error ? (
          <Failure error={error} />
        ) : (
          <>
            {ready && phase !== "intro" && <Header />}
            {phase === "intro" && <Intro />}
            {ready && phase === "hub" && <Hub />}
            {ready && phase === "site" && <SiteHud />}
            {ready && phase === "finale" && <Finale />}
          </>
        )}
      </div>
      {sourcesOpen && <Sources />}
    </EngineContext.Provider>
  );
}
