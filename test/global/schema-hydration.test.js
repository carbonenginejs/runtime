import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsSchema, type } from "#schema";
import { resolveHydrationAdapter } from "#schema/hydration";
import { YamlReader } from "../../src/global/blue/YamlReader.js";

// Declared classes without their own SetValues populate through the schema.
// The reader supplies ctx.declared from class registration; undeclared caller
// classes retain raw assignment.

let next = 0;

function declareBaseless(persist = false)
{
  const className = `HydrationFixture${next++}`;
  const Fixture = class
  {
    position = new Float32Array([ 0, 0, 0 ]);
    derived = "computed";
  };

  Object.defineProperty(Fixture, "name", { value: className });
  CjsSchema.defineField(Fixture, "position", "type", { kind: "vec3" });
  if (persist) CjsSchema.defineField(Fixture, "position", "edit", { persist: true, read: true, write: true });
  CjsSchema.defineField(Fixture, "derived", "type", { kind: "string" });
  CjsSchema.defineField(Fixture, "derived", "edit", { read: true });
  CjsSchema.define(Fixture, { className });
  return Fixture;
}

function declareParent(Child)
{
  const Parent = class
  {
    child = null;
    children = [];
    byName = new Map();
  };
  CjsSchema.decorateField(Parent, "child", type.rootRef(Child.name));
  CjsSchema.decorateField(Parent, "children", type.list({ kind: "rootRef", className: Child.name }));
  CjsSchema.decorateField(Parent, "byName", type.map(Child.name));
  CjsSchema.define(Parent, { className: `HydrationParent${next++}` });
  return Parent;
}

// What a raw Object.assign would have left behind instead.
function assertPopulatedThroughSchema(thing)
{
  assert.equal(thing.derived, "computed", "the writability gate refused a read-only field");
  assert.equal(thing.position instanceof Float32Array, true, "coerced into the declared vec3, not the raw array");
  assert.deepEqual(Array.from(thing.position), [ 1, 2, 3 ]);
}

test("a declared class with no SetValues populates through the schema", () =>
{
  const Fixture = declareBaseless();
  const thing = new Fixture();
  const before = thing.position;

  assert.equal(typeof thing.SetValues, "undefined");
  resolveHydrationAdapter().applyValues(thing, { position: [ 1, 2, 3 ], derived: "nope", stray: 1 }, { declared: true });

  assertPopulatedThroughSchema(thing);
  assert.equal(thing.position, before, "coerced in place, keeping the buffer");
  assert.equal(Object.hasOwn(thing, "stray"), false, "undeclared keys are not assigned");
});

test("a target the reader reports as undeclared keeps raw assignment", () =>
{
  const carrier = { _sourceClassName: "Unknown" };
  resolveHydrationAdapter().applyValues(carrier, { anything: [ 1, 2 ] }, {});
  assert.deepEqual(carrier, { _sourceClassName: "Unknown", anything: [ 1, 2 ] });
});

test("a class carrying SetValues is still called directly", () =>
{
  const Fixture = declareBaseless();
  const calls = [];
  Fixture.prototype.SetValues = function (values, options) { calls.push({ values, options }); };

  const options = { markDirty: false };
  resolveHydrationAdapter().applyValues(new Fixture(), { position: [ 1, 2, 3 ] }, { options, declared: true });
  assert.deepEqual(calls, [ { values: { position: [ 1, 2, 3 ] }, options } ]);
});

test("YamlReader uses persisted declarations without the hydration adapter", () =>
{
  const Fixture = declareBaseless(true);
  const root = new YamlReader().CreateObjectFromString(`type: ${CjsSchema.getClassName(Fixture)}\nposition: [1, 2, 3]\n`);
  assertPopulatedThroughSchema(root);
});

test("YamlReader requires a registered class instead of falling back to raw assignment", () =>
{
  assert.throws(() => new YamlReader().CreateObjectFromString("type: UnregisteredHydrationCaller\nlabel: kept\n"));
});

test("a declared reference field assigns a non-plain object as the reference", () =>
{
  const Child = declareBaseless();
  const Parent = declareParent(Child);
  const shared = new Child();
  const parent = new Parent();

  CjsSchema.setValues(parent, { child: shared, children: [ shared ], byName: new Map([ [ "a", shared ] ]) });

  assert.equal(parent.child, shared, "singular: the same instance, not a copy");
  assert.equal(parent.children[0], shared, "list items stay references");
  assert.equal(parent.byName.get("a"), shared, "Map values stay references, not flattened");
});

test("a plain bag in a reference field is imported by value, never aliased", () =>
{
  const Child = declareBaseless();
  const Parent = declareParent(Child);
  const bag = { note: "plain" };
  const parent = new Parent();

  CjsSchema.setValues(parent, { child: bag, children: [ bag ] });

  assert.notEqual(parent.child, bag, "a plain bag is data, so it is copied");
  assert.deepEqual(parent.child, bag);
  assert.notEqual(parent.children[0], bag);
});

test("a field that does not hold references copies a non-plain value", () =>
{
  const Child = declareBaseless();
  const Holder = class { payload = null; };
  CjsSchema.decorateField(Holder, "payload", type.unknown);
  CjsSchema.define(Holder, { className: `HydrationHolder${next++}` });

  const live = new Child();
  const holder = new Holder();
  CjsSchema.setValues(holder, { payload: live });

  assert.notEqual(holder.payload, live, "the declared type is not a reference, so nothing is aliased");
});
