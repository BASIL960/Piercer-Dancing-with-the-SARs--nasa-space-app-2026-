import { useEffect, useRef } from "react";
import { useStore } from "../store";

type Part = "left" | "right" | "wheel" | "none";

/** A mouse, with the part to use lit. */
function Mouse({ lit, ctrl }: { lit: Part; ctrl?: boolean }) {
  return (
    <span className="mouse-fig" aria-hidden="true">
      <svg viewBox="0 0 40 56" width="30" height="42">
        <rect x="2" y="2" width="36" height="52" rx="18" className="m-body" />
        <path d="M 20 2 V 22" className="m-line" />
        <path d="M 2 22 H 38" className="m-line" />
        <path d="M 20 2 A 18 18 0 0 0 2 20 V 22 H 20 Z" className={lit === "left" ? "m-lit" : "m-off"} />
        <path d="M 20 2 A 18 18 0 0 1 38 20 V 22 H 20 Z" className={lit === "right" ? "m-lit" : "m-off"} />
        <rect x="17" y="7" width="6" height="11" rx="3" className={lit === "wheel" ? "m-wheel m-lit" : "m-wheel"} />
      </svg>
      {ctrl && <kbd>Ctrl</kbd>}
    </span>
  );
}

const ROWS: { title: string; how: string; lit: Part; ctrl?: boolean }[] = [
  { title: "Move the map", how: "Click and hold the left button, then drag. Left and right, up and down: the ground follows your pointer.", lit: "left" },
  { title: "Zoom in and out", how: "Roll the scroll wheel. Forward zooms in, back zooms out.", lit: "wheel" },
  { title: "Rotate and tilt", how: "Hold the right button and drag. Or hold Ctrl (or Shift) while you drag with the left button. Left and right turns the view, up and down tilts it.", lit: "right" },
  { title: "Open a place", how: "On the globe, click a place's card or its name in the top bar.", lit: "left" },
];

const KEYS: [string, string][] = [
  ["+  −", "zoom in, out"],
  ["Alt + arrows", "move"],
  ["Q  E", "rotate"],
  ["R", "back to the story view"],
  ["Space", "play or pause"],
  ["←  →", "previous, next note"],
];

/** How to move around the 3D map: mouse, touch and keyboard. */
export function MapHelp() {
  const close = () => useStore.getState().setHelpOpen(false);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { btn.current?.focus(); }, []);
  return (
    <div className="help-scrim" onClick={close}>
      <section className="help" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">Controls</p>
        <h2 id="help-title">Moving around the map</h2>
        <ul className="help-rows">
          {ROWS.map((r) => (
            <li key={r.title}><Mouse lit={r.lit} ctrl={r.ctrl} /><span><b>{r.title}</b><span>{r.how}</span></span></li>
          ))}
          <li><span className="mouse-fig" aria-hidden="true"><svg viewBox="0 0 40 56" width="30" height="42"><circle cx="13" cy="22" r="7" className="m-lit" /><circle cx="28" cy="30" r="7" className="m-lit" /><path d="M 13 22 L 28 30" className="m-line" /></svg></span><span><b>On a touch screen</b><span>One finger moves the map. Two fingers pinch to zoom, and turn or slide together to rotate and tilt.</span></span></li>
        </ul>
        <div className="help-keys">
          <b>Keyboard</b>
          <dl>{KEYS.map(([k, v]) => <div key={k}><dt>{k.split("  ").map((x) => <kbd key={x}>{x}</kbd>)}</dt><dd>{v}</dd></div>)}</dl>
        </div>
        <p className="help-note">Moving the map never stops the story. Press R or "Back to the story view" to return to the note's own view.</p>
        <button ref={btn} className="primary" onClick={close}>Got it</button>
      </section>
    </div>
  );
}
