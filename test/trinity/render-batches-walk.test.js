// The batch walk belongs to Trinity, not to a backend.
//
// Carbon declares RenderBatches, RenderBatchesInOrder and RenderBatchGroup on
// `Tr2RenderContext.h` - the Trinity side - and a grep of `trinity/trinityal/`
// finds no RenderBatches at all. The backend is handed verbs and never a batch,
// a material or an accumulator. These tests hold that line: they drive the walk
// against the stub, which knows nothing about any of those types.

import assert from "node:assert/strict";
import test from "node:test";

import { Tr2RenderBatch, Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { Topology } from "../../npm/dist/global/consts/renderContext/index.js";
import { RenderingMode } from "../../npm/dist/global/consts/graphics/index.js";

/** A shader stand-in answering only what the walk asks of it. */
function shaderStub(passCount = 1, techniqueIndex = 0)
{
  const applied = [];

  return {
    applied,
    GetTechniqueIndex: () => techniqueIndex,
    GetPassCount: () => passCount,
    GetShaderTypeMask: () => 0b11,
    ApplyAllStateForPass: (technique, passIndex) => applied.push(`${technique}:${passIndex}`)
  };
}

function materialStub()
{
  const applied = [];

  return { applied, ApplyMaterialDataForPass: (t, p) => applied.push(`${t}:${p}`) };
}

function batchOf({ shader, material, indexed = true, objectData = null })
{
  const batch = new Tr2RenderBatch();

  batch.shader = shader;
  batch.material = material;
  batch.objectData = objectData;
  batch.renderingMode = RenderingMode.RM_ANY;
  batch.topology = Topology.TOP_TRIANGLES;
  batch.vertexStreams = [ { id: "stream0" }, null ];
  batch.stride = [ 32, 0 ];
  batch.indexBuffer = indexed ? { id: "indices" } : null;
  batch.indexStride = 2;
  batch.indexCountPerInstance = 36;
  batch.instanceCount = 1;

  return batch;
}

const accumulatorOf = batches => ({ GetBatches: () => batches });

test("the walk applies the shader and material per pass, then draws", () =>
{
  const context = new Tr2RenderContext();
  const shader = shaderStub(2);
  const material = materialStub();

  const drawn = context.RenderBatchesInOrder(accumulatorOf([ batchOf({ shader, material }) ]), "Main");

  // TWO, because the count is per PASS as Carbon counts (cpp:424-425), and this
  // shader has two. It expected 1 while the count sat outside the pass loop.
  assert.equal(drawn, 2);

  // Carbon applies BOTH per pass, in this order, then submits the geometry.
  assert.deepEqual(shader.applied, [ "0:0", "0:1" ]);
  assert.deepEqual(material.applied, [ "0:0", "0:1" ]);

  // Two passes, two draws - the stub counted them without being told what a
  // batch is.
  assert.equal(context.GetRenderContextAL().GetDrawCount(), 2);
});

test("a shader with no technique or no passes skips its batch, and does not cache the failure", () =>
{
  const context = new Tr2RenderContext();

  // Carbon `continue`s on both and leaves lastShader unchanged, so the next
  // batch re-tests rather than inheriting the verdict.
  const noTechnique = { ...shaderStub(), GetTechniqueIndex: () => -1 };
  const noPasses = shaderStub(0);

  assert.equal(context.RenderBatchesInOrder(accumulatorOf([
    batchOf({ shader: noTechnique, material: materialStub() }),
    batchOf({ shader: noPasses, material: materialStub() })
  ]), "Main"), 0);

  assert.equal(context.GetRenderContextAL().GetDrawCount(), 0);
});

test("per-object data is set once per distinct object, not once per batch", () =>
{
  const context = new Tr2RenderContext();
  const shader = shaderStub();
  const calls = [];
  const objectData = { SetPerObjectDataToDevice: (buffers, mask) => calls.push({ slots: buffers.length, mask }) };

  const batches = [
    batchOf({ shader, material: materialStub(), objectData }),
    batchOf({ shader, material: materialStub(), objectData }),
    batchOf({ shader, material: materialStub(), objectData: { SetPerObjectDataToDevice: () => calls.push({ other: true }) } })
  ];

  context.RenderBatchesInOrder(accumulatorOf(batches), "Main");

  // Two distinct object-data objects, so two calls - Carbon compares against
  // the previous one rather than setting per batch.
  assert.equal(calls.length, 2);
  assert.equal(calls[0].mask, 0b11, "the shader type mask is passed through");

  // Every constant-buffer slot exists, as Carbon's array of pointers does.
  assert.ok(calls[0].slots >= 6);
});

test("a batch with no index buffer takes the non-indexed draw", () =>
{
  const context = new Tr2RenderContext();
  const shader = shaderStub();

  context.RenderBatchesInOrder(
    accumulatorOf([ batchOf({ shader, material: materialStub(), indexed: false }) ]),
    "Main"
  );

  assert.equal(context.GetRenderContextAL().GetDrawCount(), 1);
});

test("SubmitGeometry binds topology, declaration and streams before drawing", () =>
{
  const context = new Tr2RenderContext();
  const batch = batchOf({ shader: shaderStub(), material: materialStub() });

  batch.topology = Topology.TOP_LINES;

  assert.equal(context.SubmitGeometry(batch), true);
  assert.equal(context.GetRenderContextAL().GetDrawCount(), 1);
});

test("a failed technique lookup does not poison the next batch on the same shader", () =>
{
  // THE THREE-BATCH CASE. Carbon's GetTechniqueIndex is an out-parameter it
  // does NOT write on failure (Tr2Shader.cpp:28-46), so `technique` keeps the
  // previous batch's value. Assigning -1 was wrong in a way only this sequence
  // shows: the third batch takes the `shader === lastShader` fast path and
  // would draw with technique -1.
  const context = new Tr2RenderContext();
  const first = shaderStub(1, 2);
  const missing = { ...shaderStub(), GetTechniqueIndex: () => -1 };

  const batches = [
    batchOf({ shader: first, material: materialStub() }),
    batchOf({ shader: missing, material: materialStub() }),
    batchOf({ shader: first, material: materialStub() })
  ];

  context.RenderBatchesInOrder(accumulatorOf(batches), "Main");

  // Both of the first shader's batches applied technique 2, not -1.
  assert.deepEqual(first.applied, [ "2:0", "2:0" ]);
});

test("passes are counted, not batches", () =>
{
  const context = new Tr2RenderContext();

  // Carbon counts inside the pass loop (cpp:424-425). A two-pass batch is two.
  assert.equal(
    context.RenderBatchesInOrder(
      accumulatorOf([ batchOf({ shader: shaderStub(2), material: materialStub() }) ]),
      "Main"
    ),
    2
  );
});
