import { useStore } from "../store";

const icon = { width: 28, height: 28, viewBox: "0 0 28 28", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

/** The idea in three beats: who looks, how it looks, what it finds. */
const STEPS = [
  {
    title: "A radar satellite passes every 12 days",
    text: "NISAR, from NASA and ISRO, sends its own microwave pulses to the ground and records the echo, on the same track every 12 days.",
    svg: (<svg {...icon}><rect x="11" y="11" width="6" height="6" rx="1" /><path d="M11 14H4M24 14h-7M4 11v6M24 11v6" /><path d="M14 19v3M10.5 25.5a5 5 0 0 1 7 0" /></svg>),
  },
  {
    title: "It sees through cloud, smoke and night",
    text: "Microwaves pass through what blinds a camera. The echo arrives whatever the weather.",
    svg: (<svg {...icon}><path d="M8 13a4 4 0 0 1 7.6-1.6A3.5 3.5 0 1 1 19.5 18H9a3 3 0 0 1-1-5z" /><path d="M14 3v5M14 21v4" strokeDasharray="1.5 2.5" /></svg>),
  },
  {
    title: "Two echoes that differ mean the ground changed",
    text: "Compare passes and change stands out: torn ground, burned shrubs, soaked soil. You'll check each finding against photos and records.",
    svg: (<svg {...icon}><path d="M4 18c3-6 5-6 8 0s5 6 8 0 3-4 4-4" /><path d="M4 11c3-6 5-6 8 0s5 6 8 0 3-4 4-4" strokeOpacity=".45" /></svg>),
  },
];

export function Intro() {
  const ready = useStore((s) => s.ready);
  const progress = useStore((s) => s.progress);
  const { enter, openSite, setSourcesOpen } = useStore.getState();
  return (
    <section className="intro">
      <h1 className="wordmark"><span className="name">Piercer</span></h1>
      <p className="lede">In the summer of 2026, the ground changed faster than cameras could follow.</p>
      <p className="sub">A glacier emptied into a valley in minutes. A fire crossed a plateau in weeks. Rain turned a desert plain green over a season. Cloud, smoke and storms hid each of them from cameras. One radar, which needs neither sunlight nor clear skies, showed what the photos could not.</p>
      <ol className="steps">
        {STEPS.map((s) => (
          <li key={s.title}>
            <span className="step-icon">{s.svg}</span>
            <span><b>{s.title}</b><span className="step-text">{s.text}</span></span>
          </li>
        ))}
      </ol>
      <div className="intro-actions">
        <button className="primary" onClick={() => openSite("nepal", 0)} disabled={!ready}>
          {ready ? "Begin: minutes, in Nepal" : `Loading Earth ${Math.round(progress * 100)}%`}
        </button>
        <button className="quiet" onClick={enter} disabled={!ready}>See all three places</button>
        <button className="quiet" onClick={() => setSourcesOpen(true)}>Sources and method</button>
      </div>
      <p className="colophon">NASA Space Apps Challenge 2026 · Dancing with the SARs · NISAR radar with NASA HLS photos, IMERG rainfall and the Copernicus elevation model. Piercer, because radar pierces what sunlight cannot.</p>
    </section>
  );
}
