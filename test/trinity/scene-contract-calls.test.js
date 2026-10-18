import test from "node:test";
import assert from "node:assert/strict";
import { EveSpaceScene, EveComponentRegistry, EveChildPostProcessVolume, EveComponentType, Tr2LightManager, TriRenderBatchMap, Tr2RenderContext, TriDevice, gTriDev } from "../../npm/dist/trinity/index.js";
import { mat4 } from "../../npm/dist/global/math/index.js";

test("scene picking without a supplied viewport reads the device viewport (TriDevice.cpp:1132-1135)", () =>
{
  const scene = new EveSpaceScene();
  const previous = gTriDev.device;
  gTriDev.device = new TriDevice();
  try
  {
    gTriDev.device.viewport = { x: 0, y: 0, width: 10, height: 10 };
    assert.ok(scene.PickInfinity(1, 1, mat4.create(), mat4.create()));
  }
  finally
  {
    gTriDev.device = previous;
  }
  assert.ok(scene.PickInfinity(1, 1, mat4.create(), mat4.create(), { x: 0, y: 0, width: 10, height: 10 }));
});

function lightManager()
{
  return Object.assign(new Tr2LightManager(), {
    SetShadowQuality() {}, Clear() {}, SetFrustum() {}, AdjustLightCutoff() {}, ResolveLightData() {}
  });
}

for (const method of ["UpdatePostProcessAttributes", "BlendLightingOverrides", "GatherLights"])
{
  test(`${method} requires the scene's component registry`, () =>
  {
    const scene = new EveSpaceScene();
    scene.componentRegistry = null;
    assert.throws(() => scene[method](lightManager(), new Tr2RenderContext()), TypeError);
  });

  test(`${method} does not replace a missing component collection with an empty one`, () =>
  {
    const scene = new EveSpaceScene();
    scene.componentRegistry = new EveComponentRegistry();
    scene.componentRegistry.GetComponents = () => null;
    assert.throws(() => scene[method](lightManager(), new Tr2RenderContext()), TypeError);
  });
}

test("distortion rendering requires the batch map's accumulator", () =>
{
  const scene = new EveSpaceScene();
  const batches = new TriRenderBatchMap([]);
  batches.GetAccumulator = () => null;
  assert.throws(() => scene.RenderDistortionBatches(batches, null, null, new Tr2RenderContext()), TypeError);
});

test("post-process owners must supply their attributes", () =>
{
  const scene = new EveSpaceScene();
  const owner = new EveChildPostProcessVolume();
  owner.GetPostProcessAttributes = () => null;
  scene.componentRegistry.RegisterComponent(EveComponentType.PostProcessOwner, owner);
  assert.throws(() => scene.UpdatePostProcessAttributes(), TypeError);
});

test("hidden scene branches skip registry work", () =>
{
  const scene = new EveSpaceScene();
  scene.display = false;
  scene.componentRegistry = null;
  assert.doesNotThrow(() => scene.UpdatePostProcessAttributes());
  assert.doesNotThrow(() => scene.BlendLightingOverrides());
  assert.doesNotThrow(() => scene.GatherLights(lightManager()));
});
