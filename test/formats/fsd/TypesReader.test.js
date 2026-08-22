import assert from "node:assert/strict";
import test from "node:test";

import { CjsFsd64SchemaTypes } from "../../../src/formats/fsd/64/readers/CjsFsd64SchemaTypes.js";

const SCHEMA_ID = "4f25d0f64115864bd8c4f58da09c1758";
const RECORD_SIZE = 152;

test("the types schema pins the layout that was solved against the export", () =>
{
    const schema = CjsFsd64SchemaTypes.getFsdSchema();
    const fields = new Map(schema.container.fields.map(field => [ field.name, field ]));

    assert.equal(schema.schemaID, SCHEMA_ID);
    assert.equal(schema.schemaID.length, 32);
    assert.equal(schema.container.recordSize, RECORD_SIZE);
    assert.equal(fields.get("nameID").offset, 132);
    assert.equal(fields.get("descriptionID").offset, 68);
    assert.equal(fields.get("groupID").offset, 84);
    assert.equal(fields.get("mass").offset, 32);
    assert.equal(fields.get("descriptionID").presenceMask, 0x8);
    assert.equal(fields.get("iconID").presenceMask, 0x80);
    assert.equal(fields.get("variationParentTypeID").presenceMask, 0x400000);

    for (const name of [
        "basePrice", "capacity", "mass", "volume", "radius",
        "portionSize", "nameID", "groupID",
    ])
    {
        assert.equal(fields.get(name).presenceMask, undefined);
    }
});

test("name and description are label identifiers, never text", () =>
{
    const fields = new Map(CjsFsd64SchemaTypes.getFsdSchema().container.fields.map(field => [ field.name, field ]));

    assert.equal(fields.get("nameID").type, "UINT_32");
    assert.equal(fields.get("descriptionID").type, "UINT_32");
    assert.equal(fields.has("name"), false);
    assert.equal(fields.has("description"), false);
});

test("packed flags decode as booleans, not as their containing byte", () =>
{
    const fields = new Map(CjsFsd64SchemaTypes.getFsdSchema().container.fields.map(field => [ field.name, field ]));

    assert.equal(fields.get("isDynamicType").type, "BOOLEAN");
    assert.equal(fields.get("isDynamicType").offset, 144);
    assert.equal(fields.get("isDynamicType").bit, 0);
    assert.equal(fields.get("published").type, "BOOLEAN");
    assert.equal(fields.get("published").offset, 145);
    assert.equal(fields.get("published").bit, 0);
});
