// EveBoosterSet2's device half and EveBoosterSet2Renderable.GetBatches
// (Carbon EveBoosterSet2.cpp:174-240, 891-985), with the quad-list index
// buffer they draw through (Tr2Renderer.cpp:1229-1266).
import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { EveBoosterSet2 } from "../../npm/dist/trinity/index.js";
import { Tr2Renderer, Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/index.js";
import { Tr2EffectStateManager } from "../../npm/dist/trinity/shader/Tr2EffectStateManager.js";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import { FixtureEffect } from "../support/fixtureEffect.js";

// Device resources are made through the main-thread context, and only once it
// has a device (Tr2Renderer.IsResourceCreationAllowed).
Tr2RenderContext_GetMainThreadRenderContext().GetRenderContextAL().CreateDevice({ mode: { width: 64, height: 64 } });

function BoosterSet(count)
{
  const set = new EveBoosterSet2();
  set.effect = FixtureEffect({ id: "booster" });
  for (let index = 0; index < count; index++)
  {
    set.Add(mat4.fromTranslation(mat4.create(), [ index, 0, 0 ]), [ 0, 1, 1, 1 ], false, 0, 0);
  }
  set.SetCount(1);
  return set;
}

function Accumulator()
{
  const committed = [];
  return { committed, Commit: batch => committed.push(batch) };
}

test("ReserveQuadListIndexBuffer makes 16-bit quad indices once a device exists (Tr2Renderer.cpp:1229-1266)", () =>
{
  Tr2Renderer.ReserveQuadListIndexBuffer(6);

  const indexBuffer = Tr2Renderer.GetQuadListIndexBuffer();
  assert.equal(indexBuffer.IsValid(), true);
  assert.equal(indexBuffer.GetStride(), 2);
  assert.ok(indexBuffer.GetSize() >= 6 * 6 * 2);
});

test("PrepareResources builds the instanced declaration and one 92-byte instance per booster (cpp:902-985)", () =>
{
  const set = BoosterSet(3);

  assert.equal(set.PrepareResources(), true);
  assert.notEqual(set._vertexDeclHandle, Tr2EffectStateManager.Unknown);
  assert.equal(set._instanceBuffer.IsValid(), true);
  assert.equal(set._instanceBuffer.GetStride(), 92);
  assert.equal(set._instanceBuffer.GetSize(), 3 * 92);

  const box = set._vertexBuffer.GetSharedResource();
  assert.equal(box.IsValid(), true);
  assert.equal(box.GetStride(), 20);
  assert.equal(box.GetSize(), 24 * 20);
});

test("Clear releases the instance buffer and the declaration (cpp:748-766, 891-895)", () =>
{
  const set = BoosterSet(2);
  set.PrepareResources();

  set.Clear();

  assert.equal(set._instanceBuffer.IsValid(), false);
  assert.equal(set._vertexDeclHandle, Tr2EffectStateManager.Unknown);
});

test("GetBatches commits one instanced additive draw of the box (cpp:174-220)", () =>
{
  const set = BoosterSet(2);
  set.PrepareResources();
  Tr2Renderer.ReserveQuadListIndexBuffer(128);

  const renderable = set.instances[0];
  renderable.boostersVisible = true;
  renderable.boosterHighLod = true;

  const accumulator = Accumulator();
  renderable.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_ADDITIVE, null);

  assert.equal(accumulator.committed.length, 1);
  const [ batch ] = accumulator.committed;
  const box = set._vertexBuffer.GetSharedResource();
  const indexBuffer = Tr2Renderer.GetQuadListIndexBuffer();

  assert.equal(batch.material, set.effect);
  assert.equal(batch.vertexDeclaration, set._vertexDeclHandle);
  assert.equal(batch.stride[0], 20);
  assert.equal(batch.stride[1], 92);
  assert.equal(batch.vertexStreams[1], set._instanceBuffer.GetBuffer());
  assert.equal(batch.indexStride, 2);
  // The box has six planes: 3 * 2 * 6 indices per booster instance.
  assert.equal(batch.indexCountPerInstance, 36);
  assert.equal(batch.instanceCount, 2);
  assert.equal(batch.startIndexLocation, indexBuffer.GetStartIndex());
  assert.equal(batch.baseVertexLocation, box.GetOffset() / 20);
  assert.equal(batch.startInstanceLocation, set._instanceBuffer.GetOffset() / 92);
});

test("GetBatches draws nothing outside the additive pass, or when the boosters are lodded out", () =>
{
  const set = BoosterSet(1);
  set.PrepareResources();
  const renderable = set.instances[0];

  const opaque = Accumulator();
  renderable.boostersVisible = true;
  renderable.GetBatches(opaque, TriBatchType.TRIBATCHTYPE_OPAQUE, null);
  assert.equal(opaque.committed.length, 0);

  const hidden = Accumulator();
  renderable.boostersVisible = false;
  renderable.GetBatches(hidden, TriBatchType.TRIBATCHTYPE_ADDITIVE, null);
  assert.equal(hidden.committed.length, 0);
});
