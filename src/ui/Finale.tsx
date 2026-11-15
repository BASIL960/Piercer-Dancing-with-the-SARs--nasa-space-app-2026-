import { isoDay, type JazanData, type NepalData, type OregonData } from "../data";
import { useStore } from "../store";
import { NEPAL_T0, NISAR_PASS_NEPAL, ORDER, PLACES } from "../story";
import { Tags, useSites } from "./bits";
import { CompareBars, SeasonChart, type SeasonRow } from "./charts";

const d8 = (s: string) => isoDay(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);

/** The ending: three speeds of change on one season's axis, and what radar did at each. */
export function Finale() {
  const sites = useSites();
  const { openSite, toHub, setSourcesOpen } = useStore.getState();
  const n = sites.nepal as NepalData, o = sites.oregon as OregonData, j = sites.jazan as JazanData;
  const fp = n.std.pairs["20260819_20260831"], fc = o.std.coh["20260716_20260821"], x = j.std.xcheck;

  const rows: SeasonRow[] = [
    {
      id: "nepal", label: "Bhote Koshi",
      spans: [{ a: NEPAL_T0, b: NEPAL_T0 + 3600e3, kind: "event", label: "Flood, 26 Aug" }, { a: NEPAL_T0 + 3600e3, b: isoDay("2026-10-01"), kind: "veil", label: "No clear photo until 1 Oct" }],
      passes: [...new Set(n.radar.flatMap((r) => [r.d1, r.d2]))].map(NISAR_PASS_NEPAL),
    },
    {
      id: "oregon", label: "Oregon's Fire",
      spans: [{ a: Date.UTC(2026, 6, 23), b: Date.UTC(2026, 7, 28), kind: "fire", label: "Fire, 23 Jul – 28 Aug" }],
      passes: [...new Set([...Object.keys(o.std.coh).flatMap((k) => [k.slice(0, 8), k.slice(9)]), ...Object.keys(o.std.hv)])].map(d8),
    },
    {
      id: "jazan", label: "Jazan",
      spans: [{ a: isoDay("2026-08-12"), b: isoDay("2026-10-24"), kind: "rain", label: "Storms and alerts, 12 Aug – 24 Oct" }, { a: isoDay("2026-09-16"), b: isoDay("2026-11-01"), kind: "green", label: "Plain greens, mid-Sep to Nov" }],
      passes: j.gcov.map((g) => isoDay(g.date)),
    },
  ];

  return (
    <section className="finale">
      <div className="finale-inner">
        <p className="kicker">The whole season</p>
        <h1>Minutes, weeks, a season</h1>
        <p className="lede">The ground changed at three speeds in the summer of 2026. Each time, cloud, smoke or storm hid it from cameras, and each time NISAR's radar saw through.</p>
        <SeasonChart rows={rows} gap={[isoDay("2026-07-27"), isoDay("2026-08-11")]} />
        <p className="note">Dots: NISAR passes used here. The shaded band: no NISAR data, 27 July – 10 August 2026, at all three places alike (ASF).</p>

        <div className="findings">
          <article>
            <h2><span>{PLACES.nepal.speed}</span> Through the cloud</h2>
            <p>Five days after the flood, radar showed the flood corridor changed far more than the slopes beside it, five weeks before the first clear photo.</p>
            <CompareBars label="Bhote Koshi: share of ground changed in the radar pair spanning the flood" rows={[
              { name: "Flood corridor", v: fp.corridor, lo: fp.corridorLo, hi: fp.corridorHi, kind: "corridor" },
              { name: "Slopes beside it", v: fp.control, lo: fp.controlLo, hi: fp.controlHi, kind: "control" },
            ]} />
          </article>
          <article>
            <h2><span>{PLACES.oregon.speed}</span> Beyond the smoke</h2>
            <p>Across the fire the surface changed where it burned hottest, and two months later the shrub signal was still down while the photos looked green.</p>
            <CompareBars label="Oregon's Fire: share of ground changed between 16 July and 21 August" rows={[
              { name: "Burned hottest", v: fc["t0.2"].hot, lo: fc["t0.25"].hot, hi: fc["t0.15"].hot, kind: "fire" },
              { name: "Unburned outside", v: fc["t0.2"].control, lo: fc["t0.25"].control, hi: fc["t0.15"].control, kind: "control" },
            ]} />
          </article>
          <article>
            <h2><span>{PLACES.jazan.speed}</span> Ahead of the green</h2>
            <p>Ground the dawn radar kept flagging through the rains was {(x.flagged / x.not).toFixed(1)} times as likely to be green by November.</p>
            <CompareBars label="Jazan: share of the plain green by November" rows={[
              { name: "Radar flagged", v: x.flagged, lo: x.flaggedLo, hi: x.flaggedHi, kind: "green" },
              { name: "Rest of the plain", v: x.not, lo: x.notLo, hi: x.notHi, kind: "control" },
            ]} />
          </article>
        </div>

        <div className="limits">
          <h2>What radar cannot do alone</h2>
          <p>It shows that the surface changed, not why. In every place here the explanation needed photos, rainfall, elevation and dated reports. Every derived number here follows one stated rule, sits next to a comparison where the event did not happen, and was recomputed with its threshold nudged down and up; the brackets give that range. The NISAR products are provisional and will be replaced by validated versions (from 21 October 2026).</p>
          <Tags kinds={["derived", "interpretation"]} />
        </div>

        <div className="finale-actions">
          {ORDER.map((id) => <button key={id} className="quiet" onClick={() => openSite(id, 0)}>Revisit {PLACES[id].name}</button>)}
          <button className="quiet" onClick={toHub}>The globe</button>
          <button className="quiet" onClick={() => setSourcesOpen(true)}>Sources and method</button>
        </div>
        <p className="colophon">Piercer, because radar pierces what sunlight cannot.</p>
      </div>
    </section>
  );
}
