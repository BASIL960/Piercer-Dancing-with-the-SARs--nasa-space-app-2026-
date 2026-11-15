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

const LOOP = 12.6;
const STEPS: { at: number; title: string; text: string }[] = [
  { at: 0, title: "Send a pulse", text: "Microwaves go down a beam that looks to the side." },
  { at: 2.05, title: "Record the echo", text: "Cloud does not stop them. The ground scatters them back." },
  { at: 4.6, title: "Return 12 days later", text: "Same orbit, same ground. Meanwhile, the field flooded." },
  { at: 10.5, title: "Compare the echoes", text: "Where they no longer match, the ground changed." },
];
const PASS2 = 6.0;
// the satellite leaves along its orbit, goes round, and comes back on the same track
const LEAVE = [4.6, 5.3], BACK = [5.35, 6.0], U_REST = 0.3, U_OUT = 1.3, U_IN = -0.5;

// geometry (viewBox 560 × 470): satellite top-left, footprint on the ground to the right
const ORBIT = [[-10, 92], [180, 30], [420, 22]] as const;
const orbitAt = (u: number) => {
  const a = (1 - u) ** 2, b = 2 * (1 - u) * u, c = u * u;
  return { x: a * ORBIT[0][0] + b * ORBIT[1][0] + c * ORBIT[2][0], y: a * ORBIT[0][1] + b * ORBIT[1][1] + c * ORBIT[2][1] };
};
const S = { x: 108, y: 62 };
const F = { x: 365, y: 300 };
const BEAM = `M ${S.x} ${S.y} L 278 312 L 462 312 Z`;
const REACH = Math.hypot(F.x - S.x, F.y - S.y) + 18;
const satAt = (u: number) => { const p = orbitAt(u), r = orbitAt(U_REST); return `translate(${(S.x + p.x - r.x).toFixed(1)} ${(S.y + p.y - r.y).toFixed(1)})`; };

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
const easeIn = (u: number) => u * u * u;
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

    let lastLabel = "";
    const draw = (t: number, still: boolean) => {
      const second = t >= PASS2 - 0.4;
      const p0 = t < PASS2 ? 0.45 : PASS2 + 0.45;
      // the satellite: fades in at the start of the loop, flies off along the orbit, and comes back round
      let u = U_REST;
      if (!still && t >= LEAVE[0] && t < BACK[0]) u = U_REST + easeIn(ramp(t, LEAVE[0], LEAVE[1])) * (U_OUT - U_REST);
      else if (!still && t >= BACK[0] && t < BACK[1]) u = U_IN + ease(ramp(t, BACK[0], BACK[1])) * (U_REST - U_IN);
      sat.setAttribute("transform", satAt(u));
      op(sat, still ? 1 : Math.min(ramp(t, 0, 0.4), 1 - ramp(t, LOOP - 0.4, LOOP - 0.05)));
      op(beam, still ? 0.9 : t < PASS2 ? span(t, 0.15, LEAVE[0] + 0.1, 0.4) : span(t, PASS2 + 0.2, LOOP - 0.2, 0.5));
      const day = Math.round(12 * ramp(t, LEAVE[0] + 0.1, BACK[1] - 0.1));
      const label = still || second ? "Pass 2 · day 12" : t < LEAVE[0] ? "Pass 1 · day 0" : `Going round · day ${day}`;
      if (label !== lastLabel) { passLabel.textContent = label; lastLabel = label; }
      // rings are drawn at full reach and scaled, so the browser only moves them instead of redrawing
      pulses.forEach((c, k) => {
        const v = still ? [0.32, 0.55, 0.78][k] : ramp(t, p0 + k * 0.24, p0 + k * 0.24 + 1.45);
        c.style.transform = `scale(${((14 + ease(v) * (REACH - 14)) / REACH).toFixed(4)})`;
        op(c, still ? 0.7 : v > 0 && v < 1 ? (1 - v * 0.45) * Math.min(1, v * 8) : 0);
      });
      echoes.forEach((c, k) => {
        const a = p0 + 1.55 + k * 0.24;
        const v = still ? [0.3, 0.55, 0.8][k] : ramp(t, a, a + 1.5);
        c.style.transform = `scale(${((6 + ease(v) * (REACH - 6)) / REACH).toFixed(4)})`;
        op(c, still ? 0.55 : v > 0 && v < 1 ? (0.95 - v * 0.55) * Math.min(1, v * 8) * (second ? 0.75 : 1) : 0);
      });
      op(scatter, still ? 0.8 : Math.max(span(t, 1.85, 2.6, 0.2), span(t, PASS2 + 1.85, PASS2 + 2.6, 0.2)));
      op(camera, still ? 1 : span(t, 0.9, 4.4, 0.5) * 1);
      // the river rises over the field between the passes, and the crops go under
      const flood = still ? 1 : ease(ramp(t, 5.0, 5.9)) * (1 - ramp(t, LOOP - 0.35, LOOP));
      water.style.transform = `scaleX(${Math.max(0.001, flood).toFixed(4)})`;
      op(water, Math.min(1, flood * 4));
      crop.style.transform = `translateY(${(flood * 3).toFixed(2)}px)`;
      op(crop, 1 - flood * 0.9);
      op(meanwhile, still ? 0 : span(t, 4.9, 7.2, 0.3));
      // the traces draw as each echo arrives, and stay until the loop ends
      const d1 = still ? 1 : ramp(t, 3.4, 4.5), d2 = still ? 1 : ramp(t, PASS2 + 3.4, PASS2 + 4.5);
      const fade = still ? 1 : 1 - ramp(t, LOOP - 0.45, LOOP - 0.05);
      w1.style.strokeDashoffset = String(1 - d1); op(w1, fade);
      w2.style.strokeDashoffset = String(1 - d2); op(w2, fade * (d2 > 0 ? 1 : 0));
      op(diff, still ? 1 : span(t, 10.6, LOOP - 0.05, 0.5));
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
          <linearGradient id="rd-cloud-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbf4e4" stopOpacity=".62" />
            <stop offset=".65" stopColor="#ecdcb9" stopOpacity=".34" />
            <stop offset="1" stopColor="#c9bfa8" stopOpacity=".2" />
          </linearGradient>
          <linearGradient id="rd-soil-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a7a55" stopOpacity=".42" />
            <stop offset="1" stopColor="#8a7a55" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rd-hill-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4d6a4a" stopOpacity=".55" />
            <stop offset="1" stopColor="#4d6a4a" stopOpacity=".05" />
          </linearGradient>
          <linearGradient id="rd-water-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a9f0ff" stopOpacity=".95" />
            <stop offset="1" stopColor="#3aa9cf" stopOpacity=".75" />
          </linearGradient>
          {/* the sky the satellite flies through: it leaves and returns at the frame's edges */}
          <clipPath id="rd-sky"><rect x="0" y="-40" width="560" height="200" /></clipPath>
        </defs>

        {/* orbit track */}
        <path className="rd-orbit" d={`M ${ORBIT[0].join(" ")} Q ${ORBIT[1].join(" ")} ${ORBIT[2].join(" ")}`} />

        {/* one cloud, drawn as one shape so nothing stacks; the camera's line of sight ends on it, the radar's does not */}
        <g className="rd-cloud">
          <path className="rd-cloud-shade" d="M 222 203 Q 330 212 452 203 Q 330 206 222 203 Z" />
          <path className="rd-cloud-body" d="M 218 200 C 198 200 196 181 215 177 C 213 160 240 151 256 162 C 264 141 300 135 316 154 C 328 143 352 146 358 162 C 372 151 398 156 401 172 C 420 166 444 174 442 188 C 462 188 470 200 452 200 Z" />
          <path className="rd-cloud-rim" d="M 215 177 C 213 160 240 151 256 162 C 264 141 300 135 316 154 C 328 143 352 146 358 162 C 372 151 398 156 401 172 C 420 166 444 174 442 188" />
        </g>

        {/* the beam: the diagonal of the Piercer mark, drawn over the cloud because it goes straight through */}
        <path className="rd-beam" d={BEAM} fill="url(#rd-beam-g)" />
        <g clipPath="url(#rd-clip)">
          {[0, 1, 2].map((k) => <circle key={`p${k}`} className="rd-pulse" cx={S.x} cy={S.y} r={REACH} />)}
          {[0, 1, 2].map((k) => <circle key={`e${k}`} className="rd-echo" cx={F.x} cy={F.y + 6} r={REACH} />)}
        </g>
        <g className="rd-camera">
          <path className="rd-sight" d="M 552 70 L 434 172" />
          <path className="rd-stop" d="M 422 172 l 11 11 M 433 172 l -11 11" />
          <text x="552" y="58" textAnchor="end">a camera's view stops at the cloud</text>
        </g>

        {/* the ground: hills, a farm, the river and the field beside it that floods, trees for scale */}
        <path className="rd-hill" d="M 0 312 C 30 284 64 278 98 296 C 122 280 160 282 196 304 C 214 298 236 304 252 314 L 252 340 L 0 340 Z" />
        <path className="rd-earth" d="M 0 322 C 120 306 210 318 300 312 S 470 302 560 314 L 560 342 L 0 342 Z" />
        <path className="rd-soil" d="M 0 322 C 120 306 210 318 300 312 S 470 302 560 314 L 560 342 L 0 342 Z" />
        <g className="rd-strata"><path d="M 0 331 C 140 322 300 326 560 324" /><path d="M 30 338 C 200 333 380 336 540 332" /></g>
        <path className="rd-ground" d="M 0 322 C 120 306 210 318 300 312 S 470 302 560 314" />
        <g className="rd-farm" transform="translate(246 309)"><path d="M -9 0 V -8 L 0 -14 L 9 -8 V 0 Z" /><path className="rd-farm-door" d="M -2 0 V -5 H 2 V 0" /></g>
        <path className="rd-river" d="M 296 312.4 Q 306 318 318 311.4 Q 306 315 296 312.4 Z" />
        <g className="rd-crop">
          {Array.from({ length: 3 }, (_, r) => Array.from({ length: 12 - r * 2 }, (_, i) => {
            const x = 330 + r * 6 + i * (11 + r * 1.5), y = 309.5 - r * 0.6 + r * 5.2;
            return <path key={`${r}-${i}`} d={`M ${x} ${y} l -1.4 -${5 - r} M ${x} ${y} l 1.4 -${5 - r} M ${x} ${y} l 0 -${6 - r}`} style={{ opacity: 1 - r * 0.22 }} />;
          }))}
        </g>
        <g className="rd-water"><path d="M 300 312 C 340 306 400 306 462 307 L 462 322 C 400 320 340 322 300 318 Z" fill="url(#rd-water-g)" /><path className="rd-water-shine" d="M 318 310.5 C 350 308 392 308 430 309" /></g>
        <g className="rd-trees">
          {[[482, 306, 7], [498, 304, 9], [522, 308, 6], [542, 309, 8]].map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x} ${y})`}><path d={`M 0 0 V ${s * 0.5}`} className="rd-trunk" /><circle cx="0" cy={-s * 0.6} r={s * 0.75} /></g>
          ))}
        </g>
        <g className="rd-scatter">{[300, 318, 344, 372, 396, 420, 440].map((x, i) => <circle key={i} cx={x} cy={309 - (i % 2) * 2} r="2.2" />)}</g>
        <g className="rd-meanwhile">
          <text x="380" y="356" textAnchor="middle">meanwhile, the river floods the field</text>
        </g>

        {/* NISAR, drawn from NASA/JPL's description: the ISRO bus with a solar wing either side, the gold
            octagonal radar structure, and the 9 m boom holding the 12 m drum-shaped mesh reflector, which faces
            the ground at an angle; the beam leaves from the reflector */}
        <g clipPath="url(#rd-sky)">
          <g className="rd-sat" transform={satAt(U_REST)}>
            <g transform="rotate(-12.6 -36 -32)">
              <g className="rd-wing">
                {[0, 1, 2].map((k) => <rect key={`l${k}`} x={-90 + k * 15} y="-38" width="14" height="11" rx="0.8" />)}
                {[0, 1, 2].map((k) => <rect key={`r${k}`} x={-13 + k * 15} y="-38" width="14" height="11" rx="0.8" />)}
                <path className="rd-yoke" d="M -45 -32.5 H -27" />
              </g>
            </g>
            <rect className="rd-bus" x="-44" y="-42" width="15" height="13" rx="1.5" transform="rotate(-12.6 -36 -32)" />
            <path className="rd-boom" d="M -28 -22 L -6 -4" />
            <path className="rd-instr" d="M -33 -31 l 5 0 l 3.5 3.5 l 0 5 l -3.5 3.5 l -5 0 l -3.5 -3.5 l 0 -5 Z" />
            <g transform="rotate(-47)">
              <ellipse className="rd-drum-back" cx="0" cy="-4.5" rx="25" ry="7" />
              <path className="rd-drum-side" d="M -25 -4.5 V 0 M 25 -4.5 V 0" />
              <ellipse className="rd-drum" cx="0" cy="0" rx="25" ry="7" />
              <path className="rd-mesh" d="M -25 0 Q 0 3 25 0 M -18 -4.8 Q 0 6 18 4.8 M -18 4.8 Q 0 -6 18 -4.8 M 0 -7 V 7" />
            </g>
          </g>
        </g>
        {/* below the orbit, so the satellite never flies through its own label */}
        <text className="rd-name" x="14" y="134">NISAR <tspan className="rd-alt">· 747 km up</tspan></text>
        <text className="rd-pass" x="14" y="149">Pass 1 · day 0</text>
        <g className="rd-note">
          <text x="182" y="228" textAnchor="end">L-band pulse</text>
          <text x="182" y="242" textAnchor="end">24 cm waves</text>
          <path d="M 187 233 H 210" />
        </g>

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
