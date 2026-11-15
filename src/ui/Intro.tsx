import { useEffect, useRef, type CSSProperties } from "react";
import { SITE_IDS } from "../data";
import { useStore } from "../store";
import { PLACES } from "../story";
import { useEngine } from "./bits";
import { Brand, Icon, PLACE_ACCENT } from "./icons";
import { RadarDiagram } from "./RadarDiagram";

/** While Earth loads: the brand and a progress bar. */
export function Intro() {
  const progress = useStore((s) => s.progress);
  return (
    <section className="intro" aria-busy="true">
      <Brand size="lg" />
      <div className="load" role="progressbar" aria-label="Loading Earth" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <i style={{ width: `${Math.max(4, progress * 100)}%` }} />
      </div>
      <p className="load-text">Loading Earth · {Math.round(progress * 100)}%</p>
    </section>
  );
}

const FACTS: [string, string, string][] = [
  ["2", "radars", "L-band, 24 cm waves, from NASA. S-band, 10 cm waves, from ISRO."],
  ["12 m", "antenna", "A mesh reflector that unfolded in orbit after launch."],
  ["242 km", "wide", "The strip of ground mapped on each pass."],
  ["12 days", "to return", "Then it passes over the same spot again."],
];

const READ: [string, string][] = [
  ["measured", "Read straight from a satellite or an instrument."],
  ["derived", "Worked out from measurements by a stated rule."],
  ["reported", "Said by officials or the press, with the source named."],
  ["interpolated", "Estimated between two known points, and marked est."],
];

/**
 * The landing: a close Earth behind the name and the idea, then what NISAR is and how its radar sees.
 * The button, or scrolling to the end, opens the globe with the three places.
 */
export function Landing() {
  const engine = useEngine();
  const { enter, setSourcesOpen } = useStore.getState();
  const page = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = page.current, sentinel = end.current;
    if (!el || !sentinel) return;
    const onScroll = () => engine?.setIntroScroll(el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight));
    el.addEventListener("scroll", onScroll, { passive: true });
    // scrolling past the last section hands over to the globe
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && el.scrollTop > 40) enter(); }, { root: el, threshold: 0.9 });
    io.observe(sentinel);
    return () => { el.removeEventListener("scroll", onScroll); io.disconnect(); engine?.setIntroScroll(0); };
  }, [engine, enter]);

  const toRadar = () => page.current?.querySelector("#radar")?.scrollIntoView({ behavior: useStore.getState().reducedMotion ? "auto" : "smooth" });

  return (
    <div className="landing" ref={page}>
      <header className="land-top">
        <span />
        <div className="land-actions">
          <button className="quiet" onClick={() => setSourcesOpen(true)}>Sources</button>
          <button className="primary small" onClick={enter}>Explore the globe</button>
        </div>
      </header>

      <section className="land-hero">
        <Brand size="lg" />
        <p className="eyebrow"><span className="pulse-dot" aria-hidden="true" />NASA Space Apps Challenge 2026 · NISAR radar</p>
        <h1>See the ground <span className="through">through</span> cloud, smoke and night.</h1>
        <p className="land-lede">
          Piercer follows three events of 2026 with radar from NISAR, the NASA–ISRO satellite: a glacier flood in Nepal, a wildfire on the
          Oregon–Idaho border and a rainy season on Saudi Arabia's Red Sea coast. Cloud, smoke or storms hid each one from cameras.
          Here is what the radar recorded, and where it had gaps of its own.
        </p>
        <div className="land-cta">
          <button className="primary" onClick={enter}>Explore the globe <Icon.arrow size={16} /></button>
          <button className="quiet" onClick={toRadar}>How the radar sees</button>
        </div>
        <ul className="land-scales" aria-label="The three places">
          {SITE_IDS.map((id) => (
            <li key={id} style={{ "--accent": PLACE_ACCENT[id] } as CSSProperties}>
              <span>{PLACES[id].speed}</span>{PLACES[id].name}<small>{PLACES[id].where}</small>
            </li>
          ))}
        </ul>
        <p className="scroll-cue" aria-hidden="true"><i />Scroll</p>
      </section>

      <section className="land-radar" id="radar">
        <div className="radar-text">
          <p className="eyebrow sec"><span className="sec-n">01</span>The satellite</p>
          <h2>NISAR brings its own light.</h2>
          <p>NISAR is a joint mission of NASA and ISRO, India's space agency. It launched on 30 July 2025 and maps almost all of Earth's land and ice every 12 days.</p>
          <p>A camera needs sunlight and a clear sky. A radar does not. NISAR sends microwave pulses down to the ground and records the echo that comes back. Microwaves pass through cloud, smoke and darkness, so the radar sees on the days a camera sees nothing.</p>
          <p>Compare two passes over the same ground, 12 days apart. Where the echo still matches, the ground stayed the same. <b className="hl">Where it stops matching, something changed:</b> water, fire, a landslide, new growth.</p>
        </div>
        <RadarDiagram />
        <dl className="facts">
          {FACTS.map(([v, u, txt]) => <div key={u}><dt><b>{v}</b> {u}</dt><dd>{txt}</dd></div>)}
        </dl>
      </section>

      <section className="land-read">
        <p className="eyebrow sec"><span className="sec-n">02</span>How to read the numbers</p>
        <h2>Every number says how sure it is.</h2>
        <ul className="read-list">
          {READ.map(([k, txt]) => <li key={k}><span className={`tag tag-${k}`}><i />{k[0].toUpperCase() + k.slice(1)}</span><span>{txt}</span></li>)}
        </ul>
        <div className="land-final">
          <h2>Three places. Three speeds of change.</h2>
          <button className="primary" onClick={enter}>Explore the globe <Icon.arrow size={16} /></button>
        </div>
      </section>
      <div className="land-end" ref={end}><p>Keep scrolling to open the globe</p></div>
    </div>
  );
}
