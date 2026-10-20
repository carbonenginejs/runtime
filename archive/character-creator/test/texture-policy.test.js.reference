import assert from "node:assert/strict";
import test from "node:test";

import { CjsCharacterTexturePolicy } from "../../../src/character/CjsCharacterTexturePolicy.js";

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

test("labels selected texture tiers without resource loading or a renderer", () =>
{
    const library = CreateLibrary({
        "characterPartSources\0female/topouter/jacket": {
            recordID: "female/topouter/jacket",
            partPath: "topouter/jacket",
            versions: [ {
                resourceVersion: null,
                textureCandidates: [
                    "res:/graphics/character/female/paperdoll/topouter/jacket_body_d_4k.png",
                    "res:/graphics/character/female/paperdoll/topouter/jacket_body_d_512.png",
                    "res:/graphics/character/female/paperdoll/topouter/jacket_body_n_4k.png"
                ]
            } ]
        }
    });
    const paperdoll = {
        modifiers: [ {
            paperdollResourceID: {
                resGender: 0,
                partType: { partPath: "topouter/jacket", sourcePaths: [] }
            }
        } ]
    };
    const part = {
        origin: { recordID: "female/topouter/jacket", jsonPointer: "/versions/0" }
    };
    const plan = {
        parts: [ part ],
        layers: [ {
            contributor: part,
            owner: { groupID: "topouter" },
            origin: { jsonPointer: "/modifiers/0" }
        } ]
    };

    const [ contribution ] = new CjsCharacterTexturePolicy({ textureQuality: "512" })
        .Resolve(library, paperdoll, plan);

    assert.deepEqual(contribution.selectedTextures, [
        {
            path: "res:/graphics/character/female/paperdoll/topouter/jacket_body_d_512.png",
            role: "diffuse-source",
            target: "body",
            quality: "512"
        }
    ]);
    assert.equal(contribution.evidence.rule, "retained-character-texture-filename-v2");
});

test("allows a host to supply the target-hint classification policy", () =>
{
    const policy = new CjsCharacterTexturePolicy({
        targetHintResolver: () => "hair"
    });
    const library = CreateLibrary({
        "characterPartSources\0female/unknown/example": {
            recordID: "female/unknown/example",
            partPath: "unknown/example",
            versions: [ {
                resourceVersion: null,
                textureCandidates: [ "res:/graphics/character/female/example_d_4k.png" ]
            } ]
        }
    });
    const paperdoll = {
        modifiers: [ {
            paperdollResourceID: {
                resGender: 0,
                partType: { partPath: "unknown/example", sourcePaths: [] }
            }
        } ]
    };
    const part = {
        origin: { recordID: "female/unknown/example", jsonPointer: "/versions/0" }
    };
    const plan = {
        parts: [ part ],
        layers: [ {
            contributor: part,
            owner: { groupID: "unknown" },
            origin: { jsonPointer: "/modifiers/0" }
        } ]
    };

    const [ contribution ] = policy.Resolve(library, paperdoll, plan);
    assert.deepEqual(contribution.selectedTextures, [ {
        path: "res:/graphics/character/female/example_d_4k.png",
        role: "diffuse-source",
        target: "hair",
        quality: "4k"
    } ]);
});
