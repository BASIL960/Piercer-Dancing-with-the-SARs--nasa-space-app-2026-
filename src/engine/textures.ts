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
  readonly blank: THREE.DataTexture;
  frame = 0;
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
      promise.catch(() => this.items.delete(url));
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
