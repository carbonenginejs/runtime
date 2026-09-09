// Carbon's RenderBatches family lives on Tr2RenderContext (Tr2RenderContext.h:37-52)
// and a grep of trinity/trinityal/ finds none of it: the backend is handed
// verbs, never a batch. These prove the family reaches the backend ONLY as
// verbs - topology, layout, streams, indices, draws - against a stub that
// knows nothing about accumulators.
import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2RenderBatch } from "../../npm/dist/trinity/core/index.js";
import { Topology } from "../../npm/dist/global/consts/renderContext/index.js";
import { RenderingMode } from "../../npm/dist/global/consts/graphics/index.js";
import { StubContext } from "../support/stubContext.js";

function shaderStub(passCount = 1)
{
  return {
    GetTechniqueIndex: name => (name === "Main" || name === "Depth" ? 0 : -1),
    GetPassCount: () => passCount,
    GetShaderTypeMask: () => 0b11,
    ApplyAllStateForPass() {}
  };
}

function materialStub(shader, applied = [])
{
  return {
    applied,
    GetShaderStateInterface: () => shader,
    ApplyMaterialDataForPass: (technique, pass) => applied.push(`${technique}:${pass}`)
  };
}

function batchOf(shader, material)
{
  const batch = new Tr2RenderBatch();

  batch.shader = shader;
  batch.material = material;
  batch.renderingMode = RenderingMode.RM_ANY;
  batch.topology = Topology.TOP_TRIANGLES;
  batch.vertexStreams = [ { id: "stream0" }, null ];
  batch.stride = [ 32, 0 ];
  batch.indexBuffer = { id: "indices" };
  batch.indexStride = 2;
  batch.indexCountPerInstance = 36;
  batch.instanceCount = 1;

  return batch;
}

const accumulatorOf = batches => ({ GetBatches: () => batches });

function contextWith(batchCount = 2)
{
  const context = StubContext();
  const al = context.GetRenderContextAL();
  const shader = shaderStub();
  const material = materialStub(shader);
  const batches = Array.from({ length: batchCount }, () => batchOf(shader, material));

  al.BeginScene();

  return { context, al, material, accumulator: accumulatorOf(batches) };
}

test("a submission is walked and reaches the backend as draws", () =>
{
  const { context, al, material, accumulator } = contextWith(2);
  const before = al.GetDrawCount();

  assert.equal(context.RenderBatches(accumulator), true);
  assert.equal(al.GetDrawCount() - before, 2, "one draw verb per batch pass");
  assert.deepEqual(material.applied, [ "0:0", "0:0" ], "the material applied per pass, on the Trinity side");
  assert.equal(typeof al.RenderBatches, "undefined", "the backend has no RenderBatches to be handed one");
});

test("a named technique the shader lacks draws nothing", () =>
{
  const { context, al, accumulator } = contextWith(1);
  const before = al.GetDrawCount();

  assert.equal(context.RenderBatches(accumulator, "Shadow"), true, "the accumulator was walked");
  assert.equal(al.GetDrawCount(), before, "but no batch had the technique");
  assert.equal(context.RenderBatches(accumulator, "Depth"), true);
  assert.equal(al.GetDrawCount(), before + 1);
});

test("an override material is applied in place of every batch's own", () =>
{
  const { context, al, material, accumulator } = contextWith(2);
  const override = materialStub(shaderStub(2));
  const before = al.GetDrawCount();

  assert.equal(context.RenderBatchesWithOverride(accumulator, override), true);
  assert.deepEqual(override.applied, [ "0:0", "0:1", "0:0", "0:1" ], "the override's shader decides the passes");
  assert.deepEqual(material.applied, [], "the batch's own material is not touched");
  assert.equal(al.GetDrawCount() - before, 4);
});

test("a null override falls through to an ordinary submission", () =>
{
  const { context, material, accumulator } = contextWith(1);

  assert.equal(context.RenderBatchesWithOverride(accumulator, null), true);
  assert.deepEqual(material.applied, [ "0:0" ]);
});

test("picking is not ported and refuses by name", () =>
{
  const { context, accumulator } = contextWith(1);

  assert.throws(() => context.RenderBatchesForPicking(accumulator), /RenderBatchesForPicking is not ported/u);
});

test("no accumulator submits nothing rather than an empty draw", () =>
{
  const { context, al } = contextWith(0);
  const before = al.GetDrawCount();

  assert.equal(context.RenderBatches(null), false);
  assert.equal(context.RenderBatchesWithOverride(null, materialStub(shaderStub())), false);
  assert.equal(al.GetDrawCount(), before);
});
