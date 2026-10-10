import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta } from "../../src/global/schema/index.js";
import "../../src/global/blue/values.js";

test("a redeclared inherited member keeps every namespace it does not restate", () =>
{
    class Parent { glow = 1; }
    CjsSchema.define(Parent, { className: "InheritedRedeclarationParent", fields: {
        glow: [meta.type.float32, meta.blue.readwrite, meta.blue.persist, meta.ui.group("Lighting")]
    } });
    class Child extends Parent {}
    CjsSchema.define(Child, { className: "InheritedRedeclarationChild", fields: {
        glow: [meta.ui.description("Glow strength")]
    } });
    const member = CjsSchema.getSchema(Child).members.find(entry => entry.declaringClass === Child);
    assert.equal(member.edit.persist, true);
    assert.equal(member.edit.write, true);
    assert.equal(member.type.kind, "float32");
    assert.deepEqual(member.jessica, { group: "Lighting", description: "Glow strength" });
    assert.equal(member.name, "glow");
    assert.equal(member.key, "glow");
    assert.deepEqual(CjsSchema.getValues(new Child(), {}, { persistOnly: true }), { glow: 1 }, "the persist flag survives");
});

test("a restated key overrides only that key, and merging reaches through several generations", () =>
{
    class Base { level = 0; }
    CjsSchema.define(Base, { className: "InheritedRedeclarationBase", fields: {
        level: [meta.type.int32, meta.blue.readwrite, meta.blue.persist, meta.ui.group("General"), meta.ui.widget("int")]
    } });
    class Middle extends Base {}
    CjsSchema.define(Middle, { className: "InheritedRedeclarationMiddle", fields: { level: [meta.ui.group("Advanced")] } });
    class Leaf extends Middle {}
    CjsSchema.define(Leaf, { className: "InheritedRedeclarationLeaf", fields: { level: [meta.blue.read] } });
    const member = CjsSchema.getSchema(Leaf).members.find(entry => entry.declaringClass === Leaf);
    assert.deepEqual(member.jessica, { group: "Advanced", widget: "int" });
    assert.equal(member.edit.read, true);
    assert.equal(member.edit.persist, true);
    assert.equal(member.type.kind, "int32");
    const base = CjsSchema.getSchema(Base).members[0];
    assert.deepEqual(base.jessica, { group: "General", widget: "int" }, "the parent's own record is not changed");
});

test("explicit member declarations are complete and do not merge inherited metadata", () =>
{
    class Parent { value = 0; }
    CjsSchema.define(Parent, { className: "InheritedExplicitParent", fields: {
        value: [meta.type.int32, meta.blue.readwrite, meta.blue.persist]
    } });
    class Child extends Parent {}
    CjsSchema.define(Child, { className: "InheritedExplicitChild", members: [
        { name: "value", key: "value", type: { kind: "int32" }, edit: { read: true } }
    ] });
    const member = CjsSchema.getSchema(Child).members.find(entry => entry.declaringClass === Child);
    assert.deepEqual(member.edit, { read: true });
});
