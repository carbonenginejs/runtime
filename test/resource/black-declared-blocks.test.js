import assert from "node:assert/strict";
import test from "node:test";
import { CjsBlackBinaryReader } from "../../src/resource/formats/black/core/CjsBlackBinaryReader.js";
import { CjsBlackPropertyReaders as Readers } from "../../src/resource/formats/black/core/CjsBlackPropertyReaders.js";
import { CjsBlackSchemaRegistry } from "../../src/resource/formats/black/core/CjsBlackSchemaRegistry.js";
import { classes } from "../../src/resource/formats/black/core/blackDefinitions.js";
import { DEFAULT_VALUES, normalizeValues } from "../../src/resource/formats/black/core/helpers.js";
import { CLASS_KEYS } from "../../src/resource/formats/black/core/schema.js";

function cursor(bytes, length = bytes.length, options = {})
{
  const buffer = new Uint8Array(4 + bytes.length);
  new DataView(buffer.buffer).setInt32(0, length, true);
  buffer.set(bytes, 4);
  return new CjsBlackBinaryReader(new DataView(buffer.buffer), { readMode: "payload", options });
}
const binary = { kind: "typedArray", arrayType: "Uint32Array", binary: true };

test("Black BINARYBLOCK moves size and bytes only, whatever the member holds", () =>
{
  // BlackReader::ReadBinaryBlock (BlackReader.cpp:599-612): the owner's ICustomPersist decodes the bytes.
  const bytes = [0,0,0,0,1,0,1,0,255,255,255,255];
  for (const type of [binary, { kind: "uint8", binary: true }])
  {
    const field = { ...CjsBlackSchemaRegistry.fromDeclaredType(type), name: "indexBuffer" };
    assert.equal(field.black.beType, "BINARYBLOCK");
    const reader = cursor(bytes);
    const result = Readers.readValue(reader, field);
    assert.equal(result.$type, "black.binaryBlock");
    assert.equal(result.byteLength, 12);
    assert.ok(result.bytes instanceof Uint8Array);
    assert.deepEqual([...result.bytes], bytes);
    assert.equal(reader.remaining, 0);
    const skipped = cursor(bytes);
    Readers.skipValue(skipped, field);
    assert.equal(skipped.remaining, 0);
  }
});

test("Black binary blocks reject negative and truncated byte lengths; an odd length is the class's to judge", () =>
{
  const field = CjsBlackSchemaRegistry.fromDeclaredType(binary);
  assert.throws(() => Readers.readValue(cursor([], -1), field), /nonnegative/);
  assert.throws(() => Readers.readValue(cursor([1,2,3,4], 8), field), /bounds|end|range|bytes/i);
  assert.equal(Readers.readValue(cursor([1,2,3]), field).byteLength, 3);
});

test("only meta.type.binary maps to BINARYBLOCK; the snapshot's binaryBlock members need no transport declaration", () =>
{
  assert.throws(() => CjsBlackSchemaRegistry.fromDeclaredType({ kind: "typedArray", arrayType: "Uint32Array" }), /Unsupported canonical Black type: typedArray/);
  assert.throws(() => CjsBlackSchemaRegistry.fromDeclaredType({ kind: "custom", name: "Tr2ActionPython.state" }), /Unsupported canonical Black type: custom/);
  assert.equal(classes.EveSOFDataDecalIndexBuffer.indexBuffer, "binaryBlock");
  assert.equal(classes.Tr2ActionPython.state, "binaryBlock");
  const compact = CjsBlackSchemaRegistry.compactTypeDescriptor("binaryBlock", {});
  assert.equal(compact.black.beType, "BINARYBLOCK");
  assert.equal(compact.jsType.binary, true);
  for (const retired of [ "uint32Array", "custom" ])
  {
    assert.equal(CjsBlackSchemaRegistry.compactTypeDescriptor(retired, { name: "x" }).black.beType, null);
  }
});

test("the retired decodeBinaryBlocks and customTypes options are unknown", () =>
{
  for (const options of [ { decodeBinaryBlocks: true }, { customTypes: {} } ])
  {
    assert.throws(() => normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, "CjsBlackFormat"), /unknown option/);
  }
});

test("Black rejects unsupported data kinds before reading or skipping object storage", () =>
{
  for (const field of [{ kind: "UnsupportedType" }, { jsType: { kind: "UnsupportedType" } }])
  {
    for (const method of ["readValue", "skipValue"])
    {
      const reader = cursor([7, 8]);
      let objectCalls = 0;
      reader.context.ReadObject = reader.context.SkipObject = () => { objectCalls++; return {}; };
      const remaining = reader.remaining;
      assert.throws(() => Readers[method](reader, field), {
        name: "TypeError", message: /Black has no .* for data type UnsupportedType/
      });
      assert.equal(objectCalls, 0);
      assert.equal(reader.remaining, remaining, "unsupported types must not consume bytes");
    }
  }
});

test("Black retains explicit object-reference and unknown-object codecs", () =>
{
  for (const kind of ["objectRef", "unknown"])
  {
    const reader = cursor([]), expected = {};
    let skipped = 0;
    reader.context.ReadObject = () => expected;
    reader.context.SkipObject = () => { skipped++; };
    assert.equal(Readers.readValue(reader, { kind }), expected);
    Readers.skipValue(reader, { kind });
    assert.equal(skipped, 1);
  }
});
