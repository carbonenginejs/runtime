import assert from "node:assert/strict";
import test from "node:test";

import { CamelizeFieldName, CjsFsd64SchemaDecoder } from "../../../src/formats/fsd/64/core/CjsFsd64SchemaDecoder.js";
import * as readerExports from "../../../src/formats/fsd/64/readers/index.js";

test("a trailing id segment becomes ID, not Id", () =>
{
    // The rule that was applied by hand before it was written down, and applied
    // inconsistently: typeID in one schema, typeListId in another package.
    assert.equal(CamelizeFieldName("type_id"), "typeID");
    assert.equal(CamelizeFieldName("item_type_id"), "itemTypeID");
    assert.equal(CamelizeFieldName("origin_event"), "originEvent");
    assert.equal(CamelizeFieldName("allow_all_ships"), "allowAllShips");
    assert.equal(CamelizeFieldName("finish"), "finish");
});

test("a schema whose field name contradicts its source is refused", () =>
{
    const build = (name, sourceName, renamed) => ({
        schema: "carbonenginejs.fsdBinarySchema",
        name: "test", schemaVersion: 1, path: "res:/test.fsdbinary",
        schemaID: "0".repeat(32),
        container: {
            type: "MAP", recordSize: 8,
            key: { type: "UINT_32_IDENTIFIER", offset: 0 },
            fields: [ { name, sourceName, renamed, type: "UINT_32", offset: 4 } ],
        },
    });

    // The transcription slip this check exists to catch.
    assert.throws(() => CjsFsd64SchemaDecoder.defineSchema(build("typeId", "type_id")), /converts to typeID/u);
    assert.doesNotThrow(() => CjsFsd64SchemaDecoder.defineSchema(build("typeID", "type_id")));

    // A deliberate departure has to say so rather than being silently allowed:
    // a label identifier the export republishes as resolved text.
    assert.throws(() => CjsFsd64SchemaDecoder.defineSchema(build("nameID", "name")), /converts to name/u);
    assert.doesNotThrow(() => CjsFsd64SchemaDecoder.defineSchema(build("nameID", "name", true)));
});

test("every recorded source name agrees with its field name", () =>
{
    let checked = 0;
    const readerClasses = Object.values(readerExports).filter(value =>
        typeof value === "function" && typeof value.getFsdSchema === "function"
    );

    assert.equal(readerClasses.length, 56);

    for (const Reader of readerClasses)
    {
        const schema = Reader.getFsdSchema();

        // defineSchema enforces it; this asserts the corpus actually exercises
        // the check rather than passing because nothing declares a source.
        assert.doesNotThrow(() => CjsFsd64SchemaDecoder.defineSchema(schema), Reader.name);

        const walk = (descriptor) =>
        {
            if (!descriptor || typeof descriptor !== "object") return;

            for (const field of descriptor.fields ?? [])
            {
                if (field.sourceName !== undefined) checked += 1;
                walk(field);
            }

            walk(descriptor.item);
            walk(descriptor.value);
        };

        walk(schema.container);
    }

    assert.ok(checked >= 30, `expected the SKINR schemas to record source names, got ${checked}`);
});
