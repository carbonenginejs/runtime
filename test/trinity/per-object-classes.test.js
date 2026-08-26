
import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2PerObjectData, TriPoolAllocator } from "../../npm/dist/trinity/core/index.js";

// The mask join: Carbon's RenderBatchGroup hoists GetShaderTypeMask(technique)
// once per group and passes it to every batch's SetPerObjectDataToDevice.
const VS = Tr2PerObjectData.StageBits.vs;
const PS = Tr2PerObjectData.StageBits.ps;
const GS = Tr2PerObjectData.StageBits.gs;
const CS = Tr2PerObjectData.StageBits.cs;

function poolWith(structs)
{
  return new TriPoolAllocator().Register(structs);
}

test("getConstantRecords binds a vs payload to the whole non-pixel family", () =>
{
  const store = poolWith({ Only: { def: [ { name: "world", size: 16, encoding: TriPoolAllocator.Type.MATRIX } ], stages: [ "vs" ] } });
  const payload = store.Alloc("Only");

  // A technique with only a geometry shader still takes the vs payload,
  // because Carbon's perFrameVsMask covers vs/cs/gs/hs/ds.
  const records = Tr2PerObjectData.getConstantRecords(payload, GS);
  assert.equal(records.length, 1);
  assert.equal(records[0].stageMask, GS, "bound to the stage the technique actually has");
  assert.equal(records[0].payload, payload, "the engine receives the canonical dirty-lifecycle owner");
  assert.equal(records[0].data, payload.GetData());
  assert.equal(records[0].struct, "Only");

  assert.deepEqual(Tr2PerObjectData.getConstantRecords(payload, PS), [],
    "a pixel-only technique takes no vs payload");
});

test("getConstantRecords splits a { vs, ps } pair by the technique's stages", () =>
{
  const store = poolWith({
    Pair: { def: [ { name: "world", size: 16, encoding: TriPoolAllocator.Type.MATRIX } ], stages: [ "vs" ] },
    PairPS: { def: [ { name: "world", size: 16, encoding: TriPoolAllocator.Type.MATRIX } ], stages: [ "ps" ] }
  });
  const record = { vs: store.Alloc("Pair"), ps: store.Alloc("PairPS") };

  assert.deepEqual(
    Tr2PerObjectData.getConstantRecords(record, VS | PS).map(entry => entry.stageMask),
    [ VS, PS ], "both halves, each to its own stage");

  assert.deepEqual(
    Tr2PerObjectData.getConstantRecords(record, VS).map(entry => entry.struct),
    [ "Pair" ], "a technique with no pixel stage takes no pixel payload");
});

test("one payload bound to several stages stays one record", () =>
{
  const store = poolWith({ Shared: { def: [ { name: "data", size: 4, encoding: TriPoolAllocator.Type.VECTOR } ], stages: [ "vs", "ps" ] } });
  const records = Tr2PerObjectData.getConstantRecords(store.Alloc("Shared"), VS | PS);

  assert.equal(records.length, 1, "the sphere-pin/lensflare shape uploads once");
  assert.equal(records[0].stageMask, VS | PS);
});

test("an empty mask binds nothing, matching FillAndSetConstants' early return", () =>
{
  const store = poolWith({ Only: { def: [ { name: "data", size: 4, encoding: TriPoolAllocator.Type.VECTOR } ], stages: [ "vs" ] } });

  assert.deepEqual(Tr2PerObjectData.getConstantRecords(store.Alloc("Only"), 0), []);
  assert.deepEqual(Tr2PerObjectData.getConstantRecords(null, VS | PS), []);
});

test("stage bits follow Carbon's ShaderType order, not the stage-list order", () =>
{
  assert.equal(Tr2PerObjectData.ShaderType.COMPUTE_SHADER, 2);
  assert.equal(Tr2PerObjectData.ShaderType.GEOMETRY_SHADER, 3);
  assert.equal(CS, 1 << 2, "compute is bit 2");
  assert.equal(GS, 1 << 3, "geometry is bit 3");
  assert.deepEqual(TriPoolAllocator.Stages, [ "vs", "ps", "cs", "gs", "hs", "ds" ]);
});
