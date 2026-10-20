import assert from "node:assert/strict";
import test from "node:test";
import { parse } from "yaml";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { YamlWriter, DictWriter, BeObjectMetadata } from "../../npm/dist/global/blue/index.js";
import { YamlReader } from "../../npm/dist/global/blue/YamlReader.js";

let serial = 0;
function register(Constructor, fields, extra = {})
{
  CjsSchema.define(Constructor, {
    className: "YamlWriterTest" + ++serial,
    members: Object.entries(fields).map(([name, type]) => ({
      name, key: name, type: typeof type === "string" ? { kind: type } : type,
      edit: { persist: true, read: true, write: true }
    })),
    ...extra
  });
  return Constructor;
}
const write = value => new YamlWriter().WriteObjectToString(value);

test("type first, persisted members only, defaults omitted with native tolerances", () => {
  class Root { a = 0; b = 0; integer = 0; hidden = 7; }
  register(Root, { a: "float32", b: "float64", integer: "int32" });
  const root = new Root();
  root.a = 0.0000005;
  root.b = 0.0000000000005;
  root.integer = 8;
  assert.equal(write(root), `type: ${CjsSchema.getClassName(Root)}\ninteger: 8\n`);
  const bag = new DictWriter().WriteObject(root);
  assert.equal(bag.a, root.a, "DictWriter keeps its full-value default policy");
  assert.equal(bag.b, root.b);
});

test("native float precision, ties, negative zero, decimal integers and bool", () => {
  class Root { f = 1; d = 1; n = 1; i = 0; u = 0; big = 0n; ubig = 0n; yes = false; flags = 0; }
  register(Root, { f: "float32", d: "float64", n: "float32", i: "int32", u: "uint32",
    big: "int64", ubig: "uint64", yes: "boolean", flags: "enum" });
  const root = Object.assign(new Root(), {
    f: 0.00390625, d: 1.12345678901234, n: -0, i: -2147483648, u: 4294967295,
    big: -9223372036854775808n, ubig: 18446744073709551615n, yes: true, flags: 13
  });
  const text = write(root);
  for (const line of ["f: 0.0039062", "d: 1.123456789012", "n: -0.0", "i: -2147483648",
    "u: 4294967295", "big: -9223372036854775808", "ubig: 18446744073709551615", "yes: 1", "flags: 13"])
  {
    assert.ok(text.includes(line + "\n"), line + " in " + text);
  }
  assert.equal(parse(text, { intAsBigInt: true }).ubig, root.ubig);
});

test("strings are double quoted, escaped, null-terminated and wide null remains null", () => {
  class Root { narrow = ""; wide = "default"; nil = "default"; }
  register(Root, { narrow: "string", wide: "wstring", nil: "wstring" });
  const root = Object.assign(new Root(), { narrow: 'yes: "value"\nnext\0ignored', wide: "Takahē 🐦", nil: null });
  const text = write(root);
  assert.match(text, /narrow: "yes: \\"value\\"\\nnext"/);
  assert.match(text, /\\u0113/);
  assert.match(text, /\\U0001F426/);
  assert.equal(parse(text).wide, root.wide);
  assert.equal(parse(text).nil, null);
});

test("second sight anchors preserve sharing and cycles; fresh writes restart IDs", () => {
  class Leaf { value = 0; parent = null; }
  class Root { left = null; right = null; items = []; }
  register(Leaf, { value: "int32", parent: "rootRef" });
  register(Root, { left: "rootRef", right: "rootRef", items: { kind: "array", itemType: "rootRef" } });
  const root = new Root(), leaf = new Leaf();
  leaf.value = 9; leaf.parent = root;
  root.left = leaf; root.right = leaf; root.items = [leaf, null];
  const writer = new YamlWriter(), text = writer.WriteObjectToString(root);
  assert.match(text, /&ID0/);
  assert.match(text, /&ID1/);
  const raw = parse(text);
  assert.equal(raw.left, raw.right);
  assert.equal(raw.left.parent, raw);
  assert.equal(raw.items[0], raw.left);
  assert.equal(raw.items[1], null);
  assert.equal(writer.WriteObjectToString(root), text);
  // Carbon emits ancestor aliases but registers anchors only after reading members.
  assert.throws(() => new YamlReader().CreateObjectFromString(text), /hasn't been previously defined/);
  leaf.parent = null;
  const restored = new YamlReader().CreateObjectFromString(write(root));
  assert.equal(restored.left, restored.right);
  assert.equal(restored.items[0], restored.left);
  assert.equal(restored.items.length, 1, "native object lists discard null entries");
});

test("metadata output uses only the allow-list, sorted and quoted; source table stays intact", () => {
  class Root {}
  register(Root, {});
  const root = new Root();
  BeObjectMetadata.Set(root, "typeID", "42");
  BeObjectMetadata.Set(root, "nodePosition", "1,2");
  BeObjectMetadata.Set(root, "privatePath", "private-authoring-location");
  const text = write(root);
  assert.ok(text.indexOf('"nodePosition"') < text.indexOf('"typeID"'));
  assert.deepEqual(parse(text).__bluemetadata__, { nodePosition: "1,2", typeID: "42" });
  assert.ok(!text.includes("private"));
  assert.equal(BeObjectMetadata.Get(root, "privatePath"), "private-authoring-location");
  const restored = new YamlReader().CreateObjectFromString(text);
  assert.equal(BeObjectMetadata.Get(restored, "typeID"), "42");
  assert.equal(BeObjectMetadata.Get(restored, "privatePath"), null);
  assert.equal(new DictWriter().WriteObject(root).__bluemetadata__.privatePath, "private-authoring-location");
});

test("float vectors and matrix storage are flat flow sequences without changing inputs", () => {
  class Root { vector = new Float32Array(3); matrix = new Float32Array(16); }
  register(Root, { vector: { kind: "vector3", scalar: "float32", length: 3 },
    matrix: { kind: "matrix4", scalar: "float32", length: 16 } });
  const root = new Root();
  root.vector.set([0.25, 0.5, 1]);
  root.matrix[0] = 1;
  const text = write(root);
  assert.match(text, /vector: \[0\.25, 0\.5, 1\.0\]/);
  assert.equal(parse(text).matrix.length, 16);
  assert.deepEqual(root.vector, new Float32Array([0.25, 0.5, 1]));
});

test("structure lists retain definition codes, offsets, order and typed rows", () => {
  class Row { time = 0; value = 0; }
  CjsSchema.define(Row, {
    className: "YamlWriterStructRow", struct: { size: 8 },
    members: [
      { name: "time", key: "time", struct: { dataType: "FLOAT32_1", offset: 0 } },
      { name: "value", key: "value", struct: { dataType: "UINT32_1", offset: 4 } }
    ]
  });
  class Root { rows = []; }
  register(Root, { rows: { kind: "structList", className: "YamlWriterStructRow" } });
  const root = new Root();
  root.rows.push(Object.assign(new Row(), { time: 0.25, value: 4294967295 }));
  const raw = parse(write(root));
  assert.deepEqual(raw.rows.structure, [["time", 4, 0], ["value", 10, 4]]);
  assert.deepEqual(raw.rows.items, [[0.25, 4294967295]]);
});

test("binary blocks release nonempty buffers, reproduce empty and one-byte quirks", () => {
  class Root {}
  register(Root, {});
  class BinaryWriter extends YamlWriter {
    bytes = new Uint8Array([1, 2, 3]);
    releases = 0;
    WriteMembers() {
      this._WriteBinaryBlock({
        GetWriteBufferAndSize: () => this.bytes,
        ReleaseWriteBuffer: buffer => { assert.equal(buffer, this.bytes); ++this.releases; }
      }, "binary");
    }
  }
  const writer = new BinaryWriter();
  assert.equal(parse(writer.WriteObjectToString(new Root())).binary, "AQID");
  assert.equal(writer.releases, 1);
  writer.bytes = new Uint8Array(0);
  assert.equal(parse(writer.WriteObjectToString(new Root())).binary, undefined);
  assert.equal(writer.releases, 1);
  writer.bytes = new Uint8Array([1]);
  assert.throws(() => writer.WriteObjectToString(new Root()), /one-byte binary/);
  assert.equal(writer.releases, 2);
  writer.bytes = new Uint8Array([1, 2]);
  assert.equal(parse(writer.WriteObjectToString(new Root())).binary, "AQI=");
});

test("stream entry writes UTF-8 bytes through Carbon's Write contract", () => {
  class Root { name = ""; }
  register(Root, { name: "string" });
  const root = Object.assign(new Root(), { name: "stream" });
  let output;
  new YamlWriter().WriteObjectToStream(root, { Write(bytes, size) {
    assert.equal(bytes.byteLength, size); output = new TextDecoder().decode(bytes); return size;
  } });
  assert.equal(output, write(root));
});

test("embedded defaults use the parent's instance; DictWriter retains declared type tags", () => {
  class Child { value = 0; }
  register(Child, { value: "int32" });
  class Root { child = Object.assign(new Child(), { value: 3 }); }
  register(Root, { child: { kind: "root", className: CjsSchema.getClassName(Child) } });
  const root = new Root();
  assert.deepEqual(parse(write(root)).child, { type: CjsSchema.getClassName(Child) });
  assert.deepEqual(new DictWriter().WriteObject(root, {}, { typeTags: true }).child, { value: 3 });
});

test("declared float64 vector precision is retained in default comparison and output", () => {
  class Root { value = new Float64Array(2); }
  register(Root, { value: { kind: "vector2", scalar: "float64", length: 2 } });
  const root = new Root();
  root.value[0] = 0.0000001;
  root.value[1] = 0.123456789012;
  assert.deepEqual(parse(write(root)).value, Array.from(root.value));
});

test("native matrix and percent-g helpers retain their distinct sequence shapes", () => {
  class Root {}
  register(Root, {});
  class HelperWriter extends YamlWriter {
    WriteMembers() {
      this._WriteMemberName("matrix");
      this._WriteFloatMatrix(new Float32Array([1, 2, 3, 4]), 2, 2);
      this._WriteMemberName("packed");
      this._WriteFloatSequence(new Float32Array([0.00001, 1000000, 1.25, -0, 0.0009765625]), 5);
      this._WriteMemberName("byte");
      this._WriteInt8(255);
      this._WriteMemberName("short");
      this._WriteInt16(65535);
    }
  }
  const text = new HelperWriter().WriteObjectToString(new Root());
  assert.deepEqual(parse(text).matrix, [[1, 2], [3, 4]]);
  assert.match(text, /packed: \[1e-05, 1e\+06, 1\.25, -0, 0\.000976562\]/);
  assert.equal(parse(text).byte, -1);
  assert.equal(parse(text).short, -1);
});

test("native NaN-array default and short-stream-write quirks remain observable", () => {
  class Root { value = new Float32Array(2); }
  register(Root, { value: { kind: "vector2", scalar: "float32", length: 2 } });
  const root = new Root();
  root.value[0] = NaN;
  assert.equal(parse(write(root)).value, undefined, "BlueVariable's >= test treats a NaN difference as equal");
  assert.doesNotThrow(() => new YamlWriter().WriteObjectToStream(root, { Write() { return 0; } }));
});
