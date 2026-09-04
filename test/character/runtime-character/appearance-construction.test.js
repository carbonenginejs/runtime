import assert from "node:assert/strict";
import test from "node:test";

import { CjsCharacterAppearanceConstruction } from "../../../src/character/CjsCharacterAppearanceConstruction.js";

function CreateLibrary(records = {})
{
    return {
        schema: "carbonenginejs.characterLibrary",
        schemaVersion: 10,
        Get(document, id)
        {
            return records[`${document}\0${id}`] ?? null;
        }
    };
}

test("combines injected foundation intent, exact parts, texture policy, and morph targets", () =>
{
    const sourceID = "female/topouter/jacket";
    const library = CreateLibrary({
        [`characterPartSources\0${sourceID}`]: {
            recordID: sourceID,
            versions: [ {
                metadata: { occlusions: [] },
                geometryCandidates: [ "res:/graphics/character/female/jacket_lod0.gr2" ],
                configurationCandidates: [ "res:/graphics/character/female/jacket_lod0.black" ]
            } ]
        }
    });
    const part = {
        requestedLod: 0,
        origin: {
            kind: "retained",
            document: "characterPartSources",
            recordID: sourceID,
            jsonPointer: "/versions/0"
        }
    };
    const plan = {
        parts: [ part ],
        layers: [ { contributor: part, owner: { groupID: "topouter" } } ],
        morphTargets: [ {
            modifierPath: "sculpt/nosewidth",
            targetName: "NoseWidth",
            weight: 0.5,
            owner: { groupID: "sculpt" },
            origin: { kind: "retained", document: "paperdolls", recordID: "demo" }
        } ]
    };
    const foundationResolver = {
        Resolve()
        {
            return {
                sex: "female",
                evidence: { rule: "test-foundation", layout: "split-lod0" },
                operations: [
                    { operation: "skeleton", resourcePath: "res:/graphics/female.gr2" },
                    { operation: "bind-animation" }
                ]
            };
        }
    };
    const texturePolicy = {
        Resolve()
        {
            return [ { layerIndex: 0, partIndex: 0, groupID: "topouter" } ];
        }
    };

    const result = new CjsCharacterAppearanceConstruction({
        foundationResolver,
        texturePolicy
    }).Resolve({ modifiers: [] }, plan, library);

    assert.deepEqual(result.operations.map(value => value.operation), [
        "skeleton",
        "configured-part",
        "bind-animation"
    ]);
    assert.equal(result.operations[1].configurationPath,
        "res:/graphics/character/female/jacket_lod0.black");
    assert.equal(result.operations[1].geometryPath,
        "res:/graphics/character/female/jacket_lod0.gr2");
    assert.equal(result.morphTargets[0].targetName, "NoseWidth");
    assert.equal(result.evidence.rule, "character-appearance-construction-v1");
});

test("requires an injected foundation resolver rather than selecting a GPU backend", () =>
{
    assert.throws(
        () => new CjsCharacterAppearanceConstruction(),
        /foundation resolver/u
    );
});
