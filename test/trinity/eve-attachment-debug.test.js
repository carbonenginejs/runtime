// Debug-renderer ports of the Eve attachment sets: each test drives a fake
// ITr2DebugRenderer2 and checks the `__` overload Carbon's argument types
// select, the owner reference and the packed colour.
import assert from "node:assert/strict";
import test from "node:test";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { color } from "../../npm/dist/global/math/color.js";
import { ITr2DebugRenderable, ITr2DebugRenderer2 } from "../../npm/dist/global/interfaces/index.js";
import {
  EveBoosterSet2,
  EveBoosterSet2Renderable,
  EveBoosterSet2SingleBoosterData,
  EveHazeSet,
  EveHazeSetItem,
  EveHazeSetLight,
  EvePlaneSet,
  EvePlaneSetItem,
  EveSpotlightLight,
  EveSpotlightSet,
  EveSpotlightSetItem,
  EveSpriteLineSet,
  EveSpriteLineSetItem,
  EveTurretFiringFX,
  EveTurretSet
} from "../../npm/dist/trinity/index.js";

const { Wireframe, Solid, Lit } = ITr2DebugRenderer2.Effect;

/** A renderer recording every call as [method, ...args]; `enabled` lists the options. */
function fakeRenderer(enabled, variants)
{
  const calls = [];
  const renderer = { calls, HasOption: (_owner, option) => enabled.includes(option) };
  for (const variant of variants)
  {
    // A real renderer consumes its arguments during the call, so callers pass
    // shared scratch; record copies of typed arrays so later draws cannot
    // overwrite what an assertion reads.
    renderer[variant] = (...args) => calls.push([ variant, ...args.map(arg => ArrayBuffer.isView(arg) ? arg.slice() : arg) ]);
  }
  return renderer;
}

/** An object with the debug pair, recording what it was asked. */
function fakeDebuggable(name, calls)
{
  return {
    GetDebugOptions: options => options.add(name),
    RenderDebugInfo: renderer => calls.push([ name, renderer ])
  };
}

function translated(x, y, z)
{
  return mat4.fromTranslation(mat4.create(), [ x, y, z ]);
}

function argb(r, g, b, a)
{
  return color.toARGB(new Float32Array([ r, g, b, a ]));
}

test("EveHazeSet debug: wireframe then solid unit box per haze, lights as spheres (cpp:319-381)", () =>
{
  const set = new EveHazeSet();
  const options = new Set();
  set.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "Haze Sets", "Haze Sets Lights" ]);

  const haze = new EveHazeSetItem();
  haze.boneIndex = -1;
  haze.position.set([ 1, 2, 3 ]);
  set.hazes.push(haze);

  const light = new EveHazeSetLight();
  light.index = 0;
  light.lightData.color.set([ 1, 0, 0, 1 ]);
  light.lightData.innerRadius = 2;
  light.lightData.radius = 4;
  set.lights.push(light);

  const renderer = fakeRenderer([ "Haze Sets", "Haze Sets Lights" ], [ "DrawBox__Transform", "DrawSphere__TransformRadius" ]);
  set.RenderDebugInfo(renderer, translated(10, 0, 0), null, 0);

  assert.deepEqual(renderer.calls.map(call => call[0]), [
    "DrawBox__Transform", "DrawBox__Transform", "DrawSphere__TransformRadius", "DrawSphere__TransformRadius"
  ]);

  const [ , owner, transform, min, max, effect, debugColor ] = renderer.calls[0];
  assert.equal(owner.object, haze);
  assert.equal(owner.area, 0);
  assert.deepEqual(Array.from(transform.subarray(12, 15)), [ 11, 2, 3 ]);
  assert.deepEqual(Array.from(min), [ -0.5, -0.5, -0.5 ]);
  assert.deepEqual(Array.from(max), [ 0.5, 0.5, 0.5 ]);
  assert.equal(effect, Wireframe);
  assert.equal(debugColor.color, 0xff00ffff);
  assert.equal(debugColor.zFailColor, 0x2200ffff);
  assert.equal(renderer.calls[1][5], Solid);
  assert.equal(renderer.calls[1][6].color, 0);

  const [ , lightOwner, , innerRadius, segments, lightEffect, lightColor ] = renderer.calls[2];
  assert.equal(lightOwner.object, haze);
  assert.equal(innerRadius, 2);
  assert.equal(segments, 10);
  assert.equal(lightEffect, Solid);
  assert.equal(lightColor.color, argb(1, 0, 0, 0.5));
  assert.equal(renderer.calls[3][3], 4);
  assert.equal(renderer.calls[3][6].color, argb(1, 0, 0, 0.3));
});

test("EvePlaneSet debug: flat box per plane in Carbon's cyan, bounds in green (cpp:374-470)", () =>
{
  const set = new EvePlaneSet();
  const options = new Set();
  set.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "Plane Sets", "Plane Sets Bounds", "Plane Sets Lights" ]);

  const plane = new EvePlaneSetItem();
  set.planes.push(plane);

  const renderer = fakeRenderer([ "Plane Sets", "Plane Sets Bounds" ], [ "DrawBox__Transform" ]);
  set.RenderDebugInfo(renderer, mat4.create(), null, 0);

  assert.equal(renderer.calls.length, 3);
  const [ , owner, , min, max, effect, debugColor ] = renderer.calls[0];
  assert.equal(owner.object, plane);
  assert.equal(owner.area, 0);
  assert.deepEqual(Array.from(min), [ -0.5, -0.5, Math.fround(-0.005) ]);
  assert.deepEqual(Array.from(max), [ 0.5, 0.5, Math.fround(0.005) ]);
  assert.equal(effect, Wireframe);
  assert.equal(debugColor.color, argb(0, 0.7, 0.9, 0.5));
  assert.equal(debugColor.zFailColor, argb(0, 0.7, 0.9, 0.1));
  assert.equal(renderer.calls[1][6].color, 0);

  const [ , boundsOwner, , , , boundsEffect, boundsColor ] = renderer.calls[2];
  assert.equal(boundsOwner.object, set);
  assert.equal(boundsEffect, Wireframe);
  assert.equal(boundsColor.color, 0xff00ff00);
});

test("EveSpotlightSet debug: offset unit cone per item, angle cones per light (cpp:440-522)", () =>
{
  const set = new EveSpotlightSet();
  const options = new Set();
  set.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "Spotlight Sets", "Spotlight Sets Bounds", "Spotlight Sets Lights" ]);

  const item = new EveSpotlightSetItem();
  set.spotlightItems.push(item);

  const light = new EveSpotlightLight();
  light.index = 0;
  light.lightData.innerRadius = 3;
  light.lightData.innerAngle = 90;
  light.lightData.radius = 6;
  light.lightData.outerAngle = 180;
  set.lights.push(light);

  const renderer = fakeRenderer([ "Spotlight Sets", "Spotlight Sets Lights" ], [ "DrawCone__TransformRadius", "DrawCone__TransformAngle" ]);
  set.RenderDebugInfo(renderer, mat4.create(), null, 0);

  assert.deepEqual(renderer.calls.map(call => call[0]), [
    "DrawCone__TransformRadius", "DrawCone__TransformRadius", "DrawCone__TransformAngle", "DrawCone__TransformAngle"
  ]);

  const [ , owner, transform, radius, height, segments, effect, debugColor ] = renderer.calls[0];
  assert.equal(owner.object, item);
  assert.equal(owner.area, 0);
  // RotationX( -pi/2 ) then Translation( 0, 0, 0.5 ): the cone's +Y axis lands on -Z.
  assert.deepEqual(Array.from(transform.subarray(12, 15)), [ 0, 0, 0.5 ]);
  assert.ok(Math.abs(transform[6] + 1) < 1e-6);
  assert.equal(radius, 0.5);
  assert.equal(height, 1);
  assert.equal(segments, 10);
  assert.equal(effect, Wireframe);
  assert.equal(debugColor.color, 0xffaaff00);
  assert.equal(debugColor.zFailColor, 0x22aaff00);
  assert.equal(renderer.calls[1][6], Solid);
  assert.equal(renderer.calls[1][7].color, 0);

  const [ , lightOwner, , lightHeight, angle, lightSegments, coneSegments ] = renderer.calls[2];
  assert.equal(lightOwner.object, item);
  assert.equal(lightHeight, 3);
  assert.ok(Math.abs(angle - Math.PI / 2) < 1e-5);
  assert.equal(lightSegments, 10);
  assert.equal(coneSegments, 10);
  assert.equal(renderer.calls[3][3], 6);
});

test("EveSpriteLineSet debug: sphere per position, cylinder between neighbours, red on a missing bone (cpp:249-341)", () =>
{
  const set = new EveSpriteLineSet();
  const options = new Set();
  set.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "Sprite Line Sets", "Sprite Line Sets Lights" ]);

  const line = new EveSpriteLineSetItem();
  line.scaling.set([ 3, 1, 1 ]);
  line.spacing = 1;
  line.boneIndex = 5;
  set.spriteLines.push(line);

  const renderer = fakeRenderer([ "Sprite Line Sets" ], [ "DrawSphere__TransformCenterRadius", "DrawCylinder__TransformCaps" ]);
  set.RenderDebugInfo(renderer, mat4.create(), null, 0);

  assert.deepEqual(renderer.calls.map(call => call[0]), [
    "DrawSphere__TransformCenterRadius",
    "DrawCylinder__TransformCaps",
    "DrawSphere__TransformCenterRadius",
    "DrawCylinder__TransformCaps",
    "DrawSphere__TransformCenterRadius"
  ]);

  const [ , owner, , , radius, segments, effect, debugColor ] = renderer.calls[0];
  assert.equal(owner.object, line);
  assert.equal(owner.area, 0);
  assert.equal(radius, line.maxScale);
  assert.equal(segments, 6);
  assert.equal(effect, Lit);
  assert.equal(debugColor.color, argb(0.9, 0.2, 0.2, 0.5));
  assert.equal(debugColor.zFailColor, argb(0.9, 0.2, 0.2, 0.1));

  const [ , cylinderOwner, , cap0, cap1, cylinderRadius, cylinderSegments, cylinderEffect ] = renderer.calls[1];
  assert.equal(cylinderOwner.object, line);
  assert.deepEqual(Array.from(cap0), [ 0, 0, 0 ]);
  assert.deepEqual(Array.from(cap1), [ 1, 0, 0 ]);
  assert.equal(cylinderRadius, line.minScale / 2);
  assert.equal(cylinderSegments, 8);
  assert.equal(cylinderEffect, Lit);

  line.boneIndex = -1;
  const unskinned = fakeRenderer([ "Sprite Line Sets" ], [ "DrawSphere__TransformCenterRadius", "DrawCylinder__TransformCaps" ]);
  set.RenderDebugInfo(unskinned, mat4.create(), null, 0);
  assert.equal(unskinned.calls[0][7].color, argb(0, 0.7, 0.9, 0.5));
});

test("EveBoosterSet2 debug: lit cylinder per booster and the trails box per instance (cpp:1082-1108)", () =>
{
  const set = new EveBoosterSet2();
  const booster = new EveBoosterSet2SingleBoosterData();
  mat4.copy(booster.transform, translated(1, 0, 0));
  set._singleBoosters.push(booster);
  const renderable = new EveBoosterSet2Renderable();
  set.instances.push(renderable);

  const renderer = fakeRenderer([], [ "DrawCylinder__TransformCaps", "DrawBox__MinMax" ]);
  set.RenderDebugInfo(renderer);

  assert.deepEqual(renderer.calls.map(call => call[0]), [ "DrawCylinder__TransformCaps", "DrawBox__MinMax" ]);

  const [ , owner, transform, cap0, cap1, radius, segments, effect, debugColor ] = renderer.calls[0];
  assert.equal(owner.object, set);
  assert.equal(owner.area, 0);
  assert.deepEqual(Array.from(transform.subarray(12, 15)), [ 1, 0, 0 ]);
  assert.deepEqual(Array.from(cap0), [ 0, 0, 0 ]);
  assert.deepEqual(Array.from(cap1), [ 0, 0, -1 ]);
  assert.equal(radius, 1);
  assert.equal(segments, 8);
  assert.equal(effect, Lit);
  assert.equal(debugColor.color, 0x88ffff00);
  assert.equal(debugColor.zFailColor, 0x22ffff00);

  const [ , boxOwner, min, max, boxEffect, boxColor ] = renderer.calls[1];
  assert.equal(boxOwner.object, set);
  assert.deepEqual(Array.from(min), Array.from(renderable.trailsBoundsMin));
  assert.deepEqual(Array.from(max), Array.from(renderable.trailsBoundsMax));
  assert.equal(boxEffect, Wireframe);
  assert.equal(boxColor.color, 0xff00ffff);
});

test("EveTurretFiringFX debug: forwards to debug-renderable stretches, then source and destination observers (cpp:862-902)", () =>
{
  const calls = [];
  class FakeStretch extends ITr2DebugRenderable
  {
    GetDebugOptions(options) { options.add("stretch"); }
    RenderDebugInfo(renderer) { calls.push([ "stretch", renderer ]); }
  }

  const fx = new EveTurretFiringFX();
  fx.stretch.push(new FakeStretch(), { RenderDebugInfo: () => calls.push([ "not debug-renderable" ]) });
  fx.sourceObserver = fakeDebuggable("source", calls);
  fx.destinationObserver = fakeDebuggable("destination", calls);

  const options = new Set();
  fx.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "stretch", "source", "destination" ]);

  const renderer = fakeRenderer([], []);
  fx.RenderDebugInfo(renderer);
  assert.deepEqual(calls.map(call => call[0]), [ "stretch", "source", "destination" ]);
  assert.ok(calls.every(call => call[1] === renderer));
});

test("EveTurretSet debug: bounding sphere per valid turret, then firing effect and movement observer (cpp:1845-1902)", () =>
{
  const calls = [];
  const set = new EveTurretSet();
  set.boundingSphere.set([ 1, 0, 0, 2 ]);
  set._turrets.push({ valid: true, worldMatrix: translated(5, 0, 0) }, { valid: false, worldMatrix: mat4.create() });
  set._firingEffect = fakeDebuggable("firing", calls);
  set.turretMovementObserver = fakeDebuggable("observer", calls);
  set.playMovementSound = false;

  const options = new Set();
  set.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "TurretBounds", "firing", "observer" ]);

  const renderer = fakeRenderer([ "TurretBounds" ], [ "DrawSphere__CenterRadius" ]);
  set.RenderDebugInfo(renderer);

  assert.equal(renderer.calls.length, 1);
  const [ variant, owner, center, radius, segments, effect, debugColor ] = renderer.calls[0];
  assert.equal(variant, "DrawSphere__CenterRadius");
  assert.equal(owner.object, set);
  assert.equal(owner.area, 0);
  assert.deepEqual(Array.from(center), [ 6, 0, 0 ]);
  assert.equal(radius, 2);
  assert.equal(segments, 10);
  assert.equal(effect, Wireframe);
  assert.equal(debugColor.color, 0xffffff00);

  // The movement observer renders only while movement sound plays.
  assert.deepEqual(calls.map(call => call[0]), [ "firing" ]);
  set.playMovementSound = true;
  set.RenderDebugInfo(fakeRenderer([], []));
  assert.deepEqual(calls.map(call => call[0]), [ "firing", "firing", "observer" ]);
});
