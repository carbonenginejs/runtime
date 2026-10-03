import "../../../src/global/blue/values.js";
import { Copier } from "../../../src/global/blue/Copier.js";
import { Traverse } from "../../../src/global/blue/find.js";
import { GetResources } from "../../../src/global/blue/getResources.js";
import { ensureRuntimeState, getRuntimeState } from "../../../src/global/compose/runtimeState.js";
import assert from "node:assert/strict";
import test from "node:test";
import * as document from "../../../src/global/model/document/index.js";
import * as lifecycle from "../../../src/global/model/lifecycle/index.js";
import * as model from "../../../src/global/model/index.js";
import * as schema from "../../../src/global/schema/index.js";
import * as types from "../../../src/global/schema/types/index.js";

const coreTypes = { ...document, ...lifecycle, ...model, ...schema, ...types };
const {
    CARBON_DOCUMENT_SCHEMA,
    CARBON_TYPE,
    CjsCarbonDocument,
    CjsClassRegistry,
    CjsDocumentDehydrator,
    CjsDocumentHydrator,
    CjsEventEmitter,
    CjsLifecycleState,
    CJS_LIFECYCLE,
    CjsSchema,
    CjsStructRegistry,
    defaultCarbonValue,
    exportCarbonValue,
    getLifecycleState,
    initializeLifecycleState,
    normalizeCarbonValue,
    normalizeCarbonTypeDescriptor
} = coreTypes;

test("the runtime model foundation exposes the raw emitter without an event scope layer", () => {
    assert.equal(coreTypes.CjsEventEmitter, CjsEventEmitter);
    assert.equal("CjsEventEmitterScope" in coreTypes, false);
});





test("lifecycle state can be installed independently of CjsModel", () => {
    const target = {};
    assert.equal(getLifecycleState(target), null);
    assert.equal(Object.hasOwn(target, "__state"), false);

    const lifecycle = initializeLifecycleState(target);

    assert.equal(lifecycle instanceof CjsLifecycleState, true);
    assert.equal(target.__state.lifecycle, lifecycle);
    assert.equal(initializeLifecycleState(target), lifecycle);
    assert.equal(getLifecycleState(target), lifecycle);
    assert.equal(Object.keys(target).includes("__state"), false);
    assert.equal(Object.getOwnPropertyDescriptor(target, "__state").writable, false);
    assert.equal(Object.getOwnPropertyDescriptor(target.__state, "lifecycle").writable, false);
    assert.throws(() => initializeLifecycleState(null), TypeError);
    assert.throws(() => getLifecycleState(null), TypeError);
});



// Removed: "CjsModel Merge deep-merges raw value bags..." - Merge: the feature has no Blue counterpart and no production caller, and was dropped with the move to Blue's values engine (operator, 2026-09-27; docs research/blue-values-engine.md).















test("objects nested in a raw struct's records keep their identity through a values round trip", () => {
    // Tr2EffectPassParameters.stageInput: records holding the effect's texture
    // parameters. The writer anchors the first sight inside a record; the
    // reader must build and register it there, or later aliases dangle.
    class NestedParam {}
    CjsSchema.defineField(NestedParam, "name", "type", { kind: "string" });
    CjsSchema.defineField(NestedParam, "name", "edit", { read: true, write: true, persist: true });
    CjsSchema.define(NestedParam, { className: "NestedParam" });

    class NestedHolder {}
    CjsSchema.defineField(NestedHolder, "records", "type", { kind: "rawStruct", className: "NestedRecord" });
    CjsSchema.defineField(NestedHolder, "params", "type", { kind: "list", itemType: "NestedParam" });
    CjsSchema.define(NestedHolder, { className: "NestedHolder" });

    const holder = new NestedHolder();
    const a = CjsSchema.from(CjsSchema.getClassName(NestedParam), { name: "a" });
    const b = CjsSchema.from(CjsSchema.getClassName(NestedParam), { name: "b" });
    holder.records = [ { textures: [ { sourceValue: a } ] }, { textures: [ { sourceValue: b } ] } ];
    holder.params = [ b, a ];

    const clone = CjsSchema.from(CjsSchema.getClassName(NestedHolder), CjsSchema.getValues(holder, {}, { refs: true, typeTags: true, roundTrip: true }));
    const [ ca, cb ] = [ clone.records[0].textures[0].sourceValue, clone.records[1].textures[0].sourceValue ];
    assert.equal(ca instanceof NestedParam, true);
    assert.equal(ca.name, "a");
    assert.notEqual(ca, a);
    assert.equal(clone.params[0], cb, "the list shares the record's object");
    assert.equal(clone.params[1], ca);

    // A forward alias inside a record fills in at the end of the read.
    const forward = CjsSchema.from(CjsSchema.getClassName(NestedHolder), {
        records: [ { textures: [ { sourceValue: { _ref: 7 } } ] } ],
        params: [ { _type: "NestedParam", _id: 7, name: "late" } ]
    });
    assert.equal(forward.records[0].textures[0].sourceValue, forward.params[0]);
});

test("clone keeps a member's concrete class and ignores read-only members", () => {
    // A member declared as a base holds a subclass: without its _type the clone
    // rebuilt the base. A READ-only member is not persisted: an object first
    // reached through it anchored there, and the reader, skipping the member,
    // left the later { _ref } dangling (EveImpactOverlay.damageOverlay).
    class BaseItem {}
    CjsSchema.defineField(BaseItem, "name", "type", { kind: "string" });
    CjsSchema.defineField(BaseItem, "name", "edit", { read: true, write: true, persist: true });
    CjsSchema.define(BaseItem, { className: "CloneBaseItem" });
    class DerivedItem extends BaseItem {}
    CjsSchema.defineField(DerivedItem, "extra", "type", { kind: "string" });
    CjsSchema.defineField(DerivedItem, "extra", "edit", { read: true, write: true, persist: true });
    CjsSchema.define(DerivedItem, { className: "CloneDerivedItem" });

    class Owner {}
    CjsSchema.defineField(Owner, "view", "type", { kind: "objectRef", className: "CloneBaseItem" });
    CjsSchema.defineField(Owner, "view", "edit", { read: true });
    CjsSchema.defineField(Owner, "item", "type", { kind: "objectRef", className: "CloneBaseItem" });
    CjsSchema.defineField(Owner, "item", "edit", { read: true, write: true, persist: true });
    CjsSchema.define(Owner, { className: "CloneOwner" });

    const owner = new Owner();
    owner.item = CjsSchema.from(CjsSchema.getClassName(DerivedItem), { name: "a", extra: "b" });
    owner.view = owner.item;

    const clone = new Copier().CloneTo(owner);
    assert.equal(clone.item instanceof DerivedItem, true);
    assert.equal(clone.item.extra, "b");
    assert.notEqual(clone.item, owner.item);
});

test("a field-less model exports and clones inside a graph", () => {
    // Its GetValues is the writer itself; asking it for its own values must
    // not recurse (EveChildModifierHalo overflowed the stack on clone).
    class EmptyModel {}
    CjsSchema.define(EmptyModel, { className: "EmptyModel" });
    class HolderModel {}
    CjsSchema.defineField(HolderModel, "items", "type", { kind: "list", itemType: "EmptyModel" });
    CjsSchema.defineField(HolderModel, "items", "edit", { read: true, write: true, persist: true });
    CjsSchema.define(HolderModel, { className: "HolderModel" });

    const holder = new HolderModel();
    holder.items = [ new EmptyModel(), new EmptyModel() ];
    assert.deepEqual(CjsSchema.getValues(new EmptyModel()), {});
    assert.deepEqual(CjsSchema.getValues(holder), { items: [ {}, {} ] });

    const clone = new Copier().CloneTo(holder);
    assert.equal(clone.items.length, 2);
    assert.equal(clone.items[0] instanceof EmptyModel, true);
    assert.notEqual(clone.items[0], holder.items[0]);
});

test("traversal children skip collections of values but keep interface-typed lists", () => {
    // A list of matrices or strings holds no model; walking it costs a visit
    // per item for nothing. A list typed by an interface nothing registers
    // (ITr2ValueBinding) holds objects, so it stays a child.
    class BucketModel {}
    CjsSchema.defineField(BucketModel, "instanceTransforms", "type", { kind: "array", itemType: "mat4" });
    CjsSchema.defineField(BucketModel, "names", "type", { kind: "list", itemType: "std::string" });
    CjsSchema.defineField(BucketModel, "indices", "type", { kind: "list", itemType: "uint32_t" });
    CjsSchema.defineField(BucketModel, "bindings", "type", { kind: "list", itemType: "ITr2ValueBinding" });
    CjsSchema.defineField(BucketModel, "items", "type", { kind: "list", itemType: "BucketModel" });
    CjsSchema.defineField(BucketModel, "loose", "type", { kind: "list" });
    CjsSchema.define(BucketModel, { className: "BucketModel" });

    const children = CjsSchema.getSchema(BucketModel).children.map(child => child.name);
    assert.deepEqual(children.sort(), ["bindings", "items", "loose"]);
});

test("Traverse is cycle-safe and GetResources visits every model", () => {
    class GraphResource { isResource = true; }
    CjsSchema.define(GraphResource, { className: "CoreTypesGraphResource" });
    class GraphModel {}
    for (const field of ["_geometryRes", "_textureRes", "_sharedRes"])
    {
        CjsSchema.decorateField(GraphModel, field, CjsSchema.meta.type.resource(GraphResource));
    }
    CjsSchema.defineField(GraphModel, "children", "type", { kind: "array", itemType: "GraphModel" });
    CjsSchema.defineField(GraphModel, "children", "edit", { read: true, write: true, persist: true });
    CjsSchema.defineField(GraphModel, "children", "lifecycle", { ownership: "owned" });
    CjsSchema.defineField(GraphModel, "peer", "type", { kind: "objectRef", className: "GraphModel" });
    CjsSchema.defineField(GraphModel, "peer", "edit", { read: true, write: true, persist: true });
    CjsSchema.defineField(GraphModel, "peer", "lifecycle", { ownership: "reference" });
    CjsSchema.define(GraphModel, { className: "GraphModel" });

    const root = new GraphModel();
    const branch = new GraphModel();
    const leaf = new GraphModel();
    root.children = [branch];
    branch.children = [leaf];
    leaf.peer = root;

    const visited = [];
    Traverse(root, model => visited.push(model));
    assert.deepEqual(visited, [root, branch, leaf]);

    // Runtime resource declarations must not suppress descendants; shared
    // dependencies are collected once in declaration encounter order.
    const resourceA = new GraphResource();
    const resourceB = new GraphResource();
    const resourceC = new GraphResource();
    branch._geometryRes = resourceA;
    branch._textureRes = resourceB;
    branch._sharedRes = resourceA;
    leaf._geometryRes = resourceC;

    // Prior contents are replaced, not accumulated into.
    assert.deepEqual(GetResources(root, [resourceC]), [resourceA, resourceB, resourceC]);
});

test("CjsEventEmitter normalizes names and supports external method sources", () => {
    const source = { count: 0 };
    const target = new CjsEventEmitter();
    const values = [];

    function onLoaded(name, value)
    {
        this.count++;
        values.push([this, name, value]);
    }

    assert.deepEqual(Object.getOwnPropertyNames(target), []);
    assert.equal(target.OnEvent("Loaded", onLoaded, source), target);
    assert.deepEqual(Object.getOwnPropertyNames(target), ["__state"]);
    assert.equal(Object.keys(target).includes("__state"), false);
    assert.equal(target.__state.events instanceof Map, true);
    assert.equal(target.HasListener("loaded", onLoaded, source), true);
    assert.deepEqual(target.GetEventNames(), ["loaded"]);

    target.EmitEvent("LOADED", 3);

    assert.deepEqual(values, [[source, "loaded", 3]], "the emitted name arrives normalized");
    assert.equal(source.count, 1);
    assert.equal(target.GetEventListenerCount("loaded"), 1);

    target.OffEvent("LoAdEd", onLoaded, source);
    target.EmitEvent("loaded", 4);

    assert.deepEqual(values, [[source, "loaded", 3]]);
    assert.equal(target.HasListener("loaded"), false);
    assert.equal(Object.hasOwn(target.__state, "events"), false);
});

test("CjsEventEmitter removes once listeners before callback completion", () => {
    const emitter = new CjsEventEmitter();
    let count = 0;

    emitter.OnceEvent("loaded", () => {
        count += 1;
        throw new Error("once failure");
    });

    assert.throws(() => emitter.EmitEvent("loaded"), /once failure/);
    emitter.EmitEvent("loaded");

    assert.equal(count, 1);
    assert.equal(emitter.GetEventListenerCount(), 0);
    assert.equal(emitter.HasListener("loaded"), false);
    assert.equal(Object.hasOwn(emitter.__state, "events"), false);
});

test("CjsEventEmitter removes one source across every event name", () => {
    const emitter = new CjsEventEmitter();
    const firstSource = {};
    const secondSource = {};
    const seen = [];

    function listener(name, value)
    {
        seen.push([this, name, value]);
    }

    emitter
        .OnEvent("loaded", listener, firstSource)
        .OnEvent("changed", listener, firstSource)
        .OnEvent("loaded", listener, secondSource);

    emitter.OffEvent("*", null, firstSource);

    assert.equal(emitter.HasListener("loaded", listener, firstSource), false);
    assert.equal(emitter.HasListener("changed", listener, firstSource), false);
    assert.equal(emitter.HasListener("loaded", listener, secondSource), true);

    emitter.EmitEvent("loaded", 1);
    emitter.EmitEvent("changed", 2);

    assert.deepEqual(seen, [[secondSource, "loaded", 1]]);
    assert.equal(emitter.GetEventListenerCount(), 1);
});

test("normalizes carbon values and exports plain JSON values", () => {
    const vector = normalizeCarbonValue([1, 2, 3], { jsType: { kind: CARBON_TYPE.VECTOR3 } });
    assert.equal(vector.constructor.name, "Float32Array");
    assert.deepEqual(Array.from(vector), [1, 2, 3]);

    const matrix = defaultCarbonValue({ jsType: { kind: CARBON_TYPE.MATRIX4 } });
    assert.equal(matrix.length, 16);
    assert.deepEqual(Array.from(matrix).slice(0, 4), [1, 0, 0, 0]);

    assert.equal(normalizeCarbonValue("257", { jsType: { kind: CARBON_TYPE.UINT8 } }), 1);
    // Unsigned clamp falls through to the safe-range Number path (an early
    // 0n return leaked BigInt into values interchange - fixed 2026-07-23).
    assert.equal(normalizeCarbonValue(-1, { jsType: { kind: CARBON_TYPE.UINT64 } }), 0);
    assert.deepEqual(exportCarbonValue(new BigUint64Array([1n, 2n])), ["1", "2"]);
});

test("infers source descriptors from C++ and Python type names", () => {
    assert.equal(normalizeCarbonTypeDescriptor({ cppType: "std::vector<Vector3>" }).kind, CARBON_TYPE.ARRAY);
    assert.equal(normalizeCarbonTypeDescriptor({ cppType: "TriMatrix" }).kind, CARBON_TYPE.MATRIX4);
    assert.equal(normalizeCarbonTypeDescriptor({ cppType: "Tr2Effect*" }).kind, CARBON_TYPE.OBJECT_REF);
    assert.equal(normalizeCarbonTypeDescriptor({ pythonType: "dict" }).kind, CARBON_TYPE.MAP);
});

test("creates and validates neutral Carbon documents", () => {
    const document = CjsCarbonDocument.create({
        format: "black",
        roots: [{ ref: { $ref: 1 } }],
        nodes: [{
            id: 1,
            kind: "DemoNode",
            fields: { name: "root" }
        }]
    });

    assert.equal(document.schema, CARBON_DOCUMENT_SCHEMA);
    assert.equal(document.format.id, "black");
    assert.deepEqual(document.roots[0], { name: "default", ref: { $ref: 1 } });
    assert.equal(CjsCarbonDocument.isDocument(document), true);
    assert.equal(CjsCarbonDocument.isRef({ $ref: 1 }), true);
});

test("throws when a hydratable document class is not registered", () => {
    const document = CjsCarbonDocument.create({
        format: "example",
        roots: [{ ref: { $ref: 1 } }],
        nodes: [{
            id: 1,
            kind: "DefinitelyMissingHydratableType",
            fields: {}
        }]
    });

    assert.throws(
        () => CjsDocumentHydrator.hydrate(document),
        /No class is registered for hydratable type DefinitelyMissingHydratableType/
    );
});

test("registers classes, structs, schema metadata, and enums", () => {
    class DemoNode {}
    const DemoEnum = Object.freeze({ A: 1, B: 2 });

    CjsSchema.defineField(DemoNode, "name", "type", { kind: "string" });
    CjsSchema.define(DemoNode, {
        className: "DemoNode",
        family: "test",
        purpose: "  Carries a reviewed\n demonstration purpose.  ",
        alias: "LegacyDemoNode"
    });
    CjsSchema.defineEnum(DemoEnum, {
        name: "DemoEnum",
        members: [{ name: "A", value: 1 }]
    });

    const registry = CjsClassRegistry.fromMaps({
        constructors: { DemoNode },
        aliases: { LegacyDemoNode: "DemoNode" }
    });
    const structs = CjsStructRegistry.fromMaps({
        constructors: { DemoStruct: class DemoStruct {} },
        aliases: { LegacyStruct: "DemoStruct" }
    });

    assert.equal(CjsSchema.GetConstructor("LegacyDemoNode"), DemoNode);
    assert.equal(CjsSchema.getField(DemoNode, "name").type.kind, "string");
    assert.equal(CjsSchema.getEnum(DemoEnum).name, "DemoEnum");
    assert.equal(CjsSchema.getClassPurpose(DemoNode), "Carries a reviewed demonstration purpose.");
    assert.equal(CjsSchema.getSchema(DemoNode).purpose, "Carries a reviewed demonstration purpose.");

    class DemoChild extends DemoNode {}
    assert.equal(CjsSchema.getClassFamily(DemoChild), "test");
    assert.equal(CjsSchema.getClassPurpose(DemoChild), null);
    assert.equal(CjsSchema.getSchema(DemoChild).purpose, undefined);

    class InvalidPurpose {}
    assert.throws(
        () => CjsSchema.define(InvalidPurpose, { className: "InvalidPurpose", purpose: "Invalid */ purpose." }),
        /cannot close a JSDoc comment/
    );
    assert.equal(registry.GetConstructor("LegacyDemoNode"), DemoNode);
    assert.equal(structs.Has("LegacyStruct"), true);
});

test("enum registration rejects a conflicting name without changing its object identity", () => {
    const first = Object.freeze({ FIRST: 1 });
    const second = Object.freeze({ SECOND: 2 });
    CjsSchema.defineEnum(first, { name: "EnumIdentityCollision", members: [{ name: "FIRST", value: 1 }] });
    const firstMetadata = CjsSchema.getEnum(first);
    assert.throws(() => CjsSchema.defineEnum(second, { name: "EnumIdentityCollision", members: [{ name: "SECOND", value: 2 }] }), /conflicts/);

    assert.equal(CjsSchema.getEnum(first), firstMetadata);
    assert.equal(CjsSchema.getEnum(second), null);
    assert.equal(CjsSchema.getEnum("EnumIdentityCollision"), firstMetadata);
});

test("schema.hideInherited removes inherited fields only from the schema surface", () => {
    class HideBase
    {
        visible = "visible-default";
        hidden = "hidden-default";
        secondHidden = "second-default";

        get hiddenValue()
        {
            return this.hidden;
        }
    }

    class HideChild extends HideBase
    {
        own = "own-default";
    }

    CjsSchema.define(HideBase, {
        className: "HideBase",
        fields: [
            { name: "visible", type: { kind: "string" }, edit: { read: true, write: true, persist: true } },
            { name: "hidden", type: { kind: "string" }, edit: { read: true, write: true, persist: true } },
            { name: "secondHidden", type: { kind: "string" }, edit: { read: true, write: true, persist: true } }
        ]
    });
    CjsSchema.hideInherited(["hidden"])(HideChild, {
        kind: "class",
        metadata: Object.create(null)
    });
    CjsSchema.define(HideChild, {
        className: "HideChild",
        fields: [
            { name: "own", type: { kind: "string" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    // A hidden or undeclared key is not a member the reader knows: it throws,
    // as Carbon's readers do (IRootReader.cpp:99-106; operator, 2026-09-27).
    assert.throws(() => CjsSchema.from(CjsSchema.getClassName(HideChild), { hidden: "hidden-loaded" }), /Invalid attribute: hidden/u);
    assert.throws(() => CjsSchema.from(CjsSchema.getClassName(HideChild), { unknown: "rejected" }), /Invalid attribute: unknown/u);

    const child = CjsSchema.from(CjsSchema.getClassName(HideChild), {
        visible: "visible-loaded",
        secondHidden: "second-loaded",
        own: "own-loaded"
    });

    assert.equal(child.hidden, "hidden-default");
    assert.equal(child.hiddenValue, "hidden-default");
    assert.equal(Object.hasOwn(child, "hidden"), true);
    assert.equal(Object.hasOwn(child, "unknown"), false);
    assert.equal(child instanceof HideChild, true);
    assert.equal(child instanceof HideBase, true);
    assert.equal(Object.getPrototypeOf(HideChild.prototype), HideBase.prototype);
    assert.throws(() => CjsSchema.setValues(child, { hidden: "still-rejected" }), /Invalid attribute: hidden/u);

    for (const options of [
        {},
        { persistOnly: true },
        { typeTags: true },
        { refs: true },
        { refs: true, typeTags: true }
    ])
    {
        assert.equal(Object.hasOwn(CjsSchema.getValues(child, {}, options), "hidden"), false);
    }

    assert.deepEqual(
        CjsSchema.getSchema(HideChild).fields.map(field => field.name),
        ["visible", "secondHidden", "own"]
    );
    assert.equal(CjsSchema.getField(HideBase, "hidden").type.kind, "string");
    assert.equal(CjsSchema.getField(HideChild, "hidden"), null);
    assert.equal(CjsSchema.isFieldHidden(HideChild, "hidden"), true);

    class HideGrandchild extends HideChild
    {
        hidden = "grandchild-hidden";
        extra = "extra-default";
    }

    CjsSchema.hideInherited(["secondHidden"])(HideGrandchild, {
        kind: "class",
        metadata: Object.create(null)
    });
    CjsSchema.define(HideGrandchild, {
        className: "HideGrandchild",
        fields: [
            { name: "hidden", type: { kind: "string" }, edit: { read: true, write: true, persist: true } },
            { name: "extra", type: { kind: "string" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    // There is no unhide: re-declaring "hidden" does not expose it again, so
    // both hidden names throw on the grandchild.
    assert.throws(() => CjsSchema.from(CjsSchema.getClassName(HideGrandchild), { hidden: "cannot-unhide" }), /Invalid attribute: hidden/u);
    assert.throws(() => CjsSchema.from(CjsSchema.getClassName(HideGrandchild), { secondHidden: "also-hidden" }), /Invalid attribute: secondHidden/u);
    const grandchild = CjsSchema.from(CjsSchema.getClassName(HideGrandchild), { extra: "extra-loaded" });

    assert.equal(grandchild.hidden, "grandchild-hidden");
    assert.equal(grandchild.secondHidden, "second-default");
    assert.equal(grandchild.extra, "extra-loaded");
    assert.deepEqual(
        CjsSchema.getSchema(HideGrandchild).fields.map(field => field.name),
        ["visible", "own", "extra"]
    );
});

test("schema.hideInherited registers through Stage-3 metadata and rejects typos", () => {
    class Stage3HideBase
    {
        visible = "visible";
        hidden = "hidden";
    }

    const baseMetadata = Object.create(null);
    const decorateField = (name, decorator) =>
    {
        decorator(undefined, {
            kind: "field",
            name,
            metadata: baseMetadata,
            addInitializer()
            {}
        });
    };

    decorateField("visible", CjsSchema.meta.type.string);
    decorateField("visible", CjsSchema.meta.blue.persist);
    decorateField("hidden", CjsSchema.meta.type.string);
    decorateField("hidden", CjsSchema.meta.blue.persist);
    CjsSchema.meta.define({ className: "Stage3HideBase" })(Stage3HideBase, {
        kind: "class",
        metadata: baseMetadata
    });

    class Stage3HideChild extends Stage3HideBase {}
    const childMetadata = Object.create(baseMetadata);
    CjsSchema.hideInherited(["hidden"])(Stage3HideChild, {
        kind: "class",
        metadata: childMetadata
    });
    CjsSchema.meta.define({ className: "Stage3HideChild" })(Stage3HideChild, {
        kind: "class",
        metadata: childMetadata
    });

    assert.deepEqual(
        CjsSchema.getSchema(Stage3HideChild).fields.map(field => field.name),
        ["visible"]
    );
    assert.deepEqual(CjsSchema.getValues(new Stage3HideChild()), { visible: "visible" });

    class Stage3TypoChild extends Stage3HideBase {}
    assert.throws(
        () => CjsSchema.hideInherited(["missingField"])(Stage3TypoChild, {
            kind: "class",
            metadata: Object.create(baseMetadata)
        }),
        /parent schema does not expose that field/
    );
    assert.throws(() => CjsSchema.hideInherited([]), /non-empty array/);
});

test("document hydration and dehydration exclude hidden inherited fields", () => {
    class HiddenDocumentBase
    {
        visible = "visible-default";
        hidden = "hidden-default";
    }

    class HiddenDocumentNode extends HiddenDocumentBase
    {
        own = "own-default";
    }

    CjsSchema.define(HiddenDocumentBase, {
        className: "HiddenDocumentBase",
        fields: [
            { name: "visible", type: { kind: "string" }, edit: { read: true, write: true, persist: true } },
            { name: "hidden", type: { kind: "string" }, edit: { read: true, write: true, persist: true } }
        ]
    });
    CjsSchema.hideInherited(["hidden"])(HiddenDocumentNode, {
        kind: "class",
        metadata: Object.create(null)
    });
    CjsSchema.define(HiddenDocumentNode, {
        className: "HiddenDocumentNode",
        fields: [
            { name: "own", type: { kind: "string" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    const registry = CjsClassRegistry.fromMaps({
        constructors: { HiddenDocumentNode }
    });
    const document = CjsCarbonDocument.create({
        format: "hidden-fields",
        roots: [{ ref: { $ref: 1 } }],
        nodes: [{
            id: 1,
            kind: "HiddenDocumentNode",
            fields: {
                visible: "visible-loaded",
                hidden: "hidden-from-fields",
                own: "own-loaded"
            },
            raw: {
                hidden: "hidden-from-raw",
                extra: "raw-extra"
            }
        }]
    });

    const hydrated = CjsDocumentHydrator.hydrate(document, { registry });
    assert.equal(hydrated.root.hidden, "hidden-default");
    assert.equal(hydrated.root.visible, "visible-loaded");
    assert.equal(hydrated.root.own, "own-loaded");
    assert.equal(hydrated.root.extra, "raw-extra");
    assert.deepEqual(hydrated.reports, []);

    const dehydrated = CjsDocumentDehydrator.dehydrate(hydrated.root);
    assert.equal(Object.hasOwn(dehydrated.nodes[0].fields, "hidden"), false);
    assert.equal(Object.hasOwn(dehydrated.nodes[0].raw || {}, "hidden"), false);
    assert.equal(dehydrated.nodes[0].raw.extra, "raw-extra");
});

test("schema constructor registration keeps the first name until explicit deletion", () => {
    class FirstConstructor {}
    class ReplacementConstructor {}

    assert.equal(CjsSchema.GetConstructor("DirectConstructorMapTest"), null);
    assert.equal(CjsSchema.SetConstructor(" DirectConstructorMapTest ", FirstConstructor), CjsSchema);
    assert.equal(CjsSchema.GetConstructor("DirectConstructorMapTest"), FirstConstructor);

    CjsSchema.SetConstructor("DirectConstructorMapTest", ReplacementConstructor);
    assert.equal(CjsSchema.GetConstructor("DirectConstructorMapTest"), FirstConstructor);
    assert.equal(CjsSchema.DeleteConstructor("DirectConstructorMapTest"), true);
    CjsSchema.SetConstructor("DirectConstructorMapTest", ReplacementConstructor);
    assert.equal(CjsSchema.GetConstructor("DirectConstructorMapTest"), ReplacementConstructor);
    assert.throws(() => CjsSchema.SetConstructor("", FirstConstructor), /non-empty name/);
    assert.throws(() => CjsSchema.SetConstructor("InvalidConstructorMapTest", {}), /must be a function/);
});

test("class and struct registries never infer serialized names from constructor.name", () => {
    class UnnamedClass {}
    class SchemaNamedClass {}
    class UnnamedStruct {}
    class SourceNamedStruct
    {
        static sourceStruct = "StableStructName";
    }

    CjsSchema.define(SchemaNamedClass, { className: "StableClassName" });

    assert.throws(
        () => new CjsClassRegistry({ entries: [{ constructor: UnnamedClass }] }),
        /missing a className/
    );
    assert.throws(
        () => new CjsStructRegistry({ entries: [{ constructor: UnnamedStruct }] }),
        /missing a structName/
    );

    const classes = new CjsClassRegistry({ entries: [{ constructor: SchemaNamedClass }] });
    const structs = new CjsStructRegistry({ entries: [{ constructor: SourceNamedStruct }] });
    assert.equal(classes.GetConstructor("StableClassName"), SchemaNamedClass);
    assert.equal(structs.GetConstructor("StableStructName"), SourceNamedStruct);
});

test("registers Carbon method provenance and implementation metadata", () => {
    class MethodNode
    {
        Reset()
        {}

        GpuOnly()
        {}
    }

    CjsSchema.define(MethodNode, { className: "MethodNode", family: "test" });
    CjsSchema.decorateMethod(
        MethodNode,
        "Reset",
        CjsSchema.meta.blue.method,
        CjsSchema.meta.notImplemented,
        CjsSchema.meta.reason("schema generated stub")
    );
    CjsSchema.decorateMethod(
        MethodNode,
        "GpuOnly",
        CjsSchema.meta.blue.method,
        CjsSchema.meta.notSupported,
        CjsSchema.meta.note("requires a native graphics boundary")
    );

    const reset = CjsSchema.getMethod(MethodNode, "Reset");
    assert.equal(reset.carbon.method, true);
    assert.equal(reset.impl.status, "notImplemented");
    assert.equal(reset.impl.notImplemented, true);
    assert.equal(reset.impl.reason, "schema generated stub");

    const gpuOnly = CjsSchema.getMethod(MethodNode, "GpuOnly");
    assert.equal(gpuOnly.carbon.method, true);
    assert.equal(gpuOnly.impl.status, "notSupported");
    assert.equal(gpuOnly.impl.notSupported, true);
    assert.equal(gpuOnly.impl.note, "requires a native graphics boundary");

    const exported = CjsSchema.getSchema(MethodNode);
    assert.deepEqual(exported.methods.map(method => method.name), ["Reset", "GpuOnly"]);
});

test("records renamed Carbon method provenance", () => {
    class RenamedMethodNode
    {
        ReEvaluate()
        {}
    }

    CjsSchema.define(RenamedMethodNode, { className: "RenamedMethodNode", family: "test" });
    CjsSchema.decorateMethod(
        RenamedMethodNode,
        "ReEvaluate",
        CjsSchema.meta.blue.renamed("UpdateValues"),
        CjsSchema.meta.adapted
    );

    const method = CjsSchema.getMethod(RenamedMethodNode, "ReEvaluate");
    assert.equal(method.carbon.method, true);
    assert.equal(method.carbon.renamed, true);
    assert.equal(method.carbon.originalName, "UpdateValues");
    assert.equal(method.impl.adapted, true);
});

test("registers component metadata and reads vector swizzles", () => {
    class PackedNode {}

    CjsSchema.decorateField(
        PackedNode,
        "shipData",
        CjsSchema.meta.type.vec4,
        CjsSchema.meta.ui.components({
            x: { name: "boosterGlowIntensity" },
            y: { name: "activationStrength" },
            z: { name: "dirtLevel" },
            w: { name: "boundingSphereRadius" },
            xyz: { name: "shipVisibleState" }
        })
    );
    CjsSchema.define(PackedNode, { className: "PackedNode", family: "test" });

    const field = CjsSchema.getField(PackedNode, "shipData");
    assert.equal(field.components.x.name, "boosterGlowIntensity");
    assert.equal(field.components.xyz.name, "shipVisibleState");

    const values = new Float32Array([2, 3, 5, 7]);
    assert.equal(CjsSchema.meta.ui.components.get(values, "x"), 2);
    assert.deepEqual(CjsSchema.meta.ui.components.get(values, "rgb"), [2, 3, 5]);

    CjsSchema.meta.ui.components.set(values, "yw", [11, 13]);
    assert.deepEqual(Array.from(values), [2, 11, 5, 13]);
});

test("exposes canonical model descriptors", () => {
    class DescriptorNode {}

    CjsSchema.decorateField(DescriptorNode, "child", CjsSchema.meta.type.model("DescriptorChild"));
    CjsSchema.decorateField(DescriptorNode, "payload", CjsSchema.meta.type.rawStruct("NativePayload"));
    CjsSchema.define(DescriptorNode, { className: "DescriptorNode", family: "test" });

    assert.equal(CARBON_TYPE.MODEL, "model");
    assert.deepEqual(CjsSchema.getField(DescriptorNode, "child").type, {
        kind: "model",
        className: "DescriptorChild"
    });
    assert.deepEqual(CjsSchema.getField(DescriptorNode, "payload").type, {
        kind: "rawStruct",
        className: "NativePayload"
    });
    assert.equal(normalizeCarbonTypeDescriptor({ kind: "model", className: "DescriptorChild" }).js, "object|null");
    assert.equal(defaultCarbonValue({ kind: "model", className: "DescriptorChild" }), null);
});

test("stage-3 static method decorators register on the class constructor", () => {
    class StaticMethodNode
    {
        static Rasterize()
        {}
    }

    const initializers = [];
    const context = {
        kind: "method",
        name: "Rasterize",
        static: true,
        addInitializer(initializer)
        {
            initializers.push(initializer);
        }
    };

    CjsSchema.meta.blue.method(StaticMethodNode.Rasterize, context);
    CjsSchema.meta.adapted(StaticMethodNode.Rasterize, context);
    for (const initializer of initializers)
    {
        initializer.call(StaticMethodNode);
    }

    CjsSchema.define(StaticMethodNode, {
        className: "StaticMethodNode",
        family: "test"
    });

    const rasterize = CjsSchema.getMethod(StaticMethodNode, "Rasterize");
    assert.equal(rasterize.carbon.method, true);
    assert.equal(rasterize.impl.status, "adapted");
    assert.equal(CjsSchema.getMethod(Function, "Rasterize"), null);
});

test("hydrates and dehydrates explicitly schema-backed runtime models", () => {
    class HydratedSchemaNode
    {
        name = "";
        position = new Float32Array([0, 0, 0]);
    }

    CjsSchema.defineField(HydratedSchemaNode, "name", "type", { kind: CARBON_TYPE.STRING });
    CjsSchema.defineField(HydratedSchemaNode, "position", "type", { kind: CARBON_TYPE.VECTOR3 });
    CjsSchema.define(HydratedSchemaNode, { className: "HydratedSchemaNode" });

    const registry = CjsClassRegistry.fromMaps({ constructors: { HydratedSchemaNode } });
    const document = CjsCarbonDocument.create({
        format: "black",
        roots: [{ ref: { $ref: 1 } }],
        nodes: [{
            id: 1,
            kind: "HydratedSchemaNode",
            fields: {
                name: "alpha",
                position: [3, 4, 5]
            }
        }]
    });

    const hydrated = CjsDocumentHydrator.hydrate(document, { registry });
    assert.equal(hydrated.root instanceof HydratedSchemaNode, true);
    assert.equal(hydrated.root.name, "alpha");
    assert.deepEqual(Array.from(hydrated.root.position), [3, 4, 5]);

    const dehydrated = CjsDocumentDehydrator.dehydrate(hydrated.root);
    assert.equal(dehydrated.nodes[0].kind, "HydratedSchemaNode");
    assert.deepEqual(dehydrated.nodes[0].fields.position, [3, 4, 5]);
});

test("preserves canonical model references while hydrating neutral document graphs", () => {
    class PlainDocumentChild
    {
        value = 0;
    }

    class PlainDocumentParent
    {
        child = null;
        children = [];
    }

    CjsSchema.defineField(PlainDocumentChild, "value", "type", { kind: CARBON_TYPE.FLOAT32 });
    CjsSchema.define(PlainDocumentChild, { className: "PlainDocumentChild" });
    CjsSchema.decorateField(PlainDocumentParent, "child", CjsSchema.meta.type.model("PlainDocumentChild"));
    CjsSchema.decorateField(PlainDocumentParent, "children", CjsSchema.meta.type.list({
        kind: "model",
        className: "PlainDocumentChild"
    }));
    CjsSchema.define(PlainDocumentParent, { className: "PlainDocumentParent" });

    const registry = CjsClassRegistry.fromMaps({
        constructors: { PlainDocumentChild, PlainDocumentParent }
    });
    const document = CjsCarbonDocument.create({
        format: "model-reference",
        roots: [{ ref: { $ref: 1 } }],
        nodes: [
            { id: 1, kind: "PlainDocumentParent", fields: { child: { $ref: 2 }, children: [{ $ref: 2 }] } },
            { id: 2, kind: "PlainDocumentChild", fields: { value: 7 } }
        ]
    });

    const hydrated = CjsDocumentHydrator.hydrate(document, { registry });
    assert.equal(hydrated.root.child, hydrated.get(2));
    assert.equal(hydrated.root.child instanceof PlainDocumentChild, true);
    assert.equal(hydrated.root.children[0], hydrated.get(2));
    assert.equal(hydrated.root.children[0] instanceof PlainDocumentChild, true);
    assert.equal(hydrated.root.child.value, 7);
    assert.equal(typeof hydrated.root.child.value, "number");
});

test("accepts explicit singular schema aliases for model input", () => {
    class AliasedFieldNode
    {
        dampingRatio = 0;
    }

    CjsSchema.defineField(AliasedFieldNode, "dampingRatio", "type", { kind: CARBON_TYPE.FLOAT32 });
    CjsSchema.defineField(AliasedFieldNode, "dampingRatio", "alias", "m_dampingRatio");
    CjsSchema.define(AliasedFieldNode, { className: "AliasedFieldNode" });

    const node = CjsSchema.from(CjsSchema.getClassName(AliasedFieldNode), { m_dampingRatio: "0.5" });
    assert.equal(node.dampingRatio, 0.5);
    assert.equal(Object.hasOwn(node, "m_dampingRatio"), false);
    assert.deepEqual(CjsSchema.getValues(node), { dampingRatio: 0.5 });
});

test("defines a complete hydratable schema from a manual JSON declaration", () => {
    class ManualSchemaNode
    {
        value = 0;
    }

    CjsSchema.define(ManualSchemaNode, {
        className: "ManualSchemaNode",
        alias: "LegacyManualSchemaNode",
        fields: [{
            name: "value",
            type: { kind: "float32" },
            edit: { read: true, write: true, persist: true }
        }]
    });

    const node = CjsSchema.from(CjsSchema.getClassName(ManualSchemaNode), { value: "1.25" });
    const schema = CjsSchema.getSchema(ManualSchemaNode);

    assert.equal(CjsSchema.GetConstructor("LegacyManualSchemaNode"), ManualSchemaNode);
    assert.equal(schema.className, "ManualSchemaNode");
    assert.deepEqual(schema.aliases, ["LegacyManualSchemaNode"]);
    assert.deepEqual(schema.fields, [{
        name: "value",
        type: { kind: "float32" },
        edit: { read: true, write: true, persist: true }
    }]);
    assert.deepEqual(CjsSchema.getValues(node), { value: 1.25 });
});

test("uses schema metadata as the default schema value shape", () => {
    class SchemaChild
    {
        label = "";
    }

    class SchemaNode
    {
        name = "";
        position = new Float32Array([0, 0, 0]);
        child = null;
        children = [];
        computed = 7;
        uiLocked = "open";
    }

    CjsSchema.defineField(SchemaChild, "label", "type", { kind: "string" });
    CjsSchema.define(SchemaChild, { className: "SchemaChild", family: "test" });

    CjsSchema.defineField(SchemaNode, "name", "type", { kind: "string" });
    CjsSchema.defineField(SchemaNode, "position", "type", { kind: "vec3" });
    CjsSchema.defineField(SchemaNode, "position", "edit", { notify: true });
    CjsSchema.defineField(SchemaNode, "child", "type", { kind: "struct", className: "SchemaChild" });
    CjsSchema.defineField(SchemaNode, "children", "type", {
        kind: "array",
        itemType: { kind: "struct", className: "SchemaChild" }
    });
    CjsSchema.defineField(SchemaNode, "computed", "type", { kind: "float32" });
    CjsSchema.defineField(SchemaNode, "computed", "edit", { read: true });
    CjsSchema.defineField(SchemaNode, "uiLocked", "type", { kind: "string" });
    CjsSchema.defineField(SchemaNode, "uiLocked", "jessica", { readOnly: true });
    CjsSchema.define(SchemaNode, { className: "SchemaNode", family: "test" });

    const node = new SchemaNode();
    CjsSchema.setValues(node, {
        name: "root",
        position: [1, 2, 3],
        child: { label: "one" },
        children: [{ label: "two" }],
        computed: 42,
        uiLocked: "changed"
    }, { markDirty: false });

    assert.deepEqual(Array.from(node.position), [1, 2, 3]);
    assert.equal(node.child instanceof SchemaChild, true);
    assert.equal(node.children[0] instanceof SchemaChild, true);
    assert.equal(node.computed, 7);
    assert.equal(node.uiLocked, "changed");
    assert.deepEqual(CjsSchema.getValues(node), {
        name: "root",
        position: [1, 2, 3],
        child: { label: "one" },
        children: [{ label: "two" }],
        computed: 7,
        uiLocked: "changed"
    });

    const dehydrated = CjsDocumentDehydrator.dehydrate(node);
    assert.deepEqual(dehydrated.nodes[0].fields.name, "root");
    assert.equal(dehydrated.nodes[0].raw, undefined);

    const source = {};
    (ensureRuntimeState(node).dirty = false);
    CjsSchema.setValues(node, { position: [4, 5, 6] }, { source, skipEvents: true, skipUpdate: true });
    assert.equal(node.__state.dirty, true);

    (ensureRuntimeState(node).dirty = false);
    CjsSchema.setValues(node, { position: [4, 5, 6] }, { source, skipEvents: true, skipUpdate: true });
    assert.equal((getRuntimeState(node)?.dirty === true), false, "an equal write does not mark dirty or notify");

    CjsSchema.setValues(node, { position: [7, 8, 9] }, { notify: false, source, skipEvents: true, skipUpdate: true });
    assert.equal(node.__state.dirty, true);

    (ensureRuntimeState(node).dirty = false);
    CjsSchema.setValues(node, { name: "renamed" }, { source, skipEvents: true, skipUpdate: true });
    assert.equal(node.__state.dirty, true);
});

test("hydrates canonical model fields and lists without constructing raw objects", () => {
    class CanonicalChild
    {
        label = "";
    }

    class CanonicalParent
    {
        child = null;
        children = [];
        payload = null;
        reference = null;
    }

    CjsSchema.defineField(CanonicalChild, "label", "type", { kind: "string" });
    CjsSchema.define(CanonicalChild, { className: "CanonicalChild", family: "test-model" });
    CjsSchema.defineField(CanonicalParent, "child", "type", { kind: "model", className: "CanonicalChild" });
    CjsSchema.defineField(CanonicalParent, "children", "type", {
        kind: "list",
        itemType: { kind: "model", className: "CanonicalChild" }
    });
    CjsSchema.defineField(CanonicalParent, "payload", "type", {
        kind: "rawStruct",
        className: "UnregisteredNativePayload"
    });
    CjsSchema.defineField(CanonicalParent, "reference", "type", {
        kind: "objectRef",
        className: "IRoot"
    });
    CjsSchema.define(CanonicalParent, { className: "CanonicalParent", family: "test-model" });

    const parent = CjsSchema.from(CjsSchema.getClassName(CanonicalParent), {
        child: { label: "one" },
        children: [{ label: "two" }],
        payload: { native: 7 }
    });
    assert.throws(() => CjsSchema.from(CjsSchema.getClassName(CanonicalParent), { reference: { name: "root" } }), /_type/u,
        "a typed member does not keep a plain object it cannot build (operator, 2026-09-26)");
    const existingChild = CjsSchema.from(CjsSchema.getClassName(CanonicalChild), { label: "existing" });
    const referencingParent = CjsSchema.from(CjsSchema.getClassName(CanonicalParent), {
        child: existingChild,
        children: [existingChild]
    });

    assert.equal(parent.child instanceof CanonicalChild, true);
    assert.equal(parent.children[0] instanceof CanonicalChild, true);
    assert.equal(referencingParent.child, existingChild);
    assert.equal(referencingParent.children[0], existingChild);
    assert.deepEqual(parent.payload, { native: 7 });
    assert.equal(parent.reference, null);
    assert.equal(CjsSchema.getClassName(parent.payload.constructor) !== null, false);
    assert.deepEqual(CjsSchema.getValues(parent), {
        child: { label: "one" },
        children: [{ label: "two" }],
        payload: { native: 7 },
        reference: null
    });
});

test("registered struct fields copy values into their constructor-owned instance", () => {
    class ValueStruct
    {
        position = new Float32Array(3);
        radius = 0;
    }

    class StructOwner
    {
        data = new ValueStruct();
    }

    CjsSchema.defineField(ValueStruct, "position", "type", { kind: "vec3" });
    CjsSchema.defineField(ValueStruct, "radius", "type", { kind: "float32" });
    CjsSchema.define(ValueStruct, { className: "ValueStruct" });
    CjsSchema.defineField(StructOwner, "data", "type", { kind: "struct", className: "ValueStruct" });
    CjsSchema.define(StructOwner, { className: "StructOwner" });

    const owner = new StructOwner();
    const data = owner.data;
    const position = data.position;
    const incoming = CjsSchema.from(CjsSchema.getClassName(ValueStruct), { position: [1, 2, 3], radius: 4 });

    CjsSchema.setValues(owner, { data: incoming }, { skipEvents: true, skipUpdate: true });

    assert.equal(owner.data, data);
    assert.notEqual(owner.data, incoming);
    assert.equal(owner.data.position, position);
    assert.deepEqual(Array.from(owner.data.position), [1, 2, 3]);
    assert.equal(owner.data.radius, 4);

    incoming.position[0] = 99;
    incoming.radius = 100;
    assert.deepEqual(Array.from(owner.data.position), [1, 2, 3]);
    assert.equal(owner.data.radius, 4);

    CjsSchema.setValues(owner, { data: { position: [5, 6, 7], radius: 8 } }, { skipEvents: true, skipUpdate: true });
    assert.equal(owner.data, data);
    assert.equal(owner.data.position, position);
    assert.deepEqual(Array.from(owner.data.position), [5, 6, 7]);
    assert.equal(owner.data.radius, 8);
});

test("hydrates list schema items as registered model classes", () => {
    class ListedChild
    {
        label = "";
    }

    class ListedParent
    {
        children = [];
    }

    CjsSchema.defineField(ListedChild, "label", "type", { kind: "string" });
    CjsSchema.define(ListedChild, { className: "ListedChild", family: "test-list" });
    CjsSchema.defineField(ListedParent, "children", "type", { kind: "list", itemType: "ListedChild" });
    CjsSchema.define(ListedParent, { className: "ListedParent", family: "test-list" });

    const parent = CjsSchema.from(CjsSchema.getClassName(ListedParent), { children: [{ label: "nested" }] });
    assert.equal(parent.children[0] instanceof ListedChild, true);
    assert.deepEqual(CjsSchema.getValues(parent), { children: [{ label: "nested" }] });
});

test("keeps unknown list item types as plain values", () => {
    class UnknownListNode
    {
        items = [];
    }

    CjsSchema.defineField(UnknownListNode, "items", "type", { kind: "list", itemType: "unknown" });
    CjsSchema.define(UnknownListNode, { className: "UnknownListNode" });

    const node = CjsSchema.from(CjsSchema.getClassName(UnknownListNode), { items: [{ value: 7 }] });
    assert.deepEqual(node.items, [{ value: 7 }]);
    assert.equal(CjsSchema.getClassName(node.items[0].constructor) !== null, false);
});

test("GetValues export options control persistence, type tags and refs", () => {
    class ExportChild
    {
        name = "";
        value = 0;
    }
    CjsSchema.define(ExportChild, {
        className: "ExportChild",
        fields: [
            { name: "name", type: { kind: "string" }, edit: { read: true, write: true, persist: true } },
            { name: "value", type: { kind: "float32" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    class ExportChildSpecial extends ExportChild
    {
    }
    CjsSchema.define(ExportChildSpecial, {
        className: "ExportChildSpecial",
        fields: [
            { name: "name", type: { kind: "string" }, edit: { read: true, write: true, persist: true } },
            { name: "value", type: { kind: "float32" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    class ExportRoot
    {
        name = "";
        runtimeFlag = false;
        child = null;
        children = [];
    }
    CjsSchema.define(ExportRoot, {
        className: "ExportRoot",
        fields: [
            { name: "name", type: { kind: "string" }, edit: { read: true, write: true, persist: true } },
            { name: "runtimeFlag", type: { kind: "boolean" }, edit: { read: true, write: true } },
            { name: "child", type: { kind: "objectRef", className: "ExportChild" }, edit: { read: true, persist: true } },
            { name: "children", type: { kind: "list", itemType: "ExportChild" }, edit: { read: true, persist: true } }
        ]
    });

    const shared = CjsSchema.from(CjsSchema.getClassName(ExportChild), { name: "shared", value: 1 });
    const special = CjsSchema.from(CjsSchema.getClassName(ExportChildSpecial), { name: "special", value: 2 });
    const root = new ExportRoot();
    root.name = "root";
    root.runtimeFlag = true;
    root.child = shared;
    root.children = [shared, special];

    assert.deepEqual(CjsSchema.getValues(root), {
        name: "root",
        runtimeFlag: true,
        child: { name: "shared", value: 1 },
        children: [{ name: "shared", value: 1 }, { name: "special", value: 2 }]
    });

    const persisted = CjsSchema.getValues(root, {}, { persistOnly: true });
    assert.equal("runtimeFlag" in persisted, false);
    assert.equal(persisted.name, "root");

    const tagged = CjsSchema.getValues(root, {}, { typeTags: true });
    assert.equal(tagged._type, "ExportRoot");
    assert.equal(tagged.child._type, undefined);
    assert.equal(tagged.children[0]._type, undefined);
    assert.equal(tagged.children[1]._type, "ExportChildSpecial");

    const forced = CjsSchema.getValues(root, {}, { forceTypeTags: true });
    assert.equal(forced.child._type, "ExportChild");
    assert.equal(forced.children[1]._type, "ExportChildSpecial");

    const withRefs = CjsSchema.getValues(root, {}, { refs: true });
    assert.equal(withRefs.child._id, 1);
    assert.deepEqual(withRefs.children[0], { _ref: 1 });
    assert.equal(withRefs.children[1]._id, undefined);

    // forceIDs and keyedLists are dropped: Blue's writers have neither, and
    // nothing in production asked for them (operator, 2026-09-27).

    const cyclic = new ExportRoot();
    cyclic.name = "cycle";
    cyclic.child = cyclic;
    const cycled = CjsSchema.getValues(cyclic, {}, { refs: true });
    assert.deepEqual(cycled.child, { _ref: cycled._id });

});

test("imports _ref identity: shared children, cycles, self and forward references", () => {
    class RefNode
    {
        name = "";
        next = null;
        items = [];
    }
    CjsSchema.define(RefNode, {
        className: "RefNode",
        fields: [
            { name: "name", type: { kind: "string" }, edit: { read: true, write: true, persist: true } },
            { name: "next", type: { kind: "objectRef", className: "RefNode" }, edit: { read: true, write: true, persist: true } },
            { name: "items", type: { kind: "list", itemType: "RefNode" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    // Shared child identity survives a JSON round trip without duplication.
    const shared = CjsSchema.from(CjsSchema.getClassName(RefNode), { name: "shared" });
    const root = new RefNode();
    root.name = "root";
    root.next = shared;
    root.items = [shared, CjsSchema.from(CjsSchema.getClassName(RefNode), { name: "solo" })];

    const values = JSON.parse(JSON.stringify(CjsSchema.getValues(root, {}, { refs: true, typeTags: true })));
    const hydrated = CjsSchema.from(CjsSchema.getClassName(RefNode), values);
    assert.equal(hydrated.next instanceof RefNode, true);
    assert.equal(hydrated.next.name, "shared");
    assert.equal(hydrated.items[0], hydrated.next);
    assert.equal(hydrated.items[1].name, "solo");
    assert.deepEqual(CjsSchema.getValues(hydrated), CjsSchema.getValues(root));

    // A cycle round-trips to the same instance without recursion failure.
    const cyclic = new RefNode();
    cyclic.name = "cycle";
    cyclic.next = cyclic;
    const cycled = CjsSchema.from(CjsSchema.getClassName(RefNode), JSON.parse(JSON.stringify(CjsSchema.getValues(cyclic, {}, { refs: true }))));
    assert.equal(cycled.next, cycled);

    // Forward references resolve during the owning operation's finalize pass.
    const forward = CjsSchema.from(CjsSchema.getClassName(RefNode), {
        name: "root",
        items: [{ _ref: 7 }, { _id: 7, name: "late" }]
    });
    assert.equal(forward.items[0], forward.items[1]);
    assert.equal(forward.items[0].name, "late");

    // SetValues shares the same identity table, including self-references.
    const target = new RefNode();
    CjsSchema.setValues(target, { _id: 3, name: "self", next: { _ref: 3 } });
    assert.equal(target.next, target);
});

test("from and singular imports honor polymorphic _type", () => {
    class PolyBase
    {
        name = "";
    }
    CjsSchema.define(PolyBase, {
        className: "PolyBase",
        fields: [
            { name: "name", type: { kind: "string" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    class PolySpecial extends PolyBase
    {
        extra = 0;
    }
    CjsSchema.define(PolySpecial, {
        className: "PolySpecial",
        fields: [
            { name: "name", type: { kind: "string" }, edit: { read: true, write: true, persist: true } },
            { name: "extra", type: { kind: "float32" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    class PolyHost
    {
        child = null;
    }
    CjsSchema.define(PolyHost, {
        className: "PolyHost",
        fields: [
            { name: "child", type: { kind: "objectRef", className: "PolyBase" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    // A singular field constructs the concrete subtype named by _type.
    const host = CjsSchema.from(CjsSchema.getClassName(PolyHost), { child: { _type: "PolySpecial", name: "s", extra: 2 } });
    assert.equal(host.child instanceof PolySpecial, true);
    assert.equal(host.child.extra, 2);

    // Root dispatch constructs the concrete subclass.
    const dispatched = CjsSchema.from(CjsSchema.getClassName(PolyBase), { _type: "PolySpecial", name: "d" });
    assert.equal(dispatched instanceof PolySpecial, true);

    // A typeTags export reimports concretely (no base-type downgrade).
    const round = CjsSchema.from(CjsSchema.getClassName(PolyHost), JSON.parse(JSON.stringify(CjsSchema.getValues(host, {}, { typeTags: true }))));
    assert.equal(round.child instanceof PolySpecial, true);
    assert.equal(round.child.extra, 2);

    // Base-class values may apply to a derived target.
    assert.equal(CjsSchema.setValues(new PolySpecial(), { _type: "PolyBase", name: "x" }) instanceof Set, true);

    // The shared factory dispatches the authored root type, including an unrelated class.
    assert.equal(CjsSchema.from(CjsSchema.getClassName(PolySpecial), { _type: "PolyHost" }) instanceof PolyHost, true);
    assert.throws(() => CjsSchema.from(CjsSchema.getClassName(PolyBase), { _type: "NoSuchRegisteredClass" }), TypeError);
    assert.throws(() => CjsSchema.setValues(new PolySpecial(), { _type: "PolyHost" }), TypeError);
});

test("reference import errors are loud and specific", () => {
    class StrictRefNode
    {
        name = "";
    }
    CjsSchema.define(StrictRefNode, {
        className: "StrictRefNode",
        fields: [
            { name: "name", type: { kind: "string" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    class StrictOther
    {
        name = "";
    }
    CjsSchema.define(StrictOther, {
        className: "StrictOther",
        fields: [
            { name: "name", type: { kind: "string" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    class StrictRefHost
    {
        node = null;
        nodes = [];
        others = [];
    }
    CjsSchema.define(StrictRefHost, {
        className: "StrictRefHost",
        fields: [
            { name: "node", type: { kind: "objectRef", className: "StrictRefNode" }, edit: { read: true, write: true, persist: true } },
            { name: "nodes", type: { kind: "list", itemType: "StrictRefNode" }, edit: { read: true, write: true, persist: true } },
            { name: "others", type: { kind: "list", itemType: "StrictOther" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    // An unresolved reference names the missing id.
    assert.throws(() => CjsSchema.from(CjsSchema.getClassName(StrictRefHost), { nodes: [{ _ref: 99 }] }), /Unresolved _ref ids: 99/);

    // Duplicate ids never silently rebind identity.
    assert.throws(
        () => CjsSchema.from(CjsSchema.getClassName(StrictRefHost), { nodes: [{ _id: 1, name: "a" }, { _id: 1, name: "b" }] }),
        /Duplicate _id 1/
    );

    // A root cannot be constructed from a bare reference.
    assert.throws(() => CjsSchema.from(CjsSchema.getClassName(StrictRefHost), { _ref: 1 }), TypeError);

    // A reference assigns like a direct instance: Carbon contracts may be
    // declared through interface names with no runtime inheritance, so a
    // resolved reference is not constrained by the declared field class.
    const crossTyped = CjsSchema.from(CjsSchema.getClassName(StrictRefHost), {
        others: [{ _id: 4, name: "o" }],
        node: { _ref: 4 }
    });
    assert.equal(crossTyped.node, crossTyped.others[0]);
});

// Removed: "keyed list maps accept _ref entries..." - keyed lists: the feature has no Blue counterpart and no production caller, and was dropped with the move to Blue's values engine (operator, 2026-09-27; docs research/blue-values-engine.md).

test("list items honor an explicit _type on input", () => {
    class MapChild
    {
        name = "";
        value = 0;
    }
    CjsSchema.define(MapChild, {
        className: "MapChild",
        fields: [
            { name: "name", type: { kind: "string" }, edit: { read: true, write: true, persist: true } },
            { name: "value", type: { kind: "float32" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    class MapChildAlt extends MapChild
    {
    }
    CjsSchema.define(MapChildAlt, {
        className: "MapChildAlt",
        fields: [
            { name: "name", type: { kind: "string" }, edit: { read: true, write: true, persist: true } },
            { name: "value", type: { kind: "float32" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    class MapHost
    {
        children = [];
    }
    CjsSchema.define(MapHost, {
        className: "MapHost",
        fields: [
            { name: "children", type: { kind: "list", itemType: "MapChild" }, edit: { read: true, write: true, persist: true } }
        ]
    });

    const host = new MapHost();
    // A list is read from a list (DictReader ReadList: "Expected a list"); the
    // name-keyed map form was dropped with keyed lists (operator, 2026-09-27).
    assert.throws(() => CjsSchema.setValues(host, { children: { a: { value: 1 } } }), TypeError);

    CjsSchema.setValues(host, { children: [{ _type: "MapChildAlt", name: "c", value: 3 }] });
    assert.equal(host.children.length, 1);
    assert.equal(host.children[0] instanceof MapChildAlt, true);
    assert.equal(host.children[0].name, "c");
    assert.equal(Array.isArray(host.children), true);
});

// Removed: "enum-backed fields validate on set and translate on export..." - enum member names on import, enumFormat on export and membership validation: Carbon's readers read enum members as integers (DictReader ReadValue). the feature has no Blue counterpart and no production caller, and was dropped with the move to Blue's values engine (operator, 2026-09-27; docs research/blue-values-engine.md).

test("records carbon.contextual tier provenance", () => {
    class ContextualNode
    {
        ApplyTransform(context, transform)
        {}
    }

    CjsSchema.define(ContextualNode, { className: "ContextualNode", family: "test" });
    CjsSchema.decorateMethod(
        ContextualNode,
        "ApplyTransform",
        CjsSchema.meta.blue.contextual(["camera"]),
        CjsSchema.meta.implemented
    );

    const method = CjsSchema.getMethod(ContextualNode, "ApplyTransform");
    assert.equal(method.carbon.method, true);
    assert.equal(method.carbon.contextual, true);
    assert.deepEqual(Array.from(method.carbon.contextTiers), ["camera"]);
    assert.equal(method.impl.implemented, true);

    // Rejects an empty tier list.
    assert.throws(() => CjsSchema.meta.blue.contextual([]), TypeError);
    assert.throws(() => CjsSchema.meta.blue.contextual(["  "]), TypeError);

    // Runtime validation must accept mangled parameters even when a default
    // expression retains a readable property name. Source lint owns spelling.
    class MinifiedContextual
    {
        ApplyTransform(abc, out = { readableProperty: true }) { return abc; }
    }
    CjsSchema.define(MinifiedContextual, { className: "MinifiedContextual", family: "test" });
    assert.doesNotThrow(() => CjsSchema.decorateMethod(MinifiedContextual,
        "ApplyTransform", CjsSchema.meta.blue.contextual(["camera"])));

    class ZeroArgContextual
    {
        Tick()
        {}
    }
    CjsSchema.define(ZeroArgContextual, { className: "ZeroArgContextual", family: "test" });
    // ARITY, not naming: a method taking nothing cannot have been given a
    // context, and `fn.length` survives minification where parameter NAMES do
    // not. Source lint, rather than runtime reflection, checks parameter names.
    assert.throws(
        () => CjsSchema.decorateMethod(ZeroArgContextual, "Tick", CjsSchema.meta.blue.contextual(["camera"])),
        /must take a context as its first parameter/
    );
});

test("marks CarbonEngineJS-original methods with impl.custom + a reason", () => {
    class CustomMethodNode
    {
        FoldModifiers()
        {}
    }

    CjsSchema.define(CustomMethodNode, { className: "CustomMethodNode", family: "test" });
    CjsSchema.decorateMethod(
        CustomMethodNode,
        "FoldModifiers",
        CjsSchema.meta.ours,
        CjsSchema.meta.reason("JS-only zero-alloc fold; Carbon inlines this loop")
    );

    const method = CjsSchema.getMethod(CustomMethodNode, "FoldModifiers");
    // No @carbon.method: this method has no Carbon counterpart.
    assert.equal(method.carbon, undefined);
    assert.equal(method.impl.custom, true);
    assert.equal(method.impl.status, "custom");
    assert.equal(method.impl.reason, "JS-only zero-alloc fold; Carbon inlines this loop");
});





test("type.enum and type.hideInherited are the same decorators as their schema.* spellings", () => {
    const { CjsSchema } = schema;

    // The migration to @type.* is only safe if both spellings produce the same
    // field metadata, so this compares what each actually attaches rather than
    // asserting they are the same function object.
    class EnumViaSchema
    {
        mode = 0;
    }
    class EnumViaType
    {
        mode = 0;
    }

    const members = Object.freeze({ OFF: 0, ON: 1 });

    EnumViaSchema.EnumMode = members;
    EnumViaType.EnumMode = members;

    CjsSchema.decorateField(EnumViaSchema, "mode", CjsSchema.meta.type.int32, CjsSchema.enum("EnumMode"));
    CjsSchema.decorateField(EnumViaType, "mode", CjsSchema.meta.type.int32, CjsSchema.meta.type.enum("EnumMode"));
    CjsSchema.define(EnumViaSchema, { className: "EnumViaSchema" });
    CjsSchema.define(EnumViaType, { className: "EnumViaType" });

    const viaSchema = CjsSchema.getSchema(EnumViaSchema).fields.find(field => field.name === "mode");
    const viaType = CjsSchema.getSchema(EnumViaType).fields.find(field => field.name === "mode");

    assert.equal(viaType.enum.enumType, "EnumMode");
    assert.deepEqual(viaType.enum.members, viaSchema.enum.members);
    assert.equal(viaType.enum.enumType, viaSchema.enum.enumType);

    // hideInherited is a class decorator; both spellings must hide the same field.
    class HideParent
    {
        kept = "kept";
        dropped = "dropped";
    }
    class HideViaType extends HideParent {}

    CjsSchema.define(HideParent, {
        className: "HideParent",
        fields: [
            { name: "kept", type: { kind: "string" } },
            { name: "dropped", type: { kind: "string" } }
        ]
    });
    CjsSchema.meta.hideInherited(["dropped"])(HideViaType, { kind: "class", metadata: Object.create(null) });
    CjsSchema.define(HideViaType, { className: "HideViaType" });

    const names = CjsSchema.getSchema(HideViaType).fields.map(field => field.name);
    assert.equal(names.includes("kept"), true);
    assert.equal(names.includes("dropped"), false, "type.hideInherited hid the inherited field");
});
