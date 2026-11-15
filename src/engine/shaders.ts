// GLSL for the globe and for the three study sites.
// Imagery is display-referred sRGB and is passed through untouched (no colour management). The site shaders
// follow the colour rules of the team's research maps (research/*/web/index.html), so what is drawn here is
// what was measured there.

const LIGHT = /* glsl */ `
  uniform vec3 uSun;
  // Illustrative lighting: a soft day side and a blue limb. Not a physical atmosphere model.
  vec3 shade(vec3 c, vec3 n, vec3 v) {
    float light = mix(0.38, 1.0, smoothstep(-0.25, 0.5, dot(n, uSun)));
    float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    return mix(c * light, vec3(0.34, 0.52, 1.0), rim * 0.6);
  }
`;

export const WORLD_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const GLOBE_FRAG = /* glsl */ `
  uniform sampler2D tMap;
  uniform float uDim;
  varying vec2 vUv;
  varying vec3 vWorld;
  ${LIGHT}
  void main() {
    vec3 n = normalize(vWorld);
    vec3 c = shade(texture2D(tMap, vUv).rgb, n, normalize(cameraPosition - vWorld));
    gl_FragColor = vec4(c * uDim, 1.0);
  }
`;

export const PATCH_FRAG = /* glsl */ `
  uniform sampler2D tMap;
  uniform float uOpacity;
  uniform float uFeather;
  uniform float uDim;
  varying vec2 vUv;
  varying vec3 vWorld;
  ${LIGHT}
  void main() {
    vec3 n = normalize(vWorld);
    vec3 c = shade(texture2D(tMap, vUv).rgb, n, normalize(cameraPosition - vWorld));
    float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    gl_FragColor = vec4(c * uDim, smoothstep(0.0, uFeather, e) * uOpacity);
  }
`;

export const ATMOSPHERE_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vWorld;
  void main() {
    vN = normalize(position);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
export const ATMOSPHERE_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vN;
  varying vec3 vWorld;
  void main() {
    float f = abs(dot(normalize(vN), normalize(cameraPosition - vWorld)));
    float glow = pow(smoothstep(0.0, 0.42, f), 2.2);
    gl_FragColor = vec4(vec3(0.30, 0.50, 1.0) * glow * 0.85 * uOpacity, 1.0);
  }
`;

const NOISE = /* glsl */ `
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { s += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
`;

// Illustrative cloud deck: procedural noise on a shell just above the ground. Not weather data.
export const CLOUD_FRAG = /* glsl */ `
  uniform vec3 uSun;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec4 uClear[3];   // xyz: a study site, w: cos of the clear radius
  varying vec3 vN;
  varying vec3 vWorld;
  ${NOISE}
  void main() {
    vec3 n = normalize(vN);
    float t = uTime * 0.012;
    float c = cos(t), s = sin(t);
    vec3 q = vec3(c * n.x + s * n.z, n.y, -s * n.x + c * n.z);
    vec3 warp = vec3(fbm(q * 3.0 + 3.1), fbm(q * 3.0 + 7.7), fbm(q * 3.0 - 4.3));
    float d = fbm(q * 5.5 + warp * 1.1);
    float lat = abs(n.y);
    float band = 0.53
      - 0.05 * (1.0 - smoothstep(0.05, 0.2, lat))
      + 0.08 * smoothstep(0.18, 0.3, lat) * (1.0 - smoothstep(0.45, 0.58, lat))
      - 0.06 * smoothstep(0.6, 0.8, lat);
    float cover = smoothstep(band, band + 0.16, d) * 0.85;
    // keep the study sites clear so the evidence stays visible from orbit
    for (int i = 0; i < 3; i++) cover *= smoothstep(uClear[i].w, uClear[i].w - 0.012, dot(n, uClear[i].xyz));
    float light = mix(0.12, 1.0, smoothstep(-0.2, 0.45, dot(n, uSun)));
    float rim = pow(1.0 - max(dot(n, normalize(cameraPosition - vWorld)), 0.0), 2.0);
    gl_FragColor = vec4(vec3(0.97, 0.98, 1.0) * light, cover * uOpacity * (0.9 - 0.4 * rim));
  }
`;

export const STAR_VERT = /* glsl */ `
  attribute float aSize;
  varying float vA;
  void main() {
    vA = aSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * 1.6;
  }
`;
export const STAR_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(vec3(0.92, 0.9, 0.84), smoothstep(0.5, 0.0, d) * 0.55 * vA * uOpacity);
  }
`;

// ---------------------------------------------------------------- terrain
// Vertices sit on the sphere; each is lifted by its Copernicus DEM height times uExag (vertical exaggeration,
// stated on screen). Positions are relative to uOrigin, the site centre, so close-up views keep precision.
export const TERRAIN_VERT = /* glsl */ `
  attribute float aH;
  attribute vec2 aGrad;
  uniform vec3 uOrigin;
  uniform float uExag;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vH;
  void main() {
    vec3 up = normalize(uOrigin + position);
    vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), up));
    vec3 north = cross(up, east);
    vNormal = normalize(up - uExag * (aGrad.x * east + aGrad.y * north));
    vec3 p = position + up * (aH * uExag / 6371000.0);
    vec4 w = modelMatrix * vec4(p, 1.0);
    vWorld = w.xyz;
    vUv = uv;
    vH = aH;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const RELIEF = /* glsl */ `
  uniform vec3 uLight;     // a cartographer's light from the north-west, high in the sky (illustrative)
  uniform float uRelief;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vH;
  vec3 relief(vec3 c) {
    vec3 up = normalize(vWorld);
    vec3 n = normalize(vNormal);
    float k = 1.0 + (dot(n, uLight) - dot(up, uLight)) * 1.7;
    return c * mix(1.0, clamp(k, 0.5, 1.4), uRelief);
  }
  float edge(vec2 uv, float f) { return smoothstep(0.0, f, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y))); }
  const vec3 LW = vec3(0.299, 0.587, 0.114);
`;

// Rain (NASA IMERG, 0.1° cells), draped on the ground. Stored as sqrt(display intensity) like the research map.
const RAIN = /* glsl */ `
  uniform sampler2D tR0, tR1;
  uniform float uRainMix, uRain;
  uniform vec4 uRainBox;   // lonMin, latMax, lon span, lat span
  vec3 rainOver(vec3 col) {
    if (uRain < 0.001) return col;
    vec3 n = normalize(vWorld);
    float lat = degrees(asin(n.y)), lon = degrees(atan(n.x, n.z));
    vec2 uv = vec2((lon - uRainBox.x) / uRainBox.z, (uRainBox.y - lat) / uRainBox.w);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return col;
    float b = mix(texture2D(tR0, uv).r, texture2D(tR1, uv).r, uRainMix), u = b * b;
    float a = smoothstep(0.03, 0.2, u) * 0.28 + smoothstep(0.2, 0.75, u) * 0.5;
    vec3 c = mix(vec3(0.8, 0.6, 0.95), vec3(1.0, 0.95, 1.0), smoothstep(0.25, 0.8, u));
    return mix(col, c, a * uRain);
  }
`;

/** The wide regional photo around a site. A hole is left where the detailed layer sits. */
export const contextFrag = (rain: boolean) => /* glsl */ `
  uniform sampler2D tCtx;
  uniform vec4 uHole;      // detail rectangle in this texture's uv: x0, y0, w, h
  uniform float uDim;
  ${RELIEF}
  ${rain ? RAIN : ""}
  void main() {
    vec2 d = (vUv - uHole.xy) / uHole.zw;
    if (d.x > 0.0005 && d.x < 0.9995 && d.y > 0.0005 && d.y < 0.9995) discard;
    vec3 c = texture2D(tCtx, vUv).rgb;
    float l = dot(c, LW);
    c = mix(vec3(l), c, mix(1.0, 0.5, uDim)) * mix(1.0, 0.72, uDim);
    c = relief(c);
    ${rain ? "c = rainOver(c);" : ""}
    gl_FragColor = vec4(c, edge(vUv, 0.05) * uOpacity);
  }
`;

// ---------------------------------------------------------------- Big Grass Fire
// Two imagery sets (true colour, false colour or radar) blend so that switching layers is a cross-fade.
// Fire timing comes from arrival.png: hours after 23 Jul 00:00 UTC, quarter-hour steps, VIIRS days with HLS edges,
// interpolated within each day (estimate, stated on screen).
export const FIRE_FRAG = /* glsl */ `
  uniform sampler2D tPre0, tA0, tB0, tPre1, tA1, tB1, tArr;
  uniform float uMix0, uMix1, uSet, uRad0, uRad1, uOk0, uOk1, uT, uTint, uFire, uPerim;
  uniform vec2 uPx;
  ${RELIEF}
  float hours(vec4 a) { return (a.r * 255.0 * 256.0 + a.g * 255.0) / 4.0; }
  vec3 fireRamp(float age) {
    vec3 c1 = vec3(1.0, .965, .81), c2 = vec3(1.0, .76, .24), c3 = vec3(1.0, .42, .10), c4 = vec3(.76, .22, .06);
    if (age < 2.0) return mix(c1, c2, age / 2.0);
    if (age < 9.0) return mix(c2, c3, (age - 2.0) / 7.0);
    return mix(c3, c4, clamp((age - 9.0) / 18.0, 0.0, 1.0));
  }
  vec3 scene(sampler2D pre, sampler2D a0, sampler2D a1, float m, float isRad, float ok, vec4 A, float age, bool burned) {
    vec3 b = texture2D(pre, vUv).rgb;
    float l = dot(b, LW);
    vec3 col = mix(vec3(l), b, mix(0.55, 1.0, isRad)) * mix(0.85, 1.0, isRad) + 0.02;
    if (burned && age >= 0.0 && ok > .5) {
      vec3 af = mix(texture2D(a0, vUv).rgb, texture2D(a1, vUv).rgb, m);
      float la = dot(af, LW);
      vec3 tinted = isRad > .5 ? mix(af, vec3(la) * vec3(1.25, .62, .5), .55) : mix(af, af * vec3(1.35, .62, .5) + vec3(.05, 0., 0.), .55);
      col = mix(af, tinted, uTint);
    }
    return col;
  }
  void main() {
    vec4 A = texture2D(tArr, vUv);
    bool burned = A.b > .5;
    float age = uT - hours(A);
    vec3 s0 = scene(tPre0, tA0, tB0, uMix0, uRad0, uOk0, A, age, burned);
    vec3 s1 = scene(tPre1, tA1, tB1, uMix1, uRad1, uOk1, A, age, burned);
    vec3 col = mix(s0, s1, uSet);
    if (burned && age >= 0.0 && uFire > 0.001) {
      float k = exp(-age / 16.0);
      col = mix(col, fireRamp(age), clamp(k * 1.25, 0.0, 1.0) * uFire);
      if (age < 10.0) {
        float e = 0.0;
        for (int i = 0; i < 4; i++) {
          vec2 o = i == 0 ? vec2(uPx.x, 0.) : i == 1 ? vec2(-uPx.x, 0.) : i == 2 ? vec2(0., uPx.y) : vec2(0., -uPx.y);
          vec4 n = texture2D(tArr, vUv + o * 2.0);
          if (n.b < .5 || hours(n) > uT) e = 1.0;
        }
        col = mix(col, vec3(1.0, .98, .88), e * (1.0 - age / 10.0) * uFire);
      }
    }
    gl_FragColor = vec4(relief(col), uOpacity);
  }
`;

// ---------------------------------------------------------------- Bhote Koshi flood
// arrival.png: B = the standard stripped-ground mask (11.7 km², HLS, DATA_STANDARD rule G- or new W); R,G = arrival
// time in seconds after 08:37, from the DEM flow path fitted to reported times (estimate, stated on screen).
export const FLOOD_FRAG = /* glsl */ `
  uniform sampler2D tPhotoA, tPhotoB, tRad, tArr;
  uniform float uPhotoMix, uRadMix, uT, uSurge, uScar, uVeil, uTime;
  uniform vec2 uPx;
  ${RELIEF}
  ${NOISE}
  float mins(vec4 a) { return (a.r * 255.0 * 256.0 + a.g * 255.0) / 60.0; }
  void main() {
    vec3 photo = mix(texture2D(tPhotoA, vUv).rgb, texture2D(tPhotoB, vUv).rgb, uPhotoMix);
    // no clear photo: an illustrative cloud veil over the photo layer only
    if (uVeil > 0.001) {
      vec3 q = vec3(vUv * vec2(5.0, 7.5), uTime * 0.03);
      float d = fbm(q + vec3(fbm(q * 1.7), fbm(q * 1.3 + 4.0), 0.0) * 0.8);
      float cov = smoothstep(0.32, 0.62, d);
      photo = mix(photo, vec3(0.86, 0.88, 0.92) * (0.75 + 0.25 * d), uVeil * mix(0.72, 0.97, cov));
    }
    float l = dot(photo, LW);
    vec3 col = mix(vec3(l), photo, 0.8) * 0.94 + 0.02;
    vec3 rad = texture2D(tRad, vUv).rgb;
    col = mix(col, rad, uRadMix);
    vec4 A = texture2D(tArr, vUv);
    if (A.b > .5) {
      float age = uT - mins(A);
      if (uSurge > 0.001 && age >= 0.0) {
        vec3 water = mix(vec3(.16, .47, .84), vec3(.07, .24, .48), clamp(age / 90.0, 0.0, 1.0));
        vec3 front = mix(vec3(.96, .99, 1.0), vec3(.5, .9, 1.0), clamp(age / 1.5, 0.0, 1.0));
        vec3 c = age < 1.5 ? front : water;
        float drain = clamp((age - 120.0) / (60.0 * 24.0 * 4.0), 0.0, 1.0);
        col = mix(col, c, (1.0 - drain) * uSurge);
        if (age < 4.0) {
          float e = 0.0;
          for (int i = 0; i < 4; i++) {
            vec2 o = i == 0 ? vec2(uPx.x, 0.) : i == 1 ? vec2(-uPx.x, 0.) : i == 2 ? vec2(0., uPx.y) : vec2(0., -uPx.y);
            vec4 n = texture2D(tArr, vUv + o * 2.0);
            if (n.b < .5 || mins(n) > uT) e = 1.0;
          }
          col = mix(col, vec3(1.0), e * (1.0 - age / 4.0) * 0.7 * uSurge);
        }
      }
      // the measured stripped ground (HLS), shown as a teal wash on its own layer
      col = mix(col, mix(vec3(.12, .42, .44), vec3(.55, .95, .9), dot(photo, LW)), uScar * 0.75);
    }
    gl_FragColor = vec4(relief(col), uOpacity);
  }
`;

// ---------------------------------------------------------------- Jazan rainy season
// Ported from the research map (research/saudi/rain_web/index.html). Layers:
//   0 radar ground change (GUNW coherence pairs), 1 radar wetness (GCOV HH vs dry season), 2 photo (HLS),
//   3 season (photo in grey + wet ground + per-pixel green-up / water dates), 4 how often radar saw change.
// Two layers are evaluated and mixed so a layer switch is a cross-fade.
export const JAZAN_FRAG = /* glsl */ `
  uniform sampler2D tBase, tC0, tC1, tG0, tG1, tP0, tP1, tSA, tSB, tPJune, tFreq;
  uniform float uModeA, uModeB, uModeMix, uHasC, uMixC, uHasG, uMixG, uMixP, uT, uPhotoH;
  uniform vec2 uPx;
  ${RELIEF}
  ${RAIN}
  const vec3 WET = vec3(.165, .624, .847), WATER = vec3(.188, .275, .847), GREEN = vec3(.247, .812, .471), GREEN0 = vec3(.13, .35, .25), DRIED = vec3(.71, .5, .227);
  float upOf(vec2 q) { return texture2D(tSA, q).r * 255.0; }
  vec3 layer(float mode) {
    vec3 col;
    if (mode > 3.5) {
      float g = texture2D(tBase, vUv).r; vec3 grey = vec3(g * .55 + .05);
      float f = texture2D(tFreq, vUv).r;
      vec3 ramp = mix(vec3(.15, .36, .62), vec3(.75, .93, 1.0), smoothstep(.3, 1.0, f));
      col = mix(grey, ramp, smoothstep(.12, .5, f) * .92);
    } else if (mode > 2.5) {
      vec3 ph = texture2D(tPJune, vUv).rgb; float l = dot(ph, LW);
      col = vec3(l * .5 + .035) * vec3(.96, .98, 1.03);
      vec4 A = texture2D(tSA, vUv), B = texture2D(tSB, vUv);
      float gu = A.r * 255.0, gd = A.g * 255.0, wu = A.b * 255.0, wd = B.r * 255.0, rise = B.g, fl = floor(B.b * 255.0 + .5);
      if (abs(fl - 85.0) < 1.0 || fl > 250.0) col = mix(col, GREEN0, .8);
      if (uHasG > .5) {
        float an = (mix(texture2D(tG0, vUv).r, texture2D(tG1, vUv).r, uMixG) - .5) * 12.0;
        col = mix(col, WET, smoothstep(1.5, 4.5, an) * .85);
      }
      float tp = uT - uPhotoH;
      if (gu < 254.5 && tp >= gu) {
        float age = tp - gu;
        vec3 g = mix(GREEN * .78, GREEN * 1.08, rise);
        if (gd < 254.5 && tp >= gd) g = mix(g, DRIED, clamp((tp - gd) / 6.0, 0.0, 1.0));
        col = mix(col, g, .93);
        float e = 0.0;
        if (age < 8.0) {
          for (int i = 0; i < 4; i++) {
            vec2 o = i == 0 ? vec2(uPx.x, 0.) : i == 1 ? vec2(-uPx.x, 0.) : i == 2 ? vec2(0., uPx.y) : vec2(0., -uPx.y);
            if (upOf(vUv + o * 1.5) > tp) e = 1.0;
          }
        }
        col = mix(col, vec3(.86, 1.0, .88), max(exp(-age / 2.5) * .6, e * (1.0 - age / 8.0) * .75));
      }
      bool permW = abs(fl - 170.0) < 1.0 || fl > 250.0;
      bool gone = wd < 254.5 && tp >= wd;
      if (!gone && (permW || (wu < 254.5 && tp >= wu))) {
        float age = permW ? 99.0 : tp - wu;
        col = mix(WATER, vec3(.8, .9, 1.0), exp(-age / 2.5) * .7);
      }
    } else if (mode > 1.5) {
      col = mix(texture2D(tP0, vUv).rgb, texture2D(tP1, vUv).rgb, uMixP);
    } else {
      float g = texture2D(tBase, vUv).r; vec3 grey = vec3(g * .62 + .05);
      if (mode < .5) {
        float f = mix(texture2D(tC0, vUv).r, texture2D(tC1, vUv).r, uMixC);
        float a = smoothstep(.36, .75, f) * uHasC;
        vec3 ramp = mix(vec3(.09, .31, .58), vec3(.72, .9, 1.0), smoothstep(.4, 1.0, f));
        col = mix(grey, ramp, a * .92);
      } else {
        float f = mix(texture2D(tG0, vUv).r, texture2D(tG1, vUv).r, uMixG);
        float d = (f - .5) * 2.0;
        vec3 up = vec3(.22, .53, .9), dn = vec3(.92, .45, .2);
        col = mix(grey, d > 0.0 ? up : dn, smoothstep(.2, .75, abs(d)) * uHasG * .9);
      }
    }
    return col;
  }
  void main() {
    vec3 col = uModeMix < 0.001 ? layer(uModeA) : uModeMix > 0.999 ? layer(uModeB) : mix(layer(uModeA), layer(uModeB), uModeMix);
    col = rainOver(relief(col));
    gl_FragColor = vec4(col, uOpacity);
  }
`;
