import assert from "node:assert/strict";
import test from "node:test";

import { CjsFsd64SchemaDogmaAttributes } from "../../../src/formats/fsd/64/readers/CjsFsd64SchemaDogmaAttributes.js";
import { CjsFsd64SchemaDogmaEffects } from "../../../src/formats/fsd/64/readers/CjsFsd64SchemaDogmaEffects.js";
import { CjsFsd64SchemaTypeDogma } from "../../../src/formats/fsd/64/readers/CjsFsd64SchemaTypeDogma.js";

const FIELDS = (reader) => new Map(reader.getFsdSchema().container.fields.map(field => [ field.name, field ]));

test("typeDogma reaches its two lists through pointers, not through the record", () =>
{
    const schema = CjsFsd64SchemaTypeDogma.getFsdSchema();
    const fields = FIELDS(CjsFsd64SchemaTypeDogma);

    assert.equal(schema.schemaID, "817d560b9962768e1a4b18598e9a1761");
    assert.equal(schema.container.recordSize, 24);

    // A 24-byte record holds the key and two 8-byte list pointers and nothing
    // else, which is why this is the one solved table with no presence word.
    assert.equal(schema.container.presence, undefined);
    assert.equal(fields.get("dogmaAttributes").offset, 8);
    assert.equal(fields.get("dogmaEffects").offset, 16);

    // The attribute entry stores its payload before its key: the eight-byte
    // double has to be aligned and the four-byte identifier does not. Reading
    // these the natural way round yields 9e-322 where 182 was expected.
    const attribute = new Map(fields.get("dogmaAttributes").item.fields.map(f => [ f.name, f ]));
    assert.equal(fields.get("dogmaAttributes").itemSize, 16);
    assert.equal(attribute.get("value").offset, 0);
    assert.equal(attribute.get("value").type, "FLOAT_64");
    assert.equal(attribute.get("attributeID").offset, 8);

    const effect = new Map(fields.get("dogmaEffects").item.fields.map(f => [ f.name, f ]));
    assert.equal(fields.get("dogmaEffects").itemSize, 8);
    assert.equal(effect.get("effectID").offset, 0);
    assert.equal(effect.get("isDefault").type, "BOOLEAN");
});

test("dogmaAttributes separates inline text from label identifiers", () =>
{
    const schema = CjsFsd64SchemaDogmaAttributes.getFsdSchema();
    const fields = FIELDS(CjsFsd64SchemaDogmaAttributes);

    assert.equal(schema.schemaID, "dd6befd76ceb8a44f54c7c5e2f69a988");
    assert.equal(schema.container.recordSize, 80);
    assert.equal(schema.container.presence.offset, 76);

    // The measured union of presence bits, not the bits that map to a published
    // field: one of these eleven guards nothing the export publishes.
    assert.equal(schema.container.presence.allowedMask, 0x7ff);

    // name and description are internal, so the client stores them inline. The
    // three display strings are localised, so it stores label identifiers.
    assert.equal(fields.get("name").type, "STRING");
    assert.equal(fields.get("description").type, "STRING");
    for (const name of [ "displayNameID", "tooltipTitleID", "tooltipDescriptionID" ])
    {
        assert.equal(fields.get(name).type, "UINT_32");
    }

    // defaultValue is the one single-precision field; read as UINT_32 it is a
    // large integer that happens to compare equal to nothing.
    assert.equal(fields.get("defaultValue").type, "FLOAT_32");

    // Four packed booleans in four adjacent bytes, in the loader's order.
    assert.deepEqual(
        [ "displayWhenZero", "highIsGood", "published", "stackable" ].map(n => fields.get(n).offset),
        [ 72, 73, 74, 75 ],
    );
});

test("dogmaEffects carries modifierInfo and two fields the export drops", () =>
{
    const schema = CjsFsd64SchemaDogmaEffects.getFsdSchema();
    const fields = FIELDS(CjsFsd64SchemaDogmaEffects);

    assert.equal(schema.schemaID, "b7107f57fd413dd7f47a626dbc39abc9");
    assert.equal(schema.container.recordSize, 112);
    assert.equal(schema.container.presence.allowedMask, 0xffff);

    // CCP's export publishes neither, so neither can be solved against it.
    // sfxName is a string whose only non-empty value is "None"; effectID
    // repeats the record key. Both come from the loader's field list.
    assert.equal(fields.get("sfxName").type, "STRING");
    assert.equal(fields.get("effectID").offset, 64);

    const modifier = fields.get("modifierInfo");
    assert.equal(modifier.itemSize, 48);
    const item = new Map(modifier.item.fields.map(f => [ f.name, f ]));
    assert.equal(item.get("domain").type, "STRING");
    assert.equal(item.get("func").type, "STRING");

    // operation is signed. Solved as UINT_32 it matches nothing, because the
    // negative operations read as values near 2^32.
    assert.equal(item.get("operation").type, "INT_32");

    // modifiedAttributeID, modifyingAttributeID and operation are always
    // present together, so no measurement separates their three presence bits.
    // They are assigned in the alphabetical order the other tables' presence
    // words follow, which every separable bit in this file corroborates.
    assert.deepEqual(
        [ "effectID", "groupID", "modifiedAttributeID", "modifyingAttributeID", "operation", "skillTypeID" ]
            .map(n => item.get(n).presenceMask),
        [ 1, 2, 4, 8, 16, 32 ],
    );

    // disallowAutoRepeat is false on every published record, so no measurement
    // places it either. It is the first of the loader's eight booleans and byte
    // 100 is the only free byte before the other seven.
    assert.equal(fields.get("disallowAutoRepeat").offset, 100);
    assert.equal(fields.get("rangeChance").offset, 107);
});
