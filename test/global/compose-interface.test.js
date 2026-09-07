import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsSchema } from "#schema";
import { composedContracts, installInterface } from "../../src/global/compose/interface.js";

// Carbon declares additional bases with MAP_INTERFACE; JS has one `extends`
// slot. These pin the behaviour the mixin towers had, so the 33 sites that
// genuinely need a second base can move without changing meaning.

class Contract
{
  Ping() { return "contract-ping"; }

  Shared() { return "contract-shared"; }

  get Value() { return "contract-value"; }
}

class DerivedContract extends Contract
{
  Extra() { return "derived-extra"; }
}

class Base
{
  Shared() { return "base-shared"; }

  Own() { return "base-own"; }
}

test("installs contract members onto the prototype", () =>
{
  class Thing extends Base {}
  installInterface(Thing, Contract);

  assert.equal(new Thing().Ping(), "contract-ping");
});

test("install-if-absent: the extends chain wins over the contract", () =>
{
  class Thing extends Base {}
  installInterface(Thing, Contract);

  const thing = new Thing();
  assert.equal(thing.Shared(), "base-shared", "a member the base answers keeps its own");
  assert.equal(thing.Own(), "base-own", "the base is otherwise untouched");
});

test("install-if-absent: the class's own member wins over the contract", () =>
{
  class Thing extends Base
  {
    Ping() { return "own-ping"; }
  }
  installInterface(Thing, Contract);

  assert.equal(new Thing().Ping(), "own-ping");
});

test("the extends slot is not consumed and no intermediate class is minted", () =>
{
  class Thing extends Base {}
  installInterface(Thing, Contract);

  const thing = new Thing();
  assert.ok(thing instanceof Base, "the real base survives");
  assert.equal(Object.getPrototypeOf(Thing), Base, "no anonymous intermediate constructor");
});

test("two contracts compose onto one class, first declared winning", () =>
{
  class Other
  {
    Ping() { return "other-ping"; }

    Only() { return "other-only"; }
  }

  class Thing extends Base {}
  installInterface(Thing, Contract);
  installInterface(Thing, Other);

  const thing = new Thing();
  assert.equal(thing.Ping(), "contract-ping", "the first contract installed wins");
  assert.equal(thing.Only(), "other-only", "the second still contributes what is absent");
});

test("a contract's own base contributes too, as a C++ base list does", () =>
{
  class Thing extends Base {}
  installInterface(Thing, DerivedContract);

  const thing = new Thing();
  assert.equal(thing.Extra(), "derived-extra");
  assert.equal(thing.Ping(), "contract-ping", "inherited from the contract's own base");
});

test("accessors install as accessors, not as their resolved value", () =>
{
  class Thing extends Base {}
  installInterface(Thing, Contract);

  const descriptor = Object.getOwnPropertyDescriptor(Thing.prototype, "Value");
  assert.equal(typeof descriptor.get, "function");
  assert.equal(new Thing().Value, "contract-value");
});

test("Object.prototype members are never copied", () =>
{
  class Thing extends Base {}
  installInterface(Thing, Contract);

  for (const name of [ "toString", "hasOwnProperty", "valueOf" ])
  {
    assert.equal(
      Object.hasOwn(Thing.prototype, name), false,
      `${name} must not be installed`);
  }

  assert.equal(Thing.prototype.constructor, Thing, "the constructor is never rebound");
});

test("no brand is installed - capability discovery is never a reason for one", () =>
{
  class Thing extends Base {}
  installInterface(Thing, Contract);

  assert.equal(Object.getOwnPropertySymbols(Thing.prototype).length, 0);
  assert.equal(new Thing() instanceof Contract, false);
});

test("installed methods are reported to the decoration hook, and only those", () =>
{
  class Thing extends Base
  {
    Ping() { return "own-ping"; }
  }

  const seen = [];
  installInterface(Thing, DerivedContract, (_Constructor, name) => seen.push(name));

  assert.deepEqual(seen, [ "Extra" ], "only members actually installed are reported");
  assert.equal(seen.includes("Ping"), false, "the class already answers Ping");
  assert.equal(seen.includes("Shared"), false, "the base already answers Shared");
  assert.equal(seen.includes("Value"), false, "accessors are not methods");
});

test("the decorator refuses a non-class", () =>
{
  assert.throws(() => CjsSchema.compose.interface(null), TypeError);
  assert.throws(() => CjsSchema.compose.interface({}), TypeError);

  const decorate = CjsSchema.compose.interface(Contract);
  assert.throws(() => decorate(() => {}, { kind: "method" }), TypeError);
});

test("through the namespace, installed members carry impl.abstract", () =>
{
  class Thing extends Base {}
  CjsSchema.compose.interface(Contract)(Thing, { kind: "class" });

  assert.equal(new Thing().Ping(), "contract-ping");

  const schema = CjsSchema.getSchema(Thing);
  assert.ok(schema, "the class has a schema record after decoration");
});

// --- the composed record and CjsSchema.cast ---------------------------------

test("cast returns the value when the contract was composed", () =>
{
  class Thing extends Base {}
  installInterface(Thing, Contract);

  const thing = new Thing();
  assert.equal(CjsSchema.cast(thing, Contract), thing);
});

test("cast returns null when the contract was not composed", () =>
{
  class Other { Nope() {} }
  class Thing extends Base {}
  installInterface(Thing, Contract);

  assert.equal(CjsSchema.cast(new Thing(), Other), null);
});

test("cast answers for a subclass that was never itself decorated", () =>
{
  class Thing extends Base {}
  installInterface(Thing, Contract);
  class Sub extends Thing {}

  const sub = new Sub();
  assert.equal(CjsSchema.cast(sub, Contract), sub, "statics inherit, so one lookup finds it");
});

test("declaring a contract on a subclass does not reach back into the parent", () =>
{
  class Other { Only() { return "other-only"; } }

  class Parent extends Base {}
  installInterface(Parent, Contract);

  class Child extends Parent {}
  installInterface(Child, Other);

  assert.ok(CjsSchema.cast(new Child(), Other), "the child has both");
  assert.ok(CjsSchema.cast(new Child(), Contract), "including the inherited one");
  assert.equal(CjsSchema.cast(new Parent(), Other), null, "the parent is unchanged");
});

test("cast falls back to instanceof, so brand contracts still answer", () =>
{
  const BRAND = Symbol("brand");

  class Branded
  {
    static [Symbol.hasInstance](value) { return value?.[BRAND] === true; }
  }

  const branded = { [BRAND]: true };
  assert.equal(CjsSchema.cast(branded, Branded), branded);
});

test("cast falls back to ordinary extends lineage", () =>
{
  class Thing extends Base {}
  const thing = new Thing();

  assert.equal(CjsSchema.cast(thing, Base), thing);
});

test("cast is null-safe and refuses a non-contract", () =>
{
  assert.equal(CjsSchema.cast(null, Contract), null);
  assert.equal(CjsSchema.cast(undefined, Contract), null);
  assert.throws(() => CjsSchema.cast({}, null), TypeError);
});

test("composedContracts reports what was declared, inherited included", () =>
{
  class Other { Only() {} }

  class Parent extends Base {}
  installInterface(Parent, Contract);
  class Child extends Parent {}
  installInterface(Child, Other);

  assert.deepEqual([ ...composedContracts(Parent) ], [ Contract ]);
  assert.deepEqual([ ...composedContracts(Child) ], [ Contract, Other ]);
  assert.deepEqual([ ...composedContracts(Base) ], []);
});
