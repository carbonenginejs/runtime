import { EDITFLAGS } from "../../src/global/consts/blue.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsGraph, GRAPH_TYPES, VARTYPE, GraphMemberFlags, VarEntry } from "../../src/global/model/graph/index.js";

/** A compiled member of a type, with its handler. */
const member = (type, fields = {}) => CjsGraph.compileMember({ name: "value", type, ...fields });

/** Writes a value into a fresh holder through a type's handler. */
function write(type, value, stored = null)
{
  const entry = member(type), holder = { value: stored };
  entry.handler.Write(holder, "value", value, entry);
  return holder.value;
}

test("the table is data: every name has a storage kind and a handler, and the math names are lengths", () =>
{
  for (const [ name, entry ] of Object.entries(GRAPH_TYPES))
  {
    assert.ok(Object.values(VARTYPE).includes(entry.storage), `${name} storage`);
    assert.equal(typeof entry.handler, "string", `${name} handler`);
    assert.equal(typeof member(name).handler.IsValidValue, "function", `${name} resolves`);
  }

  const vector = member("vec3"), colour = member("color"), matrix = member("mat4");
  assert.equal(vector.handler, colour.handler, "one handler per storage kind");
  assert.equal(vector.handler, matrix.handler);
  assert.deepEqual([ vector.length, colour.length, matrix.length ], [ 3, 4, 16 ]);
  assert.equal(vector.type, VARTYPE.FLOATARRAY);
  assert.equal(member("float32").type, VARTYPE.FLOAT);
  assert.equal(member("uint8").type, VARTYPE.BYTE);
  assert.equal(member("int16").type, VARTYPE.SHORT);
  assert.equal(member("uint32").type, VARTYPE.ULONG);
  assert.equal(member("rootWeak").type, VARTYPE.IROOTWEAKREF);
});

test("a compiled member is one flat shape, whatever its type", () =>
{
  const keys = Object.keys(member("float32"));

  for (const type of [ "vec3", "int8", "string", "rootRef", "list" ]) assert.deepEqual(Object.keys(member(type)), keys);
  assert.deepEqual(Object.keys(CjsGraph.compileMember({ name: "value" })), keys, "no type is the same shape");
});

test("a script object and a callback are held by reference and never equal", () =>
{
  // Be::PYOBJECTPTR is 11 and Be::SCRIPTCALLBACK 33 (blueexposure/include/BlueTypes.h:230,247).
  assert.equal(member("pyObject").type, VARTYPE.PYOBJECTPTR);
  assert.equal(member("scriptCallback").type, VARTYPE.SCRIPTCALLBACK);

  for (const kind of [ "pyObject", "scriptCallback" ])
  {
    const row = member(kind), holder = { value: null }, callback = () => 1;

    assert.equal(row.handler.Set(holder, "value", callback, row), true);
    assert.equal(row.handler.Get(holder, "value", row), callback);
    assert.equal(row.handler.Set(holder, "value", callback, row), true);
    assert.equal(row.handler.IsEqual(callback, callback, row), false);
    assert.equal(row.handler.IsUnchanged(callback, callback, row), false);
    assert.equal(row.handler.IsExactEqual(callback, callback, row), true);
    assert.equal(row.handler.IsExactEqual(callback, () => 1, row), false);
    assert.equal(row.handler.IsValidValue(null, row), true);
    row.handler.Write(holder, "value", null, row);
    assert.equal(holder.value, null);
  }
});

test("a compiled member is Carbon's row: its VARTYPE is type, its type name is kind, and no index is -1", () =>
{
  const row = member("vec3");

  assert.equal(row.constructor, VarEntry);
  assert.equal(row.kind, "vec3");
  assert.equal(row.type, VARTYPE.FLOATARRAY);
  assert.equal(row.key, "value");
  assert.equal(row.index, -1);
  assert.equal(member("float32", { index: 2, key: "stored" }).index, 2);
});

test("an edge type is always a list, the declared class first, and empty is dynamic", () =>
{
  class First {}
  class Second {}

  assert.deepEqual(member("rootRef", { edge: { kind: "ref" } }).edgeType, []);
  assert.deepEqual(member("rootRef", { edge: { kind: "ref", type: First } }).edgeType, [ First ]);
  assert.deepEqual(member("rootRef", { edge: { kind: "ref", type: [ First, Second ] } }).edgeType, [ First, Second ]);
  assert.equal(member("float32").edgeType.length, 0);
});

test("a member holds what any listed class accepts, and anything else is refused", () =>
{
  class Effect { name = ""; }
  class Material { name = ""; }
  class Other { name = ""; }
  class Area { effect = null; }

  for (const [ ctor, name ] of [ [ Effect, "ListedEffect" ], [ Material, "ListedMaterial" ], [ Other, "ListedOther" ] ])
  {
    CjsGraph.define(ctor, { name, members: [ { name: "name", type: "string" } ] });
  }
  CjsGraph.define(Area, { name: "ListedArea", members: [
    { name: "effect", type: "rootRef", edge: { kind: "ref", type: [ Effect, Material ] } }
  ] });

  const area = new Area();
  area.effect = new Material();
  assert.equal(CjsGraph.get(area, { full: true, typeTags: true }).effect._type, "ListedMaterial");

  area.effect = new Other();
  assert.throws(() => CjsGraph.get(area, { full: true }), /not assignable to ListedEffect: holds ListedOther/);
});

test("a member that names a class nothing defines is refused by every read and walk, whatever it holds", () =>
{
  class Second { name = ""; }
  class Stranger { name = ""; }
  class Holder { either = null; }
  CjsGraph.define(Second, { name: "UndefinedFirstSecond", members: [ { name: "name", type: "string" } ] });
  CjsGraph.define(Holder, { name: "UndefinedFirstHolder", members: [
    { name: "either", type: "rootRef", edge: { kind: "ref", type: [ "UndefinedFirstMissing", "UndefinedFirstSecond" ] } }
  ] });

  // An object of the second, defined class: the first name is still asked, and it is a mistake.
  const holder = new Holder();
  holder.either = new Second();
  assert.throws(() => CjsGraph.get(holder, { full: true }), /Unknown graph class: UndefinedFirstMissing/);
  assert.throws(() => CjsGraph.traverse(holder, () => {}), /Unknown graph class: UndefinedFirstMissing/);

  // An object of a class the graph has no definition for stops the whole walk.
  holder.either = new Stranger();
  assert.throws(() => CjsGraph.get(holder, { full: true }), /Unknown graph class/);
  assert.throws(() => CjsGraph.traverse(holder, () => {}), /Unknown graph class/);

  class Missing extends Second {}
  CjsGraph.define(Missing, { name: "UndefinedFirstMissing", chainTo: "UndefinedFirstSecond", members: [] });
  holder.either = new Second();
  assert.deepEqual(CjsGraph.get(holder, { full: true, typeTags: true }).either, { _type: "UndefinedFirstSecond", name: "" });
});

test("a name's rows are listed derived first, and a class's facts stay in its declaration", () =>
{
  class Base { shared = 0; quiet = 0; }
  class Derived extends Base { own = 0; }

  CjsGraph.define(Base, { name: "PersistBase", members: [
    { name: "shared", key: "base", type: "float32" },
    { name: "quiet", type: "float32", flags: EDITFLAGS.READWRITE }
  ] });
  CjsGraph.define(Derived, { name: "PersistDerived", chainTo: "PersistBase", proxy: true, customPersist: true, list: true, abstract: true,
    layout: { size: 4, boundaries: [], fields: [] }, members: [
      { name: "shared", key: "derived", type: "float32" },
      { name: "skipped", type: "float32", flags: GraphMemberFlags.RUNTIMEONLY }
    ] });

  const info = CjsGraph.getClassInfo(Derived), { compiled, declared } = info;
  assert.deepEqual(compiled.members.filter(member => member.name === "shared").map(member => member.key), [ "derived", "base" ]);
  assert.equal(CjsGraph._FindEntry(info, "quiet").flags, EDITFLAGS.READWRITE);
  assert.equal(CjsGraph._FindEntry(info, "skipped").flags, GraphMemberFlags.RUNTIMEONLY);
  assert.deepEqual([ declared.proxy, declared.customPersist, declared.list, declared.abstract ], [ true, true, true, true ]);
  assert.equal(declared.layout.size, 4);
  assert.equal(declared.name, "PersistDerived");
  assert.deepEqual(Object.keys(compiled).sort(), [ "defaults", "members", "tables", "ui" ], "the rows, and what is built from them when asked");
});

test("Set refuses NaN and Infinity in every number and array type, and there is no way past", () =>
{
  for (const type of [ "float32", "float64" ])
  {
    const entry = member(type);
    assert.equal(entry.handler.IsValidValue(1.5, entry), true);
    for (const bad of [ NaN, Infinity, -Infinity ]) assert.equal(entry.handler.IsValidValue(bad, entry), false, `${type} ${bad}`);
  }

  for (const type of [ "vec3", "vec3d" ])
  {
    const entry = member(type);
    assert.equal(entry.handler.IsValidValue([ 1, 2, 3 ], entry), true);
    for (const bad of [ NaN, Infinity, -Infinity ]) assert.equal(entry.handler.IsValidValue([ 1, bad, 3 ], entry), false, `${type} ${bad}`);
    assert.equal(entry.handler.IsValidValue(new Float32Array([ 1, NaN, 3 ]), entry), false);
  }

  class Holder { weight = 1; position = new Float32Array(3); }
  CjsGraph.define(Holder, { name: "FiniteHolder", members: [ { name: "weight", type: "float32" }, { name: "position", type: "vec3" } ] });

  assert.throws(() => CjsGraph.set(new Holder(), { weight: NaN }), /Invalid value/);
  assert.throws(() => CjsGraph.set(new Holder(), { position: [ 0, Infinity, 0 ] }), /Invalid value/);
  assert.throws(() => CjsGraph.from(Holder, { weight: -Infinity }), /Invalid value/);
});

test("get throws on a non-finite number, because one reaching it is a bug", () =>
{
  class Stored { weight = 1; twice = 2; position = new Float32Array(3); wide = new Float64Array(3); }
  CjsGraph.define(Stored, { name: "FiniteStored", members: [
    { name: "weight", type: "float32" }, { name: "twice", type: "float64" },
    { name: "position", type: "vec3" }, { name: "wide", type: "vec3d" }
  ] });

  assert.deepEqual(CjsGraph.get(new Stored(), { full: true }), { weight: 1, twice: 2, position: [ 0, 0, 0 ], wide: [ 0, 0, 0 ] });

  for (const [ name, value ] of [ [ "weight", NaN ], [ "twice", Infinity ], [ "position", new Float32Array([ 0, NaN, 0 ]) ], [ "wide", new Float64Array([ 0, 0, -Infinity ]) ] ])
  {
    const object = new Stored();
    object[name] = value;
    assert.throws(() => CjsGraph.get(object, { full: true }), new RegExp(`Non-finite number in graph member: ${name}`));
  }
});

test("integers convert to their width and sign, as the native typed array does", () =>
{
  const cases = [ [ "int8", Int8Array ], [ "uint8", Uint8Array ], [ "int16", Int16Array ], [ "uint16", Uint16Array ], [ "int32", Int32Array ], [ "uint32", Uint32Array ] ];

  for (const [ type, ctor ] of cases)
  {
    for (const value of [ 0, 1, -1, 127, 128, 255, 256, 32767, 32768, 65535, 65536, 2147483647, 2147483648, 4294967295 ])
    {
      assert.equal(write(type, value), new ctor([ value ])[0], `${type} ${value}`);
    }

    const entry = member(type), limit = new ctor([ -1 ])[0];
    assert.equal(entry.handler.IsValidValue(limit, entry), true);
    assert.equal(entry.handler.IsValidValue(1.5, entry), false);
    assert.equal(entry.handler.IsValidValue("1", entry), false);
  }

  assert.equal(member("uint8").handler.IsValidValue(256, member("uint8")), false);
  assert.equal(member("int8").handler.IsValidValue(128, member("int8")), false);
});

test("64-bit members keep BigInt precision, take safe integers and raw word pairs, and check range", () =>
{
  const signed = member("int64"), unsigned = member("uint64");

  assert.equal(write("int64", 2n ** 63n), -(2n ** 63n));
  assert.equal(write("uint64", -1n), 2n ** 64n - 1n);
  assert.equal(write("int64", 42), 42, "a safe integer stays as given, so reader-built objects agree");
  assert.equal(write("uint64", [ 1, 2 ]), (1n << 32n) | 2n);
  assert.equal(write("uint64", [ -1, -1 ]), 2n ** 64n - 1n);

  assert.equal(signed.handler.IsValidValue(2n ** 63n - 1n, signed), true);
  assert.equal(signed.handler.IsValidValue(2n ** 63n, signed), false);
  assert.equal(unsigned.handler.IsValidValue(-1n, unsigned), false);
  assert.equal(unsigned.handler.IsValidValue(-1, unsigned), false);
  assert.equal(signed.handler.IsValidValue("123", signed), true);
  assert.equal(signed.handler.IsValidValue("1.5", signed), false);
  assert.equal(signed.handler.IsValidValue([ 1, 2 ], signed), true);
  assert.equal(signed.handler.IsValidValue([ 1 ], signed), false);
  assert.equal(signed.handler.IsExactEqual(5, 5n, signed), true);
  assert.equal(signed.handler.IsUnchanged(null, 5, signed), false);
});

test("float Set compares after conversion and calls ordinary accessors only on a change", () =>
{
  let stored = Math.fround(0.1), writes = 0;
  const target = { get value() { return stored; }, set value(v) { stored = v; writes++; } };
  const entry = member("float32");

  assert.equal(entry.handler.Set(target, "value", 0.1, entry), false);
  assert.equal(writes, 0);
  assert.equal(entry.handler.Set(target, "value", 0.2, entry), true);
  assert.equal(stored, Math.fround(0.2));
  assert.equal(writes, 1);
});

test("tolerance belongs to IsEqual, IsExactEqual has none, and a stored null is always overwritten", () =>
{
  const float = member("float32"), double = member("float64"), { handler } = float;

  assert.equal(handler.IsEqual(0, Math.fround(1e-7), float), true);
  assert.equal(handler.IsExactEqual(0, Math.fround(1e-7), float), false);
  assert.equal(double.handler.IsEqual(0, 1e-13, double), true);
  assert.equal(double.handler.IsEqual(0, 1e-11, double), false);
  assert.equal(handler.IsEqual(-0, 0, float), true);
  assert.equal(handler.IsExactEqual(-0, 0, float), true);
  assert.equal(handler.IsEqual(NaN, NaN, float), false, "NaN never equals itself within a tolerance");
  assert.equal(handler.IsExactEqual(NaN, NaN, float), true);
  assert.equal(handler.IsUnchanged(null, 0, float), false);
  assert.equal(member("string").handler.IsUnchanged(null, "", member("string")), false);
});

test("arrays take plain and typed input, keep fixed storage and resize only a variable length", () =>
{
  const vector = member("vec3"), holder = { value: new Float32Array(3) }, { value: stored } = holder;

  assert.equal(vector.handler.Set(holder, "value", [ 1, 2, 3 ], vector), true);
  assert.equal(holder.value, stored, "fixed storage keeps its identity");
  assert.equal(vector.handler.Set(holder, "value", new Float64Array([ 1, 2, 3 ]), vector), false);
  assert.deepEqual(vector.handler.Get(holder, "value", vector), [ 1, 2, 3 ]);
  assert.equal(Array.isArray(vector.handler.Get(holder, "value", vector)), true);

  const any = member("float32Array"), resized = { value: new Float32Array(2) };
  assert.equal(any.handler.Set(resized, "value", [ 1, 2, 3 ], any), true);
  assert.equal(resized.value.length, 3);

  assert.equal(vector.handler.IsValidValue([ 1, 2 ], vector), false);
  assert.equal(vector.handler.IsValidValue([ 1, "2", 3 ], vector), false);
  assert.equal(vector.handler.IsValidValue(new DataView(new ArrayBuffer(12)), vector), false);
  assert.equal(any.handler.IsValidValue([ 1, 2, 3, 4, 5 ], any), true);
});

test("an array member holding null gets owned storage of the right class", () =>
{
  assert.ok(write("vec3", [ 1, 2, 3 ]) instanceof Float32Array);
  assert.ok(write("vec3d", [ 1, 2, 3 ]) instanceof Float64Array);
  assert.ok(write("uint16Array", [ 1, 2 ]) instanceof Uint16Array);
  assert.equal(write("uint16Array", [ 1, 2 ]).length, 2);
});

test("overlapping views copy without corrupting later elements", () =>
{
  const backing = new Float32Array([ 1, 2, 3, 4 ]);
  const entry = member("vec3"), holder = { value: backing.subarray(1, 4) };

  entry.handler.Write(holder, "value", backing.subarray(0, 3), entry);
  assert.deepEqual(Array.from(backing), [ 1, 1, 2, 3 ]);
});

test("clamped bytes clamp as native storage does, and integer arrays compare exactly", () =>
{
  assert.deepEqual(Array.from(write("uint8ClampedArray", [ 300, -5, 1.5, 2.5 ])), [ 255, 0, 2, 2 ]);

  const entry = member("int32Array");
  assert.equal(entry.handler.IsEqual([ 1, 2 ], new Int32Array([ 1, 2 ]), entry), true);
  assert.equal(entry.handler.IsExactEqual([ 1, 2 ], [ 1, 3 ], entry), false);
  assert.equal(entry.handler.IsValidValue([ 1, 1.5 ], entry), false);
});

test("float arrays keep Carbon's tolerant comparison and NaN quirk (CE-202), and Set still overwrites NaN", () =>
{
  const entry = member("vec3"), { handler } = entry;

  assert.equal(handler.IsEqual([ 0, 0, 0 ], [ 1e-7, 0, 0 ], entry), true);
  assert.equal(handler.IsExactEqual([ 0, 0, 0 ], [ 1e-7, 0, 0 ], entry), false);
  assert.equal(handler.IsEqual([ NaN, 0, 0 ], [ 1, 0, 0 ], entry), true, "IsArrayEqual passes a NaN");
  assert.equal(handler.IsUnchanged(new Float32Array([ NaN, 0, 0 ]), [ 1, 0, 0 ], entry), false);
  assert.equal(handler.IsExactEqual([ NaN ], [ NaN ], entry), true);
  assert.equal(handler.IsExactEqual([ -0 ], [ 0 ], entry), true);
});

test("double arrays keep double precision", () =>
{
  const entry = member("vec3d"), value = 0.1 + 0.2;
  assert.equal(write("vec3d", [ value, 0, 0 ])[0], value);
  assert.equal(entry.handler.IsEqual([ 1, 0, 0 ], [ 1 + 1e-13, 0, 0 ], entry), true);
  assert.equal(entry.handler.IsEqual([ 1, 0, 0 ], [ 1 + 1e-11, 0, 0 ], entry), false);
});

test("standard strings keep everything; C, reference and shared strings stop at the first NUL", () =>
{
  assert.equal(write("string", "a\0b"), "a\0b");
  assert.equal(write("wstring", "é\0ü"), "é\0ü");

  for (const type of [ "cstring", "wcstring", "reference", "wreference", "sharedString", "sharedStringW" ])
  {
    const entry = member(type);
    assert.equal(write(type, "a\0b"), "a", type);
    assert.equal(entry.handler.Get({ value: "c\0d" }, "value", entry), "c");
    assert.equal(entry.handler.IsEqual("a\0x", "a\0y", entry), true);
    assert.equal(entry.handler.IsValidValue(1, entry), false);
  }
});

test("a member with no type refuses every value operation before touching anything", () =>
{
  const entry = CjsGraph.compileMember({ name: "value" }), { handler } = entry, holder = { value: 1 };

  assert.equal(entry.type, VARTYPE.INVALID);
  assert.throws(() => handler.Get(holder, "value", entry), /Invalid type handler cannot get property value/);
  assert.throws(() => handler.Set(holder, "value", 2, entry), /Invalid type handler cannot set property value/);
  assert.throws(() => handler.Write(holder, "value", 2, entry), /Invalid type handler cannot write property value/);
  assert.throws(() => handler.IsEqual(1, 1), /cannot compare/);
  assert.throws(() => handler.IsUnchanged(1, 1), /cannot compare/);
  assert.throws(() => handler.IsExactEqual(1, 1), /cannot compare/);
  assert.throws(() => handler.IsValidValue(1), /cannot test/);
  assert.equal(holder.value, 1);
});

test("an unknown type name fails at definition", () =>
{
  assert.throws(() => member("nothing"), /Unknown graph type: nothing/);
});

/** A class whose constructor sets what its field does not. */
class Defaulted
{
  static built = 0;
  name = "";
  weight = 0.5;
  position = new Float32Array([ 1, 2, 3 ]);
  items = [];
  child = null;
  embedded = null;
  held = null;

  constructor()
  {
    Defaulted.built++;
    this.name = "Listener";
  }
}

class Plain
{
  value = 1;
  Initialize() { Plain.initialized++; }
  static initialized = 0;
}

CjsGraph.define(Plain, { name: "DefaultPlain", initialize: true, members: [ { name: "value", type: "float32" } ] });
CjsGraph.define(Defaulted, { name: "DefaultDefaulted", members: [
  { name: "name", type: "string" }, { name: "weight", type: "float32" }, { name: "position", type: "vec3" },
  { name: "items", type: "list", edge: { kind: "ref", collection: true, type: Plain } },
  { name: "child", type: "rootRef", edge: { kind: "ref", type: Plain } },
  { name: "embedded", type: "root", edge: { kind: "embed", type: Plain } }
] });

test("get leaves out what a new instance holds, and full keeps it", () =>
{
  const object = new Defaulted();

  assert.deepEqual(CjsGraph.get(object), {});
  assert.deepEqual(Object.keys(CjsGraph.get(object, { full: true })), [ "name", "weight", "position", "items", "child", "embedded" ]);

  object.weight = 2;
  assert.deepEqual(CjsGraph.get(object), { weight: 2 });
});

test("a default is what the constructor left, so an empty name is written, and reads back", () =>
{
  const object = new Defaulted();
  object.name = "";

  const bag = CjsGraph.get(object);
  assert.deepEqual(bag, { name: "" });
  assert.equal(CjsGraph.from(Defaulted, bag).name, "");
});

test("comparison keeps Carbon's tolerance", () =>
{
  const object = new Defaulted();
  object.weight = 0.5 + 1e-7;
  object.position[1] = 2 + 1e-7;

  assert.deepEqual(CjsGraph.get(object), {});
});

test("a held object is written, an empty list is not, and a list with items is", () =>
{
  const object = new Defaulted();
  object.child = new Plain();
  object.items.push(new Plain());

  assert.deepEqual(Object.keys(CjsGraph.get(object)), [ "items", "child" ]);
});

test("an embedded object at its defaults is left out, and one that differs is written", () =>
{
  class Holder { embedded = new Plain(); }
  CjsGraph.define(Holder, { name: "DefaultHolder", members: [ { name: "embedded", type: "root", edge: { kind: "embed", type: Plain } } ] });

  const object = new Holder();
  assert.deepEqual(CjsGraph.get(object), {});

  object.embedded.value = 7;
  assert.deepEqual(CjsGraph.get(object), { embedded: { value: 7 } });
});

test("defaults come from the first object a door creates, or one spare with no Initialize, once", () =>
{
  class Fresh { value = 1; constructor() { Fresh.built++; } static built = 0; Initialize() { Fresh.initialized++; } static initialized = 0; }
  CjsGraph.define(Fresh, { name: "DefaultFresh", initialize: true, members: [ { name: "value", type: "float32" } ] });

  const first = new Fresh();
  assert.equal(Fresh.built, 1);
  assert.deepEqual(CjsGraph.get(first), {});
  assert.equal(Fresh.built, 2, "no capture yet, so one spare");
  assert.equal(Fresh.initialized, 0);
  assert.deepEqual(CjsGraph.get(new Fresh()), {});
  assert.equal(Fresh.built, 3, "the spare is only built once");

  class Door { value = 1; constructor() { Door.built++; } static built = 0; }
  CjsGraph.define(Door, { name: "DefaultDoor", members: [ { name: "value", type: "float32" } ] });

  const created = CjsGraph.from(Door, { value: 9 });
  assert.equal(Door.built, 1);
  assert.deepEqual(CjsGraph.get(created), { value: 9 });
  assert.equal(Door.built, 1, "the door's own instance was captured before its values");
});

test("copy and clone never lose a member to a default", () =>
{
  const source = new Defaulted(), target = new Defaulted();
  target.weight = 3;

  CjsGraph.copy(source, target);
  assert.equal(target.weight, 0.5);
});

test("a path takes any text with no control characters, empty included, and keeps its accepts", () =>
{
  const path = member("path", { options: { accepts: [ "TriTextureRes" ] } }), { handler } = path;

  for (const value of [ "", "res:/dx9/model/a.black", "RES:/A/B.DDS", "res:/a\\b.dds", "dynamic:/name", "a b.dds", "c:/x/y.tga" ])
  {
    assert.equal(handler.IsValidValue(value, path), true, value);
  }

  assert.equal(handler.IsValidValue("res:/a\nb", path), false);
  assert.equal(handler.IsValidValue("res:/a\0b", path), false);
  assert.equal(handler.IsValidValue(1, path), false);
  assert.deepEqual(path.options.accepts, [ "TriTextureRes" ]);
  assert.equal(member("wpath").type, VARTYPE.STDWSTRING);
  assert.equal(member("expression").handler.IsValidValue("a\nb", member("expression")), true, "an expression is not a path");
});

test("a held object a constructor built is written against what the constructor put there", () =>
{
  class Curve { scale = 1; offset = 0; }
  class Owner { curve = new Curve(); constructor() { this.curve.scale = 5; } }
  CjsGraph.define(Curve, { name: "DefaultCurve", members: [ { name: "scale", type: "float32" }, { name: "offset", type: "float32" } ] });
  CjsGraph.define(Owner, { name: "DefaultOwner", members: [ { name: "curve", type: "rootRef", edge: { kind: "ref", type: Curve } } ] });

  const object = new Owner();
  object.curve.scale = 1;
  const bag = CjsGraph.get(object);

  assert.deepEqual(bag, { curve: { scale: 1 } }, "1 is the class's default, not this member's");
  assert.equal(CjsGraph.from(Owner, bag).curve.scale, 1);
});

test("a structure list loads from empty rows, not a constructor's", () =>
{
  class Row { value = 0; }
  class Rows { rows = [ Object.assign(new Row(), { value: 9 }) ]; }
  CjsGraph.define(Row, { name: "DefaultRow", members: [ { name: "value", type: "float32" } ] });
  CjsGraph.define(Rows, { name: "DefaultRows", members: [ { name: "rows", type: "structList", edge: { kind: "embed", collection: true, type: Row } } ] });

  const object = new Rows();
  object.rows[0].value = 0;
  const bag = CjsGraph.get(object);

  assert.deepEqual(bag, { rows: [ {} ] });
  assert.equal(CjsGraph.from(Rows, bag).rows[0].value, 0);
});

test("a Map of plain values reads, writes and compares through its item, nested lists included", () =>
{
  class Maps { weights = new Map(); curves = new Map(); }
  CjsGraph.define(Maps, { name: "ValuesMaps", members: [
    { name: "weights", type: "valuesMap", item: "float64" },
    { name: "curves", type: "valuesMap", item: { type: "values", item: "float64" } }
  ] });

  const object = new Maps(), { weights } = object;
  object.weights.set("a", 1);
  object.curves.set("b", [ 1, 2 ]);

  assert.deepEqual(CjsGraph.get(object), { weights: { a: 1 }, curves: { b: [ 1, 2 ] } });
  assert.equal(CjsGraph.set(object, { weights: { a: 1 }, curves: { b: [ 1, 2 ] } }), false);

  CjsGraph.set(object, { weights: { a: 2, c: 3 } });
  assert.equal(object.weights, weights, "the Map keeps its identity");
  assert.deepEqual(Array.from(object.weights), [ [ "a", 2 ], [ "c", 3 ] ]);

  const built = CjsGraph.from(Maps, { weights: { x: 1 } });
  assert.equal(built.weights.get("x"), 1);
  assert.throws(() => CjsGraph.set(object, { weights: { a: "no" } }), /Invalid value/);
  assert.throws(() => CjsGraph.set(object, { weights: { a: NaN } }), /Invalid value/);
});

test("metadata travels with a get and a set through the store it is given, and copy leaves it", () =>
{
  const table = new WeakMap();
  const store = {
    GetMetadata: object => table.get(object) ?? null,
    Set(object, key, value) { const row = table.get(object) ?? {}; row[key] = value; table.set(object, row); }
  };
  class Tagged { value = 1; }
  CjsGraph.define(Tagged, { name: "MetadataTagged", members: [ { name: "value", type: "float32" } ] });

  CjsGraph.setMetadataStore(store);
  try
  {
    const object = new Tagged();
    store.Set(object, "sof_source_id", "7");

    const bag = CjsGraph.get(object);
    assert.deepEqual(bag, { __bluemetadata__: { sof_source_id: "7" } });

    const built = CjsGraph.from(Tagged, bag);
    assert.deepEqual(store.GetMetadata(built), { sof_source_id: "7" });
    assert.equal(CjsGraph.set(built, bag), false, "metadata is not a member, so it is no change");

    const target = new Tagged();
    CjsGraph.copy(object, target);
    assert.equal(store.GetMetadata(target), null, "Copier copies members only");
  }
  finally { CjsGraph.setMetadataStore(null); }
});

test("diff says what set would change and writes nothing", () =>
{
  class Part { value = 1; label = ""; }
  class Whole { part = new Part(); name = ""; items = []; }
  CjsGraph.define(Part, { name: "DiffPart", members: [ { name: "value", type: "float32" }, { name: "label", type: "string" } ] });
  CjsGraph.define(Whole, { name: "DiffWhole", members: [
    { name: "part", type: "rootRef", edge: { kind: "ref", type: Part } },
    { name: "name", type: "string" },
    { name: "items", type: "list", edge: { kind: "ref", collection: true, type: Part } }
  ] });

  const object = new Whole();
  assert.equal(CjsGraph.diff(object, { name: "", part: { value: 1 } }), false);
  assert.equal(CjsGraph.diff(object, { part: { value: 1 + 1e-7 } }), false, "inside the tolerance");

  const values = { name: "a", part: { value: 2, label: "" }, items: [ { value: 3 } ] };
  assert.deepEqual(CjsGraph.diff(object, values), { name: "a", part: { value: 2 }, items: [ { value: 3 } ] });
  assert.equal(object.name, "");
  assert.equal(object.part.value, 1);
  assert.equal(object.items.length, 0);
  assert.throws(() => CjsGraph.diff(object, { nothing: 1 }), /Unknown graph member/);
});

test("a class's presentation is built when asked for, base first, with a host's on top", () =>
{
  let built = 0;
  class Base { value = 0; }
  class Ship extends Base { sun = new Float32Array(3); dirtLevel = 0; }

  CjsGraph.define(Base, { name: "UiBase", ui: () => { built++; return { members: { value: { group: "Base", min: 0 } } }; }, members: [
    { name: "value", type: "float32" }
  ] });
  CjsGraph.define(Ship, { name: "UiShip", chainTo: "UiBase", ui: () => { built++; return { members: { value: { group: "Ship" }, sun: { group: "Lighting" } } }; }, members: [
    { name: "sun", type: "vec3" }, { name: "dirtLevel", type: "float32" }
  ] });

  CjsGraph.getClassInfo(Ship);
  CjsGraph.get(new Ship());
  assert.equal(built, 0, "nothing builds it but asking");

  const weeksToDirt = weeks => weeks / 260;
  CjsGraph.defineUI(Ship, {
    settings: { nameProperty: "name" },
    members: { sun: { widget: "direction", directionSign: 1 } },
    parameters: { age: { label: "age in weeks", group: "Age", min: 0, max: 260, step: 1, precision: 0, member: "dirtLevel", convert: weeksToDirt } }
  });

  const ui = CjsGraph.getClassUIInfo(Ship);
  assert.equal(built, 2);
  assert.equal(CjsGraph.getClassUIInfo(Ship), ui, "built once");
  assert.deepEqual(ui.members.value, { group: "Ship", min: 0 });
  assert.deepEqual(ui.members.sun, { group: "Lighting", widget: "direction", directionSign: 1 });
  assert.equal(ui.settings.nameProperty, "name");
  assert.equal(ui.parameters.age.convert(26), 0.1);
  assert.equal(ui.parameters.age.member, "dirtLevel");

  assert.equal(Object.hasOwn(CjsGraph.get(new Ship(), { full: true }), "age"), false, "a parameter is not a value");
});
