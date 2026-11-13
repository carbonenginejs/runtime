import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsGraph, CjsGraphRoot, CjsGraphState } from "../../src/global/model/graph/index.js";

test("graph teardown runs three owning levels once with members and arguments intact", () =>
{
  const calls = [], argument = new Set();
  class Base extends CjsGraphRoot
  {
    values = [ 1, 2 ];
    OnDestruct(value) { calls.push([ "base", this.values.length, value ]); }
  }
  class Middle extends Base
  {
    OnDestruct(value) { calls.push([ "middle", this.values.length, value ]); }
  }
  class Derived extends Middle
  {
    OnDestruct(value) { calls.push([ "derived", this.values.length, value ]); }
  }
  CjsGraph.define(Base, { name: "DestructBase", onDestruct: Base.prototype.OnDestruct });
  CjsGraph.define(Middle, { name: "DestructMiddle", bases: [ Base ], onDestruct: Middle.prototype.OnDestruct });
  CjsGraph.define(Derived, { name: "DestructDerived", bases: [ Middle ], onDestruct: Derived.prototype.OnDestruct });
  const object = new Derived();
  object.Destruct(argument);
  assert.deepEqual(calls, [ [ "derived", 2, argument ], [ "middle", 2, argument ], [ "base", 2, argument ] ]);
  assert.deepEqual(object.values, [ 1, 2 ]);
  assert.equal(object.__cjs, null, "dispatch adds no destruction-state policy");
  assert.equal(object.IsDestructed(), false);
});

test("a root has no state until the graph is asked, and IsDestructed reads it without creating one", () =>
{
  class Rooted extends CjsGraphRoot {}
  CjsGraph.define(Rooted, { name: "DestructStateRooted" });
  const object = new Rooted();
  assert.equal(Object.hasOwn(object, "__cjs"), true);
  assert.equal(object.__cjs, null);
  assert.equal(object.IsDestructed(), false);
  assert.equal(object.__cjs, null);

  const state = CjsGraph.getState(object);
  assert.equal(state.constructor, CjsGraphState);
  assert.equal(object.__cjs, state);
  assert.equal(CjsGraph.getState(object), state, "one state per object");
  assert.deepEqual({ ...state }, { state: CjsGraphState.State.ALIVE, prepared: false, guid: 0 });
  assert.deepEqual(CjsGraphState.State, { ALIVE: 0, DESTRUCTING: 1, DESTRUCTED: 2 });
  assert.equal(object.IsDestructed(), false);

  state.prepared = true;
  assert.equal(object.IsDestructed(), false, "prepared is apart from the state");
  state.state = CjsGraphState.State.DESTRUCTING;
  assert.equal(object.IsDestructed(), true);
  state.state = CjsGraphState.State.DESTRUCTED;
  assert.equal(object.IsDestructed(), true);
});

test("the runner calls each level's destructor once, derived first, and no OnDestruct", () =>
{
  const calls = [];
  class A {} class B {} class C {} class D extends CjsGraphRoot {}
  CjsGraph.define(A, { name: "RunnerA", destructor(...args) { calls.push([ "~A", this.constructor, args.length ]); } });
  CjsGraph.define(B, { name: "RunnerB", bases: [ A ], onDestruct() { calls.push("B.OnDestruct"); } });
  CjsGraph.define(C, { name: "RunnerC", bases: [ A ], destructor() { calls.push("~C"); }, onDestruct() { calls.push("C.OnDestruct"); } });
  CjsGraph.define(D, { name: "RunnerD", bases: [ B, C ], destructor() { calls.push("~D"); } });

  const object = new D();
  CjsGraph.finalDelete(object);
  assert.deepEqual(calls, [ "~D", "~C", [ "~A", D, 0 ] ]);
  assert.equal(object.__cjs, null, "the runner creates and sets no state");
  assert.equal(object.IsDestructed(), false);

  CjsGraph.finalDelete(object);
  assert.equal(calls.length, 6, "the runner keeps no record of having run");
  assert.throws(() => CjsGraph.finalDelete({}), /Unknown graph lifetime/);
});

test("the teardown chain runs a level's destructor in the place of its OnDestruct, with no arguments", () =>
{
  const calls = [];
  class Base {} class Middle {} class Derived {}
  CjsGraph.define(Base, {
    name: "ChainBase",
    onDestruct(value) { calls.push([ "Base.OnDestruct", value ]); },
    destructor(...args) { calls.push([ "~Base", args.length ]); }
  });
  CjsGraph.define(Middle, { name: "ChainMiddle", bases: [ Base ], onDestruct(value) { calls.push([ "Middle.OnDestruct", value ]); } });
  CjsGraph.define(Derived, { name: "ChainDerived", bases: [ Middle ], destructor(...args) { calls.push([ "~Derived", args.length ]); } });
  CjsGraph.destruct(new Derived(), 7);
  assert.deepEqual(calls, [ [ "~Derived", 0 ], [ "Middle.OnDestruct", 7 ], [ "Base.OnDestruct", 7 ], [ "~Base", 0 ] ]);
});

test("a destructor is a function or null, and a lifetime record keeps it", () =>
{
  const calls = [];
  class Owner {} class Late {}
  assert.throws(() => CjsGraph.define(Owner, { name: "DestructorOwner", destructor: true }), /destructor must be a function or null/);
  assert.throws(() => CjsGraph.defineLifetime(Owner, { destructor: true }), /destructor must be a function or null/);

  const destructor = function() { calls.push("~Owner"); };
  const info = CjsGraph.defineLifetime(Owner, { destructor });
  assert.equal(CjsGraph.defineLifetime(Owner, { destructor }), info);
  CjsGraph.finalDelete(new Owner());

  // A destructor that arrives later replaces the cached levels.
  CjsGraph.defineLifetime(Late, {});
  const late = new Late();
  CjsGraph.finalDelete(late);
  CjsGraph.defineLifetime(Late, { bases: [ Owner ], destructor() { calls.push("~Late"); } });
  CjsGraph.finalDelete(late);
  assert.deepEqual(calls, [ "~Owner", "~Late", "~Owner" ]);
});

test("an object with no __cjs field is not destructed, and asking adds nothing to it", () =>
{
  const plain = Object.seal({ value: 1 });
  assert.equal(CjsGraph.isDestructed(plain), false);
  assert.equal(Object.hasOwn(plain, "__cjs"), false);
});

test("diamond and repeated base declarations put every derived hook before shared ancestors", () =>
{
  const calls = [];
  class A {} class B {} class C {} class D {}
  CjsGraph.define(A, { name: "DestructDiamondA", onDestruct() { calls.push("A"); } });
  CjsGraph.define(B, { name: "DestructDiamondB", bases: [ A ], onDestruct() { calls.push("B"); } });
  CjsGraph.define(C, { name: "DestructDiamondC", bases: [ A ], onDestruct() { calls.push("C"); } });
  CjsGraph.define(D, { name: "DestructDiamondD", bases: [ B, "DestructDiamondC", B ], onDestruct() { calls.push("D"); } });
  CjsGraph.destruct(new D());
  assert.deepEqual(calls, [ "D", "C", "B", "A" ]);
});

test("teardown declarations remain separate from exposure chains and inherited method lookup", () =>
{
  let calls = 0;
  class Parent { OnDestruct() { calls++; } }
  class Child extends Parent {}
  class ExposureOnly {}
  CjsGraph.define(ExposureOnly, { name: "DestructExposureOnly", onDestruct() { throw new Error("not ancestry"); } });
  CjsGraph.define(Parent, { name: "DestructParent", onDestruct: Parent.prototype.OnDestruct });
  CjsGraph.define(Child, { name: "DestructChild", bases: [ Parent ], chainTo: "DestructExposureOnly" });
  CjsGraph.destruct(new Child());
  assert.equal(calls, 1);
});

test("late base replacement invalidates cached teardown and hooks own idempotence", () =>
{
  let released = 0;
  class Base {} class Child { held = true; }
  CjsGraph.define(Base, { name: "DestructLateBase" });
  CjsGraph.define(Child, { name: "DestructLateChild", bases: [ Base ] });
  const object = new Child();
  CjsGraph.destruct(object);
  CjsGraph.define(Base, { name: "DestructLateBase", onDestruct() { if (this.held) { this.held = false; released++; } } });
  CjsGraph.destruct(object);
  CjsGraph.destruct(object);
  assert.equal(released, 1);
});

test("malformed ancestry fails before invoking any teardown body", () =>
{
  class A {} class B {}
  const onDestruct = () => assert.fail("partial teardown");
  CjsGraph.define(A, { name: "DestructCycleA", bases: [ B ], onDestruct });
  assert.throws(() => CjsGraph.destruct(new A()), /Unknown graph base/);
  CjsGraph.define(B, { name: "DestructCycleB", bases: [ A ], onDestruct });
  assert.throws(() => CjsGraph.destruct(new A()), /Cyclic graph ancestry/);
  assert.throws(() => CjsGraph.define(B, { name: "DestructCycleB", onDestruct: true }), /function or null/);
});

test("hook errors propagate without introducing automatic member release", () =>
{
  class Broken { held = { value: 1 }; }
  CjsGraph.define(Broken, { name: "DestructBroken", onDestruct() { throw new Error("hook failure"); } });
  const object = new Broken();
  assert.throws(() => CjsGraph.destruct(object), /hook failure/);
  assert.deepEqual(object.held, { value: 1 });
});

test("lifetime-only records do not claim value definitions and retain identity when values arrive", () =>
{
  const calls = [];
  class Owner { value = 3; }
  const info = CjsGraph.defineLifetime(Owner, { onDestruct() { calls.push(this.value); } });
  assert.equal(CjsGraph.isDefined(Owner), false);
  assert.throws(() => CjsGraph.getClassInfo(Owner), /Unknown graph class/);
  const object = new Owner();
  CjsGraph.destruct(object);
  assert.equal(CjsGraph.define(Owner, { name: "LifetimeThenValues", members: [ { name: "value", type: "float32" } ] }), info);
  assert.equal(CjsGraph.isDefined(Owner), true);
  CjsGraph.destruct(object);
  object.value = 7;
  assert.deepEqual(CjsGraph.get(object), { value: 7 });
  assert.deepEqual(calls, [ 3, 3 ]);
});

test("late lifetime declarations keep full value definitions and update cached ancestry", () =>
{
  const calls = [];
  class Base {} class Owner { value = 4; }
  CjsGraph.defineLifetime(Base, { onDestruct() { calls.push("base"); } });
  const info = CjsGraph.define(Owner, { name: "ValuesThenLifetime", members: [ { name: "value", type: "float32" } ] });
  CjsGraph.destruct(new Owner());
  assert.equal(CjsGraph.defineLifetime(Owner, { bases: [ Base ], onDestruct() { calls.push("own"); } }), info);
  CjsGraph.destruct(new Owner());
  assert.deepEqual(calls, [ "own", "base" ]);
  const object = new Owner();
  object.value = 7;
  assert.deepEqual(CjsGraph.get(object), { value: 7 });
});
