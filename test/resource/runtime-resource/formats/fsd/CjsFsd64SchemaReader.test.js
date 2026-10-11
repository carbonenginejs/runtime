import assert from "node:assert/strict";
import test from "node:test";

import { CjsFsd64Binary } from "../../../../../src/resource/formats/fsd/64/core/CjsFsd64Binary.js";
import { CjsFsd64SchemaDecoder } from "../../../../../src/resource/formats/fsd/64/core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../../../../../src/resource/formats/fsd/64/core/CjsFsd64SchemaReader.js";

/** Synthetic schema reader: the runtime ships no per-table FSD schemas. */
class TestSchemaReader extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        schema: "carbonenginejs.fsdBinarySchema",
        name: "example",
        schemaVersion: 1,
        path: "res:/test/example.fsdbinary",
        schemaID: "0123456789abcdef0123456789abcdef",
        container: {
            type: "MAP",
            recordSize: 24,
            key: { type: "UINT_64_IDENTIFIER", offset: 0 },
            presence: { type: "UINT_32", offset: 20, allowedMask: 1 },
            fields: [
                { name: "count", type: "INT_32", offset: 8 },
                { name: "linkID", type: "INT_32_IDENTIFIER", offset: 12 },
                { name: "optionalValue", type: "INT_32", offset: 16, presenceMask: 1 },
            ],
        },
    }));
}

test("a schema reader subclass exposes its inline schema through getFsdSchema", () =>
{
    const schema = TestSchemaReader.getFsdSchema();
    const linkID = schema.container.fields.find(field => field.name === "linkID");

    assert.equal(schema.schema, "carbonenginejs.fsdBinarySchema");
    assert.equal(schema.name, "example");
    assert.equal(linkID.type, CjsFsd64Binary.Type.INT_32_IDENTIFIER);
    assert.equal(TestSchemaReader.path, "res:/test/example.fsdbinary");
    assert.equal(TestSchemaReader.schemaID, "0123456789abcdef0123456789abcdef");
    assert.equal(Object.hasOwn(TestSchemaReader, "getFsdSchema"), true);
    assert.equal(TestSchemaReader.getFsdSchema(), schema);
    assert.throws(() => CjsFsd64SchemaReader.getFsdSchema(), /must define static getFsdSchema/u);
});

test("reads bytes as lossless JSON through the shared schema decoder", () =>
{
    const result = new TestSchemaReader().ReadJSON(CreateFixture(9_007_199_254_740_993n, 1));

    assert.deepEqual(result, {
        "9007199254740993": { count: 11, linkID: "-1", optionalValue: 12 },
    });
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});

test("leaves absent optional schema fields absent from JSON", () =>
{
    assert.deepEqual(new TestSchemaReader().ReadJSON(CreateFixture(7n, 0)), {
        7: { count: 11, linkID: "-1" },
    });
});

test("rejects unknown type names while defining an inert schema", () =>
{
    assert.throws(
        () => CjsFsd64SchemaDecoder.defineSchema({
            schema: "carbonenginejs.fsdBinarySchema",
            name: "example",
            schemaVersion: 1,
            path: "res:/staticdata/example.fsdbinary",
            schemaID: "0".repeat(48),
            container: {
                type: "MAP",
                recordSize: 8,
                key: {
                    type: "NOT_A_TYPE",
                    offset: 0,
                },
                fields: [],
            },
        }),
        error => error.code === "CJS_FSD_BINARY_SCHEMA_INVALID",
    );
});

test("rejects fields which are not ordered by byte offset", () =>
{
    assert.throws(
        () => CjsFsd64SchemaDecoder.defineSchema({
            schema: "carbonenginejs.fsdBinarySchema",
            name: "example",
            schemaVersion: 1,
            path: "res:/staticdata/example.fsdbinary",
            schemaID: "0".repeat(48),
            container: {
                type: "MAP",
                recordSize: 16,
                key: {
                    type: "UINT_64_IDENTIFIER",
                    offset: 0,
                },
                fields: [
                    {
                        name: "second",
                        type: "INT_32",
                        offset: 12,
                    },
                    {
                        name: "first",
                        type: "INT_32",
                        offset: 8,
                    },
                ],
            },
        }),
        error => error.code === "CJS_FSD_BINARY_SCHEMA_INVALID" &&
            /ordered by byte offset/u.test(error.message),
    );
});

function CreateFixture(key, flags)
{
    const bytes = CreateContainer(256, TestSchemaReader.schemaID);
    const view = new DataView(bytes.buffer);
    const root = 32;
    const table = 64;
    const record = 96;

    SetUint64(view, root, table - root);
    SetUint64(view, root + 8, 1);
    SetUint64(view, table - 8, 1);
    SetUint64(view, table, record - root);
    SetUint64(view, record - 8, 1);
    SetUint64(view, record, key);
    view.setInt32(record + 8, 11, true);
    view.setInt32(record + 12, -1, true);
    view.setInt32(record + 16, 12, true);
    view.setUint32(record + 20, flags, true);
    return bytes;
}

function CreateContainer(size, schemaID)
{
    const bytes = new Uint8Array(size);
    const view = new DataView(bytes.buffer);

    for (let index = 0; index < 24; index++)
    {
        bytes[index] = Number.parseInt(schemaID.slice(index * 2, index * 2 + 2), 16);
    }

    SetUint64(view, 24, size - 32);
    return bytes;
}

function SetUint64(view, offset, value)
{
    view.setBigUint64(offset, BigInt(value), true);
}
