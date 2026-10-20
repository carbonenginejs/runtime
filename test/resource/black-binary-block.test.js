// type.binary: Carbon's BINARYBLOCK. Readers move the bytes, and the
// owner decodes them through ICustomPersist (BlackReader.cpp:599-612,
// YamlReader.cpp:539-556); DictReader refuses one (DictReader.cpp:718-721)
// and the Copier never copies one (Copier.cpp:173-176 with a 0-size member).
import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema, blue } from "../../npm/dist/global/schema/index.js";
import { Copier, ICustomPersist } from "../../npm/dist/global/blue/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { YamlReader } from "../../npm/dist/global/blue/YamlReader.js";
import "../../npm/dist/global/blue/values.js";
import { EveSOFDataDecalIndexBuffer } from "../../npm/dist/sof/index.js";
import { clientResources } from "../support/clientResources.js";

const sofData = await clientResources();

const INDICES = [ 0, 1, 65537, 4294967295 ];
const BLOCK = new Uint8Array(new Uint32Array(INDICES).buffer);

/** A Black file holding one EveSOFDataDecalIndexBuffer whose block holds INDICES. */
function DecalBlack()
{
  const strings = [ "EveSOFDataDecalIndexBuffer", "indexBuffer" ];
  const stringBytes = strings.map(value => new TextEncoder().encode(value));
  const stringBlock = Concat(U16(strings.length), ...stringBytes.map(bytes => Concat(bytes, Uint8Array.of(0))));
  const payload = Concat(U16(0), U16(1), I32(BLOCK.byteLength), BLOCK);
  return Concat(
    U32(CjsBlackFormat.fourCC), U32(CjsBlackFormat.version), U32(stringBlock.length), stringBlock,
    U32(2), U16(0), U32(1), U32(payload.length), payload
  ).buffer;
}

const RED = `type: EveSOFDataDecalIndexBuffer\nindexBuffer: !!binary ${Buffer.from(BLOCK).toString("base64")}\n`;

test("a decal index buffer reads through its ICustomPersist from Black", () =>
{
  const runtime = CjsBlackFormat.readRuntime(DecalBlack(), { schema: null }).root;
  assert.equal(runtime.constructor, EveSOFDataDecalIndexBuffer);
  assert.ok(runtime.indexBuffer instanceof Uint32Array);
  assert.deepEqual([ ...runtime.indexBuffer ], INDICES);

  // The snapshot schema names the block binaryBlock; the class still decodes it.
  assert.deepEqual([ ...CjsBlackFormat.readRuntime(DecalBlack()).root.indexBuffer ], INDICES);
  const payload = CjsBlackFormat.readPayload(DecalBlack()).object;
  assert.ok(payload.indexBuffer instanceof Uint32Array);
  assert.deepEqual([ ...payload.indexBuffer ], INDICES);
});

test("a decal index buffer reads through its ICustomPersist from Red's !!binary scalar", () =>
{
  const runtime = new YamlReader().CreateObjectFromString(RED);
  assert.equal(runtime.constructor, EveSOFDataDecalIndexBuffer);
  assert.deepEqual([ ...runtime.indexBuffer ], INDICES);
  const values = CjsSchema.getValues(runtime);
  assert.equal(Object.hasOwn(values, "indexBuffer"), false, "DictWriter omits persist-only binary blocks");
});

test("the reader hands the bytes to AllocateReadBuffer and SetBufferAndSize with the member name", () =>
{
  const calls = [];
  const original = EveSOFDataDecalIndexBuffer.prototype;
  const allocate = original.AllocateReadBuffer, set = original.SetBufferAndSize;
  original.AllocateReadBuffer = function (...args) { calls.push([ "AllocateReadBuffer", ...args ]); return allocate.apply(this, args); };
  original.SetBufferAndSize = function (name, buffer, size) { calls.push([ "SetBufferAndSize", name, size ]); return set.call(this, name, buffer, size); };
  try
  {
    CjsBlackFormat.readRuntime(DecalBlack(), { schema: null });
  }
  finally
  {
    original.AllocateReadBuffer = allocate;
    original.SetBufferAndSize = set;
  }
  assert.deepEqual(calls, [ [ "AllocateReadBuffer", "indexBuffer", 16 ], [ "SetBufferAndSize", "indexBuffer", 16 ] ]);
});

test("DictReader refuses a binary block; the values bag and the Copier carry none", () =>
{
  assert.throws(() => CjsSchema.from("EveSOFDataDecalIndexBuffer", { indexBuffer: [ 1, 2 ] }), /DictReader does not support binary blocks/);

  const source = new EveSOFDataDecalIndexBuffer();
  source.AddIndex(7);
  assert.equal(Object.hasOwn(CjsSchema.getValues(source), "indexBuffer"), false);
  const copy = new Copier().CopyTo(source, null);
  assert.equal(copy.constructor, EveSOFDataDecalIndexBuffer);
  assert.deepEqual([ ...copy.indexBuffer ], [], "Carbon's Copier never copies a BINARYBLOCK");
});

test("define refuses type.binary without persistOnly or without ICustomPersist", () =>
{
  const persistOnly = { persist: true, persistOnly: true, hidden: true };
  const field = edit => ({ name: "bytes", key: "bytes", type: { kind: "typedArray", arrayType: "Uint8Array", binary: true }, edit });

  class Persisting { bytes = new Uint8Array(0); AllocateReadBuffer() {} SetBufferAndSize() {} GetWriteBufferAndSize() {} ReleaseWriteBuffer() {} }
  blue.interface(ICustomPersist)(Persisting);
  assert.throws(() => CjsSchema.define(Persisting, { className: "BinaryWithoutPersistOnly", fields: [ field({ persist: true }) ] }),
    /BinaryWithoutPersistOnly\.bytes: type\.binary requires blue\.persistOnly/);

  class Plain { bytes = new Uint8Array(0); }
  assert.throws(() => CjsSchema.define(Plain, { className: "BinaryWithoutCustomPersist", fields: [ field(persistOnly) ] }),
    /BinaryWithoutCustomPersist: type\.binary requires the class to map ICustomPersist/);

  class Valid { bytes = new Uint8Array(0); AllocateReadBuffer() {} SetBufferAndSize() {} GetWriteBufferAndSize() {} ReleaseWriteBuffer() {} }
  blue.interface(ICustomPersist)(Valid);
  CjsSchema.define(Valid, { className: "BinaryValid", fields: [ field(persistOnly) ] });
  assert.equal(CjsSchema.getField(Valid, "bytes").type.binary, true);
});

test("the client's data.black decals decode to the same indices through payload and runtime reads", { skip: sofData.skip ?? false }, async () =>
{
  const bytes = await sofData.Read("res:/dx9/model/spaceobjectfactory/data.black");
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  // Both reads decode each block through the class's ICustomPersist. The
  // document read that kept the raw blocks for an independent decode is gone
  // with carbon.document.
  const payload = Collect(CjsBlackFormat.readPayload(buffer).object, value => value?._type === "EveSOFDataDecalIndexBuffer");
  const runtime = Collect(CjsBlackFormat.readRuntime(buffer, { schema: null }).root, value => value instanceof EveSOFDataDecalIndexBuffer);
  assert.ok(payload.length > 100, `decal index buffers in data.black: ${payload.length}`);
  for (const [ name, records ] of [ [ "payload", payload ], [ "runtime", runtime ] ])
  {
    assert.ok(records.every(record => record.indexBuffer instanceof Uint32Array), `${name} holds Uint32Arrays`);
  }
  assert.deepEqual(
    runtime.map(record => [ ...record.indexBuffer ].join(",")).sort(),
    payload.map(record => [ ...record.indexBuffer ].join(",")).sort()
  );
});

/** Every distinct object in a graph that matches. */
function Collect(root, matches)
{
  const seen = new Set(), found = [], stack = [ root ];
  while (stack.length)
  {
    const value = stack.pop();
    if (!value || typeof value !== "object" || ArrayBuffer.isView(value) || seen.has(value)) continue;
    seen.add(value);
    if (matches(value)) found.push(value);
    for (const item of value instanceof Map ? value.values() : Object.values(value)) stack.push(item);
  }
  return found;
}

function Concat(...parts)
{
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}
function U16(value) { const out = new Uint8Array(2); new DataView(out.buffer).setUint16(0, value, true); return out; }
function U32(value) { const out = new Uint8Array(4); new DataView(out.buffer).setUint32(0, value, true); return out; }
function I32(value) { const out = new Uint8Array(4); new DataView(out.buffer).setInt32(0, value, true); return out; }
