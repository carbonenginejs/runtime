import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema, type } from "#schema";


let serial = 0;

test("edit decorators record Blue flags without extra access permissions", () =>
{
  class Flags {}
  const expected = {
    read: { read: true }, write: { write: true },
    readwrite: { read: true, write: true }, notify: { notify: true },
    hidden: { hidden: true }, persist: { persist: true }, rpersist: { rpersist: true },
    persistOnly: { persist: true, persistOnly: true, hidden: true }
  };
  CjsSchema.define(Flags, {
    className: "BlueEditFlagsProbe",
    fields: Object.fromEntries(Object.keys(expected).map(name => [name, [type.int32, CjsSchema.blue[name]]]))
  });
  for (const [name, metadata] of Object.entries(expected))
  {
    assert.deepEqual(CjsSchema.getField(Flags, name).edit, metadata);
  }
});

test("enum chooser metadata exposes the Blue ENUM flag through inheritance", () =>
{
  class Base {}
  class Derived extends Base {}
  CjsSchema.define(Base, { className: "EditEnumBase", fields: {
    choice: [type.int32, type.enum({ First: 1, Second: 2 }), CjsSchema.blue.persist]
  } });
  CjsSchema.define(Derived, { className: "EditEnumDerived" });
  // ENUM is the enum record itself, not an edit bit.
  assert.deepEqual(CjsSchema.getField(Derived, "choice").edit, { persist: true });
  assert.notEqual(CjsSchema.getSchema(Derived).fields[0].enum, undefined);
  assert.ok(CjsSchema.getField(Derived, "choice").enum);
});

for (const route of ["composition", "schema"])
{
  test(`${route}: access and persistence flags retain independent meanings`, () =>
  {
    const Base = class {};
    class Record extends Base
    {
      stored = 0;
      legacy = 0;
      combined = 0;
      hidden = 0;
      computed = 7;
      writable = 0;
    }
    CjsSchema.define(Record, { className: `EditPersistenceProbe${serial++}`, fields: {
      stored: [type.int32, CjsSchema.blue.persist],
      legacy: [type.int32, CjsSchema.blue.read, CjsSchema.blue.rpersist],
      combined: [type.int32, CjsSchema.blue.persist, CjsSchema.blue.rpersist],
      hidden: [type.int32, CjsSchema.blue.persistOnly],
      computed: [type.int32, CjsSchema.blue.read],
      writable: [type.int32, CjsSchema.blue.write]
    } });
    if (route === "composition") CjsSchema.meta.values(Record, { kind: "class" });
    const object = new Record();
    CjsSchema.setValues(object, { stored: 1, legacy: 2, combined: 3, hidden: 4, computed: 99, writable: 5 });
    assert.equal(object.legacy, 2);
    assert.equal(object.computed, 7);
    assert.equal(object.writable, 5);
    const saved = CjsSchema.getValues(object, {}, { persistOnly: true });
    assert.deepEqual(saved, { stored: 1, combined: 3, hidden: 4 });
    // The existing unfiltered values view is not BluePyWrap property access.
    assert.equal(CjsSchema.getValues(object).legacy, 2);
    const copy = new Record();
    CjsSchema.setValues(copy, saved);
    assert.equal(copy.legacy, 0);
    assert.equal(copy.stored, 1);
  });
}
