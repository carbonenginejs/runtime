
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Tr2PerObjectData,
  Tr2PerObjectDataPSBuffer,
  Tr2PerObjectDataStandard,
  TriPoolAllocator
} from "../../npm/dist/trinity/core/index.js";
import { mat4 } from "../../npm/dist/global/math/index.js";

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
  const payload = store.Allocate("Only");

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
  const record = { vs: store.Allocate("Pair"), ps: store.Allocate("PairPS") };

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
  const records = Tr2PerObjectData.getConstantRecords(store.Allocate("Shared"), VS | PS);

  assert.equal(records.length, 1, "the sphere-pin/lensflare shape uploads once");
  assert.equal(records[0].stageMask, VS | PS);
});

test("an empty mask binds nothing, matching FillAndSetConstants' early return", () =>
{
  const store = poolWith({ Only: { def: [ { name: "data", size: 4, encoding: TriPoolAllocator.Type.VECTOR } ], stages: [ "vs" ] } });

  assert.deepEqual(Tr2PerObjectData.getConstantRecords(store.Allocate("Only"), 0), []);
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

// ---------------------------------------------------------------------------
// The restored Carbon classes. Tr2PerObjectDataPSBuffer owns a pixel payload
// and uploads nothing; Tr2PerObjectDataStandard adds a vertex payload and the
// virtual. Both lease through the accumulator, as Carbon's
// accumulator->Allocate<T>() does.

const MATRIX = TriPoolAllocator.Type.MATRIX;

function accumulatorWith(structs)
{
  const store = new TriPoolAllocator().Register(structs);

  // The one door these classes use: Alloc leases a payload from the bound store.

  return {
    Alloc: (name) => store.Allocate(name)
  };
}

const WORLD_ONLY = { def: [ { name: "WorldMat", size: 16, encoding: MATRIX } ], stages: [ "vs" ] };
const WORLD_ONLY_PS = { def: [ { name: "WorldMat", size: 16, encoding: MATRIX } ], stages: [ "ps" ] };

test("Tr2PerObjectDataStandard.alloc leases both payloads in their named shapes", () =>
{
  const accumulator = accumulatorWith({ VS: WORLD_ONLY, PS: WORLD_ONLY_PS });
  const data = Tr2PerObjectDataStandard.alloc(accumulator, "VS", "PS");

  assert.equal(data.vs.GetStruct(), "VS");
  assert.equal(data.ps.GetStruct(), "PS");
  assert.equal(data.GetUserData(), 0, "Carbon's m_userData starts at zero");

  // The producer writes onto the leased payload directly - there is no copy
  // step, because a RawData already is the uploadable buffer.
  data.vs.SetAndTranspose("WorldMat", mat4.create());
  assert.equal(data.vs.GetData().length, 16);
});

test("Tr2PerObjectDataPSBuffer carries only a pixel payload and uploads nothing", () =>
{
  // Carbon's PSBuffer does not override SetPerObjectDataToDevice and the base
  // body is empty (Tr2PerObjectData.cpp:29-32), so this is shared storage.
  const accumulator = accumulatorWith({ PS: WORLD_ONLY_PS });
  const data = Tr2PerObjectDataPSBuffer.alloc(accumulator, "PS");

  assert.equal(data.ps.GetStruct(), "PS");
  assert.equal(data.vs, undefined, "no vertex payload at this level");
  assert.equal(data.SetPerObjectDataToDevice(), 0, "the base virtual is a no-op");
});

test("a layout over Carbon's per-object register budget throws at lease time", () =>
{
  // Carbon's static_assert( sizeof(T) <= sizeof(buffer) ). 11 matrices is 176
  // floats, over the 160-float vertex budget. FillAndSetConstants would
  // otherwise clamp the copy and silently drop the tail.
  const def = [];

  for (let i = 0; i < 11; i++) def.push({ name: `m${i}`, size: 16, encoding: MATRIX });

  const accumulator = accumulatorWith({ Big: { def, stages: [ "vs" ] }, PS: WORLD_ONLY_PS });

  assert.throws(
    () => Tr2PerObjectDataStandard.alloc(accumulator, "Big", "PS"),
    /VS layout "Big" is 176 floats, over Carbon's 160-float/u
  );
});

test("the instance upload binds exactly what the static does for a plain record", () =>
{
  // This is the proof that restoring the class is a refactor: the virtual
  // delegates to the same static, so an instance and the { vs, ps } record it
  // replaces produce identical binds.
  const VERTEX = 0;
  const PIXEL = 1;
  const calls = [];

  const buffer = (id) => ({
    id,
    IsValid: () => false,
    GetSize: () => 0,
    Create: () => 0,
    Lock: () => ({ result: 0, data: new Uint8Array(256) }),
    Unlock: () => 0
  });

  const buffers = [ buffer("vs"), buffer("ps") ];
  const renderContext = {
    IsValid: () => true,
    SetConstants(cb, stage, registerIndex)
    {
      calls.push(`${cb.id}@b${registerIndex}`);
      return true;
    }
  };

  const accumulator = accumulatorWith({ VS: WORLD_ONLY, PS: WORLD_ONLY_PS });
  const data = Tr2PerObjectDataStandard.alloc(accumulator, "VS", "PS");
  const mask = (1 << VERTEX) | (1 << PIXEL);

  assert.equal(data.SetPerObjectDataToDevice(buffers, mask, renderContext), 2);
  assert.deepEqual(calls.sort(), [ "ps@b4", "vs@b3" ]);

  // And the divergence this class records: a technique with no pixel stage
  // takes no pixel payload. Carbon's Standard would bind it anyway.
  calls.length = 0;
  assert.equal(data.SetPerObjectDataToDevice(buffers, 1 << VERTEX, renderContext), 1);
  assert.deepEqual(calls, [ "vs@b3" ]);
});

test("ApplyConstantBuffers refuses rather than looking successful", () =>
{
  const accumulator = accumulatorWith({ VS: WORLD_ONLY, PS: WORLD_ONLY_PS });
  const data = Tr2PerObjectDataStandard.alloc(accumulator, "VS", "PS");

  assert.throws(() => data.ApplyConstantBuffers(), /indirect draw is unported/u);
});
