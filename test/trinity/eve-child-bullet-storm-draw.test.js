// EveChildBulletStorm's instanced draw (EveChildBulletStorm.cpp:110-205, 313-350): four corner ids on stream 0, one
// 40-byte PerInstanceVertex per locator x multiplier on stream 1, six quad-list indices per instance, additive only.
import assert from "node:assert/strict";
import test from "node:test";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import {
  EveChildBulletStorm, EveUpdateContext, TriDevice, Tr2RenderContext_GetMainThreadRenderContext
} from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";

function setup(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const prior = context.GetRenderContextAL();
  const registered = new Set(TriDevice.GetResourcesRegistered());
  const al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);
  al.CreateDevice();
  al.BeginScene();
  const uploads = [], draws = [];
  const create = al.CreateBuffer.bind(al), draw = al.DrawIndexedInstanced.bind(al);
  al.CreateBuffer = (description, data, internal) =>
  {
    if (data) uploads.push({ description, data: data.slice() });
    return create(description, data, internal);
  };
  al.DrawIndexedInstanced = (...args) => { draws.push(args); return draw(...args); };
  const shader = { GetTechniqueIndex: () => 0, GetPassCount: () => 1, GetShaderTypeMask: () => 3, ApplyAllStateForPass() {} };
  const effect = { GetShaderStateInterface: () => shader, IsGood: () => true, CompatibleWithGdr: () => false, ApplyMaterialDataForPass() {} };
  t.after(() =>
  {
    for (const resource of TriDevice.GetResourcesRegistered())
    {
      if (!registered.has(resource) && resource.constructor === EveChildBulletStorm) resource.Destruct();
    }
    context.SetRenderContextAL(prior);
  });
  return { context, uploads, draws, effect };
}

function stormOverOneLocator(multiplier)
{
  const storm = new EveChildBulletStorm();
  storm.multiplier = multiplier;
  storm.sourceLocatorSet = "weapon";
  storm.sourceObject = {
    GetLocatorsForSet: name => name === "weapon" ? [ { position: [ 1, 2, 3 ], direction: [ 0, 0, 0, 1 ] } ] : null,
    GetBoundingSphere(out) { out.set([ 0, 0, 0, 50 ]); return true; }
  };
  assert.equal(storm.Rebuild(), true);
  return storm;
}

test("the storm uploads its corner ids and one per-instance vertex per locator and multiplier", t =>
{
  const { uploads } = setup(t);
  stormOverOneLocator(2);
  const corners = uploads.filter(item => item.description.stride === 4).at(-1).data;
  assert.deepEqual(Array.from(corners), [ 0, 1, 2, 3 ]);
  const instances = uploads.filter(item => item.description.stride === 40).at(-1).data;
  assert.equal(instances.length, 20);
  assert.deepEqual(Array.from(instances.subarray(0, 6)), [ 1, 2, 3, 0, 1, 0 ], "source position and its up axis");
  assert.deepEqual(Array.from(instances.subarray(10, 16)), [ 1, 2, 3, 0, 1, 0 ]);
  const phase0 = instances[9], phase1 = instances[19];
  assert.ok(Math.abs(phase1 - phase0 - 0.5) < 1e-6, "(j + streamRand) / multiplier steps by 1 / multiplier");
});

test("the storm renders only once updated, and draws one additive instanced batch", t =>
{
  const { context, draws, effect } = setup(t);
  const storm = stormOverOneLocator(3);
  storm.effect = effect;
  assert.deepEqual(storm.GetRenderables([]), [], "nothing before the first update");
  const update = new EveUpdateContext();
  storm.UpdateAsyncronous(update, {});
  assert.deepEqual(storm.GetRenderables([]), [ storm ]);

  const batches = [];
  storm.GetBatches({ Commit: batch => batches.push(batch) }, TriBatchType.TRIBATCHTYPE_TRANSPARENT, null);
  assert.equal(batches.length, 0, "additive only");
  storm.GetBatches({ Commit: batch => batches.push(batch) }, TriBatchType.TRIBATCHTYPE_ADDITIVE, null);
  assert.equal(batches.length, 1);
  context.SubmitGeometry(batches[0]);
  assert.equal(draws.length, 1);
  assert.equal(draws[0][0], 6, "one quad of indices");
  assert.equal(draws[0][1], 3, "one instance per locator x multiplier");

  storm.display = false;
  storm.GetBatches({ Commit: batch => batches.push(batch) }, TriBatchType.TRIBATCHTYPE_ADDITIVE, null);
  assert.equal(batches.length, 1, "a hidden storm commits nothing");
});
