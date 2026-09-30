import assert from "node:assert/strict";
import test from "node:test";
import {
  EveTurretSet, EveChildContainer, EveUpdateContext, Tr2InstancedMesh,
  Tr2ParticleSystem, Tr2ParticleElementDeclaration, ITr2GenericEmitterUpdateArguments,
  Tr2RenderContext_GetMainThreadRenderContext
} from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";

test("ambient synchronous visibility and asynchronous display use different native predicates", t =>
{
  const turret = new EveTurretSet();
  t.after(() => turret.Destroy());
  turret.SetLocalTransform(0, mat4.create());
  const ambient = new EveChildContainer();
  turret.ambientEffectEditingMode = true;
  turret.SetAmbientEffect(ambient);
  const context = new EveUpdateContext();
  let synchronous, asynchronous;
  ambient.UpdateSyncronous = (_context, params) => { synchronous = params.isVisible; };
  ambient.UpdateAsyncronous = (_context, params) => { asynchronous = params.isVisible; };
  for (const [display, displayEffects, clip, expectedSync, expectedAsync] of [
    [true, false, 0, false, true], [true, true, 1, false, true],
    [false, true, 0, false, false], [true, true, 0, true, true]
  ])
  {
    turret.display = display;
    turret.displayEffects = displayEffects;
    turret._parentData.clipRadiusSq = clip;
    turret.UpdateSyncronous(context);
    turret.UpdateAsyncronous(context);
    assert.equal(synchronous, expectedSync, "EveTurretSet.cpp:1272 uses IsAmbientVisible");
    assert.equal(asynchronous, expectedAsync, "EveTurretSet.cpp:1500 uses m_display alone");
  }
});

test("locator decomposition preserves Carbon's nonunit quaternion under shear", t =>
{
  const turret = new EveTurretSet();
  t.after(() => turret.Destroy());
  turret.SetLocalTransform(0, mat4.create());
  const ambient = new EveChildContainer();
  turret.SetAmbientEffect(ambient);
  let observed;
  turret.generatedDistributedAmbientEffect.UpdateInstance = (_index, scale, rotation, translation) =>
  {
    observed = { scale: Array.from(scale), rotation: Array.from(rotation), translation: Array.from(translation) };
  };
  for (const shear of [0, 0.35])
  {
    const locator = mat4.create();
    mat4.rotateY(locator, locator, 0.43);
    mat4.scale(locator, locator, [2, 3, 4]);
    for (let i = 0; i < 3; i++) locator[4 + i] += shear * locator[i];
    locator[12] = 7; locator[13] = -3; locator[14] = 11;
    // TriMatrixRemoveScaling cpp:683, then Matrix.cpp:225: independently
    // normalized axes; Quaternion.cpp:14-21 trace-positive scalar branch.
    const normalized = Array.from(locator);
    for (let axis = 0; axis < 3; axis++)
    {
      const at = axis * 4, length = Math.hypot(normalized[at], normalized[at + 1], normalized[at + 2]);
      for (let i = 0; i < 3; i++) normalized[at + i] /= length;
    }
    const root = Math.sqrt(normalized[0] + normalized[5] + normalized[10] + 1);
    const expected = [(normalized[6] - normalized[9]) / (2 * root),
      (normalized[8] - normalized[2]) / (2 * root),
      (normalized[1] - normalized[4]) / (2 * root), root / 2];
    turret.SetLocalTransform(0, locator);
    const actual = turret.GetTurrets()[0];
    for (let i = 0; i < 4; i++)
    {
      assert.ok(Math.abs(actual.localQuaternion[i] - expected[i]) < 1e-6,
        "EveTurretSet.cpp:1777 / Quaternion.cpp:7-56 do not normalize the result");
      assert.equal(observed.rotation[i], actual.localQuaternion[i]);
    }
    assert.deepEqual(observed.scale, [1, 1, 1], "decomposition output must not overwrite ambient unit scale");
    assert.deepEqual(observed.translation, [7, -3, 11]);
    if (shear) assert.ok(Math.abs(Math.hypot(...actual.localQuaternion) - 1) > 1e-4);
    else assert.ok(Math.abs(Math.hypot(...actual.localQuaternion) - 1) < 1e-6);
  }
});

test("aging-only particles carry the immediately previous lifetime into the GPU half", t =>
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const previous = context.GetRenderContextAL(), al = new Tr2RenderContextALStub();
  al.CreateDevice(); context.SetRenderContextAL(al);
  t.after(() => context.SetRenderContextAL(previous));
  for (const aging of [true, false])
  {
    const system = new Tr2ParticleSystem();
    t.after(() => system.ReleaseResources());
    system.maxParticleCount = 1;
    system.updateSimulation = false;
    system.applyAging = aging;
    const declaration = new Tr2ParticleElementDeclaration();
    declaration.elementType = Tr2ParticleElementDeclaration.Type.LIFETIME;
    declaration.usedByGPU = true;
    system.elements.push(declaration);
    system.Initialize();
    system.SpawnParticle({ lifetime: [0, 10] });
    const args = new ITr2GenericEmitterUpdateArguments();
    for (const time of [1, 1.1, 1.2]) { args.time = time; system.Update(args); }
    const element = system.GetElement(Tr2ParticleElementDeclaration.Type.LIFETIME);
    const half = element.instanceStride / 2;
    assert.ok(Math.abs(element.buffer[element.startOffset] - (aging ? 0.02 : 0)) < 1e-6);
    assert.ok(Math.abs(element.buffer[element.startOffset + half] - (aging ? 0.01 : 0)) < 1e-6,
      "Tr2ParticleSystem.cpp:623 marks aging data stale for the copy at cpp:493-510");
  }
});

test("instanced mesh subclasses can override the inherited area-list helper", () =>
{
  class SpecializedMesh extends Tr2InstancedMesh
  {
    calls = 0;
    _IsAreaList(list) { this.calls++; return super._IsAreaList(list); }
  }
  const mesh = new SpecializedMesh();
  mesh.OnListModified(0, 0, 0, null, mesh.opaqueAreas);
  assert.equal(mesh.calls, 1);
  assert.equal(mesh._IsAreaList(mesh.opaqueAreas), true);
  assert.equal(mesh._IsAreaList([]), false);
});
