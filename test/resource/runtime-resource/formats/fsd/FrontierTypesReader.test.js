import assert from "node:assert/strict";
import test from "node:test";

import frontierTypesReader, { CjsFsd64SchemaFrontierTypes } from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaFrontierTypes.js";

const SERVER = process.env.CJS_TOOLS_SERVER ?? "http://127.0.0.1:5510";
const FIELDS = (reader) => new Map(reader.getFsdSchema().container.fields.map(field => [ field.name, field ]));

test("Frontier types reads the 144-byte layout, with quantityKind ahead of radius", () =>
{
    const schema = CjsFsd64SchemaFrontierTypes.getFsdSchema();
    const fields = FIELDS(CjsFsd64SchemaFrontierTypes);

    assert.equal(schema.schemaID, "8d7a099712d997ddc7b0f218c5c8a396");
    assert.equal(schema.container.recordSize, 144);
    assert.equal(schema.container.presence.offset, 140);

    // quantityKind takes the eight bytes at 40, so everything from radius on
    // sits eight bytes later than in the previous layout, and every presence
    // bit from 14 sits one higher.
    assert.equal(fields.get("quantityKind").type, "STRING");
    assert.equal(fields.get("quantityKind").offset, 40);
    assert.equal(fields.get("quantityKind").presenceMask, 1 << 14);
    assert.equal(fields.get("radius").offset, 48);
    assert.equal(fields.get("typeID").offset, 120);
    assert.equal(fields.get("nameID").offset, 124);
    assert.equal(fields.get("raceID").presenceMask, 1 << 15);
    assert.equal(fields.get("wreckTypeID").presenceMask, 1 << 21);
});

/** The current Frontier build's types file from tools-core, or a skip reason. */
async function currentTypes()
{
    try
    {
        const answer = await fetch(`${SERVER}/frontier/latest/build`, { signal: AbortSignal.timeout(10000) });
        if (!answer.ok) return { skip: `tools-core ${SERVER} answered ${answer.status} for the frontier build` };
        const { builds, build } = await answer.json();
        const resources = builds?.resources ?? build;
        const file = await fetch(`${SERVER}/frontier/${resources}/resources/staticdata/types.fsdbinary`, { signal: AbortSignal.timeout(120000) });
        if (!file.ok) return { skip: `no types.fsdbinary for frontier build ${resources} (${file.status})` };
        return { build: resources, bytes: new Uint8Array(await file.arrayBuffer()) };
    }
    catch (error)
    {
        return { skip: `Frontier types need tools-core at ${SERVER} (${error.message})` };
    }
}

test("Frontier types decodes every record of the current build", async (t) =>
{
    const types = await currentTypes();
    if (types.skip) return t.skip(types.skip);

    const records = frontierTypesReader.ReadJSON(types.bytes);
    const entries = records instanceof Map ? [ ...records ] : Object.entries(records);
    assert.ok(entries.length > 30000, `${entries.length} types in build ${types.build}`);

    // The record repeats its own key, so a misplaced typeID shows up on every record.
    for (const [ key, record ] of entries) assert.equal(String(record.typeID), String(key));

    // quantityKind is a string when present and absent otherwise; a mis-sized
    // record or a wrong presence bit would decode it on types that have none.
    const kinds = entries.map(([ , record ]) => record.quantityKind).filter(kind => kind !== undefined);
    assert.ok(kinds.length > 0, "some types carry a quantityKind");
    assert.ok(kinds.length < entries.length / 100, `${kinds.length} of ${entries.length} types carry a quantityKind`);
    for (const kind of kinds) assert.ok(kind === "continuous" || kind === "discrete", `unexpected quantityKind ${kind}`);
});
