import assert from "node:assert/strict";
import test from "node:test";
import { transformSync } from "@babel/core";
import decorators from "@babel/plugin-proposal-decorators";
import { CjsSchema, meta } from "../../src/global/schema/index.js";
import { composedContracts, mappedInterfaces } from "../../src/global/compose/interface.js";
import { Copier } from "../../src/global/blue/Copier.js";
import { IInitialize } from "../../src/global/blue/IInitialize.js";
import { INotify } from "../../src/global/blue/INotify.js";
import { applyReaderMember, finalizeReaderObject } from "../../src/global/schema/hydration.js";

test("legacy mappings preserve inherited identity and independent child additions", () =>
{
  class First {}
  class Second {}
  class Parent {}
  class Child extends Parent {}
  class Sibling extends Parent {}
  meta.blue.mapInterface(First)(Parent);
  assert.equal(mappedInterfaces(Child), mappedInterfaces(Parent));
  meta.blue.mapInterface(Second)(Child);
  assert.deepEqual([...mappedInterfaces(Child)], [First, Second]);
  assert.deepEqual([...mappedInterfaces(Parent)], [First]);
  assert.equal(mappedInterfaces(Sibling), mappedInterfaces(Parent));
  assert.deepEqual([...mappedInterfaces(null)], []);
});

test("an exact table stops JS exposure inheritance without changing bases or methods", () =>
{
  class Parent
  {
    Initialize() { return true; }
  }
  class AdditionalBase
  {
    Ping() { return "composed"; }
  }
  meta.blue.mapInterface(IInitialize)(Parent);
  class Child extends Parent {}
  meta.blue.inherit(AdditionalBase)(Child);
  meta.blue.interfaceTable({ interfaces: [Parent], chainTo: null })(Child);
  const child = new Child();
  assert.deepEqual([...mappedInterfaces(Child)], [Parent]);
  assert.equal(mappedInterfaces(Child).has(IInitialize), false, "a listed class is one IID, not an exposure parent");
  assert.equal(child.Initialize(), true, "ordinary method inheritance remains intact");
  assert.equal(child.Ping(), "composed");
  assert.equal(CjsSchema.cast(child, Parent), child);
  assert.equal(CjsSchema.cast(child, AdditionalBase), child);
  assert.deepEqual([...composedContracts(Child)], [AdditionalBase]);
  assert.deepEqual([...mappedInterfaces(Parent)], [IInitialize]);
});

test("an explicit chain follows only its named exposure parent and protects owned entries", () =>
{
  class JavaScriptInterface {}
  class OwnInterface {}
  class LaterInterface {}
  class JavaScriptBase {}
  class ExposureParent {}
  class Child extends JavaScriptBase {}
  meta.blue.mapInterface(JavaScriptInterface)(JavaScriptBase);
  meta.blue.interfaceTable({ interfaces: [IInitialize], chainTo: null })(ExposureParent);
  const entries = [OwnInterface, OwnInterface];
  meta.blue.interfaceTable({ interfaces: entries, chainTo: ExposureParent })(Child);
  entries.push(JavaScriptInterface);
  assert.deepEqual([...mappedInterfaces(Child)], [OwnInterface, IInitialize]);
  mappedInterfaces(Child).add(JavaScriptInterface);
  assert.equal(mappedInterfaces(Child).has(JavaScriptInterface), false);
  meta.blue.mapInterface(LaterInterface)(ExposureParent);
  assert.deepEqual([...mappedInterfaces(Child)], [OwnInterface, IInitialize, LaterInterface]);
  assert.deepEqual([...mappedInterfaces(ExposureParent)], [IInitialize, LaterInterface]);
  assert.deepEqual([...mappedInterfaces(JavaScriptBase)], [JavaScriptInterface]);
});

test("Stage-3 and imperative table declarations share the public Blue exposure facade", async () =>
{
  const source = `
    import { meta } from ${JSON.stringify(new URL("../../src/global/schema/index.js", import.meta.url).href)};
    import { INotify } from ${JSON.stringify(new URL("../../src/global/blue/INotify.js", import.meta.url).href)};
    @meta.blue.interfaceTable({ interfaces: [INotify], chainTo: null })
    export class Decorated {}
  `;
  const { code } = transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [[decorators, { version: "2023-11" }]]
  });
  const { Decorated } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  class Explicit {}
  meta.blue.interfaceTable({ interfaces: [INotify], chainTo: null })(Explicit);
  assert.equal(meta.blue, CjsSchema.meta.blue);
  assert.deepEqual([...mappedInterfaces(Decorated)], [...mappedInterfaces(Explicit)]);
});

test("table replacement and later self additions have explicit declaration order", () =>
{
  class Earlier {}
  class Parent {}
  class Target extends Parent {}
  meta.blue.mapInterface(IInitialize)(Parent);
  meta.blue.mapInterface(Earlier)(Target);
  meta.blue.interfaceTable({ interfaces: [INotify], chainTo: null })(Target);
  CjsSchema.define(Target, { className: "ExactInterfaceTableSelfAddition" });
  meta.blue.mapInterface(Target)(Target);
  assert.deepEqual([...mappedInterfaces(Target)], [INotify, Target]);
  assert.equal(mappedInterfaces(Target).has(Earlier), false, "the complete table replaces earlier additions");
  assert.equal(mappedInterfaces(Target).has(IInitialize), false, "later additions preserve the explicit boundary");

  class Child extends Target {}
  class Sibling extends Target {}
  meta.blue.mapInterface(Earlier)(Child);
  assert.deepEqual([...mappedInterfaces(Child)], [INotify, Target, Earlier]);
  assert.deepEqual([...mappedInterfaces(Sibling)], [INotify, Target]);
  assert.deepEqual([...mappedInterfaces(Target)], [INotify, Target], "a legacy child does not mutate its parent's exact table");
  meta.blue.interfaceTable({ interfaces: [], chainTo: null })(Child);
  assert.deepEqual([...mappedInterfaces(Child)], []);
  assert.deepEqual([...mappedInterfaces(Target)], [INotify, Target]);
});

test("invalid interface tables and decorator targets are rejected before replacing metadata", () =>
{
  for (const definition of [null, [], new Date(), {}, { interfaces: [] },
    { interfaces: [], chainTo: undefined }, { interfaces: INotify, chainTo: null },
    { interfaces: [null], chainTo: null }, { interfaces: [() => {}], chainTo: null },
    { interfaces: [], chainTo: {} }, { interfaces: [], chainTo: () => {} },
    { interfaces: [], chainTo: null, parent: null }])
  {
    assert.throws(() => meta.blue.interfaceTable(definition), TypeError);
  }
  const decorate = meta.blue.interfaceTable({ interfaces: [], chainTo: null });
  class Target {}
  meta.blue.mapInterface(INotify)(Target);
  for (const kind of ["field", "method", "getter", "setter", "accessor"])
    assert.throws(() => decorate(Target, { kind }), /only supports classes/);
  for (const value of [null, {}, () => {}])
    assert.throws(() => decorate(value), /class constructor/);
  assert.deepEqual([...mappedInterfaces(Target)], [INotify]);
});

test("explicit exposure cycles reject the new declaration atomically", () =>
{
  class Parent {}
  class Child extends Parent {}
  meta.blue.mapInterface(INotify)(Parent);
  assert.throws(() => meta.blue.interfaceTable({ interfaces: [], chainTo: Parent })(Parent), /cycle/);
  assert.throws(() => meta.blue.interfaceTable({ interfaces: [], chainTo: Child })(Parent), /cycle/,
    "a child without its own record would inherit the pending parent table");
  assert.deepEqual([...mappedInterfaces(Parent)], [INotify]);
  assert.deepEqual([...mappedInterfaces(Child)], [INotify]);

  class First {}
  class Second {}
  meta.blue.mapInterface(INotify)(Second);
  meta.blue.interfaceTable({ interfaces: [IInitialize], chainTo: Second })(First);
  assert.throws(() => meta.blue.interfaceTable({ interfaces: [], chainTo: First })(Second), /cycle/);
  assert.deepEqual([...mappedInterfaces(Second)], [INotify]);
  assert.deepEqual([...mappedInterfaces(First)], [IInitialize, INotify]);
});

class InterfaceLifecycleParent
{
  value = 0;
  calls = [];
  Initialize() { this.calls.push(["initialize", this.value]); return true; }
  OnModified(name) { this.calls.push(["notify", name, this.value]); return true; }
}
CjsSchema.define(InterfaceLifecycleParent, {
  className: "InterfaceTableLifecycleParent",
  fields: { value: [meta.type.int32, meta.blue.persist, meta.blue.notify] }
});
meta.blue.mapInterface(IInitialize, INotify)(InterfaceLifecycleParent);

class InterfaceLifecycleEnded extends InterfaceLifecycleParent {}
CjsSchema.define(InterfaceLifecycleEnded, { className: "InterfaceTableLifecycleEnded" });
meta.blue.interfaceTable({ interfaces: [INotify, InterfaceLifecycleParent], chainTo: null })(InterfaceLifecycleEnded);

class InterfaceLifecycleChained extends InterfaceLifecycleParent {}
CjsSchema.define(InterfaceLifecycleChained, { className: "InterfaceTableLifecycleChained" });
meta.blue.interfaceTable({ interfaces: [], chainTo: InterfaceLifecycleParent })(InterfaceLifecycleChained);

test("Copier selects notification or initialization from the exact exposure boundary", () =>
{
  const copier = new Copier();
  const ended = copier.CopyTo(Object.assign(new InterfaceLifecycleEnded(), { value: 7 }));
  assert.ok(ended);
  assert.deepEqual(ended.calls, [["notify", "value", 7]]);
  const chained = copier.CopyTo(Object.assign(new InterfaceLifecycleChained(), { value: 9 }));
  assert.ok(chained);
  assert.deepEqual(chained.calls, [["initialize", 9]]);
});

test("canonical reader completion honors the same table without changing member inheritance", () =>
{
  for (const [Constructor, expected] of [
    [InterfaceLifecycleEnded, [["notify", "value", 5]]],
    [InterfaceLifecycleChained, [["initialize", 5]]]
  ])
  {
    const target = new Constructor();
    const member = CjsSchema.getSchema(Constructor).members.find(entry => entry.key === "value");
    assert.ok(member, "interface exposure does not alter stored-member lineage");
    applyReaderMember(target, member, 5);
    finalizeReaderObject(target);
    assert.deepEqual(target.calls, expected);
  }
  const suppressed = new InterfaceLifecycleChained();
  const member = CjsSchema.getSchema(InterfaceLifecycleChained).members.find(entry => entry.key === "value");
  applyReaderMember(suppressed, member, 3);
  finalizeReaderObject(suppressed, { initialize: false });
  assert.deepEqual(suppressed.calls, [], "mapped IInitialize still suppresses notify when initialization is disabled");
});
