import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import CjsRedFormat, { CjsRedFormat as NamedCjsRedFormat } from "../../../npm/dist/formats/red/index.js";
import { createLifecycleAdapter } from "@carbonenginejs/core-types/hydration";

// A shared node referenced by identity models a YAML anchor/alias: the same
// object appears in two places in the graph.
function makeGraph()
{
    const sharedLight = {
        type: "Tr2PointLight",
        name: "Left",
        color: [ 1.0, 0.0, 0.0, 1.0 ],
        brightness: 0.0
    };

    return {
        type: "EveChildContainer",
        name: "root",
        __scratch__: { editor: "state" },
        objects: [
            {
                type: "EveChildMesh",
                name: "mesh",
                lights: [ sharedLight ]
            }
        ],
        curveSets: [
            {
                type: "TriCurveSet",
                name: "cs",
                curves: [
                    {
                        type: "Tr2CurveScalar",
                        name: "curve",
                        keys: {
                            structure: [ [ "time", 4, 0 ], [ "value", 4, 4 ] ],
                            items: [ [ 0.0, 0.5 ], [ 1.0, 1.0 ] ]
                        }
                    }
                ],
                bindings: [
                    {
                        type: "TriValueBinding",
                        name: "b",
                        destinationObject: sharedLight,
                        destinationAttribute: "color"
                    }
                ]
            }
        ],
        effect: {
            type: "Tr2Effect",
            effectFilePath: "cdn:/x.fx",
            __note__: "scratch",
            options: {
                structure: [ [ "name", 5, 0 ], [ "value", 5, 8 ] ],
                items: [ [ "SPACE_OBJECT_CLIPPING", "SOC_DISABLED" ] ]
            }
        }
    };
}

test("package root exports one public class", async () =>
{
    const mod = await import("../../../npm/dist/formats/red/index.js");
    assert.deepEqual(Object.keys(mod).sort(), [ "CjsRedFormat", "default" ]);
    assert.equal(mod.default, CjsRedFormat);
    assert.equal(NamedCjsRedFormat, CjsRedFormat);
});

test("published schema exposes the current Carbon class definitions", async () =>
{
    const schema = await import("../../../npm/dist/formats/red/core/blackDefinitions.js");
    const canonical = await import("../../../npm/dist/formats/black/core/blackDefinitions.js");

    assert.equal(schema.generatedAt, "2026-07-23T12:50:12.522Z");
    assert.equal(schema.default, canonical.default);
    assert.equal(CjsRedFormat.schema, schema.default);
    assert.deepEqual(schema.default.Tr2SkinnedModel, {
        name: "string",
        meshes: "array",
        geometryResPath: "path",
        skeletonName: "string",
        skinScale: "vector3"
    });
    assert.deepEqual(schema.default.EveSOF, {});
});

test("reader exposes the standard public profile API", () =>
{
    assert.deepEqual(Object.getOwnPropertyNames(CjsRedFormat.prototype).sort(), [
        "GetClass", "GetValues", "HasClass", "Inspect", "Read", "ReadPayload",
        "ReadRaw", "ReadRuntime", "SetClass", "SetClasses", "SetValues", "ToJSON",
        "constructor"
    ].sort());
    assert.equal(CjsRedFormat.id, "red");
});

test("reader profile exposes and persists payload identity markers", () =>
{
    const format = new CjsRedFormat();
    assert.equal(format.GetValues().payloadTypeField, "_type");
    assert.equal(format.GetValues().payloadIdField, "_id");
    assert.equal(format.GetValues().payloadReferenceField, "_reference");
    assert.equal(format.GetValues().payloadValuesField, "_values");

    const shared = [ 7 ];
    const payload = format
        .SetValues({ payloadValuesField: "items" })
        .ReadPayload({ type: "Root", left: shared, right: shared })
        .object;
    assert.deepEqual(payload.left.items, [ 7 ]);
    assert.equal(payload.left._id, payload.right._reference);
    assert.equal(format.GetValues().payloadValuesField, "items");
});

test("read emits a compact public payload and strips authoring-tool keys", () =>
{
    const payload = CjsRedFormat.read(makeGraph());

    assert.deepEqual(Object.keys(payload), [ "comments", "object" ]);
    assert.equal(payload.object._type, "EveChildContainer");
    assert.equal(payload.object.name, "root");
    assert.equal(payload.object.effect._type, "Tr2Effect");

    // Double-underscore authoring-tool keys never survive anywhere.
    const hasStrippedKey = (node) =>
    {
        if (Array.isArray(node)) return node.some(hasStrippedKey);
        if (!node || typeof node !== "object") return false;
        return Object.keys(node).some(key => key.startsWith("__") || hasStrippedKey(node[key]));
    };
    assert.equal(hasStrippedKey(payload), false);
});

test("typed tables decode to row objects keyed by column name", () =>
{
    const payload = CjsRedFormat.read(makeGraph());

    const curve = payload.object.curveSets[0].curves[0];
    assert.deepEqual(curve.keys, [ { time: 0.0, value: 0.5 }, { time: 1.0, value: 1.0 } ]);

    const options = payload.object.effect.options;
    assert.deepEqual(options, [ { name: "SPACE_OBJECT_CLIPPING", value: "SOC_DISABLED" } ]);
});

test("shared nodes emit a full object once and references thereafter", () =>
{
    const payload = CjsRedFormat.read(makeGraph());

    const light = payload.object.objects[0].lights[0];
    assert.equal(light._type, "Tr2PointLight");
    assert.equal(typeof light._id, "number");

    const binding = payload.object.curveSets[0].bindings[0];
    assert.deepEqual(binding.destinationObject, { _reference: light._id });

    // The result is a JSON-safe tree despite the shared reference.
    assert.doesNotThrow(() => JSON.stringify(payload));
});

test("inspect reports the root type and a type histogram", () =>
{
    const info = CjsRedFormat.inspect(makeGraph());
    assert.equal(info.format.id, "red");
    assert.equal(info.root.type, "EveChildContainer");
    assert.equal(info.typeCounts.Tr2PointLight, 1);
    assert.equal(info.typeCounts.EveChildMesh, 1);
    assert.equal(info.typeCounts.TriValueBinding, 1);
});

test("raw keeps the type field, strips metadata, and shares identity", () =>
{
    const raw = CjsRedFormat.readRaw(makeGraph());
    assert.equal(raw.type, "EveChildContainer");
    assert.equal("__scratch__" in raw, false);

    // The two references to the shared light resolve to one object.
    assert.equal(raw.objects[0].lights[0], raw.curveSets[0].bindings[0].destinationObject);
});

test("YAML strings use format-yaml with anchor identity intact", () =>
{
    const source = [
        "type: EveChildContainer",
        "objects:",
        "  - &light",
        "    type: Tr2PointLight",
        "    name: Shared",
        "bindings:",
        "  - type: TriValueBinding",
        "    destinationObject: *light"
    ].join("\n");

    const raw = CjsRedFormat.readRaw(source);
    assert.equal(raw.objects[0], raw.bindings[0].destinationObject);

    const payload = CjsRedFormat.readPayload(source);
    assert.equal(payload.object.objects[0]._type, "Tr2PointLight");
    assert.deepEqual(payload.object.bindings[0].destinationObject, {
        _reference: payload.object.objects[0]._id
    });
});

test("Red uses the runtime-resource-owned YAML format", async () =>
{
    const redGraph = await readFile(new URL("../../../npm/dist/formats/red/core/redGraph.js", import.meta.url), "utf8");

    assert.match(redGraph, /from ['"]\.\.\/\.\.\/yaml\/(?:index|CjsYamlFormat)\.js['"]/);
    assert.doesNotMatch(redGraph, /createRequire|from "yaml"|from "js-yaml"|loadYaml/);
});

test("parse override remains the highest-priority compatibility hook", () =>
{
    const calls = [];
    const raw = CjsRedFormat.readRaw("not parsed by format-yaml", {
        parse(text)
        {
            calls.push(text);
            return { type: "OverrideRoot", value: 42 };
        }
    });

    assert.deepEqual(calls, [ "not parsed by format-yaml" ]);
    assert.deepEqual(raw, { type: "OverrideRoot", value: 42 });
});

test("custom YAML tags are rejected before Red hydration", () =>
{
    assert.throws(
        () => CjsRedFormat.readRaw("type: !unsafe EveChildContainer\n"),
        /CjsYamlFormat.*custom tag.*rejected/
    );
});

test("readRuntime constructs caller classes and shares instances", () =>
{
    class Container {}
    class PointLight {}

    const runtime = CjsRedFormat.readRuntime(makeGraph(), {
        classes: { EveChildContainer: Container, Tr2PointLight: PointLight }
    });

    assert.equal(runtime.root instanceof Container, true);
    const light = runtime.root.objects[0].lights[0];
    assert.equal(light instanceof PointLight, true);
    assert.equal(light.name, "Left");
    // Shared node -> one constructed instance.
    assert.equal(runtime.root.curveSets[0].bindings[0].destinationObject, light);
});

test("createLifecycleAdapter drives SetValues and Initialize", () =>
{
    const seen = [];
    class LiveContainer
    {
        SetValues(values, options) { this.captured = values; this.lifecycleOptions = options; seen.push("container.SetValues"); }
        Initialize(options) { this.initialized = true; this.initializeOptions = options; seen.push("container.Initialize"); }
    }
    class LiveLight
    {
        SetValues(values, options) { this.captured = values; this.lifecycleOptions = options; }
        Initialize(options) { this.initialized = true; this.initializeOptions = options; }
    }
    class LiveMesh
    {
        SetValues(values, options) { this.captured = values; this.lifecycleOptions = options; }
        Initialize(options) { this.initialized = true; this.initializeOptions = options; }
    }
    class LiveNode
    {
        SetValues(values, options) { this.captured = values; this.lifecycleOptions = options; }
        Initialize(options) { this.initialized = true; this.initializeOptions = options; }
    }

    const runtime = CjsRedFormat.readRuntime(makeGraph(), {
        classes: {
            EveChildContainer: LiveContainer,
            EveChildMesh: LiveMesh,
            Tr2PointLight: LiveLight,
            TriCurveSet: LiveNode,
            Tr2CurveScalar: LiveNode,
            TriValueBinding: LiveNode,
            Tr2Effect: LiveNode
        },
        adapter: createLifecycleAdapter()
    });

    assert.equal(runtime.root instanceof LiveContainer, true);
    assert.equal(runtime.root.captured.name, "root");
    assert.equal(runtime.root.lifecycleOptions.skipUpdate, true);
    assert.equal(runtime.root.lifecycleOptions.skipEvents, true);
    assert.equal(runtime.root.lifecycleOptions.markDirty, false);
    assert.equal(runtime.root.initialized, true);
    assert.equal(runtime.root.initializeOptions, undefined);

    const light = runtime.root.captured.objects[0].captured.lights[0];
    assert.equal(light instanceof LiveLight, true);
    assert.equal(light.initialized, true);
    assert.equal(light.initializeOptions, undefined);
    // children finalize before parents
    assert.equal(seen[seen.length - 1], "container.Initialize");
});
