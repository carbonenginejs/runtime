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

// --- lazy state, the settle, and the listener door ---------------------------

test("an unedited object carries no state at all", () =>
{
  const Fixture = declare({ n: { type: { kind: "int32" }, initial: 0 } });
  const thing = new Fixture();

  assert.equal(Object.hasOwn(thing, "__state"), false);
  thing.GetValues();
  thing.SetValues({});
  assert.equal(Object.hasOwn(thing, "__state"), false, "reads and no-op writes create nothing");
});

test("a write marks dirty and the settle clears it", () =>
{
  const Fixture = declare({ n: { type: { kind: "int32" }, initial: 0 } });
  const thing = new Fixture();

  thing.SetValues({ n: 1 });
  assert.equal(thing.IsDirty(), false, "the settle ran and converged");

  thing.SetValues({ n: 2 }, { skipUpdate: true });
  assert.equal(thing.IsDirty(), true, "skipUpdate leaves it dirty for a later settle");
});

test("OnModified receives the changed field names, additively", () =>
{
  const seen = [];
  const Fixture = declare({
    n: { type: { kind: "int32" }, initial: 0 },
    name: { type: { kind: "string" }, initial: "" }
  });
  Fixture.prototype.OnModified = function (options)
  {
    seen.push({ fields: [ ...options.changedFields ], source: options.source === this });
    return true;
  };

  new Fixture().SetValues({ n: 1, name: "x" });
  assert.deepEqual(seen, [ { fields: [ "n", "name" ], source: true } ]);
});

test("a positional OnModified override still sees the options object", () =>
{
  // The 34 overrides carrying a positional parameter get the bag, so gates
  // comparing it to a field name are false now and stay false.
  let received;
  const Fixture = declare({ n: { type: { kind: "int32" }, initial: 0 } });
  Fixture.prototype.OnModified = function (value) { received = value; return true; };

  new Fixture().SetValues({ n: 1 });
  assert.equal(typeof received, "object");
  assert.equal(received === "n", false, "a field-name gate does not fire");
});

test("OnModified returning false leaves the target dirty", () =>
{
  const Fixture = declare({ n: { type: { kind: "int32" }, initial: 0 } });
  Fixture.prototype.OnModified = function () { return false; };

  const thing = new Fixture();
  thing.SetValues({ n: 1 });
  assert.equal(thing.IsDirty(), true);
});

test("a settle that never converges throws rather than spinning", () =>
{
  const Fixture = declare({ n: { type: { kind: "int32" }, initial: 0 } });
  Fixture.prototype.OnModified = function () { this.MarkDirty(); return true; };

  assert.throws(() => new Fixture().SetValues({ n: 1 }), /settle passes/);
});

test("the settle is re-entrant-safe", () =>
{
  let depth = 0;
  let max = 0;
  const Fixture = declare({ n: { type: { kind: "int32" }, initial: 0 } });
  Fixture.prototype.OnModified = function ()
  {
    depth += 1;
    max = Math.max(max, depth);
    if (depth < 3) this.UpdateValues({});
    depth -= 1;
    return true;
  };

  new Fixture().SetValues({ n: 1 });
  assert.equal(max, 1, "a nested UpdateValues returns instead of recursing");
});

test("nothing is emitted without a listener, and the payload carries the fields", () =>
{
  const Fixture = declare({ n: { type: { kind: "int32" }, initial: 0 } });
  CjsSchema.compose.notify(Fixture, { kind: "class" });

  const thing = new Fixture();
  const heard = [];

  thing.SetValues({ n: 1 });
  assert.deepEqual(heard, [], "no listener, no emit");

  const listener = (obj, detail) => heard.push({ same: obj === thing, fields: [ ...detail.changedFields ] });
  thing.OnEvent("modified", listener);
  thing.SetValues({ n: 2 });
  assert.deepEqual(heard, [ { same: true, fields: [ "n" ] } ]);

  thing.OffEvent("modified", listener);
  heard.length = 0;
  thing.SetValues({ n: 3 });
  assert.deepEqual(heard, [], "the last listener leaving stops the emit again");
});

test("values without notify never calls EmitEvent", () =>
{
  const Fixture = declare({ n: { type: { kind: "int32" }, initial: 0 } });
  const thing = new Fixture();

  assert.equal(typeof thing.EmitEvent, "undefined");
  assert.doesNotThrow(() => thing.SetValues({ n: 1 }));
});

test("skipEvents suppresses the emit but not the settle", () =>
{
  const settled = [];
  const Fixture = declare({ n: { type: { kind: "int32" }, initial: 0 } });
  CjsSchema.compose.notify(Fixture, { kind: "class" });
  Fixture.prototype.OnModified = function () { settled.push(1); return true; };

  const thing = new Fixture();
  const heard = [];
  thing.OnEvent("modified", () => heard.push(1));
  thing.SetValues({ n: 1 }, { skipEvents: true });

  assert.equal(settled.length, 1, "the settle still ran");
  assert.deepEqual(heard, [], "the event did not");
});
