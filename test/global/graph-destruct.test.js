import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsGraph, ICjsGraphRoot, CjsGraphState } from "../../src/global/model/graph/index.js";

test("Destruct calls the most derived OnDestruct, which reaches its parents through super, arguments intact", () =>
{
  const calls = [], argument = new Set();
  class Base extends ICjsGraphRoot
  {
    values = [ 1, 2 ];
    OnDestruct(value) { calls.push([ "base", this.values.length, value ]); return super.OnDestruct(value); }
  }
  class Middle extends Base
  {
    OnDestruct(value) { calls.push([ "middle", this.values.length, value ]); return super.OnDestruct(value); }
  }
  class Derived extends Middle
  {
    OnDestruct(value) { calls.push([ "derived", this.values.length, value ]); return super.OnDestruct(value); }
  }
  CjsGraph.define(Base, { name: "DestructBase", capabilities: [ "destruct" ] });
  CjsGraph.define(Middle, { name: "DestructMiddle", capabilities: [ "destruct" ], bases: [ Base ] });
  CjsGraph.define(Derived, { name: "DestructDerived", capabilities: [ "destruct" ], bases: [ Middle ] });
  const object = new Derived();
  object.Destruct(argument);
  assert.deepEqual(calls, [ [ "derived", 2, argument ], [ "middle", 2, argument ], [ "base", 2, argument ] ]);
  assert.deepEqual(object.values, [ 1, 2 ]);
  assert.equal(object.IsDestructed(), true);
  assert.equal(new Base().OnDestruct(), true, "the root's own OnDestruct answers true");
});

test("Destruct runs once: it answers true, moves the state, and a second call answers false", () =>
{
  const calls = [], seen = [];
  class Owner extends ICjsGraphRoot
  {
    OnDestruct(options) { calls.push([ "OnDestruct", options ]); seen.push(this.IsDestructed()); return super.OnDestruct(options); }
  }
  CjsGraph.define(Owner, { name: "OnceOwner", capabilities: [ "destruct" ], destructor() { calls.push("~Owner"); seen.push(this.__cjs.state); } });
  const object = new Owner(), options = { reason: "test" };
  assert.equal(object.Destruct(options), true);
  assert.deepEqual(calls, [ [ "OnDestruct", options ], "~Owner" ]);
  assert.deepEqual(seen, [ false, CjsGraphState.State.DESTRUCTING ], "alive while OnDestruct runs, DESTRUCTING while the destructors run");
  assert.equal(object.__cjs.state, CjsGraphState.State.DESTRUCTED);
  assert.equal(object.IsDestructed(), true);

  assert.equal(object.Destruct(options), false);
  assert.equal(CjsGraph.destruct(object), false);
  assert.equal(calls.length, 2, "nothing runs again");
});

test("an OnDestruct that answers false refuses: no state changes and no destructor runs", () =>
{
  let destructed = 0, refuse = true;
  class Shared extends ICjsGraphRoot { OnDestruct(options) { return refuse ? false : super.OnDestruct(options); } }
  CjsGraph.define(Shared, { name: "RefusingShared", capabilities: [ "destruct" ], destructor() { destructed++; } });
  const object = new Shared();
  assert.equal(object.Destruct(), false);
  assert.equal(object.Destruct(), false);
  assert.equal(object.__cjs, null, "a refusal creates no state");
  assert.equal(object.IsDestructed(), false);
  assert.equal(destructed, 0);

  // Its manager still ends it through the runner, and the graph does once nothing refuses.
  CjsGraph.finalDelete(object);
  assert.equal(destructed, 1);
  refuse = false;
  assert.equal(object.Destruct(), true);
  assert.equal(destructed, 2);
});

test("only an answer of exactly false refuses", () =>
{
  let destructed = 0;
  class Quiet extends ICjsGraphRoot { OnDestruct() {} }
  CjsGraph.define(Quiet, { name: "QuietOwner", capabilities: [ "destruct" ], destructor() { destructed++; } });
  assert.equal(new Quiet().Destruct(), true);
  assert.equal(destructed, 1);
});

test("an OnDestruct that throws leaves the object alive; a destructor that throws leaves it DESTRUCTING", () =>
{
  let fail = true, destructed = 0;
  class Fragile extends ICjsGraphRoot { OnDestruct(options) { if (fail) throw new Error("hook failure"); return super.OnDestruct(options); } }
  CjsGraph.define(Fragile, { name: "FragileOwner", capabilities: [ "destruct" ], destructor() { destructed++; } });
  const object = new Fragile();
  assert.throws(() => object.Destruct(), /hook failure/);
  assert.equal(object.IsDestructed(), false);
  assert.equal(destructed, 0);
  fail = false;
  assert.equal(object.Destruct(), true, "it can be destructed once the hook succeeds");

  class Broken extends ICjsGraphRoot {}
  CjsGraph.define(Broken, { name: "BrokenOwner", capabilities: [ "destruct" ], destructor() { throw new Error("destructor failure"); } });
  const broken = new Broken();
  assert.throws(() => broken.Destruct(), /destructor failure/);
  assert.equal(broken.__cjs.state, CjsGraphState.State.DESTRUCTING);
  assert.equal(broken.Destruct(), false, "a retry answers false");
});

test("an object with no __cjs field gains its state on Destruct, and a re-entrant Destruct answers false", () =>
{
  const answers = [];
  class Plain { value = 1; }
  CjsGraph.define(Plain, { name: "StatelessPlain", capabilities: [ "destruct" ], destructor() { answers.push(CjsGraph.destruct(this)); } });
  const object = new Plain();
  assert.equal(Object.hasOwn(object, "__cjs"), false);
  assert.equal(CjsGraph.destruct(object), true);
  assert.deepEqual(answers, [ false ]);
  assert.equal(object.__cjs.state, CjsGraphState.State.DESTRUCTED);
  assert.equal(CjsGraph.destruct(object), false);
});

test("a root has no state until the graph is asked, and IsDestructed reads it without creating one", () =>
{
  class Rooted extends ICjsGraphRoot {}
  CjsGraph.define(Rooted, { name: "DestructStateRooted", capabilities: [ "destruct" ] });
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
  class A {} class B {} class C {}
  class D extends ICjsGraphRoot { OnDestruct(options) { calls.push("D.OnDestruct"); return super.OnDestruct(options); } }
  CjsGraph.define(A, { name: "RunnerA", capabilities: [ "destruct" ], destructor(...args) { calls.push([ "~A", this.constructor, args.length ]); } });
  CjsGraph.define(B, { name: "RunnerB", capabilities: [ "destruct" ], bases: [ A ] });
  CjsGraph.define(C, { name: "RunnerC", capabilities: [ "destruct" ], bases: [ A ], destructor() { calls.push("~C"); } });
  CjsGraph.define(D, { name: "RunnerD", capabilities: [ "destruct" ], bases: [ B, C ], destructor() { calls.push("~D"); } });

  const object = new D();
  CjsGraph.finalDelete(object);
  assert.deepEqual(calls, [ "~D", "~C", [ "~A", D, 0 ] ]);
  assert.equal(object.__cjs, null, "the runner creates and sets no state");
  assert.equal(object.IsDestructed(), false);

  CjsGraph.finalDelete(object);
  assert.equal(calls.length, 6, "the runner keeps no record of having run");
  assert.doesNotThrow(() => CjsGraph.finalDelete({}), "an object whose class has no record has no destructor to run");
});

test("Destruct runs OnDestruct once with the arguments, then every level's destructor with none", () =>
{
  const calls = [];
  class Base extends ICjsGraphRoot { OnDestruct(value) { calls.push([ "Base.OnDestruct", value ]); return super.OnDestruct(value); } }
  class Middle extends Base {}
  class Derived extends Middle { OnDestruct(value) { calls.push([ "Derived.OnDestruct", value ]); return super.OnDestruct(value); } }
  CjsGraph.define(Base, { name: "ChainBase", capabilities: [ "destruct" ], destructor(...args) { calls.push([ "~Base", args.length ]); } });
  CjsGraph.define(Middle, { name: "ChainMiddle", capabilities: [ "destruct" ], bases: [ Base ] });
  CjsGraph.define(Derived, { name: "ChainDerived", capabilities: [ "destruct" ], bases: [ Middle ], destructor(...args) { calls.push([ "~Derived", args.length ]); } });
  new Derived().Destruct(7);
  assert.deepEqual(calls, [ [ "Derived.OnDestruct", 7 ], [ "Base.OnDestruct", 7 ], [ "~Derived", 0 ], [ "~Base", 0 ] ]);

  // A class with no OnDestruct anywhere is asked for none.
  class Plain {}
  CjsGraph.define(Plain, { name: "ChainPlain", capabilities: [ "destruct" ], destructor() { calls.push("~Plain"); } });
  calls.length = 0;
  CjsGraph.destruct(new Plain(), 7);
  assert.deepEqual(calls, [ "~Plain" ]);
});

test("a destructor is a function or null, and a lifetime record keeps it", () =>
{
  const calls = [];
  class Owner {} class Late {}
  assert.throws(() => CjsGraph.define(Owner, { name: "DestructorOwner", capabilities: [ "destruct" ], destructor: true }), /destructor must be a function or null/);
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
  CjsGraph.define(A, { name: "DestructDiamondA", capabilities: [ "destruct" ], destructor() { calls.push("A"); } });
  CjsGraph.define(B, { name: "DestructDiamondB", capabilities: [ "destruct" ], bases: [ A ], destructor() { calls.push("B"); } });
  CjsGraph.define(C, { name: "DestructDiamondC", capabilities: [ "destruct" ], bases: [ A ], destructor() { calls.push("C"); } });
  CjsGraph.define(D, { name: "DestructDiamondD", capabilities: [ "destruct" ], bases: [ B, "DestructDiamondC", B ], destructor() { calls.push("D"); } });
  CjsGraph.destruct(new D());
  assert.deepEqual(calls, [ "D", "C", "B", "A" ]);
});

test("destructors follow the base list, never the exposure chain or method lookup", () =>
{
  let calls = 0;
  class Parent { _Destructor() { calls++; } }
  class Child extends Parent {}
  class ExposureOnly {}
  CjsGraph.define(ExposureOnly, { name: "DestructExposureOnly", capabilities: [ "destruct" ], destructor() { throw new Error("not ancestry"); } });
  CjsGraph.define(Parent, { name: "DestructParent", capabilities: [ "destruct" ], destructor: Parent.prototype._Destructor });
  CjsGraph.define(Child, { name: "DestructChild", capabilities: [ "destruct" ], bases: [ Parent ], chainTo: "DestructExposureOnly" });
  CjsGraph.destruct(new Child());
  assert.equal(calls, 1, "Child inherits the method but has no destructor of its own");
});

test("late base replacement invalidates cached teardown and hooks own idempotence", () =>
{
  let released = 0;
  class Base {} class Child { held = true; }
  CjsGraph.define(Base, { name: "DestructLateBase", capabilities: [ "destruct" ] });
  CjsGraph.define(Child, { name: "DestructLateChild", capabilities: [ "destruct" ], bases: [ Base ] });
  const object = new Child();
  CjsGraph.finalDelete(object);
  CjsGraph.define(Base, { name: "DestructLateBase", capabilities: [ "destruct" ], destructor() { if (this.held) { this.held = false; released++; } } });
  CjsGraph.finalDelete(object);
  CjsGraph.finalDelete(object);
  assert.equal(released, 1);
});

test("malformed ancestry fails before invoking any teardown body", () =>
{
  class A {} class B {}
  const onDestruct = () => assert.fail("partial teardown");
  CjsGraph.define(A, { name: "DestructCycleA", capabilities: [ "destruct" ], bases: [ "DestructCycleB" ], destructor: onDestruct });
  assert.throws(() => CjsGraph.destruct(new A()), /Unknown graph base/);
  CjsGraph.define(B, { name: "DestructCycleB", capabilities: [ "destruct" ], bases: [ A ], destructor: onDestruct });
  assert.throws(() => CjsGraph.destruct(new A()), /Cyclic graph ancestry/);
  assert.throws(() => CjsGraph.define(B, { name: "DestructCycleB", capabilities: [ "destruct" ], destructor: true }), /function or null/);
  assert.throws(() => CjsGraph.define(B, { name: "DestructCycleB", capabilities: [ "destruct" ], onDestruct() {} }), /not a definition key/);
  assert.throws(() => CjsGraph.defineLifetime(B, { onDestruct: null }), /not a definition key/);
});

test("destruct is a declared capability: it passes down the base list and nowhere else", () =>
{
  const calls = [];
  class Root {} class Below extends Root {} class Beside {} class Chained {}
  CjsGraph.define(Root, { name: "CapabilityRoot", capabilities: [ "values", "destruct" ] });
  CjsGraph.define(Below, { name: "CapabilityBelow", bases: [ Root ], destructor() { calls.push("~Below"); } });
  CjsGraph.define(Beside, { name: "CapabilityBeside", destructor() { calls.push("~Beside"); } });
  CjsGraph.define(Chained, { name: "CapabilityChained", chainTo: "CapabilityRoot", destructor() { calls.push("~Chained"); } });

  assert.equal(CjsGraph.destruct(new Below()), true, "a class below the declaring one has it");
  assert.throws(() => CjsGraph.destruct(new Beside()), /CapabilityBeside does not declare the destruct capability/);
  assert.throws(() => CjsGraph.destruct(new Chained()), /CapabilityChained does not declare/, "the exposure chain passes no destruct");
  assert.throws(() => CjsGraph.destruct({}), /does not declare the destruct capability/, "nor does an object with no record");
  assert.deepEqual(calls, [ "~Below" ], "a refused call runs nothing");

  // The runner checks no capability.
  CjsGraph.finalDelete(new Beside());
  assert.deepEqual(calls, [ "~Below", "~Beside" ]);

  class Named { static className = "CapabilityNamed"; }
  assert.throws(() => CjsGraph.destruct(new Named()), /CapabilityNamed does not declare/, "an unrecorded class is named by its className");

  class Bad {}
  assert.throws(() => CjsGraph.define(Bad, { name: "CapabilityBad", capabilities: "destruct" }), /capabilities is a list/);
  assert.throws(() => CjsGraph.define(Bad, { name: "CapabilityBad", capabilities: [ "fly" ] }), /unknown capability fly/);
  assert.throws(() => CjsGraph.define(Bad, { name: "CapabilityBad", capabilities: [ "destruct", "destruct" ] }), /listed twice/);
  assert.throws(() => CjsGraph.defineLifetime(Bad, { capabilities: [ "fly" ] }), /unknown capability fly/);
  assert.deepEqual(Object.values(CjsGraph.Capability), [ "values", "destruct", "events" ]);
});

test("hook errors propagate without introducing automatic member release", () =>
{
  class Broken { held = { value: 1 }; }
  CjsGraph.define(Broken, { name: "DestructBroken", capabilities: [ "destruct" ], destructor() { throw new Error("hook failure"); } });
  const object = new Broken();
  assert.throws(() => CjsGraph.destruct(object), /hook failure/);
  assert.deepEqual(object.held, { value: 1 });
});

test("lifetime-only records do not claim value definitions and retain identity when values arrive", () =>
{
  const calls = [];
  class Owner { value = 3; }
  const info = CjsGraph.defineLifetime(Owner, { destructor() { calls.push(this.value); } });
  assert.equal(CjsGraph.isDefined(Owner), false);
  assert.throws(() => CjsGraph.getClassInfo(Owner), /Unknown graph class/);
  const object = new Owner();
  CjsGraph.finalDelete(object);
  assert.equal(CjsGraph.define(Owner, { name: "LifetimeThenValues", capabilities: [ "destruct" ], members: [ { name: "value", type: "float32" } ] }), info);
  assert.equal(CjsGraph.isDefined(Owner), true);
  CjsGraph.finalDelete(object);
  object.value = 7;
  assert.deepEqual(CjsGraph.get(object), { value: 7 });
  assert.deepEqual(calls, [ 3, 3 ]);
});

test("late lifetime declarations keep full value definitions and update cached ancestry", () =>
{
  const calls = [];
  class Base {} class Owner { value = 4; }
  CjsGraph.defineLifetime(Base, { destructor() { calls.push("base"); } });
  const info = CjsGraph.define(Owner, { name: "ValuesThenLifetime", capabilities: [ "destruct" ], members: [ { name: "value", type: "float32" } ] });
  CjsGraph.destruct(new Owner());
  assert.equal(CjsGraph.defineLifetime(Owner, { bases: [ Base ], capabilities: [ "destruct" ], destructor() { calls.push("own"); } }), info);
  CjsGraph.destruct(new Owner());
  assert.deepEqual(calls, [ "own", "base" ]);
  const object = new Owner();
  object.value = 7;
  assert.deepEqual(CjsGraph.get(object), { value: 7 });
});
