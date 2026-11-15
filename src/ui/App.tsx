import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Brand, PLACE_ACCENT } from "./icons";
import { loadSites, SITE_IDS } from "../data";
import { Engine } from "../engine/Engine";
import { useStore } from "../store";
import { PLACES } from "../story";
import { EngineContext } from "./bits";
import { Finale } from "./Finale";
import { Hub } from "./Hub";
import { Intro, Landing } from "./Intro";
import { Overlays } from "./Overlays";
import { SiteHud } from "./SiteHud";
import { Sources } from "./Sources";
import { MapHelp } from "./MapHelp";

function Header() {
  const phase = useStore((s) => s.phase);
  const siteId = useStore((s) => s.siteId);
  const { toHub, openSite, toFinale, setSourcesOpen, setHelpOpen, toLanding } = useStore.getState();
  return (
    <header className="topbar">
      <button className="brand" onClick={toLanding} aria-label="Piercer: back to the start"><Brand /></button>
      <nav aria-label="Places">
        <button className="nav-globe" aria-current={phase === "hub" ? "page" : undefined} onClick={toHub}>
          <span className="nav-name">Globe</span>
        </button>
        <span className="nav-sep" aria-hidden="true" />
        {SITE_IDS.map((id) => {
          return (
            <button key={id} style={{ "--accent": PLACE_ACCENT[id] } as CSSProperties} aria-current={phase === "site" && siteId === id ? "page" : undefined} onClick={() => openSite(id)}>
              <span className="nav-text"><span className="speed">{PLACES[id].speed}</span><span className="nav-name">{PLACES[id].name}</span></span>
            </button>
          );
        })}
        <button style={{ "--accent": "var(--sand)" } as CSSProperties} aria-current={phase === "finale" ? "page" : undefined} onClick={toFinale}>
          <span className="nav-text"><span className="speed">All three</span><span className="nav-name">The season</span></span>
        </button>
      </nav>
      <div className="top-actions">
        <button className="icon-btn" onClick={() => setHelpOpen(true)}><span>Controls</span></button>
        <button className="icon-btn" onClick={() => setSourcesOpen(true)}><span>Sources</span></button>
      </div>
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
  const helpOpen = useStore((s) => s.helpOpen);

  // the first time a visitor reaches the globe or a place, show how to move the map, once
  useEffect(() => {
    if (phase !== "hub" && phase !== "site") return;
    let seen = false;
    try { seen = localStorage.getItem("piercer.controls.seen") === "1"; localStorage.setItem("piercer.controls.seen", "1"); } catch { /* storage blocked: show it */ }
    if (!seen) useStore.getState().setHelpOpen(true);
  }, [phase]);

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
        if (st.helpOpen) st.setHelpOpen(false);
        else if (st.sourcesOpen) st.setSourcesOpen(false);
        else if (st.phase === "site" || st.phase === "finale") st.toHub();
        return;
      }
      if (st.sourcesOpen || st.helpOpen || !st.ready) return;
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
          <div className="failure" role="alert"><h1>The data did not load</h1><p>{error}</p></div>
        ) : (
          <>
            {ready && phase !== "intro" && <Header />}
            {phase === "intro" && !ready && <Intro />}
            {ready && phase === "intro" && <Landing />}
            {ready && phase === "hub" && <Hub />}
            {ready && phase === "site" && <SiteHud />}
            {ready && phase === "finale" && <Finale />}
          </>
        )}
      </div>
      {sourcesOpen && <Sources />}
      {helpOpen && <MapHelp />}
    </EngineContext.Provider>
  );
}
