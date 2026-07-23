import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "@carbonenginejs/core-types/schema";
import {
    CjsCharacterCapabilityCoverage,
    CjsCharacterCapabilityRequirement,
    CjsCharacterLodBundle,
    CjsCharacterLodCapability,
    CjsCharacterMeshCapability,
    CjsCharacterVisemeSet
} from "../npm/dist/index.js";

function CreateRequirement()
{
    return CjsCharacterCapabilityRequirement.prepare({
        id: "speech-face",
        boneNames: [ "fj_jaw", "fj_lip_cornerLeft" ],
        morphNames: [ "Smile" ]
    });
}

function CreateLodBundle(values = {})
{
    return CjsCharacterLodBundle.from({
        requestedLod: 0,
        resolvedLod: 0,
        configurationPath: "res:/character/head.black",
        geometryPath: "res:/character/head.gr2",
        ...values
    });
}

test("reports selected LOD identity separately from independent capability axes", () =>
{
    const result = CjsCharacterLodCapability.inspect({
        lodBundle: CreateLodBundle({
            requestedLod: 0,
            resolvedLod: 1,
            configurationPath: "res:/character/head_lod1.black",
            geometryPath: "res:/character/head_lod1.gr2",
            fallbackReason: "nearest"
        }),
        requirement: CreateRequirement(),
        skeletonBoneNames: [ "Root", "fj_jaw", "fj_lip_cornerLeft" ],
        meshes: [
            {
                id: "head",
                declaredBoneNames: [ "Head", "fj_jaw", "fj_lip_cornerLeft" ],
                activeBoneNames: [ "Head", "fj_jaw" ],
                morphTargetNames: [ "Smile", "Frown" ]
            }
        ]
    });

    assert.equal(result.requestedLod, 0);
    assert.equal(result.resolvedLod, 1);
    assert.equal(result.fallbackReason, "nearest");
    assert.equal(result.skeletonCoverage.status, "complete");
    assert.equal(result.declaredMeshPaletteCoverage.status, "complete");
    assert.equal(result.activeMeshPaletteCoverage.status, "partial");
    assert.deepEqual(result.activeMeshPaletteCoverage.missingNames, [ "fj_lip_cornerLeft" ]);
    assert.equal(result.morphCoverage.status, "complete");
    assert.ok(result.meshes[0] instanceof CjsCharacterMeshCapability);
    assert.ok(result.skeletonCoverage instanceof CjsCharacterCapabilityCoverage);
});

test("does not infer visible facial deformation from skeleton compatibility", () =>
{
    const result = CjsCharacterLodCapability.inspect({
        lodBundle: CreateLodBundle(),
        requirement: CreateRequirement(),
        skeletonBoneNames: [ "fj_jaw", "fj_lip_cornerLeft" ],
        meshes: [
            {
                id: "low-detail-shape",
                declaredBoneNames: [ "Head", "Neck" ],
                activeBoneNames: [ "Head", "Neck" ],
                morphTargetNames: []
            }
        ]
    });

    assert.equal(result.skeletonCoverage.status, "complete");
    assert.equal(result.declaredMeshPaletteCoverage.status, "none");
    assert.equal(result.activeMeshPaletteCoverage.status, "none");
    assert.equal(result.morphCoverage.status, "none");
});

test("retains unknown coverage when active blend-index or mesh evidence is absent", () =>
{
    const incomplete = CjsCharacterLodCapability.inspect({
        lodBundle: CreateLodBundle(),
        requirement: CreateRequirement(),
        skeletonBoneNames: null,
        meshes: [
            {
                id: "head",
                declaredBoneNames: [ "fj_jaw" ],
                morphTargetNames: [ "Smile" ]
            }
        ]
    });

    assert.equal(incomplete.skeletonCoverage.status, "unknown");
    assert.equal(incomplete.declaredMeshPaletteCoverage.status, "partial");
    assert.equal(incomplete.activeMeshPaletteCoverage.status, "unknown");
    assert.equal(incomplete.activeMeshPaletteCoverage.sourceComplete, false);
    assert.deepEqual(incomplete.activeMeshPaletteCoverage.missingNames, []);
    assert.deepEqual(incomplete.activeMeshPaletteCoverage.unresolvedNames, [
        "fj_jaw",
        "fj_lip_cornerLeft"
    ]);
    assert.equal(incomplete.morphCoverage.status, "complete");

    const noMeshEvidence = CjsCharacterLodCapability.inspect({
        lodBundle: CreateLodBundle(),
        requirement: CreateRequirement(),
        skeletonBoneNames: [],
        meshes: null
    });
    assert.equal(noMeshEvidence.requestedLod, 0);
    assert.equal(noMeshEvidence.resolvedLod, 0);
    assert.equal(noMeshEvidence.skeletonCoverage.status, "none");
    assert.equal(noMeshEvidence.activeMeshPaletteCoverage.status, "unknown");
});

test("derives reusable exact rig requirements from authored viseme masks", () =>
{
    const set = CjsCharacterVisemeSet.prepare({
        id: "speech",
        parameterNode: "Visemes",
        maskBoneNames: [ "fj_jaw", "fj_lip_cornerLeft" ],
        visemes: [ { id: "AA" } ]
    });
    const requirement = CjsCharacterVisemeSet.createCapabilityRequirement(set, {
        morphNames: [ "Smile" ]
    });

    assert.ok(requirement instanceof CjsCharacterCapabilityRequirement);
    assert.equal(requirement.id, "speech-facial-rig");
    assert.deepEqual(requirement.boneNames, [ "fj_jaw", "fj_lip_cornerLeft" ]);
    assert.deepEqual(requirement.morphNames, [ "Smile" ]);
    assert.equal(CjsSchema.getClassFamily(CjsCharacterLodCapability), "character");
    assert.equal(
        CjsSchema.getField(CjsCharacterLodCapability, "meshes").type.itemType,
        "CjsCharacterMeshCapability"
    );
});

test("rejects malformed capability evidence without folding exact names", () =>
{
    const requirement = CreateRequirement();

    assert.throws(
        () => CjsCharacterCapabilityRequirement.prepare({
            id: "duplicate",
            boneNames: [ "fj_jaw", "fj_jaw" ]
        }),
        /duplicate "fj_jaw"/
    );
    assert.throws(
        () => CjsCharacterLodCapability.inspect({
            lodBundle: CreateLodBundle(),
            requirement,
            meshes: [ { id: "head" }, { id: "head" } ]
        }),
        /duplicate mesh "head"/
    );
    assert.throws(
        () => CjsCharacterLodCapability.inspect({
            lodBundle: CreateLodBundle(),
            requirement,
            meshes: {}
        }),
        /must be an array or null/
    );
    assert.throws(
        () => CjsCharacterLodCapability.inspect({ requirement, meshes: [] }),
        /requires an atomic LOD bundle/
    );
    assert.throws(
        () => CjsCharacterLodCapability.inspect({
            lodBundle: CreateLodBundle(),
            requirement,
            meshes: [ {
                id: "head",
                declaredBoneNames: [ "fj_jaw" ],
                activeBoneNames: [ "fj_lip_cornerLeft" ]
            } ]
        }),
        /active palette contains undeclared bone/
    );
    assert.throws(
        () => CjsCharacterVisemeSet.createCapabilityRequirement(
            CjsCharacterVisemeSet.prepare({
                id: "no-mask",
                visemes: [ { id: "AA" } ]
            })
        ),
        /does not provide facial capability names/
    );
});
