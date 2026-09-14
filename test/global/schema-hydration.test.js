import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsSchema } from "#schema";
import { resolveHydrationAdapter } from "#schema/hydration";

// The reader's default population. A class leaving the CjsModel base loses its
// SetValues, and must still populate through the schema rather than falling to
// the raw assignment that belongs to unregistered carriers.

let next = 0;

function declareBaseless()
{
  const className = `HydrationFixture${next++}`;
  const Fixture = class
  {
    position = new Float32Array([ 0, 0, 0 ]);
    derived = "computed";
  };

  Object.defineProperty(Fixture, "name", { value: className });
  CjsSchema.define(Fixture, { className });
  CjsSchema.defineField(Fixture, "position", "type", { kind: "vec3" });
  CjsSchema.defineField(Fixture, "derived", "type", { kind: "string" });
  CjsSchema.defineField(Fixture, "derived", "io", { read: true });
  return Fixture;
}

test("a registered class with no SetValues populates through the schema", () =>
{
  const Fixture = declareBaseless();
  const thing = new Fixture();
  const before = thing.position;

  assert.equal(typeof thing.SetValues, "undefined");
  resolveHydrationAdapter().applyValues(thing, { position: [ 1, 2, 3 ], derived: "nope", stray: 1 }, {});

  assert.equal(thing.position, before, "coerced in place, not replaced by the raw array");
  assert.deepEqual(Array.from(thing.position), [ 1, 2, 3 ]);
  assert.equal(thing.derived, "computed", "the writability gate refused a read-only field");
  assert.equal(Object.hasOwn(thing, "stray"), false, "undeclared keys are not assigned");
});

test("a base-less reference field aliases the live instance, singly and in a list", () =>
{
  const Child = declareBaseless();
  const Parent = class
  {
    child = null;
    children = [];
  };
  const parentName = `HydrationParent${next++}`;
  CjsSchema.define(Parent, { className: parentName });
  CjsSchema.decorateField(Parent, "child", CjsSchema.type.model(Child.name));
  CjsSchema.decorateField(Parent, "children", CjsSchema.type.list({ kind: "model", className: Child.name }));

  const shared = new Child();
  const parent = new Parent();
  resolveHydrationAdapter().applyValues(parent, { child: shared, children: [ shared ] }, {});

  assert.equal(parent.child, shared, "the same instance, not a copy");
  assert.equal(parent.children[0], shared, "list items alias too");
});

test("an unregistered carrier keeps raw assignment", () =>
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
  resolveHydrationAdapter().applyValues(new Fixture(), { position: [ 1, 2, 3 ] }, { options });
  assert.deepEqual(calls, [ { values: { position: [ 1, 2, 3 ] }, options } ]);
});
