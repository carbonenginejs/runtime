import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { YamlReader } from "../../npm/dist/global/blue/YamlReader.js";
import { YamlWriter } from "../../npm/dist/global/blue/YamlWriter.js";
import { IInitialize } from "../../npm/dist/global/blue/IInitialize.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { ICustomPersist } from "../../npm/dist/global/blue/ICustomPersist.js";
import { IBlueObjectProxy } from "../../npm/dist/global/blue/IBlueObjectProxy.js";
import { IRoot } from "../../npm/dist/global/blue/IRoot.js";
import { IListNotify } from "../../npm/dist/global/blue/IListNotify.js";
import { BlueList } from "../../npm/dist/global/blue/BlueList.js";
import { BLUELISTEVENT } from "../../npm/dist/global/consts/blue.js";
import { BeObjectMetadata } from "../../npm/dist/global/blue/BlueObjectMetadata.js";
import "../../npm/dist/global/blue/values.js";

let serial = 0;
function register(Constructor, fields, extra = {})
{
  CjsSchema.define(Constructor, {
    className: "YamlReaderTest" + ++serial,
    members: Object.entries(fields).map(([key, type]) => ({
      key, name: key, type: typeof type === "string" ? { kind: type } : type,
      edit: type?.binary ? { persist: true, persistOnly: true, hidden: true } : { persist: true, read: true, write: true }
    })),
    ...extra
  });
  return CjsSchema.getClassName(Constructor);
}
const read = text => new YamlReader().CreateObjectFromString(text);
const stream = text => {
  const bytes = new TextEncoder().encode(text);
  let offset = 0;
  return { Read(buffer, size) {
    const count = Math.min(size, bytes.length - offset);
    buffer.set(bytes.subarray(offset, offset + count)); offset += count; return count;
  } };
};

test("Blue exposes native reader settings without persisting them", () => {
  assert.equal(CjsSchema.getClassName(YamlReader), "YamlReader");
  const reader = new YamlReader();
  assert.equal(reader._isStrict, false);
  assert.equal(reader._doInitialize, true);
  const members = CjsSchema.getSchema(YamlReader).members;
  const strict = members.find(field => field.name === "isStrict");
  const initialize = members.find(field => field.name === "doInitialize");
  assert.equal(strict.key, "_isStrict");
  assert.equal(initialize.key, "_doInitialize");
  assert.equal(strict.type.kind, "boolean");
  assert.equal(CjsSchema.isFieldExported(strict, { persistOnly: true }), false);
});

test("donor scalar conversions use declarations and retain int64 and float precision", () => {
  class Root { f = 0; d = 0; i = 0; u = 0; big = 0n; unsigned = 0n; flag = true; text = ""; }
  const name = register(Root, { f: "float32", d: "float64", i: "int32", u: "uint32",
    big: "int64", unsigned: "uint64", flag: "boolean", text: "string" });
  const result = read(`type: ${name}
f: 0.123456789123
d: 0.123456789123
i: 12garbage
u: -1
big: 9223372036854775807
unsigned: 18446744073709551615
flag: true
text: 00012
`);
  assert.equal(result.f, Math.fround(0.123456789123));
  assert.equal(result.d, 0.123456789123);
  assert.equal(result.i, 12);
  assert.equal(result.u, 4294967295);
  assert.equal(result.big, 9223372036854775807n);
  assert.equal(result.unsigned, 18446744073709551615n);
  assert.equal(result.flag, false, "YamlReader.cpp:540: bool uses atoi, not YAML boolean inference");
  assert.equal(result.text, "00012");
});

test("reads all metadata into the side table; values export uses DictWriter", () => {
  class Root { value = 0; }
  const name = register(Root, { value: "int32" });
  const object = read(`type: ${name}\n__bluemetadata__:\n  unknown: "keep this"\n  nodePosition: "1,2"\nvalue: 4\n`);
  assert.equal(BeObjectMetadata.Get(object, "unknown"), "keep this");
  assert.equal(Object.hasOwn(object, "__bluemetadata__"), false);
  const values = CjsSchema.getValues(object, {}, { typeTags: true });
  assert.equal(values.value, 4);
  assert.equal(values.__bluemetadata__.unknown, "keep this");
  const text = new YamlWriter().WriteObjectToString(object);
  assert.doesNotMatch(text, /unknown/);
  assert.match(text, /nodePosition/);
});

test("backward aliases have no 100-alias cap; native forward/self references fail", () => {
  class Leaf { value = 0; }
  const leaf = register(Leaf, { value: "int32" });
  class Root { items = []; self = null; }
  const root = register(Root, { items: { kind: "array", itemType: { kind: "rootRef" } }, self: "rootRef" });
  const text = `type: ${root}\nitems:\n- &shared {type: ${leaf}, value: 9}\n` + "- *shared\n".repeat(727);
  const object = read(text);
  assert.equal(object.items.length, 728);
  assert.ok(object.items.every(item => item === object.items[0]));
  assert.throws(() => read(`&self {type: ${root}, self: *self}`), /hasn't been previously defined/);
  assert.throws(() => read(`type: ${root}\nself: *missing`), /hasn't been previously defined/);
});

test("native anchor identifier compares only the first eight bytes", () => {
  class Leaf { value = 0; }
  const leaf = register(Leaf, { value: "int32" });
  class Root { a = null; b = null; c = null; }
  const root = register(Root, { a: "rootRef", b: "rootRef", c: "rootRef" });
  const result = read(`type: ${root}\na: &abcdefgh1 {type: ${leaf}, value: 1}\nb: &abcdefgh2 {type: ${leaf}, value: 2}\nc: *abcdefgh1\n`);
  assert.equal(result.c, result.b, "YamlReader.cpp:938-945 truncates anchors");
});

test("Initialize runs child before parent and suppresses mapped member notifications", () => {
  const calls = [];
  class Root { value = 0; child = null; Initialize() { calls.push(this.value); } OnModified() { calls.push("notify"); } }
  const name = register(Root, { value: "int32", child: "rootRef" });
  CjsSchema.blue.interface(IInitialize, INotify)(Root, { kind: "class" });
  const text = `type: ${name}\nvalue: 1\nchild: {type: ${name}, value: 2}`;
  read(text);
  assert.deepEqual(calls, [2, 1]);
  calls.length = 0;
  const reader = new YamlReader();
  reader.SetDoInitialize(false);
  reader.CreateObjectFromString(text);
  assert.deepEqual(calls, []);
});

test("float arrays preserve storage and short tails, accept legacy vectors and reject overflow", () => {
  class Root { v = new Float32Array([7, 8, 9]); q = new Float32Array(4); }
  const name = register(Root, { v: "vector3", q: "quaternion" });
  const object = read(`type: ${name}\nv: [0.1]\nq: {type: TriQuaternion, x: 0.5}`);
  assert.deepEqual(object.v, new Float32Array([0.1, 8, 9]));
  assert.deepEqual(object.q, new Float32Array([0.5, 0, 0, 1]));
  assert.throws(() => read(`type: ${name}\nv: [1, 2, 3, 4]`), /SEQUENCE_END/);
});

test("layout match appends typed rows; mismatch consumes rows but preserves existing list", () => {
  class Row { time = 0; value = 0; }
  CjsSchema.define(Row, { className: "YamlReaderRow", struct: { size: 8 }, members: [
    { name: "time", key: "time", struct: { dataType: "FLOAT32_1", offset: 0 } },
    { name: "value", key: "value", struct: { dataType: "UINT32_1", offset: 4 } }
  ] });
  class Root { rows = [new Row()]; tail = 0; }
  const name = register(Root, { rows: { kind: "structList", className: "YamlReaderRow" }, tail: "int32" });
  const text = `type: ${name}\nrows:\n  structure: [[time, 4, 0], [value, 10, 4]]\n  items: [[0.1, 4294967295]]\ntail: 7`;
  const object = read(text);
  assert.equal(object.rows.length, 2);
  assert.equal(object.rows[1].time, Math.fround(0.1));
  assert.equal(object.rows[1].value, 4294967295);
  const mismatch = read(text.replace("[value, 10, 4]", "[value, 10, 8]"));
  assert.equal(mismatch.rows.length, 1);
  assert.equal(mismatch.tail, 7);
});

test("custom binary persistence receives allocated storage and decoded used size", () => {
  class Root {
    binary = new Uint8Array(0);
    AllocateReadBuffer(_name, size) { return new Uint8Array(size); }
    SetBufferAndSize(_name, bytes, size) { this.binary = bytes.subarray(0, size); }
  }
  CjsSchema.blue.interface(ICustomPersist)(Root, { kind: "class" });
  const name = register(Root, { binary: { kind: "typedArray", binary: true, scalar: "uint8" } });
  assert.deepEqual(read(`type: ${name}\nbinary: AQI=`).binary, new Uint8Array([1, 2]));
  assert.deepEqual(read(`type: ${name}\nbinary: "!!!!"`).binary, new Uint8Array(3));
});

test("cache builds independent objects and resets completed anchors", () => {
  class Root { value = 0; }
  const name = register(Root, { value: "int32" });
  const reader = new YamlReader();
  assert.equal(reader.ReadForCachingFromStream(stream(`&root {type: ${name}, value: 8}`)), true);
  const first = reader.CreateObject(0, null), second = reader.CreateObjectWithYield(0, null);
  assert.notEqual(first, second);
  assert.equal(first.value, 8);
  assert.equal(second.value, 8);
  assert.equal(reader.IsMemoryUsageKnown(), true);
  assert.ok(reader.GetMemoryUsage() > 128);
});

test("unknown classes warn to null, strict mode fails, and errors carry filename", () => {
  const reader = new YamlReader();
  reader.SetFileName("test.red");
  assert.equal(reader.ReadFromStream(stream("type: MissingReaderTestType")), null);
  reader._isStrict = true;
  assert.equal(reader.ReadFromStream(stream("type: MissingReaderTestType")), null);
  assert.match(reader.GetErrorMessage(), /test.red.*not found/);
  assert.throws(() => read("value: 1"), /Type of object is not specified/);
});

test("donor unknown scalar member recovery leaves its value on the cursor", () => {
  class Root { value = 0; }
  const name = register(Root, { value: "int32" });
  // :1372 only warns: "value" becomes the next member name and consumes 9.
  const object = read(`type: ${name}\nunknown: value\n9: 5`);
  assert.equal(object.value, 9);
});

test("persisted script-read-only storage is restored by native readers", () => {
  class Root { value = 1; }
  const name = register(Root, {}, { members: [
    { key: "value", name: "value", type: { kind: "int32" }, edit: { read: true, persist: true } }
  ] });
  assert.equal(read(`type: ${name}\nvalue: 8`).value, 8);
});

test("typed pointers use exposed interfaces rather than inheritance alone", () => {
  class Leaf { value = 0; }
  const leaf = register(Leaf, { value: "int32" });
  class Root { child = null; }
  const root = register(Root, { child: { kind: "rootRef", className: leaf } });
  const text = `type: ${root}\nchild: {type: ${leaf}, value: 8}`;
  assert.throws(() => read(text), /Incorrect type for member/);
  CjsSchema.blue.interface()(Leaf, { kind: "class" });
  assert.equal(read(text).child.value, 8);
});

test("cached proxies retain builders and inner markers without eager construction", () => {
  let constructed = 0;
  class Leaf { value = 0; constructor() { ++constructed; } }
  const leaf = register(Leaf, { value: "int32" });
  class Proxy {
    builder = null; marker = -1;
    SetBuilder(builder, marker) { this.builder = builder; this.marker = marker; }
  }
  CjsSchema.blue.interface(IBlueObjectProxy)(Proxy, { kind: "class" });
  const proxy = register(Proxy, {});
  const reader = new YamlReader();
  assert.equal(reader.ReadForCachingFromStream(stream(`type: ${proxy}\nobject: {type: ${leaf}, value: 7}`)), true);
  const object = reader.CreateObject(0, null);
  assert.equal(constructed, 0);
  assert.equal(object.builder, reader);
  assert.equal(object.builder.CreateObject(object.marker, object).value, 7);
  assert.equal(constructed, 1);
});

test("native IList drops null entries and restores its observer after successful loading", () => {
  class Leaf {}
  CjsSchema.blue.interface(IRoot)(Leaf, { kind: "class" });
  const leaf = register(Leaf, {});
  const events = [];
  class Observer extends IListNotify { OnListModified(event) { events.push(event); } }
  CjsSchema.blue.interface(IListNotify)(Observer, { kind: "class" });
  const observer = new Observer();
  class Root {
    items = new BlueList(IRoot);
    constructor() { this.items.SetNotify(observer); }
  }
  const root = register(Root, { items: { kind: "list", itemType: "IRoot" } });
  const object = read(`type: ${root}\nitems: [null, {type: ${leaf}}, ~]`);
  assert.equal(object.items.GetSize(), 1);
  assert.equal(events.at(-1), BLUELISTEVENT.BELIST_LOADFINISHED);
  const info = {};
  object.items.GetInfo(info);
  assert.equal(info.notify, observer);
});

test("half storage reproduces native infinity spelling and exact ties", () => {
  const scalar = text => {
    const reader = new YamlReader();
    reader._LoadEvents(text);
    reader._GetNextEvent(); // stream start
    reader._GetNextEvent(); // document start
    return reader._ReadFloat16();
  };
  assert.equal(scalar("1.0"), 0x3c00);
  assert.equal(scalar("-0"), 0x8000);
  assert.equal(scalar("1.00048828125"), 0x3c00);
  assert.equal(scalar("inf"), 0x7fff, "BlueStructureList.cpp:570-579");
  assert.equal(scalar("-inf"), 0xffff);
});

test("ReadFromStream retains native anchor state across calls, unlike cached CreateObject", () => {
  class Leaf { value = 0; }
  const leaf = register(Leaf, { value: "int32" });
  class Root { child = null; }
  const root = register(Root, { child: "rootRef" });
  const reader = new YamlReader();
  const first = reader.CreateObjectFromString(`&previous {type: ${leaf}, value: 9}`);
  const next = reader.CreateObjectFromString(`type: ${root}\nchild: *previous`);
  assert.equal(next.child, first, "YamlReader.cpp:107-155 never clears m_anchorClassMap");
});
