import * as schemaExports from "../../src/blue/schema/index.js";
import assert from "node:assert/strict";
import test from "node:test";
import { exposure as be } from "#be";
import { CjsSchema, meta, type } from "../../src/blue/schema/index.js";

/** Carbon-stamped legacy decorators; #schema no longer exports them. */
const blue = CjsSchema.be;

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
    assert.equal(Object.hasOwn(schemaExports, "blue"), false, "be comes from #be; blue is the service");
    // The edit-flag and property decorators are retired: flags and properties are exposure rows (map*).
    for (const name of ["read", "write", "readwrite", "notify", "hidden", "persist", "rpersist", "persistOnly", "property"])
    {
        assert.equal(Object.hasOwn(meta, name), false, "removed generic decorator: meta." + name);
        assert.equal(Object.hasOwn(CjsSchema.be, name), false, "removed Carbon decorator: CjsSchema.be." + name);
    }
    for (const name of ["interface", "inherit", "chainTo", "method", "define"])
        assert.equal(typeof CjsSchema.be[name], "function", "Carbon declaration: " + name);
    assert.equal(Object.hasOwn(CjsSchema.be, "attribute"), false, "removed: blue.attribute (be.mapAttribute names the member)");
    for (const name of ["edit", "impl", "lifecycle", "jessica", "compose", "custom"])
        assert.equal(Object.hasOwn(meta, name), false, "removed meta alias: " + name);
    for (const name of ["none", "enum", "setting"])
        assert.equal(Object.hasOwn(blue, name), false, "removed Blue alias: " + name);
    for (const name of ["define", "hideInherited"])
        assert.equal(Object.hasOwn(type, name), false, "class declaration is flat: " + name);
    // The target class-origin vocabulary coexists with the legacy Blue stamps.
    for (const name of ["carbon", "interface", "inherit", "notUsed"]) assert.equal(typeof meta[name], "function");
    // Status-only markers are JSDoc tags (decorator-upgrade.md § 00, 2026-10-30).
    for (const name of ["implemented", "adapted", "notImplemented", "notSupported", "renamed", "cjs"]) assert.equal(Object.hasOwn(meta, name), false, "tag, not decorator: " + name);
    assert.equal(Object.hasOwn(meta, "ours"), false);
    // Amendment 2026-10-17: the stored-member declaration is `attribute` (MAP_ATTRIBUTE).
    assert.equal(typeof meta.mapAttribute, "function");
    assert.equal(Object.hasOwn(meta, "member"), false, "removed: meta.member");
    class Types {}
    CjsSchema.define(Types, {
        name: "DeclarationTypes",
        fields: { text: type.wstring, peer: type.object.weak("DeclarationTypes") }
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
    applyStage3(metadata, "_boosters", "field", [ be.mapAttribute(be.PERSISTONLY, "boosters"), type.rootRef("Booster") ]);
    applyStage3(metadata, "boosters", "getter", [ type.rootRef("Booster"), be.mapProperty(), meta.note("probe") ]);
    meta.define({ name: "DeclarationDecorated" })(Decorated, { kind: "class", metadata });

    class Explicit
    {
        get boosters() { throw new Error("registration evaluated a getter"); }
        set boosters(value) {}
    }
    CjsSchema.define(Explicit, {
        name: "DeclarationExplicit",
        members: [ { name: "boosters", key: "_boosters", type: { kind: "rootRef", className: "Booster" }, edit: { persist: true, persistOnly: true, hidden: true }, carbon: { member: true }, exposure: { macro: "MAP_ATTRIBUTE", flags: 24 } } ],
        properties: {
            boosters: [ type.rootRef("Booster"), be.mapProperty(), meta.note("probe") ]
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

test("meta.mapAttribute names a member as ours and be.mapAttribute__Index carries the element index", () =>
{
    class Ours {}
    CjsSchema.define(Ours, {
        name: "DeclarationAttributeOurs",
        fields: { _ratio: [ meta.mapAttribute(meta.NONE, "ratio"), type.float32 ] }
    });
    class Carbon {}
    CjsSchema.define(Carbon, {
        name: "DeclarationAttributeCarbon",
        fields: { dampingRatio: [ be.mapAttribute(be.NONE, "m_dampingRatio"), type.float32 ] }
    });
    const [ ours ] = CjsSchema.getSchema(Ours).members;
    const [ carbon ] = CjsSchema.getSchema(Carbon).members;
    assert.deepEqual({ name: ours.name, key: ours.key }, { name: "ratio", key: "_ratio" });
    assert.equal(ours.carbon?.member, undefined);
    assert.deepEqual({ name: carbon.name, key: carbon.key }, { name: "m_dampingRatio", key: "dampingRatio" });
    assert.equal(carbon.carbon.member, true);
    assert.throws(() => be.mapAttribute__Index(be.NONE, "x", -1), /element index/u);
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
    CjsSchema.decorateField(Accessors, "value", meta.note("probe"), type.float32);
    CjsSchema.define(Accessors, { name: "DeclarationAccessors", fields: { value: be.mapProperty() } });
    assert.equal(reads, 0);
    assert.deepEqual(Object.getOwnPropertyDescriptor(Accessors.prototype, "value"), before);
    assert.equal(CjsSchema.getSchema(Accessors).properties[0].impl.note, "probe");
    assert.equal(CjsSchema.getSchema(Accessors).members.length, 0);

    const metadata = {};
    class AutoAccessor {}
    applyStage3(metadata, "value", "accessor", [ meta.note("probe") ]);
    meta.define({ name: "DeclarationAutoAccessor" })(AutoAccessor, { kind: "class", metadata });
    assert.equal(CjsSchema.getSchema(AutoAccessor).properties[0].role, "property");
});

test("indexed declarations retain every route including index zero and reject exact duplicates", () =>
{
    class Indexed {}
    CjsSchema.define(Indexed, {
        name: "DeclarationIndexed",
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
        name: "DeclarationDuplicate",
        members: [ { name: "x", key: "values", index: 0 }, { name: "x", key: "values", index: 0 } ]
    }), /duplicate member/u);
    assert.throws(() => be.mapAttribute__Index(be.NONE, "x", 0.5), /element index/u);
    class IndexedDecorator {}
    CjsSchema.define(IndexedDecorator, {
        name: "DeclarationIndexedDecorator",
        fields: { values: [ be.mapAttribute__Index(be.NONE, "x", 0), type.float32 ] }
    });
    assert.equal(CjsSchema.getSchema(IndexedDecorator).members[0].index, 0);
});

test("explicit field declarations do not inherit a shadowed getter's live-property role", () =>
{
    let reads = 0;
    class Base { get value() { reads++; throw new Error("getter read"); } }
    CjsSchema.define(Base, { name: "DeclarationShadowBase", fields: { value: [ be.mapPropertyReadOnly(), type.int32 ] } });
    class Explicit extends Base { value = 2; }
    CjsSchema.define(Explicit, { name: "DeclarationShadowExplicit", fields: { value: [ type.int32, be.mapAttribute(be.PERSIST) ] } });
    class Decorated extends Base { value = 2; }
    const metadata = {};
    applyStage3(metadata, "value", "field", [ type.int32, be.mapAttribute(be.PERSIST) ]);
    meta.define({ name: "DeclarationShadowDecorated" })(Decorated, { kind: "class", metadata });
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
        name: "DeclarationInvalidOwner",
        members: [ { name: "value", key: "_value", declaringClass: WrongOwner } ]
    }), /reserved declaration identity/u);
    class InvalidKey {}
    assert.throws(() => CjsSchema.define(InvalidKey, {
        name: "DeclarationInvalidKey",
        properties: { value: { key: "other" } }
    }), /reserved declaration identity/u);
});

test("native tables keep class occurrences and derived-first ordering while legacy fields remain base-first", () =>
{
    class Base {}
    CjsSchema.define(Base, {
        name: "DeclarationBase",
        fields: { stored: [ meta.mapAttribute(meta.NONE, "shared"), type.float32, be.mapAttribute(be.PERSIST) ], baseOnly: type.uint32 }
    });
    class Derived extends Base { get shared() { throw new Error("getter read"); } }
    CjsSchema.define(Derived, {
        name: "DeclarationDerived",
        fields: { derivedOnly: type.uint32, shared: [ be.mapPropertyReadOnly(), type.float32 ] },
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
    CjsSchema.define(Repeated, { name: "DeclarationRepeated", members: [ { name: "shared", key: "stored", type: { kind: "float64" } } ] });
    assert.equal(CjsSchema.getSchema(Repeated).members.filter(entry => entry.key === "stored").length, 2);
});

test("namespace projections preserve structural routes and filter descriptive metadata", () =>
{
    class Projected {}
    CjsSchema.define(Projected, {
        name: "DeclarationProjected",
        members: [ { name: "wireName", key: "array", index: 0, type: { kind: "uint32" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, edit: { persist: true }, enum: { values: { Zero: 0 } } } ]
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
        name: "DeclarationHiddenBase",
        members: [ { name: "shared", key: "_left" }, { name: "shared", key: "_right" } ],
        properties: [ { name: "shared", key: "shared" } ]
    });
    class Exact extends Base {}
    meta.hideInherited([ "shared" ])(Exact);
    CjsSchema.define(Exact, { name: "DeclarationHiddenExact" });
    assert.equal(CjsSchema.getSchema(Exact).members.length, 2);
    assert.equal(CjsSchema.getSchema(Exact).properties.length, 0);
    class Alias extends Exact {}
    meta.hideInherited([ "shared" ])(Alias);
    CjsSchema.define(Alias, { name: "DeclarationHiddenAlias" });
    assert.equal(CjsSchema.getSchema(Alias).members.length, 0);
    class Descendant extends Alias {}
    CjsSchema.define(Descendant, { name: "DeclarationHiddenDescendant", fields: { _left: type.uint32 } });
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
    CjsSchema.define(Registered, { name: "DeclarationRegistered", fields: { own: type.uint32 } });
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
            name: "DeclarationStructuredLegacy" + kind,
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
