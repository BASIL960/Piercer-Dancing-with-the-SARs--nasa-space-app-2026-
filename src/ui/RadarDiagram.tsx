import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { Icon } from "./icons";

/*
 * How NISAR sees change, in four beats on a 12-second loop:
 *   1. a pulse goes down a side-looking beam, through the cloud that stops a camera
 *   2. the ground scatters it and the echo comes back; its trace is recorded
 *   3. 12 days later, on the same track, the field has flooded; pulse and echo again
 *   4. the two traces are compared: where they stop matching, the ground changed
 * It is an illustration, slowed down about two thousand times and not to scale; it never shows measured data.
 */

const LOOP = 12;
const STEPS: { at: number; title: string; text: string }[] = [
  { at: 0, title: "Send a pulse", text: "Microwaves go down a beam that looks to the side." },
  { at: 2.05, title: "Record the echo", text: "Cloud does not stop them. The ground scatters them back." },
  { at: 4.7, title: "Return 12 days later", text: "Same orbit, same ground. Meanwhile, the field flooded." },
  { at: 9.95, title: "Compare the echoes", text: "Where they no longer match, the ground changed." },
];
const PASS2 = 5.5;

// geometry (viewBox 560 × 470): satellite top-left, footprint on the ground to the right
const S = { x: 108, y: 62 };
const F = { x: 365, y: 300 };
const BEAM = `M ${S.x} ${S.y} L 278 312 L 462 312 Z`;
const REACH = Math.hypot(F.x - S.x, F.y - S.y) + 18;

// the two recorded echoes: the same ground gives the same trace, except over the flooded field (smooth water
// mirrors the pulse away from a side-looking radar, so the echo there is weak)
const WAVE_X0 = 132, WAVE_X1 = 540, CHG0 = 0.46, CHG1 = 0.7;
function trace(changed: boolean) {
  const pts: string[] = [];
  for (let i = 0; i <= 160; i++) {
    const u = i / 160, x = WAVE_X0 + u * (WAVE_X1 - WAVE_X0);
    let a = Math.sin(u * 61) * 0.55 + Math.sin(u * 23 + 1.3) * 0.3 + Math.sin(u * 117 + 0.4) * 0.22;
    a *= 0.55 + 0.45 * Math.sin(u * 9 + 0.8) ** 2;
    if (changed && u > CHG0 && u < CHG1) a *= 0.16;
    pts.push(`${i ? "L" : "M"} ${x.toFixed(1)} ${(-a * 13).toFixed(1)}`);
  }
  return pts.join(" ");
}
const T1 = trace(false), T2 = trace(true);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const ease = (u: number) => 1 - (1 - u) ** 3;
/** visible between a and b, fading in and out over f seconds */
const span = (t: number, a: number, b: number, f = 0.35) => Math.min(ramp(t, a, a + f), 1 - ramp(t, b - f, b));

export function RadarDiagram() {
  const reduced = useStore((s) => s.reducedMotion);
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState(reduced ? 3 : 0);
  const root = useRef<SVGSVGElement>(null);
  const clock = useRef({ t: 0, last: 0, visible: false });

  useEffect(() => {
    const svg = root.current; if (!svg) return;
    const q = <T extends Element>(s: string) => svg.querySelector(s) as T;
    const qa = <T extends Element>(s: string) => Array.from(svg.querySelectorAll(s)) as T[];
    const pulses = qa<SVGCircleElement>(".rd-pulse"), echoes = qa<SVGCircleElement>(".rd-echo");
    const sat = q<SVGGElement>(".rd-sat"), passLabel = q<SVGTextElement>(".rd-pass");
    const scatter = q<SVGGElement>(".rd-scatter"), water = q<SVGGElement>(".rd-water"), crop = q<SVGGElement>(".rd-crop");
    const w1 = q<SVGPathElement>(".rd-w1"), w2 = q<SVGPathElement>(".rd-w2"), diff = q<SVGGElement>(".rd-diff");
    const meanwhile = q<SVGGElement>(".rd-meanwhile"), camera = q<SVGGElement>(".rd-camera"), beam = q<SVGPathElement>(".rd-beam");
    const op = (el: Element, v: number) => (el as SVGElement).style.setProperty("opacity", v.toFixed(3));

    const draw = (t: number, still: boolean) => {
      const second = t >= PASS2 - 0.4;
      const p0 = t < PASS2 ? 0.45 : PASS2 + 0.45;
      op(sat, still ? 1 : t < PASS2 ? span(t, 0, PASS2 - 0.15, 0.4) : span(t, PASS2 + 0.05, LOOP - 0.1, 0.4));
      op(beam, still ? 0.9 : t < PASS2 ? span(t, 0.15, PASS2 - 0.2, 0.5) : span(t, PASS2 + 0.2, LOOP - 0.2, 0.5));
      passLabel.textContent = second ? "Pass 2 · day 12" : "Pass 1 · day 0";
      pulses.forEach((c, k) => {
        const u = still ? [0.32, 0.55, 0.78][k] : ramp(t, p0 + k * 0.24, p0 + k * 0.24 + 1.45);
        c.setAttribute("r", (14 + ease(u) * (REACH - 14)).toFixed(1));
        op(c, still ? 0.7 : u > 0 && u < 1 ? (1 - u * 0.45) * Math.min(1, u * 8) : 0);
      });
      echoes.forEach((c, k) => {
        const a = p0 + 1.55 + k * 0.24;
        const u = still ? [0.3, 0.55, 0.8][k] : ramp(t, a, a + 1.5);
        c.setAttribute("r", (6 + ease(u) * (REACH - 6)).toFixed(1));
        op(c, still ? 0.55 : u > 0 && u < 1 ? (0.95 - u * 0.55) * Math.min(1, u * 8) * (second ? 0.75 : 1) : 0);
      });
      op(scatter, still ? 0.8 : Math.max(span(t, 1.85, 2.6, 0.2), span(t, PASS2 + 1.85, PASS2 + 2.6, 0.2)));
      op(camera, still ? 1 : span(t, 0.9, 4.4, 0.5) * 1);
      // the field floods between the passes
      const flood = still ? 1 : ramp(t, 4.95, 5.6) * (1 - ramp(t, LOOP - 0.35, LOOP));
      op(water, flood); op(crop, 1 - flood);
      op(meanwhile, still ? 0 : span(t, 4.85, 6.6, 0.3));
      // the traces draw as each echo arrives, and stay until the loop ends
      const d1 = still ? 1 : ramp(t, 3.4, 4.5), d2 = still ? 1 : ramp(t, PASS2 + 3.4, PASS2 + 4.5);
      const fade = still ? 1 : 1 - ramp(t, LOOP - 0.45, LOOP - 0.05);
      w1.style.strokeDashoffset = String(1 - d1); op(w1, fade);
      w2.style.strokeDashoffset = String(1 - d2); op(w2, fade * (d2 > 0 ? 1 : 0));
      op(diff, still ? 1 : span(t, 10.05, LOOP - 0.05, 0.5));
    };

    const c = clock.current;
    if (reduced) { draw(LOOP - 1, true); return; }
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = c.last ? Math.min(0.1, (now - c.last) / 1000) : 0;
      c.last = now;
      if (paused || !c.visible || document.hidden) return;
      c.t = (c.t + dt) % LOOP;
      draw(c.t, false);
      const k = STEPS.reduce((acc, s, i) => (c.t >= s.at ? i : acc), 0);
      setStep((prev) => (prev === k ? prev : k));
    };
    draw(c.t, false);
    raf = requestAnimationFrame(frame);
    // only runs while it can be seen
    const io = new IntersectionObserver(([e]) => { c.visible = e.isIntersecting; }, { threshold: 0.15 });
    io.observe(svg);
    return () => { cancelAnimationFrame(raf); io.disconnect(); c.last = 0; };
  }, [paused, reduced]);

  const seek = (i: number) => { clock.current.t = STEPS[i].at + 0.01; setStep(i); setPaused(false); };

  return (
    <figure className="rd" aria-labelledby="rd-cap">
      <svg ref={root} className="rd-svg" viewBox="0 0 560 470" role="img" aria-labelledby="rd-title">
        <title id="rd-title">Illustration: NISAR sends a microwave pulse through cloud to the ground and records the echo. Twelve days later it does the same over the same ground. The field has flooded, so the second echo no longer matches the first there, which marks the change.</title>
        <defs>
          <linearGradient id="rd-beam-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--signal)" stopOpacity=".42" />
            <stop offset="1" stopColor="var(--signal)" stopOpacity=".04" />
          </linearGradient>
          <clipPath id="rd-clip"><path d={BEAM} /></clipPath>
          <pattern id="rd-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
            <path d="M0 0V6" stroke="var(--signal)" strokeWidth="1.2" strokeOpacity=".55" />
          </pattern>
        </defs>

        {/* orbit track */}
        <path className="rd-orbit" d="M -10 92 Q 180 30 420 22" />
        {/* the beam: the diagonal of the Piercer mark */}
        <path className="rd-beam" d={BEAM} fill="url(#rd-beam-g)" />
        <g clipPath="url(#rd-clip)">
          {[0, 1, 2].map((k) => <circle key={`p${k}`} className="rd-pulse" cx={S.x} cy={S.y} r="14" />)}
          {[0, 1, 2].map((k) => <circle key={`e${k}`} className="rd-echo" cx={F.x} cy={F.y + 6} r="6" />)}
        </g>

        {/* cloud, drifting slowly; the camera's line of sight ends in it */}
        <g className="rd-cloud">
          <ellipse cx="236" cy="190" rx="74" ry="19" /><ellipse cx="300" cy="176" rx="66" ry="26" /><ellipse cx="370" cy="192" rx="80" ry="18" />
          <ellipse cx="452" cy="182" rx="52" ry="15" />
        </g>
        <g className="rd-camera">
          <path className="rd-sight" d="M 548 40 L 470 168" />
          <path className="rd-stop" d="M 462 166 l 12 12 M 474 166 l -12 12" />
          <text x="552" y="32" textAnchor="end">a camera's view stops at the cloud</text>
        </g>

        {/* the ground, with the field that floods */}
        <path className="rd-ground" d="M 0 322 C 120 306 210 318 300 312 S 470 300 560 316" />
        <g className="rd-crop">{Array.from({ length: 11 }, (_, i) => <path key={i} d={`M ${326 + i * 7} 309 l 0 -7`} />)}</g>
        <g className="rd-water"><path d="M 322 311 Q 361 304 402 309 L 402 314 Q 361 310 322 316 Z" /></g>
        <g className="rd-scatter">{[300, 318, 344, 372, 396, 420, 440].map((x, i) => <circle key={i} cx={x} cy={309 - (i % 2) * 2} r="2.2" />)}</g>
        <g className="rd-meanwhile">
          <text x="362" y="344" textAnchor="middle">meanwhile, the field floods</text>
        </g>

        {/* NISAR: the body, the solar array and the 12 m reflector, open toward the ground like the mark's ring */}
        <g className="rd-sat" transform={`translate(${S.x} ${S.y})`}>
          <path d="M -26 -10 A 28 28 0 0 0 18 22" className="rd-dish" />
          <rect x="-7" y="-7" width="14" height="14" rx="2" className="rd-body" />
          <rect x="-66" y="-30" width="48" height="10" rx="1" transform="rotate(-14)" className="rd-panel" />
          <text className="rd-name" x="18" y="-26">NISAR <tspan className="rd-alt">· 747 km up</tspan></text>
          <text className="rd-pass" x="18" y="-12">Pass 1 · day 0</text>
        </g>
        <text className="rd-note" x="154" y="132" transform="rotate(44 154 132)">L-band pulse · 24 cm waves</text>

        {/* the record of each pass */}
        <g className="rd-records" transform="translate(0 388)">
          <g className="rd-diff">
            <rect x={WAVE_X0 + CHG0 * (WAVE_X1 - WAVE_X0)} y="-26" width={(CHG1 - CHG0) * (WAVE_X1 - WAVE_X0)} height="98" rx="4" fill="url(#rd-hatch)" />
            <rect x={WAVE_X0 + CHG0 * (WAVE_X1 - WAVE_X0)} y="-26" width={(CHG1 - CHG0) * (WAVE_X1 - WAVE_X0)} height="98" rx="4" className="rd-diff-edge" />
            <text x={WAVE_X0 + ((CHG0 + CHG1) / 2) * (WAVE_X1 - WAVE_X0)} y="-34" textAnchor="middle">no longer matches: changed</text>
          </g>
          <text className="rd-rowlabel" x="0" y="4">Echo, pass 1</text>
          <text className="rd-rowlabel" x="0" y="52">Echo, pass 2</text>
          <path className="rd-axis" d={`M ${WAVE_X0} 0 H ${WAVE_X1} M ${WAVE_X0} 48 H ${WAVE_X1}`} />
          <path className="rd-w rd-w1" d={T1} pathLength={1} />
          <path className="rd-w rd-w2" d={T2} pathLength={1} transform="translate(0 48)" />
        </g>
      </svg>

      <figcaption id="rd-cap" className="rd-foot">
        <ol className="rd-steps" aria-label="The four steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button className={i === step ? "now" : i < step ? "done" : ""} onClick={() => seek(i)} disabled={reduced} aria-current={i === step ? "step" : undefined}>
                <span className="rd-n">{i + 1}</span><b>{s.title}</b><span>{s.text}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="rd-meta">
          {!reduced && (
            <button className="rd-toggle" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
              {paused ? <Icon.play size={11} /> : <Icon.pause size={11} />}{paused ? "Play" : "Pause"}
            </button>
          )}
          <p><span className="tag tag-illustrative"><i />Illustration</span> Not to scale, and slowed down: a real echo returns in about 5 thousandths of a second.</p>
        </div>
      </figcaption>
    </figure>
  );
}
