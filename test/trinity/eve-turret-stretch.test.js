import { getRegisteredClassName } from "../../npm/dist/global/compose/className.js";
﻿import test from "node:test";
import { CjsPerObjectLayouts } from "../../src/trinity/core/rawData/CjsPerObjectLayouts.js";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { makePerObjectStore } from "./helpers/perObjectStore.js";
import { Tr2Renderer, Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/index.js";
import {
  EveFiringEffectElementContainer,
  IEveFiringEffectElement,
  EveLocalPositionCurve,
  EveRemotePositionCurve,
  EveStretch2,
  EveStretch3,
  EveEffectRoot2,
  EveTurretFiringFX,
  EveTurretSet,
  EveTurretTarget,
  EveUpdateContext,
  Tr2Controller,
  Tr2ControllerFloatVariable,
  Tr2CurveConstant,
  Tr2CurveScalar,
  TriCurveSet
} from "../../npm/dist/trinity/index.js";
import { FixtureEffect } from "../support/fixtureEffect.js";


/**
 * A target EveTurretTarget admits: EveEffectRoot2 maps ITriTargetable and IWorldPosition (Carbon
 * EveTurretTarget.cpp:69-79 queries both), and every locator answers one fixed world position.
 */
class FixedTarget extends EveEffectRoot2
{
  constructor(x, y, z)
  {
    super();
    this.fixedPosition = vec3.fromValues(x, y, z);
  }

  GetDamageLocatorPosition(_index, _inWorldSpace, out)
  {
    vec3.copy(out, this.fixedPosition);
    return true;
  }

  GetWorldPosition(out)
  {
    return vec3.copy(out, this.fixedPosition);
  }
}

/** A constant vector curve: Tr2CurveConstant answers the ITriVectorFunction calls. */
function constantCurve(x, y, z, w = 0)
{
  const curve = new Tr2CurveConstant();
  curve.value.set([x, y, z, w]);
  return curve;
}

/** A real curve set whose longest curve, a two-key scalar curve, lasts `duration` seconds. */
function timedCurveSet(name, duration)
{
  const set = new TriCurveSet();
  set.name = name;
  const curve = new Tr2CurveScalar();
  curve.AddKey(0, 0);
  curve.AddKey(duration, 1);
  set.curves.push(curve);
  return set;
}

/** A real stretch whose start and loop sets report `duration` and whose end set exists. */
function timedStretch(duration)
{
  const stretch = new EveStretch2();
  stretch.start = timedCurveSet("start", duration);
  stretch.loop = timedCurveSet("loop", duration);
  stretch.end = timedCurveSet("end", duration);
  return stretch;
}

test("stretch and turret classes are maintained in their Carbon families", () =>
{
  assert.ok(new EveStretch2() instanceof IEveFiringEffectElement);
  assert.ok(new EveStretch3() instanceof IEveFiringEffectElement);
  assert.throws(() => new IEveFiringEffectElement().StartFiring(0), /must be implemented/);
  for (const constructor of [
    EveFiringEffectElementContainer,
    EveLocalPositionCurve,
    EveRemotePositionCurve,
    EveStretch2,
    EveStretch3,
    EveTurretFiringFX,
    EveTurretSet,
    EveTurretTarget
  ])
  {
    assert.equal(CjsSchema.GetConstructor(getRegisteredClassName(constructor)), constructor);
  }

  assert.equal(existsSync(new URL("../../src/trinity/eve/renderable/stretch/EveRemotePositionCurve.js", import.meta.url)), true);
  assert.equal(existsSync(new URL("../../src/trinity/eve/EveRemotePositionCurve.js", import.meta.url)), false);
  assert.equal(existsSync(new URL("../../src/trinity/generated/eve/renderable/stretch/EveStretch2.js", import.meta.url)), false);
  assert.equal(existsSync(new URL("../../src/trinity/generated/eve/attachment/turrets/EveTurretSet.js", import.meta.url)), false);

  // The composite is retired; the catalog carries the
  // VS/PS pair it used to wrap.
  assert.ok(CjsPerObjectLayouts.Get("EveTurretSetVSData"));
  assert.ok(CjsPerObjectLayouts.Get("EveTurretSetPSData"));
});

test("EveLocalPositionCurve implements Carbon offset and ellipsoid behavior", () =>
{
  const curve = new EveLocalPositionCurve();
  // Carbon samples parent curves through their Be::Time overloads.
  curve.parentPositionCurve = constantCurve(10, 20, 30);
  curve.parentRotationCurve = constantCurve(0, 0, 0, 1);
  vec3.set(curve.positionOffset, 1, 2, 3);
  curve.SetBehavior(EveLocalPositionCurve.LocalPositionBehavior.POS_OFFSET_POSITION);
  assert.deepEqual(Array.from(curve.GetValueAt_Ticks(20_000_000, vec3.create())), [11, 22, 33]);
  // The double GetValueAt only copies m_value (Carbon cpp:316-322), which behaviours other than POS_NONE never store.
  assert.deepEqual(Array.from(curve.GetValueAt(2, vec3.create())), [0, 0, 0]);

  curve.alignPositionCurve = constantCurve(20, 20, 30);
  vec3.set(curve.boundingSize, 20, 30, 40);
  curve.offset = 5;
  curve.SetBehavior(EveLocalPositionCurve.LocalPositionBehavior.POS_NEAREST_BOUNDING_POINT);
  assert.deepEqual(Array.from(curve.GetValueAt_Ticks(20_000_000, vec3.create())), [35, 20, 30]);
});

test("EveFiringEffectElementContainer owns active element lifecycle", () =>
{
  const container = new EveFiringEffectElementContainer();
  const element = timedStretch(2);
  container.element = element;

  container.StartFiring(0.25);
  assert.equal(element.start.isPlaying, true);
  assert.equal(element.start.scaledTime, -0.25);
  container.UpdateSynchronous(new EveUpdateContext());
  container.UpdateAsynchronous(new EveUpdateContext());
  container.StopFiring();
  assert.equal(container.GetActive(), false);
  assert.equal(element.start.isPlaying, false);
  assert.equal(element.end.isPlaying, true);
});

test("EveStretch2 retains Carbon curve timing and portable render data", async () =>
{
  const stretch = new EveStretch2();
  // Real curve sets; the longest curve sets each duration.
  stretch.start = timedCurveSet("start", 2);
  stretch.loop = timedCurveSet("loop", 3);
  stretch.end = timedCurveSet("end", 2);
  stretch.quadCount = 4;
  assert.equal(stretch.Initialize(), true);
  assert.equal(stretch.GetCurveDuration(), 3);
  stretch.SetFiringTransform(vec3.fromValues(1, 2, 3), vec3.fromValues(1, 2, 13));
  stretch.StartFiring(0.5);
  const context = new EveUpdateContext();
  context.SetTime(2);
  stretch.Update(context);

  // Transient RawData payload (cpp:327-337): the m_source..m_effectData member
  // run as 4 vec4s, same bytes bound to VS and PS (cpp:23-39).
  const store = makePerObjectStore();
  const data = stretch.GetPerObjectData({ Alloc: name => store.Allocate(name) });
  assert.deepEqual([...data.GetLayout().stages], ["vs", "ps"]);
  assert.deepEqual(Array.from(data.Copy("sourceData", new Float32Array(4)).slice(0, 3)), [1, 2, 3]);
  assert.deepEqual(Array.from(data.Copy("destinationData", new Float32Array(4)).slice(0, 3)), [1, 2, 13]);
  assert.equal(stretch.GetRenderables([]).length, 1);

  const committed = [];
  const batches = { Commit(batch) { committed.push(batch); return true; } };
  stretch.effect = FixtureEffect({ name: "stretchEffect" });
  assert.equal(stretch.GetBatches(batches, TriBatchType.TRIBATCHTYPE_TRANSPARENT, data, 0), false);
  // The draw binds the renderer's quad-list index buffer (EveStretch2.cpp:343-347),
  // which exists once a device does and quads are reserved.
  Tr2RenderContext_GetMainThreadRenderContext().GetRenderContextAL().CreateDevice({ mode: { width: 64, height: 64 } });
  Tr2Renderer.ReserveQuadListIndexBuffer(EveStretch2.MAX_QUAD_COUNT);
  // A Tr2DeviceResource (EveStretch2.h:28): built before the device, it and the
  // shared "EveStretch2VB" quads are prepared when the device prepares.
  const { TriDevice } = await import("../../npm/dist/trinity/core/index.js");
  new TriDevice().PrepareDeviceResources();
  assert.equal(stretch.GetBatches(batches, TriBatchType.TRIBATCHTYPE_ADDITIVE, data, 0), true);
  assert.equal(stretch.HasTransparentBatches(), false);
  assert.equal(stretch.GetSortValue(), 0);
  assert.equal(committed[0].material, stretch.effect);
  assert.equal(committed[0].objectData, data);
  assert.equal(committed[0].indexCountPerInstance, 24);
  assert.equal(committed[0].instanceCount, 1);
  // The shared 128-quad (quadIndex, cornerIndex) float2 buffer (cpp:51-72),
  // based at its allocation, under the FLOAT32_2 POSITION declaration.
  const vb = stretch._vb.GetSharedResource();
  assert.equal(committed[0].vertexStreams[0], vb.GetBuffer());
  assert.equal(committed[0].stride[0], 8);
  assert.equal(committed[0].baseVertexLocation, vb.GetOffset() / vb.GetStride());
  assert.equal(committed[0].vertexDeclaration, stretch._vertexDeclHandle);
  stretch.StopFiring();
  assert.equal(stretch.end.isPlaying, true);
  assert.equal(stretch.start.isPlaying, false);
});

test("EveStretch3 applies deferred controller firing state", () =>
{
  const controller = new Tr2Controller();
  for (const name of ["FiringDelay", "IsFiring"])
  {
    const variable = new Tr2ControllerFloatVariable();
    variable.name = name;
    controller.variables.push(variable);
  }
  const stretch = new EveStretch3();
  stretch.controllers.push(controller);
  stretch.source = constantCurve(0, 0, 0);
  stretch.dest = constantCurve(0, 0, 10);
  stretch.StartFiring(0.75);
  const context = new EveUpdateContext();
  context.SetTime((1) * 10_000_000);
  stretch.UpdateSynchronous(context);
  assert.equal(stretch.length.value, 10);
  assert.equal(controller.isPlaying, true);
  assert.equal(controller.GetVariableValue("FiringDelay"), 0.75);
  assert.equal(controller.GetVariableValue("IsFiring"), 1);
  stretch.StopFiring();
  context.SetTime((2) * 10_000_000);
  stretch.UpdateSynchronous(context);
  assert.equal(controller.GetVariableValue("IsFiring"), 0);
});

test("EveTurretTarget bounds the miss queue and switches projectile destination visibility", () =>
{
  const target = new EveTurretTarget();
  const targetable = new FixedTarget(100, 0, 0);
  targetable.GetGoodDamageLocatorIndex = () => 2;
  targetable.GetClosestDamageLocatorIndex = () => 2;
  targetable.GetMissPosition = (_source, out) => { vec3.set(out, 100, 10, 0); };
  targetable.GetRadius = () => 25;
  targetable.GetImpactConfiguration = () => EveTurretTarget.ImpactConfiguration.IMPACT_ARMOR;
  assert.equal(target.SetTargetable(targetable), true);
  target.SetBehaviour(false, true, 0, EveTurretTarget.ImpactBehaviour.DAMAGE_LOCATOR);
  for (let index = 0; index < 6; index++) target.SetShotMissed(index % 2 === 0, index);
  assert.equal(target.MissQueueSize(), 4);
  assert.equal(target.GetLastShotTime(), 5);
  target.StartFireAtLocator(2, 0, 1, vec3.create());
  assert.equal(target.GetShotMissed(), true);
  assert.equal(target.ShowDestObject(), false);
  assert.equal(target.GetRadius(), 25);
});

test("EveTurretFiringFX preserves Carbon's one-frame ready-to-fire delay", () =>
{
  const empty = new EveTurretFiringFX();
  empty.Initialize();
  assert.equal(empty.GetFiringDuration(), 1000);

  const stretch = timedStretch(2);
  const firing = new EveTurretFiringFX();
  firing.stretch.push(stretch);
  firing.Initialize();
  firing.SetMuzzleTransform(0, mat4.fromTranslation(mat4.create(), vec3.fromValues(1, 2, 3)));
  firing.PrepareFiring(0);
  const context = new EveUpdateContext();
  context.SetTime((1) * 10_000_000); context.SetTime((1.1) * 10_000_000);
  assert.equal(firing.UpdateAsynchronous(context), false);
  assert.equal(firing.ReadyToFire(), true);
  assert.equal(firing.UpdateAsynchronous(context), true);
  // StartFiring(delay) plays the start set from -delay (EveStretch2 StartFiring).
  assert.equal(stretch.start.isPlaying, true);
  assert.equal(stretch.start.scaledTime, Math.fround(0.1));
  const start = vec3.create();
  assert.equal(firing.GetStartPosition(start), true);
  assert.deepEqual(Array.from(start), [1, 2, 3]);
  assert.equal(firing.GetRenderables([]).length, 1);
});

test("EveTurretSet exposes Carbon state values and portable firing transforms", () =>
{
  assert.deepEqual(EveTurretSet.State, {
    STATE_INVALID: 0,
    STATE_DEACTIVE: 1,
    STATE_IDLE: 2,
    STATE_TARGETING: 3,
    STATE_FIRING: 4,
    STATE_RELOADING: 5
  });

  const set = new EveTurretSet();
  const local = mat4.fromTranslation(mat4.create(), vec3.fromValues(5, 0, 0));
  set.SetLocalTransform(0, local);
  set.UpdateTurretTransforms(mat4.fromTranslation(mat4.create(), vec3.fromValues(10, 0, 0)));
  const transform = set.GetFiringBoneWorldTransform(0);
  assert.deepEqual(Array.from(transform.subarray(12, 15)), [15, 0, 0]);
  set.EnterStateDeactive();
  assert.equal(set.state, EveTurretSet.State.STATE_DEACTIVE);
  set.ForceStateTargeting();
  assert.equal(set.state, EveTurretSet.State.STATE_TARGETING);
  assert.equal(set.GetShotTimeVariance(), 0.6);
});


test("EveTurretTarget fades over locator changes only when opted in", () =>
{
  const targetable = new FixedTarget(100, 0, 0);

  // Default behaviour: stopping fire snaps (influence disabled).
  const snapping = new EveTurretTarget();
  assert.equal(snapping.SetTargetable(targetable), true);
  snapping.positionOldInfluence = -1;
  snapping.Update(0.25, [ 0, 0, 0 ]);
  snapping.StopFireAtLocator();
  assert.equal(snapping.positionOldInfluence, -1);

  // Opted in (Carbon EveTurretTarget.cpp:98-105,162-174): both firing at a
  // locator and stopping seed the blend from the current tracking position.
  const fading = new EveTurretTarget();
  assert.equal(fading.SetTargetable(targetable), true);
  fading.SetFadeOnLocatorChange(true);
  fading.positionOldInfluence = -1;
  fading.Update(0.25, [ 0, 0, 0 ]);
  fading.StopFireAtLocator();
  assert.equal(fading.positionOldInfluence, 1);
  assert.deepEqual(Array.from(fading.positionOld), Array.from(fading.position));

  fading.positionOldInfluence = -1;
  fading.StartFireAtLocator(0, 0, 0, [ 0, 0, 0 ]);
  assert.equal(fading.positionOldInfluence, 1);

  // SetImpactBehaviour sets only the impact half; miss behaviour is untouched
  // (Carbon EveTurretTarget.cpp:350-369).
  const split = new EveTurretTarget();
  split.SetBehaviour(true, true, 5, EveTurretTarget.ImpactBehaviour.CENTER);
  split.SetImpactBehaviour(9, EveTurretTarget.ImpactBehaviour.SHIELD_ELLIPSOID);
  assert.equal(split.behaviour, EveTurretTarget.ImpactBehaviour.SHIELD_ELLIPSOID);
  assert.equal(split.SetTargetable(targetable), true);
  split.SetShotMissed(true);
  split.PopShotMissed();
  // projectile miss behaviour survives the impact-only setter
  assert.equal(split.ShowDestObject(), false);
});
