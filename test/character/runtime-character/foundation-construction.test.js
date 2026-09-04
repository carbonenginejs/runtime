import assert from "node:assert/strict";
import test from "node:test";

import {
    CjsCharacterFoundationConstruction,
    ResolveFemaleFoundationLayout,
    ResolveFoundationGeometry
} from "../../../src/character/CjsCharacterFoundationConstruction.js";

function FemalePaperdoll()
{
    return {
        recordID: "female-demo",
        modifiers: [ { paperdollResourceID: { resGender: 0 } } ],
        colorSelections: []
    };
}

test("requires a caller-selected female layout and emits no renderer defaults", () =>
{
    const plan = { layers: [], morphTargets: [] };
    assert.throws(
        () => new CjsCharacterFoundationConstruction().Resolve(FemalePaperdoll(), plan),
        /caller-selected female layout/u
    );

    const construction = new CjsCharacterFoundationConstruction({
        femaleFoundationLayout: "combined"
    }).Resolve(FemalePaperdoll(), plan);
    const serialized = JSON.stringify(construction);
    assert.deepEqual(construction.operations.map(value => value.operation), [
        "skeleton",
        "geometry",
        "geometry",
        "configured-foundation",
        "bind-animation"
    ]);
    assert.equal(serialized.includes("effect.gles2"), false);
    assert.equal(serialized.includes("normal_flat.dds"), false);
    assert.equal(serialized.includes("legacy-opengl"), false);
    assert.equal(serialized.includes("legacy-opengl-bone-capacity"), false);
    assert.equal(serialized.includes("rebuild-areas"), false);
    assert.equal("backend" in construction, false);
});

test("falls back only when exact atlas-only clothing and fit evidence require a split carrier", () =>
{
    const plan = {
        layers: [ {
            owner: { groupID: "topinner" },
            contributor: {
                origin: {
                    document: "characterPartSources",
                    recordID: "female/topinner/example"
                }
            }
        } ],
        morphTargets: [ {
            modifierPath: "utilityshapes/pinchwaistshape",
            targetName: "PinchWaist",
            owner: { groupID: "topinner" }
        } ]
    };
    const result = ResolveFemaleFoundationLayout("combined", plan);
    assert.equal(result.layout, "split-lod0");
    assert.equal(result.fallback.atlasOnlyLayers.length, 1);
    assert.equal(result.fallback.fitTargets[0].targetName, "PinchWaist");
});

test("adds only exact nude-torso support geometry with one candidate pair", () =>
{
    const target = {
        recordID: "male/dependants/sleevesupper/standard",
        versions: [ {
            configurationCandidates: [ "res:/graphics/sleeves.black" ],
            geometryCandidates: [ "res:/graphics/sleeves.gr2" ]
        } ]
    };
    const library = {
        Get(document, id)
        {
            return document === "characterPartSources" && id === "male/topinner/torso_nude"
                ? {
                    recordID: id,
                    metadata: {
                        dependencies: [ {
                            authoredValue: "dependants/sleevesupper/standard###1",
                            partSource: target
                        } ]
                    }
                }
                : null;
        }
    };
    const geometry = ResolveFoundationGeometry([
        [ "torso", "res:/graphics/torso.gr2" ],
        [ "legs", "res:/graphics/legs.gr2" ]
    ], "male", library);
    assert.deepEqual(geometry.map(value => value[0]), [ "torso", "sleevesUpper", "legs" ]);
    assert.equal(geometry[1][2].configurationPath, "res:/graphics/sleeves.black");
});
