// A registered class's member table is built once, at registration, and
// fixed after it: Carbon's ClassInfo -> BlueRttiType, built once and cached
// (blueexposure/BlueClasses.cpp:586-593).

import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema, meta, type } from "../../../src/blue/schema/index.js";
const be = CjsSchema.exposure;


test("lookups on a registered class return the one table registration built", () =>
{
  class Base {}
  CjsSchema.decorateField(Base, "count", be.mapAttribute(be.PERSIST), type.uint32);
  CjsSchema.define(Base, { name: "RegistrationBase" });

  class Derived extends Base {}
  CjsSchema.decorateField(Derived, "label", be.mapAttribute(be.PERSIST), type.string);
  CjsSchema.define(Derived, { name: "RegistrationDerived" });

  const first = CjsSchema.getField(Derived, "count");
  assert.equal(CjsSchema.getField(Derived, "count"), first, "no merge per call: the same record comes back");
  assert.deepEqual(CjsSchema.getSchema(Derived).fields.map(field => field.name), [ "count", "label" ], "base first");
});

test("adding a field to a registered class is an error, not an invalidation", () =>
{
  class Sealed { Late() {} }
  CjsSchema.decorateField(Sealed, "value", be.mapAttribute(be.PERSIST), type.float32);
  CjsSchema.define(Sealed, { name: "RegistrationSealed" });

  assert.throws(() => CjsSchema.decorateField(Sealed, "late", be.mapAttribute(be.PERSIST), type.float32), /after it registered/u);
  assert.throws(() => CjsSchema.defineField(Sealed, "value", "edit", { readonly: true }), /after it registered/u);
  CjsSchema.decorateMethod(Sealed, "Late", meta.noop);
  assert.ok(CjsSchema.getMethod(Sealed, "Late"), "method provenance is not flattened, so it may still arrive");
  assert.throws(() => CjsSchema.define(Sealed, { name: "RegistrationSealed" }), /already registered/u);
  assert.equal(CjsSchema.getField(Sealed, "late"), null);
});

test("a class registering below an unregistered base carries the base's fields", () =>
{
  class Root {}
  CjsSchema.decorateField(Root, "root", be.mapAttribute(be.PERSIST), type.uint32);
  CjsSchema.define(Root, { name: "RegistrationRoot" });

  class Middle extends Root {}
  CjsSchema.decorateField(Middle, "middle", be.mapAttribute(be.PERSIST), type.uint32);

  class Leaf extends Middle {}
  CjsSchema.decorateField(Leaf, "leaf", be.mapAttribute(be.PERSIST), type.uint32);
  CjsSchema.define(Leaf, { name: "RegistrationLeaf" });

  assert.deepEqual(CjsSchema.getSchema(Leaf).fields.map(field => field.name), [ "root", "middle", "leaf" ]);
  assert.ok(CjsSchema.getField(Leaf, "middle"));
});

test("hidden inherited fields are fixed at registration too", () =>
{
  class Visible {}
  CjsSchema.decorateField(Visible, "shown", be.mapAttribute(be.PERSIST), type.uint32);
  CjsSchema.decorateField(Visible, "hidden", be.mapAttribute(be.PERSIST), type.uint32);
  CjsSchema.define(Visible, { name: "RegistrationVisible" });

  class Hiding extends Visible {}
  CjsSchema.hideInherited([ "hidden" ])(Hiding);
  CjsSchema.define(Hiding, { name: "RegistrationHiding" });

  assert.equal(CjsSchema.getField(Hiding, "hidden"), null);
  assert.equal(CjsSchema.isFieldHidden(Hiding, "hidden"), true);
  assert.throws(() => CjsSchema.hideInherited([ "shown" ])(Hiding), /after it registered/u);
});
