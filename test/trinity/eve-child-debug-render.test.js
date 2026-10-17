// Debug-renderer ports of the Eve child classes: each test drives a fake
// ITr2DebugRenderer2 and checks the `__` overload Carbon's argument types
// select, the owner reference and the packed colour.
import assert from "node:assert/strict";
import test from "node:test";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { ITr2DebugRenderable, ITr2DebugRenderer2 } from "../../npm/dist/global/interfaces/index.js";
import {
  EveChildAudio,
  EveChildBehaviorSystem,
  EveChildBoosterSet,
  EveChildCloud,
  EveChildFogVolume,
  EveChildLightingOverride,
  EveChildLineSet,
  EveChildPostProcessVolume,
  EveSpriteSet,
  EveSpriteSetItem
} from "../../npm/dist/trinity/index.js";

const { Wireframe, Lit } = ITr2DebugRenderer2.Effect;

/** A renderer recording every call as [method, ...args]; `enabled` lists the options. */
function fakeRenderer(enabled, variants)
{
  const calls = [];
  const renderer = { calls, HasOption: (_owner, option) => enabled.includes(option) };
  for (const variant of variants)
  {
    renderer[variant] = (...args) => calls.push([ variant, ...args ]);
  }
  return renderer;
}

/** A volume or group recording RenderDebugInfo's arguments. */
function fakeChild(calls)
{
  return { RenderDebugInfo: (...args) => calls.push(args), GetDebugOptions: options => options.add("child") };
}

function translated(x, y, z)
{
  return mat4.fromTranslation(mat4.create(), [ x, y, z ]);
}

test("EveChildFogVolume debug: volumes, then a sphere at the centre under world (cpp:158-178)", () =>
{
  const fog = new EveChildFogVolume();
  const options = new Set();
  fog.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "Volumes", "Bounding Sphere" ]);

  const volumeCalls = [];
  fog.volumes.push(fakeChild(volumeCalls));
  mat4.copy(fog.worldTransform, translated(10, 0, 0));
  fog.boundingSphereCenter.set([ 1, 2, 3 ]);
  fog.boundingSphereRadius = 4;

  const renderer = fakeRenderer([ "Volumes", "Bounding Sphere" ], [ "DrawSphere__TransformRadius" ]);
  fog.RenderDebugInfo(renderer);
  assert.equal(volumeCalls.length, 1);
  assert.equal(volumeCalls[0][1], fog.worldTransform);

  const [ variant, owner, transform, radius, segments, effect, color ] = renderer.calls[0];
  assert.equal(variant, "DrawSphere__TransformRadius");
  assert.equal(owner.object, fog);
  assert.deepEqual(Array.from(transform.subarray(12, 15)), [ 11, 2, 3 ]);
  assert.equal(radius, 4);
  assert.equal(segments, 10);
  assert.equal(effect, Wireframe);
  assert.equal(color.color, 0xff333333);
});

test("EveChildLightingOverride debug: volumes, then a sphere at the centre under world (cpp:157-177)", () =>
{
  const override = new EveChildLightingOverride();
  const options = new Set();
  override.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "Volumes", "Bounding Sphere" ]);

  const volumeCalls = [];
  override.volumes.push(fakeChild(volumeCalls));
  mat4.copy(override.worldTransform, translated(0, 10, 0));
  override._boundingSphere.center.set([ 1, 2, 3 ]);
  override._boundingSphere.radius = 5;

  const renderer = fakeRenderer([ "Volumes", "Bounding Sphere" ], [ "DrawSphere__TransformRadius" ]);
  override.RenderDebugInfo(renderer);
  assert.equal(volumeCalls.length, 1);
  assert.equal(volumeCalls[0][1], override.worldTransform);

  const [ variant, owner, transform, radius, segments, , color ] = renderer.calls[0];
  assert.equal(variant, "DrawSphere__TransformRadius");
  assert.equal(owner.object, override);
  assert.deepEqual(Array.from(transform.subarray(12, 15)), [ 1, 12, 3 ]);
  assert.equal(radius, 5);
  assert.equal(segments, 10);
  assert.equal(color.color, 0xff333333);
});

test("EveChildLineSet debug: nothing while hidden, else paths then the sphere (cpp:511-532)", () =>
{
  const lineSet = new EveChildLineSet();
  const pathCalls = [];
  lineSet.lines.push(fakeChild(pathCalls));
  mat4.copy(lineSet.worldTransform, translated(0, 0, 10));
  lineSet._boundingSphere.set([ 1, 2, 3, 6 ]);

  const renderer = fakeRenderer([ "Bounding Sphere" ], [ "DrawSphere__TransformRadius" ]);
  lineSet.display = false;
  lineSet.RenderDebugInfo(renderer);
  assert.equal(pathCalls.length, 0);
  assert.equal(renderer.calls.length, 0);

  lineSet.display = true;
  lineSet.RenderDebugInfo(renderer);
  assert.equal(pathCalls.length, 1);
  assert.equal(pathCalls[0][1], lineSet.worldTransform);

  const [ variant, owner, transform, radius, segments, effect, color ] = renderer.calls[0];
  assert.equal(variant, "DrawSphere__TransformRadius");
  assert.equal(owner.object, lineSet);
  assert.deepEqual(Array.from(transform.subarray(12, 15)), [ 1, 2, 13 ]);
  assert.equal(radius, 6);
  assert.equal(segments, 12);
  assert.equal(effect, Wireframe);
  assert.equal(color.color, 0xaaffffaa);
});

test("EveChildCloud debug: the unit box under world, then the volume (cpp:438-461)", () =>
{
  const cloud = new EveChildCloud();
  const volumeCalls = [];
  cloud.volume = fakeChild(volumeCalls);
  const options = new Set();
  cloud.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "Bounding Box", "child" ]);

  const renderer = fakeRenderer([ "Bounding Box" ], [ "DrawBox__Transform" ]);
  cloud.RenderDebugInfo(renderer);
  const [ variant, owner, transform, min, max, effect, color ] = renderer.calls[0];
  assert.equal(variant, "DrawBox__Transform");
  assert.equal(owner.object, cloud);
  assert.equal(transform, cloud.worldTransform);
  assert.deepEqual(Array.from(min), [ -0.5, -0.5, -0.5 ]);
  assert.deepEqual(Array.from(max), [ 0.5, 0.5, 0.5 ]);
  assert.equal(effect, Wireframe);
  assert.equal(color.color, 0xff00ff00);
  assert.equal(volumeCalls.length, 1);
  assert.equal(volumeCalls[0][0], renderer);
  assert.equal(volumeCalls[0][1], cloud.worldTransform);
});

test("EveChildPostProcessVolume debug: white volumes, red exclusions, then the sphere (cpp:169-198)", () =>
{
  const volume = new EveChildPostProcessVolume();
  const options = new Set();
  volume.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "Volumes", "ExclusionVolumes", "Bounding Sphere" ]);

  const inclusionCalls = [], exclusionCalls = [];
  volume.volumes.push(fakeChild(inclusionCalls));
  volume.exclusionVolumes.push(fakeChild(exclusionCalls));
  volume._boundingSphere.set([ 1, 2, 3, 7 ]);

  const renderer = fakeRenderer([ "Volumes", "ExclusionVolumes", "Bounding Sphere" ], [ "DrawSphere__TransformRadius" ]);
  volume.RenderDebugInfo(renderer);
  assert.equal(inclusionCalls[0][1], volume.worldTransform);
  assert.deepEqual(Array.from(inclusionCalls[0][2]), [ 1, 1, 1, 1 ]);
  assert.deepEqual(Array.from(exclusionCalls[0][2], value => Math.round(value * 255)), [ 255, 51, 51, 255 ]);

  const [ variant, owner, transform, radius, segments, , color ] = renderer.calls[0];
  assert.equal(variant, "DrawSphere__TransformRadius");
  assert.equal(owner.object, volume);
  assert.deepEqual(Array.from(transform.subarray(12, 15)), [ 1, 2, 3 ]);
  assert.equal(radius, 7);
  assert.equal(segments, 10);
  assert.equal(color.color, 0xff333333);
});

test("EveChildBoosterSet debug: a lit cylinder per booster, then the glows (cpp:565-604)", () =>
{
  const set = new EveChildBoosterSet();
  const options = new Set();
  set.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "Boosters" ]);

  set.Add(translated(0, 0, 5), 0, 0, 1);
  const glowCalls = [];
  set.glows = fakeChild(glowCalls);
  const renderer = fakeRenderer([ "Boosters" ], [ "DrawCylinder__TransformCaps" ]);

  set.RenderDebugInfo(renderer);
  assert.equal(renderer.calls.length, 0, "nothing before the first update (cpp:576-579)");

  set.UpdateAsyncronous(null, { isVisible: true, localToWorldTransform: translated(100, 0, 0) });
  set.RenderDebugInfo(renderer);
  const [ variant, owner, transform, cap0, cap1, radius, segments, effect, color ] = renderer.calls[0];
  assert.equal(variant, "DrawCylinder__TransformCaps");
  assert.equal(owner.object, set);
  assert.equal(owner.area, 0);
  assert.deepEqual(Array.from(transform.subarray(12, 15)), [ 100, 0, 5 ]);
  assert.deepEqual(Array.from(cap0), [ 0, 0, 0 ]);
  assert.deepEqual(Array.from(cap1), [ 0, 0, -1 ]);
  assert.equal(radius, 1);
  assert.equal(segments, 8);
  assert.equal(effect, Lit);
  assert.equal(color.color, 0x88ffff00);
  assert.equal(color.zFailColor, 0x22ffff00);
  assert.deepEqual(glowCalls[0].slice(2), [ null, 0 ]);
  assert.equal(glowCalls[0][1], set._parentTransform);
});

test("EveSpriteSet debug: a lit sphere per sprite, red when the bone is missing (cpp:345-427)", () =>
{
  const set = new EveSpriteSet();
  const options = new Set();
  set.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "Sprite Sets", "Sprite Sets Bounds", "Sprite Sets Lights" ]);

  const sprite = new EveSpriteSetItem();
  sprite.position.set([ 1, 2, 3 ]);
  sprite.maxScale = 9;
  sprite.boneIndex = 0;
  set.sprites.push(sprite);

  // One Float4x3 bone translating by (0, 20, 0): elements[3/7/11] carry the translation.
  const bones = new Float32Array(12);
  bones[0] = bones[5] = bones[10] = 1;
  bones[7] = 20;
  const parent = translated(100, 0, 0);
  const renderer = fakeRenderer([ "Sprite Sets" ], [ "DrawSphere__TransformCenterRadius" ]);

  set.RenderDebugInfo(renderer, parent, bones, 1);
  const [ variant, owner, transform, center, radius, segments, effect, color ] = renderer.calls[0];
  assert.equal(variant, "DrawSphere__TransformCenterRadius");
  assert.equal(owner.object, sprite);
  assert.deepEqual(Array.from(transform.subarray(12, 15)), [ 100, 20, 0 ]);
  assert.equal(center, sprite.position);
  assert.equal(radius, 9);
  assert.equal(segments, 6);
  assert.equal(effect, Lit);
  assert.equal(color.color >>> 24, 0x80);

  set.RenderDebugInfo(renderer, parent, bones, 0);
  const [ , , missingTransform, , , , , missingColor ] = renderer.calls[1];
  assert.deepEqual(Array.from(missingTransform.subarray(12, 15)), [ 100, 0, 0 ]);
  assert.equal((missingColor.color >>> 16) & 0xff, Math.round(0.9 * 255), "an out-of-range bone draws red");
});

test("EveChildAudio debug forwards only to a debug-renderable emitter (cpp:118-133)", () =>
{
  const audio = new EveChildAudio();
  const calls = [];
  class RenderableEmitter extends ITr2DebugRenderable
  {
    GetDebugOptions(options) { options.add("emitter"); }
    RenderDebugInfo(renderer) { calls.push(renderer); }
  }

  audio.audioEmitter = { GetDebugOptions: () => assert.fail("not renderable"), RenderDebugInfo: () => assert.fail("not renderable") };
  audio.GetDebugOptions(new Set());
  audio.RenderDebugInfo({});

  audio.audioEmitter = new RenderableEmitter();
  const options = new Set();
  audio.GetDebugOptions(options);
  const renderer = {};
  audio.RenderDebugInfo(renderer);
  assert.deepEqual([ ...options ], [ "emitter" ]);
  assert.deepEqual(calls, [ renderer ]);
});

test("EveChildBehaviorSystem debug: groups always, tunnels under SplineTunnels (cpp:472-496)", () =>
{
  const system = new EveChildBehaviorSystem();
  const groupCalls = [], tunnelCalls = [];
  system.behaviorGroups.push(fakeChild(groupCalls));
  system.splineTunnels.push(fakeChild(tunnelCalls));

  const options = new Set();
  system.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "SplineTunnels", "child" ]);

  system.RenderDebugInfo(fakeRenderer([], []));
  assert.equal(groupCalls.length, 1);
  assert.equal(groupCalls[0][1], system.worldTransform);
  assert.equal(tunnelCalls.length, 0);

  system.RenderDebugInfo(fakeRenderer([ "SplineTunnels" ], []));
  assert.equal(tunnelCalls.length, 1);
  assert.equal(tunnelCalls[0][1], system.worldTransform);
});
