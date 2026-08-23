import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import {
  EveChildMesh,
  EveChildModifierCameraOrientedRotationConstrained,
  EveComponentRegistry,
  EveEntity,
  EveSpaceObject2,
  EveSpaceScene,
  Tr2RenderContext
} from "../npm/dist/index.js";


const EPSILON = 1e-4;

/**
 * @param {number} actual
 * @param {number} expected
 * @param {string} message
 */
function assertClose(actual, expected, message)
{
  assert.ok(
    Math.abs(actual - expected) <= EPSILON,
    `${message}: expected ${expected}, got ${actual}`
  );
}

test("EveSpaceScene.Update stamps the scene-owned frame context", () =>
{
  const scene = new EveSpaceScene();

  scene.Update(0, 2.5);
  assert.equal(scene.updateContext.GetTime(), 2.5);
  assert.equal(scene.updateContext.GetDeltaT(), 0, "no deltaT on the first stamped frame");
  assert.equal(scene.updateTime, 2.5);

  scene.Update(0, 2.75);
  assert.equal(scene.updateContext.GetTime(), 2.75);
  assertClose(scene.updateContext.GetDeltaT(), 0.25, "deltaT from the second frame");

  // m_update guard: nothing advances when update is off.
  scene.update = false;
  scene.Update(0, 9);
  assert.equal(scene.updateContext.GetTime(), 2.75);
  assert.equal(scene.updateTime, 2.75);
});

test("EveSpaceScene script helpers preserve Carbon's direct scene contracts", () =>
{
  const scene = new EveSpaceScene();
  const clocks = [];
  scene.curveSets.push({
    Update(realTime, simTime)
    {
      clocks.push([realTime, simTime]);
    }
  });

  scene.UpdateScene(4.5);
  assert.deepEqual(clocks, [[4.5, 4.5]]);

  const debugPayload = { name: "post-process-debug" };
  scene.postProcessDebug = debugPayload;
  assert.equal(scene.GetPostProcessDebug(), debugPayload);
});

test("Eve component registries retain Carbon's entity and component indices", () =>
{
  class RenderableEntity extends EveEntity
  {
    RegisterComponents()
    {
      this.registry.RegisterComponent("Renderable", this);
    }
  }

  const registry = new EveComponentRegistry();
  const first = new RenderableEntity();
  const second = new RenderableEntity();
  first.Register(registry);
  second.Register(registry);

  assert.deepEqual(registry.GetComponentInfo(), [["Renderable", 2]]);
  assert.deepEqual(registry.GetComponents("Renderable"), [first, second]);

  first.UnRegister(registry);
  assert.deepEqual(registry.GetComponents("Renderable"), [second]);
  assert.equal(second.indexInRegistry, 0);

  registry.Clear();
  assert.equal(second.IsInRegistry(), false);
  assert.equal(second.indexInRegistry, -1);
});

test("EveSpaceScene re-registers Carbon entities through its owned registry", () =>
{
  class SceneEntity extends EveEntity
  {
    RegisterComponents()
    {
      this.registry.RegisterComponent("SceneEntity", this);
    }
  }

  const scene = new EveSpaceScene();
  const entity = new SceneEntity();
  entity.Register(scene.componentRegistry);
  scene.objects.push(entity);

  scene.ReregisterEntities();
  assert.equal(entity.GetComponentRegistry(), scene.componentRegistry);
  assert.deepEqual(scene.componentRegistry.GetComponentInfo(), [["SceneEntity", 1]]);
});

test("EveSpaceScene.Update drives collections in Carbon's order and signatures", () =>
{
  const scene = new EveSpaceScene();
  const calls = [];

  scene.backgroundObjects.push({
    UpdateSyncronous(context)
    {
      calls.push(["background-sync", context]);
    },
    UpdateAsyncronous(context)
    {
      calls.push(["background-async", context]);
    }
  });
  scene.curveSets.push({
    Update(realTime, simTime)
    {
      calls.push(["curveSet", realTime, simTime]);
    }
  });
  scene.objects.push({
    UpdateSyncronous(context)
    {
      calls.push(["object-sync", context]);
    },
    UpdateAsyncronous(context)
    {
      calls.push(["object-async", context]);
    }
  });

  scene.Update(1.5, 3);

  assert.deepEqual(calls.map(call => call[0]), [
    "background-sync",
    "background-async",
    "curveSet",
    "object-sync",
    "object-async"
  ]);
  // Everyone receives the same scene-owned context instance.
  assert.equal(calls[0][1], scene.updateContext);
  assert.equal(calls[3][1], scene.updateContext);
  assert.equal(calls[4][1], scene.updateContext);
  // Curve sets get (realTime, simTime).
  assert.deepEqual(calls[2].slice(1), [1.5, 3]);
});

test("EveSpaceScene.Update tracks the origin and the sun direction", () =>
{
  const scene = new EveSpaceScene();

  scene.ballpark = {
    referencePoint: [100, 0, 0],
    GetReferencePoint(_time, out)
    {
      out[0] = this.referencePoint[0];
      out[1] = this.referencePoint[1];
      out[2] = this.referencePoint[2];
    }
  };
  scene.sunBall = {
    Update(_time, out)
    {
      out[0] = 0;
      out[1] = 0;
      out[2] = 2;
    }
  };

  scene.Update(0, 1);
  // First stamped frame: origin adopted, no shift yet (Infinity sentinel).
  assert.deepEqual(Array.from(scene.updateContext.GetOrigin()), [100, 0, 0]);
  for (const [axis, value] of Array.from(scene.updateContext.GetOriginShift()).entries())
  {
    assertClose(value, 0, `first-frame originShift[${axis}]`);
  }
  // Sun direction = -Normalize(sun position). (Loose compare: negation
  // produces -0 on zero components.)
  assertClose(scene.sunDirection[0], 0, "sunDirection.x");
  assertClose(scene.sunDirection[1], 0, "sunDirection.y");
  assertClose(scene.sunDirection[2], -1, "sunDirection.z");

  scene.ballpark.referencePoint = [103, 0, 0];
  scene.Update(0, 2);
  // Second frame: shift = -(originNow - origin). (Loose zero compare: the
  // negation produces -0 on unchanged axes.)
  assert.deepEqual(Array.from(scene.updateContext.GetOrigin()), [103, 0, 0]);
  assertClose(scene.updateContext.GetOriginShift()[0], -3, "originShift.x");
  assertClose(scene.updateContext.GetOriginShift()[1], 0, "originShift.y");
  assertClose(scene.updateContext.GetOriginShift()[2], 0, "originShift.z");
});

test("EveSpaceScene.Update drives a camera modifier end to end via the stamped render context", () =>
{
  const scene = new EveSpaceScene();

  const object = new EveSpaceObject2();
  object.update = true;
  object.display = true;
  const mesh = new EveChildMesh();
  mesh.AddTransformModifier(new EveChildModifierCameraOrientedRotationConstrained());
  object.effectChildren.push(mesh);
  scene.objects.push(object);

  // Host/driver role: stamp the camera view onto the scene context's render
  // context (camera at +X, identity orientation).
  const renderContext = new Tr2RenderContext();
  renderContext.SetViewTransform(mat4.fromTranslation(mat4.create(), [-10, 0, 0]));
  scene.updateContext.renderContext = renderContext;

  scene.Update(0, 1);

  // The child mesh yawed so its local +Z faces the camera on +X - the context
  // threaded scene -> object -> child -> modifier.
  assertClose(mesh.worldTransform[8], 1, "scene-driven camera forward.x");
  assertClose(mesh.worldTransform[10], 0, "scene-driven camera forward.z");
});

test("object-level curve sets and overlays receive the context time as both clocks", () =>
{
  const scene = new EveSpaceScene();
  const object = new EveSpaceObject2();
  object.update = true;
  scene.objects.push(object);

  const calls = [];
  object.curveSets.push({
    Update(realTime, simTime)
    {
      calls.push(["curveSet", realTime, simTime]);
    }
  });
  object.overlayEffects.push({
    Update(realTime, simTime)
    {
      calls.push(["overlay", realTime, simTime]);
    }
  });

  // Distinct clocks: scene realTime 7, simTime 3. Carbon passes the CONTEXT
  // time (simTime) as BOTH arguments to object-level curve sets and overlay
  // effects - the scene's realTime must not leak through.
  scene.Update(7, 3);

  assert.deepEqual(calls, [
    ["overlay", 3, 3],
    ["curveSet", 3, 3]
  ]);
});

test("maintained EveSpaceScene replaces the generated fallback", () =>
{
  const generatedScene = new URL("../src/generated/eve/scene/EveSpaceScene.js", import.meta.url);
  assert.equal(existsSync(generatedScene), false);

  const summary = JSON.parse(readFileSync(new URL("../src/generated/summary.json", import.meta.url), "utf8"));
  const skipped = summary.skipped.filter(entry =>
    ["EveSpaceScene", "EveUpdateContext"].includes(entry.className)
  );
  assert.deepEqual(skipped.map(entry => entry.className).sort(), [
    "EveSpaceScene",
    "EveUpdateContext"
  ]);
  assert.equal(skipped.every(entry => entry.reason === "hand-maintained source exists"), true);
});
