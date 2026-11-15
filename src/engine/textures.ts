import * as THREE from "three";

/**
 * Image loading for the GPU. Bitmaps are decoded off the main thread with no colour conversion, so data
 * textures (arrival times, season dates) arrive bit-exact. Large site imagery is kept on a least-recently-used
 * budget so long journeys do not pile up GPU memory.
 */
export class Textures {
  private loader = new THREE.ImageBitmapLoader();
  private flipLoader = new THREE.ImageBitmapLoader();
  private items = new Map<string, { tex?: THREE.Texture; promise: Promise<THREE.Texture>; used: number; bytes: number; pinned: boolean }>();
  /** Loads that failed: when they may be tried again, and how many times they have failed. */
  private failed = new Map<string, { retryAt: number; tries: number; refused: Promise<THREE.Texture> }>();
  /** Called once per URL that has failed for good (after the last retry), and once on the first failure. */
  onFail: ((url: string, final: boolean) => void) | null = null;
  readonly blank: THREE.DataTexture;
  frame = 0;
  /** Retry delays after a failed load; after the last one the URL is given up for this visit. */
  static readonly RETRY_MS = [5000, 30000];
  constructor(private anisotropy: number, private budgetMB = 640) {
    this.loader.setOptions({ imageOrientation: "none", premultiplyAlpha: "none", colorSpaceConversion: "none" });
    this.flipLoader.setOptions({ imageOrientation: "flipY", premultiplyAlpha: "none", colorSpaceConversion: "none" });
    this.blank = new THREE.DataTexture(new Uint8Array([12, 16, 30, 255]), 1, 1);
    this.blank.needsUpdate = true;
  }
  /** `data` textures are sampled exactly: no filtering, no mipmaps. */
  load(url: string, opts: { data?: boolean; pinned?: boolean; flip?: boolean } = {}): Promise<THREE.Texture> {
    let it = this.items.get(url);
    if (!it) {
      // a failed image is not asked for again on every frame: only after its back-off, and at most twice
      const f = this.failed.get(url);
      if (f && (f.tries > Textures.RETRY_MS.length || performance.now() < f.retryAt)) return f.refused;
      const promise = (opts.flip ? this.flipLoader : this.loader).loadAsync(url).then((bmp) => {
        const tex = new THREE.Texture(bmp as unknown as HTMLImageElement);
        tex.flipY = false;
        tex.colorSpace = THREE.NoColorSpace;
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        if (opts.data) {
          tex.generateMipmaps = false;
          tex.minFilter = THREE.NearestFilter;
          tex.magFilter = THREE.NearestFilter;
        } else {
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.anisotropy = this.anisotropy;
        }
        tex.needsUpdate = true;
        const e = this.items.get(url);
        if (e) { e.tex = tex; e.bytes = bmp.width * bmp.height * 4 * (opts.data ? 1 : 1.34); }
        return tex;
      });
      it = { promise, used: this.frame, bytes: 0, pinned: !!opts.pinned };
      this.items.set(url, it);
      promise.catch(() => {
        this.items.delete(url);
        const tries = (this.failed.get(url)?.tries ?? 0) + 1;
        // one settled, already-handled rejection per URL, so callers that ignore the result log nothing
        const refused = Promise.reject(new Error(`image unavailable: ${url}`)); refused.catch(() => undefined);
        this.failed.set(url, { tries, refused, retryAt: performance.now() + (Textures.RETRY_MS[tries - 1] ?? Infinity) });
        const final = tries > Textures.RETRY_MS.length;
        if (tries === 1 || final) {
          console.warn(`[piercer] image ${final ? "unavailable, giving up" : "failed, will retry"}: ${url}`);
          this.onFail?.(url, final);
        }
      });
      promise.then(() => this.failed.delete(url), () => undefined);
    }
    it.used = this.frame;
    return it.promise;
  }
  /** The texture if loaded (starting the load if needed), else undefined. */
  get(url: string, opts: { data?: boolean } = {}): THREE.Texture | undefined {
    void this.load(url, opts).catch(() => undefined);
    return this.items.get(url)?.tex;
  }
  /** Marks a texture as in use this frame without starting anything. */
  touch(url: string) { const it = this.items.get(url); if (it) it.used = this.frame; }
  prune() {
    let total = 0;
    for (const v of this.items.values()) total += v.bytes;
    if (total < this.budgetMB * 1e6) return;
    const old = [...this.items.entries()].filter(([, v]) => v.tex && !v.pinned && v.used < this.frame - 30).sort((a, b) => a[1].used - b[1].used);
    for (const [key, v] of old) {
      if (total < this.budgetMB * 0.8e6) break;
      // free the GPU copy only; a material may still hold this texture for a frame, and closing the
      // bitmap under it would make three.js re-upload detached data
      v.tex!.dispose();
      this.items.delete(key);
      total -= v.bytes;
    }
  }
}
