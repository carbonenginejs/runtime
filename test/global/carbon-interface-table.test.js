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

test("the own table holds the class first, then its interfaces in declaration order", () =>
{
  class Mapped {}
  meta.blue.interface(INotify, IInitialize)(Mapped);
  assert.deepEqual([...mappedInterfaces(Mapped)], [Mapped, INotify, IInitialize]);

  class Bare {}
  meta.blue.interface()(Bare);
  assert.deepEqual([...mappedInterfaces(Bare)], [Bare]);

  class Appended {}
  meta.blue.interface(IInitialize)(Appended);
  meta.blue.interface(INotify, IInitialize)(Appended);
  assert.deepEqual([...mappedInterfaces(Appended)], [Appended, IInitialize, INotify], "later lines append; repeats collapse");

  assert.deepEqual([...mappedInterfaces(null)], []);
});

test("without its own table a class answers with its JS parent's; its own table ends that", () =>
{
  class Parent
  {
    Initialize() { return true; }
  }
  class AdditionalBase
  {
    Ping() { return "composed"; }
  }
  meta.blue.interface(IInitialize)(Parent);
  class Inheriting extends Parent {}
  assert.deepEqual([...mappedInterfaces(Inheriting)], [Parent, IInitialize]);

  class Child extends Parent {}
  meta.blue.inherit(AdditionalBase)(Child);
  meta.blue.interface(Parent)(Child);
  const child = new Child();
  assert.deepEqual([...mappedInterfaces(Child)], [Child, Parent]);
  assert.equal(mappedInterfaces(Child).has(IInitialize), false, "a listed class is one IID, not an exposure parent");
  assert.equal(child.Initialize(), true, "ordinary method inheritance remains intact");
  assert.equal(child.Ping(), "composed");
  assert.equal(CjsSchema.cast(child, Parent), child);
  assert.equal(CjsSchema.cast(child, AdditionalBase), child);
  assert.deepEqual([...composedContracts(Child)], [AdditionalBase]);
  assert.deepEqual([...mappedInterfaces(Parent)], [Parent, IInitialize]);
});

test("chainTo resolves its named parent after the own entries, not the JS parent", () =>
{
  class JavaScriptInterface {}
  class OwnInterface {}
  class LaterInterface {}
  class JavaScriptBase {}
  class ExposureParent {}
  class Child extends JavaScriptBase {}
  meta.blue.interface(JavaScriptInterface)(JavaScriptBase);
  meta.blue.interface(IInitialize)(ExposureParent);
  meta.blue.interface(OwnInterface, OwnInterface)(Child);
  meta.blue.chainTo(ExposureParent)(Child);
  assert.deepEqual([...mappedInterfaces(Child)], [Child, OwnInterface, ExposureParent, IInitialize]);
  mappedInterfaces(Child).add(JavaScriptInterface);
  assert.equal(mappedInterfaces(Child).has(JavaScriptInterface), false, "the resolved set is a copy");
  meta.blue.interface(LaterInterface)(ExposureParent);
  assert.deepEqual([...mappedInterfaces(Child)], [Child, OwnInterface, ExposureParent, IInitialize, LaterInterface]);
  assert.deepEqual([...mappedInterfaces(ExposureParent)], [ExposureParent, IInitialize, LaterInterface]);
  assert.deepEqual([...mappedInterfaces(JavaScriptBase)], [JavaScriptBase, JavaScriptInterface]);
});

test("Stage-3 and imperative declarations share the public Blue exposure facade", async () =>
{
  const source = `
    import { meta } from ${JSON.stringify(new URL("../../src/global/schema/index.js", import.meta.url).href)};
    import { INotify } from ${JSON.stringify(new URL("../../src/global/blue/INotify.js", import.meta.url).href)};
    @meta.blue.interface()
    export class Parent {}
    @meta.blue.interface(INotify)
    @meta.blue.chainTo(Parent)
    export class Decorated {}
  `;
  const { code } = transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [[decorators, { version: "2023-11" }]]
  });
  const { Decorated, Parent } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  class Explicit {}
  meta.blue.interface(INotify)(Explicit);
  meta.blue.chainTo(Parent)(Explicit);
  assert.equal(meta.blue, CjsSchema.meta.blue);
  assert.deepEqual([...mappedInterfaces(Decorated)], [Decorated, INotify, Parent]);
  assert.deepEqual([...mappedInterfaces(Explicit)], [Explicit, INotify, Parent]);
});

test("declaring chainTo twice on one class throws and keeps the first chain", () =>
{
  class First {}
  class Second {}
  class Target {}
  meta.blue.interface()(First);
  meta.blue.chainTo(First)(Target);
  assert.throws(() => meta.blue.chainTo(Second)(Target), /once per class/);
  assert.deepEqual([...mappedInterfaces(Target)], [Target, First]);
});

test("invalid interfaces, parents and decorator targets are rejected", () =>
{
  for (const value of [null, {}, () => {}])
  {
    assert.throws(() => meta.blue.interface(value), TypeError);
    assert.throws(() => meta.blue.chainTo(value), TypeError);
  }
  class Parent {}
  for (const decorate of [meta.blue.interface(INotify), meta.blue.chainTo(Parent)])
  {
    class Target {}
    for (const kind of ["field", "method", "getter", "setter", "accessor"])
      assert.throws(() => decorate(Target, { kind }), /only supports classes/);
    for (const value of [null, {}, () => {}])
      assert.throws(() => decorate(value), /class constructor/);
  }
});

test("exposure cycles are rejected", () =>
{
  class Parent {}
  class Child extends Parent {}
  meta.blue.interface(INotify)(Parent);
  assert.throws(() => meta.blue.chainTo(Parent)(Parent), /cycle/);
  assert.throws(() => meta.blue.chainTo(Child)(Parent), /cycle/,
    "a child without its own table answers with the pending parent table");
  assert.deepEqual([...mappedInterfaces(Parent)], [Parent, INotify]);
  assert.deepEqual([...mappedInterfaces(Child)], [Parent, INotify]);

  class First {}
  class Second {}
  meta.blue.interface(INotify)(Second);
  meta.blue.interface(IInitialize)(First);
  meta.blue.chainTo(Second)(First);
  assert.throws(() => meta.blue.chainTo(First)(Second), /cycle/);
  assert.deepEqual([...mappedInterfaces(Second)], [Second, INotify]);
  assert.deepEqual([...mappedInterfaces(First)], [First, IInitialize, Second, INotify]);
});

test("Copier throws on an unnamed listed interface and skips an unnamed class carrying its own table", () =>
{
  class UnnamedInterface {}
  class ListsUnnamed { value = 1; }
  CjsSchema.define(ListsUnnamed, { className: "InterfaceTableListsUnnamed", fields: {} });
  meta.blue.interface(UnnamedInterface)(ListsUnnamed);
  assert.throws(() => new Copier().CopyTo(new ListsUnnamed()), /declared class identity/);

  class UnnamedTemplate {}
  meta.blue.interface()(UnnamedTemplate);
  class ListsTemplate { value = 2; }
  CjsSchema.define(ListsTemplate, { className: "InterfaceTableListsTemplate", fields: {} });
  meta.blue.interface(UnnamedTemplate)(ListsTemplate);
  assert.ok(new Copier().CopyTo(new ListsTemplate()));
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
meta.blue.interface(IInitialize, INotify)(InterfaceLifecycleParent);

class InterfaceLifecycleEnded extends InterfaceLifecycleParent {}
CjsSchema.define(InterfaceLifecycleEnded, { className: "InterfaceTableLifecycleEnded" });
meta.blue.interface(INotify, InterfaceLifecycleParent)(InterfaceLifecycleEnded);

class InterfaceLifecycleChained extends InterfaceLifecycleParent {}
CjsSchema.define(InterfaceLifecycleChained, { className: "InterfaceTableLifecycleChained" });
meta.blue.chainTo(InterfaceLifecycleParent)(InterfaceLifecycleChained);

test("Copier selects notification or initialization from the exposure boundary", () =>
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
    const member = CjsSchema.getSchema(Constructor).members.find(entry => (entry.key ?? entry.name) === "value");
    assert.ok(member, "interface exposure does not alter stored-member lineage");
    applyReaderMember(target, member, 5);
    finalizeReaderObject(target);
    assert.deepEqual(target.calls, expected);
  }
  const suppressed = new InterfaceLifecycleChained();
  const member = CjsSchema.getSchema(InterfaceLifecycleChained).members.find(entry => (entry.key ?? entry.name) === "value");
  applyReaderMember(suppressed, member, 3);
  finalizeReaderObject(suppressed, { initialize: false });
  assert.deepEqual(suppressed.calls, [], "mapped IInitialize still suppresses notify when initialization is disabled");
});
