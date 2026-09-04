import assert from "node:assert/strict";
import test from "node:test";

import { CjsCharacterGlesFoundationTranslator } from "../../../src/character/gles/CjsCharacterGlesFoundationTranslator.js";

test("reintroduces GLES-only foundation defaults without mutating CPU construction", () =>
{
    const neutral = {
        sex: "female",
        evidence: { rule: "character-foundation-construction-v1", layout: "combined" },
        operations: [
            { operation: "skeleton", resourcePath: "res:/graphics/female.gr2" },
            { operation: "geometry", role: "head", resourcePath: "res:/graphics/head.gr2" },
            { operation: "geometry", role: "body", resourcePath: "res:/graphics/body.gr2" },
            {
                operation: "foundation-skin",
                roles: [ "body" ],
                skinTextures: { DiffuseMap: "res:/graphics/body_d.png" }
            },
            {
                operation: "configured-foundation",
                role: "body",
                skinTextures: { DiffuseMap: "res:/graphics/body_d.png" }
            },
            { operation: "bind-animation" }
        ]
    };

    const translated = new CjsCharacterGlesFoundationTranslator().Translate(neutral);
    const bodyGeometry = translated.operations.find(value =>
        value.operation === "geometry" && value.role === "body");
    const skin = translated.operations.find(value => value.operation === "foundation-skin");
    const carrier = translated.operations.find(value =>
        value.operation === "configured-foundation" && value.role === "body");

    assert.equal(neutral.operations[1].compatibility, undefined);
    assert.equal(neutral.operations[3].skinTextures.NormalMap, undefined);
    assert.equal(translated.backend, "legacy-opengl");
    assert.equal(bodyGeometry.compatibility.shaderCapacity, 58);
    assert.equal(skin.skinTextures.NormalMap,
        "res:/graphics/shared_texture/global/normal_flat.dds");
    assert.equal(carrier.renderConfiguredCarrier, false);
    assert.deepEqual(translated.operations.map(value => value.operation), [
        "skeleton",
        "geometry",
        "geometry",
        "rebuild-areas",
        "proof-textures",
        "foundation-skin",
        "configured-foundation",
        "bind-animation"
    ]);
});

test("uses the hand compatibility policy for split female foundations only", () =>
{
    const translated = new CjsCharacterGlesFoundationTranslator().Translate({
        sex: "female",
        evidence: { layout: "split-lod0" },
        operations: [
            { operation: "geometry", role: "torso", resourcePath: "res:/graphics/torso.gr2" },
            { operation: "geometry", role: "hands", resourcePath: "res:/graphics/hands.gr2" }
        ]
    });
    const torso = translated.operations.find(value => value.role === "torso");
    const hands = translated.operations.find(value => value.role === "hands");
    assert.equal(torso.compatibility, undefined);
    assert.equal(hands.compatibility.requiredBoneCount, 69);
});

test("owns the reviewed generic body-specular fallback in the GLES policy", () =>
{
    const genericSpecular =
        "res:/graphics/character/male/paperdoll/skintype/cc/cd_male_body_s_4k.png";
    const translated = new CjsCharacterGlesFoundationTranslator().Translate({
        sex: "male",
        evidence: { layout: "split-lod0", textureQuality: "4k" },
        operations: [ {
            operation: "configured-foundation",
            role: "head",
            skinTextures: { DiffuseMap: "res:/graphics/head_d.png" },
            skinEvidence: { rule: "exact-head-generic-texture-inventory-v1" }
        } ]
    }, {
        library: {
            GetDocument(name)
            {
                return name === "characterTextureMetadata" ? [ {
                    recordID: genericSpecular.slice(0, -4),
                    sourcePath: genericSpecular
                } ] : [];
            }
        }
    });
    const head = translated.operations.find(value => value.role === "head");
    assert.equal(head.skinEvidence.bodySpecularPath, genericSpecular);
    assert.equal(head.skinTextures.SpecularMap, genericSpecular);
});
