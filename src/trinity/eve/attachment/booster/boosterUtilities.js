// Source: trinity/trinity/Eve/SpaceObject/Utils/EveBoosterUtilities.h
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveBoosterUtilities.cpp
//
// Shared booster helpers used by EveBoosterSet2 (attachment side) and
// EveChildBoosterSet (child side). Carbon keeps these as free functions in
// Eve/SpaceObject/Utils/; the runtime has no utils grab-bag, so they live
// with the booster family they serve.
//
// The light-flicker noise table is a LAZY module singleton on purpose: it
// matches Carbon's function-local-static initialization semantics
// (EveBoosterUtilities.cpp:139-146) - do not "fix" it into an eager init or
// a per-set table.
import { vec3 } from "#math/vec3";

const LIGHT_NOISE_SIZE = 128;
const LIGHT_NOISE = new Float32Array(LIGHT_NOISE_SIZE);
let lightNoiseInitialized = false;

const FLARE_POSITION_SCRATCH = vec3.create();
const FLARE_DIRECTION_SCRATCH = vec3.create();
const FLARE_SPRITE_SCRATCH = vec3.create();
const LIGHT_POSITION_SCRATCH = vec3.create();
const LIGHT_COLOR_SCRATCH = new Float32Array(4);

// The shared procedural vertex-buffer identities and CPU vertex data
// (EveBoosterUtilities.cpp:23-104). Buffer allocation/upload is backend
// work; only the names and the authored vertices are CPU truth. The box is
// 6 quads of 4 vertices (position only); the star is 4 crossed quads with
// texcoords. Carbon's non-child box variant shares these positions and
// leaves its texcoords uninitialized.
export const CHILD_BOOSTER_BOX_BUFFER_NAME = "ChildBoosterBoxVB";
export const BOOSTER_BOX_BUFFER_NAME = "BoosterBoxVB";
export const BOOSTER_STAR_BUFFER_NAME = "BoosterStarVB";

export const BOOSTER_BOX_POSITIONS = Object.freeze([
  -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0,
  -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1,
  -1, -1, 0, -1, 1, 0, -1, 1, -1, -1, -1, -1,
  1, -1, 0, 1, -1, -1, 1, 1, -1, 1, 1, 0,
  -1, -1, 0, -1, -1, -1, 1, -1, -1, 1, -1, 0,
  -1, 1, 0, 1, 1, 0, 1, 1, -1, -1, 1, -1
]);

/** The star buffer's 16 vertices as [x, y, z, u, v] tuples (cpp:62-89). */
export const BOOSTER_STAR_VERTICES = Object.freeze((() =>
{
  const vertices = [];
  for (let index = 0; index < 16; index += 4)
  {
    const t = (index * Math.PI) / 16;
    const x = Math.cos(t) * 0.5;
    const y = Math.sin(t) * 0.5;
    vertices.push(-x, -y, 0, 1, 1);
    vertices.push(-x, -y, -1, 1, 0);
    vertices.push(x, y, -1, 0, 0);
    vertices.push(x, y, 0, 0, 1);
  }
  return vertices;
})());

/**
 * Adds the three flare sprites Carbon authors per booster - the glow, the
 * symmetric halo and the separately scaled X/Y halo - placed at increasing
 * distances back along the booster's -Z axis and sharing one random blink
 * seed; the axis is shortened for boosters below scale 3
 * (EveBoosterUtilities.cpp:106-131).
 *
 * @param {Object} glows - the EveSpriteSet receiving the flares
 * @param {Float32Array} transform - the booster's local transform
 * @param {Object} params - {glowScale, glowColor, warpGlowColor,
 *   symHaloScale, haloScaleX, haloScaleY, haloColor, warpHaloColor}
 */
export function CreateBoosterFlares(glows, transform, params)
{
  vec3.set(FLARE_POSITION_SCRATCH, transform[12], transform[13], transform[14]);
  vec3.set(FLARE_DIRECTION_SCRATCH, transform[8], transform[9], transform[10]);
  const scale = Math.max(
    Math.hypot(transform[0], transform[1], transform[2]),
    Math.hypot(transform[4], transform[5], transform[6])
  );
  // Carbon normalizes unconditionally; a zero direction is kept zero here
  // rather than going NaN (established adaptation).
  if (vec3.squaredLength(FLARE_DIRECTION_SCRATCH))
  {
    vec3.normalize(FLARE_DIRECTION_SCRATCH, FLARE_DIRECTION_SCRATCH);
  }
  if (scale < 3)
  {
    vec3.scale(FLARE_DIRECTION_SCRATCH, FLARE_DIRECTION_SCRATCH, scale / 3);
  }

  const seed = Math.random() * 0.7;
  AddBoosterFlare(glows, FLARE_POSITION_SCRATCH, FLARE_DIRECTION_SCRATCH, 2.5, seed, seed,
    scale * params.glowScale, scale * params.glowScale, params.glowColor, params.warpGlowColor);
  AddBoosterFlare(glows, FLARE_POSITION_SCRATCH, FLARE_DIRECTION_SCRATCH, 3, seed, 1 + seed,
    scale * params.symHaloScale, scale * params.symHaloScale, params.haloColor, params.warpHaloColor);
  AddBoosterFlare(glows, FLARE_POSITION_SCRATCH, FLARE_DIRECTION_SCRATCH, 3.01, seed, 1 + seed,
    scale * params.haloScaleX, scale * params.haloScaleY, params.haloColor, params.warpHaloColor);
}

/** Adds one flare sprite offset back along the booster direction. */
function AddBoosterFlare(glows, position, direction, distance, blinkRate, blinkPhase, minScale, maxScale, color, warpColor)
{
  vec3.scaleAndAdd(FLARE_SPRITE_SCRATCH, position, direction, -distance);
  glows.Add(FLARE_SPRITE_SCRATCH, blinkRate, blinkPhase, minScale, maxScale, 0, color, warpColor);
}

/**
 * The flicker factor for one booster light at one time
 * (EveBoosterUtilities.cpp:148-163): two noise samples around the phased
 * time, lerped with C truncation (Math.trunc, not floor) picking the
 * samples, spanning [1 - amplitude, 1 + amplitude].
 */
export function ComputeBoosterLightFlicker(phase, amplitude, frequency, animationTime)
{
  if (!lightNoiseInitialized)
  {
    lightNoiseInitialized = true;
    for (let index = 0; index < LIGHT_NOISE_SIZE; index++)
    {
      LIGHT_NOISE[index] = Math.random();
    }
  }
  const phased = (phase + animationTime) * frequency;
  const p0 = LIGHT_NOISE[Math.trunc(phased) % LIGHT_NOISE_SIZE];
  const p1 = LIGHT_NOISE[(Math.trunc(phased) + 1) % LIGHT_NOISE_SIZE];
  const t = phased - Math.floor(phased);
  return 1 + amplitude * 2 * (p0 * (1 - t) + p1 * t) - amplitude;
}

/** A random flicker phase spread over the whole noise table (cpp:165-168). */
export function GenerateBoosterLightPhase()
{
  return LIGHT_NOISE_SIZE * Math.random();
}

/**
 * Adds one point light per booster item (EveBoosterUtilities.h:46-67): the
 * radius and colour blend from normal to warp values by warpIntensity,
 * scale by the set intensity, and flicker per item. Carbon reads the
 * animation clock from the renderer global; callers thread it explicitly.
 *
 * @param {Object} lightManager - duck with AddPointLight(position, radius, color)
 * @param {Iterable} items - records with lightPhase, lightPosition, lightRadius
 * @param {Float32Array} transform - lifts item light positions to world
 * @param {Number} intensity - the set's overall intensity
 * @param {Number} warpIntensity - 0..1 warp blend
 * @param {Object} params - {lightRadius, lightColor, lightWarpRadius,
 *   lightWarpColor, lightFlickerAmplitude, lightFlickerFrequency}
 * @param {Number} animationTime - the frame's animation clock
 */
export function AddBoosterLights(lightManager, items, transform, intensity, warpIntensity, params, animationTime)
{
  const warp = Math.min(Math.max(warpIntensity, 0), 1);
  let radiusFactor = params.lightRadius * (1 - warp) + params.lightWarpRadius * warp;
  radiusFactor *= intensity;
  for (let channel = 0; channel < 4; channel++)
  {
    LIGHT_COLOR_SCRATCH[channel] =
      params.lightColor[channel] * (1 - warp) + params.lightWarpColor[channel] * warp;
  }
  for (const item of items)
  {
    const flicker = ComputeBoosterLightFlicker(
      item.lightPhase, params.lightFlickerAmplitude, params.lightFlickerFrequency, animationTime);
    vec3.transformMat4(LIGHT_POSITION_SCRATCH, item.lightPosition, transform);
    lightManager.AddPointLight(
      LIGHT_POSITION_SCRATCH,
      item.lightRadius * radiusFactor,
      [
        LIGHT_COLOR_SCRATCH[0] * flicker,
        LIGHT_COLOR_SCRATCH[1] * flicker,
        LIGHT_COLOR_SCRATCH[2] * flicker,
        LIGHT_COLOR_SCRATCH[3] * flicker
      ]
    );
  }
}

/**
 * Pads a booster set's exact exhaust-point bounding sphere to contain the
 * glow (EveBoosterUtilities.cpp:170-181). The ORDER is load-bearing: offset
 * the LOCAL centre back along -Z by half the ORIGINAL radius, THEN transform
 * the centre, THEN write w as twice the ORIGINAL radius.
 *
 * @param {Float32Array} out - vec4 receiving the padded world sphere
 * @param {Float32Array} boosterBoundingSphere - the exact local sphere
 * @param {Float32Array} transform - lifts the centre to world space
 * @returns {Float32Array} out
 */
export function PadBoosterBoundingSphere(out, boosterBoundingSphere, transform)
{
  const radius = boosterBoundingSphere[3];
  vec3.set(FLARE_POSITION_SCRATCH,
    boosterBoundingSphere[0],
    boosterBoundingSphere[1],
    boosterBoundingSphere[2] - 0.5 * radius);
  vec3.transformMat4(FLARE_POSITION_SCRATCH, FLARE_POSITION_SCRATCH, transform);
  out[0] = FLARE_POSITION_SCRATCH[0];
  out[1] = FLARE_POSITION_SCRATCH[1];
  out[2] = FLARE_POSITION_SCRATCH[2];
  out[3] = 2 * radius;
  return out;
}
