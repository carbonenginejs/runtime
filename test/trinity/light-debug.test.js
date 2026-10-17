// Debug-renderer ports of the Tr2 lights and the smart-light groups: each test
// drives a fake ITr2DebugRenderer2 and checks the `__` overload Carbon's
// argument types select, the owner reference, the transform and the packed
// colours.
import assert from "node:assert/strict";
import test from "node:test";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { color } from "../../npm/dist/global/math/color.js";
import { ITr2DebugRenderer2 } from "../../npm/dist/global/interfaces/index.js";
import {
  EveSmartLightPointLight,
  EveSmartLightSpotLight,
  Tr2FactionLight,
  Tr2PointLight,
  Tr2SpotLight
} from "../../npm/dist/trinity/index.js";

const { Solid } = ITr2DebugRenderer2.Effect;
const EPSILON = 1e-5;
const TRI_2PI = Math.fround(6.283185307);
const f32 = Math.fround;

// The ports add alpha steps in float32 (Float32Array storage), and toARGB
// rounds at x.5 boundaries, so the expected alphas repeat that arithmetic.
const POINT_SELECTED_ALPHA = f32(f32(0.1) + f32(0.2));
const SPOT_MOD = f32(0.025);

/** A renderer recording every call as [method, ...args]; `enabled` lists the options. */
function fakeRenderer(enabled, variants)
{
  const calls = [];
  const renderer = { calls, HasOption: (_owner, option) => enabled.includes(option) };
  for (const variant of variants)
  {
    // Callers pass shared scratch; record copies of typed arrays so later
    // draws cannot overwrite what an assertion reads.
    renderer[variant] = (...args) => calls.push([ variant, ...args.map(arg => ArrayBuffer.isView(arg) ? arg.slice() : arg) ]);
  }
  return renderer;
}

function argb(r, g, b, a)
{
  return color.toARGB(new Float32Array([ r, g, b, a ]));
}

function translated(x, y, z)
{
  return mat4.fromTranslation(mat4.create(), [ x, y, z ]);
}

function rotatedZ90()
{
  return mat4.fromZRotation(mat4.create(), Math.PI / 2);
}

function zQuat90()
{
  return quat.setAxisAngle(quat.create(), [ 0, 0, 1 ], Math.PI / 2);
}

/** Transforms a point by a recorded matrix. */
function apply(matrix, point)
{
  return vec3.transformMat4(vec3.create(), point, matrix);
}

function assertVec(actual, expected)
{
  for (let i = 0; i < expected.length; i++)
  {
    assert.ok(Math.abs(actual[i] - expected[i]) < EPSILON, `[${i}] ${actual[i]} != ${expected[i]}`);
  }
}

/** A Float4x3 bone that only translates (MatrixCopyFrom3x4 element layout). */
function translationBone(x, y, z)
{
  return new Float32Array([ 1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z ]);
}

/** Checks a point light's two spheres (Tr2PointLight.cpp:14-29 shape). */
function assertPointSpheres(calls, light, transformCheck)
{
  assert.deepEqual(calls.map(call => call[0]), [
    "DrawSphere__TransformCenterRadius", "DrawSphere__TransformCenterRadius"
  ]);

  const expectedRadii = [ light.radius, light.innerRadius ];
  for (let i = 0; i < 2; i++)
  {
    const [ , owner, transform, center, radius, segments, effect, debugColor ] = calls[i];
    assert.equal(owner.object, light);
    transformCheck(transform);
    assertVec(center, light.position);
    assert.equal(radius, expectedRadii[i]);
    assert.equal(segments, 10);
    assert.equal(effect, Solid);
    assert.equal(debugColor.color, argb(0.5, 0.25, 0.125, POINT_SELECTED_ALPHA));
    assert.equal(debugColor.zFailColor, argb(0.5, 0.25, 0.125, 0.1));
  }
}

/** Checks a spot light's two cones (Tr2SpotLight.cpp:16-36 shape). */
function assertSpotCones(calls, owner, radii, angles, baseAlpha, transformCheck)
{
  assert.deepEqual(calls.map(call => call[0]), [
    "DrawCone__TransformAngle", "DrawCone__TransformAngle"
  ]);

  const colors = [
    [ f32(baseAlpha) + SPOT_MOD * 2, baseAlpha ],
    [ f32(baseAlpha) + SPOT_MOD * 3, f32(baseAlpha) + SPOT_MOD ]
  ];
  for (let i = 0; i < 2; i++)
  {
    const [ , reference, transform, height, angle, segments, coneSegments, effect, debugColor ] = calls[i];
    assert.equal(reference.object, owner);
    transformCheck(transform);
    assert.equal(height, radii[i]);
    assert.equal(angle, Math.fround(Math.fround(TRI_2PI * angles[i]) / 360));
    assert.equal(segments, 15);
    assert.equal(coneSegments, 15);
    assert.equal(effect, Solid);
    assert.equal(debugColor.color, argb(0.5, 0.25, 0.125, colors[i][0]));
    assert.equal(debugColor.zFailColor, argb(0.5, 0.25, 0.125, colors[i][1]));
  }
}

test("Tr2Light.RenderDebugInfo is Carbon's empty base (Tr2Light.cpp:205-207)", () =>
{
  // Tr2PointLight's super is the base; call the base body on an instance.
  const base = Object.getPrototypeOf(Tr2PointLight.prototype);
  const renderer = fakeRenderer([], [ "DrawSphere__TransformCenterRadius" ]);
  assert.equal(base.RenderDebugInfo.call(new Tr2PointLight(), renderer, mat4.create()), undefined);
  assert.equal(renderer.calls.length, 0);
});

test("Tr2PointLight debug: outer then inner solid sphere, bone then world (cpp:14-29)", () =>
{
  const light = new Tr2PointLight();
  light.color.set([ 1, 0.5, 0.25, 1 ]);
  light.brightness = 0.5;
  light.position.set([ 1, 2, 3 ]);
  light.radius = 4;
  light.innerRadius = 2;

  // No bone: the stored (identity) bone transform followed by the world.
  light.boneIndex = -1;
  let renderer = fakeRenderer([], [ "DrawSphere__TransformCenterRadius" ]);
  light.RenderDebugInfo(renderer, translated(10, 0, 0));
  assertPointSpheres(renderer.calls, light, transform => assertVec(apply(transform, [ 0, 0, 0 ]), [ 10, 0, 0 ]));

  // A bone in range: bone translation (0, 5, 0) first, then the world's 90
  // degree Z turn, giving (-5, 0, 0) - the reversed order would give (0, 5, 0).
  light.boneIndex = 0;
  renderer = fakeRenderer([], [ "DrawSphere__TransformCenterRadius" ]);
  light.RenderDebugInfo(renderer, rotatedZ90(), translationBone(0, 5, 0), 1);
  assertPointSpheres(renderer.calls, light, transform => assertVec(apply(transform, [ 0, 0, 0 ]), [ -5, 0, 0 ]));

  // The debug draw does not touch the stored bone transform.
  assert.ok(mat4.exactEquals(light.boneTransform, mat4.create()));
});

test("Tr2SpotLight debug: outer then inner solid cone, rotation-translation-bone-world (cpp:16-36)", () =>
{
  const light = new Tr2SpotLight();
  light.color.set([ 1, 0.5, 0.25, 1 ]);
  light.brightness = 0.5;
  light.rotation.set(zQuat90());
  light.position.set([ 0, 5, 0 ]);
  light.radius = 8;
  light.innerRadius = 3;
  light.outerAngle = 60;
  light.innerAngle = 30;
  light.boneIndex = -1;

  const renderer = fakeRenderer([], [ "DrawCone__TransformAngle" ]);
  light.RenderDebugInfo(renderer, translated(10, 0, 0));

  // (1, 0, 0) turns to (0, 1, 0), moves by (0, 5, 0) then by the world's
  // (10, 0, 0); translating before rotating would give (5, 1, 0).
  assertSpotCones(renderer.calls, light, [ 8, 3 ], [ 60, 30 ], 0.025, transform =>
  {
    assertVec(apply(transform, [ 0, 0, 0 ]), [ 10, 5, 0 ]);
    assertVec(apply(transform, [ 1, 0, 0 ]), [ 10, 6, 0 ]);
  });
});

test("Tr2FactionLight debug: spot branch cones, point branch spheres (cpp:64-105)", () =>
{
  const light = new Tr2FactionLight();
  light.color.set([ 1, 0.5, 0.25, 1 ]);
  light.brightness = 0.5;
  light.rotation.set(zQuat90());
  light.position.set([ 0, 5, 0 ]);
  light.radius = 8;
  light.innerRadius = 3;
  light.outerAngle = 60;
  light.innerAngle = 30;
  light.boneIndex = -1;

  light.isSpotlight = true;
  let renderer = fakeRenderer([], [ "DrawCone__TransformAngle", "DrawSphere__TransformCenterRadius" ]);
  light.RenderDebugInfo(renderer, translated(10, 0, 0));
  assertSpotCones(renderer.calls, light, [ 8, 3 ], [ 60, 30 ], 0.025, transform =>
  {
    assertVec(apply(transform, [ 1, 0, 0 ]), [ 10, 6, 0 ]);
  });

  light.isSpotlight = false;
  renderer = fakeRenderer([], [ "DrawCone__TransformAngle", "DrawSphere__TransformCenterRadius" ]);
  light.RenderDebugInfo(renderer, translated(10, 0, 0));
  assertPointSpheres(renderer.calls, light, transform => assertVec(apply(transform, [ 0, 0, 0 ]), [ 10, 0, 0 ]));
});

/** One placement record as the distributions produce it. */
function placement(fields)
{
  return {
    initialRotation: quat.create(),
    additionalRotation: quat.create(),
    initialTranslation: vec3.create(),
    additionalTranslation: vec3.create(),
    initialScale: vec3.fromValues(1, 1, 1),
    additionalScale: vec3.fromValues(1, 1, 1),
    ...fields
  };
}

test("EveSmartLightPointLight debug: two spheres per placement behind smartLightSets (cpp:133-161)", () =>
{
  const light = new EveSmartLightPointLight();
  light.customColor.set([ 1, 0.5, 0.25, 1 ]);
  light.brightness = 0.5;
  light.radius = 2;
  light.innerRadius = 0.5;
  light.staticOffsetTranslation.set([ 1, 0, 0 ]);
  mat4.copy(light._worldTransform, translated(10, 0, 0));

  const placements = [ placement({
    additionalRotation: zQuat90(),
    initialTranslation: vec3.fromValues(1, 0, 0),
    additionalTranslation: vec3.fromValues(0, 2, 0),
    initialScale: vec3.fromValues(1, 2, 1),
    additionalScale: vec3.fromValues(3, 1, 1)
  }) ];

  // Option off, or display off: nothing.
  let renderer = fakeRenderer([], [ "DrawSphere__TransformCenterRadius" ]);
  light.RenderDebugInfo(renderer, placements, 1);
  assert.equal(renderer.calls.length, 0);
  light.display = false;
  renderer = fakeRenderer([ "smartLightSets" ], [ "DrawSphere__TransformCenterRadius" ]);
  light.RenderDebugInfo(renderer, placements, 1);
  assert.equal(renderer.calls.length, 0);
  light.display = true;

  renderer = fakeRenderer([ "smartLightSets" ], [ "DrawSphere__TransformCenterRadius" ]);
  light.RenderDebugInfo(renderer, placements, 1);
  assert.deepEqual(renderer.calls.map(call => call[0]), [
    "DrawSphere__TransformCenterRadius", "DrawSphere__TransformCenterRadius"
  ]);

  // Offset (1, 0, 0) turned 90 degrees about Z is (0, 1, 0), plus (1, 2, 0);
  // the scaling is max(1, 2, 1) * max(3, 1, 1) = 6.
  const expectedRadii = [ 12, 3 ];
  for (let i = 0; i < 2; i++)
  {
    const [ , owner, transform, center, radius, segments, effect, debugColor ] = renderer.calls[i];
    assert.equal(owner.object, light);
    assertVec(apply(transform, [ 0, 0, 0 ]), [ 10, 0, 0 ]);
    assertVec(center, [ 1, 3, 0 ]);
    assert.equal(radius, expectedRadii[i]);
    assert.equal(segments, 10);
    assert.equal(effect, Solid);
    assert.equal(debugColor.color, argb(0.75, 0.375, 0.1875, f32(0.01) + f32(0.03) * 1.5));
    assert.equal(debugColor.zFailColor, argb(0.5, 0.25, 0.125, 0.03));
  }
});

test("EveSmartLightSpotLight debug: two cones per placement, arc from forward (cpp:13-56)", () =>
{
  const light = new EveSmartLightSpotLight();
  light.customColor.set([ 1, 0.5, 0.25, 1 ]);
  light.brightness = 0.5;
  light.radius = 3;
  light.innerRadius = 1;
  light.outerAngle = 60;
  light.innerAngle = 30;
  light.staticOffsetTranslation.set([ 1, 0, 0 ]);
  mat4.copy(light._worldTransform, translated(10, 0, 0));

  const placements = [ placement({
    additionalRotation: zQuat90(),
    initialTranslation: vec3.fromValues(0, 0, 5),
    initialScale: vec3.fromValues(2, 1, 1)
  }) ];

  let renderer = fakeRenderer([], [ "DrawCone__TransformAngle" ]);
  light.RenderDebugInfo(renderer, placements, 1);
  assert.equal(renderer.calls.length, 0);

  renderer = fakeRenderer([ "smartLightSets" ], [ "DrawCone__TransformAngle" ]);
  light.RenderDebugInfo(renderer, placements, 1);

  // Apex: offset (1, 0, 0) turned to (0, 1, 0), plus (0, 0, 5), then the
  // world's (10, 0, 0). Axis: +Y turned to (-1, 0, 0) and negated is
  // (1, 0, 0), so Carbon's forward (-Z) maps onto +X.
  assertSpotCones(renderer.calls, light, [ 6, 2 ], [ 60, 30 ], 0.03, transform =>
  {
    assertVec(apply(transform, [ 0, 0, 0 ]), [ 10, 1, 5 ]);
    assertVec(apply(transform, [ 0, 0, -1 ]), [ 11, 1, 5 ]);
  });
});
