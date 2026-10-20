import assert from "node:assert/strict";
import test from "node:test";

import { CjsCharacterGlesLegacyConstructionTranslator } from "../../../src/character/gles/CjsCharacterGlesLegacyConstructionTranslator.js";

function CreateFoundationTranslator()
{
    return {
        Translate(value)
        {
            return {
                ...value,
                backend: "legacy-opengl",
                evidence: { ...value.evidence, rule: "legacy-opengl-foundation-v1" }
            };
        }
    };
}

test("lowers neutral appearance evidence and utility morph targets for the retained GLES adapter", () =>
{
    const neutral = {
        evidence: { status: "policy", rule: "character-appearance-construction-v1" },
        morphTargets: [ {
            modifierPath: "utilityshapes/NoseWidth",
            targetName: "NoseWidth",
            weight: 0.5,
            ownerGroupID: "sculpt",
            evidence: { status: "policy", rule: "normalized-character-morph-target-v1" }
        } ],
        operations: [
            { operation: "skeleton" },
            {
                operation: "foundation-skin",
                roles: [ "body" ],
                skinTextures: { DiffuseMap: "res:/graphics/body_d.png" }
            },
            { operation: "configured-part" }
        ]
    };

    const translated = new CjsCharacterGlesLegacyConstructionTranslator({
        foundationTranslator: CreateFoundationTranslator()
    }).Translate(neutral);

    assert.equal(neutral.morphTargets[0].evidence.rule, "normalized-character-morph-target-v1");
    assert.equal(translated.backend, "legacy-opengl");
    assert.equal(translated.evidence.rule, "legacy-opengl-appearance-v1");
    assert.deepEqual(
        translated.operations.map(value => value.operation),
        [ "skeleton", "configured-part" ]
    );
    assert.equal(translated.deferredFoundationSkin[0].status, "deferred");
    assert.equal(translated.morphTargets[0].modifierPath, "utilityshapes/nosewidth");
    assert.equal(
        translated.morphTargets[0].evidence.rule,
        "legacy-gles-unique-normalized-morph-target-match-v1"
    );
});

test("keeps foundation-only output on the foundation compatibility contract", () =>
{
    const translated = new CjsCharacterGlesLegacyConstructionTranslator({
        foundationTranslator: CreateFoundationTranslator()
    }).Translate({
        evidence: { status: "policy", rule: "character-foundation-construction-v1" },
        operations: [ { operation: "skeleton" } ]
    });

    assert.equal(translated.evidence.rule, "legacy-opengl-foundation-v1");
});

test("rejects a neutral sculpt target that the retained GLES adapter cannot consume", () =>
{
    assert.throws(() => new CjsCharacterGlesLegacyConstructionTranslator({
        foundationTranslator: CreateFoundationTranslator()
    }).Translate({
        evidence: { status: "policy", rule: "character-appearance-construction-v1" },
        morphTargets: [ { modifierPath: "sculpt/nosewidth" } ],
        operations: []
    }), /utilityshapes/u);
});

test("lowers only retained GLES foundation-coverage strategies", () =>
{
    const translated = new CjsCharacterGlesLegacyConstructionTranslator({
        foundationTranslator: CreateFoundationTranslator()
    }).Translate({
        sex: "female",
        evidence: { status: "policy", rule: "character-appearance-construction-v1" },
        operations: [ {
            operation: "configured-part",
            foundationCoverage: {
                intent: "conceal-foundation",
                roles: [ "body" ],
                coverageKind: "footwear",
                footwearHeight: "high",
                evidence: {
                    status: "policy",
                    rule: "authored-footwear-foundation-coverage-v1",
                    authoredModifierPaths: [ "utilityshapes/pantstuckhighshape" ]
                }
            }
        }, {
            operation: "configured-part",
            foundationCoverage: {
                intent: "conceal-foundation",
                roles: [ "body" ],
                evidence: {
                    status: "policy",
                    rule: "authored-modifier-foundation-coverage-v1",
                    relationships: [ {
                        relation: "exact-combined-full-body-modifier-set",
                        authoredValue: "topinner",
                        foundationRole: "body"
                    } ]
                }
            }
        } ]
    });

    const [ footwear, unsupported ] = translated.operations;
    assert.equal(footwear.foundationCoverage.strategy, "triangle-mask");
    assert.equal(
        footwear.foundationCoverage.evidence.rule,
        "legacy-opengl-authored-footwear-coverage-v1"
    );
    assert.equal(unsupported.foundationCoverage, undefined);
    assert.equal(unsupported.deferredFoundationCoverage.status, "deferred");
});
