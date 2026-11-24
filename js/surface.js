// SURFACE DETAIL (GC 0.70, Ramzies: "add some texture to things"). Every lit 3D surface in the game is given a little texture
// by the graphics card, with no pictures to load: fabric is mottled with a fine grain, painted metal and plastic is streaked down
// its sides and chipped, a creature's hide is blotched, stone and concrete are pitted, wood is grained, and everything is
// dustier toward the ground and on the faces that look up. Lights, glass, see-through things and anything already painted from
// a picture (the land, planets, signs) are left as they are.
//
// How: three.js's shared shader pieces are extended once, when this file is first imported, so every Lambert, Phong and Standard
// material picks it up. A material can say what it is made of (`surf(mat, kind)`) or opt out (`noSurf(mat)`); a model file from
// Blender says it for each triangle (attribute aSurf, set in model3d.js from its material names) and carries where each corner
// stands at rest (aRest), so the pattern stays on the body as it walks instead of sliding over it.
//   Patterns are worked out where the surface is on the model (a figure, a vehicle, a building from a model file) or, for things
//   built in the game's code, where it is in the world (a base's walls never move). GC_SCALE: metres in one unit of that space.
import * as THREE from './vendor/three.js';

export const KIND = { plain: 0, fabric: 1, hard: 2, organic: 3, skin: 4, none: 5, stone: 6, wood: 7 };

// What a Blender model's material is made of, by its name (tools/blender: c_ people, e_ enemies, s_ sites, v_ vehicles, w_ world ...)
const RULES = [
  [KIND.none, /glow|_lit|lit_|lamp|visor|glass|_eye|hot|acid|ichor|crystal|amber|tl_cyan/],
  [KIND.skin, /skin/],
  [KIND.wood, /wood|bark|crate|pole|ply/],
  [KIND.stone, /conc|stone|dirt|soot|gravel|sand|mound/],
  [KIND.organic, /chitin|hide|bone|husk|maw|memb|scale|belly|wing|silk|shell_|molt_|tl_|e_m_|leaf|cact|jung|pine|flower|dead|deep|horn|ivory|hair/],
  [KIND.fabric, /uniform|kit|armband|suit|coat|lining|strap|glove|c_cap|hivis|bag|flag|leather|boots|jersey|cloth/],
];
export function kindOf(name) {
  const n = String(name || '').toLowerCase();
  for (const [k, re] of RULES) if (re.test(n)) return k;
  return KIND.hard;
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

const C = THREE.ShaderChunk;
const OFF = (() => { try { return /[?&]surf=0/.test(location.search + (parent !== self ? parent.location.search : '')); } catch { return false; } })();     // (?surf=0: none of it, to compare or to rule it out)
if (!C.__gcSurf && !OFF) {
  C.__gcSurf = true;
  const LIT = '(defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )) && !defined( GC_NOSURF )';
  C.color_pars_vertex += `
#if ${LIT}
  varying vec3 vGcP; varying vec3 vGcN; varying float vGcK; varying float vGcH;
  attribute float aSurf; attribute vec3 aRest;
#endif`;
  // aSurf: 0 when the geometry has none (it reads as 0); else 32 + (16 if it carries aRest) + its kind
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
  if (aSurf > 31.5) { float a = aSurf - 32.0; gfile = 1.0; if (a > 15.5) { a -= 16.0; gfile = 2.0; } gk = a; }
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
  varying vec3 vGcP; varying vec3 vGcN; varying float vGcK; varying float vGcH;
  float gcHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float gcNoise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(gcHash(i), gcHash(i + vec3(1, 0, 0)), f.x), mix(gcHash(i + vec3(0, 1, 0)), gcHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(gcHash(i + vec3(0, 0, 1)), gcHash(i + vec3(1, 0, 1)), f.x), mix(gcHash(i + vec3(0, 1, 1)), gcHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  vec3 gcSurface(vec3 c) {
    float k = floor(vGcK + 0.5);
    if (k > 4.5 && k < 5.5) return c;                                   // a light, glass: as it is
    vec3 p = vGcP; vec3 n = normalize(vGcN);
    float blot = smoothstep(0.22, 0.78, gcNoise(p * 1.6) * 0.6 + gcNoise(p * 4.3 + 7.1) * 0.4);   // patches a hand or two across
    float grain = smoothstep(0.15, 0.85, gcNoise(p * 14.0 + 3.3));                              // a few centimetres
    float f = 1.0;
    if (k < 0.5) f = 0.93 + 0.1 * blot + 0.04 * grain;                   // plain
    else if (k < 1.5) f = 0.88 + 0.13 * blot + 0.1 * grain;              // fabric: mottled, a weave's grain
    else if (k < 2.5) {                                                  // hard: streaks down the sides, chips where it is knocked
      float streak = gcNoise(vec3(p.x * 6.0, p.y * 0.8, p.z * 6.0));
      f = 0.9 + 0.08 * blot + 0.1 * streak * (1.0 - abs(n.y));
      f *= 1.0 + 0.22 * smoothstep(0.82, 0.9, gcNoise(p * 22.0 + 1.7));
    }
    else if (k < 3.5) f = 0.78 + 0.3 * blot + 0.12 * grain;              // hide, chitin, leaves: blotched
    else if (k < 4.5) f = 0.98 + 0.03 * blot;                            // skin: hardly at all
    else if (k < 6.5) f = 0.8 + 0.18 * blot + 0.16 * grain;              // stone, concrete, earth: pitted
    else f = 0.86 + 0.1 * blot + 0.14 * gcNoise(vec3(p.x * 3.0, p.y * 26.0, p.z * 3.0));   // wood: grain along it
    c *= f;
    // dust: on what faces up, and (on a model) toward its feet
    float lum = dot(c, vec3(0.3, 0.59, 0.11));
    float up = smoothstep(0.55, 0.95, n.y) * (k > 3.5 && k < 4.5 ? 0.0 : 0.06 + 0.12 * blot * grain);     // faces that look up: a little dulled and paled, in patches
    c = mix(c, vec3(lum) * 1.12 + vec3(0.012, 0.009, 0.005), up);
    float low = (1.0 - smoothstep(0.0, 0.38, vGcH)) * (0.12 + 0.22 * blot) * (k > 2.5 && k < 3.5 ? 0.5 : 1.0);   // a model's feet: dust of the ground
    return mix(c, vec3(0.34, 0.29, 0.22) * (0.8 + 0.3 * grain) * (0.6 + 0.6 * lum), low);
  }
#endif`;
  C.color_fragment += `
#if ${LIT} && defined( OPAQUE ) && !defined( USE_MAP )
  diffuseColor.rgb = gcSurface(diffuseColor.rgb);
#endif`;
}
