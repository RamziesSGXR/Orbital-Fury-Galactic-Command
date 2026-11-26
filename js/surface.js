// SURFACE DETAIL (GC 0.70, Ramzies: "add some texture to things"; GC 0.90: "texture updates in general for all the games"). Every
// lit 3D surface in the game is given texture by the graphics card: fabric has a weave and creases and is rubbed pale where it
// folds, painted metal and plastic has orange peel, dents, scratches and chips down to bare metal and is streaked down its sides,
// a creature's hide is in scales, stone and concrete are pitted, cracked and spalled, wood is grained, and everything is dustier
// toward the ground and on the faces that look up. The small bumps catch the light (they move the surface's normal), so a wall
// reads as concrete under a low sun and not as grey paint. Lights, glass, see-through things and anything already painted from a
// picture (the land, planets, signs) are left as they are.
//   The detail is one small picture, assets/textures/detail.png (made by tools/textures/detail.py), a layer for each KIND below:
//   light and dark, height, wear. It is laid on from the three directions (no model needs texture coordinates) and fades as the
//   picture's own smaller copies do, so far off a surface is its plain colour. Until it has loaded, surfaces are as in 0.70.
//
// How: three.js's shared shader pieces are extended once, when this file is first imported, so every Lambert, Phong and Standard
// material picks it up. A material can say what it is made of (`surf(mat, kind)`) or opt out (`noSurf(mat)`); a model file from
// Blender says it for each triangle (attribute aSurf, set in model3d.js from its material names) and carries where each corner
// stands at rest (aRest), so the pattern stays on the body as it walks instead of sliding over it.
//   Patterns are worked out where the surface is on the model (a figure, a vehicle, a building from a model file) or, for things
//   built in the game's code, where it is in the world (a base's walls never move). GC_SCALE: metres in one unit of that space.
import * as THREE from './vendor/three.js';

export const KIND = { plain: 0, fabric: 1, hard: 2, organic: 3, skin: 4, none: 5, stone: 6, wood: 7,
  soil: 8, rock: 9, bark: 10, foliage: 11, sand: 12, snow: 13, grass: 14, regolith: 15, water: 16 };     // (GC 0.90: the world's own, from soil on)
// the land's layer for each biome (the base's and the ground fight's): what its ground is, close up
export const LAND = { desert: KIND.sand, mars: KIND.sand, steppe: KIND.grass, grass: KIND.grass, jungle: KIND.grass, ice: KIND.snow,
  moon: KIND.regolith, ash: KIND.regolith, city: KIND.stone };

// What a Blender model's material is made of, by its name (tools/blender: c_ people, e_ enemies, s_ sites, v_ vehicles, w_ world ...)
const RULES = [
  [KIND.none, /glow|_lit|lit_|lamp|visor|glass|_eye|hot|acid|ichor|crystal|amber|tl_cyan|water|lagoon/],
  [KIND.skin, /skin|lips/],
  [KIND.bark, /bark|trunk|w_dead/],
  [KIND.wood, /wood|crate|pole|ply/],
  [KIND.sand, /sand/],
  [KIND.soil, /dirt|mound|gravel|soil|mud|_pit/],
  [KIND.rock, /stone|rock|boulder|cliff|ruin|rubble/],
  [KIND.stone, /conc|soot|asphalt|hesco/],
  [KIND.grass, /lawn|grass|turf/],
  [KIND.foliage, /leaf|pine|jung|hedge|bloom|flower|fern|bush|moss|foliage/],
  [KIND.organic, /chitin|hide|bone|husk|maw|memb|scale|belly|wing|silk|shell_|molt_|tl_|e_m_|w_m_|cact|dead|deep|horn|ivory|hair|brow/],
  [KIND.fabric, /uniform|kit|armband|suit|coat|lining|strap|glove|c_cap|hivis|bag|flag|banner|leather|boots|jersey|cloth|canvas|tarp|tent|rope|sling/],
  [KIND.plain, /rubber|sole|tread|tyre|tire/],     // (GC 0.90: rubber is not painted, so it neither scratches nor chips)
];
// (GC 0.90) a model whose material is only a colour for the game to tint (white) says what it is by its own name: a rock is rock
const MODELS = [[KIND.soil, /crater/], [KIND.rock, /rock|spire|pillar|boulder/]];
export function kindOf(name, model = '') {
  const n = String(name || '').toLowerCase();
  for (const [k, re] of RULES) if (re.test(n)) return k;
  const m = String(model || '').toLowerCase();
  for (const [k, re] of MODELS) if (re.test(m)) return k;
  return KIND.hard;
}
// (GC 0.90) the sea: moving ripples that catch the light. The shared clock its material reads (a three.js material's built-in
// settings are copied when it is first drawn, so a clock has to be its own)
const CLOCK = { get value() { return (performance.now() / 1000) % 3600; } };
export function water(mat) {
  mat.defines = { ...(mat.defines || {}), GC_WATER: '' };
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = function (sh, r) { if (prev) prev.call(this, sh, r); sh.uniforms.gcTime = CLOCK; };
  mat.needsUpdate = true; return mat;
}

export function surf(mat, kind = KIND.plain, scale = null) {
  mat.defines = { ...(mat.defines || {}), GC_KIND: (+kind).toFixed(1), ...(scale != null ? { GC_SCALE: (+scale).toFixed(4) } : {}) }; mat.needsUpdate = true; return mat;
}
// A mode whose units are not metres (the base: about 3.1 m to a unit; the station: 9) tells every lit material in its scene, so
// a patch is the same size on a wall as on a coat. Only materials not yet told are changed (each is built again once). Cheap
// enough to run every second or so from a draw loop, which catches what is added later.
export function surfScale(scene, metres) {
  const v = (+metres).toFixed(4);
  scene.traverse((o) => {
    const ms = o.material; if (!ms) return;
    for (const m of Array.isArray(ms) ? ms : [ms]) {
      if (!m || !(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial) || (m.defines && m.defines.GC_SCALE)) continue;
      m.defines = { ...(m.defines || {}), GC_SCALE: v }; m.needsUpdate = true;
    }
  });
}
export function noSurf(mat) { mat.defines = { ...(mat.defines || {}), GC_NOSURF: '' }; mat.needsUpdate = true; return mat; }

// The detail picture (GC 0.90). three.js gives every material its own copy of a built-in shader's settings, textures included,
// so a texture changed after a material first drew would not reach it; this one's version counts every load, and every copy
// shares its pixels, so when the picture arrives each copy sends it again (one upload: they share one picture on the card).
const GCV = { v: 0 }, TN = 256, TL = 17;
class GcTex extends THREE.DataArrayTexture {
  get version() { return (this._gv || 0) + GCV.v; }
  set version(x) { this._gv = x - GCV.v; }
}
function detailTex() {
  const data = new Uint8Array(TN * TN * TL * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = 128; data[i + 1] = 128; data[i + 2] = 0; data[i + 3] = 255; }     // (flat and unworn until it loads)
  const t = new GcTex(data, TN, TN, TL);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  if (typeof Image === 'undefined') return t;     // (the whole-game checks run without a page: no picture to load)
  const img = new Image();
  img.onload = () => {
    try {
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
      const px = g.getImageData(0, 0, img.width, img.height).data;
      if (px.length !== data.length) return;
      data.set(px); GCV.v++; t.source.needsUpdate = true; detail.ready = true;
    } catch { /* (a page opened from disk cannot read its pictures back: surfaces stay as in 0.70) */ }
  };
  img.src = new URL('../assets/textures/detail.png', import.meta.url).href;
  return t;
}
export const detail = { ready: false, tex: null };

const C = THREE.ShaderChunk;
const OFF = (() => { try { return /[?&]surf=0/.test(location.search + (parent !== self ? parent.location.search : '')); } catch { return false; } })();     // (?surf=0: none of it, to compare or to rule it out)
if (!C.__gcSurf && !OFF) {
  C.__gcSurf = true;
  detail.tex = detailTex();
  for (const id of ['standard', 'physical', 'lambert', 'phong']) THREE.ShaderLib[id].uniforms.gcTex = { value: detail.tex };
  const LIT = '(defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )) && !defined( GC_NOSURF )';
  C.color_pars_vertex += `
#if ${LIT}
  varying vec3 vGcP; varying vec3 vGcN; varying float vGcK; varying float vGcH;
  attribute float aSurf; attribute vec3 aRest;
#endif`;
  // aSurf: 0 when the geometry has none (it reads as 0); else 64 + (32 if it carries aRest) + its kind
  C.begin_vertex += `
#if ${LIT}
{
  #ifndef GC_KIND
    #define GC_KIND 0.0
  #endif
  #ifndef GC_SCALE
    #define GC_SCALE 1.0
  #endif
  float gk = GC_KIND, gfile = 0.0;
  if (aSurf > 63.5) { float a = aSurf - 64.0; gfile = 1.0; if (a > 31.5) { a -= 32.0; gfile = 2.0; } gk = a; }
  vec3 gp = gfile > 1.5 ? aRest : position;
  mat4 gm = modelMatrix;
  #ifdef USE_INSTANCING
    gm = gm * instanceMatrix;
  #endif
  #if defined( USE_INSTANCING ) || defined( USE_COLOR )
    float gs = length(gm[0].xyz) * GC_SCALE;          // on the model: the pattern rides on it
    vGcP = gp * gs; vGcH = gfile > 0.5 ? gp.y * gs : 9.0; vGcN = normal;
    #ifndef USE_COLOR
      vGcP += gm[3].xyz * 0.37 * GC_SCALE;             // (built in code and stood about: each where it stands)
    #endif
  #else
    vec4 gw = gm * vec4(position, 1.0);               // built in code and never moving: the pattern is the world's
    vGcP = gw.xyz * GC_SCALE; vGcH = 9.0; vGcN = normalize(mat3(gm) * normal);
  #endif
  vGcK = gk;
}
#endif`;
  C.color_pars_fragment += `
#if ${LIT} && defined( OPAQUE ) && !defined( USE_MAP )
  #define GC_ON
#endif
#if defined( GC_ON ) || defined( GC_WATER )
  varying vec3 vGcP; varying vec3 vGcN; varying float vGcK; varying float vGcH;
#endif
#if defined( GC_ON ) || defined( GC_LAND ) || defined( GC_WATER )
  #define GC_TEX
  uniform highp sampler2DArray gcTex;
  #ifndef GC_SCALE
    #define GC_SCALE 1.0
  #endif
  float gcHt = 0.0, gcRough = 0.0;           // (for the light, below: the relief here in the scene's units, and how much rougher)
  // per KIND (plain, fabric, hard, organic, skin, none, stone, wood, soil, rock, bark, foliage, sand, snow, grass, regolith,
  // water): metres the picture spans; metres of relief from its lowest to its highest; how strongly it lightens and darkens;
  // how far its marked places (B) go: paint to bare metal, concrete spalled, lichen on rock, glints on snow, bare earth in grass
  const float GC_TILE[17] = float[17](2.0, 0.55, 1.4, 0.9, 0.4, 1.0, 1.8, 1.0, 2.4, 2.2, 0.9, 0.8, 1.6, 3.0, 0.9, 2.5, 6.0);
  const float GC_DEEP[17] = float[17](0.004, 0.006, 0.006, 0.014, 0.0015, 0.0, 0.03, 0.01, 0.035, 0.05, 0.025, 0.02, 0.02, 0.05, 0.025, 0.05, 0.04);
  const float GC_TONE[17] = float[17](1.1, 1.3, 1.1, 1.3, 0.8, 0.0, 1.5, 1.4, 1.3, 1.4, 1.5, 1.4, 1.1, 0.7, 1.3, 1.3, 0.0);
  const float GC_WEAR[17] = float[17](0.0, 0.5, 0.5, 0.3, 0.0, 0.0, 0.45, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.6, 0.6, 0.0, 0.0);
  // what a marked place becomes: bare metal; lichen; a glint of snow; bare earth between grass; else paler
  vec3 gcWorn(vec3 c, int ki, float grain) {
    float lum = dot(c, vec3(0.3, 0.59, 0.11));
    if (ki == 2) return vec3(0.46, 0.45, 0.43) * (0.85 + 0.3 * grain);
    if (ki == 9) return vec3(0.5, 0.52, 0.38) * (0.55 + 0.9 * lum);
    if (ki == 13) return c * 1.35 + 0.06;
    if (ki == 14) return vec3(0.33, 0.27, 0.19) * (0.7 + 0.8 * lum);
    return vec3(lum) * 1.22 + 0.03;
  }
  float gcHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float gcNoise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(gcHash(i), gcHash(i + vec3(1, 0, 0)), f.x), mix(gcHash(i + vec3(0, 1, 0)), gcHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(gcHash(i + vec3(0, 0, 1)), gcHash(i + vec3(1, 0, 1)), f.x), mix(gcHash(i + vec3(0, 1, 1)), gcHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  // the picture laid on from the three directions, each weighted by how squarely the surface faces it
  vec3 gcDetail(float k, vec3 p, vec3 n) {
    vec3 w = abs(n); w *= w; w *= w; w /= (w.x + w.y + w.z + 1e-5);
    return texture(gcTex, vec3(p.zy, k)).rgb * w.x + texture(gcTex, vec3(p.xz, k)).rgb * w.y + texture(gcTex, vec3(p.xy, k)).rgb * w.z;
  }
  // the land (a material defining GC_LAND calls this from its own shader), laid on from above: m where it is in metres, amt how
  // much (0 to 1), k its layer (LAND in surface.js: sand, snow, grass, regolith, else soil); k2 a second layer laid over it as
  // much as t (the base's painted sand or grass on its biome's own ground). Its relief catches the light like a model's.
  vec3 gcLand2(vec3 col, vec2 m, float amt, float k, float k2, float t) {
    int a = int(k + 0.5), b = int(k2 + 0.5);
    vec3 d = mix(texture(gcTex, vec3(m / GC_TILE[a], k)).rgb, texture(gcTex, vec3(m / GC_TILE[b], k2)).rgb, t);
    gcHt = (d.g - 0.5) * mix(GC_DEEP[a], GC_DEEP[b], t) * amt / GC_SCALE;
    col *= 1.0 + (d.r - 0.5) * mix(GC_TONE[a], GC_TONE[b], t) * amt;
    float wa = d.b * amt * (1.0 - t) * GC_WEAR[a], wb = d.b * amt * t * GC_WEAR[b];
    col = mix(col, gcWorn(col, a, 0.5), wa); return mix(col, gcWorn(col, b, 0.5), wb);
  }
  vec3 gcLand(vec3 col, vec2 m, float amt, float k) { return gcLand2(col, m, amt, k, k, 0.0); }
#endif
#ifdef GC_WATER
  uniform float gcTime;
#endif
#ifdef GC_ON
  vec3 gcSurface(vec3 c) {
    float k = clamp(floor(vGcK + 0.5), 0.0, 16.0); int ki = int(k);
    vec3 p = vGcP; vec3 n = normalize(vGcN);
    vec3 d = gcDetail(k, p / GC_TILE[ki], n);                            // (looked up before anything turns away: the light needs its slope)
    gcHt = (d.g - 0.5) * GC_DEEP[ki] / GC_SCALE;
    if (ki == 5) return c;                                               // a light, glass: as it is
    float blot = smoothstep(0.22, 0.78, gcNoise(p * 1.6) * 0.6 + gcNoise(p * 4.3 + 7.1) * 0.4);   // patches a hand or two across
    d.rb = mix(vec2(0.5, 0.0), d.rb, 0.55 + 0.9 * blot);                // (stronger in some patches than others, so the picture does not show its repeat)
    float grain = clamp(0.5 + (d.r - 0.5) * 3.0, 0.0, 1.0);
    float f = 1.0 + (d.r - 0.5) * GC_TONE[ki];
    if (ki == 0) f *= 0.95 + 0.09 * blot;                                // plain
    else if (ki == 1) f *= 0.9 + 0.13 * blot;                            // fabric: mottled
    else if (ki == 2) {                                                  // hard: streaks down the sides
      float streak = gcNoise(vec3(p.x * 6.0, p.y * 0.8, p.z * 6.0));
      f *= 0.92 + 0.08 * blot + 0.1 * streak * (1.0 - abs(n.y));
    }
    else if (ki == 3) f *= 0.8 + 0.26 * blot;                            // hide, chitin, leaves: blotched
    else if (ki == 4) f *= 0.98 + 0.03 * blot;                           // skin: hardly at all
    else if (ki == 6 || ki == 9) f *= 0.84 + 0.18 * blot;                // stone, concrete, rock
    else if (ki == 11 || ki == 14) f *= 0.82 + 0.24 * blot;              // leaves and grass: sun-faded and darker in patches
    else f *= 0.9 + 0.1 * blot;                                          // wood, bark, the ground's own
    c *= f;
    // marked places: paint scratched and chipped to bare metal (a little shinier), concrete spalled paler, cloth rubbed pale,
    // lichen on rock, glints on snow
    float wear = d.b * GC_WEAR[ki];
    c = mix(c, gcWorn(c, ki, grain), wear);
    gcRough = ki == 2 ? -0.3 * wear : ki == 13 ? -0.4 * wear : 0.25 * wear + 0.15 * clamp(0.5 - d.g, 0.0, 0.5);
    // dust: on what faces up, and (on a model) toward its feet; not on skin, leaves, grass or snow
    float lum = dot(c, vec3(0.3, 0.59, 0.11));
    float up = smoothstep(0.55, 0.95, n.y) * (ki == 4 || ki == 11 || ki == 13 || ki == 14 ? 0.0 : 0.06 + 0.12 * blot * grain);     // faces that look up: a little dulled and paled, in patches
    c = mix(c, vec3(lum) * 1.12 + vec3(0.012, 0.009, 0.005), up);
    float low = (1.0 - smoothstep(0.0, 0.38, vGcH)) * (0.12 + 0.22 * blot) * (ki == 3 ? 0.5 : 1.0);   // a model's feet: dust of the ground
    return mix(c, vec3(0.34, 0.29, 0.22) * (0.8 + 0.3 * grain) * (0.6 + 0.6 * lum), low);
  }
#endif`;
  C.color_fragment += `
#ifdef GC_ON
  diffuseColor.rgb = gcSurface(diffuseColor.rgb);
#endif
#ifdef GC_WATER
  {   // two copies of the ripples drifting across each other, turned and at different sizes: the sea never repeats the same way
    vec2 wm = vGcP.xz, w2 = mat2(0.8, 0.6, -0.6, 0.8) * wm;
    float h1 = texture(gcTex, vec3(wm / GC_TILE[16] + vec2(0.021, 0.013) * gcTime, 16.0)).g;
    float h2 = texture(gcTex, vec3(w2 / (GC_TILE[16] * 0.61) - vec2(0.017, -0.026) * gcTime, 16.0)).g;
    gcHt = (h1 + h2 - 1.0) * GC_DEEP[16] / GC_SCALE;
  }
#endif`;
  // the relief catches the light: the surface's normal is tipped by how the height changes across the pixel (as three.js does
  // for a bump map, but in the scene's own units, so the relief is as deep near as far)
  C.normal_fragment_maps += `
#ifdef GC_TEX
{
  vec2 gdh = vec2(dFdx(gcHt), dFdy(gcHt));
  vec3 gsx = dFdx(-vViewPosition), gsy = dFdy(-vViewPosition);
  vec3 gr1 = cross(gsy, normal), gr2 = cross(normal, gsx);
  float gdet = dot(gsx, gr1) * faceDirection;
  vec3 gg = sign(gdet) * (gdh.x * gr1 + gdh.y * gr2);
  normal = normalize(max(abs(gdet), 1e-14) * normal - gg);
}
#endif`;
  C.roughnessmap_fragment += `
#ifdef GC_TEX
  roughnessFactor = clamp(roughnessFactor + gcRough, 0.04, 1.0);
#endif`;
}
