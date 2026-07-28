import assert from "node:assert/strict";
import test from "node:test";
import * as document from "../src/document/index.js";
import * as lifecycle from "../src/lifecycle/index.js";
import * as model from "../src/model/index.js";
import * as schema from "../src/schema/index.js";
import * as types from "../src/types/index.js";

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
    CjsModel,
    CjsModelState,
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

test("runtime-utils exposes the raw emitter without an event scope layer", () => {
    assert.equal(coreTypes.CjsEventEmitter, CjsEventEmitter);
    assert.equal("CjsEventEmitterScope" in coreTypes, false);
});

test("CjsModelState is the flat per-model runtime state", () => {
    const state = new CjsModelState();

    assert.equal(state.IsDirty(), false);
    state.MarkDirty();
    assert.equal(state.dirty, true);
    assert.equal(state.IsDirty(), true);
    state.ClearDirty();
    assert.equal(state.IsDirty(), false);

    // flags/rebuild are consumer-cleared Sets; nothing generic manages them.
    state.flags.add("bounds").add("bounds");
    state.rebuild.add("vertices");
    assert.deepEqual(state.flags, new Set(["bounds"]));
    assert.deepEqual(state.rebuild, new Set(["vertices"]));
    state.MarkDirty().ClearDirty();
    assert.equal(state.flags.size, 1);
    assert.equal(state.rebuild.size, 1);
});

test("CjsModel keeps model state in one non-enumerable container", () => {
    const model = new CjsModel();

    assert.equal(Object.keys(model).includes("__state"), false);
    assert.equal(model.__state instanceof CjsModelState, true);
    assert.equal(model.__state.dirty, false);
    assert.equal(model.__state.flags instanceof Set, true);
    assert.equal(model.__state.rebuild instanceof Set, true);
    assert.equal(model.__state.updating, false);
    assert.equal(model.__state.suppressEvents, 0);
    assert.equal(getLifecycleState(model), null);
    assert.equal(Object.hasOwn(model.__state, "lifecycle"), false);

    const descriptor = Object.getOwnPropertyDescriptor(model, "__state");
    assert.equal(descriptor.enumerable, false);
    assert.equal(descriptor.writable, false);
    assert.equal(descriptor.configurable, false);

    model.MarkDirty();
    assert.equal(model.IsDirty(), true);
    model.ClearDirty();
    assert.equal(model.IsDirty(), false);

    model.__state.rebuild.add("bounds");
    assert.equal(model.IsDirty(), false);
    assert.equal(model.__state.rebuild.has("bounds"), true);
    model.ClearDirty();
    assert.equal(model.__state.rebuild.has("bounds"), true);

    const lifecycle = initializeLifecycleState(model);
    assert.equal(model.__state.lifecycle, lifecycle);
    assert.equal(getLifecycleState(model), lifecycle);
    assert.equal(lifecycle.status, CJS_LIFECYCLE.ALIVE);
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

test("CjsModel exposes only the schema-backed construction surface", () => {
    class SurfaceModel extends CjsModel
    {
        value = 0;
    }

    class SchemalessModel extends CjsModel {}

    assert.equal(CjsSchema.getClassName(SchemalessModel), null);
    assert.throws(() => new SchemalessModel(), /explicit CjsSchema className/);

    CjsSchema.define(SurfaceModel, { className: "StableSurfaceModel" });
    CjsSchema.defineField(SurfaceModel, "value", "type", { kind: "float32" });

    class TrackingSurfaceModel extends SurfaceModel {}

    assert.equal(SurfaceModel.schema, CjsSchema);
    assert.equal(Object.hasOwn(SurfaceModel, "schema"), false);
    assert.equal(Object.getOwnPropertyDescriptor(CjsModel, "schema").set, undefined);
    assert.equal(CjsSchema.getClassName(SurfaceModel), "StableSurfaceModel");
    assert.equal(CjsSchema.getClassName(TrackingSurfaceModel), "StableSurfaceModel");

    const model = SurfaceModel.from({ value: 3 });
    const tracking = new TrackingSurfaceModel();
    const clone = model.Clone();
    assert.equal(model instanceof SurfaceModel, true);
    assert.equal(clone instanceof SurfaceModel, true);
    assert.notEqual(clone, model);
    assert.deepEqual(clone.GetValues(), { value: 3 });
    assert.equal(CjsSchema.getSchema(TrackingSurfaceModel).className, "StableSurfaceModel");
    assert.equal(tracking instanceof SurfaceModel, true);
    assert.equal("__id" in model, false);

    for (const name of [
        "SetRuntimeType",
        "runtimeIds",
        "fromValues",
        "hasModifiedProperty",
        "notImplemented",
        "registerSourceShapes",
        "registerCarbonFacts",
        "initializeSourceFields",
        "initializeRuntimeState",
        "getCarbonFacts",
        "getSourceShape",
        "getFieldOwnership"
    ])
    {
        assert.equal(name in CjsModel, false, `${name} should not be exposed by CjsModel`);
    }

    for (const name of ["ToJson", "ToJSON", "ToYAML", "ToYaml"])
    {
        assert.equal(name in CjsModel.prototype, false, `${name} should not be exposed by CjsModel instances`);
    }
});

test("CjsModel Merge deep-merges raw value bags and updates once", () => {
    class MergeSettings extends CjsModel
    {
        left = 0;
        right = 0;
    }

    class MergeModel extends CjsModel
    {
        name = "";
        count = 0;
        settings = null;
        updates = 0;

        OnModified()
        {
            this.updates++;
            return true;
        }
    }

    CjsSchema.define(MergeSettings, { className: "MergeSettings", family: "test" });
    CjsSchema.defineField(MergeSettings, "left", "type", { kind: "uint32" });
    CjsSchema.defineField(MergeSettings, "right", "type", { kind: "uint32" });
    CjsSchema.define(MergeModel, { className: "MergeModel", family: "test" });
    CjsSchema.defineField(MergeModel, "name", "type", { kind: "string" });
    CjsSchema.defineField(MergeModel, "name", "io", { notify: true });
    CjsSchema.defineField(MergeModel, "count", "type", { kind: "uint32" });
    CjsSchema.defineField(MergeModel, "count", "io", { notify: true });
    CjsSchema.defineField(MergeModel, "settings", "type", { kind: "struct", className: "MergeSettings" });
    CjsSchema.defineField(MergeModel, "settings", "io", { notify: true });

    const target = new MergeModel();
    const returned = CjsModel.merge(
        target,
        [
            { name: "first", count: 1, settings: { left: 4 }, ignored: true },
            { count: 2, settings: { right: 8 } },
            { name: "last" }
        ],
        {}
    );

    assert.deepEqual(returned, new Set(["name", "count", "settings"]));
    assert.equal(target.name, "last");
    assert.equal(target.count, 2);
    assert.equal(target.settings instanceof MergeSettings, true);
    assert.deepEqual(target.settings.GetValues(), { left: 4, right: 8 });
    assert.equal(Object.hasOwn(target, "ignored"), false);
    assert.equal(target.updates, 1, "merged sources settle once");
    assert.deepEqual(target.Merge([{ count: 3 }]), new Set(["count"]));
    assert.equal(target.count, 3);
    assert.equal(target.updates, 2);
    assert.throws(() => target.Merge({ count: 4 }), /array of value sources/);
});

test("CjsModel Copy transfers an instantiated model through SetValues", () => {
    class CopyModel extends CjsModel
    {
        name = "";
        count = 0;
    }

    CjsSchema.define(CopyModel, { className: "CopyModel", family: "test" });
    CjsSchema.defineField(CopyModel, "name", "type", { kind: "string" });
    CjsSchema.defineField(CopyModel, "count", "type", { kind: "uint32" });

    const source = new CopyModel();
    source.name = "source";
    source.count = 4;
    const output = { retained: true };
    assert.equal(CjsModel.get(source, output), output);
    assert.deepEqual(output, { retained: true, name: "source", count: 4 });
    assert.deepEqual(source.GetValues({}), { name: "source", count: 4 });

    const target = new CopyModel();

    assert.equal(CjsModel.copy(target, source, { skipUpdate: true }), target);
    assert.equal(target.name, "source");
    assert.equal(target.count, 4);
    assert.equal(target.__state.dirty, true, "skipUpdate leaves the settle owed");

    const next = new CopyModel();
    next.name = "next";
    next.count = 8;
    assert.equal(target.Copy(next), target);
    assert.equal(target.name, "next");
    assert.equal(target.count, 8);
    assert.throws(() => target.Copy({ name: "raw" }), /CjsModel source/);
});

test("CjsModel settles cascading changes before emitting one modified event", () => {
    class SettledModel extends CjsModel
    {
        calls = [];

        // Broad-safe hook: consults own state, no changed-property list.
        OnModified(options)
        {
            this.calls.push(options.source);
            if (this.area !== this.width * 2)
            {
                this.SetValues({ area: this.width * 2 }, { source: options.source });
            }
            return true;
        }
    }

    CjsSchema.define(SettledModel, { className: "SettledModel", family: "test" });
    CjsSchema.defineField(SettledModel, "name", "type", { kind: "string" });
    CjsSchema.defineField(SettledModel, "width", "type", { kind: "number" });
    CjsSchema.defineField(SettledModel, "area", "type", { kind: "number" });

    const model = new SettledModel();
    const source = {};
    const events = [];
    model.OnEvent("modified", (target, payload) => events.push([target, payload]));

    const changed = model.SetValues({ name: "ship", width: 3 }, { source });

    assert.deepEqual(changed, new Set(["name", "width"]));
    assert.equal(model.area, 6);
    // Two passes: the first derives area (marking dirty again), the second
    // finds everything settled.
    assert.deepEqual(model.calls, [source, source]);
    assert.equal(events.length, 1);
    assert.equal(events[0][0], model);
    assert.equal(events[0][1].source, source);
    assert.equal(model.__state.dirty, false);
});

test("io.always treats equivalent writes as updates", () => {
    class AlwaysModel extends CjsModel
    {
        hookRuns = 0;

        OnModified()
        {
            this.hookRuns++;
            return true;
        }
    }

    CjsSchema.define(AlwaysModel, { className: "AlwaysModel" });
    CjsSchema.defineField(AlwaysModel, "value", "type", { kind: "float32" });
    CjsSchema.defineField(AlwaysModel, "value", "io", { write: true, always: true });
    const model = new AlwaysModel();
    model.value = 4;
    const events = [];
    model.OnEvent("modified", (_subject, data) => events.push(data));

    assert.deepEqual(model.SetValues({ value: 4 }), new Set(["value"]));
    assert.equal(model.hookRuns, 1);
    assert.equal(events.length, 1);
    assert.equal(CjsSchema.io.always !== undefined, true);
});

test("from returns an initialized clean round-trippable graph", () => {
    class ReadyModel extends CjsModel
    {
        constructor()
        {
            super();
            this.eventCount = 0;
            this.OnEvent("modified", () => this.eventCount++);
            this.OnEvent("initializing", () => this.eventCount++);
        }

        Initialize()
        {
            this.initializeCount = (this.initializeCount || 0) + 1;
            this.EmitEvent("initializing", this);
            this.SetValues({ output: this.input * 2 });
            this.__state.rebuild.add("geometry");
            return true;
        }
    }

    CjsSchema.define(ReadyModel, { className: "ReadyModel" });
    for (const fieldName of ["input", "output"])
    {
        CjsSchema.defineField(ReadyModel, fieldName, "type", { kind: "float32" });
        CjsSchema.defineField(ReadyModel, fieldName, "io", { read: true, write: true, persist: true });
    }

    const ready = ReadyModel.from({ input: 3 });
    assert.equal(ready.output, 6);
    assert.equal(ready.initializeCount, 1);
    assert.equal(ready.eventCount, 0);
    assert.equal(ready.__state.dirty, false);
    assert.equal(ready.__state.rebuild.has("geometry"), true);

    const graph = ready.GetValues();
    const copy = ReadyModel.from(graph);
    assert.deepEqual(copy.GetValues(), graph);
    assert.equal(copy.initializeCount, 1);
    assert.equal(copy.eventCount, 0);
    assert.equal(copy.__state.dirty, false);
    assert.equal(copy.__state.rebuild.has("geometry"), true);

    const clone = ready.Clone();
    assert.deepEqual(clone.GetValues(), graph);
    assert.equal(clone.__state.dirty, false);
});

test("CjsModel supports binding-style direct mutations and retains failed updates", () => {
    class BoundModel extends CjsModel
    {
        accept = true;

        OnModified()
        {
            return this.accept;
        }
    }

    CjsSchema.define(BoundModel, { className: "BoundModel", family: "test" });
    CjsSchema.defineField(BoundModel, "value", "type", { kind: "number" });
    CjsSchema.defineField(BoundModel, "value", "io", { notify: true });

    const model = new BoundModel();
    const binding = {};
    let event = null;
    model.OnEvent("modified", (target, payload) => event = payload);
    model.value = 4;
    assert.equal(model.UpdateValues({ property: "value", source: binding }), true);
    assert.equal(event.source, binding);

    model.accept = false;
    model.value = 5;
    event = null;
    assert.equal(model.UpdateValues({ property: "value", source: binding }), false);
    assert.equal(model.__state.dirty, true, "rejected update retains the dirty mark");
    assert.equal(event, null);
});

test("flags and rebuild state are independent from ordinary dirty processing", () => {
    const model = new CjsModel();
    model.MarkDirty();
    model.__state.flags.add("bounds");
    model.__state.rebuild.add("geometry");
    model.UpdateValues({ skipEvents: true });
    assert.equal(model.__state.dirty, false);
    assert.equal(model.__state.flags.has("bounds"), true, "settle never clears flags");
    assert.equal(model.__state.rebuild.has("geometry"), true, "settle never clears rebuild");
    model.ClearDirty();
    assert.equal(model.__state.flags.has("bounds"), true);
    assert.equal(model.__state.rebuild.has("geometry"), true);
    // Consumers clear their own token when they do the work.
    model.__state.flags.delete("bounds");
    model.__state.rebuild.delete("geometry");
    assert.equal(model.__state.flags.size, 0);
    assert.equal(model.__state.rebuild.size, 0);
});

test("from initializes owned children last-to-first before their parent", () => {
    const order = [];

    class ChildModel extends CjsModel
    {
        Initialize()
        {
            order.push(this.name);
            return true;
        }
    }

    class RootModel extends CjsModel
    {
        Initialize()
        {
            order.push("root");
            return true;
        }
    }

    CjsSchema.define(ChildModel, { className: "ChildModel" });
    CjsSchema.defineField(ChildModel, "name", "type", { kind: "string" });
    CjsSchema.defineField(ChildModel, "name", "io", { read: true, write: true, persist: true });
    CjsSchema.define(RootModel, { className: "RootModel" });
    CjsSchema.defineField(RootModel, "children", "type", { kind: "array", itemType: { kind: "model", className: "ChildModel" } });
    CjsSchema.defineField(RootModel, "children", "io", { read: true, write: true, persist: true, ownership: "owned" });
    CjsSchema.defineField(RootModel, "reference", "type", { kind: "object", className: "ChildModel" });
    CjsSchema.defineField(RootModel, "reference", "io", { read: true, write: true, persist: true, ownership: "reference" });

    const reference = new ChildModel();
    reference.name = "reference";
    const first = new ChildModel();
    first.name = "first";
    const last = new ChildModel();
    last.name = "last";
    const root = RootModel.from({
        children: [first, last],
        reference
    });

    assert.deepEqual(order, ["last", "first", "root"]);
    assert.equal(root.__state.dirty, false);
    assert.equal(reference.__state.dirty, false);

    order.length = 0;

    const hydrated = RootModel.from({
        children: [
            { name: "raw-first" },
            { name: "raw-last" }
        ]
    });

    assert.equal(hydrated.children[0] instanceof ChildModel, true);
    assert.equal(hydrated.children[1] instanceof ChildModel, true);
    assert.deepEqual(order, ["raw-last", "raw-first", "root"]);

    order.length = 0;

    const assigned = new RootModel();
    assigned.SetValues({
        children: [
            { name: "assigned-first" },
            { name: "assigned-last" }
        ]
    });

    assert.deepEqual(order, ["assigned-last", "assigned-first"]);
});

test("Traverse is cycle-safe and GetResources visits every model", () => {
    class GraphModel extends CjsModel {}
    CjsSchema.define(GraphModel, { className: "GraphModel" });
    CjsSchema.defineField(GraphModel, "children", "type", { kind: "array" });
    CjsSchema.defineField(GraphModel, "children", "io", { read: true, write: true, persist: true, ownership: "owned" });
    CjsSchema.defineField(GraphModel, "peer", "type", { kind: "object" });
    CjsSchema.defineField(GraphModel, "peer", "io", { read: true, write: true, persist: true, ownership: "reference" });

    const root = new GraphModel();
    const branch = new GraphModel();
    const leaf = new GraphModel();
    root.children = [branch];
    branch.children = [leaf];
    leaf.peer = root;

    const visited = [];
    root.Traverse(model => visited.push(model));
    assert.deepEqual(visited, [root, branch, leaf]);

    // Collectors report their own resources only. A model that reports must not
    // suppress its descendants: an under-reported dependency set lets an
    // all-or-nothing readiness check pass while a child is still loading.
    const resourceA = { isResource: true, path: "res:/a" };
    const resourceB = { isResource: true, path: "res:/b" };
    const resourceC = { isResource: true, path: "res:/c" };
    branch.OnGetResources = () => [resourceA, resourceA, resourceB];
    leaf.OnGetResources = () => [resourceC];

    // Prior contents are replaced, not accumulated into.
    assert.deepEqual(root.GetResources([resourceC]), [resourceA, resourceB, resourceC]);
});

test("CjsEventEmitter normalizes names and supports external method sources", () => {
    const source = { count: 0 };
    const target = new CjsEventEmitter();
    const values = [];

    function onLoaded(value)
    {
        this.count++;
        values.push([this, value]);
    }

    assert.deepEqual(Object.getOwnPropertyNames(target), []);
    assert.equal(target.OnEvent("Loaded", onLoaded, source), target);
    assert.deepEqual(Object.getOwnPropertyNames(target), ["__state"]);
    assert.equal(Object.keys(target).includes("__state"), false);
    assert.equal(target.__state.events instanceof Map, true);
    assert.equal(target.HasEvent("loaded", onLoaded, source), true);
    assert.deepEqual(target.GetEventNames(), ["loaded"]);

    target.EmitEvent("LOADED", 3);

    assert.deepEqual(values, [[source, 3]]);
    assert.equal(source.count, 1);
    assert.equal(target.GetEventListenerCount("loaded"), 1);

    target.OffEvent("LoAdEd", onLoaded, source);
    target.EmitEvent("loaded", 4);

    assert.deepEqual(values, [[source, 3]]);
    assert.equal(target.HasEvent("loaded"), false);
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
    assert.equal(emitter.HasEvent("loaded"), false);
    assert.equal(Object.hasOwn(emitter.__state, "events"), false);
});

test("CjsEventEmitter removes one source across every event name", () => {
    const emitter = new CjsEventEmitter();
    const firstSource = {};
    const secondSource = {};
    const seen = [];

    function listener(value)
    {
        seen.push([this, value]);
    }

    emitter
        .OnEvent("loaded", listener, firstSource)
        .OnEvent("changed", listener, firstSource)
        .OnEvent("loaded", listener, secondSource);

    emitter.OffEvent("*", null, firstSource);

    assert.equal(emitter.HasEvent("loaded", listener, firstSource), false);
    assert.equal(emitter.HasEvent("changed", listener, firstSource), false);
    assert.equal(emitter.HasEvent("loaded", listener, secondSource), true);

    emitter.EmitEvent("loaded", 1);
    emitter.EmitEvent("changed", 2);

    assert.deepEqual(seen, [[secondSource, 1]]);
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

    CjsSchema.define(DemoNode, {
        className: "DemoNode",
        family: "test",
        alias: "LegacyDemoNode"
    });
    CjsSchema.defineField(DemoNode, "name", "type", { kind: "string" });
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
    assert.equal(registry.GetConstructor("LegacyDemoNode"), DemoNode);
    assert.equal(structs.Has("LegacyStruct"), true);
});

test("schema.hideInherited removes inherited fields only from the schema surface", () => {
    class HideBase extends CjsModel
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
            { name: "visible", type: { kind: "string" }, io: { read: true, write: true, persist: true } },
            { name: "hidden", type: { kind: "string" }, io: { read: true, write: true, persist: true } },
            { name: "secondHidden", type: { kind: "string" }, io: { read: true, write: true, persist: true } }
        ]
    });
    CjsSchema.define(HideChild, {
        className: "HideChild",
        fields: [
            { name: "own", type: { kind: "string" }, io: { read: true, write: true, persist: true } }
        ]
    });
    CjsSchema.hideInherited(["hidden"])(HideChild, {
        kind: "class",
        metadata: Object.create(null)
    });

    const child = HideChild.from({
        visible: "visible-loaded",
        hidden: "hidden-loaded",
        secondHidden: "second-loaded",
        own: "own-loaded",
        unknown: "ignored"
    });

    assert.equal(child.hidden, "hidden-default");
    assert.equal(child.hiddenValue, "hidden-default");
    assert.equal(Object.hasOwn(child, "hidden"), true);
    assert.equal(Object.hasOwn(child, "unknown"), false);
    assert.equal(child instanceof HideChild, true);
    assert.equal(child instanceof HideBase, true);
    assert.equal(Object.getPrototypeOf(HideChild.prototype), HideBase.prototype);
    assert.equal(child.SetValues({ hidden: "still-ignored" }), false);

    for (const options of [
        {},
        { persistOnly: true },
        { typeTags: true },
        { refs: true },
        { refs: true, typeTags: true }
    ])
    {
        assert.equal(Object.hasOwn(child.GetValues(options), "hidden"), false);
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

    CjsSchema.define(HideGrandchild, {
        className: "HideGrandchild",
        fields: [
            { name: "hidden", type: { kind: "string" }, io: { read: true, write: true, persist: true } },
            { name: "extra", type: { kind: "string" }, io: { read: true, write: true, persist: true } }
        ]
    });
    CjsSchema.hideInherited(["secondHidden"])(HideGrandchild, {
        kind: "class",
        metadata: Object.create(null)
    });

    const grandchild = HideGrandchild.from({
        hidden: "cannot-unhide",
        secondHidden: "also-hidden",
        extra: "extra-loaded"
    });

    assert.equal(grandchild.hidden, "grandchild-hidden");
    assert.equal(grandchild.secondHidden, "second-default");
    assert.equal(grandchild.extra, "extra-loaded");
    assert.deepEqual(
        CjsSchema.getSchema(HideGrandchild).fields.map(field => field.name),
        ["visible", "own", "extra"]
    );
});

test("schema.hideInherited registers through Stage-3 metadata and rejects typos", () => {
    class Stage3HideBase extends CjsModel
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

    decorateField("visible", CjsSchema.type.string);
    decorateField("visible", CjsSchema.io.persist);
    decorateField("hidden", CjsSchema.type.string);
    decorateField("hidden", CjsSchema.io.persist);
    CjsSchema.type.define({ className: "Stage3HideBase" })(Stage3HideBase, {
        kind: "class",
        metadata: baseMetadata
    });

    class Stage3HideChild extends Stage3HideBase {}
    const childMetadata = Object.create(baseMetadata);
    CjsSchema.hideInherited(["hidden"])(Stage3HideChild, {
        kind: "class",
        metadata: childMetadata
    });
    CjsSchema.type.define({ className: "Stage3HideChild" })(Stage3HideChild, {
        kind: "class",
        metadata: childMetadata
    });

    assert.deepEqual(
        CjsSchema.getSchema(Stage3HideChild).fields.map(field => field.name),
        ["visible"]
    );
    assert.deepEqual(new Stage3HideChild().GetValues(), { visible: "visible" });

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
    class HiddenDocumentBase extends CjsModel
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
            { name: "visible", type: { kind: "string" }, io: { read: true, write: true, persist: true } },
            { name: "hidden", type: { kind: "string" }, io: { read: true, write: true, persist: true } }
        ]
    });
    CjsSchema.define(HiddenDocumentNode, {
        className: "HiddenDocumentNode",
        fields: [
            { name: "own", type: { kind: "string" }, io: { read: true, write: true, persist: true } }
        ]
    });
    CjsSchema.hideInherited(["hidden"])(HiddenDocumentNode, {
        kind: "class",
        metadata: Object.create(null)
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

test("stores constructors in a direct schema name map", () => {
    class FirstConstructor {}
    class ReplacementConstructor {}

    assert.equal(CjsSchema.GetConstructor("DirectConstructorMapTest"), null);
    assert.equal(CjsSchema.SetConstructor(" DirectConstructorMapTest ", FirstConstructor), CjsSchema);
    assert.equal(CjsSchema.GetConstructor("DirectConstructorMapTest"), FirstConstructor);

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
        CjsSchema.carbon.method,
        CjsSchema.impl.notImplemented,
        CjsSchema.impl.reason("schema generated stub")
    );
    CjsSchema.decorateMethod(
        MethodNode,
        "GpuOnly",
        CjsSchema.carbon.method,
        CjsSchema.impl.notSupported,
        CjsSchema.impl.note("requires a native graphics boundary")
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
        CjsSchema.carbon.renamed("UpdateValues"),
        CjsSchema.impl.adapted
    );

    const method = CjsSchema.getMethod(RenamedMethodNode, "ReEvaluate");
    assert.equal(method.carbon.method, true);
    assert.equal(method.carbon.renamed, true);
    assert.equal(method.carbon.originalName, "UpdateValues");
    assert.equal(method.impl.adapted, true);
});

test("registers component metadata and reads vector swizzles", () => {
    class PackedNode {}

    CjsSchema.define(PackedNode, { className: "PackedNode", family: "test" });
    CjsSchema.decorateField(
        PackedNode,
        "shipData",
        CjsSchema.type.vec4,
        CjsSchema.components({
            x: { name: "boosterGlowIntensity" },
            y: { name: "activationStrength" },
            z: { name: "dirtLevel" },
            w: { name: "boundingSphereRadius" },
            xyz: { name: "shipVisibleState" }
        })
    );

    const field = CjsSchema.getField(PackedNode, "shipData");
    assert.equal(field.components.x.name, "boosterGlowIntensity");
    assert.equal(field.components.xyz.name, "shipVisibleState");

    const values = new Float32Array([2, 3, 5, 7]);
    assert.equal(CjsSchema.components.get(values, "x"), 2);
    assert.deepEqual(CjsSchema.components.get(values, "rgb"), [2, 3, 5]);

    CjsSchema.components.set(values, "yw", [11, 13]);
    assert.deepEqual(Array.from(values), [2, 11, 5, 13]);
});

test("exposes canonical model descriptors", () => {
    class DescriptorNode {}

    CjsSchema.define(DescriptorNode, { className: "DescriptorNode", family: "test" });
    CjsSchema.decorateField(DescriptorNode, "child", CjsSchema.type.model("DescriptorChild"));
    CjsSchema.decorateField(DescriptorNode, "payload", CjsSchema.type.rawStruct("NativePayload"));

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

    CjsSchema.define(StaticMethodNode, {
        className: "StaticMethodNode",
        family: "test"
    });

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

    CjsSchema.carbon.method(StaticMethodNode.Rasterize, context);
    CjsSchema.impl.adapted(StaticMethodNode.Rasterize, context);
    for (const initializer of initializers)
    {
        initializer.call(StaticMethodNode);
    }

    const rasterize = CjsSchema.getMethod(StaticMethodNode, "Rasterize");
    assert.equal(rasterize.carbon.method, true);
    assert.equal(rasterize.impl.status, "adapted");
    assert.equal(CjsSchema.getMethod(Function, "Rasterize"), null);
});

test("hydrates and dehydrates explicitly schema-backed runtime models", () => {
    class HydratedSchemaNode extends CjsModel
    {
        name = "";
        position = new Float32Array([0, 0, 0]);
    }

    CjsSchema.define(HydratedSchemaNode, { className: "HydratedSchemaNode" });
    CjsSchema.defineField(HydratedSchemaNode, "name", "type", { kind: CARBON_TYPE.STRING });
    CjsSchema.defineField(HydratedSchemaNode, "position", "type", { kind: CARBON_TYPE.VECTOR3 });

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

    CjsSchema.define(PlainDocumentChild, { className: "PlainDocumentChild" });
    CjsSchema.defineField(PlainDocumentChild, "value", "type", { kind: CARBON_TYPE.FLOAT32 });
    CjsSchema.define(PlainDocumentParent, { className: "PlainDocumentParent" });
    CjsSchema.decorateField(PlainDocumentParent, "child", CjsSchema.type.model("PlainDocumentChild"));
    CjsSchema.decorateField(PlainDocumentParent, "children", CjsSchema.type.list({
        kind: "model",
        className: "PlainDocumentChild"
    }));

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
    class AliasedFieldNode extends CjsModel
    {
        dampingRatio = 0;
    }

    CjsSchema.define(AliasedFieldNode, { className: "AliasedFieldNode" });
    CjsSchema.defineField(AliasedFieldNode, "dampingRatio", "type", { kind: CARBON_TYPE.FLOAT32 });
    CjsSchema.defineField(AliasedFieldNode, "dampingRatio", "alias", "m_dampingRatio");

    const node = AliasedFieldNode.from({ m_dampingRatio: "0.5" });
    assert.equal(node.dampingRatio, 0.5);
    assert.equal(Object.hasOwn(node, "m_dampingRatio"), false);
    assert.deepEqual(node.GetValues(), { dampingRatio: 0.5 });
});

test("defines a complete hydratable schema from a manual JSON declaration", () => {
    class ManualSchemaNode extends CjsModel
    {
        value = 0;
    }

    CjsSchema.define(ManualSchemaNode, {
        className: "ManualSchemaNode",
        alias: "LegacyManualSchemaNode",
        fields: [{
            name: "value",
            type: { kind: "float32" },
            io: { read: true, write: true, persist: true }
        }]
    });

    const node = ManualSchemaNode.from({ value: "1.25" });
    const schema = CjsSchema.getSchema(ManualSchemaNode);

    assert.equal(CjsSchema.GetConstructor("LegacyManualSchemaNode"), ManualSchemaNode);
    assert.equal(schema.className, "ManualSchemaNode");
    assert.deepEqual(schema.aliases, ["LegacyManualSchemaNode"]);
    assert.deepEqual(schema.fields, [{
        name: "value",
        type: { kind: "float32" },
        io: { read: true, write: true, persist: true }
    }]);
    assert.deepEqual(node.GetValues(), { value: 1.25 });
});

test("uses schema metadata as the default CjsModel value shape", () => {
    class SchemaChild extends CjsModel
    {
        label = "";
    }

    class SchemaNode extends CjsModel
    {
        name = "";
        position = new Float32Array([0, 0, 0]);
        child = null;
        children = [];
        computed = 7;
        uiLocked = "open";
    }

    CjsSchema.define(SchemaChild, { className: "SchemaChild", family: "test" });
    CjsSchema.defineField(SchemaChild, "label", "type", { kind: "string" });

    CjsSchema.define(SchemaNode, { className: "SchemaNode", family: "test" });
    CjsSchema.defineField(SchemaNode, "name", "type", { kind: "string" });
    CjsSchema.defineField(SchemaNode, "position", "type", { kind: "vec3" });
    CjsSchema.defineField(SchemaNode, "position", "io", { notify: true, flag: ["placement"] });
    CjsSchema.defineField(SchemaNode, "child", "type", { kind: "struct", className: "SchemaChild" });
    CjsSchema.defineField(SchemaNode, "children", "type", {
        kind: "array",
        itemType: { kind: "struct", className: "SchemaChild" }
    });
    CjsSchema.defineField(SchemaNode, "computed", "type", { kind: "float32" });
    CjsSchema.defineField(SchemaNode, "computed", "io", { read: true });
    CjsSchema.defineField(SchemaNode, "uiLocked", "type", { kind: "string" });
    CjsSchema.defineField(SchemaNode, "uiLocked", "jessica", { readOnly: true });

    const node = new SchemaNode();
    node.SetValues({
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
    assert.deepEqual(node.GetValues(), {
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
    node.ClearDirty();
    node.__state.flags.clear();
    node.SetValues({ position: [4, 5, 6] }, { source, skipEvents: true, skipUpdate: true });
    assert.equal(node.__state.dirty, true);
    assert.deepEqual(node.__state.flags, new Set(["placement"]), "write-time declared token");

    node.ClearDirty();
    node.SetValues({ position: [4, 5, 6] }, { source, skipEvents: true, skipUpdate: true });
    assert.equal(node.IsDirty(), false, "equivalent values record nothing");

    node.__state.flags.clear();
    node.SetValues({ position: [7, 8, 9] }, { notify: false, source, skipEvents: true, skipUpdate: true });
    assert.equal(node.__state.dirty, true);
    assert.equal(node.__state.flags.size, 0, "notify: false suppresses declared token adds");

    node.ClearDirty();
    node.SetValues({ name: "renamed" }, { source, skipEvents: true, skipUpdate: true });
    assert.equal(node.__state.dirty, true);
    assert.equal(node.__state.flags.size, 0, "undeclared fields add no tokens");
});

test("hydrates canonical model fields and lists without constructing raw objects", () => {
    class CanonicalChild extends CjsModel
    {
        label = "";
    }

    class CanonicalParent extends CjsModel
    {
        child = null;
        children = [];
        payload = null;
        reference = null;
    }

    CjsSchema.define(CanonicalChild, { className: "CanonicalChild", family: "test-model" });
    CjsSchema.defineField(CanonicalChild, "label", "type", { kind: "string" });
    CjsSchema.define(CanonicalParent, { className: "CanonicalParent", family: "test-model" });
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

    const parent = CanonicalParent.from({
        child: { label: "one" },
        children: [{ label: "two" }],
        payload: { native: 7 },
        reference: { name: "root" }
    });
    const existingChild = CanonicalChild.from({ label: "existing" });
    const referencingParent = CanonicalParent.from({
        child: existingChild,
        children: [existingChild]
    });

    assert.equal(parent.child instanceof CanonicalChild, true);
    assert.equal(parent.children[0] instanceof CanonicalChild, true);
    assert.equal(referencingParent.child, existingChild);
    assert.equal(referencingParent.children[0], existingChild);
    assert.deepEqual(parent.payload, { native: 7 });
    assert.deepEqual(parent.reference, { name: "root" });
    assert.equal(parent.payload instanceof CjsModel, false);
    assert.deepEqual(parent.GetValues(), {
        child: { label: "one" },
        children: [{ label: "two" }],
        payload: { native: 7 },
        reference: { name: "root" }
    });
});

test("registered struct fields copy values into their constructor-owned instance", () => {
    class ValueStruct extends CjsModel
    {
        position = new Float32Array(3);
        radius = 0;
    }

    class StructOwner extends CjsModel
    {
        data = new ValueStruct();
    }

    CjsSchema.define(ValueStruct, { className: "ValueStruct" });
    CjsSchema.defineField(ValueStruct, "position", "type", { kind: "vec3" });
    CjsSchema.defineField(ValueStruct, "radius", "type", { kind: "float32" });
    CjsSchema.define(StructOwner, { className: "StructOwner" });
    CjsSchema.defineField(StructOwner, "data", "type", { kind: "struct", className: "ValueStruct" });

    const owner = new StructOwner();
    const data = owner.data;
    const position = data.position;
    const incoming = ValueStruct.from({ position: [1, 2, 3], radius: 4 });

    owner.SetValues({ data: incoming }, { skipEvents: true, skipUpdate: true });

    assert.equal(owner.data, data);
    assert.notEqual(owner.data, incoming);
    assert.equal(owner.data.position, position);
    assert.deepEqual(Array.from(owner.data.position), [1, 2, 3]);
    assert.equal(owner.data.radius, 4);

    incoming.position[0] = 99;
    incoming.radius = 100;
    assert.deepEqual(Array.from(owner.data.position), [1, 2, 3]);
    assert.equal(owner.data.radius, 4);

    owner.SetValues({ data: { position: [5, 6, 7], radius: 8 } }, { skipEvents: true, skipUpdate: true });
    assert.equal(owner.data, data);
    assert.equal(owner.data.position, position);
    assert.deepEqual(Array.from(owner.data.position), [5, 6, 7]);
    assert.equal(owner.data.radius, 8);
});

test("hydrates list schema items as registered model classes", () => {
    class ListedChild extends CjsModel
    {
        label = "";
    }

    class ListedParent extends CjsModel
    {
        children = [];
    }

    CjsSchema.define(ListedChild, { className: "ListedChild", family: "test-list" });
    CjsSchema.defineField(ListedChild, "label", "type", { kind: "string" });
    CjsSchema.define(ListedParent, { className: "ListedParent", family: "test-list" });
    CjsSchema.defineField(ListedParent, "children", "type", { kind: "list", itemType: "ListedChild" });

    const parent = ListedParent.from({ children: [{ label: "nested" }] });
    assert.equal(parent.children[0] instanceof ListedChild, true);
    assert.deepEqual(parent.GetValues(), { children: [{ label: "nested" }] });
});

test("keeps unknown list item types as plain values", () => {
    class UnknownListNode extends CjsModel
    {
        items = [];
    }

    CjsSchema.define(UnknownListNode, { className: "UnknownListNode" });
    CjsSchema.defineField(UnknownListNode, "items", "type", { kind: "list", itemType: "unknown" });

    const node = UnknownListNode.from({ items: [{ value: 7 }] });
    assert.deepEqual(node.items, [{ value: 7 }]);
    assert.equal(node.items[0] instanceof CjsModel, false);
});

test("GetValues export options control persistence, type tags, refs, ids, and keyed lists", () => {
    class ExportChild extends CjsModel
    {
        name = "";
        value = 0;
    }
    CjsSchema.define(ExportChild, {
        className: "ExportChild",
        fields: [
            { name: "name", type: { kind: "string" }, io: { read: true, write: true, persist: true } },
            { name: "value", type: { kind: "float32" }, io: { read: true, write: true, persist: true } }
        ]
    });

    class ExportChildSpecial extends ExportChild
    {
    }
    CjsSchema.define(ExportChildSpecial, {
        className: "ExportChildSpecial",
        fields: [
            { name: "name", type: { kind: "string" }, io: { read: true, write: true, persist: true } },
            { name: "value", type: { kind: "float32" }, io: { read: true, write: true, persist: true } }
        ]
    });

    class ExportRoot extends CjsModel
    {
        name = "";
        runtimeFlag = false;
        child = null;
        children = [];
    }
    CjsSchema.define(ExportRoot, {
        className: "ExportRoot",
        fields: [
            { name: "name", type: { kind: "string" }, io: { read: true, write: true, persist: true } },
            { name: "runtimeFlag", type: { kind: "boolean" }, io: { read: true, write: true } },
            { name: "child", type: { kind: "objectRef", className: "ExportChild" }, io: { read: true, persist: true } },
            { name: "children", type: { kind: "list", itemType: "ExportChild" }, io: { read: true, persist: true } }
        ]
    });

    const shared = ExportChild.from({ name: "shared", value: 1 });
    const special = ExportChildSpecial.from({ name: "special", value: 2 });
    const root = new ExportRoot();
    root.name = "root";
    root.runtimeFlag = true;
    root.child = shared;
    root.children = [shared, special];

    assert.deepEqual(root.GetValues(), {
        name: "root",
        runtimeFlag: true,
        child: { name: "shared", value: 1 },
        children: [{ name: "shared", value: 1 }, { name: "special", value: 2 }]
    });

    const persisted = root.GetValues({ persistOnly: true });
    assert.equal("runtimeFlag" in persisted, false);
    assert.equal(persisted.name, "root");

    const tagged = root.GetValues({ typeTags: true });
    assert.equal(tagged._type, "ExportRoot");
    assert.equal(tagged.child._type, undefined);
    assert.equal(tagged.children[0]._type, undefined);
    assert.equal(tagged.children[1]._type, "ExportChildSpecial");

    const forced = root.GetValues({ forceTypeTags: true });
    assert.equal(forced.child._type, "ExportChild");
    assert.equal(forced.children[1]._type, "ExportChildSpecial");

    const withRefs = root.GetValues({ refs: true });
    assert.equal(withRefs.child._id, 1);
    assert.deepEqual(withRefs.children[0], { _ref: 1 });
    assert.equal(withRefs.children[1]._id, undefined);

    const withIds = root.GetValues({ refs: true, forceIDs: true });
    assert.equal(typeof withIds._id, "number");
    assert.equal(typeof withIds.children[1]._id, "number");
    assert.deepEqual(withIds.children[0], { _ref: withIds.child._id });

    const cyclic = new ExportRoot();
    cyclic.name = "cycle";
    cyclic.child = cyclic;
    const cycled = cyclic.GetValues({ refs: true });
    assert.deepEqual(cycled.child, { _ref: cycled._id });

    const keyedRoot = new ExportRoot();
    keyedRoot.children = [ExportChild.from({ name: "a", value: 1 }), ExportChild.from({ name: "b", value: 2 })];
    const keyed = keyedRoot.GetValues({ keyedLists: true });
    assert.deepEqual(keyed.children, { a: { value: 1 }, b: { value: 2 } });

    keyedRoot.children = [ExportChild.from({ name: "a", value: 1 }), ExportChild.from({ name: "a", value: 2 })];
    assert.equal(Array.isArray(keyedRoot.GetValues({ keyedLists: true }).children), true);
});

test("imports _ref identity: shared children, cycles, self and forward references", () => {
    class RefNode extends CjsModel
    {
        name = "";
        next = null;
        items = [];
    }
    CjsSchema.define(RefNode, {
        className: "RefNode",
        fields: [
            { name: "name", type: { kind: "string" }, io: { read: true, write: true, persist: true } },
            { name: "next", type: { kind: "objectRef", className: "RefNode" }, io: { read: true, write: true, persist: true } },
            { name: "items", type: { kind: "list", itemType: "RefNode" }, io: { read: true, write: true, persist: true } }
        ]
    });

    // Shared child identity survives a JSON round trip without duplication.
    const shared = RefNode.from({ name: "shared" });
    const root = new RefNode();
    root.name = "root";
    root.next = shared;
    root.items = [shared, RefNode.from({ name: "solo" })];

    const values = JSON.parse(JSON.stringify(root.GetValues({ refs: true, typeTags: true })));
    const hydrated = RefNode.from(values);
    assert.equal(hydrated.next instanceof RefNode, true);
    assert.equal(hydrated.next.name, "shared");
    assert.equal(hydrated.items[0], hydrated.next);
    assert.equal(hydrated.items[1].name, "solo");
    assert.deepEqual(hydrated.GetValues(), root.GetValues());

    // A cycle round-trips to the same instance without recursion failure.
    const cyclic = new RefNode();
    cyclic.name = "cycle";
    cyclic.next = cyclic;
    const cycled = RefNode.from(JSON.parse(JSON.stringify(cyclic.GetValues({ refs: true }))));
    assert.equal(cycled.next, cycled);

    // Forward references resolve during the owning operation's finalize pass.
    const forward = RefNode.from({
        name: "root",
        items: [{ _ref: 7 }, { _id: 7, name: "late" }]
    });
    assert.equal(forward.items[0], forward.items[1]);
    assert.equal(forward.items[0].name, "late");

    // SetValues shares the same identity table, including self-references.
    const target = new RefNode();
    target.SetValues({ _id: 3, name: "self", next: { _ref: 3 } });
    assert.equal(target.next, target);
});

test("from and singular imports honor polymorphic _type", () => {
    class PolyBase extends CjsModel
    {
        name = "";
    }
    CjsSchema.define(PolyBase, {
        className: "PolyBase",
        fields: [
            { name: "name", type: { kind: "string" }, io: { read: true, write: true, persist: true } }
        ]
    });

    class PolySpecial extends PolyBase
    {
        extra = 0;
    }
    CjsSchema.define(PolySpecial, {
        className: "PolySpecial",
        fields: [
            { name: "name", type: { kind: "string" }, io: { read: true, write: true, persist: true } },
            { name: "extra", type: { kind: "float32" }, io: { read: true, write: true, persist: true } }
        ]
    });

    class PolyHost extends CjsModel
    {
        child = null;
    }
    CjsSchema.define(PolyHost, {
        className: "PolyHost",
        fields: [
            { name: "child", type: { kind: "objectRef", className: "PolyBase" }, io: { read: true, write: true, persist: true } }
        ]
    });

    // A singular field constructs the concrete subtype named by _type.
    const host = PolyHost.from({ child: { _type: "PolySpecial", name: "s", extra: 2 } });
    assert.equal(host.child instanceof PolySpecial, true);
    assert.equal(host.child.extra, 2);

    // Root dispatch constructs the concrete subclass.
    const dispatched = PolyBase.from({ _type: "PolySpecial", name: "d" });
    assert.equal(dispatched instanceof PolySpecial, true);

    // A typeTags export reimports concretely (no base-type downgrade).
    const round = PolyHost.from(JSON.parse(JSON.stringify(host.GetValues({ typeTags: true }))));
    assert.equal(round.child instanceof PolySpecial, true);
    assert.equal(round.child.extra, 2);

    // Base-class values may apply to a derived target.
    assert.equal(new PolySpecial().SetValues({ _type: "PolyBase", name: "x" }) instanceof Set, true);

    // Mismatched or unknown types throw.
    assert.throws(() => PolySpecial.from({ _type: "PolyHost" }), TypeError);
    assert.throws(() => PolyBase.from({ _type: "NoSuchRegisteredClass" }), TypeError);
    assert.throws(() => new PolySpecial().SetValues({ _type: "PolyHost" }), TypeError);
});

test("reference import errors are loud and specific", () => {
    class StrictRefNode extends CjsModel
    {
        name = "";
    }
    CjsSchema.define(StrictRefNode, {
        className: "StrictRefNode",
        fields: [
            { name: "name", type: { kind: "string" }, io: { read: true, write: true, persist: true } }
        ]
    });

    class StrictOther extends CjsModel
    {
        name = "";
    }
    CjsSchema.define(StrictOther, {
        className: "StrictOther",
        fields: [
            { name: "name", type: { kind: "string" }, io: { read: true, write: true, persist: true } }
        ]
    });

    class StrictRefHost extends CjsModel
    {
        node = null;
        nodes = [];
        others = [];
    }
    CjsSchema.define(StrictRefHost, {
        className: "StrictRefHost",
        fields: [
            { name: "node", type: { kind: "objectRef", className: "StrictRefNode" }, io: { read: true, write: true, persist: true } },
            { name: "nodes", type: { kind: "list", itemType: "StrictRefNode" }, io: { read: true, write: true, persist: true } },
            { name: "others", type: { kind: "list", itemType: "StrictOther" }, io: { read: true, write: true, persist: true } }
        ]
    });

    // An unresolved reference names the missing id.
    assert.throws(() => StrictRefHost.from({ nodes: [{ _ref: 99 }] }), /Unresolved _ref ids: 99/);

    // Duplicate ids never silently rebind identity.
    assert.throws(
        () => StrictRefHost.from({ nodes: [{ _id: 1, name: "a" }, { _id: 1, name: "b" }] }),
        /Duplicate _id 1/
    );

    // A root cannot be constructed from a bare reference.
    assert.throws(() => StrictRefHost.from({ _ref: 1 }), TypeError);

    // A reference assigns like a direct instance: Carbon contracts may be
    // declared through interface names with no runtime inheritance, so a
    // resolved reference is not constrained by the declared field class.
    const crossTyped = StrictRefHost.from({
        others: [{ _id: 4, name: "o" }],
        node: { _ref: 4 }
    });
    assert.equal(crossTyped.node, crossTyped.others[0]);
});

test("keyed list maps accept _ref entries and keep the shared item's own name", () => {
    class KeyedRefChild extends CjsModel
    {
        name = "";
        value = 0;
    }
    CjsSchema.define(KeyedRefChild, {
        className: "KeyedRefChild",
        fields: [
            { name: "name", type: { kind: "string" }, io: { read: true, write: true, persist: true } },
            { name: "value", type: { kind: "float32" }, io: { read: true, write: true, persist: true } }
        ]
    });

    class KeyedRefHost extends CjsModel
    {
        children = [];
    }
    CjsSchema.define(KeyedRefHost, {
        className: "KeyedRefHost",
        fields: [
            { name: "children", type: { kind: "list", itemType: "KeyedRefChild" }, io: { read: true, write: true, persist: true } }
        ]
    });

    const host = new KeyedRefHost();
    host.SetValues({ children: { a: { _id: 9, value: 1 }, b: { _ref: 9 } } });
    assert.equal(host.children.length, 2);
    assert.equal(host.children[1], host.children[0]);
    assert.equal(host.children[0].name, "a");
});

test("list fields accept keyed maps and explicit item _type on input", () => {
    class MapChild extends CjsModel
    {
        name = "";
        value = 0;
    }
    CjsSchema.define(MapChild, {
        className: "MapChild",
        fields: [
            { name: "name", type: { kind: "string" }, io: { read: true, write: true, persist: true } },
            { name: "value", type: { kind: "float32" }, io: { read: true, write: true, persist: true } }
        ]
    });

    class MapChildAlt extends MapChild
    {
    }
    CjsSchema.define(MapChildAlt, {
        className: "MapChildAlt",
        fields: [
            { name: "name", type: { kind: "string" }, io: { read: true, write: true, persist: true } },
            { name: "value", type: { kind: "float32" }, io: { read: true, write: true, persist: true } }
        ]
    });

    class MapHost extends CjsModel
    {
        children = [];
    }
    CjsSchema.define(MapHost, {
        className: "MapHost",
        fields: [
            { name: "children", type: { kind: "list", itemType: "MapChild" }, io: { read: true, write: true, persist: true } }
        ]
    });

    const host = new MapHost();
    host.SetValues({ children: { a: { value: 1 }, b: { _type: "MapChildAlt", value: 2 }, skipped: null } });
    assert.equal(host.children.length, 2);
    assert.equal(host.children[0] instanceof MapChild, true);
    assert.equal(host.children[0].name, "a");
    assert.equal(host.children[0].value, 1);
    assert.equal(host.children[1] instanceof MapChildAlt, true);
    assert.equal(host.children[1].name, "b");

    host.SetValues({ children: [{ _type: "MapChildAlt", name: "c", value: 3 }] });
    assert.equal(host.children.length, 1);
    assert.equal(host.children[0] instanceof MapChildAlt, true);
    assert.equal(host.children[0].name, "c");

    assert.throws(() => host.SetValues({ children: { bad: 1 } }), TypeError);
    assert.equal(Array.isArray(host.children), true);

    const keyed = host.GetValues({ keyedLists: true });
    assert.deepEqual(keyed.children, { c: { value: 3 } });
});

test("enum-backed fields validate on set and translate on export via class statics", () => {
    class EnumHost extends CjsModel
    {
        static Mode = Object.freeze({
            OFF: 0,
            ON: 1,
            AUTO: 1,
            PULSE: 2
        });

        mode = 0;
        label = "";
    }
    CjsSchema.define(EnumHost, {
        className: "EnumHost",
        fields: [
            { name: "mode", type: { kind: "int32" }, io: { read: true, write: true, persist: true }, enum: { enumType: "Mode" } },
            { name: "label", type: { kind: "string" }, io: { read: true, write: true, persist: true } }
        ]
    });

    class EnumHostChild extends EnumHost
    {
    }
    CjsSchema.define(EnumHostChild, {
        className: "EnumHostChild",
        fields: [
            { name: "mode", type: { kind: "int32" }, io: { read: true, write: true, persist: true }, enum: { enumType: "Mode" } },
            { name: "label", type: { kind: "string" }, io: { read: true, write: true, persist: true } }
        ]
    });

    const host = new EnumHost();

    // acceptance: number, exact member string, identity tuple (element 0)
    host.SetValues({ mode: 2 });
    assert.equal(host.mode, 2);
    host.SetValues({ mode: "ON" });
    assert.equal(host.mode, 1);
    host.SetValues({ mode: ["PULSE", "EnumHost.Mode"] });
    assert.equal(host.mode, 2);

    // default export is untouched numerics
    assert.equal(host.GetValues().mode, 2);

    // names / identity modes translate; alias reverse map is first-declared
    host.SetValues({ mode: 1 });
    assert.equal(host.GetValues({ enumFormat: "names" }).mode, "ON");
    assert.deepEqual(host.GetValues({ enumFormat: "identity" }).mode, ["ON", "EnumHost.Mode"]);
    assert.equal(host.GetValues({ enumFormat: "names" }).label, "");

    // inheritance: child instance resolves the parent's static, identity names the owner
    const child = new EnumHostChild();
    child.SetValues({ mode: "PULSE" });
    assert.deepEqual(child.GetValues({ enumFormat: "identity" }).mode, ["PULSE", "EnumHost.Mode"]);

    // unknown numeric exports raw in translation modes (forward-compatible)
    Object.defineProperty(host, "mode", { value: 99, writable: true, configurable: true });
    assert.equal(host.GetValues({ enumFormat: "names" }).mode, 99);

    // strict atomic throw: every invalid property listed, nothing mutated
    const strict = new EnumHost();
    strict.SetValues({ mode: 1, label: "before" });
    let message = "";
    try
    {
        strict.SetValues({ mode: "on", label: "after" });
    }
    catch (error)
    {
        message = error instanceof TypeError ? error.message : "";
    }
    assert.match(message, /mode/);
    assert.match(message, /EnumHost\.Mode/);
    assert.equal(strict.mode, 1);
    assert.equal(strict.label, "before", "atomic validation must reject before any mutation");
    assert.throws(() => strict.SetValues({ mode: 3 }), TypeError);
    assert.throws(() => strict.SetValues({ mode: [] }), TypeError);
    assert.throws(() => strict.SetValues({ mode: true }), TypeError);

    // hydration path throws through from()
    assert.throws(() => EnumHost.from({ mode: "BAD" }), TypeError);

    // schema export is self-describing for resolved enums
    const schemaField = CjsSchema.getSchema(EnumHost).fields.find(field => field.name === "mode");
    assert.equal(schemaField.enum.identity, "EnumHost.Mode");
    assert.equal(schemaField.enum.members, EnumHost.Mode);

    // classes without a resolvable static pass values through unvalidated
    class EnumlessHost extends CjsModel
    {
        mode = 0;
    }
    CjsSchema.define(EnumlessHost, {
        className: "EnumlessHost",
        fields: [
            { name: "mode", type: { kind: "int32" }, io: { read: true, write: true, persist: true }, enum: { enumType: "MissingEnum" } }
        ]
    });
    const enumless = new EnumlessHost();
    enumless.SetValues({ mode: 42 });
    assert.equal(enumless.mode, 42);
    assert.equal(enumless.GetValues({ enumFormat: "names" }).mode, 42);
});

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
        CjsSchema.carbon.contextual(["camera"]),
        CjsSchema.impl.implemented
    );

    const method = CjsSchema.getMethod(ContextualNode, "ApplyTransform");
    assert.equal(method.carbon.method, true);
    assert.equal(method.carbon.contextual, true);
    assert.deepEqual(Array.from(method.carbon.contextTiers), ["camera"]);
    assert.equal(method.impl.implemented, true);

    // Rejects an empty tier list.
    assert.throws(() => CjsSchema.carbon.contextual([]), TypeError);
    assert.throws(() => CjsSchema.carbon.contextual(["  "]), TypeError);

    // Context-first validation: a contextual method whose first parameter is
    // not the frame context throws at decoration time.
    class NotContextFirst
    {
        ApplyTransform(transform, out)
        {}
    }
    CjsSchema.define(NotContextFirst, { className: "NotContextFirst", family: "test" });
    assert.throws(
        () => CjsSchema.decorateMethod(NotContextFirst, "ApplyTransform", CjsSchema.carbon.contextual(["camera"])),
        /context-first/
    );

    class ZeroArgContextual
    {
        Tick()
        {}
    }
    CjsSchema.define(ZeroArgContextual, { className: "ZeroArgContextual", family: "test" });
    assert.throws(
        () => CjsSchema.decorateMethod(ZeroArgContextual, "Tick", CjsSchema.carbon.contextual(["camera"])),
        /context-first/
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
        CjsSchema.impl.custom,
        CjsSchema.impl.reason("JS-only zero-alloc fold; Carbon inlines this loop")
    );

    const method = CjsSchema.getMethod(CustomMethodNode, "FoldModifiers");
    // No @carbon.method: this method has no Carbon counterpart.
    assert.equal(method.carbon, undefined);
    assert.equal(method.impl.custom, true);
    assert.equal(method.impl.status, "custom");
    assert.equal(method.impl.reason, "JS-only zero-alloc fold; Carbon inlines this loop");
});

test("CjsModel.from runs the settle hook with events suppressed", () => {
    class PlacedModel extends CjsModel
    {
        hookRuns = 0;
        hookSkipEvents = null;
        modifiedEvents = 0;

        OnModified(options = {})
        {
            this.hookRuns++;
            this.hookSkipEvents = options.skipEvents === true;
            return true;
        }

        EmitEvent(name, ...rest)
        {
            if (name === "modified") this.modifiedEvents++;
            return super.EmitEvent(name, ...rest);
        }
    }

    CjsSchema.define(PlacedModel, { className: "PlacedModel", family: "test" });
    CjsSchema.defineField(PlacedModel, "position", "type", { kind: "number" });
    CjsSchema.defineField(PlacedModel, "position", "io", { persist: true, flag: ["placement"] });

    // Construction: the hook runs (skipEvents visible), events stay silent,
    // and every declared token is present - a new object owes everything.
    const model = PlacedModel.from({ position: 5 });
    assert.equal(model.hookRuns >= 1, true, "hook ran during construction");
    assert.equal(model.hookSkipEvents, true, "hook sees skipEvents during construction");
    assert.equal(model.modifiedEvents, 0, "no modified event during construction");
    assert.equal(model.__state.flags.has("placement"), true, "declared tokens present after construction");
    assert.equal(model.__state.dirty, false, "from returns a settled graph");

    // Ordinary mutation afterwards: hook AND event both fire.
    model.SetValues({ position: 9 });
    assert.equal(model.modifiedEvents, 1, "post-construction mutation emits normally");
});

test("io.rebuild unions changed fields' tokens into __state.rebuild before OnModified", () => {
    class RebuiltModel extends CjsModel
    {
        seenAtHookTime = null;

        OnModified(properties)
        {
            // Tokens must already be present when the hook runs.
            this.seenAtHookTime = new Set(this.__state.rebuild);
            return true;
        }
    }

    CjsSchema.define(RebuiltModel, { className: "RebuiltModel", family: "test" });
    CjsSchema.defineField(RebuiltModel, "radius", "type", { kind: "number" });
    CjsSchema.defineField(RebuiltModel, "radius", "io", { persist: true, rebuild: ["geometry", "bounds"] });
    CjsSchema.defineField(RebuiltModel, "label", "type", { kind: "string" });
    CjsSchema.defineField(RebuiltModel, "label", "io", { persist: true });

    // Hydration carries tokens too (from() settles through the pipeline).
    const model = RebuiltModel.from({ radius: 4 });
    assert.deepEqual(model.seenAtHookTime, new Set(["geometry", "bounds"]));

    // Per-frame consumer clears; a token-less change adds nothing.
    model.__state.rebuild.clear();
    model.SetValues({ label: "x" });
    assert.equal(model.__state.rebuild.size, 0);

    // A declared field change repopulates.
    model.SetValues({ radius: 9 });
    assert.deepEqual(model.__state.rebuild, new Set(["geometry", "bounds"]));

    // The decorator form produces the same metadata shape.
    class DecoratedModel extends CjsModel {}
    CjsSchema.define(DecoratedModel, { className: "DecoratedRebuildModel", family: "test" });
    CjsSchema.decorateField?.(DecoratedModel, "radius", CjsSchema.io.rebuild("geometry"));
    const viaHelper = CjsSchema.io.rebuild("geometry", "bounds");
    assert.equal(typeof viaHelper, "function");
});
