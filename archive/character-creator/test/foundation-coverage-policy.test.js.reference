import assert from "node:assert/strict";
import test from "node:test";

import { CjsCharacterFoundationCoveragePolicy } from "../../../src/character/CjsCharacterFoundationCoveragePolicy.js";

test("emits renderer-neutral male boot coverage from authored height metadata", () =>
{
    const coverage = new CjsCharacterFoundationCoveragePolicy().Resolve({
        sex: "male",
        groupID: "feet",
        partSourceRecordID: "male/feet/boots",
        metadata: {
            dependencies: [
                { modifierPath: "utilityshapes/pantstuckhighshape" }
            ]
        }
    });

    assert.deepEqual(coverage, {
        intent: "conceal-foundation",
        roles: [ "feet" ],
        coverageKind: "footwear",
        footwearHeight: "high",
        evidence: {
            status: "policy",
            rule: "authored-footwear-foundation-coverage-v1",
            sourceRule: "reviewed-authored-footwear-coverage-source-v1",
            sex: "male",
            groupID: "feet",
            partSourceRecordID: "male/feet/boots",
            footwearHeight: "high",
            authoredModifierPaths: [ "utilityshapes/pantstuckhighshape" ]
        }
    });
});

test("retains female boot coverage intent without choosing a triangle-mask implementation", () =>
{
    const coverage = new CjsCharacterFoundationCoveragePolicy().Resolve({
        sex: "female",
        foundationLayout: "combined",
        groupID: "feet",
        partSourceRecordID: "female/feet/boots",
        metadata: {
            dependencies: [
                { modifierPath: "dependants/bootmasks/bootmaskknee" }
            ]
        }
    });

    assert.equal(coverage.intent, "conceal-foundation");
    assert.deepEqual(coverage.roles, [ "body" ]);
    assert.equal(coverage.coverageKind, "footwear");
    assert.equal(coverage.footwearHeight, "knee");
    assert.equal("strategy" in coverage, false);
    assert.equal("bonePrefixes" in coverage, false);
});

test("maps exact authored topinner occlusion to a split male torso carrier", () =>
{
    const coverage = new CjsCharacterFoundationCoveragePolicy().Resolve({
        sex: "male",
        groupID: "topouter",
        partSourceRecordID: "male/topouter/jacket",
        metadata: {
            occlusions: [ {
                authoredValue: "topinner#1",
                modifierLocation: { modifierKey: "topinner" }
            } ]
        }
    });

    assert.equal(coverage.intent, "conceal-foundation");
    assert.deepEqual(coverage.roles, [ "torso" ]);
    assert.equal(coverage.evidence.relationships[0].relation, "typed-modifier-location");
});

test("requires the full authored set before concealing a combined female foundation", () =>
{
    const policy = new CjsCharacterFoundationCoveragePolicy();
    const common = {
        sex: "female",
        foundationLayout: "combined",
        groupID: "topouter",
        partSourceRecordID: "female/topouter/jacket"
    };

    assert.equal(policy.Resolve({
        ...common,
        metadata: {
            occlusions: [ {
                authoredValue: "topinner#1",
                modifierLocation: { modifierKey: "topinner" }
            } ]
        }
    }), null);

    const coverage = policy.Resolve({
        ...common,
        metadata: {
            occlusions: [ "topinner", "bottominner", "feet", "hands" ].map(modifierKey => ({
                authoredValue: `${modifierKey}#1`,
                modifierLocation: { modifierKey }
            }))
        }
    });
    assert.deepEqual(coverage.roles, [ "body" ]);
    assert.equal(coverage.evidence.relationships.length, 4);
});

test("does not infer unknown footwear and keeps qualified occlusion coverage evidence", () =>
{
    const policy = new CjsCharacterFoundationCoveragePolicy();
    assert.equal(policy.Resolve({
        sex: "male",
        groupID: "feet",
        metadata: {
            dependencies: [ { modifierPath: "utilityshapes/pantstuckmysteryshape" } ]
        }
    }), null);
    assert.equal(policy.Resolve({
        sex: "male",
        groupID: "tattoo",
        metadata: {
            occlusions: [ {
                authoredValue: "topinner#1",
                modifierLocation: { modifierKey: "topinner" }
            } ]
        }
    })?.roles[0], "torso");
});
