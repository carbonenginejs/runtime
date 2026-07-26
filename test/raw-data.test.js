// RawData / RawDataStore: the GPU-free constant-data system.
// Design: runtime-trinity/agents/PER-OBJECT-DATA-DESIGN-2026-07-24.md
import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { RawData, RawDataStore } from "../npm/dist/index.js";


const EPSILON = 1e-6;
const Type = RawDataStore.Type;

// The library ships NO packer - the consumer always supplies one. This trivial
// tight packer (no padding) stands in for an engine's packer across the tests.
const TightPacker = {
  ResolveLayout(_structName, def)
  {
    const fields = {};
    let offset = 0;

    for (const field of def)
    {
      fields[field.name] = { offset, size: field.size, elements: field.elements, encoding: field.encoding };
      offset += field.size * field.elements;
    }

    return { fields, stride: offset };
  }
};

function assertClose(actual, expected, message)
{
  assert.ok(Math.abs(actual - expected) <= EPSILON, `${message}: expected ${expected}, got ${actual}`);
}

// A rotating + translating matrix so transpose is detectable (an identity or
// pure-translation matrix cannot catch an orientation error).
function MakeWorld()
{
  const m = mat4.create();
  mat4.translate(m, m, [10, 20, 30]);
  mat4.rotateY(m, m, 0.7);
  mat4.scale(m, m, [2, 3, 4]);
  return m;
}

// A store with one struct registered against the tight packer.
function MakeStore(name, def, options)
{
  const store = new RawDataStore(TightPacker, options);
  store.RegisterStruct(name, def);
  return store;
}

test("TightPacker resolves tight offsets and stride (name-keyed contract)", () =>
{
  const def = RawDataStore.normalizeDef([
    { name: "world",     size: 16, encoding: Type.MATRIX },
    { name: "shipData",  size: 4,  encoding: Type.VECTOR },
    { name: "masks",     size: 16, elements: 2, encoding: Type.MATRIX }
  ]);
  const layout = TightPacker.ResolveLayout("VS", def);

  assert.equal(layout.fields.world.offset, 0, "world at 0");
  assert.equal(layout.fields.shipData.offset, 16, "shipData after world");
  assert.equal(layout.fields.masks.offset, 20, "masks after shipData");
  assert.equal(layout.stride, 52, "16 + 4 + 32");
});

test("Set(MATRIX) stores the TRANSPOSE (translation moves to [3],[7],[11])", () =>
{
  const vs = MakeStore("VS", [{ name: "world", size: 16, encoding: Type.MATRIX }]).Alloc("VS");
  const world = MakeWorld();

  vs.Set("world", world);
  const packed = vs.GetData();
  const expected = mat4.transpose(mat4.create(), world);

  for (let i = 0; i < 16; i++)
  {
    assertClose(packed[i], expected[i], `packed[${i}]`);
  }
  assertClose(packed[3], world[12], "translation x transposed to [3]");
  assertClose(packed[7], world[13], "translation y transposed to [7]");
  assertClose(packed[11], world[14], "translation z transposed to [11]");
  // An asymmetric off-diagonal basis element ([2]/[8] carry rotateY's +/-sin).
  assert.notEqual(packed[2], world[2], "off-diagonal basis element transposed");
  assertClose(packed[2], world[8], "packed[2] == logical[8]");
});

test("SetRaw writes GPU-form bytes with NO encoding (the worldInverse idiom)", () =>
{
  const vs = MakeStore("VS", [
    { name: "world",        size: 16, encoding: Type.MATRIX },
    { name: "worldInverse", size: 16, encoding: Type.MATRIX }
  ]).Alloc("VS");
  const world = MakeWorld();

  vs.Set("world", world);
  const packedWorld = mat4.clone(vs.GetData().subarray(0, 16));
  const rawInverse = mat4.invert(mat4.create(), packedWorld);
  vs.SetRaw("worldInverse", rawInverse);

  const expected = mat4.transpose(mat4.create(), mat4.invert(mat4.create(), world));
  const stored = vs.GetData().subarray(16, 32);

  for (let i = 0; i < 16; i++)
  {
    assertClose(stored[i], expected[i], `worldInverse[${i}]`);
  }
});

test("Set(UINT) bit-casts into the uint lanes; Set(VECTOR) copies", () =>
{
  const vs = MakeStore("VS", [
    { name: "shipData",    size: 4, encoding: Type.VECTOR },
    { name: "boneOffsets", size: 4, encoding: Type.UINT }
  ]).Alloc("VS");

  vs.Set("shipData", [0.5, 1.5, 2.5, 3.5]);
  vs.Set("boneOffsets", [7, 0xdeadbeef, 0, 42]);

  const floats = vs.GetData();
  assertClose(floats[0], 0.5, "vector copied straight");
  assertClose(floats[3], 3.5, "vector copied straight");

  const uints = new Uint32Array(floats.buffer, floats.byteOffset, floats.length);
  assert.equal(uints[4], 7, "uint bit-cast");
  assert.equal(uints[5], 0xdeadbeef, "uint bit-cast preserves high bit");
  assert.equal(uints[7], 42, "uint bit-cast");
});

test("Set(MATRIX_3X4) packs a mat4 column-stride into 12 floats (gotcha 7)", () =>
{
  const vs = MakeStore("VS", [{ name: "bone", size: 12, encoding: Type.MATRIX_3X4 }]).Alloc("VS");
  const m = Float32Array.from({ length: 16 }, (_, i) => i);

  vs.Set("bone", m);
  const packed = vs.GetData();
  assert.deepEqual(Array.from(packed.subarray(0, 12)), [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14]);
});

test("Copy writes OUT into a caller buffer and is NOT a live reference", () =>
{
  const vs = MakeStore("VS", [{ name: "shipData", size: 4, encoding: Type.VECTOR }]).Alloc("VS");
  vs.Set("shipData", [1, 2, 3, 4]);

  const out = new Float32Array(4);
  vs.Copy("shipData", out);
  assert.deepEqual(Array.from(out), [1, 2, 3, 4], "copied out");

  out[0] = 999;
  assertClose(vs.GetData()[0], 1, "mutating the copy does not touch the payload");
});

test("defaults are applied on Alloc; unwritten non-default fields are arena garbage", () =>
{
  const store = MakeStore("VS", [
    { name: "shipData", size: [0, 1, 0, 1], encoding: Type.VECTOR }, // size-as-defaults
    { name: "extra",    size: 4, encoding: Type.VECTOR }
  ]);

  const a = store.Alloc("VS");
  assert.deepEqual(Array.from(a.GetData().subarray(0, 4)), [0, 1, 0, 1], "defaults applied");
  a.Set("extra", [5, 6, 7, 8]);

  store.Reset();
  const b = store.Alloc("VS");
  assert.deepEqual(Array.from(b.GetData().subarray(0, 4)), [0, 1, 0, 1], "defaults re-applied on realloc");
  assert.deepEqual(Array.from(b.GetData().subarray(4, 8)), [5, 6, 7, 8], "unwritten field keeps stale bytes");
});

test("arena: consecutive Allocs get non-overlapping slots; Reset rewinds and reuses", () =>
{
  const store = MakeStore("VS", [{ name: "v", size: 4, encoding: Type.VECTOR }]);

  const a = store.Alloc("VS");
  const b = store.Alloc("VS");
  a.Set("v", [1, 1, 1, 1]);
  b.Set("v", [2, 2, 2, 2]);
  assertClose(a.GetData()[0], 1, "a untouched by b");
  assertClose(b.GetData()[0], 2, "b distinct from a");

  store.Reset();
  const c = store.Alloc("VS");
  assert.equal(c.GetData().buffer, a.GetData().buffer, "same backing ArrayBuffer after reset");
  assert.equal(c.GetData().byteOffset, a.GetData().byteOffset, "c reuses a's slot");
});

test("arena grows into new chunks without invalidating earlier views", () =>
{
  const store = MakeStore("Big", [{ name: "v", size: 4, encoding: Type.VECTOR }], { chunkFloats: 8 });

  const a = store.Alloc("Big");
  a.Set("v", [1, 2, 3, 4]);
  store.Alloc("Big");           // fills chunk 0
  const c = store.Alloc("Big"); // spills into chunk 1
  c.Set("v", [9, 9, 9, 9]);

  assert.notEqual(a.GetData().buffer, c.GetData().buffer, "c is in a new chunk");
  assert.deepEqual(Array.from(a.GetData()), [1, 2, 3, 4], "earlier view still valid across growth");
});

test("Alloc throws for an unregistered struct; Has reflects registration", () =>
{
  const store = new RawDataStore(TightPacker);
  assert.equal(store.Has("VS"), false);
  assert.throws(() => store.Alloc("VS"), /not registered/);

  store.RegisterStruct("VS", [{ name: "world", size: 16, encoding: Type.MATRIX }]);
  assert.equal(store.Has("VS"), true);
  const vs = store.Alloc("VS");
  assert.throws(() => vs.Set("missing", [0]), /unknown field/);
});

test("a store REQUIRES a packer - no silent fallback", () =>
{
  assert.throws(() => new RawDataStore(), /needs a packer/);
  assert.throws(() => new RawDataStore(null), /needs a packer/);
  assert.throws(() => new RawDataStore({}), /needs a packer/);
  assert.throws(() => RawDataStore.from({}), /supplied no packer/);
});

test("the engine MUST cover every registered struct - RegisterStruct fails loud otherwise", () =>
{
  // A reflection-style packer that only knows two structs, keyed by name.
  const reflected = {
    layouts: {
      Known: { fields: { a: { offset: 0, size: 4, elements: 1, encoding: Type.VECTOR } }, stride: 4 }
    },
    ResolveLayout(name)
    {
      const layout = this.layouts[name];

      if (!layout)
      {
        return null; // not covered by this engine's shaders
      }

      return layout;
    }
  };
  const store = RawDataStore.from(reflected);

  store.RegisterStruct("Known", [{ name: "a", size: 4, encoding: Type.VECTOR }]);
  assert.equal(store.Has("Known"), true, "covered struct registers");

  assert.throws(
    () => store.RegisterStruct("Unknown", [{ name: "a", size: 4, encoding: Type.VECTOR }]),
    /supplied no layout for struct "Unknown"/,
    "an uncovered struct fails loud at registration, naming it"
  );
  assert.equal(store.Has("Unknown"), false, "the uncovered struct is not registered");
});

test("Register bulk-registers a struct map; the packer receives the struct NAME", () =>
{
  // A packer that pads b to an 8-float boundary and asserts it gets the name.
  const seenNames = [];
  const paddingPacker = {
    ResolveLayout(name, def)
    {
      seenNames.push(name);
      const fields = {};
      let offset = 0;

      for (const field of def)
      {
        fields[field.name] = { offset, size: field.size, elements: field.elements, encoding: field.encoding };
        offset += Math.ceil((field.size * field.elements) / 8) * 8;
      }

      return { fields, stride: offset };
    }
  };
  const store = RawDataStore.from(paddingPacker).Register({
    VS: [{ name: "a", size: 4, encoding: Type.VECTOR }, { name: "b", size: 4, encoding: Type.VECTOR }],
    PS: [{ name: "c", size: 4, encoding: Type.VECTOR }]
  });

  assert.deepEqual(seenNames.sort(), ["PS", "VS"], "packer keyed by struct name");
  const vs = store.Alloc("VS");
  vs.Set("a", [1, 1, 1, 1]);
  vs.Set("b", [2, 2, 2, 2]);
  assertClose(vs.GetData()[8], 2, "b written at the packer's padded offset");
  assertClose(vs.GetData()[4], 0, "the pad gap is untouched");
  assert.equal(vs.GetLayout().stride, 16, "padded stride");
});

test("direct construction: a persistent (self-owned) payload bypasses the arena", () =>
{
  const layout = TightPacker.ResolveLayout("VS", RawDataStore.normalizeDef([
    { name: "world", size: 16, encoding: Type.MATRIX }
  ]));
  layout.defaults = [];
  const floats = new Float32Array(layout.stride);
  const uints = new Uint32Array(floats.buffer);
  const payload = new RawData(layout, floats, uints);

  payload.Set("world", MakeWorld());
  assertClose(payload.GetData()[3], 10, "self-owned payload encodes identically");
});

test("Set(INT) stores signed two's complement (reflection can type i32 vs u32)", () =>
{
  const store = MakeStore("Interior", [
    { name: "lightCount", size: 1, encoding: Type.INT },
    { name: "padding",    size: 3, encoding: Type.INT }
  ]);
  const data = store.Alloc("Interior");

  data.Set("lightCount", [-1]);
  data.Set("padding", [7, -8, 9]);

  const floats = data.GetData();
  const ints = new Int32Array(floats.buffer, floats.byteOffset, floats.length);
  assert.equal(ints[0], -1, "-1 round-trips through the signed lane");
  assert.equal(ints[1], 7, "positive int");
  assert.equal(ints[2], -8, "negative int in an array field");
  assert.equal(ints[3], 9, "tail int");
});

test("per-element Set writes ONE slot; the unwritten tail keeps its arena bytes", () =>
{
  // Carbon fills m_turretTranslation[turretIndex] for VISIBLE turrets only
  // (EveTurretSet.cpp:2323-2341); slots past the visible count stay garbage.
  const store = MakeStore("TurretVS", [
    { name: "turretTranslation", size: 4, elements: 4, encoding: Type.VECTOR },
    { name: "turretRotation",    size: 4, elements: 4, encoding: Type.VECTOR }
  ]);

  // First tenant dirties the arena so the tail is detectably non-zero.
  const first = store.Alloc("TurretVS");
  first.Set("turretTranslation", [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]);
  store.Reset();

  const data = store.Alloc("TurretVS");
  data.Set("turretTranslation", [1, 2, 3, 4], 0);
  data.Set("turretTranslation", [5, 6, 7, 8], 1);

  assertClose(data.GetData()[0], 1, "element 0 written");
  assertClose(data.GetData()[4], 5, "element 1 written");
  assertClose(data.GetData()[8], 9, "element 2 is previous-tenant bytes (Carbon parity)");

  const out = data.Copy("turretTranslation", new Float32Array(4), 1);
  assertClose(out[0], 5, "per-element Copy reads one slot");

  data.SetRaw("turretRotation", [11, 12, 13, 14], 2);
  assertClose(data.GetData()[16 + 8], 11, "per-element SetRaw offsets into the array");

  assert.throws(() => data.Set("turretTranslation", [0, 0, 0, 0], 4), /out of range/, "element index bounds-checked");
  assert.throws(() => data.Set("turretTranslation", [0, 0, 0, 0], -1), /out of range/, "negative element rejected");
  assert.throws(() => data.Set("turretTranslation", [0, 0, 0, 0], 1.5), /out of range/, "fractional element rejected");
});

test("stages: defs declare their binding slots; the engine reads GetLayout().stages", () =>
{
  const store = new RawDataStore(TightPacker);

  // Default: a single vertex-stage payload (EveBasicPerObjectData).
  store.RegisterStruct("BasicVS", [{ name: "world", size: 16, encoding: Type.MATRIX }]);
  assert.deepEqual([...store.Alloc("BasicVS").GetLayout().stages], ["vs"], "stages default to [vs]");

  // Same bytes bound to BOTH slots (sphere pin, lensflare): one struct, two stages.
  store.RegisterStruct(
    "SpherePin",
    [{ name: "worldMatrix", size: 16, encoding: Type.MATRIX }],
    { stages: ["vs", "ps"] }
  );
  assert.deepEqual([...store.Alloc("SpherePin").GetLayout().stages], ["vs", "ps"], "dual-bound payload declares both");

  assert.throws(
    () => store.RegisterStruct("Bad", [{ name: "a", size: 4, encoding: Type.VECTOR }], { stages: ["fragment"] }),
    /unknown stage "fragment"/,
    "stages validated against RawDataStore.Stages"
  );
  assert.throws(
    () => store.RegisterStruct("Bad", [{ name: "a", size: 4, encoding: Type.VECTOR }], { stages: [] }),
    /non-empty/,
    "empty stages rejected"
  );
  assert.throws(
    () => store.RegisterStruct("Bad", [{ name: "a", size: 4, encoding: Type.VECTOR }], { stages: ["vs", "vs"] }),
    /duplicate stage/,
    "duplicate stages rejected"
  );
});

test("a distinct VS+PS pair is TWO Allocs returned as a { vs, ps } record", () =>
{
  // Carbon's dominant composite (turret, decal, booster): two structs, two
  // constant buffers. The batch pipeline threads the record through untouched.
  const store = new RawDataStore(TightPacker).Register({
    DecalVS: [{ name: "worldMatrix", size: 16, encoding: Type.MATRIX }],
    DecalPS: { def: [{ name: "displayData", size: 4, encoding: Type.VECTOR }], stages: ["ps"] }
  });

  const perObjectData = { vs: store.Alloc("DecalVS"), ps: store.Alloc("DecalPS") };
  perObjectData.vs.Set("worldMatrix", MakeWorld());
  perObjectData.ps.Set("displayData", [1, 2, 3, 4]);

  assert.deepEqual([...perObjectData.vs.GetLayout().stages], ["vs"], "vs half binds the vertex slot");
  assert.deepEqual([...perObjectData.ps.GetLayout().stages], ["ps"], "Register accepts { def, stages }");
  assertClose(perObjectData.vs.GetData()[3], 10, "vs half encoded (transposed translation)");
  assertClose(perObjectData.ps.GetData()[0], 1, "ps half is its own slice");
  assert.notEqual(perObjectData.vs.GetData(), perObjectData.ps.GetData(), "two independent arena slots");
});
