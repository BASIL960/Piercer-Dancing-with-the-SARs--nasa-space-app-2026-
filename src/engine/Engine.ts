import * as THREE from "three";
import { dataUrl, loadTerrain, SITE_IDS, type NepalData, type SiteId, type Sites } from "../data";
import { currentChapter, useStore } from "../store";
import { NEPAL_T0, PLACES, type ViewSpec } from "../story";
import { DEG, localFrame, patchGeometry, toLatLon, toVec } from "./geo";
import { ATMOSPHERE_FRAG, ATMOSPHERE_VERT, CLOUD_FRAG, GLOBE_FRAG, STAR_FRAG, STAR_VERT, WORLD_VERT } from "./shaders";
import { makeScene, type SiteScene } from "./sites";
import type { Heights } from "./terrain";
import { Textures } from "./textures";

/** Where the camera looks and from how far. `dist` is in Earth radii from the target point. */
export interface View { lat: number; lon: number; dist: number; tilt: number; heading: number; sx: number; sy: number }

const R_KM = 6371;
const FOV = 36;
const INTRO: View = { lat: 18, lon: 30, dist: 4.4, tilt: 0, heading: 0, sx: 0.2, sy: 0 };
const FINALE: View = { lat: 22, lon: 48, dist: 2.5, tilt: 0, heading: 0, sx: -0.32, sy: 0.02 };
const SUN = toVec(20, 60).normalize();

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrap = (a: number) => { let d = a % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
const angDist = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => toVec(a.lat, a.lon).angleTo(toVec(b.lat, b.lon));

interface Flight { from: View; to: View; t: number; dur: number; arc: number; lowEnds: boolean }

export class Engine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.001, 400);
  private tex: Textures;
  readonly scenes = {} as Record<SiteId, SiteScene>;
  private globe!: THREE.Mesh;
  private glow!: THREE.Mesh;
  private stars!: THREE.Points;
  private clouds!: THREE.Mesh;
  private view: View = { ...INTRO };
  private goal: View = { ...INTRO };
  private flight: Flight | null = null;
  private prev = { phase: "", siteId: "", chapter: -1, nonce: -1 };
  private listeners = new Set<() => void>();
  private raf = 0;
  private last = 0;
  private time = 0;
  private size = { w: 1, h: 1 };
  private pointers = new Map<number, { x: number; y: number }>();
  private drag = { mode: "" as "" | "pan" | "orbit", moved: 0, pinch: 0 };
  private pointer = { x: 0, y: 0 };
  private targetLift = 0;
  private disposed = false;
  private hubSpin = 0;

  constructor(private canvas: HTMLCanvasElement, private sites: Sites) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, depth: true, stencil: false, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x05081a, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.sortObjects = true;
    this.tex = new Textures(Math.min(8, this.renderer.capabilities.getMaxAnisotropy()));
    this.buildStatic();
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
    canvas.addEventListener("pointerleave", this.onLeave);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  // ---------------------------------------------------------------- scene
  private buildStatic() {
    const n = 2200, pos = new Float32Array(n * 3), size = new Float32Array(n);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      pos.set([r * Math.cos(a) * 120, u * 120, r * Math.sin(a) * 120], i * 3);
      size[i] = 0.5 + rnd() * rnd() * 2.2;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    sg.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    this.stars = new THREE.Points(sg, new THREE.ShaderMaterial({ vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthTest: false, depthWrite: false, uniforms: { uOpacity: { value: 1 } } }));
    this.stars.renderOrder = 0; this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(1.07, 96, 48),
      new THREE.ShaderMaterial({ vertexShader: ATMOSPHERE_VERT, fragmentShader: ATMOSPHERE_FRAG, side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false, uniforms: { uOpacity: { value: 1 } } }),
    );
    this.glow.renderOrder = 1;
    this.scene.add(this.glow);

    const clear = SITE_IDS.map((id) => { const m = PLACES[id].marker; return new THREE.Vector4(...toVec(m[0], m[1]).toArray(), Math.cos(4.5 * DEG)); });
    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.012, 160, 80),
      new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthTest: false, depthWrite: false,
        uniforms: { uSun: { value: SUN }, uTime: { value: 0 }, uOpacity: { value: 1 }, uClear: { value: clear } },
      }),
    );
    this.clouds.renderOrder = 30;
    this.clouds.frustumCulled = false;
    this.scene.add(this.clouds);
  }

  /** Loads what the opening needs: the globe, and every site's terrain and regional photo. */
  async load(onProgress: (p: number) => void) {
    const jobs: Promise<unknown>[] = [];
    let done = 0;
    const track = <T,>(p: Promise<T>) => { jobs.push(p.then((v) => { onProgress(++done / jobs.length); return v; })); return p; };
    // the globe's uv runs south→north, so its image is decoded bottom-up
    const globeTex = track(this.tex.load(dataUrl("globe/globe.webp"), { pinned: true, flip: true }));
    const heights = SITE_IDS.map((id) => {
      const s = this.sites[id];
      return Promise.all([track(loadTerrain(id, s.terrain.context)), track(loadTerrain(id, s.terrain.detail))]);
    });
    await Promise.all(jobs);
    const gt = await globeTex;
    this.globe = new THREE.Mesh(
      patchGeometry({ latMin: -90, lonMin: -180, latMax: 90, lonMax: 180 }, 192, 96),
      // "transparent" only so three.js draws it in renderOrder with the glow and terrain (opaque objects go first)
      new THREE.ShaderMaterial({ vertexShader: WORLD_VERT, fragmentShader: GLOBE_FRAG, transparent: true, depthTest: false, depthWrite: false, uniforms: { tMap: { value: gt }, uSun: { value: SUN }, uDim: { value: 1 } } }),
    );
    this.globe.renderOrder = 2;
    this.globe.frustumCulled = false;
    this.scene.add(this.globe);
    for (let i = 0; i < SITE_IDS.length; i++) {
      const id = SITE_IDS[i], s = this.sites[id];
      const [c, d] = await heights[i];
      const h = { coarse: { ...s.terrain.context, data: c } as Heights, fine: { ...s.terrain.detail, data: d } as Heights };
      const sc = makeScene(id, s, this.tex, h);
      this.scenes[id] = sc;
      this.scene.add(sc.group);
    }
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  /** Starts fetching a place's imagery before the visitor gets there. */
  preload(id: SiteId) { this.scenes[id]?.preload(); }

  // ---------------------------------------------------------------- views
  /** Where the subject should sit on screen so the reading column and the evidence panel stay clear. */
  private offset() {
    const { w } = this.size;
    if (w <= 900) return { sx: 0, sy: 0.42 };
    const left = Math.min(440, w * 0.3), right = Math.min(400, w * 0.28);
    return { sx: (left - right) / w, sy: 0.06 };
  }
  private specView(v: ViewSpec): View {
    const o = this.offset();
    const narrow = this.size.w / this.size.h < 0.8 ? 1.35 : 1;
    return { lat: v.at[0], lon: v.at[1], dist: (v.km * narrow) / R_KM, tilt: v.tilt * DEG, heading: v.heading * DEG, sx: o.sx, sy: o.sy };
  }
  private storyView(): View {
    const st = useStore.getState();
    if (st.phase === "intro") return { ...INTRO, sx: this.size.w <= 900 ? 0 : INTRO.sx, sy: this.size.w <= 900 ? -0.25 : 0 };
    if (st.phase === "finale") return { ...FINALE, sx: this.size.w <= 900 ? 0 : FINALE.sx, sy: this.size.w <= 900 ? -0.3 : FINALE.sy, dist: this.size.w <= 900 ? 3.4 : FINALE.dist };
    if (st.phase === "hub") {
      const id = st.hoverSite ?? st.siteId;
      const m = PLACES[id].marker;
      return { lat: m[0] * 0.6, lon: m[1], dist: this.size.w <= 900 ? 4.2 : 3.1, tilt: 0, heading: 0, sx: this.size.w <= 900 ? 0 : -0.12, sy: this.size.w <= 900 ? -0.3 : -0.02 };
    }
    return this.specView(currentChapter(st).view);
  }
  private fly(to: View) {
    const reduced = useStore.getState().reducedMotion;
    const from = { ...this.view };
    const ang = angDist(from, to);
    const zoom = Math.abs(Math.log2(to.dist / from.dist));
    const lowEnds = from.dist < 0.12 && to.dist < 0.12;
    // high enough to see both ends on long journeys; a gentle hop for short ones
    const peak = lowEnds && ang > 0.05 ? clamp(ang * 1.7, 0.25, 3.2) : 0;
    const mid = (Math.log(from.dist) + Math.log(to.dist)) / 2;
    const arc = peak ? Math.max(0, Math.log(peak) - mid) : 0;
    const dur = reduced ? 0.01 : clamp(1.3 + zoom * 0.32 + ang * 2.4 + (peak ? 1.2 : 0), 1.4, 7.5);
    to.heading = from.heading + wrap((to.heading - from.heading) / DEG) * DEG;
    this.flight = { from, to: { ...to }, t: 0, dur, arc, lowEnds };
    this.goal = { ...to };
  }
  private syncStory() {
    const st = useStore.getState();
    const p = this.prev;
    const changed = st.phase !== p.phase || st.siteId !== p.siteId || st.chapter !== p.chapter || st.viewNonce !== p.nonce;
    if (changed) {
      if (st.phase === "site") {
        this.preload(st.siteId);
        // the next place in the journey starts loading while this one is read
        const ch = PLACES[st.siteId].chapters;
        if (st.chapter >= ch.length - 2) { const k = SITE_IDS.indexOf(st.siteId); if (k < SITE_IDS.length - 1) this.preload(SITE_IDS[k + 1]); }
      }
      if (st.phase === "hub" && p.phase !== "hub") this.preload("nepal");
      if (!st.freeCam || st.viewNonce !== p.nonce) this.fly(this.storyView());
      this.prev = { phase: st.phase, siteId: st.siteId, chapter: st.chapter, nonce: st.viewNonce };
    }
  }
  private lastHover: SiteId | null = null;
  private syncHub(dt: number) {
    const st = useStore.getState();
    if (st.phase !== "hub") { this.lastHover = null; return; }
    if (st.hoverSite !== this.lastHover) {
      this.lastHover = st.hoverSite;
      if (st.hoverSite) { this.preload(st.hoverSite); this.fly(this.storyView()); }
    }
    // the globe turns slowly on its own until the visitor takes hold of it
    if (!st.hoverSite && !this.flight && !st.freeCam && !st.reducedMotion && this.pointers.size === 0) {
      this.hubSpin = Math.min(1, this.hubSpin + dt * 0.4);
      this.goal.lon = wrap(this.goal.lon + dt * 4 * this.hubSpin);
      this.goal.lat = lerp(this.goal.lat, 24, dt * 0.3);
    } else this.hubSpin = 0;
  }
  private follow() {
    const st = useStore.getState();
    if (st.phase !== "site" || st.freeCam || this.flight) return;
    const ch = currentChapter(st);
    if (ch.follow !== "surge") return;
    const d = this.sites.nepal as NepalData, fm = d.flowMinutes;
    const m = (st.t - NEPAL_T0) / 60000;
    let i = 0;
    while (i < fm.length - 1 && fm[i + 1] <= m) i++;
    const j = Math.min(fm.length - 1, i + 12), k = Math.max(0, i - 12);
    const [lat, lon] = d.flowline[i];
    // look down the valley, along the direction the water is going
    const a = d.flowline[k], b = d.flowline[j];
    const head = Math.atan2((b[1] - a[1]) * Math.cos(lat * DEG), b[0] - a[0]);
    this.goal.lat = lat; this.goal.lon = lon;
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.002) this.goal.heading = this.view.heading + wrap((head - this.view.heading) / DEG) * DEG;
  }

  private advanceTime(dt: number) {
    const st = useStore.getState();
    if (st.phase !== "site") return;
    const tl = PLACES[st.siteId].timeline;
    if (st.playing && st.playTo !== null) {
      const t = st.t + tl.rate(st.t) * dt * (st.reducedMotion ? 4 : 1);
      if (t >= st.playTo) useStore.setState({ t: st.playTo, playing: false, playTo: null });
      else useStore.setState({ t });
    } else if (st.tTarget !== null) {
      const t = lerp(st.t, st.tTarget, 1 - Math.exp(-dt * 7));
      if (Math.abs(t - st.tTarget) < 60000) useStore.setState({ t: st.tTarget, tTarget: null });
      else useStore.setState({ t });
    }
  }

  private updateView(dt: number) {
    const f = this.flight;
    if (f) {
      f.t += dt;
      const raw = clamp(f.t / f.dur, 0, 1), s = ease(raw);
      const diving = f.to.dist < f.from.dist;
      const lateral = f.lowEnds ? smooth(0.12, 0.88, raw) : diving ? 1 - Math.pow(1 - s, 3) : Math.pow(s, 3);
      const a = toVec(f.from.lat, f.from.lon), b = toVec(f.to.lat, f.to.lon);
      const ang = a.angleTo(b);
      const p = ang < 1e-6 ? b : a.clone().multiplyScalar(Math.sin((1 - lateral) * ang) / Math.sin(ang)).addScaledVector(b, Math.sin(lateral * ang) / Math.sin(ang));
      const ll = toLatLon(p);
      this.view.lat = ll.lat; this.view.lon = ll.lon;
      this.view.dist = Math.exp(lerp(Math.log(f.from.dist), Math.log(f.to.dist), s) + f.arc * Math.sin(Math.PI * s));
      // long hops level out to look straight down while high, then lean into the new place
      this.view.tilt = f.lowEnds && f.arc > 0
        ? f.from.tilt * (1 - smooth(0, 0.35, raw)) * (1 - smooth(0.55, 1, raw)) + f.to.tilt * smooth(0.55, 1, raw)
        : lerp(f.from.tilt, f.to.tilt, s);
      this.view.heading = lerp(f.from.heading, f.to.heading, s);
      this.view.sx = lerp(f.from.sx, f.to.sx, s);
      this.view.sy = lerp(f.from.sy, f.to.sy, s);
      if (raw >= 1) this.flight = null;
    } else {
      const k = 1 - Math.exp(-dt * 6);
      const g = this.goal;
      this.view.lat = lerp(this.view.lat, g.lat, k);
      this.view.lon = this.view.lon + wrap(g.lon - this.view.lon) * k;
      this.view.dist = Math.exp(lerp(Math.log(this.view.dist), Math.log(g.dist), k));
      this.view.tilt = lerp(this.view.tilt, g.tilt, k);
      this.view.heading = lerp(this.view.heading, g.heading, k);
      this.view.sx = lerp(this.view.sx, g.sx, k);
      this.view.sy = lerp(this.view.sy, g.sy, k);
    }
    this.applyCamera(dt);
  }

  private focus() {
    // the site nearest the camera target, and how close
    let best: SiteId | null = null, near = Infinity;
    for (const id of SITE_IDS) {
      const sc = this.scenes[id];
      if (!sc) continue;
      const a = angDist(this.view, { lat: sc.center[0], lon: sc.center[1] });
      if (a < near) { near = a; best = id; }
    }
    return { id: best, angle: near };
  }

  private applyCamera(dt: number) {
    const v = this.view;
    const st = useStore.getState();
    const lean = st.phase === "hub" && !this.flight && !st.reducedMotion ? 1 : 0;
    const lat = clamp(v.lat + this.pointer.y * 1.2 * lean, -85, 85), lon = v.lon - this.pointer.x * 1.6 * lean;
    // the target sits on the (exaggerated) ground, so close views look at the terrain, not under it
    const fc = this.focus();
    const sc = fc.id ? this.scenes[fc.id] : null;
    const lift = sc && sc.exagNow > 0 ? sc.liftAt(lat, lon) / (R_KM * 1000) : 0;
    this.targetLift = lerp(this.targetLift, lift, 1 - Math.exp(-dt * 5));
    const f = localFrame(lat, lon);
    const fwd = f.north.clone().multiplyScalar(Math.cos(v.heading)).addScaledVector(f.east, Math.sin(v.heading));
    const target = f.up.clone().multiplyScalar(1 + this.targetLift);
    const cam = this.camera;
    cam.position.copy(target).addScaledVector(f.up, v.dist * Math.cos(v.tilt)).addScaledVector(fwd, -v.dist * Math.sin(v.tilt));
    // never below the ground under the camera
    if (sc && sc.exagNow > 0) {
      const ll = toLatLon(cam.position);
      const ground = 1 + (sc.liftAt(ll.lat, ll.lon) + 400) / (R_KM * 1000);
      const r = cam.position.length();
      if (r < ground) cam.position.multiplyScalar(ground / r);
    }
    cam.up.copy(fwd).multiplyScalar(Math.cos(v.tilt)).addScaledVector(f.up, Math.sin(v.tilt));
    cam.lookAt(target);
    cam.near = Math.max(2e-6, v.dist * 0.015);
    cam.far = 400;
    cam.updateProjectionMatrix();
    cam.projectionMatrix.elements[8] = -v.sx;
    cam.projectionMatrix.elements[9] = -v.sy;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    cam.updateMatrixWorld();
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.tex.frame++;
    this.syncStory();
    this.syncHub(dt);
    this.follow();
    this.advanceTime(dt);
    this.updateView(dt);
    const st = useStore.getState();
    const fc = this.focus();
    const siteMix = smooth(0.6, 0.25, this.view.dist) * smooth(0.12, 0.05, fc.angle);
    (this.globe.material as THREE.ShaderMaterial).uniforms.uDim.value = 1 - 0.45 * siteMix;
    const cu = (this.clouds.material as THREE.ShaderMaterial).uniforms;
    cu.uOpacity.value = smooth(0.18, 0.5, this.view.dist);
    this.clouds.visible = cu.uOpacity.value > 0.002;
    if (!st.reducedMotion) cu.uTime.value = this.time;
    (this.stars.material as THREE.ShaderMaterial).uniforms.uOpacity.value = smooth(0.05, 0.4, this.view.dist);
    // close to the ground the camera is inside the glow shell; let it go before it veils the terrain
    const go = smooth(0.06, 0.35, this.view.dist);
    (this.glow.material as THREE.ShaderMaterial).uniforms.uOpacity.value = go;
    this.glow.visible = go > 0.002;
    const ch = st.phase === "site" ? currentChapter(st) : null;
    for (const id of SITE_IDS) {
      const sc = this.scenes[id];
      if (!sc) continue;
      const near = smooth(0.12, 0.05, angDist(this.view, { lat: sc.center[0], lon: sc.center[1] }));
      const active = st.phase === "site" && st.siteId === id;
      const tl = PLACES[id].timeline;
      sc.update({
        dt, time: this.time, t: active ? st.t : tl.end, dist: this.view.dist, near, active,
        layer: active ? st.layer : PLACES[id].chapters[PLACES[id].chapters.length - 1].layer,
        chapter: active ? ch : null, pass: st.pass, rain: st.rain, reduced: st.reducedMotion,
      });
    }
    if (this.tex.frame % 120 === 0) this.tex.prune();
    this.renderer.render(this.scene, this.camera);
    this.listeners.forEach((fn) => fn());
    this.raf = requestAnimationFrame(this.frame);
  };

  // ---------------------------------------------------------------- for the interface
  onFrame(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private v3 = new THREE.Vector3();
  /** Screen position of a place on Earth (lifted onto the drawn terrain), and whether it faces the camera. */
  project(lat: number, lon: number, siteId?: SiteId, liftM = 0) {
    const sc = siteId ? this.scenes[siteId] : null;
    const h = (sc ? sc.liftAt(lat, lon) : 0) + liftM;
    const p = toVec(lat, lon, 1 + h / (R_KM * 1000), this.v3);
    const n = p.clone().normalize();
    const front = n.dot(this.camera.position.clone().sub(p)) > 0 && this.camera.position.length() > 1.0;
    p.project(this.camera);
    const onScreen = p.z < 1 && p.z > -1;
    return { x: (p.x * 0.5 + 0.5) * this.size.w, y: (-p.y * 0.5 + 0.5) * this.size.h, front: front && onScreen };
  }
  get distance() { return this.view.dist; }
  get flying() { return this.flight !== null; }
  /** Metres of ground across the screen width at the target, for the scale bar. */
  metresPerPixel() { return (this.view.dist * R_KM * 1000 * 2 * Math.tan((this.camera.fov * DEG) / 2)) / this.size.h; }
  exaggeration(id: SiteId) { return this.scenes[id]?.exagNow ?? 0; }

  // ---------------------------------------------------------------- input
  private takeControl() {
    // the visitor always wins: any flight stops where it is
    if (this.flight) { this.flight = null; this.goal = { ...this.view }; }
    const st = useStore.getState();
    if (st.phase !== "intro") st.setFreeCam(true);
  }
  private onDown = (e: PointerEvent) => {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.drag.moved = 0;
    this.drag.mode = e.button === 2 || e.shiftKey || e.ctrlKey || this.pointers.size === 2 ? "orbit" : "pan";
    if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; this.drag.pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  };
  private onMove = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.drag.moved += Math.abs(dx) + Math.abs(dy);
    if (this.drag.moved < 4) return;
    const st = useStore.getState();
    if (st.phase === "intro") return;
    this.takeControl();
    const g = this.goal;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.drag.pinch > 0) g.dist = this.clampDist(g.dist * (this.drag.pinch / d));
      this.drag.pinch = d;
      g.heading += dx * 0.004 * 0.5;
      g.tilt = clamp(g.tilt - dy * 0.004 * 0.5, 0, 75 * DEG);
      return;
    }
    if (this.drag.mode === "orbit") {
      g.heading += dx * 0.005;
      g.tilt = clamp(g.tilt - dy * 0.005, 0, (st.phase === "site" ? 75 : 40) * DEG);
      return;
    }
    // pan: move the target across the ground, along the camera's own east and north
    // grab the ground: content follows the pointer. Screen right on the ground is east·cos h − north·sin h,
    // screen up is the camera's forward direction, north·cos h + east·sin h.
    const perPx = (g.dist * 2 * Math.tan((this.camera.fov * DEG) / 2)) / this.size.h / DEG;
    const ch = Math.cos(g.heading), sh = Math.sin(g.heading);
    const north = (dx * sh + dy * ch) * perPx;
    const east = (-dx * ch + dy * sh) * perPx;
    g.lat = clamp(g.lat + north, -80, 80);
    g.lon = wrap(g.lon + east / Math.cos(g.lat * DEG));
    if (st.phase === "site") {
      // stay within reach of the place being read
      const c = this.scenes[st.siteId].center;
      const lim = 1.1;
      g.lat = clamp(g.lat, c[0] - lim, c[0] + lim);
      g.lon = c[1] + clamp(wrap(g.lon - c[1]), -lim * 1.4, lim * 1.4);
    }
  };
  private onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    this.drag.pinch = 0;
    if (!this.pointers.size) this.drag.mode = "";
  };
  private onLeave = () => { this.pointer.x = 0; this.pointer.y = 0; };
  private clampDist(d: number) {
    const st = useStore.getState();
    if (st.phase === "site") return clamp(d, 6 / R_KM, 900 / R_KM);
    return clamp(d, 0.6, 5);
  }
  private onWheel = (e: WheelEvent) => {
    const st = useStore.getState();
    if (st.phase === "intro") return;
    e.preventDefault();
    this.takeControl();
    this.goal.dist = this.clampDist(this.goal.dist * Math.exp(clamp(e.deltaY, -120, 120) * 0.0018));
  };
  /** Keyboard camera nudges (arrows with Alt; +/-): an accessible alternative to dragging. */
  nudge(kind: "in" | "out" | "left" | "right" | "up" | "down" | "rotL" | "rotR") {
    this.takeControl();
    const g = this.goal, step = (g.dist * R_KM) / 6 / 111;
    if (kind === "in") g.dist = this.clampDist(g.dist / 1.35);
    if (kind === "out") g.dist = this.clampDist(g.dist * 1.35);
    if (kind === "up") g.lat += step * Math.cos(g.heading);
    if (kind === "down") g.lat -= step * Math.cos(g.heading);
    if (kind === "left") g.lon -= step / Math.cos(g.lat * DEG);
    if (kind === "right") g.lon += step / Math.cos(g.lat * DEG);
    if (kind === "rotL") g.heading -= 12 * DEG;
    if (kind === "rotR") g.heading += 12 * DEG;
  }

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? FOV * 1.3 : FOV;
    if (!this.flight && !useStore.getState().freeCam) { const v = this.storyView(); this.goal = { ...this.goal, sx: v.sx, sy: v.sy, dist: useStore.getState().phase === "site" ? v.dist : this.goal.dist }; }
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.renderer.dispose();
  }
}
