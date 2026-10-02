import * as schemaExports from "../../src/global/schema/index.js";
import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema, meta } from "../../src/global/schema/index.js";

function withoutOwners(entries)
{
    return entries.map(({ declaringClass, ...entry }) => entry);
}

function applyStage3(metadata, name, kind, decorators)
{
    const context = { metadata, name, kind, addInitializer() {} };
    for (const decorator of decorators) decorator(undefined, context);
}

test("the public decorator surface has one namespace per vocabulary and preserves records", () =>
{
    assert.equal(meta, CjsSchema.meta);
    assert.equal(meta.hideInherited, CjsSchema.hideInherited);
    for (const name of ["type", "types", "edit", "impl", "carbon", "lifecycle", "jessica", "compose", "components"])
    {
        assert.equal(Object.hasOwn(schemaExports, name), false, "removed export: " + name);
        assert.equal(Object.hasOwn(CjsSchema, name), false, "removed class alias: " + name);
    }
    for (const name of ["edit", "impl", "carbon", "lifecycle", "jessica", "compose", "custom"])
        assert.equal(Object.hasOwn(meta, name), false, "removed meta alias: " + name);
    for (const name of ["none", "enum", "setting"])
        assert.equal(Object.hasOwn(meta.blue, name), false, "removed Blue alias: " + name);
    for (const name of ["define", "hideInherited"])
        assert.equal(Object.hasOwn(meta.type, name), false, "class declaration is flat: " + name);
    class Provenance { Method() {} }
    CjsSchema.decorateMethod(Provenance, "Method", meta.ours);
    assert.equal(CjsSchema.getMethod(Provenance, "Method").impl.status, "custom");
    class Types {}
    CjsSchema.define(Types, {
        className: "DeclarationTypes",
        fields: { text: meta.type.wstring, peer: meta.type.weakRef("DeclarationTypes") }
    });
    assert.deepEqual(CjsSchema.getSchema(Types).members.map(entry => entry.type),
        [ { kind: "wstring" }, { kind: "weakRef", className: "DeclarationTypes" } ]);
});

test("Stage-3 and explicit declarations produce the same separate stored and live records before construction", () =>
{
    let constructions = 0;
    const metadata = {};
    class Decorated
    {
        constructor() { constructions++; }
        get boosters() { throw new Error("registration evaluated a getter"); }
        set boosters(value) {}
    }
    applyStage3(metadata, "_boosters", "field", [ meta.member("boosters"), meta.type.objectRef("Booster"), meta.blue.persistOnly ]);
    applyStage3(metadata, "boosters", "getter", [ meta.property(), meta.type.objectRef("Booster"), meta.blue.readwrite, meta.implemented ]);
    applyStage3(metadata, "boosters", "setter", [ meta.blue.notify ]);
    meta.define({ className: "DeclarationDecorated" })(Decorated, { kind: "class", metadata });

    class Explicit {}
    CjsSchema.define(Explicit, {
        className: "DeclarationExplicit",
        members: [ { name: "boosters", key: "_boosters", type: { kind: "objectRef", className: "Booster" }, edit: { persist: true, persistOnly: true, hidden: true } } ],
        properties: {
            boosters: [ meta.property(), meta.type.objectRef("Booster"), meta.blue.readwrite, meta.blue.notify, meta.implemented ]
        }
    });
    const decorated = CjsSchema.getSchema(Decorated);
    const explicit = CjsSchema.getSchema(Explicit);
    assert.equal(constructions, 0);
    assert.deepEqual(withoutOwners(decorated.members), withoutOwners(explicit.members));
    assert.deepEqual(withoutOwners(decorated.properties), withoutOwners(explicit.properties));
    assert.equal(decorated.members[0].edit.read, undefined);
    assert.equal(decorated.properties[0].edit.persist, undefined);
    assert.equal(decorated.members[0].key, "_boosters");
    assert.equal(decorated.properties[0].key, "boosters");
    assert.deepEqual(decorated.fields.map(entry => entry.name), [ "_boosters", "boosters" ]);
    assert.equal(decorated.members[0].declaringClass, Decorated);
});

test("imperative metadata and explicit fields infer accessors without evaluating or replacing them", () =>
{
    let reads = 0;
    class Accessors
    {
        get value() { reads++; return 42; }
        set value(value) {}
    }
    const before = Object.getOwnPropertyDescriptor(Accessors.prototype, "value");
    CjsSchema.decorateField(Accessors, "value", meta.implemented, meta.type.float32);
    CjsSchema.define(Accessors, { className: "DeclarationAccessors", fields: { value: meta.blue.readwrite } });
    assert.equal(reads, 0);
    assert.deepEqual(Object.getOwnPropertyDescriptor(Accessors.prototype, "value"), before);
    assert.equal(CjsSchema.getSchema(Accessors).properties[0].impl.status, "implemented");
    assert.equal(CjsSchema.getSchema(Accessors).members.length, 0);

    const metadata = {};
    class AutoAccessor {}
    applyStage3(metadata, "value", "accessor", [ meta.implemented, meta.type.float32 ]);
    meta.define({ className: "DeclarationAutoAccessor" })(AutoAccessor, { kind: "class", metadata });
    assert.equal(CjsSchema.getSchema(AutoAccessor).properties[0].role, "property");
});

test("indexed declarations retain every route including index zero and reject exact duplicates", () =>
{
    class Indexed {}
    CjsSchema.define(Indexed, {
        className: "DeclarationIndexed",
        members: [
            { name: "x", key: "values", index: 0, type: { kind: "float32" } },
            { name: "y", key: "values", index: 1, type: { kind: "float32" } }
        ]
    });
    assert.deepEqual(CjsSchema.getSchema(Indexed).members.map(({ name, key, index }) => ({ name, key, index })),
        [ { name: "x", key: "values", index: 0 }, { name: "y", key: "values", index: 1 } ]);
    assert.deepEqual(CjsSchema.getSchema(Indexed).fields, [], "canonical inputs do not fabricate a lossy compatibility field");
    class Duplicate {}
    assert.throws(() => CjsSchema.define(Duplicate, {
        className: "DeclarationDuplicate",
        members: [ { name: "x", key: "values", index: 0 }, { name: "x", key: "values", index: 0 } ]
    }), /duplicate member/u);
    assert.throws(() => meta.member("x", { index: -1 }), /nonnegative safe integer/u);
    assert.throws(() => meta.member("x", { index: 0.5 }), /nonnegative safe integer/u);
    class IndexedDecorator {}
    CjsSchema.define(IndexedDecorator, {
        className: "DeclarationIndexedDecorator",
        fields: { values: [ meta.member("x", { index: 0 }), meta.type.float32 ] }
    });
    assert.equal(CjsSchema.getSchema(IndexedDecorator).members[0].index, 0);
});

test("explicit field declarations do not inherit a shadowed getter's live-property role", () =>
{
    let reads = 0;
    class Base { get value() { reads++; throw new Error("getter read"); } }
    CjsSchema.define(Base, { className: "DeclarationShadowBase", fields: { value: [ meta.type.int32, meta.blue.read ] } });
    class Explicit extends Base { value = 2; }
    CjsSchema.define(Explicit, { className: "DeclarationShadowExplicit", fields: { value: [ meta.type.int32, meta.blue.persist ] } });
    class Decorated extends Base { value = 2; }
    const metadata = {};
    applyStage3(metadata, "value", "field", [ meta.type.int32, meta.blue.persist ]);
    meta.define({ className: "DeclarationShadowDecorated" })(Decorated, { kind: "class", metadata });
    assert.deepEqual(withoutOwners(CjsSchema.getSchema(Explicit).members), withoutOwners(CjsSchema.getSchema(Decorated).members));
    assert.equal(CjsSchema.getSchema(Explicit).members[0].role, "member");
    assert.equal(CjsSchema.getSchema(Explicit).properties[0].declaringClass, Base);
    assert.equal(reads, 0);
});

test("canonical metadata cannot overwrite structural identity supplied by its declaration", () =>
{
    class WrongOwner {}
    class InvalidOwner {}
    assert.throws(() => CjsSchema.define(InvalidOwner, {
        className: "DeclarationInvalidOwner",
        members: [ { name: "value", key: "_value", declaringClass: WrongOwner } ]
    }), /reserved declaration identity/u);
    class InvalidKey {}
    assert.throws(() => CjsSchema.define(InvalidKey, {
        className: "DeclarationInvalidKey",
        properties: { value: { key: "other" } }
    }), /reserved declaration identity/u);
});

test("native tables keep class occurrences and derived-first ordering while legacy fields remain base-first", () =>
{
    class Base {}
    CjsSchema.define(Base, {
        className: "DeclarationBase",
        fields: { stored: [ meta.member("shared"), meta.type.float32, meta.blue.persist ], baseOnly: meta.type.uint32 }
    });
    class Derived extends Base { get shared() { throw new Error("getter read"); } }
    CjsSchema.define(Derived, {
        className: "DeclarationDerived",
        fields: { derivedOnly: meta.type.uint32, shared: [ meta.type.float32, meta.blue.readwrite ] },
        members: [ { name: "shared", key: "derivedStorage", type: { kind: "float32" } } ]
    });
    const schema = CjsSchema.getSchema(Derived);
    assert.deepEqual(schema.members.map(entry => [ entry.name, entry.key, entry.declaringClass ]), [
        [ "derivedOnly", "derivedOnly", Derived ], [ "shared", "derivedStorage", Derived ],
        [ "shared", "stored", Base ], [ "baseOnly", "baseOnly", Base ]
    ]);
    assert.deepEqual(schema.properties.map(entry => entry.name), [ "shared" ]);
    assert.deepEqual(schema.fields.map(entry => entry.name), [ "stored", "baseOnly", "derivedOnly", "shared" ]);
    assert.equal(CjsSchema.getField(Derived, "stored").edit.persist, true);

    class Repeated extends Base {}
    CjsSchema.define(Repeated, { className: "DeclarationRepeated", members: [ { name: "shared", key: "stored", type: { kind: "float64" } } ] });
    assert.equal(CjsSchema.getSchema(Repeated).members.filter(entry => entry.key === "stored").length, 2);
});

test("namespace projections preserve structural routes and filter descriptive metadata", () =>
{
    class Projected {}
    CjsSchema.define(Projected, {
        className: "DeclarationProjected",
        members: [ { name: "wireName", key: "array", index: 0, type: { kind: "uint32" }, edit: { persist: true }, enum: { values: { Zero: 0 } } } ]
    });
    const schema = CjsSchema.getSchema(Projected, { namespaces: [ "type" ] });
    assert.deepEqual(schema.members[0], {
        name: "wireName", key: "array", index: 0, role: "member", declaringClass: Projected, type: { kind: "uint32" }
    });
    assert.equal(CjsSchema.getSchema(Projected, { namespaces: [ "enum" ] }).members[0].edit, undefined);
    assert.deepEqual(CjsSchema.getSchema(Projected, { namespaces: [ "edit" ] }).members[0].edit, { persist: true, enum: true });
});

test("hideInherited resolves exact JS keys before exposed aliases and remains monotonic", () =>
{
    class Base {}
    CjsSchema.define(Base, {
        className: "DeclarationHiddenBase",
        members: [ { name: "shared", key: "_left" }, { name: "shared", key: "_right" } ],
        properties: [ { name: "shared", key: "shared" } ]
    });
    class Exact extends Base {}
    meta.hideInherited([ "shared" ])(Exact);
    CjsSchema.define(Exact, { className: "DeclarationHiddenExact" });
    assert.equal(CjsSchema.getSchema(Exact).members.length, 2);
    assert.equal(CjsSchema.getSchema(Exact).properties.length, 0);
    class Alias extends Exact {}
    meta.hideInherited([ "shared" ])(Alias);
    CjsSchema.define(Alias, { className: "DeclarationHiddenAlias" });
    assert.equal(CjsSchema.getSchema(Alias).members.length, 0);
    class Descendant extends Alias {}
    CjsSchema.define(Descendant, { className: "DeclarationHiddenDescendant", fields: { _left: meta.type.uint32 } });
    assert.equal(CjsSchema.getSchema(Descendant).members.length, 0);
    assert.equal(CjsSchema.getField(Descendant, "_left"), null);
    class Invalid extends Base {}
    assert.throws(() => meta.hideInherited([ "missing" ])(Invalid), /does not expose/u);
});

test("registration fixes canonical occurrences and invalidates cached exports without admitting later field changes", () =>
{
    class OpenBase {}
    CjsSchema.decorateField(OpenBase, "first", meta.type.uint32);
    class Registered extends OpenBase {}
    CjsSchema.define(Registered, { className: "DeclarationRegistered", fields: { own: meta.type.uint32 } });
    const initial = CjsSchema.getSchema(Registered);
    assert.equal(CjsSchema.getSchema(Registered), initial);
    assert.throws(() => CjsSchema.decorateField(Registered, "late", meta.type.uint32), /after it registered/u);
    CjsSchema.decorateField(OpenBase, "later", meta.type.uint32);
    const refreshed = CjsSchema.getSchema(Registered);
    assert.notEqual(refreshed, initial);
    assert.deepEqual(refreshed.members.map(entry => entry.name), [ "own", "first" ], "an unregistered ancestor cannot retroactively alter a registered table");
    assert.deepEqual(refreshed.fields.map(entry => entry.name), [ "first", "own" ]);
});


for (const kind of [ "list", "array" ])
{
    test(kind + " decorators reject inline native structure layouts", () =>
    {
        assert.throws(() => meta.type[kind]({ kind: "rawStruct", className: "SyntheticPair" }, { structure: {} }),
            /Inline structure layouts are removed/);
    });

    test(kind + " keeps its original descriptor when no structure is supplied", () =>
    {
        const itemType = { kind: "objectRef", className: "SyntheticChild" };
        class Legacy {}
        CjsSchema.define(Legacy, {
            className: "DeclarationStructuredLegacy" + kind,
            fields: {
                singleArgument: meta.type[kind](itemType),
                emptyOptions: meta.type[kind](itemType, {}),
                nonLayoutOptions: meta.type[kind](itemType, { kind: "map", itemType: "Replacement", unsupported: true })
            }
        });
        for (const member of CjsSchema.getSchema(Legacy).members)
        {
            assert.deepEqual(member.type, { kind, itemType });
            assert.equal(member.type.itemType, itemType);
            assert.equal(Object.hasOwn(member.type, "structure"), false);
        }
    });
}
