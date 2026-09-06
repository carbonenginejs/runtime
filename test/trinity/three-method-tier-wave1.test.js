import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EveChildFogVolume,
  EveComponentRegistry,
  EveHazeSet,
  EveMissileWarhead,
  EveSpotlightSet,
  EveVirtualCameraSystem,
  TriRenderJob,
  TriSettings,
  TriStepRenderAtlas
} from "../../npm/dist/trinity/index.js";
import { AudGameObjResource } from "../../npm/dist/audio/index.js";
import { Tr2RaycastGeometryRes } from "../../npm/dist/resource/geometry/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { box3 } from "../../npm/dist/global/math/box3.js";

/**
 * The three-method-tier wave-1 ports
 * (docs/research/ratchet-three-method-tier-2026-09-06.md), each pinned to its
 * donor body.
 */

test("TriStepRenderAtlas setters, and __init__ forwards through them (cpp:29,104,109)", () =>
{
  const step = new TriStepRenderAtlas();
  const atlas = {};
  const focus = {};

  step.SetAtlas(atlas);
  step.SetFocus(focus);
  assert.equal(step.atlas, atlas);
  assert.equal(step.focus, focus);

  const initialized = new TriStepRenderAtlas();
  initialized.__init__(atlas, focus);
  assert.equal(initialized.atlas, atlas);
  assert.equal(initialized.focus, focus);
});

test("TriRenderJob.Steps returns the mutable list itself (h:34-37)", () =>
{
  const job = new TriRenderJob();
  assert.equal(job.Steps(), job.steps, "the reference, not a copy - Run snapshots for exactly this reason");
  job.Steps().push(null);
  assert.equal(job.steps.length, 1);
});

test("EveChildFogVolume adopts the parent world matrix verbatim (cpp:124-129)", () =>
{
  const volume = new EveChildFogVolume();
  const parentWorld = mat4.fromTranslation(mat4.create(), [ 7, 8, 9 ]);

  volume.UpdateTransformFromParent({ localToWorldTransform: parentWorld });

  const out = volume.GetLocalToWorldTransform(mat4.create());
  assert.deepEqual([ out[12], out[13], out[14] ], [ 7, 8, 9 ]);
});

test("EveMissileWarhead per-object contract: size and packed bytes agree (cpp:617-641)", () =>
{
  const warhead = new EveMissileWarhead();
  const PIXEL_SHADER = 1;
  const VERTEX_SHADER = 0;

  assert.equal(warhead.GetPerObjectDataSize(PIXEL_SHADER), 0);
  assert.equal(warhead.GetPerObjectDataSize(VERTEX_SHADER), 80, "64-byte matrix + 16-byte missile size");

  mat4.fromTranslation(warhead.worldTransform, [ 1, 2, 3 ]);
  warhead.warheadRadius = 5;
  warhead.warheadLength = 7;

  const bytes = new DataView(new ArrayBuffer(80));
  warhead.UpdatePerObjectBuffer(VERTEX_SHADER, 80, bytes);

  // Transpose moves the gl-matrix translation column [12..14] to [3],[7],[11].
  assert.equal(bytes.getFloat32(3 * 4, true), 1);
  assert.equal(bytes.getFloat32(7 * 4, true), 2);
  assert.equal(bytes.getFloat32(11 * 4, true), 3);
  assert.equal(bytes.getFloat32(64, true), 5);
  assert.equal(bytes.getFloat32(68, true), 7);
  assert.equal(bytes.getFloat32(72, true), 0);

  // The pixel stage writes nothing (cpp:632).
  const untouched = new DataView(new ArrayBuffer(80));
  warhead.UpdatePerObjectBuffer(PIXEL_SHADER, 80, untouched);
  assert.equal(untouched.getFloat32(0, true), 0);
});

function fakeEntity()
{
  return {
    states: new Map(),
    GetComponentIndex(bit) { return this.states.get(bit); },
    SetComponentState(bit, index) { this.states.set(bit, index); },
    RemoveComponentState(bit) { this.states.delete(bit); }
  };
}

test("EveComponentRegistry processors walk a collection; Until short-circuits (h:250-290)", () =>
{
  const registry = new EveComponentRegistry();
  const first = fakeEntity();
  const second = fakeEntity();
  registry.RegisterComponent("TestComponent", first);
  registry.RegisterComponent("TestComponent", second);

  const seen = [];
  registry.ProcessComponents("TestComponent", entity => seen.push(entity));
  assert.deepEqual(seen, [ first, second ]);

  // An absent collection no-ops rather than throwing.
  registry.ProcessComponents("NoSuchComponent", () => assert.fail("must not run"));

  const visited = [];
  registry.ProcessComponentsUntil("TestComponent", entity =>
  {
    visited.push(entity);
    return true;
  });
  assert.deepEqual(visited, [ first ], "stops at the first true");

  // RemoveCollectionFromEntityState clears only the collection's bit (cpp:147).
  const collection = registry.GetComponentCollection("TestComponent");
  registry.RemoveCollectionFromEntityState(collection, first);
  assert.equal(first.states.has(collection.GetBit()), false);
  assert.equal(second.states.has(collection.GetBit()), true);
});

test("EveHazeSet.CreateBoundingBox builds the item-set bounds (cpp:245-248)", () =>
{
  const set = new EveHazeSet();
  const bounds = box3.fromBounds(box3.create(), [ -1, -1, -1 ], [ 1, 1, 1 ]);
  set.hazes.push({ boneIndex: -1, GetBounds: out => box3.copy(out, bounds) });

  // Rebuild routes through the method (Rebuild's tail is CreateBoundingBox);
  // calling it directly must also be safe on an empty set.
  set.CreateBoundingBox();
  set.Rebuild();
  set.hazes.length = 0;
  set.CreateBoundingBox();
});

test("AudGameObjResource.PrepareEvent trims and prefixes as the emitter method (cpp:610-620)", () =>
{
  const emitter = new AudGameObjResource();
  emitter.eventPrefix = "wise:/";
  assert.equal(emitter.PrepareEvent("  play_hangar  "), "wise:/play_hangar");
  assert.equal(emitter.PrepareEvent("play_hangar", true), "play_hangar", "bypass skips the prefix");

  emitter.eventPrefix = "";
  assert.equal(emitter.PrepareEvent(" play_hangar "), "play_hangar");
});

test("EveVirtualCameraSystem.SetMainCamera: hard cut, and the transition wiring (cpp:87-105)", () =>
{
  const system = new EveVirtualCameraSystem();
  const first = { Update() {} };
  const second = { Update() {} };

  system.SetMainCamera(first);
  assert.equal(system.GetMainCamera(), first);
  assert.equal(system.transition, null);

  const calls = [];
  const transition = {
    SetSource(camera) { calls.push([ "source", camera ]); },
    SetTarget(camera) { calls.push([ "target", camera ]); },
    Play() { calls.push([ "play" ]); },
    GetCamera() { return second; }
  };
  system.SetMainCamera(second, transition);
  assert.equal(system.GetMainCamera(), second);
  assert.equal(system.transition, transition);
  assert.deepEqual(calls, [ [ "source", first ], [ "target", second ], [ "play" ] ]);
});

test("Tr2RaycastGeometryRes carries its LOD indices and BVH accessor (cpp:78-86)", () =>
{
  const res = new Tr2RaycastGeometryRes();
  res.SetLodIndices([ 0, 1, 0 ]);
  assert.deepEqual(res.lodIndices, [ 0, 1, 0 ]);
  assert.equal(res.GetBVH(), null, "null until the BVH type exists; the accessor is the contract");
});

test("TriSettings: per-setting repr and the registration helper's reject (h:62-76, Blue.cpp:8-44)", () =>
{
  const settings = new TriSettings();
  settings.RegisterSetting("shadows", true);
  settings.RegisterSetting("quality", 3);
  settings.RegisterSetting("preset", "hi");

  assert.equal(settings.GetSettingReprString(settings.FindSetting("shadows")), "True");
  assert.equal(settings.GetSettingReprString(settings.FindSetting("quality")), "3");
  assert.equal(settings.GetSettingReprString(settings.FindSetting("preset")), "'hi'");
  assert.equal(settings.GetReprString(), "{'preset':'hi', 'quality':3, 'shadows':True, }");

  // Carbon logs-and-returns on Be::INVALID; the registry refuses loudly.
  assert.throws(() => settings.RegisterSetting("broken", {}), TypeError);
});

test("EveSpotlightSet: both pool declarations are BUILT and land on the struct sizes (cpp:16-49)", () =>
{
  const cone = EveSpotlightSet.getConeDefinition();
  const glow = EveSpotlightSet.getGlowDefinition();

  assert.equal(glow.items.length, 7);
  assert.equal(cone.items.length, 6);
  // sizeof(GlowPoolVertex) = 72, sizeof(ConePoolVertex) = 60 (h:110-137).
  assert.equal(glow.nextOffset[1], 72);
  assert.equal(cone.nextOffset[1], 60);
  assert.deepEqual(glow.items.map(item => item.offset), [ 0, 0, 16, 32, 48, 56, 64 ]);
  assert.deepEqual(cone.items.map(item => item.offset), [ 0, 0, 16, 32, 48, 56 ]);

  const set = new EveSpotlightSet();
  const registered = [];
  const renderer = { RegisterEffect(...args) { registered.push(args); } };

  // No effects: neither registration fires.
  set.RegisterQuadRendererCone(renderer);
  set.RegisterQuadRendererGlow(renderer);
  assert.equal(registered.length, 0);

  set.coneEffect = { GetHashValue: () => 0xC0DE };
  set.glowEffect = { GetHashValue: () => 0x610 };
  set.RegisterQuadRendererCone(renderer);
  set.RegisterQuadRendererGlow(renderer);

  const [ coneCall, glowCall ] = registered;
  assert.equal(coneCall[0], 0xC0DE);
  assert.equal(coneCall[2], 60, "cone instance stride");
  assert.equal(coneCall[3], 4, "CONE_QUAD_COUNT");
  assert.equal(coneCall[4], cone);
  assert.equal(glowCall[0], 0x610);
  assert.equal(glowCall[2], 72, "glow instance stride");
  assert.equal(glowCall[3], 2, "SPRITE_QUAD_COUNT");
  assert.equal(glowCall[4], glow);
});
