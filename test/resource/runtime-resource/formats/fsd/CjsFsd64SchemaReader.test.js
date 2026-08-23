import assert from "node:assert/strict";
import test from "node:test";

import { CjsFsd64SchemaAncestries } from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaAncestries.js";
import { CjsFsd64Binary } from "../../../../../src/resource/formats/fsd/64/core/CjsFsd64Binary.js";
import { CjsFsd64SchemaDecoder } from "../../../../../src/resource/formats/fsd/64/core/CjsFsd64SchemaDecoder.js";

test("exposes an ancestry schema using FsdBinary type names", () =>
{
    const schema = CjsFsd64SchemaAncestries.getFsdSchema();
    const bloodlineID = schema.container.fields.find(field => field.name === "bloodlineID");

    assert.equal(schema.schema, "carbonenginejs.fsdBinarySchema");
    assert.equal(schema.name, "ancestries");
    assert.equal(schema.schemaVersion, 1);
    assert.equal(bloodlineID.type, "INT_32_IDENTIFIER");
    assert.equal(bloodlineID.type, CjsFsd64Binary.Type.INT_32_IDENTIFIER);
    assert.equal(bloodlineID.offset, 16);
    assert.equal(CjsFsd64SchemaAncestries.fsdSchema, undefined);
    assert.equal(Object.hasOwn(CjsFsd64SchemaAncestries, "getFsdSchema"), true);
    assert.equal(CjsFsd64SchemaAncestries.getFsdSchema(), schema);
    assert.equal(CjsFsd64SchemaAncestries.schema, undefined);
    assert.equal(CjsFsd64SchemaAncestries.getSchema, undefined);
});

test("reads ancestry bytes as lossless JSON through the shared schema decoder", () =>
{
    const reader = new CjsFsd64SchemaAncestries();
    const bytes = CreateAncestryFixture(9_007_199_254_740_993n, 0x0f);
    const result = reader.ReadJSON(bytes);

    assert.deepEqual(result, {
        "9007199254740993": {
            bloodlineID: "-1",
            charisma: 11,
            intelligence: 14,
            memory: 15,
            perception: 17,
            willpower: 18,
            descriptionID: "12",
            iconID: "13",
            nameID: "16",
            shortDescription: "A short history",
        },
    });
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});

test("leaves absent optional schema fields absent from JSON", () =>
{
    const result = new CjsFsd64SchemaAncestries().ReadJSON(CreateAncestryFixture(7n, 0));

    assert.deepEqual(result, {
        7: {
            bloodlineID: "-1",
            charisma: 11,
            intelligence: 14,
            memory: 15,
            perception: 17,
            willpower: 18,
        },
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

function CreateAncestryFixture(key, flags)
{
    const schema = CjsFsd64SchemaAncestries.getFsdSchema();
    const bytes = CreateContainer(512, schema.schemaID);
    const view = new DataView(bytes.buffer);
    const root = 32;
    const table = 64;
    const record = 96;
    const stringOffset = 240;

    SetUint64(view, root, table - root);
    SetUint64(view, root + 8, 1);
    SetUint64(view, table - 8, 1);
    SetUint64(view, table, record - root);
    SetUint64(view, record - 8, 1);
    SetUint64(view, record, key);
    SetUint64(view, record + 8, stringOffset - root);

    view.setInt32(record + 16, -1, true);
    view.setInt32(record + 20, 11, true);
    view.setInt32(record + 24, 12, true);
    view.setInt32(record + 28, 13, true);
    view.setInt32(record + 32, 14, true);
    view.setInt32(record + 36, 15, true);
    view.setInt32(record + 40, 16, true);
    view.setInt32(record + 44, 17, true);
    view.setInt32(record + 48, 18, true);
    view.setUint32(record + 52, flags, true);
    SetString(bytes, view, stringOffset, "A short history");
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

function SetString(bytes, view, dataOffset, value)
{
    const encoded = new TextEncoder().encode(value);
    SetUint64(view, dataOffset - 8, encoded.byteLength);
    bytes.set(encoded, dataOffset);
}

function SetUint64(view, offset, value)
{
    view.setBigUint64(offset, BigInt(value), true);
}
