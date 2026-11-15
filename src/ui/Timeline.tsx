import { useState } from "react";
import { fmtClock, fmtDay, TZ, type SiteId } from "../data";
import { useStore } from "../store";
import { PLACES, sliderOf } from "../story";
import { useStoryTime } from "./bits";
import { COPY, EVENTS } from "./copy";
import { Icon } from "./icons";

const KIND: Record<string, string> = { reported: "Reported", gap: "Data gap", derived: "Derived", measured: "Measured" };
const SPEEDS = [0.25, 0.5, 1, 2, 4];

/**
 * Time at the current place. Three rows on one track: the phases of the story, the dated events
 * (each one a button with its own card), and the dates. Play, step from event to event, or scrub.
 */
export function Timeline() {
  const siteId = useStore((s) => s.siteId) as SiteId;
  const t = useStoryTime();
  const playing = useStore((s) => s.playing);
  const speed = useStore((s) => s.speed);
  const chapter = useStore((s) => s.chapter);
  const { setTime, setPlaying, setSpeed, setChapter } = useStore.getState();
  const notes = PLACES[siteId].chapters;
  const [tip, setTip] = useState<number | null>(null);
  const tl = PLACES[siteId].timeline;
  const sl = sliderOf(tl);
  const events = EVENTS[siteId];
  const minutes = siteId === "nepal" && t > tl.segs[1][0] && t < tl.segs[2][0];
  let cur = -1;
  events.forEach((e, k) => { if (t >= e.t) cur = k; });
  const now = cur >= 0 && t - events[cur].t < (siteId === "nepal" && minutes ? 12 * 60000 : 2.5 * 86400000) ? events[cur] : null;
  // previous / next: the event before the one we are on (or just past), and the first one ahead
  const prevK = (() => { for (let k = events.length - 1; k >= 0; k--) if (events[k].t < t - 2 * 60000) return k; return -1; })();
  const nextK = events.findIndex((e) => e.t > t + 2 * 60000);
  const jump = (k: number) => { if (k >= 0) setTime(events[k].t + 60000, true); };
  // before the first event, "previous" goes back to the start of the timeline
  const back = () => (prevK >= 0 ? jump(prevK) : setTime(tl.start, true));
  const atStart = prevK < 0 && t <= tl.start + 60000;
  // markers closer than about 1% of the track step aside, so two events on one day stay two buttons
  const nudge: number[] = [];
  events.forEach((e, k) => { nudge[k] = k > 0 && sl.toS(e.t) - sl.toS(events[k - 1].t) < 0.01 ? nudge[k - 1] + 1 : 0; });
  const show = tip ?? null;
  const pos = (v: number) => `${(sl.toS(v) * 100).toFixed(2)}%`;
  const phases = tl.phases.map((p, i) => ({ ...p, e: tl.phases[i + 1]?.s ?? 1 }));

  return (
    <div className="timeline" role="group" aria-label="Time">
      <div className="tl-controls">
        <button className="tl-step" onClick={back} disabled={atStart} aria-label={prevK >= 0 ? "Previous event" : "Back to the start"} title={prevK >= 0 ? "Previous event" : "Back to the start"}><Icon.prev /></button>
        <button className="play" onClick={() => setPlaying(!useStore.getState().playing)} aria-label={playing ? "Pause" : "Play the timeline"} title={playing ? "Pause (space)" : "Play the timeline (space)"}>
          {playing ? <Icon.pause /> : <Icon.play />}
        </button>
        <button className="tl-step" onClick={() => jump(nextK)} disabled={nextK < 0} aria-label="Next event" title="Next event"><Icon.next /></button>
      </div>
      <div className="when" aria-live="off">
        <b>{minutes ? fmtClock(siteId, t) : fmtDay(siteId, t)}</b>
        <span>{minutes ? `${fmtDay(siteId, t)} · ${TZ[siteId].label}` : siteId === "jazan" ? `${fmtClock(siteId, t)} ${TZ[siteId].label} · 2026` : "2026"}</span>
      </div>
      <div className="track">
        <div className="phases" aria-hidden="true">
          {phases.map((p) => <span key={p.label} className="phase" style={{ left: `${p.s * 100}%`, width: `${(p.e - p.s) * 100}%` }}><span>{p.label}</span></span>)}
        </div>
        <div className="events">
          {events.map((e, k) => (
            <button key={k} className={`event ${e.kind}${k === cur ? " now" : ""}${k <= cur ? " past" : ""}`} style={{ left: pos(e.t), marginLeft: -9 + nudge[k] * 12 }}
              onClick={() => jump(k)} onPointerEnter={() => setTip(k)} onPointerLeave={() => setTip(null)} onFocus={() => setTip(k)} onBlur={() => setTip(null)}
              aria-label={`${fmtDay(siteId, e.t)}: ${e.text}`}>
              <i />
            </button>
          ))}
          {show !== null && (
            <div className={`tl-tip${sl.toS(events[show].t) > 0.7 ? " right" : sl.toS(events[show].t) < 0.15 ? " left" : ""}`} style={{ left: pos(events[show].t) }} role="tooltip">
              <span className="tip-head"><span className={`chip ${events[show].kind}`}>{KIND[events[show].kind] ?? "Measured"}</span>{fmtDay(siteId, events[show].t)}</span>
              <span className="tip-text">{events[show].text}</span>
              {events[show].src && <span className="tip-src">{events[show].src}</span>}
            </div>
          )}
        </div>
        <div className="rail"><i style={{ width: pos(t) }} /></div>
        {/* the notes of the story, on the timeline: the one that owns this moment is lit */}
        <div className="notes">
          {notes.map((c, i) => (
            <button key={c.id} className={`note-pt${i === chapter ? " now" : i < chapter ? " past" : ""}`} style={{ left: pos(c.t) }} onClick={() => setChapter(i)}
              aria-label={`Note ${i + 1}: ${COPY[siteId][c.id].title}`} title={`${i + 1}. ${COPY[siteId][c.id].title}`}>{i + 1}</button>
          ))}
        </div>
        <input type="range" min={0} max={1000} step={1} value={Math.round(sl.toS(t) * 1000)} onChange={(e) => setTime(sl.fromS(+e.target.value / 1000))}
          aria-label="Date" aria-valuetext={`${fmtDay(siteId, t, true)} ${fmtClock(siteId, t)}`} />
        <div className="ticks" aria-hidden="true">{tl.ticks.map((k) => <span key={k.label} style={{ left: pos(k.t) }}>{k.label}</span>)}</div>
      </div>
      <div className="tl-speed" role="group" aria-label="Playback speed">
        <span>Speed</span>
        {SPEEDS.map((v) => <button key={v} aria-pressed={speed === v} onClick={() => setSpeed(v)}>{v === 0.25 ? "¼" : v === 0.5 ? "½" : v}×</button>)}
      </div>
      <p className={`happening${now ? " on" : ""}`} aria-live="polite">
        {now ? <><span className={`chip ${now.kind}`}>{KIND[now.kind] ?? "Measured"}</span><span className="h-text">{now.text}</span>{now.src && <span className="src"> · {now.href ? <a href={now.href} target="_blank" rel="noopener noreferrer">{now.src}</a> : now.src}</span>}</> : <span className="h-empty">{nextK >= 0 ? <>Next: <button className="link-btn" onClick={() => jump(nextK)}>{fmtDay(siteId, events[nextK].t)} · {events[nextK].text}</button></> : "No more dated events after this point."}</span>}
      </p>
    </div>
  );
}
