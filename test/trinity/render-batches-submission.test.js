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
import { Tr2VariableStore } from "../../npm/dist/trinity/core/variable/Tr2VariableStore.js";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/context/Tr2RenderContext.js";
import { TriVariableContentType } from "../../npm/dist/trinity/generated/trinityCore/enums.js";

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
    IsGood: () => shader !== null,
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

test("picking submits one pass per batch and rejects a multi-pass technique", () =>
{
  const { context, al, accumulator } = contextWith(1);
  const before = al.GetDrawCount();

  assert.equal(context.RenderBatchesForPicking(accumulator), 1);
  assert.equal(al.GetDrawCount(), before + 1);
  const shader = shaderStub(2);
  const multiplePasses = accumulatorOf([batchOf(shader, materialStub(shader))]);
  assert.throws(() => context.RenderBatchesForPicking(multiplePasses), /single-pass technique/u);
  assert.equal(al.GetDrawCount(), before + 1);
});

test("no accumulator submits nothing rather than an empty draw", () =>
{
  const { context, al } = contextWith(0);
  const before = al.GetDrawCount();

  assert.equal(context.RenderBatches(null), false);
  assert.equal(context.RenderBatchesWithOverride(null, materialStub(shaderStub())), false);
  assert.equal(al.GetDrawCount(), before);
});

test("pointer picking variables exist before material binding and retain both identity words", t =>
{
  const previous = Tr2RenderContext.eveSpacePickingFramework;
  Tr2RenderContext.eveSpacePickingFramework = "pointer";
  t.after(() => { Tr2RenderContext.eveSpacePickingFramework = previous; });
  const store = Tr2VariableStore.globalStore();
  // Effects retain these handles while loading, before the first pick draw.
  const names = ["objectId", "pickingObjectLowBits", "pickingObjectHighBits", "areaId"];
  for (const name of names) store.UnregisterLocalVariable(name);
  const { context, accumulator } = contextWith(3);
  const handles = names.map(name => store.FindVariable(name));
  assert.ok(handles.every(Boolean));
  const identities = [0n, 4n, 0xfedcba9887654321n];
  const observed = [];
  accumulator.GetBatches().forEach((batch, index) =>
  {
    batch.objectData = { GetPickingPointer: () => identities[index], SetPerObjectDataToDevice() {} };
    batch.pickingData = index + 2;
    batch.material = materialStub(batch.shader);
    batch.material.ApplyMaterialDataForPass = () => observed.push(handles.map(handle => handle.GetValue()));
  });
  assert.equal(context.RenderBatchesForPicking(accumulator), 3);
  assert.deepEqual(observed, [
    [0, 0, 0, 2], [0, 4, 0, 3],
    [0, 0x87654321 | 0, 0xfedcba98 | 0, 4]
  ]);
  context.Destroy();
});

test("switching picking frameworks retains areaId's handle and copies FLOAT or INT bits as required", t =>
{
  const previous = Tr2RenderContext.eveSpacePickingFramework;
  t.after(() => { Tr2RenderContext.eveSpacePickingFramework = previous; });
  Tr2RenderContext.eveSpacePickingFramework = "objectId";
  const { context, accumulator } = contextWith(1);
  t.after(() => context.Destroy());
  const store = Tr2VariableStore.globalStore(), area = store.FindVariable("areaId");
  const batch = accumulator.GetBatches()[0];
  batch.objectData = { GetUserData: () => 513, GetPickingPointer: () => 0x1234567887654321n, SetPerObjectDataToDevice() {} };
  batch.pickingData = 257;
  const copy = new Float32Array(1), bits = new Uint32Array(copy.buffer);
  for (const framework of ["objectId", "pointer", "objectId"])
  {
    Tr2RenderContext.eveSpacePickingFramework = framework;
    assert.equal(context.RenderBatchesForPicking(accumulator), 1);
    assert.equal(store.FindVariable("areaId"), area, "bound effects retain the same variable");
    area.CopyValueToEffect(null, copy, 4);
    if (framework === "objectId")
    {
      assert.equal(area.GetType(), TriVariableContentType.TRIVARIABLE_FLOAT);
      assert.equal(copy[0], 257, "a shipped float shader receives the numeric area, not a denormal");
      assert.equal(store.FindVariable("objectId").GetValue(), 513);
    }
    else
    {
      assert.equal(area.GetType(), TriVariableContentType.TRIVARIABLE_INT);
      assert.equal(bits[0], 257, "a native uint shader receives integer bits");
      assert.equal(store.FindVariable("pickingObjectLowBits").GetValue(), 0x87654321 | 0);
      assert.equal(store.FindVariable("pickingObjectHighBits").GetValue(), 0x12345678);
    }
  }
});
