// A registered class's member table is built once, at registration, and
// fixed after it: Carbon's ClassInfo -> BlueRttiType, built once and cached
// (blueexposure/BlueClasses.cpp:586-593).

import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema, meta } from "../../../src/global/schema/index.js";

test("lookups on a registered class return the one table registration built", () =>
{
  class Base {}
  CjsSchema.decorateField(Base, "count", meta.blue.persist, meta.type.uint32);
  CjsSchema.define(Base, { className: "RegistrationBase" });

  class Derived extends Base {}
  CjsSchema.decorateField(Derived, "label", meta.blue.persist, meta.type.string);
  CjsSchema.define(Derived, { className: "RegistrationDerived" });

  const first = CjsSchema.getField(Derived, "count");
  assert.equal(CjsSchema.getField(Derived, "count"), first, "no merge per call: the same record comes back");
  assert.deepEqual(CjsSchema.getSchema(Derived).fields.map(field => field.name), [ "count", "label" ], "base first");
});

test("adding a field to a registered class is an error, not an invalidation", () =>
{
  class Sealed { Late() {} }
  CjsSchema.decorateField(Sealed, "value", meta.blue.persist, meta.type.float32);
  CjsSchema.define(Sealed, { className: "RegistrationSealed" });

  assert.throws(() => CjsSchema.decorateField(Sealed, "late", meta.blue.persist, meta.type.float32), /after it registered/u);
  assert.throws(() => CjsSchema.defineField(Sealed, "value", "edit", { readonly: true }), /after it registered/u);
  CjsSchema.decorateMethod(Sealed, "Late", meta.noop);
  assert.ok(CjsSchema.getMethod(Sealed, "Late"), "method provenance is not flattened, so it may still arrive");
  assert.throws(() => CjsSchema.define(Sealed, { className: "RegistrationSealed" }), /already registered/u);
  assert.equal(CjsSchema.getField(Sealed, "late"), null);
});

test("a class registering below an unregistered base carries the base's fields", () =>
{
  class Root {}
  CjsSchema.decorateField(Root, "root", meta.blue.persist, meta.type.uint32);
  CjsSchema.define(Root, { className: "RegistrationRoot" });

  class Middle extends Root {}
  CjsSchema.decorateField(Middle, "middle", meta.blue.persist, meta.type.uint32);

  class Leaf extends Middle {}
  CjsSchema.decorateField(Leaf, "leaf", meta.blue.persist, meta.type.uint32);
  CjsSchema.define(Leaf, { className: "RegistrationLeaf" });

  assert.deepEqual(CjsSchema.getSchema(Leaf).fields.map(field => field.name), [ "root", "middle", "leaf" ]);
  assert.ok(CjsSchema.getField(Leaf, "middle"));
});

test("hidden inherited fields are fixed at registration too", () =>
{
  class Visible {}
  CjsSchema.decorateField(Visible, "shown", meta.blue.persist, meta.type.uint32);
  CjsSchema.decorateField(Visible, "hidden", meta.blue.persist, meta.type.uint32);
  CjsSchema.define(Visible, { className: "RegistrationVisible" });

  class Hiding extends Visible {}
  CjsSchema.hideInherited([ "hidden" ])(Hiding);
  CjsSchema.define(Hiding, { className: "RegistrationHiding" });

  assert.equal(CjsSchema.getField(Hiding, "hidden"), null);
  assert.equal(CjsSchema.isFieldHidden(Hiding, "hidden"), true);
  assert.throws(() => CjsSchema.hideInherited([ "shown" ])(Hiding), /after it registered/u);
});
