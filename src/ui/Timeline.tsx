import { fmtClock, fmtDay, TZ, type SiteId } from "../data";
import { useStore } from "../store";
import { PLACES, sliderOf } from "../story";
import { useStoryTime } from "./bits";
import { EVENTS } from "./copy";

/** Time at the current place: play, scrub, jump to dated events. */
export function Timeline() {
  const siteId = useStore((s) => s.siteId) as SiteId;
  const t = useStoryTime();
  const playing = useStore((s) => s.playing);
  const { setTime, setPlaying } = useStore.getState();
  const tl = PLACES[siteId].timeline;
  const sl = sliderOf(tl);
  const events = EVENTS[siteId];
  const minutes = siteId === "nepal" && t > tl.segs[1][0] && t < tl.segs[2][0];
  const hourly = siteId === "jazan" || siteId === "nepal";
  let cur = -1;
  events.forEach((e, k) => { if (t >= e.t) cur = k; });
  const now = cur >= 0 && t - events[cur].t < (siteId === "nepal" && minutes ? 12 * 60000 : 2.5 * 86400000) ? events[cur] : null;

  return (
    <div className="timeline" role="group" aria-label="Time">
      <button className="play" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause (space)" : "Play (space)"}>
        <svg viewBox="0 0 16 16" aria-hidden="true">{playing ? <path d="M3 2h3.5v12H3zM9.5 2H13v12H9.5z" /> : <path d="M3.5 2l10 6-10 6z" />}</svg>
      </button>
      <div className="when" aria-live="off">
        <b>{minutes ? fmtClock(siteId, t) : fmtDay(siteId, t)}</b>
        <span>{minutes ? `${fmtDay(siteId, t)}, ${TZ[siteId].label}` : hourly && siteId === "jazan" ? `${fmtClock(siteId, t)} ${TZ[siteId].label}` : "2026"}</span>
      </div>
      <div className="track">
        {tl.phases.map((p) => <span key={p.label} className="phase" style={{ left: `${p.s * 100}%` }}>{p.label}</span>)}
        <div className="rail"><i style={{ width: `${sl.toS(t) * 100}%` }} /></div>
        {events.map((e, k) => (
          <button key={k} className={`event ${e.kind}${k === cur ? " now" : ""}`} style={{ left: `${sl.toS(e.t) * 100}%` }} onClick={() => setTime(e.t + 60000, true)} aria-label={`${fmtDay(siteId, e.t)}: ${e.text}`} title={e.text} tabIndex={-1} />
        ))}
        <input type="range" min={0} max={1000} step={1} value={Math.round(sl.toS(t) * 1000)} onChange={(e) => setTime(sl.fromS(+e.target.value / 1000))}
          aria-label="Date" aria-valuetext={`${fmtDay(siteId, t, true)} ${fmtClock(siteId, t)}`} />
        <div className="ticks" aria-hidden="true">{tl.ticks.map((k) => <span key={k.label} style={{ left: `${sl.toS(k.t) * 100}%` }}>{k.label}</span>)}</div>
      </div>
      <p className={`happening${now ? " on" : ""}`} aria-live="polite">
        {now ? <><span className={`chip ${now.kind}`}>{now.kind === "reported" ? "Reported" : now.kind === "gap" ? "Data gap" : now.kind === "derived" ? "Derived" : "Measured"}</span>{now.text}{now.src && <span className="src"> · {now.href ? <a href={now.href} target="_blank" rel="noopener noreferrer">{now.src}</a> : now.src}</span>}</> : " "}
      </p>
    </div>
  );
}
