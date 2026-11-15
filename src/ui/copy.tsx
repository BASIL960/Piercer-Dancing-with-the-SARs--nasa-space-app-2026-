// The words of the journey. Derived numbers are read from the site data (research/std_*.json). The few typed in
// are reported figures (tolls, acres, containment, alerts) or values the site data does not hold (the VIIRS
// busiest day, the Jizan Dam water areas); scripts/stories/verify.mjs re-checks those it can, and every number
// is listed with its rule and control in research/CLAIMS.md.
import type { ReactNode } from "react";
import { DAY, fmtCompact, fmtIso, HOUR, isoDay, local, type JazanData, type NepalData, type OregonData, type SiteId, type Sites } from "../data";
import { NISAR_PASS_NEPAL } from "../story";
import { area, Num, pct, range, Src, type Evidence } from "./bits";
import { BurnChart, CompareBars, DuskDawnChart, GreenChart, HvChart, PairsChart, PassesStrip, ProfileChart, RainChart } from "./charts";

export interface Ctx { sites: Sites; t: number; pass: "dusk" | "dawn"; setTime: (t: number) => void }
export interface ChapterCopy {
  kicker: string;
  title: string;
  body: (c: Ctx) => ReactNode;
  tags: Evidence[];
  evidence?: (c: Ctx) => ReactNode;
  legend?: string[];
}
export interface StoryEvent { t: number; text: string; src?: string; href?: string; kind: "reported" | "measured" | "derived" | "gap" }

const N = (mo: number, d: number, h = 12, mi = 0) => local("nepal", 2026, mo, d, h, mi);
const J = (mo: number, d: number, h = 12, mi = 0) => local("jazan", 2026, mo, d, h, mi);
const O = (mo: number, d: number, h = 12) => Date.UTC(2026, mo - 1, d, h);
const KP = "Kathmandu Post", OI = "OneIndia";

// ---------------------------------------------------------------- dated events (reported facts carry their source)
export const EVENTS: Record<SiteId, StoryEvent[]> = {
  nepal: [
    { t: N(8, 12, 10), text: "Last clear optical photo of the valley before the flood.", src: "NASA HLS", kind: "measured" },
    { t: N(8, 16), text: "Ten days of heavy monsoon rain soak the slopes above the valley.", src: OI, kind: "reported" },
    { t: NISAR_PASS_NEPAL("20260819"), text: "NISAR's last radar pass before the flood.", src: "ASF", kind: "measured" },
    { t: N(8, 26, 8, 37), text: "08:37 · Seismometers record a jolt. Ice and rock collapse into the valley head and the surge begins.", src: "USGS · Kathmandu Post", kind: "reported" },
    { t: N(8, 26, 9, 0), text: "≈09:00 · The surge hits the Rasuwagadhi border crossing and Timure. The customs office, police posts and market are swept away.", src: KP, kind: "reported" },
    { t: N(8, 26, 9, 10), text: "≈09:10 · It reaches Syabrubesi, about ten minutes later. The river gauge is destroyed.", src: OI, kind: "reported" },
    { t: N(8, 26, 9, 32), text: "Downstream on the Trishuli, the river at Galchhi rises 9 m in 30 minutes.", src: KP, kind: "reported" },
    { t: N(8, 26, 18), text: "98 deaths confirmed by evening; hundreds of people out of contact.", src: OI, kind: "reported" },
    { t: N(8, 27, 8), text: "162 deaths confirmed. China reports a 2 million m³ barrier lake on the Tibetan side.", src: `${OI} · ${KP}`, kind: "reported" },
    { t: NISAR_PASS_NEPAL("20260831"), text: "NISAR passes again: the first radar pair spanning the flood.", src: "NISAR", kind: "measured" },
    { t: N(9, 10), text: "Government toll reaches 289, with hundreds still missing.", src: KP, kind: "reported" },
    { t: N(10, 1, 10), text: "First clear optical photo since the flood.", src: "NASA HLS", kind: "measured" },
  ],
  oregon: [
    { t: O(7, 23, 14), text: "Lightning starts a fire about 25 miles south-west of Jordan Valley, Oregon.", src: "NIFC", kind: "reported" },
    { t: O(7, 26), text: "Busiest day: 19% of all the fire's VIIRS detections are first seen today.", src: "NASA VIIRS", kind: "measured" },
    { t: O(7, 26, 23), text: "NISAR's last pass before a gap in its schedule; the next is on 12 August.", src: "ASF", kind: "gap" },
    { t: O(7, 28), text: "About 300,000 acres, 5% contained.", src: "idahonews.com", kind: "reported" },
    { t: O(8, 10), text: "541,000 acres, 41% contained. About 1,050 firefighters, 39 dozers and 6 helicopters on the fire.", src: "Elkhorn Media Group", kind: "reported" },
    { t: O(8, 15), text: "578,000 acres, 55% contained. Storms spark new fires nearby.", src: "idahonews.com", kind: "reported" },
    { t: O(8, 21), text: "First pass after the gap on the NISAR track used here, which covers the whole fire.", src: "NISAR", kind: "measured" },
    { t: O(8, 23), text: "93% contained; command handed back to local crews.", src: "NIFC", kind: "reported" },
    { t: O(8, 30), text: "First clear view of the whole scar.", src: "NASA HLS", kind: "measured" },
    { t: O(10, 20), text: "NISAR: the shrub signal is still down where it burned hottest.", src: "NISAR GCOV", kind: "derived" },
  ],
  jazan: [
    { t: J(8, 12, 0), text: "The wettest day of the season over the study area.", src: "NASA IMERG", kind: "measured" },
    { t: J(8, 16), text: "Weather warning: moderate to heavy rain over several Jazan governorates.", src: "NCM via Dalil Saudi", href: "https://dalylsaudi.com/news457005.html", kind: "reported" },
    { t: J(8, 22), text: "Red alert for Jazan. Civil Defense tells people to keep out of wadi beds and flood channels.", src: "Dalil Saudi", href: "https://dalylsaudi.com/news456975.html", kind: "reported" },
    { t: J(8, 26), text: "Red alert until 21:00: heavy rain, hail and torrents in the mountain governorates.", src: "NCM via Dalil Saudi", href: "https://dalylsaudi.com/news456975.html", kind: "reported" },
    { t: J(8, 30), text: "Another red alert for the mountain governorates.", src: "NCM via Dalil Saudi", href: "https://dalylsaudi.com/news457005.html", kind: "reported" },
    { t: J(9, 22, 18, 39), text: "The radar pass with the most rain just before it: 2.4 mm on average in the previous 6 hours, over 49% of the area.", src: "NASA IMERG · NISAR", kind: "measured" },
    { t: J(10, 6), text: "October's wettest day.", src: "NASA IMERG", kind: "measured" },
    { t: J(10, 13), text: "Thunderstorms with hail over wide parts of Jazan; torrents possible in the wadis.", src: "NCM via Nl7za", href: "https://nl7za.com/saudi/saudi-weather-tuesday-midday-jazan-floods-hail-till-10pm-dammam-42-2026-10-13", kind: "reported" },
    { t: J(10, 24, 16), text: "Wadi Bid flows after afternoon rain (resident's video). IMERG's strongest rain cell of the season, 41 mm, fell in the study area that day.", src: "X post · NASA IMERG", href: "https://x.com/rashud2/status/2114118615004016895", kind: "reported" },
    { t: J(11, 5), text: "Civil Defense warns of thunderstorms and flash floods across most regions.", src: "Arab News", href: "https://www.arabnews.com/saudi-arabia/saudi-arabia-braces-for-thunderstorms-flash-floods-across-most-regions-through-tuesday-3010103", kind: "reported" },
  ],
};

const Q = ({ children }: { children: ReactNode }) => <p className="question">{children}</p>;
const Note = ({ children }: { children: ReactNode }) => <p className="note">{children}</p>;

// ---------------------------------------------------------------- Bhote Koshi
const np = (c: Ctx) => c.sites.nepal as NepalData;
const floodPair = (d: NepalData) => d.std.pairs["20260819_20260831"];
const NEPAL: Record<string, ChapterCopy> = {
  valley: {
    kicker: "Minutes · Bhote Koshi, Nepal",
    title: "A river that falls four kilometres",
    tags: ["measured"],
    body: (c) => { const d = np(c); return <>
      <p>The Bhote Koshi leaves the Tibetan plateau through one of the deepest valleys in the Himalaya. Along the {d.pathKm} km of valley mapped here, its floor drops from {d.srcElev.toLocaleString("en-GB")} m to {d.elev[d.elev.length - 1].toLocaleString("en-GB")} m.</p>
      <p>On the morning of 26 August 2026 that floor was stripped bare in less than an hour.</p>
      <Q>Every camera in orbit was looking at monsoon cloud. So how do we know what happened down here?</Q>
    </>; },
    evidence: (c) => <><h3>The drop along the valley floor</h3><ProfileChart d={np(c)} t={c.t} /><Note>Copernicus DEM, 30 m. The 3D view raises the relief 1.15×.</Note></>,
  },
  surge: {
    kicker: "Minutes · 26 August",
    title: "08:37",
    tags: ["reported", "interpolated"],
    body: (c) => <>
      <p>Seismometers recorded the jolt as ice and rock broke away high above the valley head, on the ridge north of Langtang Lirung, and fell into the stream below.</p>
      <p>The water reached the Rasuwagadhi border crossing and Timure at about 09:00, and Syabrubesi, {Math.round(np(c).kmS - np(c).kmR)} km further down the valley, about ten minutes later. Further downstream at Galchhi, the Trishuli rose 9 metres in 30 minutes.</p>
      <Note>Between those reported times, the moving front is an estimate along the valley floor traced from the elevation model. Early reports called the source a glacial-lake outburst; ICIMOD described an ice avalanche.</Note>
    </>,
    evidence: (c) => <><h3>Following the surge</h3><ProfileChart d={np(c)} t={c.t} /><Note>White dot: the estimated front. The blue on the map is ground the October photos show as stripped, coloured as the estimated surge reaches it.</Note></>,
  },
  blind: {
    kicker: "Minutes · the weeks after",
    title: "Five weeks under cloud",
    tags: ["measured", "reported", "illustrative"],
    body: () => <>
      <p>The last clear Landsat or Sentinel-2 photo of the valley before the flood was taken on 12 August. The next came on 1 October. Through the rescue, the monsoon hid the ground from every camera in orbit.</p>
      <p>Meanwhile the toll rose: 98 deaths confirmed that evening, 162 the next morning, 289 by 10 September, with hundreds still missing. On the Tibetan side the debris had dammed a 2 million m³ lake.</p>
      <Q>A radar satellite does not need clear skies. NISAR passed over this valley on 31 August, five days after the flood.</Q>
      <Note>The veil on the map stands for "no clear photo". It is not a picture of the actual clouds.</Note>
    </>,
    evidence: (c) => <><h3>Clear photos and radar passes</h3><PassesStrip d={np(c)} t={c.t} /><Note>Squares: clear NASA HLS photos. Dots: NISAR passes on track 98, every 12 days.</Note></>,
  },
  radar: {
    kicker: "Minutes · through the cloud",
    title: "What radar saw on 31 August",
    tags: ["derived"],
    body: (c) => { const p = floodPair(np(c)); return <>
      <p>NISAR passed over on 19 August and again on 31 August, on the same orbit track. Where the ground stays the same, the two radar echoes match closely. Where it changes, they stop matching (their <em>coherence</em> drops). Pink marks ground where coherence fell at least 0.20 below its usual, pre-flood level.</p>
      <p>Along the flood corridor (ground within 420 m of the valley floor), <Num v={p.corridor} lo={p.corridorLo} hi={p.corridorHi} /> changed. On the slopes just beside it, <Num v={p.control} lo={p.controlLo} hi={p.controlHi} />.</p>
      <p>In every pair before the flood, the corridor and the slopes changed by similar amounts. Only the pair spanning 26 August pulls them apart.</p>
      <Q>Step through the pairs and see it for yourself.</Q>
    </>; },
    evidence: (c) => <><h3>Ground that changed, pair by pair</h3><PairsChart d={np(c)} t={c.t} onPick={c.setTime} />
      <p className="key"><i className="sw corridor" /> flood corridor <i className="sw control" /> slopes beside it · whiskers: threshold 0.15–0.25</p>
      <Note>Coherence shows that the surface changed, not why. The 24 Sep → 6 Oct pair changed nearly everywhere, corridor and slopes alike, which is consistent with weather rather than the flood.</Note></>,
  },
  scar: {
    kicker: "Minutes · when the cloud lifted",
    title: "The scar",
    tags: ["derived"],
    body: (c) => { const d = np(c), s = d.std.stripped, x = d.std.xcheck; return <>
      <p>The clear October photos show what the radar had flagged a month earlier: a grey channel of rock and silt where the valley floor had been green.</p>
      <p><Num v={s.km2} lo={s.lo} hi={s.hi} unit="km²" f={area} /> of ground lost its plants or became open water along the route: <b>{pct(s.share)}%</b> of the flood corridor. On the slopes beside it, only {pct(s.controlPct)}% passes the same test.</p>
      <p>And the radar had seen it: <Num v={x.stripped} lo={x.strippedLo} hi={x.strippedHi} /> of that stripped ground had already changed in the 19 → 31 August pair, against {pct(x.rest)}% of the rest of the corridor.</p>
    </>; },
    evidence: (c) => { const d = np(c), s = d.std.stripped, x = d.std.xcheck; return <><h3>Two satellites, one scar</h3>
      <CompareBars label="Share of ground flagged" rows={[
        { name: "Corridor stripped", v: s.share, kind: "scar" },
        { name: "Slopes stripped", v: s.controlPct, kind: "control" },
        { name: "Radar on stripped", v: x.stripped, lo: x.strippedLo, hi: x.strippedHi, kind: "corridor" },
        { name: "Radar elsewhere", v: x.rest, kind: "control" },
      ]} />
      <Note>Stripped = vegetation index down at least 0.15 to below 0.30, or new open water (NASA HLS, October vs May–August blends). Switch to "Before" to compare.</Note></>; },
  },
  meaning: {
    kicker: "Minutes · why it matters",
    title: "Five days, not five weeks",
    tags: ["reported", "interpretation"],
    body: () => <>
      <p>When a disaster comes with its own weather, the first clear photograph can be weeks away. Here a radar pass five days after the flood already outlined the damaged corridor, while helicopters were still turning back from swept-away landing sites.</p>
      <p>Radar could not say on its own what had happened. The photos, the elevation model and the reports supplied the why. Radar supplied the when and the where, through the cloud.</p>
    </>,
  },
};

// ---------------------------------------------------------------- Big Grass Fire
const og = (c: Ctx) => c.sites.oregon as OregonData;
const cohFire = (d: OregonData) => d.std.coh["20260716_20260821"];
const burnOn = (d: OregonData, iso: string) => d.std.series.find((s) => s.date === iso)!;
const OREGON: Record<string, ChapterCopy> = {
  spark: {
    kicker: "Weeks · Oregon's Fire, Oregon–Idaho",
    title: "One lightning strike",
    tags: ["reported"],
    body: () => <>
      <p>On 23 July 2026 lightning struck the sagebrush and juniper hills about 25 miles south-west of Jordan Valley, Oregon. This is dry rangeland: high plateau cut by canyons, with Idaho to the east.</p>
      <Q>How far can a fire run before anyone sees its edge?</Q>
    </>,
  },
  run: {
    kicker: "Weeks · the first days",
    title: "Six days",
    tags: ["measured", "derived", "reported", "interpolated"],
    body: (c) => { const d = og(c), b = d.std.jul29Bounds, hid = 100 - burnOn(d, "2026-07-29").valid_in_perimeter * 100; return <>
      <p>The fire ran north and east. 26 July was its busiest day: 19% of all its VIIRS fire detections were first seen then. Officials reported about 300,000 acres and 5% containment on 28 July.</p>
      <p>By 29 July, the clear parts of that day's satellite photos show at least <b>{Math.round(b[0])}%</b> of the final burned area already burned. Smoke and cloud hid {Math.round(hid)}% of the perimeter, so the true figure could be as high as <b>{Math.round(b[1])}%</b>.</p>
      <Note>The glowing front is an estimate: VIIRS fire days with photo edges, filled in within each day.</Note>
    </>; },
    evidence: (c) => <><h3>Share of the final burned area</h3><BurnChart d={og(c)} t={c.t} /><Note>Dots: clear photos (small where smoke hid part of the fire). Faint line: the animation's estimate.</Note></>,
  },
  gap: {
    kicker: "Weeks · a gap in the record",
    title: "The radar's blind spot",
    tags: ["measured", "derived", "reported"],
    body: (c) => { const d = og(c), k = cohFire(d); return <>
      <p>Radar has gaps too. NISAR made no passes over the fire from 26 July to 12 August. In those days a second surge pushed it south and east into Idaho, watched only by optical satellites through their own smoke. Photos show {Math.round(burnOn(d, "2026-08-10").share_of_final)}% of the final burned area burned by 10 August, and {Math.round(burnOn(d, "2026-08-23").share_of_final)}% by 23 August, when the fire was 93% contained.</p>
      <p>When NISAR came back on 21 August, comparing it with 16 July (a 36-day pair, because of the gap) showed <Num v={k["t0.2"].burned} lo={k["t0.25"].burned} hi={k["t0.15"].burned} /> of the burned ground changed, and <b>{pct(k["t0.2"].hot)}%</b> where it burned hottest. On land outside the fire: {pct(k["t0.2"].control)}%.</p>
      <Note>False colour (short-wave infrared, near-infrared, red): fresh burn shows deep red, live plants green.</Note>
    </>; },
    evidence: (c) => <><h3>Share of the final burned area</h3><BurnChart d={og(c)} t={c.t} />
      <Note>The shaded band: no NISAR passes over the fire. The track used here, which covers all of it, passed on 16 July and next on 21 August.</Note>
      <Note>Each dot is one photo compared with the same pre-fire blend, so it can read low but burned ground cannot un-burn. The two low dots (12 and 20 August) are Landsat photos with part of the fire hidden, against a mostly Sentinel-2 blend; we treat them as limits of a single photo, not regrowth, and quote only full views.</Note></>,
  },
  islands: {
    kicker: "Weeks · the full scar",
    title: "Burned, but not everywhere",
    tags: ["reported", "derived"],
    body: (c) => { const s = og(c).std; return <>
      <p>The official perimeter encloses {area(s.perimeterKm2)} km² (575,163 acres). Inside it, the photos show <Num v={s.burned.km2} lo={s.burned.lo} hi={s.burned.hi} unit="km²" f={area} /> actually burned: <Num v={s.burned.share} lo={s.burned.shareLo} hi={s.burned.shareHi} /> of it. The rest are unburned islands the fire passed around.</p>
      <p>Outside the perimeter only {pct(s.controlFlaggedPct)}% of the land passes the same burn test. Most of the burned ground burned lightly: {pct(s.severity.low)}% at low severity, {pct(s.severity.high)}% at high.</p>
    </>; },
    evidence: (c) => { const s = og(c).std; return <><h3>Inside the official line</h3>
      <CompareBars label="Burned share inside and outside the perimeter" rows={[
        { name: "Inside perimeter", v: s.burned.share, lo: s.burned.shareLo, hi: s.burned.shareHi, kind: "fire" },
        { name: "Outside (2–10 km)", v: s.controlFlaggedPct, kind: "control" },
      ]} />
      <div className="severity" role="img" aria-label="Burn severity of the burned ground">
        {([["low", "Low"], ["moderate_low", "Mod.-low"], ["moderate_high", "Mod.-high"], ["high", "High"]] as const).map(([k, l]) => <span key={k} className={`sev-${k}`} style={{ flexGrow: s.severity[k] }} title={`${l}: ${pct(s.severity[k])}%`} />)}
      </div>
      <p className="key">Severity of burned ground: {pct(s.severity.low)}% low · {pct(s.severity.moderate_low)}% moderate-low · {pct(s.severity.moderate_high)}% moderate-high · {pct(s.severity.high)}% high</p>
      <Note>Burned = dNBR at least 0.10 (NASA HLS, medians of clear photos before and after). Severity classes after Key & Benson (USGS FIREMON).</Note></>; },
  },
  green: {
    kicker: "Weeks · two months later",
    title: "Green again?",
    tags: ["derived", "interpretation"],
    body: (c) => { const h = og(c).std.hv["20261020"]; return <>
      <p>By late October, autumn rain had greened the grass inside the scar. In the photos, much of the burn looks as if it is healing.</p>
      <p><b>Now switch to radar.</b> NISAR's cross-polarised echo (HV) comes mostly from the woody structure of shrubs. Where the fire burned hottest, on 20 October it was at <b>{h.hot.pct_of_pre}%</b> of its pre-fire strength. On unburned land outside, which dries out over the summer, it was at {h.control.pct_of_pre}%.</p>
      <p><Num v={h.hot["darker2.0"]} lo={h.hot["darker2.5"]} hi={h.hot["darker1.5"]} /> of the hottest-burned ground was more than 2 dB darker than before the fire (an echo about a third weaker). Outside the fire: {pct(h.control["darker2.0"])}% {range(h.control["darker2.5"], h.control["darker1.5"])}.</p>
      <Q>The photos see new grass. The radar sees that the shrubs are gone.</Q>
    </>; },
    evidence: (c) => <><h3>Shrub signal (HV) after the fire</h3>
      <HvChart d={og(c)} t={c.t} />
      <Note>NISAR L2 GCOV, calibrated γ⁰, track 114, as a share of each pixel's median over {og(c).std.preDates.map(fmtCompact).join(", ")}. "Burned hottest" = dNBR above 0.44.</Note></>,
  },
  meaning: {
    kicker: "Weeks · why it matters",
    title: "Looking healed is not the same as healed",
    tags: ["interpretation"],
    body: () => <>
      <p>Next door, the 2012 Long Draw fire (558,000 acres) faded from view within about three years. In Landsat it has never returned to its pre-fire brightness. That fits sagebrush being replaced by grass, which has not been verified.</p>
      <p>Radar measures structure, not colour, and sees it in any season and through smoke. It can follow that slower change long after the photos look green.</p>
    </>,
  },
};

// ---------------------------------------------------------------- Jazan
const jz = (c: Ctx) => c.sites.jazan as JazanData;
const jazanAlerts = EVENTS.jazan.filter((e) => e.kind === "reported").map((e) => ({ t: e.t, kind: /red alert/i.test(e.text) ? "red" : "warn" }));
const wetShare = (d: JazanData, key: string) => d.std.brightness[key];
/** the largest "wet" share on any dry-season pass (before the rains, 24 July), either track */
const dryMax = (d: JazanData) => Math.max(...Object.entries(d.std.brightness).filter(([k]) => k.slice(4) < "20260724").map(([, v]) => v["b2.0"]));
const JAZAN: Record<string, ChapterCopy> = {
  mountains: {
    kicker: "A season · Jazan, Saudi Arabia",
    title: "Where the storms come down",
    tags: ["measured", "reported"],
    body: (c) => { const d = jz(c); return <>
      <p>Behind the Jazan coastal plain, the Sarawat mountains rise to over {(Math.floor(d.terrain.detail.max / 100) * 100).toLocaleString("en-GB")} m. In summer, afternoon storms build over them and spill toward the Red Sea.</p>
      <p>NASA's IMERG rainfall estimate put 169 mm on the study area between June and mid-November, 53 mm of it in August. 12 August was the wettest day: 18.6 mm on average, 36 mm in the wettest cell.</p>
      <Q>Rain falls in hours. What does it leave on the ground, and can a satellite see that through the storm?</Q>
    </>; },
    evidence: (c) => <><h3>Rain on each day</h3><RainChart d={jz(c)} t={c.t} alerts={jazanAlerts} onPick={c.setTime} /><Note>NASA IMERG V07 (Late run), study-area mean. Diamonds: official alerts. On storm days the map shows rain every half hour.</Note></>,
  },
  wet: {
    kicker: "A season · after the storms",
    title: "Wet ground, through the cloud",
    tags: ["derived"],
    body: (c) => { const d = jz(c); const a = wetShare(d, "064_20260910"), b = wetShare(d, "071_20260911"); return <>
      <p>Soaked soil sends back a stronger radar echo. NISAR's pass at 18:39 on 10 September found <Num v={a["b2.0"]} lo={a["b2.5"]} hi={a["b1.5"]} /> of the coastal plain more than 2 dB brighter than in the dry season (an echo over half as strong again), on ground the photos show was not green. On the 05:39 pass the next morning: <Num v={b["b2.0"]} lo={b["b2.5"]} hi={b["b1.5"]} />.</p>
      <p>In the dry season, the same test flags {pct(dryMax(d))}% of the plain or less.</p>
      <Note>Blue: brighter than the dry season. Orange: darker (smooth wet mud, standing water or bare ploughed land). Use the pass switch to compare dusk and dawn.</Note>
    </>; },
    evidence: (c) => { const d = jz(c); const a = wetShare(d, "064_20260910"), b = wetShare(d, "071_20260911"), dry = wetShare(d, "064_20260630"); return <><h3>Wet ground on the coastal plain</h3>
      <CompareBars label="Share of the coastal plain more than 2 dB brighter than in the dry season" rows={[
        { name: "Dusk, 10 Sep", v: a["b2.0"], lo: a["b2.5"], hi: a["b1.5"], kind: "dusk" },
        { name: "Dawn, 11 Sep", v: b["b2.0"], lo: b["b2.5"], hi: b["b1.5"], kind: "dawn" },
        { name: "Dry season", v: dry["b2.0"], kind: "control" },
      ]} />
      <Note>NISAR L2 GCOV, calibrated HH, against each track's dry-season median. Drawn only where photos show no green, because growing plants brighten radar too.</Note></>; },
  },
  duskdawn: {
    kicker: "A season · two passes",
    title: "Dusk and dawn disagree",
    tags: ["derived", "measured", "interpretation"],
    body: (c) => { const a = jz(c).std.avg; return <>
      <p>NISAR crosses Jazan twice in each 12-day cycle: at 18:39 heading south (dusk) and at 05:39 heading north (dawn). Over the same rainy-season windows, the dusk pass shows <Num v={a.dusk} lo={a.duskLo} hi={a.duskHi} /> of the plain changed on average. The dawn pass: <Num v={a.dawn} lo={a.dawnLo} hi={a.dawnHi} />. In the dry June–July pairs, about 1% and 4.5%.</p>
      <p>Rain had fallen on more than 5% of the area in the hours before 5 of the 8 rainy-season dusk passes. Before the dawn passes it never had.</p>
      <Q>The dusk pass catches each storm's fresh footprint; the dawn pass shows what lasts. Afternoon wind moving the crops is another possible cause, and the two passes look at the ground from opposite sides, which can change what they see.</Q>
    </>; },
    evidence: (c) => <><h3>Ground changed between 12-day passes</h3><DuskDawnChart d={jz(c)} t={c.t} pass={c.pass} /><Note>Rule: coherence at least 0.20 below the best dry-season pair on the same track. Small dots are 24-day pairs, left out of the averages.</Note></>,
  },
  wave: {
    kicker: "A season · August to November",
    title: "The coast greens last",
    tags: ["derived", "reported"],
    body: (c) => { const d = jz(c), g = d.std.green, up = g.bands["0.15"].median_upday, day = (iso: string) => fmtIso(iso); return <>
      <p>Then the plain turns green. Per-pixel dates from {d.hls.length} clear NASA HLS photos show land between 100 and 250 m greening around {day(up["100-250"])}, and the low coast below 100 m only around {day(up["0-100"])}.</p>
      <p>By 1 November, <Num v={g.km2} lo={g.lo} hi={g.hi} unit="km²" f={area} /> of the plain was newly green: <Num v={g.pct} lo={g.pctLo} hi={g.pctHi} /> of it.</p>
      <Note>Most of it is likely rain-fed farmland plus wild plants on the wadi fans. Sorghum, pearl millet and sesame are the region's main rain-fed crops (<Src href="https://saudiarabia.un.org/en/node/284255">UN in Saudi Arabia</Src>); crop type is not measured here.</Note>
    </>; },
    evidence: (c) => <><h3>Newly green coastal plain</h3><GreenChart d={jz(c)} t={c.t} /><Note>Green: first clear photo with vegetation index above 0.30 and 0.15 above its June level, staying green. Tan: green earlier, then dried or harvested. White flash: the date it first appears.</Note></>,
  },
  foretold: {
    kicker: "A season · radar and photos together",
    title: "Where the radar kept seeing change",
    tags: ["derived", "interpretation"],
    body: (c) => { const x = jz(c).std.xcheck; return <>
      <p>This map shows how often the dawn radar saw the ground change through the rains. Each window is the 12 days between two passes, and there are six of them. Of the plain it flagged in at least 3 of 6 windows, <Num v={x.flagged} lo={x.flaggedLo} hi={x.flaggedHi} /> was clearly green by November. Of the rest, <Num v={x.not} lo={x.notLo} hi={x.notHi} />.</p>
      <p>Flagged ground was {Math.min(...x.ratios).toFixed(1)}–{Math.max(...x.ratios).toFixed(1)} times as likely to be green, at every combination of thresholds.</p>
      <Q>Radar knows nothing about plants, yet it kept seeing change in the places that turned green. Some of that change may be the crops themselves growing.</Q>
      <Note>This is a match in place, not in time. The test does not show that the radar saw the change before the plants came up, so it is not a forecast.</Note>
    </>; },
    evidence: (c) => { const x = jz(c).std.xcheck; return <><h3>Green by November</h3>
      <CompareBars label="Share of the plain green by November" rows={[
        { name: "Radar flagged ≥3×", v: x.flagged, lo: x.flaggedLo, hi: x.flaggedHi, kind: "green" },
        { name: "Rest of the plain", v: x.not, lo: x.notLo, hi: x.notHi, kind: "control" },
      ]} />
      <Note>Brighter blue on the map: ground that changed in more rainy-season windows. The figures above are for the dawn pass (25 Jul – 17 Oct); the map follows the pass switch.</Note></>; },
  },
  meaning: {
    kicker: "A season · why it matters",
    title: "Water in the dam, warning on the plain",
    tags: ["derived", "interpretation"],
    body: () => <>
      <p>Near the Jizan Dam, 8 of 9 clear June photos showed less than 0.6 km² of open water. On 19 October and 4 November there was about 2.5 km².</p>
      <p>Jazan's farmers and Civil Defense watch these same storms. A radar that sees wet ground at night and through cloud, and keeps track of where the land is changing through the season, could support flood warnings and crop monitoring. Whether it can give warning before the green appears is a test still to be done.</p>
      <Note>The NISAR products used here are provisional, and the rain is IMERG's near-real-time Late run; both will be replaced by final versions.</Note>
    </>,
  },
};

export const COPY: Record<SiteId, Record<string, ChapterCopy>> = { nepal: NEPAL, oregon: OREGON, jazan: JAZAN };

/** Legends for each map layer, in plain words. */
export const LAYER_INFO: Record<SiteId, Record<string, { name: string; legend: [string, string][]; src: string }>> = {
  nepal: {
    photo: { name: "Photo", src: "NASA HLS: cloud-free blend of May–Aug photos, then 1 Oct, then an October blend", legend: [["#e8f4ff", "Estimated surge front"], ["#2a78d6", "Flood water on the stripped ground (estimated timing)"]] },
    radar: { name: "Radar change", src: "NISAR L2 GUNW coherence, track 98, one 12-day pair at a time", legend: [["#e8e8e8", "Unchanged (high coherence)"], ["#3a3a3a", "Low coherence"], ["#ff5c8a", "Changed: at least 0.20 below the pre-flood baseline"]] },
    scar: { name: "Stripped ground", src: "NASA HLS, October vs May–Aug", legend: [["#4fb7b0", "Plants lost or new open water"]] },
    before: { name: "Before", src: "NASA HLS cloud-free blend of May–Aug photos", legend: [] },
  },
  oregon: {
    tc: { name: "True colour", src: "NASA HLS 30 m", legend: [["#ffc23d", "Fire front (estimated within each day)"], ["#c2370f", "Burned in the last day"], ["#5a2a1e", "Burned ground (tinted photo)"]] },    fc: { name: "False colour", src: "NASA HLS: short-wave infrared, near-infrared, red", legend: [["#c43b3b", "Fresh burn"], ["#4caf50", "Live plants"]] },
    rad: { name: "Radar", src: "NISAR L2 GCOV, calibrated, same dB scale every date", legend: [["#9ad47a", "HV: shrub and woody structure"], ["#d68ad6", "HH: bare ground"]] },
  },
  jazan: {
    season: { name: "Season", src: "Rain: IMERG · wet ground: NISAR · green and water: NASA HLS", legend: [["#f0c8ff", "Rain falling"], ["#2a9fd8", "Wet ground seen by radar"], ["#3fcf78", "Newly green since June"], ["#22593f", "Already green in June"], ["#b5803a", "Dried or harvested"], ["#3046d8", "Open water"]] },
    wet: { name: "Wet ground", src: "NISAR L2 GCOV HH vs the dry season", legend: [["#3887e5", "Brighter: wetter ground or growing crops"], ["#eb7333", "Darker: smooth mud, water or ploughed land"]] },
    change: { name: "Radar change", src: "NISAR L2 GUNW coherence, 12-day pairs", legend: [["#b8e6ff", "Ground changed between two passes"], ["#5a6168", "Unchanged"]] },
    photo: { name: "Photo", src: "NASA HLS (Landsat + Sentinel-2), blending between clear dates", legend: [] },
    freq: { name: "How often", src: "NISAR GUNW coherence, the pass chosen above", legend: [["#c0e8ff", "Changed in many windows"], ["#26508a", "Changed in a few"]] },
  },
};

export const fmtPairLabel = (d: NepalData, t: number) => {
  const R = d.radar;
  let i = 0;
  while (i < R.length - 1 && t >= NISAR_PASS_NEPAL(R[i + 1].d2)) i++;
  return `${fmtCompact(R[i].d1)} → ${fmtCompact(R[i].d2)}`;
};
export const JAZAN_RAIN_DAY = (d: JazanData, t: number) => d.rain.find((r) => Math.abs(isoDay(r.date) - 3 * HOUR + 12 * HOUR - t) < 12 * HOUR) ?? null;
export { DAY, range };
