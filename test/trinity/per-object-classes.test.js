
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

test("setPerObjectDataToDevice uploads each payload at its own register", () =>
{
  // Carbon's Tr2PerObjectDataStandard::SetPerObjectDataToDevice is two
  // FillAndSetConstants calls - vs at the per-object VS register, ps at the PS
  // one. The vs payload binds to the whole non-pixel family.
  const VERTEX = 0;
  const PIXEL = 1;
  const calls = [];

  const buffer = (id) => ({
    id,
    IsValid: () => false,
    GetSize: () => 0,
    Create()
    {
      return 0;
    },
    Lock: () => ({ result: 0, data: new Uint8Array(256) }),
    Unlock: () => 0
  });

  const buffers = [ buffer("vs"), buffer("ps") ];
  const renderContext = {
    IsValid: () => true,
    SetConstants(cb, stage, registerIndex)
    {
      calls.push({ buffer: cb.id, stage, registerIndex });
      return true;
    }
  };

  const payload = (stages) => ({
    GetLayout: () => ({ stages }),
    GetData: () => new Float32Array(4),
    GetStruct: () => ({})
  });

  const uploaded = Tr2PerObjectData.setPerObjectDataToDevice(
    { vs: payload([ "vs" ]), ps: payload([ "ps" ]) },
    buffers,
    (1 << VERTEX) | (1 << PIXEL),
    renderContext
  );

  assert.equal(uploaded, 2);
  assert.deepEqual(
    calls.map(c => `${c.buffer}@b${c.registerIndex}`).sort(),
    [ "ps@b4", "vs@b3" ],
    "vs at the per-object VS register, ps at the PS register"
  );

  // A mask naming no stage the payloads declare uploads nothing, which is
  // FillAndSetConstants' zero-mask early return doing the skipping.
  calls.length = 0;
  assert.equal(
    Tr2PerObjectData.setPerObjectDataToDevice({ vs: payload([ "vs" ]) }, buffers, 1 << PIXEL, renderContext),
    0
  );
  assert.deepEqual(calls, []);
});
