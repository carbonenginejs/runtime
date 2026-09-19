import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "#schema";
import { CjsModel } from "#model";

const { edit, type } = CjsSchema;
let serial = 0;

test("edit decorators record Blue flags without extra access permissions", () =>
{
  class Flags {}
  const expected = {
    none: {}, read: { read: true }, write: { write: true },
    readwrite: { read: true, write: true }, notify: { notify: true },
    hidden: { hidden: true }, persist: { persist: true }, rpersist: { rpersist: true },
    flags: { flags: true }, enum: { enum: true },
    persistOnly: { persist: true, persistOnly: true, hidden: true }
  };
  CjsSchema.define(Flags, {
    className: "BlueEditFlagsProbe",
    fields: Object.fromEntries(Object.keys(expected).map(name => [name, [type.int32, edit[name]]]))
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
    choice: [type.int32, type.enum({ First: 1, Second: 2 }), edit.persist]
  } });
  CjsSchema.define(Derived, { className: "EditEnumDerived" });
  assert.deepEqual(CjsSchema.getField(Derived, "choice").edit, { persist: true, enum: true });
  assert.equal(CjsSchema.getSchema(Derived).fields[0].edit.enum, true);
  assert.ok(CjsSchema.getField(Derived, "choice").enum);
});

for (const route of ["model", "composition", "schema"])
{
  test(`${route}: access and persistence flags retain independent meanings`, () =>
  {
    const Base = route === "model" ? CjsModel : class {};
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
      stored: [type.int32, edit.persist],
      legacy: [type.int32, edit.read, edit.rpersist],
      combined: [type.int32, edit.persist, edit.rpersist],
      hidden: [type.int32, edit.persistOnly],
      computed: [type.int32, edit.read],
      writable: [type.int32, edit.write]
    } });
    if (route === "composition") CjsSchema.compose.values(Record, { kind: "class" });
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
