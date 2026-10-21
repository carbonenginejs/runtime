// blue.property / meta.property: Carbon's MAP_PROPERTY, MAP_PROPERTY_READONLY
// and MAP_PROPERTY_PERSISTED (blueexposure/include/BlueExposureMacrosPython.h:182-230).
// A VarEntry with no storage, the getter and setter, and flags fixed by the
// macro: READWRITE, READ, READWRITE | PERSIST. Decision 2026-10-18.
import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema, meta, type, blue as legacyBlue } from "../../src/global/schema/index.js";
import { blue } from "../../src/global/blue/index.js";
import { DictReader } from "../../src/global/blue/DictReader.js";
import { INotify } from "../../src/global/blue/INotify.js";
import { DictWriter } from "../../src/global/blue/DictWriter.js";
import { CjsBlackReader } from "../../src/resource/formats/black/core/CjsBlackReader.js";
import { CjsGraphFormat } from "../../src/resource/formats/graph/index.js";
import { YamlReader } from "../../src/global/blue/YamlReader.js";

/** BlueTypes.h EDITFLAGS: READ 0x1, WRITE 0x2, PERSIST 0x10. */
const READ = 0x1, WRITE = 0x2, PERSIST = 0x10;

class PropertyLeaf
{
  value = 0;
}
legacyBlue.interface()(PropertyLeaf);
CjsSchema.define(PropertyLeaf, { className: "SchemaPropertyLeaf", members: [
  { name: "value", key: "value", type: { kind: "int32" }, edit: { read: true, write: true, persist: true } }
] });

/** The shape the ruling gives: Carbon's Get/Set methods, and accessors that only call them. */
class PropertyProbe
{
  _target = null;
  _scale = 1;
  _count = 3;
  calls = [];

  GetTarget() { this.calls.push("GetTarget"); return this._target; }
  SetTarget(target) { this.calls.push("SetTarget"); this._target = target; }
  GetScale() { this.calls.push("GetScale"); return this._scale; }
  SetScale(scale) { this.calls.push("SetScale"); this._scale = scale; }
  GetCount() { this.calls.push("GetCount"); return this._count; }

  get target() { return this.GetTarget(); }
  set target(value) { this.SetTarget(value); }
  get scale() { return this.GetScale(); }
  set scale(value) { this.SetScale(value); }
  get count() { return this.GetCount(); }
}
CjsSchema.define(PropertyProbe, { className: "SchemaPropertyProbe", fields: {
  target: [ legacyBlue.property(undefined, { persisted: true }), type.rootRef("SchemaPropertyLeaf") ],
  scale: [ legacyBlue.property(), type.float32 ],
  count: [ meta.property("itemCount"), type.uint32 ]
} });

const property = name => CjsSchema.getSchema(PropertyProbe).properties.find(entry => entry.name === name);

test("flags are derived: a pair is READWRITE, a getter alone READ, persisted adds PERSIST", () =>
{
  assert.deepEqual(property("target").edit, { read: true, write: true, persist: true });
  assert.deepEqual(property("scale").edit, { read: true, write: true });
  assert.deepEqual(property("itemCount").edit, { read: true });
  assert.equal(property("itemCount").key, "count", "the exposed name defaults to the key and can differ");

  const [ , , members ] = blue.classes.GetTypeInfo(new PropertyProbe());
  assert.equal(members.target.editflags, READ | WRITE | PERSIST);
  assert.equal(members.scale.editflags, READ | WRITE);
  assert.equal(members.itemCount.editflags, READ);
  assert.equal(members.target.iid_name, "SchemaPropertyLeaf");
  assert.equal(members.count, undefined);
});

test("the schema records the getter and setter, and blue stamps the row as Carbon's", () =>
{
  const descriptor = Object.getOwnPropertyDescriptor(PropertyProbe.prototype, "scale");
  assert.equal(property("scale").role, "property");
  assert.equal(property("scale").property.getter, descriptor.get);
  assert.equal(property("scale").property.setter, descriptor.set);
  assert.equal(property("itemCount").property.setter, null);
  assert.equal(property("scale").carbon.member, true);
  assert.equal(property("itemCount").carbon, undefined, "meta.property is ours");
  assert.match(blue.classes.GetPersistedClassesReport(), /SchemaPropertyProbe:\n- {3}target:/);
});

test("values read and write a persisted property through its accessors and skip the others", () =>
{
  const probe = new PropertyProbe();
  probe._target = new PropertyLeaf();
  probe._target.value = 4;
  assert.deepEqual(new DictWriter().WriteObject(probe, {}), { target: { value: 4 } });
  assert.ok(probe.calls.includes("GetTarget"));
  assert.ok(!probe.calls.includes("GetScale") && !probe.calls.includes("GetCount"));

  const fresh = new PropertyProbe();
  new DictReader().ReadInto(fresh, { target: { _type: "SchemaPropertyLeaf", value: 9 } });
  assert.equal(fresh._target.value, 9);
  assert.ok(fresh.calls.includes("SetTarget"));

  // DictReader::FindEntry matches a property only on PERSIST (DictReader.cpp:706).
  assert.throws(() => new DictReader().ReadInto(fresh, { scale: 2 }), /Invalid attribute/);
  assert.throws(() => new DictReader().ReadInto(fresh, { itemCount: 2 }), /Invalid attribute/);
  assert.equal(fresh._scale, 1);
});

test("Black reads a persisted property through its setter", () =>
{
  const fixture = new BlackFixture();
  const leaf = fixture.Object(2, "SchemaPropertyLeaf", [ [ "value", i32(7) ] ]);
  const bytes = fixture.Finish(fixture.Object(1, "SchemaPropertyProbe", [ [ "target", leaf ] ]));
  const probe = new CjsBlackReader(bytes, { schema: null }).CreateObject();
  assert.ok(probe instanceof PropertyProbe);
  assert.equal(probe._target.value, 7);
  assert.ok(probe.calls.includes("SetTarget"));

  const scale = new BlackFixture();
  const unpersisted = scale.Finish(scale.Object(1, "SchemaPropertyProbe", [ [ "scale", f32(2) ] ]));
  assert.throws(() => new CjsBlackReader(unpersisted, { schema: null }).CreateObject(), /scale/);
});

test("Red reads a persisted property through its setter", () =>
{
  const red = "type: SchemaPropertyProbe\ntarget:\n  type: SchemaPropertyLeaf\n  value: 5\n";
  const probe = new YamlReader().CreateObjectFromString(red);
  assert.ok(probe instanceof PropertyProbe);
  assert.equal(probe._target.value, 5);
  assert.ok(probe.calls.includes("SetTarget"));
});

test("graph round-trips only the persisted property, through its accessors", () =>
{
  const probe = new PropertyProbe();
  probe._target = new PropertyLeaf();
  probe._target.value = 6;
  probe._scale = 3;
  const bytes = CjsGraphFormat.write(probe);
  const wire = JSON.parse(new TextDecoder().decode(bytes)).root;
  assert.deepEqual(Object.keys(wire).sort(), [ "_type", "target" ]);
  const result = CjsGraphFormat.read(bytes, { emit: "runtime" });
  assert.deepEqual(result.reports, []);
  assert.equal(result.root._target.value, 6);
  assert.equal(result.root._scale, 1);
  assert.ok(result.root.calls.includes("SetTarget"));
});

test("a property is declared on a getter, takes only persisted, and has no index", () =>
{
  const context = kind => ({ kind, name: "value", metadata: {}, addInitializer() {} });
  assert.throws(() => legacyBlue.property()(undefined, context("field")), /decorates a getter/);
  assert.throws(() => meta.property()(undefined, context("method")), /decorates a getter/);
  assert.throws(() => meta.property()(undefined, context("setter")), /decorates a getter/);
  assert.throws(() => legacyBlue.property(undefined, { notify: true }), /only \{ persisted \}/);
  assert.throws(() => legacyBlue.property(undefined, { persisted: 1 }), /boolean/);

  class GetterOnly { get value() { return 1; } }
  assert.throws(() => CjsSchema.define(GetterOnly, { className: "SchemaPropertyGetterOnly",
    fields: { value: [ legacyBlue.property(undefined, { persisted: true }), type.int32 ] } }), /takes a setter/);
  class Field { value = 1; }
  assert.throws(() => CjsSchema.define(Field, { className: "SchemaPropertyField",
    fields: { value: [ legacyBlue.property(), type.int32 ] } }), /needs a getter/);
});

test("separate flag decorators on a property are refused, in either decorator order", () =>
{
  const context = (kind, metadata) => ({ kind, name: "value", metadata, addInitializer() {} });
  for (const flag of [ "read", "write", "readwrite", "notify", "hidden", "persist", "rpersist", "persistOnly" ])
  {
    // A flag after the property (decorators apply bottom-up, so it sits above it).
    const declared = {};
    legacyBlue.property()(undefined, context("getter", declared));
    assert.throws(() => legacyBlue[flag](undefined, context("getter", declared)), /flags are derived/, "blue." + flag);
    assert.throws(() => meta[flag](undefined, context("setter", declared)), /flags are derived/, "meta." + flag + " on the setter");

    // A flag before the property.
    const flagged = {};
    legacyBlue[flag](undefined, context("getter", flagged));
    assert.throws(() => meta.property()(undefined, context("getter", flagged)), /flags are derived/, "property over " + flag);
  }

  class Legacy { get value() { return 1; } set value(_) {} }
  assert.throws(() => CjsSchema.define(Legacy, { className: "SchemaPropertyLegacyFlags",
    fields: { value: [ legacyBlue.property(), legacyBlue.readwrite, type.int32 ] } }), /flags are derived/);
  class Explicit { get value() { return 1; } set value(_) {} }
  assert.throws(() => CjsSchema.define(Explicit, { className: "SchemaPropertyExplicitFlags",
    properties: [ { name: "value", key: "value", type: { kind: "int32" }, edit: { read: true }, property: { persisted: false } } ] }),
  /flags are derived/);
});

test("an accessor with a type but no declaration is refused", () =>
{
  class Undeclared { get value() { return 1; } }
  assert.throws(() => CjsSchema.define(Undeclared, { className: "SchemaPropertyUndeclared",
    fields: { value: type.int32 } }), /declare it with blue.property or meta.property/);
});

// An attribute written as a path accessor: Tr2SkinnedObject_Blue.cpp:49-51 maps
// MAP_ATTRIBUTE("highDetailModel", m_lod.m_highDetailProxy, READWRITE | PERSIST | NOTIFY),
// an offset into the embedded m_lod (Tr2SkinnedObject.h:218). It keeps its own flags,
// NOTIFY included, and every reader and writer goes through the accessors.
class AttributeLod { highDetailProxy = null; }
class AttributeOwner
{
  lod = new AttributeLod();
  modified = [];
  get highDetailModel() { return this.lod.highDetailProxy; }
  set highDetailModel(value) { this.lod.highDetailProxy = value; }
  OnModified(name) { this.modified.push(name); return true; }
}
CjsSchema.define(AttributeOwner, { className: "SchemaAttributeAccessorOwner", fields: {
  highDetailModel: [ legacyBlue.notify, legacyBlue.readwrite, legacyBlue.persist, type.rootRef("SchemaPropertyLeaf") ]
} });
CjsSchema.blue.interface(INotify)(AttributeOwner);

test("an attribute over an accessor path keeps its flags and is read and written through the accessor", () =>
{
  const declaration = CjsSchema.getSchema(AttributeOwner).properties.find(entry => entry.name === "highDetailModel");
  assert.equal(declaration.property, undefined, "an attribute, not a property");
  assert.deepEqual(declaration.edit, { notify: true, read: true, write: true, persist: true });
  const [ , , members ] = blue.classes.GetTypeInfo(new AttributeOwner());
  assert.equal(members.highDetailModel.editflags, 0x1 | 0x2 | 0x4 | 0x10);

  // Values: written and read through the accessor, NOTIFY reaches OnModified.
  const owner = new AttributeOwner();
  owner.highDetailModel = new PropertyLeaf();
  owner.highDetailModel.value = 2;
  assert.deepEqual(new DictWriter().WriteObject(owner, {}, { persistOnly: true }), { highDetailModel: { value: 2 } });
  const read = new AttributeOwner();
  new DictReader().ReadInto(read, { highDetailModel: { _type: "SchemaPropertyLeaf", value: 3 } }, read);
  assert.equal(read.lod.highDetailProxy.value, 3);
  assert.deepEqual(read.modified, [ "highDetailModel" ]);

  // Black: through the setter, then NOTIFY (no IInitialize, BlackReader.cpp ReadMembers).
  const fixture = new BlackFixture();
  const leaf = fixture.Object(2, "SchemaPropertyLeaf", [ [ "value", i32(4) ] ]);
  const bytes = fixture.Finish(fixture.Object(1, "SchemaAttributeAccessorOwner", [ [ "highDetailModel", leaf ] ]));
  const black = new CjsBlackReader(bytes, { schema: null }).CreateObject();
  assert.equal(black.lod.highDetailProxy.value, 4);
  assert.deepEqual(black.modified, [ "highDetailModel" ]);

  // Red.
  const red = new YamlReader().CreateObjectFromString("type: SchemaAttributeAccessorOwner\nhighDetailModel:\n  type: SchemaPropertyLeaf\n  value: 5\n");
  assert.equal(red.lod.highDetailProxy.value, 5);

  // Graph round trip.
  const result = CjsGraphFormat.read(CjsGraphFormat.write(owner), { emit: "runtime" });
  assert.deepEqual(result.reports, []);
  assert.equal(result.root.lod.highDetailProxy.value, 2);

  // Copier: a member of non-zero size in Carbon, so it is copied (Copier.cpp:163-187).
  const copy = new AttributeOwner();
  assert.equal(blue.classes.CopyTo(owner, copy), copy);
  assert.equal(copy.lod.highDetailProxy.value, 2);
  assert.notEqual(copy.lod.highDetailProxy, owner.lod.highDetailProxy);
});

/** Minimal Black writer for one object graph (BlackReader.cpp string tables and object records). */
class BlackFixture
{
  strings = [];
  String(value)
  {
    let index = this.strings.indexOf(value);
    if (index === -1) { index = this.strings.length; this.strings.push(value); }
    return u16(index);
  }
  Object(id, kind, fields = [])
  {
    const parts = [ this.String(kind) ];
    for (const [ name, value ] of fields) parts.push(concat([ this.String(name), value ]));
    const body = concat(parts);
    return concat([ u32(id), u32(body.length), body ]);
  }
  Finish(root)
  {
    const narrow = [ u16(this.strings.length) ];
    for (const value of this.strings) narrow.push(concat([ new TextEncoder().encode(value), new Uint8Array(1) ]));
    const strings = concat(narrow), wide = u16(0);
    return concat([ u32(0xb1acf11e), u32(1), u32(strings.length), strings, u32(wide.length), wide, root ]);
  }
}

function concat(parts)
{
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}
function u16(value) { const bytes = new Uint8Array(2); new DataView(bytes.buffer).setUint16(0, value, true); return bytes; }
function u32(value) { const bytes = new Uint8Array(4); new DataView(bytes.buffer).setUint32(0, value, true); return bytes; }
function i32(value) { const bytes = new Uint8Array(4); new DataView(bytes.buffer).setInt32(0, value, true); return bytes; }
function f32(value) { const bytes = new Uint8Array(4); new DataView(bytes.buffer).setFloat32(0, value, true); return bytes; }
