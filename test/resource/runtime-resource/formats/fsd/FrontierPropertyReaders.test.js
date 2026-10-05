import assert from "node:assert/strict";
import test from "node:test";

import propertyReader from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaProperty.js";
import neoTypePropertyReader from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaNeoTypeProperty.js";
import frontierTypesReader from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaFrontierTypes.js";

const SERVER = process.env.CJS_TOOLS_SERVER ?? "http://127.0.0.1:5510";

/** The current Frontier build's static data files from tools-core, or a skip reason. */
async function currentFiles(names)
{
    try
    {
        const answer = await fetch(`${SERVER}/frontier/latest/build`, { signal: AbortSignal.timeout(10000) });
        if (!answer.ok) return { skip: `tools-core ${SERVER} answered ${answer.status} for the frontier build` };
        const { builds, build } = await answer.json();
        const resources = builds?.resources ?? build;
        const files = {};
        for (const name of names)
        {
            const file = await fetch(`${SERVER}/frontier/${resources}/resources/staticdata/${name}.fsdbinary`, { signal: AbortSignal.timeout(120000) });
            if (!file.ok) return { skip: `no ${name}.fsdbinary for frontier build ${resources} (${file.status})` };
            files[name] = new Uint8Array(await file.arrayBuffer());
        }
        return { build: resources, files };
    }
    catch (error)
    {
        return { skip: `Frontier static data needs tools-core at ${SERVER} (${error.message})` };
    }
}

const entries = (decoded) => decoded instanceof Map ? [ ...decoded ] : Object.entries(decoded);

test("property: names, merge methods and natural ranges decode on every record", async (t) =>
{
    const data = await currentFiles([ "property" ]);
    if (data.skip) return t.skip(data.skip);

    const properties = entries(propertyReader.ReadJSON(data.files.property));
    assert.ok(properties.length > 0);

    const names = properties.map(([ , property ]) => property.name);
    assert.equal(new Set(names).size, names.length, "every property name is distinct");
    for (const [ id, property ] of properties)
    {
        assert.ok([ "average", "min", "max", "weighted_average" ].includes(property.mergeMethod), `${id}: ${property.mergeMethod}`);
        assert.ok(property.naturalMax >= property.naturalMin, `${id} ${property.name}: ${property.naturalMin}..${property.naturalMax}`);
    }
});

test("neoTypeProperty: every range names a property and belongs to a type with a quantityKind", async (t) =>
{
    const data = await currentFiles([ "property", "neotypeproperty", "types" ]);
    if (data.skip) return t.skip(data.skip);

    const properties = new Set(entries(propertyReader.ReadJSON(data.files.property)).map(([ id ]) => String(id)));
    const types = new Map(entries(frontierTypesReader.ReadJSON(data.files.types)).map(([ id, type ]) => [ String(id), type ]));
    const ranges = entries(neoTypePropertyReader.ReadJSON(data.files.neotypeproperty));
    assert.ok(ranges.length > 0);

    for (const [ typeID, record ] of ranges)
    {
        assert.ok(types.get(String(typeID))?.quantityKind, `type ${typeID} has a quantityKind`);
        assert.ok(record.properties.length > 0);
        for (const range of record.properties)
        {
            assert.ok(properties.has(String(range.propertyID)), `type ${typeID}: property ${range.propertyID} exists`);
            if (range.maxValue !== undefined && range.minValue !== undefined)
            {
                assert.ok(range.maxValue >= range.minValue, `type ${typeID} property ${range.propertyID}: ${range.minValue}..${range.maxValue}`);
            }
        }
    }
});
