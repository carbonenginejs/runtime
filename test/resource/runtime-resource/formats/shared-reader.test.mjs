import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsBlueReader } from "../../../../src/resource/format/CjsBlueReader.js";
import { CjsByteReader } from "../../../../src/resource/format/CjsByteReader.js";
import { CjsReader } from "../../../../src/resource/format/CjsReader.js";
import { CjsCarbonEffectReader } from "../../../../src/resource/format/carbonEffect/CjsCarbonEffectReader.js";
import { HlslReader } from "../../../../src/resource/formats/hlsl/core/HlslReader.js";
import { DxbcReader } from "../../../../src/resource/formats/dxbc/core/DxbcReader.js";
import { DxbcReadError } from "../../../../src/resource/formats/dxbc/core/DxbcReadError.js";
import { CjsBlackReader } from "../../../../src/resource/formats/black/core/CjsBlackReader.js";
import {
    CJS_BLACK_FOURCC,
    CJS_BLACK_VERSION
} from "../../../../src/resource/formats/black/core/blackConstants.js";
import { YamlReader } from "../../../../src/global/blue/YamlReader.js";
import { IRootReaderBase } from "../../../../src/global/blue/IRootReaderBase.js";
import { CjsYamlReader } from "../../../../src/resource/formats/yaml/core/CjsYamlReader.js";

test("Black retains its hydration backend while YamlReader uses native IRootReaderBase", () =>
{
    assert.equal(CjsBlackReader.prototype instanceof CjsBlueReader, true);
    assert.equal(YamlReader.prototype instanceof IRootReaderBase, true);
    assert.equal(YamlReader.prototype instanceof CjsBlueReader, false);
    assert.equal(CjsBlueReader.prototype instanceof CjsReader, true);
});

test("byte-cursor readers share one little-endian implementation", () =>
{
    // Both backend chunk readers are gone. WebgpuReader went with the WebGPU
    // chunk package and WebglReader with the WebGL one; both backends read
    // through CjsCarbonEffectReader now, which this list covers.
    for (const Reader of [ HlslReader, DxbcReader, CjsCarbonEffectReader ])
    {
        assert.equal(Reader.prototype instanceof CjsByteReader, true);
        assert.equal(Reader.prototype instanceof CjsReader, true);
        assert.notEqual(Reader.ReadError, undefined);
        assert.equal(typeof Reader.endOfDataMessage, "string");
    }
    assert.equal(CjsByteReader.prototype instanceof CjsReader, true);

    // Each format keeps its own error identity while sharing the cursor.
    const bytes = new Uint8Array(2);
    assert.throws(() => new HlslReader(bytes).ReadUint32(), /Unexpected end of effect data/);
    assert.throws(
        () => new CjsCarbonEffectReader(bytes).ReadUint32(),
        /Unexpected end of Carbon effect data/u
    );

    // DXBC reports its own error class and keeps the message it used before it
    // became a subclass; the base default would silently read "end of data".
    assert.throws(() => new DxbcReader(bytes).ReadUint32(), DxbcReadError);
    assert.throws(() => new DxbcReader(bytes).ReadUint32(), /Unexpected end of effect data/);

    // The source name reaches the detail bag through the shared _error path.
    assert.throws(
        () => new DxbcReader(bytes, { source: "shader.dxbc" }).ReadUint32(),
        (error) => error.details.source === "shader.dxbc" && error.details.requested === 4
    );
});

test("YAML shares only the generic construction-bound lifecycle", () =>
{
    assert.equal(CjsYamlReader.prototype instanceof CjsReader, true);
    assert.equal(CjsYamlReader.prototype instanceof CjsBlueReader, false);
    assert.equal("dispose" in CjsReader.prototype, false);
    assert.equal("clear" in CjsReader.prototype, false);
});

// Red's former generic graphs, cyclic sequence/table wrappers, configurable
// payload markers and whole-graph adapter phases are retired. The Red public
// contract and yaml-reader tests cover native objects and values-service output.
test("source-bound Black readers reset graph state between output modes", () =>
{
    const black = new CjsBlackReader(createBlackFixture(), { schema: BLACK_SCHEMA });
    const firstBlackPayload = black.ReadPayload().object;
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
    assert.deepEqual(payload.again, { _ref: 2 });

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
    assert.deepEqual(referenceOnlyPayload.again, { _ref: 2 });

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

test("Black reads past object metadata and never surfaces it (privacy)", () =>
{
    const builder = new BlackFixtureBuilder();
    const child = builder.Object(2, "TestChild", [
        [ "name", builder.StringValue("child") ]
    ]);
    const input = builder.Finish(builder.Object(1, "TestRoot", [
        [ "name", builder.StringValue("root") ],
        [ "__bluemetadata__", builder.StringValue("authoring-tool-metadata") ],
        [ "child", child ],
        [ "again", u32(2) ]
    ]));
    const seen = new WeakSet();
    const text = value => JSON.stringify(value, (key, item) =>
    {
        if (item && typeof item === "object")
        {
            if (seen.has(item)) return undefined;
            seen.add(item);
        }
        return item;
    });
    for (const options of [ {}, { captureUnknownBlackFields: true, captureUnknownWhenNoBlackFields: true } ])
    {
        const reader = () => new CjsBlackReader(input, { schema: BLACK_SCHEMA, ...options });
        for (const output of [ reader().ReadPayload(), reader().ReadRuntime() ])
        {
            const serialized = text(output);
            assert.equal(serialized.includes("__bluemetadata__"), false);
            assert.equal(serialized.includes("someone"), false);
        }
        const payload = reader().ReadPayload().object;
        assert.equal(payload.name, "root");
        assert.deepEqual(payload.again, { _ref: 2 });
    }
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
