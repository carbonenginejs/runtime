import * as schemaExports from "../../src/global/schema/index.js";
import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema, meta, type, blue } from "../../src/global/schema/index.js";

function withoutOwners(entries)
{
    // A property records its own class's getter and setter, which differ per class.
    return entries.map(({ declaringClass, ...entry }) => entry.property
        ? { ...entry, property: { persisted: entry.property.persisted } }
        : entry);
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
    for (const name of ["types", "edit", "impl", "carbon", "lifecycle", "jessica", "compose", "components"])
    {
        assert.equal(Object.hasOwn(schemaExports, name), false, "removed export: " + name);
        assert.equal(Object.hasOwn(CjsSchema, name), false, "removed class alias: " + name);
    }
    // Ruling 2026-10-15: meta (generic), type (vocabulary), blue (Carbon-stamped).
    assert.equal(schemaExports.type, CjsSchema.type);
    for (const name of ["blue", "type"]) assert.equal(Object.hasOwn(meta, name), false, "alias dropped: meta." + name);
    assert.equal(schemaExports.blue, CjsSchema.blue);
    for (const name of ["read", "write", "readwrite", "notify", "hidden", "persist", "rpersist", "persistOnly"])
    {
        assert.equal(typeof meta[name], "function", "generic flag: " + name);
        assert.equal(typeof CjsSchema.blue[name], "function", "Carbon flag: " + name);
    }
    for (const name of ["interface", "inherit", "chainTo", "method", "define", "attribute"])
        assert.equal(typeof CjsSchema.blue[name], "function", "Carbon declaration: " + name);
    for (const name of ["edit", "impl", "lifecycle", "jessica", "compose", "custom"])
        assert.equal(Object.hasOwn(meta, name), false, "removed meta alias: " + name);
    for (const name of ["none", "enum", "setting"])
        assert.equal(Object.hasOwn(blue, name), false, "removed Blue alias: " + name);
    for (const name of ["define", "hideInherited"])
        assert.equal(Object.hasOwn(type, name), false, "class declaration is flat: " + name);
    // The target class-origin vocabulary coexists with the legacy Blue stamps.
    for (const name of ["carbon", "interface", "inherit", "cjs", "notUsed"]) assert.equal(typeof meta[name], "function");
    assert.equal(Object.hasOwn(meta, "ours"), false);
    // Amendment 2026-10-17: the stored-member declaration is `attribute` (MAP_ATTRIBUTE).
    assert.equal(typeof meta.attribute, "function");
    assert.equal(Object.hasOwn(meta, "member"), false, "removed: meta.member");
    class Types {}
    CjsSchema.define(Types, {
        className: "DeclarationTypes",
        fields: { text: type.wstring, peer: type.rootWeak("DeclarationTypes") }
    });
    assert.deepEqual(CjsSchema.getSchema(Types).members.map(entry => entry.type),
        [ { kind: "wstring" }, { kind: "rootWeak", className: "DeclarationTypes" } ]);
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
    applyStage3(metadata, "_boosters", "field", [ blue.attribute("boosters"), type.rootRef("Booster"), blue.persistOnly ]);
    applyStage3(metadata, "boosters", "getter", [ type.rootRef("Booster"), blue.property(), meta.implemented ]);
    meta.define({ className: "DeclarationDecorated" })(Decorated, { kind: "class", metadata });

    class Explicit
    {
        get boosters() { throw new Error("registration evaluated a getter"); }
        set boosters(value) {}
    }
    CjsSchema.define(Explicit, {
        className: "DeclarationExplicit",
        members: [ { name: "boosters", key: "_boosters", type: { kind: "rootRef", className: "Booster" }, edit: { persist: true, persistOnly: true, hidden: true }, carbon: { member: true } } ],
        properties: {
            boosters: [ type.rootRef("Booster"), blue.property(), meta.implemented ]
        }
    });
    const decorated = CjsSchema.getSchema(Decorated);
    const explicit = CjsSchema.getSchema(Explicit);
    assert.equal(constructions, 0);
    assert.deepEqual(withoutOwners(decorated.members), withoutOwners(explicit.members));
    assert.deepEqual(withoutOwners(decorated.properties), withoutOwners(explicit.properties));
    assert.equal(decorated.members[0].edit.read, undefined);
    assert.equal(decorated.properties[0].edit.persist, undefined);
    assert.deepEqual(decorated.properties[0].edit, { read: true, write: true }, "MAP_PROPERTY is READWRITE");
    assert.equal(decorated.properties[0].property.getter, Object.getOwnPropertyDescriptor(Decorated.prototype, "boosters").get);
    assert.equal(decorated.members[0].key, "_boosters");
    assert.equal(decorated.properties[0].key, "boosters");
    assert.deepEqual(decorated.fields.map(entry => entry.name), [ "_boosters", "boosters" ]);
    assert.equal(decorated.members[0].declaringClass, Decorated);
});

test("blue.attribute is meta.attribute stamped as Carbon's member", () =>
{
    class Ours {}
    CjsSchema.define(Ours, {
        className: "DeclarationAttributeOurs",
        fields: { _ratio: [ meta.attribute("ratio", { index: 2 }), type.float32 ] }
    });
    class Carbon {}
    CjsSchema.define(Carbon, {
        className: "DeclarationAttributeCarbon",
        fields: { dampingRatio: [ blue.attribute("m_dampingRatio"), type.float32 ] }
    });
    const [ ours ] = CjsSchema.getSchema(Ours).members;
    const [ carbon ] = CjsSchema.getSchema(Carbon).members;
    assert.deepEqual({ name: ours.name, key: ours.key, index: ours.index }, { name: "ratio", key: "_ratio", index: 2 });
    assert.equal(ours.carbon?.member, undefined);
    assert.deepEqual({ name: carbon.name, key: carbon.key }, { name: "m_dampingRatio", key: "dampingRatio" });
    assert.equal(carbon.carbon.member, true);
    assert.throws(() => blue.attribute("x", { index: -1 }), /nonnegative safe integer/u);
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
    CjsSchema.decorateField(Accessors, "value", meta.implemented, type.float32);
    CjsSchema.define(Accessors, { className: "DeclarationAccessors", fields: { value: blue.property() } });
    assert.equal(reads, 0);
    assert.deepEqual(Object.getOwnPropertyDescriptor(Accessors.prototype, "value"), before);
    assert.equal(CjsSchema.getSchema(Accessors).properties[0].impl.status, "implemented");
    assert.equal(CjsSchema.getSchema(Accessors).members.length, 0);

    const metadata = {};
    class AutoAccessor {}
    applyStage3(metadata, "value", "accessor", [ meta.implemented ]);
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
    assert.throws(() => meta.attribute("x", { index: -1 }), /nonnegative safe integer/u);
    assert.throws(() => meta.attribute("x", { index: 0.5 }), /nonnegative safe integer/u);
    class IndexedDecorator {}
    CjsSchema.define(IndexedDecorator, {
        className: "DeclarationIndexedDecorator",
        fields: { values: [ meta.attribute("x", { index: 0 }), type.float32 ] }
    });
    assert.equal(CjsSchema.getSchema(IndexedDecorator).members[0].index, 0);
});

test("explicit field declarations do not inherit a shadowed getter's live-property role", () =>
{
    let reads = 0;
    class Base { get value() { reads++; throw new Error("getter read"); } }
    CjsSchema.define(Base, { className: "DeclarationShadowBase", fields: { value: [ blue.property(), type.int32 ] } });
    class Explicit extends Base { value = 2; }
    CjsSchema.define(Explicit, { className: "DeclarationShadowExplicit", fields: { value: [ type.int32, blue.persist ] } });
    class Decorated extends Base { value = 2; }
    const metadata = {};
    applyStage3(metadata, "value", "field", [ type.int32, blue.persist ]);
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
        fields: { stored: [ meta.attribute("shared"), type.float32, blue.persist ], baseOnly: type.uint32 }
    });
    class Derived extends Base { get shared() { throw new Error("getter read"); } }
    CjsSchema.define(Derived, {
        className: "DeclarationDerived",
        fields: { derivedOnly: type.uint32, shared: [ blue.property(), type.float32 ] },
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
    assert.deepEqual(CjsSchema.getSchema(Projected, { namespaces: [ "edit" ] }).members[0].edit, { persist: true });
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
    CjsSchema.define(Descendant, { className: "DeclarationHiddenDescendant", fields: { _left: type.uint32 } });
    assert.equal(CjsSchema.getSchema(Descendant).members.length, 0);
    assert.equal(CjsSchema.getField(Descendant, "_left"), null);
    class Invalid extends Base {}
    assert.throws(() => meta.hideInherited([ "missing" ])(Invalid), /does not expose/u);
});

test("registration fixes canonical occurrences and invalidates cached exports without admitting later field changes", () =>
{
    class OpenBase {}
    CjsSchema.decorateField(OpenBase, "first", type.uint32);
    class Registered extends OpenBase {}
    CjsSchema.define(Registered, { className: "DeclarationRegistered", fields: { own: type.uint32 } });
    const initial = CjsSchema.getSchema(Registered);
    assert.equal(CjsSchema.getSchema(Registered), initial);
    assert.throws(() => CjsSchema.decorateField(Registered, "late", type.uint32), /after it registered/u);
    CjsSchema.decorateField(OpenBase, "later", type.uint32);
    const refreshed = CjsSchema.getSchema(Registered);
    assert.notEqual(refreshed, initial);
    assert.deepEqual(refreshed.members.map(entry => entry.name), [ "own", "first" ], "an unregistered ancestor cannot retroactively alter a registered table");
    assert.deepEqual(refreshed.fields.map(entry => entry.name), [ "first", "own" ]);
});


for (const kind of [ "list", "array" ])
{
    test(kind + " decorators reject inline native structure layouts", () =>
    {
        assert.throws(() => type[kind]({ kind: "rawStruct", className: "SyntheticPair" }, { structure: {} }),
            /Inline structure layouts are removed/);
    });

    test(kind + " keeps its original descriptor when no structure is supplied", () =>
    {
        const itemType = { kind: "rootRef", className: "SyntheticChild" };
        class Legacy {}
        CjsSchema.define(Legacy, {
            className: "DeclarationStructuredLegacy" + kind,
            fields: {
                singleArgument: type[kind](itemType),
                emptyOptions: type[kind](itemType, {}),
                nonLayoutOptions: type[kind](itemType, { kind: "map", itemType: "Replacement", unsupported: true })
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
