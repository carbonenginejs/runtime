import test from "node:test";
import assert from "node:assert/strict";
import {
    validateIdentityResult,
    validateTypeRecord,
    validateGraphicRecord,
    validateSkinRecord
} from "../../src/resource/sde/sdeLookupResults.js";

// Synthetic provider results: these tests qualify the CPU boundary only, not
// SDE joins, resource acquisition or real-data GetShip construction.
function identity(overrides = {})
{
    return {
        dna: "test_hull:test_faction:test_race",
        typeID: "type-a",
        graphicID: "graphic-a",
        skinID: null,
        skinMaterialID: null,
        materialSetID: null,
        graphicMaterialSetID: null,
        ...overrides
    };
}

function skinnedIdentity(overrides = {})
{
    return identity({
        skinID: "skin-a",
        skinMaterialID: "skin-material-a",
        materialSetID: "material-set-a",
        graphicMaterialSetID: "graphic-material-set-b",
        dna: "test_hull:test_faction:test_race:mesh?metal;none;paint;none:pattern?test_pattern;paint;none",
        ...overrides
    });
}

test("identity validation preserves the result, metadata and DNA modifiers", () =>
{
    for (const result of [ identity(), identity({ typeID: null }), skinnedIdentity({ typeID: null }) ])
    {
        result.provenance = { build: "synthetic" };
        result.typeName = { en: "Synthetic ship" };
        const before = structuredClone(result);
        const provenance = result.provenance;
        const typeName = result.typeName;

        assert.equal(validateIdentityResult(result), result);
        assert.deepEqual(result, before);
        assert.equal(result.provenance, provenance);
        assert.equal(result.typeName, typeName);
        assert.equal(Object.isFrozen(result), false);
    }
});

test("identity validation accepts modular hulls and leaves command semantics to SOF", () =>
{
    const modular = identity({ dna: "test_hull;test_subsystem:test_faction:test_race:mesh?metal;none;none;none" });
    assert.equal(validateIdentityResult(modular), modular);

    const unknownContent = identity({ dna: "unknown_hull:unknown_faction:unknown_race:future_command?opaque" });
    assert.equal(validateIdentityResult(unknownContent), unknownContent,
        "Boundary validation must not become a second catalog or command validator");
});

test("identity validation leaves catalog-key spelling to the provider and SOF", () =>
{
    const result = identity({ dna: "hull.v2:faction.variant:race.variant:pattern?pattern.v2;none;none" });
    assert.equal(validateIdentityResult(result), result);
});

test("identity validation rejects resource paths, filenames and incomplete DNA", () =>
{
    const values = [
        null, undefined, 42, {}, [ "hull", "faction", "race" ], new String("hull:faction:race"),
        "", " \t", "hull", "hull:faction", ":faction:race", "hull::race", "hull:faction:",
        "res:/dx9/model/ship.red", "res:/hull:faction:race", "  res:/hull:faction:race  ",
        "https://example.invalid/hull:faction:race", "C:\\assets\\ship.black", "ship.red", "ship.black"
    ];
    for (const dna of values)
    {
        assert.throws(() => validateIdentityResult(identity({ dna })), {
            name: "TypeError", message: /IdentityResult\.dna/
        });
    }
});

test("identity validation rejects non-record results rather than treating them as absent", () =>
{
    for (const value of [ null, undefined, false, 42, "hull:faction:race", [], new Map(), Promise.resolve(null) ])
    {
        assert.throws(() => validateIdentityResult(value), {
            name: "TypeError", message: /IdentityResult/
        });
    }
});

test("identity validation requires every field, including explicit nullable fields", () =>
{
    for (const field of Object.keys(identity()))
    {
        const missing = identity();
        delete missing[field];
        const undefinedField = identity({ [field]: undefined });
        for (const result of [ missing, undefinedField ])
        {
            assert.throws(() => validateIdentityResult(result), {
                name: "TypeError", message: new RegExp(`IdentityResult\\.${field}`)
            });
        }
    }
});

test("identity IDs are nonblank strings without numeric coercion", () =>
{
    const fields = [ "typeID", "graphicID", "skinID", "skinMaterialID", "materialSetID", "graphicMaterialSetID" ];
    for (const field of fields)
    {
        for (const value of [ "", " \t", 42, false, {}, new String("42") ])
        {
            const result = skinnedIdentity({ [field]: value });
            assert.throws(() => validateIdentityResult(result), {
                name: "TypeError", message: new RegExp(`IdentityResult\\.${field}`)
            });
            assert.equal(result[field], value, "Validation must not normalize a rejected field");
        }
    }
    assert.throws(() => validateIdentityResult(identity({ graphicID: null })), TypeError);
    const result = skinnedIdentity({ graphicID: "not-a-decimal-id" });
    assert.equal(validateIdentityResult(result), result);
});

test("unskinned identities cannot carry selected material IDs", () =>
{
    for (const field of [ "skinMaterialID", "materialSetID", "graphicMaterialSetID" ])
    {
        const result = identity({ [field]: "selected-material" });
        const before = structuredClone(result);
        assert.throws(() => validateIdentityResult(result), {
            name: "TypeError", message: new RegExp(`IdentityResult\\.${field}.*skinID`)
        });
        assert.deepEqual(result, before);
    }
});

test("selected skins require their complete join without inferring material fallback", () =>
{
    for (const field of [ "skinMaterialID", "materialSetID", "graphicMaterialSetID" ])
    {
        for (const value of [ null, undefined ])
        {
            assert.throws(() => validateIdentityResult(skinnedIdentity({ [field]: value })), {
                name: "TypeError", message: new RegExp(`IdentityResult\\.${field}`)
            });
        }
    }
    const result = skinnedIdentity({ typeID: null });
    assert.notEqual(result.materialSetID, result.graphicMaterialSetID);
    assert.equal(validateIdentityResult(result), result);
});

const recordValidators = [
    [ "TypeRecord", validateTypeRecord ],
    [ "GraphicRecord", validateGraphicRecord ],
    [ "SkinRecord", validateSkinRecord ]
];

for (const [ label, validate ] of recordValidators)
{
    test(`${label} accepts confirmed absence and minimal raw rows`, () =>
    {
        assert.equal(validate(null), null);
        const record = { id: "row-a" };
        assert.equal(validate(record), record);
        assert.deepEqual(Object.keys(record), [ "id" ]);
        assert.equal(Object.isFrozen(record), false);
    });

    test(`${label} preserves raw values, missing fields and nested references`, () =>
    {
        const record = {
            id: "row-a",
            graphicID: 17,
            skinMaterialID: 23,
            name: { en: "Synthetic row", de: "Testeintrag" },
            types: [ 42, "43" ],
            nullable: null,
            provenance: { build: "synthetic" }
        };
        const before = structuredClone(record);
        const { name, types, provenance } = record;
        assert.equal(validate(record), record);
        assert.deepEqual(record, before);
        assert.equal(record.name, name);
        assert.equal(record.types, types);
        assert.equal(record.provenance, provenance);
        assert.equal(Object.hasOwn(record, "internalName"), false);
        assert.equal(Object.hasOwn(record, "sofHullName"), false);
        assert.equal(Object.isFrozen(record), false);
    });

    test(`${label} distinguishes malformed results from not found`, () =>
    {
        for (const value of [ undefined, false, 42, "42", [], new Map(), Promise.resolve(null) ])
        {
            assert.throws(() => validate(value), { name: "TypeError", message: new RegExp(label) });
        }
        for (const record of [ {}, { id: undefined }, { id: null }, { id: 42 }, { id: "" }, { id: " \t" } ])
        {
            const before = structuredClone(record);
            assert.throws(() => validate(record), { name: "TypeError", message: new RegExp(`${label}\\.id`) });
            assert.deepEqual(record, before);
        }
    });
}

test("raw graphics may carry only a resource path without claiming DNA", () =>
{
    const graphic = { id: "graphic-a", graphicFile: "res:/dx9/model/ship.red" };
    assert.equal(validateGraphicRecord(graphic), graphic);
    assert.equal(Object.hasOwn(graphic, "dna"), false);
});
