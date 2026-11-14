import { useEffect, useRef, useState } from "react";
import { DAY, HOUR, type JazanData, type NepalData, type OregonData, type SiteId } from "../data";
import { currentChapter, useStore } from "../store";
import { JAZAN_T0, NEPAL_T0, ORDER, OREGON_T0, PLACES } from "../story";
import { area, pct, Tags, useEngine, useSites, useStoryTime } from "./bits";
import { COPY, fmtPairLabel, JAZAN_RAIN_DAY, LAYER_INFO, type Ctx } from "./copy";
import { Timeline } from "./Timeline";

function Readout({ id, t }: { id: SiteId; t: number }) {
  const sites = useSites();
  const layer = useStore((s) => s.layer);
  const pass = useStore((s) => s.pass);
  const items: [string, string, string][] = [];
  if (id === "nepal") {
    const d = sites.nepal as NepalData, m = (t - NEPAL_T0) / 60000;
    if (layer === "radar") items.push(["Radar pair", fmtPairLabel(d, t), "measured"]);
    if (m >= 0 && m < 60 * 6) {
      const fm = d.flowMinutes;
      let i = 0; while (i < fm.length - 1 && fm[i + 1] <= m) i++;
      items.push(["Surge front", i >= fm.length - 1 ? "past the map edge" : `${((i / (fm.length - 1)) * d.pathKm).toFixed(1)} km`, "interpolated"]);
    }
    if (m >= 0) {
      const a = d.areaMinutes[Math.min(d.areaMinutes.length - 1, Math.floor(m))];
      items.push(["Stripped ground reached", `${a.toFixed(1)} km²`, m >= d.areaMinutes.length ? "derived" : "interpolated"]);
    }
  }
  if (id === "oregon") {
    const d = sites.oregon as OregonData, h = (t - OREGON_T0) / HOUR;
    if (h >= 0) {
      const a = d.areaHourly[Math.min(d.areaHourly.length - 1, Math.floor(h))];
      const day = Math.floor(h / 24) + 1;
      items.push(day <= 37 ? ["Fire", `day ${day}`, "reported"] : ["After the fire", `${day - 37} days`, "reported"]);
      items.push(["Burned so far", `${area(a)} km²`, h >= d.areaHourly.length - 1 ? "derived" : "interpolated"]);
    }
    const cont: [number, string][] = [[Date.UTC(2026, 6, 28), "5%"], [Date.UTC(2026, 7, 10), "41%"], [Date.UTC(2026, 7, 15), "55%"], [Date.UTC(2026, 7, 23), "93%"]];
    let c = ""; for (const [ct, v] of cont) if (t >= ct) c = v;
    if (c) items.push(["Contained", c, "reported"]);
  }
  if (id === "jazan") {
    const d = sites.jazan as JazanData;
    const r = JAZAN_RAIN_DAY(d, t);
    if (r) items.push(["Rain that day", `${r.mm.toFixed(1)} mm avg · ${Math.round(r.max)} max`, "measured"]);
    const i = Math.max(0, Math.min(d.season.green_new_plain.length - 1, Math.floor((t - JAZAN_T0) / DAY - 10.5 / 24)));
    items.push(["Newly green plain", `${area(d.season.green_new_plain[i])} km²`, "derived"]);
    const g = d.gcov.filter((x) => x.when === pass && Date.parse(`${x.date}T00:00:00Z`) - 3 * HOUR + (pass === "dusk" ? 18.65 : 5.65) * HOUR <= t).pop();
    if (g) items.push([`Wet ground, last ${pass} pass`, `${pct(g.brighter)}% of plain`, "derived"]);
  }
  if (!items.length) return null;
  return (
    <dl className="readout">
      {items.map(([k, v, kind]) => <div key={k} className={kind}><dt>{k}</dt><dd>{v}{kind === "interpolated" && <small> est.</small>}</dd></div>)}
    </dl>
  );
}

function Layers({ id }: { id: SiteId }) {
  const layer = useStore((s) => s.layer), pass = useStore((s) => s.pass), rain = useStore((s) => s.rain), overlays = useStore((s) => s.overlays);
  const chapter = useStore((s) => s.chapter);
  const st = { ...useStore.getState(), layer, pass, rain, overlays };
  const ch = currentChapter({ siteId: id, chapter });
  const info = LAYER_INFO[id];
  const offered = ch.layers ?? [ch.layer];
  const L = info[st.layer] ?? info[ch.layer];
  const passes = id === "jazan" && ["change", "wet", "freq", "season"].includes(st.layer);
  return (
    <div className="layers">
      {offered.length > 1 && (
        <div className="segmented" role="group" aria-label="Map layer">
          {offered.map((l) => <button key={l} aria-pressed={st.layer === l} onClick={() => st.setLayer(l)}>{info[l].name}</button>)}
        </div>
      )}
      <div className="toggles">
        {passes && (
          <div className="segmented small" role="group" aria-label="Radar pass">
            <button aria-pressed={st.pass === "dusk"} onClick={() => st.setPass("dusk")}>Dusk 18:39</button>
            <button aria-pressed={st.pass === "dawn"} onClick={() => st.setPass("dawn")}>Dawn 05:39</button>
          </div>
        )}
        {id === "jazan" && <label className="check"><input type="checkbox" checked={st.rain} onChange={(e) => st.setRain(e.target.checked)} /> Rain</label>}
        <label className="check"><input type="checkbox" checked={st.overlays} onChange={(e) => st.setOverlays(e.target.checked)} /> Labels</label>
      </div>
      {L && (
        <div className="legend">
          {L.legend.map(([c, txt]) => <p key={txt}><i style={{ background: c }} />{txt}</p>)}
          <p className="src-line">{L.src}</p>
        </div>
      )}
    </div>
  );
}

function Relief({ id }: { id: SiteId }) {
  const engine = useEngine();
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!engine) return;
    return engine.onFrame(() => {
      const el = ref.current; if (!el) return;
      const x = engine.exaggeration(id);
      const m = engine.metresPerPixel() * 100;
      const nice = [1000, 2000, 5000, 10000, 20000, 50000, 100000].find((v) => v >= m * 0.6) ?? 100000;
      const px = (nice / m) * 100;
      el.innerHTML = `<span class="bar" style="width:${px.toFixed(0)}px"></span>${nice >= 1000 ? `${nice / 1000} km` : `${nice} m`}${x > 0.05 ? ` · relief ×${PLACES[id].exag}` : ""}`;
    });
  }, [engine, id]);
  return <p ref={ref} className="scale" aria-hidden="true" />;
}

export function SiteHud() {
  const sites = useSites();
  const siteId = useStore((s) => s.siteId);
  const chapter = useStore((s) => s.chapter);
  const t = useStoryTime();
  const pass = useStore((s) => s.pass);
  const freeCam = useStore((s) => s.freeCam);
  const st = useStore.getState();
  const place = PLACES[siteId];
  const ch = place.chapters[chapter];
  const copy = COPY[siteId][ch.id];
  const ctx: Ctx = { sites, t, pass, setTime: (v) => st.setTime(v, true) };
  const isLast = chapter === place.chapters.length - 1;
  const nextSite = ORDER[ORDER.indexOf(siteId) + 1];
  // the reading panels hold back while the camera flies in from far away
  const [arriving, setArriving] = useState(true);
  useEffect(() => { setArriving(true); const k = setTimeout(() => setArriving(false), st.reducedMotion ? 0 : 1400); return () => clearTimeout(k); }, [siteId]); // eslint-disable-line react-hooks/exhaustive-deps
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [siteId, chapter]);

  return (
    <section className={`site site-${siteId}${arriving ? " arriving" : ""}`} aria-label={`${place.name}, ${place.where}`}>
      <article className="story" ref={body}>
        <div className="story-inner" key={`${siteId}-${chapter}`}>
          <p className="kicker">{copy.kicker}</p>
          <h1>{copy.title}</h1>
          <div className="body">{copy.body(ctx)}</div>
          <Tags kinds={copy.tags} />
        </div>
        <nav className="chapters" aria-label={`Chapters of ${place.name}`}>
          <ol>
            {place.chapters.map((c, i) => (
              <li key={c.id}>
                <button className={i === chapter ? "now" : i < chapter ? "done" : ""} aria-current={i === chapter ? "step" : undefined} onClick={() => st.setChapter(i)} title={COPY[siteId][c.id].title}>
                  <span className="sr">{i + 1}. {COPY[siteId][c.id].title}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="steps">
            <button className="quiet" onClick={st.prev}>Back</button>
            <button className="primary" onClick={st.next}>
              {isLast ? (nextSite ? `Next: ${PLACES[nextSite].speed.toLowerCase()}, ${PLACES[nextSite].name}` : "The whole season") : `Next: ${COPY[siteId][place.chapters[chapter + 1].id].title}`}
            </button>
          </div>
        </nav>
      </article>

      <aside className="evidence" aria-label="Evidence">
        <Layers id={siteId} />
        <Readout id={siteId} t={t} />
        {copy.evidence && <div className="figure" key={`${siteId}-${chapter}`}>{copy.evidence(ctx)}</div>}
      </aside>

      {freeCam && <button className="recenter" onClick={st.recenter}>Back to the story view <kbd>R</kbd></button>}
      <Relief id={siteId} />
      <Timeline />
    </section>
  );
}
