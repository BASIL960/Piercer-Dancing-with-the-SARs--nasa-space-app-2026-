import * as THREE from "three";
import { DAY, HOUR, siteUrl, type JazanData, type NepalData, type OregonData, type SiteData, type SiteId } from "../data";
import { JAZAN_T0, NEPAL_T0, NISAR_PASS_NEPAL, OREGON_T0, PLACES, type ChapterDef } from "../story";
import { localFrame, toVec } from "./geo";
import { contextFrag, FIRE_FRAG, FLOOD_FRAG, JAZAN_FRAG, TERRAIN_VERT } from "./shaders";
import { Ground, terrainGeometry, type Heights } from "./terrain";
import type { Textures } from "./textures";
import { utmToLatLon } from "./utm";

export interface Frame {
  dt: number;
  time: number;          // seconds since start, for gentle motion
  t: number;             // story time, UTC ms
  dist: number;          // camera distance to its target, Earth radii
  near: number;          // 0..1, how much this site is the focus of the view
  active: boolean;       // the visitor is reading this place
  layer: string;
  chapter: ChapterDef | null;
  pass: "dusk" | "dawn";
  rain: boolean;
  reduced: boolean;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** One study site: regional terrain with its photo, and the detailed evidence layer on top. */
export abstract class SiteScene {
  readonly group = new THREE.Group();
  readonly origin: THREE.Vector3;
  readonly ground: Ground;
  readonly center: [number, number];
  protected ctxMat: THREE.ShaderMaterial;
  protected detMat!: THREE.ShaderMaterial;
  protected ctxMesh: THREE.Mesh;
  protected detMesh!: THREE.Mesh;
  /** current vertical exaggeration, rising from flat as the camera comes down */
  exagNow = 0;
  protected common: Record<string, THREE.IUniform>;
  protected visibleNow = false;

  constructor(readonly data: SiteData, protected tex: Textures, heights: { coarse: Heights; fine: Heights }) {
    const d = data.detail;
    this.center = utmToLatLon(d.x0 + (d.W * d.res) / 2, d.y0 - (d.H * d.res) / 2, data.utm.zone, data.utm.south);
    this.origin = toVec(this.center[0], this.center[1]);
    this.ground = new Ground(data.utm.zone, data.utm.south, heights.coarse, heights.fine);
    // a cartographer's light: from the north-west, 40° above the horizon
    const f = localFrame(this.center[0], this.center[1]);
    const light = f.up.clone().multiplyScalar(Math.sin(0.7)).addScaledVector(f.north.clone().add(f.east.clone().negate()).normalize(), Math.cos(0.7)).normalize();
    this.common = {
      uOrigin: { value: this.origin }, uExag: { value: 0 }, uLight: { value: light }, uRelief: { value: 0 }, uOpacity: { value: 0 },
    };
    const c = data.context;
    const hole = new THREE.Vector4((d.x0 - c.x0) / (c.W * c.res), (c.y0 - d.y0) / (c.H * c.res), (d.W * d.res) / (c.W * c.res), (d.H * d.res) / (c.H * c.res));
    const ctxTex = tex.get(siteUrl(data.id, "context.webp")) ?? tex.blank;
    this.ctxMat = new THREE.ShaderMaterial({
      vertexShader: TERRAIN_VERT, fragmentShader: contextFrag(data.id === "jazan"),
      transparent: true, depthWrite: true, depthTest: true,
      uniforms: { ...this.common, tCtx: { value: ctxTex }, uHole: { value: hole }, uDim: { value: 1 }, ...(data.id === "jazan" ? this.rainUniforms() : {}) },
    });
    const ct = heights.coarse;
    this.ctxMesh = new THREE.Mesh(terrainGeometry(c, data.utm, ct, Math.min(ct.w, 300), Math.min(ct.h, 300), this.origin), this.ctxMat);
    this.ctxMesh.renderOrder = 10;
    this.ctxMesh.frustumCulled = false;
    this.group.add(this.ctxMesh);
    this.group.position.copy(this.origin);
    void tex.load(siteUrl(data.id, "context.webp"), { pinned: true }).then((t) => { this.ctxMat.uniforms.tCtx.value = t; });
  }

  protected rainUniforms(): Record<string, THREE.IUniform> { return {}; }

  /** Builds the detailed layer once its material is ready. */
  protected addDetail(fine: Heights, frag: string, uniforms: Record<string, THREE.IUniform>) {
    this.detMat = new THREE.ShaderMaterial({
      vertexShader: TERRAIN_VERT, fragmentShader: frag,
      transparent: true, depthWrite: true, depthTest: true,
      uniforms: { ...this.common, ...uniforms },
    });
    const segX = Math.min(fine.w, 520), segY = Math.round((segX * fine.h) / fine.w);
    this.detMesh = new THREE.Mesh(terrainGeometry(this.data.detail, this.data.utm, fine, segX, segY, this.origin, 350), this.detMat);
    this.detMesh.renderOrder = 11;
    this.detMesh.frustumCulled = false;
    this.group.add(this.detMesh);
  }

  /** Common per-frame work; returns false when the site is not drawn this frame. */
  update(f: Frame): boolean {
    const exag = PLACES[this.data.id].exag;
    const opacity = f.near * smooth(0.6, 0.28, f.dist);
    const detail = f.near * smooth(0.3, 0.13, f.dist);
    const targetExag = exag * smooth(0.26, 0.07, f.dist) * f.near;
    this.exagNow = targetExag;
    this.common.uExag.value = targetExag;
    this.common.uRelief.value = smooth(0.3, 0.08, f.dist);
    this.ctxMat.uniforms.uOpacity.value = opacity;
    this.detMat.uniforms.uOpacity.value = detail;
    this.ctxMesh.visible = opacity > 0.003;
    this.detMesh.visible = detail > 0.003;
    this.ctxMat.uniforms.uDim.value = lerp(0.35, 1, smooth(0.2, 0.06, f.dist)) * (f.active ? 1 : 0.6);
    this.visibleNow = this.ctxMesh.visible;
    return this.detMesh.visible;
  }
  /** Ground height (metres) times the current exaggeration. */
  liftAt(lat: number, lon: number) { return this.ground.at(lat, lon) * this.exagNow; }
  abstract preload(): void;
}

// ---------------------------------------------------------------- Big Grass Fire
type FireSet = "tc" | "fc" | "rad";
const OREGON_AFTER: Record<FireSet, { pre: string; after: [string, number][] }> = {
  tc: { pre: "tc_pre.webp", after: [["tc_post.webp", Date.UTC(2026, 7, 30)], ["tc_sep17.webp", Date.UTC(2026, 8, 17)], ["tc_oct07.webp", Date.UTC(2026, 9, 7)], ["tc_oct24.webp", Date.UTC(2026, 9, 24)]] },
  fc: { pre: "fc_pre.webp", after: [["fc_post.webp", Date.UTC(2026, 7, 30)], ["fc_sep17.webp", Date.UTC(2026, 8, 17)], ["fc_oct07.webp", Date.UTC(2026, 9, 7)], ["fc_oct24.webp", Date.UTC(2026, 9, 24)]] },
  rad: { pre: "radar_2026-07-16.webp", after: [["radar_2026-08-21.webp", Date.UTC(2026, 7, 21)], ["radar_2026-09-26.webp", Date.UTC(2026, 8, 26)], ["radar_2026-10-20.webp", Date.UTC(2026, 9, 20)]] },
};
export class FireScene extends SiteScene {
  private sets: [FireSet, FireSet] = ["tc", "tc"];
  private setMix = 1;
  private fire = 1; private tint = 1;
  constructor(data: OregonData, tex: Textures, h: { coarse: Heights; fine: Heights }) {
    super(data, tex, h);
    const b = tex.blank;
    this.addDetail(h.fine, FIRE_FRAG, {
      tPre0: { value: b }, tA0: { value: b }, tB0: { value: b }, tPre1: { value: b }, tA1: { value: b }, tB1: { value: b }, tArr: { value: b },
      uMix0: { value: 0 }, uMix1: { value: 0 }, uSet: { value: 1 }, uRad0: { value: 0 }, uRad1: { value: 0 },
      uT: { value: 0 }, uTint: { value: 1 }, uFire: { value: 1 }, uPerim: { value: 0 },
      uPx: { value: new THREE.Vector2(1 / data.detail.W, 1 / data.detail.H) },
    });
  }
  private url(f: string) { return siteUrl("oregon", f); }
  /** The fire timing and the true-colour set first; other sets load when a chapter offers them. */
  preload(sets: FireSet[] = ["tc"]) {
    void this.tex.load(this.url("arrival.png"), { data: true, pinned: true });
    for (const s of sets) { void this.tex.load(this.url(OREGON_AFTER[s].pre)); for (const [a] of OREGON_AFTER[s].after) void this.tex.load(this.url(a)); }
  }
  private bind(k: 0 | 1, set: FireSet, t: number) {
    const u = this.detMat.uniforms, S = OREGON_AFTER[set], at = S.after;
    let i = 0;
    while (i < at.length - 1 && t > at[i + 1][1]) i++;
    const j = Math.min(i + 1, at.length - 1);
    const m = j === i ? 0 : clamp((t - at[i][1]) / (at[j][1] - at[i][1]), 0, 1);
    const g = (f: string) => this.tex.get(this.url(f));
    const pre = g(S.pre), a0 = g(at[i][0]), a1 = g(at[j][0]);
    u[`tPre${k}`].value = pre ?? this.tex.blank;
    u[`tA${k}`].value = a0 ?? pre ?? this.tex.blank;
    u[`tB${k}`].value = a1 ?? a0 ?? pre ?? this.tex.blank;
    u[`uMix${k}`].value = a1 ? m : 0;
    u[`uRad${k}`].value = set === "rad" ? 1 : 0;
    return !!pre;
  }
  update(f: Frame) {
    if (!super.update(f)) return false;
    const u = this.detMat.uniforms;
    const want = (["tc", "fc", "rad"].includes(f.layer) ? f.layer : "tc") as FireSet;
    if (want !== this.sets[1]) { this.sets = [this.sets[1], want]; this.setMix = 0; }
    // warm the sets this chapter offers, so a layer switch is a cross-fade rather than a wait
    if (f.chapter?.layers && this.tex.frame % 30 === 0) this.preload(f.chapter.layers.filter((l) => l in OREGON_AFTER) as FireSet[]);
    this.setMix = Math.min(1, this.setMix + f.dt / (f.reduced ? 0.01 : 0.7));
    const ready1 = this.bind(1, this.sets[1], f.t);
    this.bind(0, this.sets[0], f.t);
    // hold the old imagery until the new set has arrived
    u.uSet.value = ready1 ? smooth(0, 1, this.setMix) : 0;
    u.tArr.value = this.tex.get(this.url("arrival.png"), { data: true }) ?? this.tex.blank;
    u.uT.value = (f.t - OREGON_T0) / HOUR;
    const k = 1 - Math.exp(-f.dt * 4);
    this.fire = lerp(this.fire, f.chapter?.fx?.fire ?? 1, k);
    this.tint = lerp(this.tint, f.chapter?.fx?.tint ?? 1, k);
    u.uFire.value = this.fire; u.uTint.value = this.tint;
    return true;
  }
}

// ---------------------------------------------------------------- Bhote Koshi flood
export class FloodScene extends SiteScene {
  private radMix = 0; private surge = 1; private scar = 0; private veil = 0;
  private photo = { a: "opt_pre.webp", b: "opt_pre.webp", mix: 1 };
  constructor(readonly flood: NepalData, tex: Textures, h: { coarse: Heights; fine: Heights }) {
    super(flood, tex, h);
    const b = tex.blank;
    this.addDetail(h.fine, FLOOD_FRAG, {
      tPhotoA: { value: b }, tPhotoB: { value: b }, tRad: { value: b }, tArr: { value: b },
      uPhotoMix: { value: 1 }, uRadMix: { value: 0 }, uT: { value: -1e6 }, uSurge: { value: 1 }, uScar: { value: 0 }, uVeil: { value: 0 }, uTime: { value: 0 },
      uPx: { value: new THREE.Vector2(1 / flood.detail.W, 1 / flood.detail.H) },
    });
  }
  private url(f: string) { return siteUrl("nepal", f); }
  preload() {
    void this.tex.load(this.url("arrival.png"), { data: true, pinned: true });
    for (const f of ["opt_pre.webp", "opt_post.webp", "opt_oct01.webp"]) void this.tex.load(this.url(f));
    for (const r of this.flood.radar) void this.tex.load(this.url(r.img));
  }
  /** The radar pair whose second pass most recently happened. */
  radarAt(t: number) {
    const R = this.flood.radar;
    let i = 0;
    while (i < R.length - 1 && t >= NISAR_PASS_NEPAL(R[i + 1].d2)) i++;
    return R[i];
  }
  /** Photos: the cloud-free May–Aug blend before; none clear from the flood until 1 Oct; then 1 Oct; then the October blend. */
  photoAt(t: number, layer: string) {
    if (layer === "before") return { img: "opt_pre.webp", veil: 0 };
    const flood = NEPAL_T0, oct1 = Date.UTC(2026, 9, 1, 5), oct23 = Date.UTC(2026, 9, 23, 5);
    if (t < flood) return { img: "opt_pre.webp", veil: 0 };
    if (t < oct1) return { img: "opt_pre.webp", veil: smooth(flood + 2 * HOUR, flood + 1.5 * DAY, t) };
    if (t < oct23) return { img: "opt_oct01.webp", veil: 0 };
    return { img: "opt_post.webp", veil: 0 };
  }
  update(f: Frame) {
    if (!super.update(f)) return false;
    const u = this.detMat.uniforms;
    const layer = f.layer;
    const p = this.photoAt(f.t, layer);
    if (p.img !== this.photo.b) {
      const ready = this.tex.get(this.url(p.img));
      if (ready) this.photo = { a: this.photo.b, b: p.img, mix: 0 };
    }
    this.photo.mix = Math.min(1, this.photo.mix + f.dt / (f.reduced ? 0.01 : 0.9));
    u.tPhotoA.value = this.tex.get(this.url(this.photo.a)) ?? this.tex.blank;
    u.tPhotoB.value = this.tex.get(this.url(this.photo.b)) ?? u.tPhotoA.value;
    u.uPhotoMix.value = this.photo.mix;
    u.tRad.value = this.tex.get(this.url(this.radarAt(f.t).img)) ?? this.tex.blank;
    u.tArr.value = this.tex.get(this.url("arrival.png"), { data: true }) ?? this.tex.blank;
    u.uT.value = (f.t - NEPAL_T0) / 60000;
    u.uTime.value = f.time;
    const k = 1 - Math.exp(-f.dt * 4);
    this.radMix = lerp(this.radMix, layer === "radar" && u.tRad.value !== this.tex.blank ? 1 : 0, k);
    this.surge = lerp(this.surge, layer === "photo" ? 1 : 0, k);
    this.scar = lerp(this.scar, layer === "scar" ? 1 : 0, k);
    const veilOn = layer === "photo" || layer === "scar";
    this.veil = lerp(this.veil, veilOn ? p.veil : 0, k);
    u.uRadMix.value = this.radMix; u.uSurge.value = this.surge; u.uScar.value = this.scar; u.uVeil.value = this.veil;
    return true;
  }
}

// ---------------------------------------------------------------- Jazan rainy season
const MODES: Record<string, number> = { change: 0, wet: 1, photo: 2, season: 3, freq: 4 };
interface SeqItem { s: number; img: string }
export class RainScene extends SiteScene {
  private seq: Record<string, SeqItem[]> = {};
  private rainSeq: { s: number; key: string; grid: number[][]; perDay: boolean }[] = [];
  private rainTex = new Map<string, THREE.DataTexture>();
  private modes = [3, 3]; private modeMix = 1; private rainOn = 1;
  // set from the base constructor (rainUniforms), so it must not be re-initialised as a class field
  private declare rainU: Record<string, THREE.IUniform>;
  constructor(readonly rain: JazanData, tex: Textures, h: { coarse: Heights; fine: Heights }) {
    super(rain, tex, h);
    const b = tex.blank;
    this.addDetail(h.fine, JAZAN_FRAG, {
      tBase: { value: b }, tC0: { value: b }, tC1: { value: b }, tG0: { value: b }, tG1: { value: b }, tP0: { value: b }, tP1: { value: b },
      tSA: { value: b }, tSB: { value: b }, tPJune: { value: b }, tFreq: { value: b },
      uModeA: { value: 3 }, uModeB: { value: 3 }, uModeMix: { value: 1 }, uHasC: { value: 0 }, uMixC: { value: 1 }, uHasG: { value: 0 }, uMixG: { value: 1 },
      uMixP: { value: 0 }, uT: { value: 0 }, uPhotoH: { value: 10.5 / 24 },
      uPx: { value: new THREE.Vector2(1 / rain.detail.W, 1 / rain.detail.H) },
      ...this.rainU,
    });
    const day = (iso: string, h = 0, m = 0) => (Date.parse(`${iso}T00:00:00Z`) - 3 * HOUR + (h * 60 + m) * 60000 - JAZAN_T0) / DAY;
    const passT = (iso: string, when: "dusk" | "dawn") => day(iso, when === "dusk" ? 18 : 5, 39);
    for (const p of ["dusk", "dawn"] as const) {
      this.seq[`coh_${p}`] = rain.coh.filter((c) => c.when === p).map((c) => ({ s: passT(c.d2, p), img: c.img }));
      this.seq[`bsc_${p}`] = rain.gcov.filter((c) => c.when === p).map((c) => ({ s: passT(c.date, p), img: c.img }));
    }
    this.seq.opt = rain.hls.map((h) => ({ s: day(h.date) + 10.5 / 24, img: h.img }));
    for (const r of rain.rain) {
      const hh = rain.hh[r.date];
      if (hh) hh.forEach((g, k) => this.rainSeq.push({ s: day(r.date) + (3 + k * 0.5 + 0.25) / 24, key: `${r.date}_${k}`, grid: g, perDay: false }));
      else this.rainSeq.push({ s: day(r.date) + 15 / 24, key: r.date, grid: r.grid, perDay: true });
    }
  }
  protected rainUniforms() {
    const g = (this.data as JazanData).rainGrid;
    this.rainU = {
      tR0: { value: this.tex.blank }, tR1: { value: this.tex.blank }, uRainMix: { value: 0 }, uRain: { value: 0 },
      uRainBox: { value: new THREE.Vector4(g.lonMin, g.latMax, g.cols * g.cell, g.rows * g.cell) },
    };
    return this.rainU;
  }
  private url(f: string) { return siteUrl("jazan", f); }
  preload() {
    for (const f of ["season_a.png", "season_b.png"]) void this.tex.load(this.url(f), { data: true, pinned: true });
    for (const f of ["radar/radar_base.jpg", "hls/hls_2026-06-21.webp", "radar/freq_dawn.jpg", "radar/freq_dusk.jpg"]) void this.tex.load(this.url(f), { pinned: true });
    for (const s of Object.values(this.seq)) for (const it of s) void this.tex.load(this.url(it.img));
  }
  private at(seq: SeqItem[], tt: number, xf = 1) {
    let k = -1;
    for (let i = 0; i < seq.length; i++) if (seq[i].s <= tt) k = i; else break;
    if (k < 0) return null;
    const cur = seq[k], prev = seq[k - 1] ?? cur;
    return { a: prev, b: cur, m: k === 0 ? 1 : Math.min(1, (tt - cur.s) / Math.min(xf, cur.s - prev.s)) };
  }
  private rainTexOf(key: string, grid: number[][], perDay: boolean) {
    let t = this.rainTex.get(key);
    if (t) return t;
    const H = grid.length, W = grid[0].length, a = new Uint8Array(W * H);
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const u = Math.max(0, grid[r][c] || 0) / (perDay ? 40 : 20);
      a[r * W + c] = Math.min(255, Math.round(Math.sqrt(Math.min(1, u)) * 255));
    }
    t = new THREE.DataTexture(a, W, H, THREE.RedFormat, THREE.UnsignedByteType);
    t.magFilter = t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    if (this.rainTex.size > 400) { const first = this.rainTex.keys().next().value!; this.rainTex.get(first)!.dispose(); this.rainTex.delete(first); }
    this.rainTex.set(key, t);
    return t;
  }
  /** Bind a radar sequence pair, preloading the next frame. Returns [tex0, tex1, mix, has]. */
  private bindSeq(seq: SeqItem[], tt: number): [THREE.Texture, THREE.Texture, number, number] {
    const f = this.at(seq, tt);
    const i = f ? seq.indexOf(f.b) : -1;
    if (seq[i + 1]) this.tex.get(this.url(seq[i + 1].img));
    if (!f) return [this.tex.blank, this.tex.blank, 1, 0];
    const ta = this.tex.get(this.url(f.a.img)), tb = this.tex.get(this.url(f.b.img));
    if (tb) return [ta ?? tb, tb, ta ? f.m : 1, 1];
    if (ta) return [ta, ta, 1, 1];
    return [this.tex.blank, this.tex.blank, 1, 0];
  }
  update(f: Frame) {
    const shown = super.update(f);
    const tt = (f.t - JAZAN_T0) / DAY;
    // rain is drawn on the regional terrain too, so it runs whenever the place is in view
    const k = 1 - Math.exp(-f.dt * 4);
    this.rainOn = lerp(this.rainOn, f.rain && f.active ? 1 : 0, k);
    this.rainU.uRain.value = this.rainOn;
    if (this.rainOn > 0.002) {
      const R = this.rainSeq;
      let i = 0;
      while (i < R.length - 1 && R[i + 1].s <= tt) i++;
      const a = R[i], b = R[Math.min(i + 1, R.length - 1)];
      this.rainU.tR0.value = this.rainTexOf(a.key, a.grid, a.perDay);
      this.rainU.tR1.value = this.rainTexOf(b.key, b.grid, b.perDay);
      this.rainU.uRainMix.value = b === a ? 0 : clamp((tt - a.s) / (b.s - a.s), 0, 1);
    }
    if (!shown) return false;
    const u = this.detMat.uniforms;
    const want = MODES[f.layer] ?? 3;
    if (want !== this.modes[1]) { this.modes = [this.modes[1], want]; this.modeMix = 0; }
    this.modeMix = Math.min(1, this.modeMix + f.dt / (f.reduced ? 0.01 : 0.7));
    u.uModeA.value = this.modes[0]; u.uModeB.value = this.modes[1]; u.uModeMix.value = smooth(0, 1, this.modeMix);
    const uses = (m: number) => this.modes.includes(m) && (m === this.modes[1] || this.modeMix < 1);
    const g = (p: string, data = false) => this.tex.get(this.url(p), { data }) ?? this.tex.blank;
    u.tBase.value = g("radar/radar_base.jpg");
    if (uses(0)) { const [a, b, m, h] = this.bindSeq(this.seq[`coh_${f.pass}`], tt); u.tC0.value = a; u.tC1.value = b; u.uMixC.value = m; u.uHasC.value = h; }
    if (uses(1) || uses(3)) { const [a, b, m, h] = this.bindSeq(this.seq[`bsc_${f.pass}`], tt); u.tG0.value = a; u.tG1.value = b; u.uMixG.value = m; u.uHasG.value = h; }
    if (uses(2)) {
      const fr = this.at(this.seq.opt, tt) ?? { a: this.seq.opt[0], b: this.seq.opt[0], m: 1 };
      const ta = this.tex.get(this.url(fr.a.img)), tb = this.tex.get(this.url(fr.b.img));
      u.tP0.value = ta ?? tb ?? g("hls/hls_2026-06-21.webp"); u.tP1.value = tb ?? u.tP0.value; u.uMixP.value = tb ? fr.m : 0;
      const i = this.seq.opt.indexOf(fr.b);
      for (let n = 1; n <= 3; n++) if (this.seq.opt[i + n]) this.tex.get(this.url(this.seq.opt[i + n].img));
    }
    if (uses(3)) { u.tSA.value = g("season_a.png", true); u.tSB.value = g("season_b.png", true); u.tPJune.value = g("hls/hls_2026-06-21.webp"); }
    if (uses(4)) u.tFreq.value = g(`radar/freq_${f.pass}.jpg`);
    u.uT.value = tt;
    return true;
  }
  /** The study-area rain for the day containing tt, for the readout. */
  rainOfDay(t: number) {
    const d = new Date(t + 3 * HOUR).toISOString().slice(0, 10);
    return this.rain.rain.find((r) => r.date === d) ?? null;
  }
}

export function makeScene(id: SiteId, data: SiteData, tex: Textures, h: { coarse: Heights; fine: Heights }): SiteScene {
  if (id === "oregon") return new FireScene(data as OregonData, tex, h);
  if (id === "nepal") return new FloodScene(data as NepalData, tex, h);
  return new RainScene(data as JazanData, tex, h);
}
