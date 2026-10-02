import assert from "node:assert/strict";
import test from "node:test";
import { CjsBlackBinaryReader } from "../../src/resource/formats/black/core/CjsBlackBinaryReader.js";
import { CjsBlackPropertyReaders as Readers } from "../../src/resource/formats/black/core/CjsBlackPropertyReaders.js";
import { CjsBlackSchemaRegistry } from "../../src/resource/formats/black/core/CjsBlackSchemaRegistry.js";
import { classes } from "../../src/resource/formats/black/core/blackDefinitions.js";

function cursor(bytes, length = bytes.length, options = {})
{
  const buffer = new Uint8Array(4 + bytes.length);
  new DataView(buffer.buffer).setInt32(0, length, true);
  buffer.set(bytes, 4);
  return new CjsBlackBinaryReader(new DataView(buffer.buffer), { readMode: "payload", options });
}
const uint32 = { kind: "typedArray", arrayType: "Uint32Array" };

test("Black Uint32Array uses declared storage and little-endian byte lengths under any name", () =>
{
  const bytes = [0,0,0,0,1,0,1,0,255,255,255,255];
  for (const name of ["arbitraryWords", "indexBuffer"])
  {
    const field = { ...CjsBlackSchemaRegistry.fromDeclaredType(uint32), name };
    const reader = cursor(bytes);
    const result = Readers.readValue(reader, field);
    assert.ok(result instanceof Uint32Array);
    assert.deepEqual([...result], [0, 65537, 4294967295]);
    assert.equal(reader.remaining, 0);
    const skipped = cursor(bytes);
    Readers.skipValue(skipped, field);
    assert.equal(skipped.remaining, 0);
  }
  const raw = Readers.readBinaryBlock(cursor(bytes), { beType: "BINARYBLOCK", name: "indexBuffer" }, { kind: "typedArray" });
  assert.equal(raw instanceof Uint32Array, false, "the old special field name does not choose a codec");
  assert.ok(raw.bytes instanceof Uint8Array);
  assert.deepEqual([...raw.bytes], bytes);
});

test("Black typed binary blocks reject negative, misaligned and truncated byte lengths", () =>
{
  const field = CjsBlackSchemaRegistry.fromDeclaredType(uint32);
  assert.throws(() => Readers.readValue(cursor([], -1), field), /nonnegative/);
  assert.throws(() => Readers.readValue(cursor([1,2,3]), field), /multiple of four/);
  assert.throws(() => Readers.readValue(cursor([1,2,3,4], 8), field), /bounds|end|range|bytes/i);
});

test("Black custom blocks require local opt-in and retain byte storage", () =>
{
  const field = CjsBlackSchemaRegistry.fromDeclaredType({kind:"custom",name:"Example.Bytes"});
  assert.throws(() => Readers.readValue(cursor([3,5]), field), /no custom type handler/);
  assert.throws(() => Readers.skipValue(cursor([3,5]), field), /no custom type handler/);
  const bytes = Readers.readValue(cursor([3,5], 2, {customTypes: {"Example.Bytes": value => value}}), field);
  assert.ok(bytes instanceof Uint8Array);
  assert.deepEqual([...bytes], [3,5]);
  const python = CjsBlackSchemaRegistry.fromDeclaredType({kind:"custom",name:"Tr2ActionPython.state"});
  assert.deepEqual(Readers.readValue(cursor([1,2,3]), python), Uint8Array.of(1,2,3));
  assert.equal(classes.EveSOFDataDecalIndexBuffer.indexBuffer, "uint32Array");
  assert.deepEqual(classes.Tr2ActionPython.state, {type:"custom",name:"Tr2ActionPython.state"});
});
