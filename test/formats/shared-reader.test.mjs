import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsBlueReader } from "../../src/format/CjsBlueReader.js";
import { CjsByteReader } from "../../src/format/CjsByteReader.js";
import { CjsReader } from "../../src/format/CjsReader.js";
import { CjsCarbonEffectReader } from "../../src/format/carbonEffect/CjsCarbonEffectReader.js";
import { HlslReader } from "../../src/formats/hlsl/core/HlslReader.js";
import { WebgpuReader } from "../../src/formats/webgpu/core/cewgpu/binary.js";
import { WebglReader } from "../../src/formats/webgl/core/cewg/binary.js";
import { CjsBlackReader } from "../../src/formats/black/core/CjsBlackReader.js";
import {
    CJS_BLACK_FOURCC,
    CJS_BLACK_VERSION
} from "../../src/formats/black/core/blackConstants.js";
import { CjsRedFormat } from "../../src/formats/red/CjsRedFormat.js";
import { CjsRedReader } from "../../src/formats/red/core/CjsRedReader.js";
import { parseRed } from "../../src/formats/red/core/redGraph.js";
import { CjsYamlReader } from "../../src/formats/yaml/core/CjsYamlReader.js";

test("Blue format readers share hydration and output infrastructure", () =>
{
    assert.equal(CjsBlackReader.prototype instanceof CjsBlueReader, true);
    assert.equal(CjsRedReader.prototype instanceof CjsBlueReader, true);
    assert.equal(CjsBlueReader.prototype instanceof CjsReader, true);
});

test("byte-cursor readers share one little-endian implementation", () =>
{
    for (const Reader of [ HlslReader, WebgpuReader, WebglReader, CjsCarbonEffectReader ])
    {
        assert.equal(Reader.prototype instanceof CjsByteReader, true);
        assert.equal(Reader.prototype instanceof CjsReader, true);
        assert.notEqual(Reader.ReadError, undefined);
        assert.equal(typeof Reader.endOfDataMessage, "string");
    }
    assert.equal(CjsByteReader.prototype instanceof CjsReader, true);

    // Each format keeps its own error identity while sharing the cursor.
    const bytes = new Uint8Array(2);
    assert.throws(() => new HlslReader(bytes).readUint32(), /Unexpected end of effect data/);
    assert.throws(() => new WebgpuReader(bytes).readUint32(), /Unexpected end of CEWGPU package data/);
    assert.throws(() => new WebglReader(bytes).readUint32(), /Unexpected end of CEWG package data/);
});

test("YAML shares only the generic construction-bound lifecycle", () =>
{
    assert.equal(CjsYamlReader.prototype instanceof CjsReader, true);
    assert.equal(CjsYamlReader.prototype instanceof CjsBlueReader, false);
    assert.equal("dispose" in CjsReader.prototype, false);
    assert.equal("clear" in CjsReader.prototype, false);
});

test("Red keeps lenient named fields and payload identity on the shared backend", () =>
{
    const shared = { type: "Child", fieldOutsideGeneratedShape: 7 };
    const reader = new CjsRedReader({
        type: "Root",
        left: shared,
        right: shared,
        __authoringFingerprint__: "private"
    });

    const payload = reader.ReadPayload().object;
    assert.equal(payload._type, "Root");
    assert.equal(payload.left.fieldOutsideGeneratedShape, 7);
    assert.equal("__authoringFingerprint__" in payload, false);
    assert.equal(payload.left._id, payload.right._reference);

    const profile = new CjsRedFormat();
    assert.equal(profile.GetValues().payloadTypeField, "_type");
    assert.equal(profile.GetValues().payloadIdField, "_id");
    assert.equal(profile.GetValues().payloadReferenceField, "_reference");
    assert.equal(profile.GetValues().payloadValuesField, "_values");
    profile.SetValues({ payloadValuesField: "values" });
    assert.equal(profile.GetValues().payloadValuesField, "values");
});

test("Red YAML strips nested Blue metadata in every output mode", () =>
{
    const source = [
        "type: Root",
        "__bluemetadata__:",
        "  uiHint: synthetic",
        "child: &child",
        "  type: Child",
        "  __nestedAuthoring__:",
        "    uiHint: synthetic",
        "  value: 7",
        "again: *child"
    ].join("\n");

    const payload = new CjsRedReader(source).ReadPayload().object;
    assertNoDoubleUnderscoreKeys(payload);
    assert.equal(payload.child._id, payload.again._reference);

    const raw = new CjsRedReader(source).ReadRaw();
    assertNoDoubleUnderscoreKeys(raw);
    assert.equal(raw.child, raw.again);

    const runtime = new CjsRedReader(source).ReadRuntime().root;
    assertNoDoubleUnderscoreKeys(runtime);
    assert.equal(runtime.child, runtime.again);
});

test("Red preserves aliased and cyclic sequences in every output mode", () =>
{
    const source = [
        "type: Root",
        "items: &items",
        "  - 7",
        "  - *items",
        "again: *items"
    ].join("\n");
    const parsed = parseRed(source);
    assert.equal(parsed.items, parsed.again);
    assert.equal(parsed.items[1], parsed.items);
    assert.equal(new CjsRedReader(source).Inspect().root.type, "Root");

    const payload = new CjsRedReader(source).ReadPayload();
    assert.deepEqual(payload.object.items, {
        _id: 1,
        _values: [ 7, { _reference: 1 } ]
    });
    assert.deepEqual(payload.object.again, { _reference: 1 });
    assert.doesNotThrow(() => JSON.stringify(payload));

    const raw = new CjsRedReader(source).ReadRaw();
    assert.equal(raw.items, raw.again);
    assert.equal(raw.items[1], raw.items);

    const runtime = new CjsRedReader(source).ReadRuntime().root;
    assert.equal(runtime.items, runtime.again);
    assert.equal(runtime.items[1], runtime.items);

    const unique = new CjsRedReader({ type: "Root", values: [ 1, 2 ] }).ReadPayload().object;
    assert.equal(Array.isArray(unique.values), true);
    assert.deepEqual(unique.values, [ 1, 2 ]);

    const custom = CjsRedFormat.readPayload(source, {
        payloadValuesField: "values"
    }).object;
    assert.deepEqual(custom.items.values, [ 7, { _reference: 1 } ]);
});

test("Red preserves typed-table identity around decoded rows", () =>
{
    const table = {
        structure: [ [ "self", 5, 0 ] ],
        items: []
    };
    table.items.push([ table ]);
    const root = { type: "Root", table, again: table };

    const payload = new CjsRedReader(root).ReadPayload();
    assert.deepEqual(payload.object.table, {
        _id: 1,
        _values: [ { self: { _reference: 1 } } ]
    });
    assert.deepEqual(payload.object.again, { _reference: 1 });
    assert.doesNotThrow(() => JSON.stringify(payload));

    const raw = new CjsRedReader(root).ReadRaw();
    assert.equal(raw.table, raw.again);
    assert.equal(raw.table[0].self, raw.table);

    const phases = [];
    const runtime = new CjsRedReader(root, {
        adapter: {
            construct(kind) { phases.push(`construct:${kind}`); return {}; },
            applyValues(instance, values, context)
            {
                phases.push(`apply:${context.kind}`);
                Object.assign(instance, values);
            },
            finalize(_instance, context) { phases.push(`finalize:${context.kind}`); }
        }
    }).ReadRuntime().root;
    assert.equal(runtime.table, runtime.again);
    assert.equal(runtime.table[0].self, runtime.table);
    assert.deepEqual(phases, [ "construct:Root", "apply:Root", "finalize:Root" ]);

    const unique = new CjsRedReader({
        type: "Root",
        table: {
            structure: [ [ "value", 10, 0 ] ],
            items: [ [ 7 ] ]
        }
    }).ReadPayload().object;
    assert.equal(Array.isArray(unique.table), true);
    assert.deepEqual(unique.table, [ { value: 7 } ]);

    const metadataColumn = new CjsRedReader({
        type: "Root",
        table: {
            structure: [ [ "__bluemetadata__", 5, 0 ], [ "value", 10, 1 ] ],
            items: [ [ "private", 7 ] ]
        }
    }).ReadPayload().object;
    assert.deepEqual(metadataColumn.table, [ { value: 7 } ]);
});

test("Red payload reference IDs remain lazily encounter-ordered", () =>
{
    const sequence = [ 1 ];
    const object = { type: "Child" };
    const payload = new CjsRedReader({
        type: "Root",
        sequence,
        object,
        objectAgain: object,
        sequenceAgain: sequence
    }).ReadPayload().object;

    assert.equal(payload.object._id, 1);
    assert.equal(payload.sequence._id, 2);
    assert.deepEqual(payload.objectAgain, { _reference: 1 });
    assert.deepEqual(payload.sequenceAgain, { _reference: 2 });

    const zeroBased = new CjsRedReader({
        type: "Root",
        object,
        objectAgain: object
    }, { firstId: 0 }).ReadPayload().object;
    assert.equal(zeroBased.object._id, 0);
    assert.deepEqual(zeroBased.objectAgain, { _reference: 0 });
});

test("Red keeps ID-only sequence wrappers serializable", () =>
{
    const sequence = [ 1 ];
    const payload = new CjsRedReader({
        type: "Root",
        left: sequence,
        right: sequence
    }, {
        payloadReferenceField: false
    }).ReadPayload().object;

    assert.equal(payload.left, payload.right);
    assert.equal(payload.left._id, 1);
    assert.deepEqual(payload.left._values, [ 1 ]);
    assert.equal(JSON.parse(JSON.stringify(payload)).left._id, 1);

    const cyclic = [];
    cyclic.push(cyclic);
    const cyclicPayload = new CjsRedReader({ type: "Root", cyclic }, {
        payloadReferenceField: false
    }).ReadPayload().object;
    assert.equal(cyclicPayload.cyclic._values[0], cyclicPayload.cyclic);
    assert.throws(() => JSON.stringify(cyclicPayload), TypeError);

    assert.throws(
        () => new CjsRedReader({ type: "Root" }, {
            payloadReferenceField: false,
            payloadValuesField: false
        }).ReadPayload(),
        error => error.code === "PAYLOAD_MARKER_CONFIGURATION"
    );
});

test("Red rejects reserved payload fields and accepts explicit remapping", () =>
{
    const shared = {
        type: "Child",
        _type: "authored-type",
        _id: 99,
        _reference: "authored-reference"
    };
    const root = { type: "Root", child: shared, again: shared };

    assert.throws(
        () => new CjsRedReader(root).ReadPayload(),
        error => error.code === "PAYLOAD_RESERVED_FIELD_COLLISION"
    );
    for (const field of [ "_type", "_id", "_reference", "_values" ])
    {
        assert.throws(
            () => new CjsRedReader({ type: "Root", [field]: "authored" }).ReadPayload(),
            error => error.code === "PAYLOAD_RESERVED_FIELD_COLLISION"
        );
    }

    const remapped = new CjsRedReader(root, {
        payloadTypeField: "$type",
        payloadIdField: "$id",
        payloadReferenceField: "$ref"
    }).ReadPayload().object;
    assert.equal(remapped.child._type, "authored-type");
    assert.equal(remapped.child._id, 99);
    assert.equal(remapped.child._reference, "authored-reference");
    assert.equal(remapped.child.$id, 1);
    assert.deepEqual(remapped.again, { $ref: 1 });

    const identity = new CjsRedReader(root, {
        payloadTypeField: "$type",
        payloadIdField: false,
        payloadReferenceField: false
    }).ReadPayload().object;
    assert.equal(identity.child, identity.again);
    assert.equal(identity.child._id, 99);

    const identityValues = new CjsRedReader({
        type: "Root",
        _values: "authored"
    }, {
        payloadIdField: false,
        payloadReferenceField: false
    }).ReadPayload().object;
    assert.equal(identityValues._values, "authored");

    for (const selfFirst of [ false, true ])
    {
        const cyclic = selfFirst ? { type: "Child" } : { type: "Child", _id: 99 };
        cyclic.self = cyclic;
        if (selfFirst) cyclic._id = 99;
        assert.throws(
            () => new CjsRedReader(cyclic).ReadPayload(),
            error => error.code === "PAYLOAD_RESERVED_FIELD_COLLISION"
        );
    }

    assert.throws(
        () => new CjsRedReader(root, {
            payloadIdField: false
        }).ReadPayload(),
        error => error.code === "PAYLOAD_MARKER_CONFIGURATION"
    );
    assert.throws(
        () => new CjsRedReader(root, {
            payloadTypeField: "$marker",
            payloadIdField: "$marker"
        }).ReadPayload(),
        error => error.code === "PAYLOAD_MARKER_CONFIGURATION"
    );
    for (const options of [
        { payloadIdField: "$marker", payloadReferenceField: "$marker" },
        { payloadReferenceField: "$marker", payloadValuesField: "$marker" },
        { payloadValuesField: false }
    ])
    {
        assert.throws(
            () => new CjsRedReader(root, options).ReadPayload(),
            error => error.code === "PAYLOAD_MARKER_CONFIGURATION"
        );
    }
    for (const payloadValuesField of [ Symbol("values"), {}, 7, "" ])
    {
        assert.throws(
            () => CjsRedFormat.readPayload(root, { payloadValuesField }),
            error => error.code === "PAYLOAD_MARKER_CONFIGURATION"
        );
    }
    assert.throws(
        () => CjsRedFormat.readPayload(root, { payloadIdField: Symbol("id") }),
        error => error.code === "PAYLOAD_MARKER_CONFIGURATION"
    );

    const protoShared = { type: "Child" };
    const protoMarkers = new CjsRedReader({
        type: "Root",
        child: protoShared,
        again: protoShared
    }, {
        payloadIdField: "__proto__",
        payloadReferenceField: "$ref"
    }).ReadPayload().object;
    assert.equal(Object.hasOwn(protoMarkers.child, "__proto__"), true);
    assert.equal(protoMarkers.child.__proto__, 1);
    assert.deepEqual(protoMarkers.again, { $ref: 1 });

    const raw = new CjsRedReader(root).ReadRaw();
    assert.equal(raw.child._id, 99);
    assert.equal(raw.child._reference, "authored-reference");
    const runtime = new CjsRedReader(root).ReadRuntime().root;
    assert.equal(runtime.child._id, 99);
    assert.equal(runtime.child._reference, "authored-reference");
});

test("Red runtime keeps untyped maps outside the adapter lifecycle", () =>
{
    const phases = [];
    const adapter = {
        construct(kind)
        {
            phases.push(`construct:${kind}`);
            return {};
        },
        applyValues(instance, values, context)
        {
            phases.push(`apply:${context.kind}`);
            Object.assign(instance, values);
        },
        finalize(_instance, context)
        {
            phases.push(`finalize:${context.kind}`);
        }
    };
    const runtime = new CjsRedReader({
        type: "Root",
        settings: { enabled: true }
    }, { adapter }).ReadRuntime().root;

    assert.deepEqual(runtime.settings, { enabled: true });
    assert.deepEqual(phases, [
        "construct:Root",
        "apply:Root",
        "finalize:Root"
    ]);
});

test("Red preserves recursive apply and post-graph finalize ordering", () =>
{
    const phases = [];
    const adapter = {
        construct(kind)
        {
            phases.push(`construct:${kind}`);
            return {};
        },
        applyValues(instance, values, context)
        {
            phases.push(`apply:${context.kind}`);
            Object.assign(instance, values);
        },
        finalize(_instance, context)
        {
            phases.push(`finalize:${context.kind}`);
        }
    };

    new CjsRedReader({
        type: "Root",
        left: { type: "Left", value: 1 },
        right: { type: "Right", value: 2 }
    }, { adapter }).ReadRuntime();

    assert.deepEqual(phases, [
        "construct:Root",
        "construct:Left",
        "apply:Left",
        "construct:Right",
        "apply:Right",
        "apply:Root",
        "finalize:Left",
        "finalize:Right",
        "finalize:Root"
    ]);
});

test("source-bound Blue readers reset graph state between output modes", () =>
{
    const cyclic = { type: "Child" };
    cyclic.self = cyclic;
    const red = new CjsRedReader({ type: "Root", cyclic });

    const firstRedPayload = red.ReadPayload().object;
    assert.equal(firstRedPayload.cyclic._id, 1);
    assert.deepEqual(firstRedPayload.cyclic.self, { _reference: 1 });
    assert.doesNotThrow(() => JSON.stringify(firstRedPayload));

    const redRaw = red.ReadRaw();
    assert.equal(redRaw.cyclic.self, redRaw.cyclic);
    const redRuntime = red.ReadRuntime().root;
    assert.equal(redRuntime.cyclic.self, redRuntime.cyclic);
    assert.deepEqual(red.ReadPayload().object, firstRedPayload);

    const black = new CjsBlackReader(createBlackFixture(), { schema: BLACK_SCHEMA });
    const firstBlackPayload = black.ReadPayload().object;
    const blackDocument = black.ReadDocument();
    assert.equal(blackDocument.schema, "carbon.document");
    assert.equal(blackDocument.nodes[0].kind, "TestRoot");
    const blackRuntime = black.ReadRuntime().root;
    assert.equal(blackRuntime.child, blackRuntime.again);
    assert.deepEqual(black.ReadPayload().object, firstBlackPayload);
});

test("Black source reader preserves payload references and runtime hydration", () =>
{
    const input = createBlackFixture();
    const payloadReader = new CjsBlackReader(input, { schema: BLACK_SCHEMA });

    assert.equal(payloadReader.Inspect().format.id, "black");
    const payload = payloadReader.ReadPayload().object;
    assert.equal(payload._type, "TestRoot");
    assert.equal(payload.name, "root");
    assert.equal(payload.child._type, "TestChild");
    assert.equal(payload.child._id, 2);
    assert.deepEqual(payload.again, { _reference: 2 });

    const phases = [];
    const adapter = {
        construct(kind, context)
        {
            phases.push(`construct:${kind}:${context.shape?.className}`);
            return {};
        },
        applyValues(instance, values, context)
        {
            phases.push(`apply:${context.kind}:${context.shape?.className}`);
            Object.assign(instance, values);
        },
        finalize(_instance, context)
        {
            phases.push(`finalize:${context.kind}:${context.shape?.className}`);
        }
    };
    const runtime = new CjsBlackReader(input, {
        schema: BLACK_SCHEMA,
        adapter
    }).ReadRuntime().root;

    assert.equal(runtime.child, runtime.again);
    assert.deepEqual(phases, [
        "construct:TestRoot:TestRoot",
        "construct:TestChild:TestChild",
        "apply:TestChild:TestChild",
        "apply:TestRoot:TestRoot",
        "finalize:TestChild:TestChild",
        "finalize:TestRoot:TestRoot"
    ]);

    const fallback = new CjsBlackReader(input, {
        schema: BLACK_SCHEMA
    }).ReadRuntime().root;
    assert.equal(fallback._sourceClassName, "TestRoot");
    assert.equal(fallback._sourceShape.className, "TestRoot");
    assert.equal(fallback.child, fallback.again);
});

test("Black preserves custom payload fields and falsy-kind class lookup", () =>
{
    const payload = new CjsBlackReader(createBlackFixture(), {
        schema: BLACK_SCHEMA,
        payloadTypeField: "kind",
        payloadIdField: "id",
        payloadReferenceField: "ref"
    }).ReadPayload().object;

    assert.equal(payload.kind, "TestRoot");
    assert.equal(payload.child.id, 2);
    assert.deepEqual(payload.again, { ref: 2 });

    const identityPayload = new CjsBlackReader(createBlackFixture(), {
        schema: BLACK_SCHEMA,
        payloadTypeField: false,
        payloadIdField: false,
        payloadReferenceField: false
    }).ReadPayload().object;
    assert.equal("_type" in identityPayload, false);
    assert.equal("_id" in identityPayload.child, false);
    assert.equal(identityPayload.child, identityPayload.again);

    const referenceOnlyPayload = new CjsBlackReader(createBlackFixture(), {
        schema: BLACK_SCHEMA,
        payloadIdField: false
    }).ReadPayload().object;
    assert.equal("_id" in referenceOnlyPayload.child, false);
    assert.deepEqual(referenceOnlyPayload.again, { _reference: 2 });

    assert.doesNotThrow(() => new CjsBlackReader(createBlackFixture(), {
        schema: BLACK_SCHEMA,
        payloadTypeField: "marker",
        payloadIdField: "marker"
    }).ReadPayload());

    class EmptyKind {}
    const builder = new BlackFixtureBuilder();
    const input = builder.Finish(builder.Object(1, "", []));
    const runtime = new CjsBlackReader(input, {
        classes: { "": EmptyKind }
    }).ReadRuntime();
    assert.equal(runtime.root instanceof EmptyKind, true);

});

const BLACK_SCHEMA = {
    TestRoot: {
        name: "string",
        child: "object",
        again: "object"
    },
    TestChild: {
        name: "string"
    }
};

function createBlackFixture()
{
    const builder = new BlackFixtureBuilder();
    const child = builder.Object(2, "TestChild", [
        [ "name", builder.StringValue("child") ]
    ]);
    return builder.Finish(builder.Object(1, "TestRoot", [
        [ "name", builder.StringValue("root") ],
        [ "child", child ],
        [ "again", u32(2) ]
    ]));
}

class BlackFixtureBuilder
{
    constructor()
    {
        this.stringIndexes = new Map();
        this.strings = [];
    }

    Finish(payload)
    {
        const strings = createCStringBlock(this.strings);
        const wideStrings = createWideStringBlock();
        return concatBytes(
            u32(CJS_BLACK_FOURCC),
            u32(CJS_BLACK_VERSION),
            u32(strings.length),
            strings,
            u32(wideStrings.length),
            wideStrings,
            payload
        ).buffer;
    }

    Object(reference, kind = null, fields = [])
    {
        if (kind === null) return u32(reference);
        const payload = concatBytes(
            this.StringValue(kind),
            ...fields.map(([ name, value ]) => concatBytes(this.StringValue(name), value))
        );
        return concatBytes(u32(reference), u32(payload.length), payload);
    }

    StringValue(value)
    {
        const text = String(value);
        if (!this.stringIndexes.has(text))
        {
            this.stringIndexes.set(text, this.strings.length);
            this.strings.push(text);
        }
        return u16(this.stringIndexes.get(text));
    }
}

function createCStringBlock(values)
{
    const encoder = new TextEncoder();
    const encoded = values.map(value => encoder.encode(value));
    const bytes = new Uint8Array(2 + encoded.reduce((sum, value) => sum + value.length + 1, 0));
    new DataView(bytes.buffer).setUint16(0, values.length, true);
    let offset = 2;
    for (const value of encoded)
    {
        bytes.set(value, offset);
        offset += value.length + 1;
    }
    return bytes;
}

function createWideStringBlock()
{
    return new Uint8Array(2);
}

function concatBytes(...parts)
{
    const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts)
    {
        bytes.set(part, offset);
        offset += part.length;
    }
    return bytes;
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

function assertNoDoubleUnderscoreKeys(value, seen = new Set())
{
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    for (const [ key, child ] of Object.entries(value))
    {
        assert.equal(key.startsWith("__"), false);
        assertNoDoubleUnderscoreKeys(child, seen);
    }
}
