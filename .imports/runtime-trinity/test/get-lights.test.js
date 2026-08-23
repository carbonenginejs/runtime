// The GetLights family: the LightData->PerLightData conversion core
// (Tr2Light.cpp:37-80), Tr2Light::AddLight/SetBoneMatrix (cpp:98-149), the
// blink/fade/saturate helpers (EveSpaceObjectAttachmentUtils.cpp:9-75,
// Color_inline.h:161-172), the packed-set UpdateLights/GetLights pairs
// (EveSpriteSet.cpp:142-161/454-469, EveHazeSet.cpp:219-239/403-418,
// EveSpotlightSet.cpp:150-170/536-552, EvePlaneSet.cpp:248-267/544-568,
// EveBannerSet.cpp:164-183/466-491), EveBoosterSet2::GetLights
// (cpp:1287-1319), and the owner loops (EveSpaceObject2.cpp:3536-3555,
// EveChildMesh.cpp:1638-1652).
import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import {
  AsPerPointLightData,
  AsPerSpotLightData,
  Blink,
  CreateLightRecord,
  EveBannerSet,
  EveBoosterSet2,
  EveHazeSet,
  EvePlaneSet,
  EveSpaceObject2,
  EveSpotlightSet,
  EveSpriteSet,
  Fade,
  FadeType,
  MatrixCopyFrom3x4,
  Saturate,
  ShadowQuality,
  Tr2PointLight
} from "../npm/dist/index.js";


const EPSILON = 1e-5;

function assertClose(actual, expected, message, epsilon = EPSILON)
{
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${message}: expected ${expected}, got ${actual}`
  );
}

function assertVecClose(actual, expected, message, epsilon = EPSILON)
{
  for (let index = 0; index < expected.length; index++)
  {
    assertClose(actual[index], expected[index], `${message}[${index}]`, epsilon);
  }
}

/** A copying light-manager duck (Carbon's AddLight copies by value; the JS
 * records are scratch). */
function MakeLightManager({ shadowQuality = 0, animationTime = 0 } = {})
{
  const added = [];
  const points = [];
  return {
    added,
    points,
    GetCurrentSpaceSceneShadowQuality: () => shadowQuality,
    GetAnimationTime: () => animationTime,
    AddLight(record)
    {
      added.push({
        position: Array.from(record.position),
        direction: Array.from(record.direction),
        color: Array.from(record.color),
        radius: record.radius,
        innerRadius: record.innerRadius,
        flags: record.flags,
        outerAngle: record.outerAngle,
        innerAngle: record.innerAngle,
        lightProfile: record.lightProfile,
        lightType: record.lightType,
        owner: record.owner
      });
    },
    AddPointLight(position, radius, color)
    {
      points.push({ position: Array.from(position), radius, color: Array.from(color) });
    }
  };
}

function MakeLightData(overrides = {})
{
  return {
    position: [1, 2, 3],
    color: [0.5, 0.25, 1, 1],
    brightness: 2,
    radius: 10,
    innerRadius: 4,
    rotation: [0, 0, 0, 1],
    outerAngle: 60,
    innerAngle: 30,
    flags: 1,
    castsShadows: 0,
    isVolumetric: false,
    boneIndex: -1,
    ...overrides
  };
}

test("AsPerPointLightData: swapped rotation composition, scaling, shadow/volumetric flags (Tr2Light.cpp:37-69)", () =>
{
  const record = CreateLightRecord();
  const transform = mat4.create();
  mat4.translate(transform, transform, [10, 20, 30]);
  mat4.rotateY(transform, transform, 0.7);
  const rotation = new Float32Array(4);
  // An arbitrary rotation quat (about X by 0.4).
  rotation[0] = Math.sin(0.2);
  rotation[3] = Math.cos(0.2);

  const lightData = MakeLightData({ rotation });
  const features = { parentBrightness: 3, parentScale: 2 };
  AsPerPointLightData(record, lightData, transform, features, ShadowQuality.SHADOW_DISABLED);

  // color = rgb * brightness * parentBrightness.
  assertVecClose(record.color, [0.5 * 6, 0.25 * 6, 1 * 6], "composed color");
  assertClose(record.radius, 20, "radius * parentScale");
  assertClose(record.innerRadius, 8, "innerRadius * parentScale");
  // position = TransformCoord(position, transform).
  const expectedPosition = vec3.transformMat4(vec3.create(), [1, 2, 3], transform);
  assertVecClose(record.position, expectedPosition, "transformed position");
  // Carbon: RotationMatrix(rotation) * transform (rotation FIRST) - the gl
  // expression is multiply(LR, transform, R); direction = -basis Z of LR.
  const rotationMatrix = mat4.fromQuat(mat4.create(), rotation);
  const lightRotation = mat4.multiply(mat4.create(), transform, rotationMatrix);
  const expectedDirection = vec3.normalize(vec3.create(),
    [-lightRotation[8], -lightRotation[9], -lightRotation[10]]);
  assertVecClose(record.direction, expectedDirection, "swapped-composition direction");
  assertClose(record.projectionPlaneDistance, 1, "1/tan(45deg) = 1");
  assert.equal(record.flags, 1, "no shadow flag at DISABLED");

  // Shadow flag matrix (cpp:62-65).
  AsPerPointLightData(record, MakeLightData({ castsShadows: 2 }), transform, features, ShadowQuality.SHADOW_DISABLED);
  assert.equal(record.flags & 4, 4, "ALWAYS_ENABLED casts");
  AsPerPointLightData(record, MakeLightData({ castsShadows: 1 }), transform, features, ShadowQuality.SHADOW_HIGH);
  assert.equal(record.flags & 4, 4, "HIGH-quality-only casts at SHADOW_HIGH");
  AsPerPointLightData(record, MakeLightData({ castsShadows: 1 }), transform, features, ShadowQuality.SHADOW_LOW);
  assert.equal(record.flags & 4, 0, "HIGH-quality-only does not cast at SHADOW_LOW");
  AsPerPointLightData(record, MakeLightData({ isVolumetric: true }), transform, features, 0);
  assert.equal(record.flags & 8, 8, "volumetric flag");
});

test("AsPerSpotLightData: cos-of-degree angles and 1/tan projection distance (Tr2Light.cpp:71-80)", () =>
{
  const record = CreateLightRecord();
  AsPerSpotLightData(record, MakeLightData(), mat4.create(), { parentBrightness: 1, parentScale: 1 }, 0);
  assertClose(record.outerAngle, Math.cos(Math.PI / 3), "cos(60deg)");
  assertClose(record.innerAngle, Math.cos(Math.PI / 6), "cos(30deg)");
  assertClose(record.projectionPlaneDistance, 1 / Math.tan(Math.PI / 3), "1/tan(60deg)");

  AsPerSpotLightData(record, MakeLightData({ outerAngle: 0 }), mat4.create(), { parentBrightness: 1, parentScale: 1 }, 0);
  assert.equal(record.projectionPlaneDistance, Infinity, "outerAngle 0 ships Infinity, as Carbon does");
});

test("Tr2Light.AddLight: flag validity, UNDEFINED inertness, bone*transform swap, sticky bone (Tr2Light.cpp:98-149)", () =>
{
  const light = new Tr2PointLight();
  light.SetLightData({ position: [1, 0, 0], radius: 5, brightness: 1, color: [1, 1, 1, 1], flags: 1, boneIndex: 0 });
  const manager = MakeLightManager();

  // Invalid flags (neither surfaces nor particles) submit nothing (cpp:126).
  light.SetLightData({ flags: 4 });
  light.AddLight(manager, mat4.create(), 1);
  assert.equal(manager.added.length, 0, "invalid flags gate");
  light.SetLightData({ flags: 1 });

  // Bone 0 CAN drive a Tr2Light (>= 0, cpp:100 - contrast the packed sets).
  // Packed Float4x3, stride 12: identity basis + translation (7, 8, 9).
  const bones = new Float32Array([1, 0, 0, 7, 0, 1, 0, 8, 0, 0, 1, 9]);
  const parent = mat4.fromTranslation(mat4.create(), [100, 0, 0]);
  light.AddLight(manager, parent, 1, bones, 1);
  assert.equal(manager.added.length, 1, "point light submitted");
  // Carbon: boneTransform * transform (bone FIRST): position (1,0,0) ->
  // bone -> (8, 8, 9) -> parent -> (108, 8, 9).
  assertVecClose(manager.added[0].position, [108, 8, 9], "bone-first composition");

  // Sticky bone (cpp:98-106 quirk): no bones supplied keeps the previous.
  light.AddLight(manager, parent, 1, null, 0);
  assertVecClose(manager.added[1].position, [108, 8, 9], "boneTransform is sticky");

  // UNDEFINED_LIGHT submits nothing (cpp:139-148).
  const inert = new Tr2PointLight();
  inert.SetLightData({ flags: 1 });
  inert.type = 0;
  inert.AddLight(manager, mat4.create(), 1);
  assert.equal(manager.added.length, 2, "UNDEFINED_LIGHT is silently inert");
});

test("Blink/Fade quirks: zero rate, tiny-rate peak, phase asymmetry (EveSpaceObjectAttachmentUtils.cpp:9-75)", () =>
{
  assertClose(Blink(123, 0, 0.5, 3, 9), 3, "zero rate returns minScale");
  // rate 1: peak = 0.05; f = 0.025 -> ramp 0.5 -> lerp(2, 10) midpoint = 6.
  assertClose(Blink(0.025, 1, 0, 2, 10), 6, "ramp-up midpoint");
  // f past 4*peak: 0 -> minScale.
  assertClose(Blink(0.5, 1, 0, 2, 10), 2, "off after the flash window");
  // Tiny rate: peak = 0.05*0.001 < 0.0001 -> peak becomes 1 (one full ramp).
  assertClose(Blink(500, 0.001, 0, 0, 1), 0.5, "tiny-rate degenerate full-cycle ramp");

  // FadeIn adds phase BEFORE the rate multiply; Blink adds it after.
  assertClose(Fade(1, FadeType.FT_FADEIN, 0.25, 1), 0.5, "FadeIn((t+phase)*rate)");
  assertClose(Fade(0, FadeType.FT_NONE, 5, 5), 1, "FT_NONE full intensity");
  assertClose(Fade(0, FadeType.FT_FADEOUT, 0.25, 1), 1 - 0.25, "FadeOut complement");
});

test("Saturate: passthrough, extrapolation above 1, low-side clamp (Color_inline.h:161-172)", () =>
{
  const out = new Float32Array(4);
  Saturate(out, [0.2, 0.4, 0.8, 0.5], 1);
  assertVecClose(out, [0.2, 0.4, 0.8, 0.5], "saturation 1 passthrough");

  const gray = 0.2 * 0.299 + 0.4 * 0.587 + 0.8 * 0.114;
  Saturate(out, [0.2, 0.4, 0.8, 0.5], 0);
  assertVecClose(out, [gray, gray, gray, 0.5], "saturation 0 is the luma gray");

  Saturate(out, [0.2, 0.4, 0.8, 0.5], 2);
  assertClose(out[0], gray + (0.2 - gray) * 2, "saturation above 1 extrapolates");

  Saturate(out, [0.2, 0.4, 0.8, 0.5], -5);
  assertVecClose(out, [gray, gray, gray, 0.5], "negative clamps to the gray");
});

test("Packed-set UpdateLights: bone-0 exclusion, bone*parent swap, black-until-updated (EveSpriteSet.cpp:142-161)", () =>
{
  const set = new EveSpriteSet();
  set.AddLightFromSOF({ lightData: { boneIndex: 0, brightness: 1, color: [1, 1, 1, 1], radius: 5, flags: 1, position: [0, 0, 0] } });
  set.AddLightFromSOF({ lightData: { boneIndex: 1, brightness: 1, color: [1, 1, 1, 1], radius: 5, flags: 1, position: [0, 0, 0] } });

  // Two packed bones (stride 12): bone 0 translation (9,9,9), bone 1 (1, 2, 3).
  const bones = new Float32Array([
    1, 0, 0, 9, 0, 1, 0, 9, 0, 0, 1, 9,
    1, 0, 0, 1, 0, 1, 0, 2, 0, 0, 1, 3
  ]);
  const parent = mat4.create();
  mat4.translate(parent, parent, [5, 6, 7]);
  mat4.rotateY(parent, parent, Math.PI / 2);

  set.UpdateLights(parent, bones, 2, 2, 0);

  // boneIndex 0 can NEVER drive a packed-set light (> 0, not >= 0):
  // boneMatrix = parentTransform verbatim.
  assert.ok(mat4.equals(set.lights[0].boneMatrix, parent), "bone 0 falls back to the parent");
  // boneIndex 1: bone applies FIRST (row-vector bone * parent): translation
  // (1,2,3) rotated by Y90 -> (3, 2, -1), plus (5,6,7) -> (8, 8, 6).
  const bm = set.lights[1].boneMatrix;
  assertVecClose([bm[12], bm[13], bm[14]], [8, 8, 6], "bone-first composition");

  // Before UpdateLights the activation strength is 0 (Carbon ctor) - lights
  // submit BLACK; after, parentBrightness = 2.
  const manager = MakeLightManager();
  set.GetLights(manager);
  assertVecClose(manager.added[0].color, [2, 2, 2], "activation strength 2 composed");
});

test("EveHazeSet/EveSpotlightSet: boosterGainInfluence multiply and the spot conversion (cpp:403-418, 536-552)", () =>
{
  const haze = new EveHazeSet();
  haze.lights.push(
    { lightData: MakeLightData({ brightness: 1, color: [1, 1, 1, 1] }), boneMatrix: mat4.create(), boosterGainInfluence: false, lightProfile: null },
    { lightData: MakeLightData({ brightness: 1, color: [1, 1, 1, 1] }), boneMatrix: mat4.create(), boosterGainInfluence: true, lightProfile: null }
  );
  haze.UpdateLights(mat4.create(), null, 0, 2, 0.5);
  const hazeManager = MakeLightManager();
  haze.GetLights(hazeManager);
  assertVecClose(hazeManager.added[0].color, [2, 2, 2], "no booster influence: activation only");
  assertVecClose(hazeManager.added[1].color, [1, 1, 1], "booster influence: activation * gain");

  const spots = new EveSpotlightSet();
  spots.lights.push({ lightData: MakeLightData({ brightness: 1 }), boneMatrix: mat4.create(), boosterGainInfluence: false, lightProfile: null });
  spots.UpdateLights(mat4.create(), null, 0, 1, 0);
  const spotManager = MakeLightManager();
  spots.GetLights(spotManager);
  assertClose(spotManager.added[0].outerAngle, Math.cos(Math.PI / 3), "spot cos(60deg)");
  assert.equal(spotManager.added[0].lightType, 2, "SPOT_LIGHT record");
});

test("EvePlaneSet: average-color multiply, saturate, fade - stored items unmutated (cpp:544-568)", () =>
{
  const planes = new EvePlaneSet();
  planes.imageMapParameter = { GetResource: () => ({ GetAverageColor: () => [0.5, 0.5, 0.5, 1] }) };
  // The other three maps default to white (missing resource).
  const authored = MakeLightData({ brightness: 2, color: [1, 0.5, 0.25, 1], fadeType: 0 });
  planes.lights.push({
    lightData: authored,
    boneMatrix: mat4.create(),
    saturation: 1,
    fadeType: FadeType.FT_NONE,
    blinkRate: 0,
    blinkPhase: 0,
    lightProfile: null
  });
  planes.UpdateLights(mat4.create(), null, 0, 1, 0);
  const manager = MakeLightManager();
  planes.GetLights(manager);
  // color = authored * average (0.5) * brightness 2 * activation 1.
  assertVecClose(manager.added[0].color, [1, 0.5, 0.25], "average-color multiply");
  assertVecClose(authored.color, [1, 0.5, 0.25, 1], "stored light data NOT mutated");
});

test("EveBannerSet: color REPLACED by the saturated average, zero-alpha and display gates (cpp:466-491)", () =>
{
  const banners = new EveBannerSet();
  banners.lights.push({
    lightData: MakeLightData({ brightness: 1, color: [9, 9, 9, 9] }),
    boneMatrix: mat4.create(),
    saturation: 1,
    lightProfile: null
  });
  banners.UpdateLights(mat4.create(), null, 0, 1, 0);

  const gated = MakeLightManager();
  banners.display = false;
  banners.GetLights(gated);
  assert.equal(gated.added.length, 0, "display gate (the only packed set with one)");

  banners.display = true;
  banners.GetLights(gated);
  assert.equal(gated.added.length, 0, "missing texture -> zero alpha -> nothing");

  banners.primaryTextureParameter = { GetResource: () => ({ GetAverageColor: () => [0.25, 0.5, 0.75, 1] }) };
  const manager = MakeLightManager();
  banners.GetLights(manager);
  // The authored (9,9,9) is REPLACED by the average, not multiplied.
  assertVecClose(manager.added[0].color, [0.25, 0.5, 0.75], "authored color replaced");
});

test("EveBoosterSet2.GetLights: radius/intensity gates, warp blend, flicker, transformed positions (cpp:1287-1319)", () =>
{
  const boosters = new EveBoosterSet2();
  const manager = MakeLightManager({ animationTime: 0 });

  boosters.GetLights(manager);
  assert.equal(manager.points.length, 0, "zero radii gate");

  boosters.lightRadius = 2;
  boosters.lightColor.set([1, 0.5, 0.25, 1]);
  boosters.lightFlickerAmplitude = 0; // flicker collapses to exactly 1
  // Duck the renderable surface the method reads.
  const parentTransform = mat4.fromTranslation(mat4.create(), [100, 0, 0]);
  boosters.instances.length = 0;
  boosters.instances.push({ overallIntensity: 0.5, GetParentTransform: () => parentTransform });
  // One single booster: unit basis (scale 1), local light at (1, 2, 3)
  // (lightOffset 0), lightScale 1 -> booster lightRadius 1.
  boosters.Add(mat4.fromTranslation(mat4.create(), [1, 2, 3]), null, false, 0, 0, 1);

  boosters.GetLights(manager);
  assert.equal(manager.points.length, 1, "one point light per renderable x booster");
  const point = manager.points[0];
  // radiusFactor = lightRadius(2) * intensity(0.5) = 1; radius = 1 * 1.
  assertClose(point.radius, 1, "booster radius times the warp/intensity factor", 1e-3);
  // The color blend is NOT intensity-scaled (only the radius factor is).
  assertVecClose(point.color, [1, 0.5, 0.25, 1], "color blend with flicker 1");
  assertVecClose(point.position, [101, 2, 3], "light position under the renderable parent transform", 1e-3);
});

test("EveSpaceObject2.GetLights: one-frame activation-strength lag (cpp:3549-3553)", () =>
{
  const object = new EveSpaceObject2();
  object.display = true;
  object.activationStrength = 0.5;
  const light = new Tr2PointLight();
  light.SetLightData({ position: [0, 0, 0], radius: 5, brightness: 1, color: [1, 1, 1, 1], flags: 1 });
  object.lights.push(light);

  const manager = MakeLightManager();
  object.GetLights(manager);
  // First pass: the submission used the Tr2Light default multiplier 1 -
  // SetBrightnessMultiplier runs AFTER AddLight.
  assertVecClose(manager.added[0].color, [1, 1, 1], "first pass uses the default multiplier");
  object.GetLights(manager);
  assertVecClose(manager.added[1].color, [0.5, 0.5, 0.5], "second pass uses the stamped strength");
});
