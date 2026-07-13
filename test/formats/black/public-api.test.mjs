import { test } from "node:test";
import assert from "node:assert/strict";

import CjsBlackFormat, { CjsBlackFormat as NamedCjsBlackFormat } from "../../../npm/dist/formats/black/index.js";
import { createLifecycleAdapter } from "@carbonenginejs/core-types";

class Root {}
class ObjectNode {}
class TestRootRuntime {}
class TestChildRuntime {}

const sampleSchema = {
    schemaVersion: 1,
    families: [
        {
            name: "test",
            classes: [
                classSchema("TestRoot", [
                    blackField("name", "m_name", "std::string", "STDSTRING"),
                    blackField("count", "m_count", "int", "LONG"),
                    blackField("enabled", "m_enabled", "bool", "BOOL"),
                    blackField("child", "m_child", "TestChildPtr", "IROOTPTR"),
                    blackField("items", "m_items", "std::vector<TestChildPtr>", "IROOT", { container: "list" })
                ]),
                classSchema("TestChild", [
                    blackField("name", "m_name", "std::string", "STDSTRING"),
                    blackField("weight", "m_weight", "float", "FLOAT")
                ]),
                classSchema("TestIndexBuffer", [
                    blackField("indexBuffer", "m_indexBuffer", "IndexBuffer", "BINARYBLOCK", {
                        macro: "MAP_ATTRIBUTE_AS_CUSTOM_BINARY_BLOCK",
                        wireType: "binaryBlock"
                    })
                ]),
                classSchema("TestExpression", [
                    blackField("expression", "m_expression", "std::string", null, {
                        jsType: { kind: "expression", js: "string" },
                        wireType: "expressionString"
                    })
                ])
            ]
        }
    ]
};

test("package root exports one public class", async () =>
{
    const mod = await import("../../../npm/dist/formats/black/index.js");

    assert.deepEqual(Object.keys(mod).sort(), [ "CjsBlackFormat", "default" ]);
    assert.equal(mod.default, CjsBlackFormat);
    assert.equal(mod.CjsBlackFormat, CjsBlackFormat);
    assert.equal(NamedCjsBlackFormat, CjsBlackFormat);
});

test("published schema subpaths import generated Black definitions", async () =>
{
    const schema = await import("../../../npm/dist/formats/black/core/blackSchema.js");
    const enums = await import("../../../npm/dist/formats/black/core/blackEnums.js");
    const version = await import("../../../npm/dist/formats/black/core/blackVersion.js");
    const canonical = await import("../../../npm/dist/formats/black/core/blackDefinitions.js");

    assert.equal(Object.hasOwn(schema.default, "EveSOFDataHull"), true);
    assert.equal(Object.hasOwn(enums.default, "BuildClass"), true);
    assert.equal(schema.default, canonical.default);
    assert.equal(new CjsBlackFormat().GetValues().schema, canonical.default);
    assert.equal(canonical.schema, "carbonenginejs.blackDefinitions");
    assert.equal(canonical.version, 1);
    assert.equal(canonical.generatedAt, "2026-07-11T14:52:36.015Z");
    assert.equal(version.default.formatId, "black");
    assert.equal(version.default.generatedAt, "2026-07-11T14:52:36.015Z");
    assert.equal(version.default.version, 1);
    assert.equal(schema.default.EveSOFDataHull.boundingSphere, "vector4");
    assert.deepEqual(schema.default.EveSOFDataHull.buildClass, { type: "enum", enum: "BuildClass" });
    assert.deepEqual(schema.default.EveSOFDataFactionColorSet.Primary, {
        type: "color",
        field: "colors",
        index: "primary",
        token: "SOFDataFactionColorChooser::TYPE_PRIMARY"
    });
    assert.deepEqual(schema.default.Tr2SkinnedModel, {
        name: "string",
        meshes: "array",
        geometryResPath: "path",
        skeletonName: "string",
        skinScale: "vector3"
    });
    assert.deepEqual(schema.default.EveSOF, {});
    assert.equal(schema.default.EveSOFDataHull.black, undefined);
    assert.equal(schema.default.EveSOFDataHull.sourceRefs, undefined);
    assert.equal(schema.default.EveSOFDataHull.reviewNotes, undefined);
});

test("reader exposes the standard public profile API", () =>
{
    assert.deepEqual(Object.getOwnPropertyNames(CjsBlackFormat.prototype).sort(), [
        "GetClass",
        "GetValues",
        "HasClass",
        "Inspect",
        "Read",
        "ReadDocument",
        "ReadPayload",
        "ReadRuntime",
        "SetClass",
        "SetClasses",
        "SetValues",
        "ToJSON",
        "constructor"
    ].sort());

    assert.equal(typeof CjsBlackFormat.read, "function");
    assert.equal(typeof CjsBlackFormat.readDocument, "function");
    assert.equal(typeof CjsBlackFormat.readPayload, "function");
    assert.equal(typeof CjsBlackFormat.readRuntime, "function");
    assert.equal(typeof CjsBlackFormat.inspect, "function");
    assert.equal(CjsBlackFormat.id, "black");
    assert.equal(CjsBlackFormat.version, 1);
});

test("reader manages values and classes", () =>
{
    const reader = new CjsBlackFormat({ schema: sampleSchema, classes: { Root } }).SetClass("Object", ObjectNode);

    assert.equal(reader.HasClass("Root"), true);
    assert.equal(reader.HasClass("Object"), true);
    assert.equal(reader.GetClass("Root"), Root);
    assert.equal(reader.GetValues().emit, CjsBlackFormat.OUTPUT_JSON);
    assert.equal(reader.GetValues().schema, sampleSchema);
});

test("inspect reads Black header and string tables", () =>
{
    const builder = new BlackFixtureBuilder();
    const input = builder.Finish(builder.Object(1, "TestChild", [
        [ "name", builder.StringValue("child") ],
        [ "weight", f32(2.5) ]
    ]));

    const info = CjsBlackFormat.inspect(input);

    assert.equal(info.format.id, "black");
    assert.equal(info.format.version, 1);
    assert.equal(info.dataOffset > 0, true);
    assert.deepEqual(info.strings, [ "child", "TestChild", "name", "weight" ]);
});

test("read emits compact public payload objects by default", () =>
{
    const input = createRootFixture();
    const payload = CjsBlackFormat.read(input, { schema: sampleSchema });

    assert.deepEqual(Object.keys(payload), [ "comments", "object" ]);
    assert.equal(payload.object._type, "TestRoot");
    assert.equal(payload.object.name, "root");
    assert.equal(payload.object.count, 7);
    assert.equal(payload.object.enabled, true);
    assert.equal(payload.object.child._type, "TestChild");
    assert.equal(payload.object.child.name, "primary");
    assert.equal(payload.object.child.weight, 2.5);
    assert.deepEqual(payload.object.items[0], { _reference: 2 });
    assert.equal(payload.object.child._id, 2);
    assert.equal(payload.object.items[1].name, "secondary");
});

test("readPayload can load selected root fields", () =>
{
    const input = createRootFixture();
    const payload = CjsBlackFormat.readPayload(input, {
        schema: sampleSchema,
        rootFields: [ "name", "count" ]
    });

    assert.deepEqual(payload.object, {
        _type: "TestRoot",
        name: "root",
        count: 7
    });
});

test("readRuntime constructs caller-supplied classes", () =>
{
    const input = createRootFixture();
    const runtime = CjsBlackFormat.readRuntime(input, {
        schema: sampleSchema,
        classes: {
            TestRoot: TestRootRuntime,
            TestChild: TestChildRuntime
        }
    });

    assert.equal(runtime.root instanceof TestRootRuntime, true);
    assert.equal(runtime.root.name, "root");
    assert.equal(runtime.root.child instanceof TestChildRuntime, true);
    assert.equal(runtime.root.child.name, "primary");
    assert.equal(runtime.root.items[0], runtime.root.child);
    assert.equal(runtime.root.items[1] instanceof TestChildRuntime, true);
    assert.equal(runtime.root.items[1].name, "secondary");
});

test("compact definitions can map indexed chooser fields", () =>
{
    const schema = {
        EmptyConcrete: {},
        TestIndexed: {
            Primary: {
                type: "float",
                field: "colors",
                index: "primary",
                token: "TYPE_PRIMARY"
            }
        }
    };
    const builder = new BlackFixtureBuilder();
    const input = builder.Finish(builder.Object(1, "TestIndexed", [
        [ "Primary", f32(0.5) ]
    ]));

    const payload = CjsBlackFormat.readPayload(input, { schema });

    assert.deepEqual(schema.EmptyConcrete, {});
    assert.deepEqual(payload.object, {
        _type: "TestIndexed",
        colors: {
            primary: 0.5
        }
    });
});

test("empty objects do not need class definitions", () =>
{
    const builder = new BlackFixtureBuilder();
    const input = builder.Finish(builder.Object(1, "NoDefinitionNeeded", []));

    const payload = CjsBlackFormat.readPayload(input, { schema: null });

    assert.deepEqual(payload.object, { _type: "NoDefinitionNeeded" });
});

test("readDocument keeps a neutral debug graph when requested", () =>
{
    const input = createRootFixture();
    const document = CjsBlackFormat.read(input, {
        emit: CjsBlackFormat.OUTPUT_DOCUMENT,
        schema: sampleSchema
    });

    assert.equal(document.schema, "carbon.document");
    assert.equal(document.format.id, "black");
    assert.equal(document.nodes[0].kind, "TestRoot");
    assert.equal(document.nodes[0].fields.name, "root");
});

test("all read modes include field context in unknown-property errors", () =>
{
    const builder = new BlackFixtureBuilder();
    const input = builder.Finish(builder.Object(1, "TestRoot", [
        [ "name", builder.StringValue("root") ],
        [ "mystery", builder.StringValue("oops") ]
    ]));
    const expected = {
        message: "TestRoot.mystery after name: Unknown Black property mystery for TestRoot"
    };

    assert.throws(() => CjsBlackFormat.readPayload(input, { schema: sampleSchema }), expected);
    assert.throws(() => CjsBlackFormat.readRuntime(input, { schema: sampleSchema }), expected);
    assert.throws(() => CjsBlackFormat.readDocument(input, { schema: sampleSchema }), expected);
});

test("payload decodes indexBuffer binary blocks as Uint32Array", () =>
{
    const builder = new BlackFixtureBuilder();
    const input = builder.Finish(builder.Object(1, "TestIndexBuffer", [
        [ "indexBuffer", binaryBlockUint32([ 0, 1, 65537 ]) ]
    ]));

    const payload = CjsBlackFormat.readPayload(input, { schema: sampleSchema });

    assert.equal(payload.object.indexBuffer instanceof Uint32Array, true);
    assert.deepEqual(Array.from(payload.object.indexBuffer), [ 0, 1, 65537 ]);
    assert.deepEqual(CjsBlackFormat.toJSON(payload).object.indexBuffer, [ 0, 1, 65537 ]);
});

test("manually decorated expression string fields read string refs", () =>
{
    const builder = new BlackFixtureBuilder();
    const input = builder.Finish(builder.Object(1, "TestExpression", [
        [ "expression", builder.StringValue("time * 2.0") ]
    ]));

    const payload = CjsBlackFormat.readPayload(input, { schema: sampleSchema });

    assert.equal(payload.object._type, "TestExpression");
    assert.equal(payload.object.expression, "time * 2.0");
});

test("readRuntime routes construction, values, and finalize through a caller adapter", () =>
{
    const input = createRootFixture();
    const finalizeOrder = [];
    const adapter = {
        construct(kind)
        {
            return { _kind: kind, _values: null, _finalized: false };
        },
        applyValues(instance, values)
        {
            instance._values = values;
            return instance;
        },
        finalize(instance)
        {
            instance._finalized = true;
            finalizeOrder.push(instance._kind);
        }
    };

    const runtime = CjsBlackFormat.readRuntime(input, { schema: sampleSchema, adapter });

    // construct hook built the instances (plain objects, not the fallback class)
    assert.equal(runtime.root._kind, "TestRoot");
    // applyValues received the whole values map
    assert.equal(runtime.root._values.name, "root");
    // object-ref/array values are preserved as constructed instances, and refs are shared
    assert.equal(runtime.root._values.child._kind, "TestChild");
    assert.equal(runtime.root._values.items[1]._kind, "TestChild");
    assert.equal(runtime.root._values.items[0], runtime.root._values.child);
    // finalize ran for every instance after the graph was built...
    assert.equal(runtime.root._finalized, true);
    assert.equal(runtime.root._values.child._finalized, true);
    // ...children before parents
    assert.equal(finalizeOrder[finalizeOrder.length - 1], "TestRoot");
});

test("createLifecycleAdapter drives SetValues and Initialize", () =>
{
    const input = createRootFixture();
    class LiveRoot
    {
        SetValues(values, options) { this.captured = values; this.lifecycleOptions = options; }
        Initialize(options) { this.initialized = true; this.initializeOptions = options; }
    }
    class LiveChild
    {
        SetValues(values, options) { this.captured = values; this.lifecycleOptions = options; }
        Initialize(options) { this.initialized = true; this.initializeOptions = options; }
    }

    const runtime = CjsBlackFormat.readRuntime(input, {
        schema: sampleSchema,
        classes: { TestRoot: LiveRoot, TestChild: LiveChild },
        adapter: createLifecycleAdapter()
    });

    assert.equal(runtime.root instanceof LiveRoot, true);
    assert.equal(runtime.root.captured.name, "root");
    assert.equal(runtime.root.lifecycleOptions.skipUpdate, true);
    assert.equal(runtime.root.lifecycleOptions.skipEvents, true);
    assert.equal(runtime.root.lifecycleOptions.markDirty, false);
    assert.equal(runtime.root.initialized, true);
    assert.equal(runtime.root.initializeOptions, undefined);
    assert.equal(runtime.root.captured.child instanceof LiveChild, true);
    assert.equal(runtime.root.captured.child.initialized, true);
    assert.equal(runtime.root.captured.child.initializeOptions, undefined);
});

function classSchema(className, blackFields)
{
    return {
        schemaVersion: 1,
        family: "test",
        blueClass: className,
        cppClass: className,
        black: {
            schemaVersion: 1,
            className,
            fields: blackFields
        },
        fields: blackFields.map(field => ({
            cppName: field.cppName,
            cppType: field.cppType,
            jsType: field.jsType
        }))
    };
}

function blackField(fieldName, cppName, cppType, beType, extra = {})
{
    return {
        names: {
            [fieldName]: "name fieldName",
            [cppName]: "cppName member memberPath memberRoot"
        },
        cppType,
        beType,
        wireType: extra.wireType || wireTypeForBeType(beType),
        ...extra
    };
}

function wireTypeForBeType(beType)
{
    switch (beType)
    {
        case "STDSTRING":
            return "stringRef";
        case "LONG":
            return "int32";
        case "BOOL":
            return "bool";
        case "FLOAT":
            return "float32";
        case "IROOT":
            return "container";
        case "IROOTPTR":
            return "objectRef";
        case "BINARYBLOCK":
            return "binaryBlock";
        default:
            return null;
    }
}

function createRootFixture()
{
    const builder = new BlackFixtureBuilder();
    const primaryChild = builder.Object(2, "TestChild", [
        [ "name", builder.StringValue("primary") ],
        [ "weight", f32(2.5) ]
    ]);
    const secondaryChild = builder.Object(3, "TestChild", [
        [ "name", builder.StringValue("secondary") ],
        [ "weight", f32(4.25) ]
    ]);

    return builder.Finish(builder.Object(1, "TestRoot", [
        [ "name", builder.StringValue("root") ],
        [ "count", i32(7) ],
        [ "enabled", u8(1) ],
        [ "child", primaryChild ],
        [ "items", concatBytes(u32(2), builder.Object(2), secondaryChild) ]
    ]));
}

class BlackFixtureBuilder
{
    constructor()
    {
        this.stringIndexes = new Map();
        this.strings = [];
    }

    Finish(payload, { wideStrings = [] } = {})
    {
        const stringBlock = createCStringBlock(this.strings);
        const wideStringBlock = createCWStringBlock(wideStrings);
        const bytes = new Uint8Array(12 + stringBlock.length + 4 + wideStringBlock.length + payload.length);
        const view = new DataView(bytes.buffer);
        let offset = 0;

        view.setUint32(offset, CjsBlackFormat.fourCC, true);
        offset += 4;
        view.setUint32(offset, CjsBlackFormat.version, true);
        offset += 4;
        view.setUint32(offset, stringBlock.length, true);
        offset += 4;
        bytes.set(stringBlock, offset);
        offset += stringBlock.length;
        view.setUint32(offset, wideStringBlock.length, true);
        offset += 4;
        bytes.set(wideStringBlock, offset);
        offset += wideStringBlock.length;
        bytes.set(payload, offset);

        return bytes.buffer;
    }

    Object(reference, type = null, fields = [])
    {
        if (type === null)
        {
            return u32(reference);
        }

        const payload = concatBytes(
            this.StringIndexValue(type),
            ...fields.map(([ name, value ]) => concatBytes(this.StringIndexValue(name), value))
        );

        return concatBytes(u32(reference), u32(payload.length), payload);
    }

    StringIndex(value)
    {
        const key = String(value);
        if (!this.stringIndexes.has(key))
        {
            this.stringIndexes.set(key, this.strings.length);
            this.strings.push(key);
        }
        return this.stringIndexes.get(key);
    }

    StringIndexValue(value)
    {
        return u16(this.StringIndex(value));
    }

    StringValue(value)
    {
        return this.StringIndexValue(value);
    }
}

function createCStringBlock(values)
{
    const encoded = values.map(value => new TextEncoder().encode(value));
    const length = 2 + encoded.reduce((sum, value) => sum + value.length + 1, 0);
    const bytes = new Uint8Array(length);
    const view = new DataView(bytes.buffer);
    let offset = 0;

    view.setUint16(offset, values.length, true);
    offset += 2;
    for (const value of encoded)
    {
        bytes.set(value, offset);
        offset += value.length + 1;
    }

    return bytes;
}

function createCWStringBlock(values)
{
    const length = 2 + values.reduce((sum, value) => sum + value.length * 2 + 2, 0);
    const bytes = new Uint8Array(length);
    const view = new DataView(bytes.buffer);
    let offset = 0;

    view.setUint16(offset, values.length, true);
    offset += 2;
    for (const value of values)
    {
        for (let i = 0; i < value.length; i++)
        {
            view.setUint16(offset, value.charCodeAt(i), true);
            offset += 2;
        }
        offset += 2;
    }

    return bytes;
}

function concatBytes(...parts)
{
    const byteLength = parts.reduce((sum, part) => sum + part.length, 0);
    const bytes = new Uint8Array(byteLength);
    let offset = 0;

    for (const part of parts)
    {
        bytes.set(part, offset);
        offset += part.length;
    }

    return bytes;
}

function f32(value)
{
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setFloat32(0, value, true);
    return bytes;
}

function i32(value)
{
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setInt32(0, value, true);
    return bytes;
}

function binaryBlockUint32(values)
{
    return concatBytes(i32(values.length * 4), ...values.map(u32));
}

function u8(value)
{
    return new Uint8Array([ value ]);
}

function u16(value)
{
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, value, true);
    return bytes;
}

function u32(value)
{
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value, true);
    return bytes;
}
