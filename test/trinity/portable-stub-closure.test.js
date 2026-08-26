import assert from "node:assert/strict";
import test from "node:test";
import {
  EveChildParticleSystem,
  EveChildSmartLightSet,
  EveSmartLightColorShareGroup,
  EveSpaceObject2,
  EveSpherePin,
  Tr2DepthStencil,
  Tr2RotationTool,
  Tr2RenderTarget,
  Tr2ScalingTool,
  Tr2TranslationTool
} from "../../npm/dist/trinity/index.js";


test("device graph wrappers preserve Carbon's false HasALObject result", () =>
{
  assert.equal(new Tr2DepthStencil().HasALObject(0, null), false);
  assert.equal(new Tr2RenderTarget().HasALObject(0, null), false);
});


test("EveSpherePin uses itself as its picking identity", () =>
{
  const pin = new EveSpherePin();
  assert.equal(pin.GetID(), pin);
});


test("EveSpaceObject2 evaluates its realized world sphere for shadows", () =>
{
  const object = new EveSpaceObject2();
  object.boundingSphereRadius = 5;
  assert.equal(object.GetBoundingSphere(new Float32Array(4)), true);

  const sizes = [0];
  const shadowFrustum = {
    IsVisible: () => true,
    GetSizeInShadow: () => 20
  };
  assert.equal(object.IsCastingShadow({}, shadowFrustum, 0, sizes), true);
  assert.equal(sizes[0], 20);

  object.display = false;
  assert.equal(object.IsCastingShadow({}, shadowFrustum, 0, sizes), false);
});


test("EveChildParticleSystem delegates visible mesh areas", () =>
{
  const calls = [];
  const child = new EveChildParticleSystem();
  child.mesh = {
    GetAreas: batchType => [`area:${batchType}`],
    GetBatches: (...args) => {
      calls.push(args);
      return true;
    }
  };

  const batches = {};
  const perObjectData = {};
  assert.equal(child.GetBatches(batches, 3, perObjectData, 0), true);
  assert.deepEqual(calls[0], [batches, ["area:3"], perObjectData, Infinity, false]);
});


test("smart-light debug collection fans out through owned groups", () =>
{
  const renderer = {};
  const placements = [{}];
  const calls = [];
  const leaf = {
    RenderDebugInfo: (...args) => calls.push(args)
  };

  const shareGroup = new EveSmartLightColorShareGroup();
  shareGroup.lightGroups = [leaf];
  shareGroup.RenderDebugInfo(renderer, placements, 1);
  assert.deepEqual(calls.pop(), [renderer, placements, 1]);

  const set = new EveChildSmartLightSet();
  set.distribution = {
    GetPlacementData: () => placements,
    GetNumberOfPlacements: () => 1
  };
  set.lightGroups = [leaf];
  set.RenderDebugInfo(renderer);
  assert.deepEqual(calls.pop(), [renderer, placements, 1]);
});


test("manipulation tools expose Carbon's captured primitive subsets and colours", () =>
{
  const makePrimitive = name => ({
    name,
    color: null,
    SetCurrentColor(color)
    {
      this.color = Array.from(color);
    }
  });

  const rotation = new Tr2RotationTool();
  rotation.primitives = ["x", "y", "z", "w", "ww"].map(makePrimitive);
  assert.deepEqual(rotation.GetPrimitivesToRender(), rotation.primitives);
  rotation.ResetPrimitiveColors();
  assert.deepEqual(rotation.primitives[0].color, [1, Math.fround(0.01), Math.fround(0.01), 1]);
  assert.deepEqual(rotation.primitives[4].color, [0.5, 0.5, 0.5, 1]);

  const translation = new Tr2TranslationTool();
  translation.primitives = ["x", "_x", "y", "w"].map(makePrimitive);
  translation.captured = true;
  translation.selectedAxis = "x";
  assert.deepEqual(translation.GetPrimitivesToRender().map(item => item.name), ["x", "w"]);
  translation.ResetPrimitiveColors();
  assert.deepEqual(translation.primitives[3].color, [0, 1, 1, 1]);

  const scaling = new Tr2ScalingTool();
  scaling.primitives = ["x", "_x", "y", "w"].map(makePrimitive);
  scaling.captured = true;
  scaling.selectedAxis = "x";
  assert.deepEqual(scaling.GetPrimitivesToRender().map(item => item.name), ["x", "_x", "w"]);
  scaling.selectedAxis = "w";
  assert.deepEqual(scaling.GetPrimitivesToRender(), scaling.primitives);
});
