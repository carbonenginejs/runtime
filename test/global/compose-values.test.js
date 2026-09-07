import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsSchema } from "#schema";
import { isWritableField } from "../../src/global/compose/values.js";

// The state-free transport: coercion, the writability gate and a changed set.
// The dirty flag, the settle, the modified event and child mutation are the
// EDITING contract and deliberately absent - a reader wants exactly this much.

let next = 0;

function declare(fields, { compose = true } = {})
{
  const className = `ComposeValuesFixture${next++}`;
  const Fixture = class
  {
    constructor()
    {
      for (const [ name, spec ] of Object.entries(fields)) this[name] = spec.initial;
    }
  };

  Object.defineProperty(Fixture, "name", { value: className });
  CjsSchema.define(Fixture, { className });

  for (const [ name, spec ] of Object.entries(fields))
  {
    CjsSchema.defineField(Fixture, name, "type", spec.type);
    if (spec.io) CjsSchema.defineField(Fixture, name, "io", spec.io);
  }

  if (compose) CjsSchema.compose.values(Fixture, { kind: "class" });
  return Fixture;
}

test("installs GetValues and SetValues on a class with no model base", () =>
{
  const Fixture = declare({ name: { type: { kind: "string" }, initial: "" } });
  const thing = new Fixture();

  assert.equal(typeof thing.GetValues, "function");
  assert.equal(typeof thing.SetValues, "function");
  thing.SetValues({ name: "hull" });
  assert.deepEqual(thing.GetValues(), { name: "hull" });
});

test("SetValues returns the changed field names, and nothing on a rerun", () =>
{
  const Fixture = declare({
    name: { type: { kind: "string" }, initial: "" },
    count: { type: { kind: "int32" }, initial: 0 }
  });
  const thing = new Fixture();

  assert.deepEqual([ ...thing.SetValues({ name: "hull", count: 3 }) ], [ "name", "count" ]);
  assert.deepEqual([ ...thing.SetValues({ name: "hull", count: 3 }) ], []);
  assert.deepEqual([ ...thing.SetValues({ count: 4 }) ], [ "count" ]);
});

test("returnBoolean gives Carbon's did-it-change answer", () =>
{
  const Fixture = declare({ name: { type: { kind: "string" }, initial: "" } });
  const thing = new Fixture();

  assert.equal(thing.SetValues({ name: "hull" }, { returnBoolean: true }), true);
  assert.equal(thing.SetValues({ name: "hull" }, { returnBoolean: true }), false);
});

test("a read-only field is refused, a persisted one is not", () =>
{
  const Fixture = declare({
    derived: { type: { kind: "string" }, io: { read: true }, initial: "computed" },
    stored: { type: { kind: "string" }, io: { read: true, persist: true }, initial: "" }
  });
  const thing = new Fixture();

  const changed = thing.SetValues({ derived: "nope", stored: "yes" });
  assert.equal(thing.derived, "computed", "read-only without persist is never populated");
  assert.equal(thing.stored, "yes", "Carbon's routine READ|PERSIST field populates");
  assert.deepEqual([ ...changed ], [ "stored" ]);
});

test("isWritableField matches the model path's rule exactly", () =>
{
  assert.equal(isWritableField({ }), true, "no io metadata is writable");
  assert.equal(isWritableField({ io: { write: true } }), true);
  assert.equal(isWritableField({ io: { persist: true } }), true);
  assert.equal(isWritableField({ io: { persistOnly: true } }), true);
  assert.equal(isWritableField({ io: { read: true } }), false);
  assert.equal(isWritableField({ io: { read: true, write: true } }), true);
});

test("a math field is coerced IN PLACE, keeping its identity", () =>
{
  const Fixture = declare({
    position: { type: { kind: "vec3" }, initial: new Float32Array([ 0, 0, 0 ]) }
  });
  const thing = new Fixture();
  const before = thing.position;

  thing.SetValues({ position: [ 1, 2, 3 ] });

  assert.equal(thing.position, before, "the same buffer, so live references stay live");
  assert.deepEqual(Array.from(thing.position), [ 1, 2, 3 ]);
});

test("a math field of the wrong length is refused, not padded", () =>
{
  const Fixture = declare({
    position: { type: { kind: "vec3" }, initial: new Float32Array([ 0, 0, 0 ]) }
  });
  const thing = new Fixture();

  assert.throws(() => thing.SetValues({ position: [ 1, 2 ] }), { code: "CJS_MATH_LENGTH_MISMATCH" });
});

test("a field absent from the bag is left alone", () =>
{
  const Fixture = declare({
    name: { type: { kind: "string" }, initial: "keep" },
    count: { type: { kind: "int32" }, initial: 5 }
  });
  const thing = new Fixture();

  thing.SetValues({ count: 6 });
  assert.equal(thing.name, "keep");
});

test("persistOnly filters the export", () =>
{
  const Fixture = declare({
    stored: { type: { kind: "string" }, io: { persist: true }, initial: "a" },
    transient: { type: { kind: "string" }, initial: "b" }
  });
  const thing = new Fixture();

  assert.deepEqual(thing.GetValues(), { stored: "a", transient: "b" });
  assert.deepEqual(thing.GetValues({ persistOnly: true }), { stored: "a" });
});

test("install-if-absent: a hand-rolled SetValues keeps its own", () =>
{
  const Fixture = declare({ name: { type: { kind: "string" }, initial: "" } }, { compose: false });
  Fixture.prototype.SetValues = function () { return "mine"; };
  CjsSchema.compose.values(Fixture, { kind: "class" });

  assert.equal(new Fixture().SetValues({}), "mine");
  assert.equal(typeof new Fixture().GetValues, "function", "the absent half still installs");
});

test("the statics answer for a class carrying neither method", () =>
{
  const Fixture = declare({ n: { type: { kind: "int32" }, initial: 0 } }, { compose: false });
  const thing = new Fixture();

  assert.equal(typeof thing.SetValues, "undefined");
  assert.deepEqual([ ...CjsSchema.setValues(thing, { n: 7 }) ], [ "n" ]);
  assert.equal(thing.n, 7);
  assert.deepEqual(CjsSchema.getValues(thing), { n: 7 });
});

test("the decorator refuses a non-class", () =>
{
  assert.throws(() => CjsSchema.compose.values({}, { kind: "class" }), TypeError);
  assert.throws(() => CjsSchema.compose.values(() => {}, { kind: "method" }), TypeError);
});
