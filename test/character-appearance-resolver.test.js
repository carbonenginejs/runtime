import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterAppearanceLayer,
    CjsCharacterAppearanceColorSelection,
    CjsCharacterAppearancePlan,
    CjsCharacterAppearanceResolver,
    CjsCharacterAppearanceSelection,
    CjsCharacterLibrary,
    CjsCharacterResolvedPart
} from "../npm/dist/index.js";
import { CjsCharacterLibraryBuilder } from "../npm/dist/library-builder/index.js";

test("resolves exact paper-doll selections and unique atomic part candidates", () =>
{
    const library = CreateLibrary();
    const paperdoll = library.Get("paperdolls", "30");
    const before = library.GetValues({ refs: true });
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(library, paperdoll);

    assert.ok(plan instanceof CjsCharacterAppearancePlan);
    assert.equal(plan.sourceBuild, "synthetic-build");
    assert.equal(plan.selections.length, 1);
    assert.equal(plan.colorSelections.length, 1);
    assert.ok(plan.colorSelections[0] instanceof CjsCharacterAppearanceColorSelection);
    assert.equal(plan.colorSelections[0].colorKey, "makeup/eyes");
    assert.equal(plan.colorSelections[0].colorNameA, "darkbrown_abc");
    assert.equal(plan.colorSelections[0].colorNameBC, null);
    assert.equal(plan.colorSelections[0].origin.jsonPointer, "/colorSelections/0");
    assert.equal(plan.parts.length, 1);
    assert.equal(plan.layers.length, 1);
    assert.ok(plan.selections[0] instanceof CjsCharacterAppearanceSelection);
    assert.ok(plan.parts[0] instanceof CjsCharacterResolvedPart);
    assert.ok(plan.layers[0] instanceof CjsCharacterAppearanceLayer);
    assert.equal(plan.selections[0].groupID, "topinner");
    assert.equal(plan.parts[0].configurationPath, "res:/character/top.black");
    assert.equal(plan.parts[0].geometryPath, "res:/character/top.gr2");
    assert.equal(plan.parts[0].requestedLod, null);
    assert.equal(plan.parts[0].resolvedLod, null);
    assert.equal(plan.parts[0].modelFamily, null);
    assert.strictEqual(plan.layers[0].owner, plan.selections[0]);
    assert.strictEqual(plan.layers[0].contributor, plan.parts[0]);
    assert.deepEqual(plan.textures, []);
    assert.deepEqual(plan.coverages, []);
    assert.deepEqual(plan.targets, []);
    assert.deepEqual(plan.bindings, []);
    assert.deepEqual(plan.diagnostics.map(item => item.code), [
        "TEXTURE_ROLES_UNRESOLVED",
        "PASS_ORDER_UNRESOLVED"
    ]);
    assert.deepEqual(library.GetValues({ refs: true }), before);

    const values = JSON.parse(JSON.stringify(plan.GetValues({ refs: true })));
    const roundTrip = CjsCharacterAppearancePlan.from(values);

    assert.strictEqual(roundTrip.layers[0].owner, roundTrip.selections[0]);
    assert.strictEqual(roundTrip.layers[0].contributor, roundTrip.parts[0]);
    assert.strictEqual(roundTrip.colorSelections[0].origin, roundTrip.origins[0]);
    assert.equal(roundTrip.parts[0].origin.rule, "unique-version-candidates");
});

test("diagnoses dangling source relationships without fabricating selections or parts", () =>
{
    const documents = CreateDocuments();

    documents.paperdolls[30].modifiers = [ {
        modifierLocationID: "999",
        paperdollResourceID: "20",
        paperdollResourceVariation: 0
    }, {
        modifierLocationID: "10",
        paperdollResourceID: "999",
        paperdollResourceVariation: 0
    } ];

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.equal(plan.selections.length, 1);
    assert.equal(plan.parts.length, 0);
    assert.equal(plan.layers.length, 0);
    assert.deepEqual(plan.diagnostics.map(item => item.code), [
        "MODIFIER_LOCATION_UNRESOLVED",
        "CHARACTER_RESOURCE_UNRESOLVED"
    ]);
});

test("requires strict version identity and preserves ambiguous candidate inventories", () =>
{
    const missingVersion = CreateDocuments();

    missingVersion.characterPartTypes["type/top"].resourceVersion = "V1";

    const missingLibrary = CreateLibrary(missingVersion);
    const missingPlan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        missingLibrary,
        missingLibrary.Get("paperdolls", "30")
    );

    assert.equal(missingPlan.parts.length, 0);
    assert.deepEqual(missingPlan.diagnostics.map(item => item.code), [
        "PART_VERSION_UNRESOLVED"
    ]);

    const ambiguousCandidates = CreateDocuments();

    ambiguousCandidates.characterPartSources["source/top"].versions[0]
        .configurationCandidates.push("res:/character/top_lod1.black");

    const ambiguousLibrary = CreateLibrary(ambiguousCandidates);
    const ambiguousPlan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        ambiguousLibrary,
        ambiguousLibrary.Get("paperdolls", "30")
    );

    assert.equal(ambiguousPlan.parts.length, 1);
    assert.equal(ambiguousPlan.layers.length, 1);
    assert.equal(ambiguousPlan.parts[0].configurationPath, null);
    assert.equal(ambiguousPlan.parts[0].geometryPath, "res:/character/top.gr2");
    assert.equal(ambiguousPlan.parts[0].origin.rule, "exact-source-version");
    assert.deepEqual(ambiguousPlan.diagnostics.map(item => item.code), [
        "PART_CANDIDATES_UNRESOLVED",
        "TEXTURE_ROLES_UNRESOLVED",
        "PASS_ORDER_UNRESOLVED"
    ]);
    assert.deepEqual(ambiguousPlan.textures, []);
    assert.deepEqual(ambiguousPlan.targets, []);
});

test("selects one producer-verified model bundle without discarding candidate inventory", () =>
{
    const documents = CreateDocuments();
    const version = documents.characterPartSources["source/top"].versions[0];
    version.configurationCandidates.push("res:/character/top_lod1.black");
    version.geometryCandidates.push("res:/character/top_lod1.gr2");
    version.modelBundles = [ {
        configurationPath: "res:/character/top.black",
        geometryPath: "res:/character/top.gr2"
    } ];

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.equal(plan.parts[0].configurationPath, "res:/character/top.black");
    assert.equal(plan.parts[0].geometryPath, "res:/character/top.gr2");
    assert.equal(plan.parts[0].origin.rule, "unique-version-model-bundle");
    assert.equal(
        plan.diagnostics.some(item => item.code === "PART_CANDIDATES_UNRESOLVED"),
        false
    );
    assert.deepEqual(version.configurationCandidates, [
        "res:/character/top.black",
        "res:/character/top_lod1.black"
    ]);
    assert.deepEqual(version.geometryCandidates, [
        "res:/character/top.gr2",
        "res:/character/top_lod1.gr2"
    ]);
});

test("retains multiple verified model bundles without guessing a default model", () =>
{
    const documents = CreateDocuments();
    const version = documents.characterPartSources["source/top"].versions[0];
    version.configurationCandidates.push("res:/character/top_lod1.black");
    version.geometryCandidates.push("res:/character/top_lod1.gr2");
    version.modelBundles = [
        {
            configurationPath: "res:/character/top.black",
            geometryPath: "res:/character/top.gr2"
        },
        {
            configurationPath: "res:/character/top_lod1.black",
            geometryPath: "res:/character/top_lod1.gr2"
        }
    ];

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.equal(plan.parts[0].configurationPath, null);
    assert.equal(plan.parts[0].geometryPath, null);
    assert.equal(plan.parts[0].origin.rule, "exact-source-version");
    assert.equal(
        plan.diagnostics.some(item => item.code === "PART_CANDIDATES_UNRESOLVED"),
        true
    );
    assert.equal(version.modelBundles.length, 2);
});

test("selects one exact requested LOD from producer-verified model bundles", () =>
{
    const documents = CreateDocuments();
    const version = documents.characterPartSources["source/top"].versions[0];
    version.configurationCandidates.push("res:/character/top_lod0.black");
    version.geometryCandidates.push("res:/character/top_lod0.gr2");
    version.configurationCandidates.push("res:/character/other_lod0.black");
    version.geometryCandidates.push("res:/character/other_lod0.gr2");
    version.modelBundles = [
        {
            configurationPath: "res:/character/top.black",
            geometryPath: "res:/character/top.gr2"
        },
        {
            configurationPath: "res:/character/top_lod0.black",
            geometryPath: "res:/character/top_lod0.gr2",
            lod: 0,
            lodOrigin: "matching-terminal-lod",
            modelFamily: "top",
            modelFamilyOrigin: "matching-paired-resource-stem"
        },
        {
            configurationPath: "res:/character/other_lod0.black",
            geometryPath: "res:/character/other_lod0.gr2",
            lod: 0,
            lodOrigin: "matching-terminal-lod",
            modelFamily: "other",
            modelFamilyOrigin: "matching-paired-resource-stem"
        }
    ];

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30"),
        { requestedLod: 0 }
    );

    assert.equal(plan.parts[0].configurationPath, "res:/character/top_lod0.black");
    assert.equal(plan.parts[0].geometryPath, "res:/character/top_lod0.gr2");
    assert.equal(plan.parts[0].requestedLod, 0);
    assert.equal(plan.parts[0].resolvedLod, 0);
    assert.equal(plan.parts[0].modelFamily, "top");
    assert.equal(plan.parts[0].origin.rule, "requested-lod-model-bundle");
    assert.equal(
        plan.diagnostics.some(item => item.code === "PART_CANDIDATES_UNRESOLVED"),
        false
    );
});

test("selects the exact sex-specific source from a shared part type", () =>
{
    const documents = CreateDocuments();

    documents.characterPartTypes["type/top"].sex = "";
    documents.characterPartTypes["type/top"].partSource = null;
    documents.characterPartTypes["type/top"].partSources = [
        "source/top",
        "source/top-male"
    ];
    documents.characterPartSources["source/top-male"] = {
        sourcePath: "res:/character/top-male",
        sex: "male",
        partPath: "topinner/top",
        versions: [ {
            resourceVersion: "v1",
            metadata: null,
            configurationCandidates: [ "res:/character/top-male.black" ],
            geometryCandidates: [ "res:/character/top-male.gr2" ],
            textureCandidates: []
        } ],
        metadata: null
    };

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.equal(plan.parts[0].configurationPath, "res:/character/top.black");
    assert.equal(plan.parts[0].geometryPath, "res:/character/top.gr2");
    assert.equal(plan.diagnostics.some(item => item.code === "PART_SOURCE_AMBIGUOUS"), false);

    documents.characterResources[20].resGender = 2;

    const ambiguousLibrary = CreateLibrary(documents);
    const ambiguous = CjsCharacterAppearanceResolver.resolvePaperdoll(
        ambiguousLibrary,
        ambiguousLibrary.Get("paperdolls", "30")
    );

    assert.equal(ambiguous.parts.length, 0);
    assert.deepEqual(ambiguous.diagnostics.map(item => item.code), [
        "PART_SOURCE_AMBIGUOUS"
    ]);
});

test("refuses candidate inheritance while preserving the exact source-version contribution", () =>
{
    const documents = CreateDocuments();
    const version = documents.characterPartSources["source/top"].versions[0];

    documents.characterPartSources["source/top"].metadata = "metadata/top";
    documents.characterPartMetadata["metadata/top"] = {
        sourcePath: "res:/character/top/metadata.json",
        dependentModifiers: [ "support/top" ]
    };
    version.configurationCandidates = [];
    documents.characterPartSources["source/top"].versions.unshift({
        resourceVersion: null,
        configurationCandidates: [ "res:/character/top.black" ],
        geometryCandidates: [],
        textureCandidates: []
    });

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.equal(plan.parts.length, 1);
    assert.equal(plan.layers.length, 1);
    assert.equal(plan.parts[0].configurationPath, null);
    assert.equal(plan.parts[0].geometryPath, "res:/character/top.gr2");
    assert.deepEqual(plan.diagnostics.map(item => item.code), [
        "PART_CANDIDATES_UNRESOLVED",
        "TEXTURE_ROLES_UNRESOLVED",
        "PASS_ORDER_UNRESOLVED"
    ]);
});

test("preserves a texture-only exact source version as a plan contribution", () =>
{
    const documents = CreateDocuments();
    const version = documents.characterPartSources["source/top"].versions[0];

    version.configurationCandidates = [];
    version.geometryCandidates = [];

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.equal(plan.selections.length, 1);
    assert.equal(plan.parts.length, 1);
    assert.equal(plan.layers.length, 1);
    assert.equal(plan.parts[0].configurationPath, null);
    assert.equal(plan.parts[0].geometryPath, null);
    assert.equal(plan.parts[0].origin.recordID, "source/top");
    assert.equal(plan.parts[0].origin.jsonPointer, "/versions/0");
    assert.deepEqual(plan.diagnostics.map(item => item.code), [
        "PART_CANDIDATES_UNRESOLVED",
        "TEXTURE_ROLES_UNRESOLVED",
        "PASS_ORDER_UNRESOLVED"
    ]);
});

test("refuses duplicate exact resource-version inventories", () =>
{
    const documents = CreateDocuments();
    const version = documents.characterPartSources["source/top"].versions[0];

    documents.characterPartSources["source/top"].versions.push({
        resourceVersion: version.resourceVersion,
        configurationCandidates: [ ...version.configurationCandidates ],
        geometryCandidates: [ ...version.geometryCandidates ],
        textureCandidates: [ ...version.textureCandidates ]
    });

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.equal(plan.parts.length, 0);
    assert.equal(plan.layers.length, 0);
    assert.deepEqual(plan.diagnostics.map(item => item.code), [
        "PART_VERSION_AMBIGUOUS"
    ]);
});

test("diagnoses an unresolved effective version-metadata relationship", () =>
{
    const documents = CreateDocuments();

    documents.characterPartSources["source/top"].versions[0].metadata = "metadata/missing";

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.equal(plan.parts.length, 1);
    assert.equal(plan.layers.length, 1);
    assert.deepEqual(plan.diagnostics.map(item => item.code), [
        "PART_METADATA_UNRESOLVED",
        "TEXTURE_ROLES_UNRESOLVED",
        "PASS_ORDER_UNRESOLVED"
    ]);
});

test("preserves duplicate authored groups and reports unresolved policy fields", () =>
{
    const documents = CreateDocuments();

    documents.paperdolls[30].modifiers.push({
        modifierLocationID: "10",
        paperdollResourceID: "20",
        paperdollResourceVariation: 2
    });
    documents.characterResources[20].clothingRemovesCategory = "10";
    documents.characterResources[20].clothingRuleException = 0;
    documents.characterPartTypes["type/top"].colorVariant = "blue";
    documents.characterPartSources["source/top"].metadata = "metadata/top";
    documents.characterPartSources["source/top"].versions[0].metadata = "metadata/top";
    documents.characterPartMetadata["metadata/top"] = {
        sourcePath: "res:/character/top/metadata.json",
        dependentModifiers: [ "support/top#1.0" ]
    };

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );
    const codes = plan.diagnostics.map(item => item.code);

    assert.deepEqual(plan.selections.map(item => item.groupID), [ "topinner", "topinner" ]);
    assert.equal(plan.parts.length, 2);
    assert.equal(plan.layers.length, 2);
    assert.ok(codes.includes("DUPLICATE_SELECTION_GROUP"));
    assert.ok(codes.includes("RESOURCE_VARIATION_UNRESOLVED"));
    assert.ok(codes.includes("CLOTHING_RULES_UNRESOLVED"));
    assert.ok(codes.includes("MATERIAL_SELECTION_UNRESOLVED"));
    assert.ok(codes.includes("DEPENDENCY_REFERENCE_UNRESOLVED"));
    assert.ok(!codes.includes("PART_METADATA_RULES_UNRESOLVED"));
});

test("preserves raw dependency and occlusion facts without fabricating layers", () =>
{
    const documents = CreateDocuments();

    documents.characterPartSources["source/top"].versions[0].metadata = "metadata/top";
    documents.characterPartMetadata["metadata/top"] = {
        sourcePath: "res:/character/top/metadata.json",
        dependentModifiers: [ "Support/Top###0.7", "Utility#2" ],
        occludesModifiers: [ "BottomOuter/Mixed#1" ],
        lod1Replacement: "Top/Replacement",
        lod2Replacement: "Top/ReplacementLow"
    };

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.equal(plan.parts.length, 1);
    assert.equal(plan.layers.length, 1);
    assert.deepEqual(plan.diagnostics.map(value => [ value.code, value.message ]), [
        [
            "DEPENDENCY_REFERENCE_UNRESOLVED",
            "Part source \"source/top\" has unresolved authored dependency \"Support/Top###0.7\"."
        ],
        [
            "DEPENDENCY_REFERENCE_UNRESOLVED",
            "Part source \"source/top\" has unresolved authored dependency \"Utility#2\"."
        ],
        [
            "OCCLUSION_POLICY_UNRESOLVED",
            "Part source \"source/top\" has unresolved authored occlusion \"BottomOuter/Mixed#1\"."
        ],
        [
            "TEXTURE_ROLES_UNRESOLVED",
            "Part source \"source/top\" has texture candidates without decoded roles or placement."
        ],
        [
            "PASS_ORDER_UNRESOLVED",
            "Resolved contributions do not establish atlas targets or composition-pass order."
        ]
    ]);
});

test("projects exact typed dependencies as requester-owned source contributions", () =>
{
    const documents = CreateDocuments();
    AddOuterSelection(documents);

    documents.characterPartSources["source/top"].versions[0].metadata = "metadata/top";
    documents.characterPartSources["source/outer"].versions[0].metadata = "metadata/outer";
    documents.characterPartSources["source/support"] = {
        sourcePath: "res:/character/support",
        sex: "female",
        partPath: "dependants/tuck/basic",
        versions: [ {
            resourceVersion: null,
            metadata: null,
            configurationCandidates: [ "res:/character/support.black" ],
            geometryCandidates: [ "res:/character/support.gr2" ],
            textureCandidates: []
        } ],
        metadata: null
    };
    documents.characterPartSources["source/mask"] = {
        sourcePath: "res:/character/mask",
        sex: "female",
        partPath: "dependants/masktuck/tuckmaskmid",
        versions: [ {
            resourceVersion: null,
            metadata: null,
            configurationCandidates: [],
            geometryCandidates: [],
            textureCandidates: [
                "res:/character/mask_body_m.png",
                "res:/character/mask_body_m_512.png"
            ]
        } ],
        metadata: null
    };
    documents.characterPartSources["source/coordinator"] = {
        sourcePath: "res:/character/coordinator",
        sex: "female",
        partPath: "dependants/waisttucking/standard",
        versions: [ {
            resourceVersion: null,
            metadata: null,
            configurationCandidates: [],
            geometryCandidates: [],
            textureCandidates: []
        }, {
            resourceVersion: "v1",
            metadata: "metadata/coordinator-v1",
            configurationCandidates: [],
            geometryCandidates: [],
            textureCandidates: []
        } ],
        metadata: null
    };
    documents.characterPartMetadata["metadata/top"] = {
        sourcePath: "res:/character/top/metadata.yaml",
        dependentModifiers: [
            "dependants/tuck/basic",
            "dependants/masktuck/tuckmaskmid",
            "dependants/waisttucking/standard",
            "utilityshapes/pushhemshape###0.7"
        ],
        dependencies: [ {
            authoredValue: "dependants/tuck/basic",
            modifierPath: "dependants/tuck/basic",
            partSource: "source/support"
        }, {
            authoredValue: "dependants/masktuck/tuckmaskmid",
            modifierPath: "dependants/masktuck/tuckmaskmid",
            partSource: "source/mask"
        }, {
            authoredValue: "dependants/waisttucking/standard",
            modifierPath: "dependants/waisttucking/standard",
            partSource: "source/coordinator"
        }, {
            authoredValue: "utilityshapes/pushhemshape###0.7"
        } ]
    };
    documents.characterPartMetadata["metadata/coordinator-v1"] = {
        sourcePath: "res:/character/coordinator/v1/metadata.yaml",
        hidesBootShin: true,
        occludesModifiers: [ "utilityshapes/pushhemshape" ],
        occlusions: [ {
            authoredValue: "utilityshapes/pushhemshape",
            modifierPath: "utilityshapes/pushhemshape"
        } ]
    };
    documents.characterPartMetadata["metadata/outer"] = {
        sourcePath: "res:/character/outer/metadata.yaml",
        dependentModifiers: [ "utilityshapes/pushhemshape###0.7" ],
        dependencies: [ {
            authoredValue: "utilityshapes/pushhemshape###0.7"
        } ]
    };

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.equal(plan.schemaVersion, 4);
    assert.equal(plan.parts.length, 4);
    assert.equal(plan.layers.length, 4);
    assert.ok(plan.layers.slice(0, 3).every(layer =>
        layer.owner === plan.selections[0]));
    assert.equal(plan.parts[1].configurationPath, "res:/character/support.black");
    assert.equal(plan.parts[1].geometryPath, "res:/character/support.gr2");
    assert.deepEqual(plan.parts[2].texturePaths, [
        "res:/character/mask_body_m.png",
        "res:/character/mask_body_m_512.png"
    ]);
    assert.equal(plan.layers[1].origin.kind, "authored");
    assert.equal(plan.parts[1].origin.kind, "derived");
    assert.deepEqual(plan.morphTargets.map(value => [
        value.modifierPath,
        value.weight,
        value.owner.groupID
    ]), [ [ "utilityshapes/pushhemshape", 0.7, "topinner" ] ]);
    assert.deepEqual(plan.diagnostics.map(value => value.code), [
        "DEPENDENCY_RESOURCES_EMPTY",
        "TEXTURE_ROLES_UNRESOLVED",
        "TEXTURE_ROLES_UNRESOLVED",
        "UTILITY_SHAPE_SUPPRESSED",
        "PASS_ORDER_UNRESOLVED"
    ]);

    library.Get("characterPartMetadata", "metadata/coordinator-v1")
        .hidesBootShin = false;

    const retainedPlan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.deepEqual(retainedPlan.morphTargets.map(value => [
        value.modifierPath,
        value.owner.groupID
    ]), [
        [ "utilityshapes/pushhemshape", "topinner" ],
        [ "utilityshapes/pushhemshape", "outer" ]
    ]);
    assert.ok(!retainedPlan.diagnostics.some(value =>
        value.code === "UTILITY_SHAPE_SUPPRESSED"));
});

test("uses the unique unversioned dependency when the owner version has no peer", () =>
{
    const documents = CreateDocuments();

    documents.characterPartTypes["type/top"].resourceVersion = "v2";
    documents.characterPartSources["source/top"].versions[0].resourceVersion = "v2";
    documents.characterPartSources["source/top"].versions[0].metadata = "metadata/top";
    documents.characterPartSources["source/support"] = {
        sourcePath: "res:/character/support",
        sex: "female",
        partPath: "dependants/drape/standard",
        versions: [ {
            resourceVersion: null,
            metadata: null,
            configurationCandidates: [ "res:/character/support-default.black" ],
            geometryCandidates: [ "res:/character/support-default.gr2" ],
            textureCandidates: []
        }, {
            resourceVersion: "v1",
            metadata: null,
            configurationCandidates: [ "res:/character/support-v1.black" ],
            geometryCandidates: [ "res:/character/support-v1.gr2" ],
            textureCandidates: []
        } ],
        metadata: null
    };
    documents.characterPartMetadata["metadata/top"] = {
        sourcePath: "res:/character/top/metadata.yaml",
        dependentModifiers: [ "dependants/drape/standard" ],
        dependencies: [ {
            authoredValue: "dependants/drape/standard",
            modifierPath: "dependants/drape/standard",
            partSource: "source/support"
        } ]
    };

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.equal(plan.parts[1].configurationPath, "res:/character/support-default.black");
    assert.equal(plan.parts[1].geometryPath, "res:/character/support-default.gr2");
    assert.ok(!plan.diagnostics.some(value =>
        value.code === "DEPENDENCY_VERSION_UNRESOLVED"));
});

test("resolves an exact weighted part dependency without dropping its authored weight", () =>
{
    const documents = CreateDocuments();

    documents.characterPartSources["source/top"].versions[0].metadata = "metadata/top";
    documents.characterPartSources["female/makeup/eyelashes/eyelashes_02"] = {
        sourcePath: "res:/character/female/makeup/eyelashes/eyelashes_02",
        sex: "female",
        partPath: "makeup/eyelashes/eyelashes_02",
        versions: [ {
            resourceVersion: null,
            metadata: null,
            configurationCandidates: [],
            geometryCandidates: [],
            textureCandidates: [ "res:/character/eyelashes/colorize_head_l_4k.png" ]
        } ],
        metadata: null
    };
    documents.characterPartMetadata["metadata/top"] = {
        sourcePath: "res:/character/top/metadata.yaml",
        dependentModifiers: [ "makeup/eyelashes/eyelashes_02###0.4" ],
        dependencies: [ {
            authoredValue: "makeup/eyelashes/eyelashes_02###0.4"
        } ]
    };

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.equal(plan.parts.length, 2);
    assert.equal(plan.layers.length, 2);
    assert.equal(plan.layers[1].weight, 0.4);
    assert.deepEqual(plan.parts[1].texturePaths, [
        "res:/character/eyelashes/colorize_head_l_4k.png"
    ]);
    assert.equal(plan.parts[1].origin.rule, "unique-weighted-dependency-version");
    assert.ok(!plan.diagnostics.some(value =>
        value.code === "DEPENDENCY_REFERENCE_UNRESOLVED"));
});

test("resolves proved utility dependency weights and exact active occlusions", () =>
{
    const documents = CreateDocuments();

    documents.characterPartSources["source/top"].versions[0].metadata = "metadata/top";
    documents.characterPartMetadata["metadata/top"] = {
        sourcePath: "res:/character/top/metadata.yaml",
        dependentModifiers: [
            "utilityshapes/PinchTuckShape",
            "utilityshapes/PushHemMidShape###0.35",
            "utilityshapes/ZeroShape###0",
            "utilityshapes/UnprovedShape#0.5"
        ],
        occludesModifiers: [ "utilityshapes/PinchTuckShape" ],
        dependencies: [ {
            authoredValue: "utilityshapes/PinchTuckShape",
            modifierPath: "utilityshapes/pinchtuckshape",
            weight: 1
        }, {
            authoredValue: "utilityshapes/PushHemMidShape###0.35",
            modifierPath: "utilityshapes/pushhemmidshape",
            weight: 0.35
        }, {
            authoredValue: "utilityshapes/ZeroShape###0",
            modifierPath: "utilityshapes/zeroshape",
            weight: 0
        }, {
            authoredValue: "utilityshapes/UnprovedShape#0.5"
        } ],
        occlusions: [ {
            authoredValue: "utilityshapes/PinchTuckShape",
            modifierPath: "utilityshapes/pinchtuckshape"
        } ]
    };

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.deepEqual(plan.morphTargets.map(value => [
        value.modifierPath,
        value.targetName,
        value.weight
    ]), [
        [ "utilityshapes/pushhemmidshape", "PushHemMidShape", 0.35 ],
        [ "utilityshapes/zeroshape", "ZeroShape", 0 ]
    ]);
    assert.ok(plan.diagnostics.some(value =>
        value.code === "UTILITY_SHAPE_SUPPRESSED"));
    assert.ok(plan.diagnostics.some(value =>
        value.code === "DEPENDENCY_REFERENCE_UNRESOLVED"
        && value.message.includes("UnprovedShape#0.5")));
});

test("suppresses an exact selected location through a typed clothing removal", () =>
{
    const documents = CreateDocuments();
    AddOuterSelection(documents, {
        clothingRemovesCategory: "10"
    });

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.deepEqual(plan.selections.map(value => value.groupID), [
        "topinner",
        "outer"
    ]);
    assert.deepEqual(plan.layers.map(value => value.owner.groupID), [ "outer" ]);
    assert.equal(plan.parts.length, 1);
    assert.equal(plan.parts[0].geometryPath, "res:/character/outer.gr2");
    assert.ok(plan.diagnostics.some(value =>
        value.code === "SELECTION_SUPPRESSED"
        && value.message.includes("topinner")
        && value.message.includes("outer")));
    assert.ok(!plan.diagnostics.some(value =>
        value.code === "CLOTHING_RULES_UNRESOLVED"));
});

test("suppresses an exact selected location through typed part metadata", () =>
{
    const documents = CreateDocuments();
    AddOuterSelection(documents);
    documents.characterPartSources["source/outer"].versions[0].metadata = "metadata/outer";
    documents.characterPartMetadata["metadata/outer"] = {
        sourcePath: "res:/character/outer/metadata.yaml",
        occludesModifiers: [ "topinner" ],
        occlusions: [ {
            authoredValue: "topinner",
            modifierLocation: "10"
        } ]
    };

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.deepEqual(plan.layers.map(value => value.owner.groupID), [ "outer" ]);
    assert.ok(plan.diagnostics.some(value =>
        value.code === "SELECTION_SUPPRESSED"));
    assert.ok(!plan.diagnostics.some(value =>
        value.code === "OCCLUSION_POLICY_UNRESOLVED"));
});

test("retains both selections when exact typed suppression is cyclic", () =>
{
    const documents = CreateDocuments();
    AddOuterSelection(documents, {
        clothingRemovesCategory: "10"
    });
    documents.characterResources[20].clothingRemovesCategory = "11";

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.deepEqual(plan.layers.map(value => value.owner.groupID), [
        "topinner",
        "outer"
    ]);
    assert.equal(plan.parts.length, 2);
    assert.equal(plan.diagnostics.filter(value =>
        value.code === "SELECTION_SUPPRESSION_CONFLICT").length, 2);
    assert.ok(!plan.diagnostics.some(value =>
        value.code === "SELECTION_SUPPRESSED"));
});

test("only active selections suppress later locations in an exact chain", () =>
{
    const documents = CreateDocuments();
    AddOuterSelection(documents, {
        clothingRemovesCategory: "12"
    });
    AddMiddleSelection(documents, {
        clothingRemovesCategory: "10"
    });

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.deepEqual(plan.layers.map(value => value.owner.groupID), [
        "topinner",
        "outer"
    ]);
    assert.equal(plan.diagnostics.filter(value =>
        value.code === "SELECTION_SUPPRESSED").length, 1);
    assert.ok(plan.diagnostics.some(value =>
        value.code === "SELECTION_SUPPRESSED"
        && value.message.includes("topmiddle")
        && value.message.includes("outer")));
});

test("retains every selection in a longer exact suppression cycle", () =>
{
    const documents = CreateDocuments();
    documents.characterResources[20].clothingRemovesCategory = "11";
    AddOuterSelection(documents, {
        clothingRemovesCategory: "12"
    });
    AddMiddleSelection(documents, {
        clothingRemovesCategory: "10"
    });

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.deepEqual(plan.layers.map(value => value.owner.groupID), [
        "topinner",
        "outer",
        "topmiddle"
    ]);
    assert.equal(plan.diagnostics.filter(value =>
        value.code === "SELECTION_SUPPRESSION_CONFLICT").length, 3);
    assert.ok(!plan.diagnostics.some(value =>
        value.code === "SELECTION_SUPPRESSED"));
});

test("consumes ordering flags without reordering contribution inventory", () =>
{
    const documents = CreateDocuments();

    documents.characterPartSources["source/top"].versions[0].metadata = "metadata/top";
    documents.characterPartMetadata["metadata/top"] = {
        sourcePath: "res:/character/top/metadata.json",
        forcesLooseTop: true,
        hidesBootShin: true,
        swapTops: true,
        swapBottom: true,
        swapSocks: true
    };

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.deepEqual(plan.layers.map(value => value.owner.groupID), [ "topinner" ]);
    assert.deepEqual(plan.diagnostics.map(value => value.code), [
        "TEXTURE_ROLES_UNRESOLVED",
        "PASS_ORDER_UNRESOLVED"
    ]);
});

test("reports unknown modifier categories without suppressing exact parts", () =>
{
    const documents = CreateDocuments();

    documents.characterModifierLocations[10].modifierKey = "not-authored";

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.equal(plan.parts.length, 1);
    assert.equal(plan.layers.length, 1);
    assert.deepEqual(plan.diagnostics.map(value => value.code), [
        "TEXTURE_ROLES_UNRESOLVED",
        "MODIFIER_CATEGORY_UNKNOWN",
        "PASS_ORDER_UNRESOLVED"
    ]);
});

test("maps authored makeup modifier keys into the verified makeup suborder", () =>
{
    const documents = CreateDocuments();

    documents.characterModifierLocations[10].modifierKey = "makeup/eyes";

    const library = CreateLibrary(documents);
    const plan = CjsCharacterAppearanceResolver.resolvePaperdoll(
        library,
        library.Get("paperdolls", "30")
    );

    assert.equal(plan.selections[0].groupID, "makeup/eyes");
    assert.deepEqual(plan.diagnostics.map(value => value.code), [
        "TEXTURE_ROLES_UNRESOLVED",
        "PASS_ORDER_UNRESOLVED"
    ]);
});

test("requires the hydrated paper doll to belong to the supplied library", () =>
{
    const library = CreateLibrary();
    const other = CreateLibrary();

    assert.throws(
        () => CjsCharacterAppearanceResolver.resolvePaperdoll(
            library,
            other.Get("paperdolls", "30")
        ),
        /paper doll from the supplied library/u
    );
});

function CreateLibrary(documents = CreateDocuments())
{
    return CjsCharacterLibrary.from(CjsCharacterLibraryBuilder.build(documents, {
        sourceTarget: "eve",
        sourceGame: "Eve",
        sourceProvider: "ccp",
        sourceBuild: "synthetic-build"
    }));
}

function AddOuterSelection(documents, resourceValues = {})
{
    documents.characterModifierLocations[11] = {
        modifierKey: "outer",
        variationKey: ""
    };
    documents.characterResources[21] = {
        resPath: "type/outer",
        resGender: 0,
        ...resourceValues
    };
    documents.characterPartTypes["type/outer"] = {
        sourcePath: "res:/character/outer.type",
        sex: "female",
        partPath: "outer/coat",
        resourceVersion: "v1",
        colorVariant: null,
        partSource: "source/outer"
    };
    documents.characterPartSources["source/outer"] = {
        sourcePath: "res:/character/outer",
        sex: "female",
        partPath: "outer/coat",
        versions: [ {
            resourceVersion: "v1",
            metadata: null,
            configurationCandidates: [ "res:/character/outer.black" ],
            geometryCandidates: [ "res:/character/outer.gr2" ],
            textureCandidates: [ "res:/character/outer_d.png" ]
        } ],
        metadata: null
    };
    documents.paperdolls[30].modifiers.push({
        modifierLocationID: "11",
        paperdollResourceID: "21",
        paperdollResourceVariation: 0
    });
}

function AddMiddleSelection(documents, resourceValues = {})
{
    documents.characterModifierLocations[12] = {
        modifierKey: "topmiddle",
        variationKey: ""
    };
    documents.characterResources[22] = {
        resPath: "type/middle",
        resGender: 0,
        ...resourceValues
    };
    documents.characterPartTypes["type/middle"] = {
        sourcePath: "res:/character/middle.type",
        sex: "female",
        partPath: "topmiddle/shirt",
        resourceVersion: "v1",
        colorVariant: null,
        partSource: "source/middle"
    };
    documents.characterPartSources["source/middle"] = {
        sourcePath: "res:/character/middle",
        sex: "female",
        partPath: "topmiddle/shirt",
        versions: [ {
            resourceVersion: "v1",
            metadata: null,
            configurationCandidates: [ "res:/character/middle.black" ],
            geometryCandidates: [ "res:/character/middle.gr2" ],
            textureCandidates: [ "res:/character/middle_d.png" ]
        } ],
        metadata: null
    };
    documents.paperdolls[30].modifiers.push({
        modifierLocationID: "12",
        paperdollResourceID: "22",
        paperdollResourceVariation: 0
    });
}

function CreateDocuments()
{
    return {
        ancestries: {},
        archetypes: {},
        bloodlines: {},
        characterAvatarBehaviors: {},
        characterColorLocations: {
            5: {
                colorKey: "makeup/eyes",
                hasGloss: 0,
                hasWeight: 0
            }
        },
        characterColorNames: {
            119: {
                colorName: "darkbrown_abc",
                hairColor: 0
            }
        },
        characterModifierLocations: {
            10: {
                modifierKey: "topinner",
                variationKey: ""
            }
        },
        characterPortraitResources: {},
        characterResources: {
            20: {
                resPath: "type/top",
                resGender: 0
            }
        },
        characterSculptingLocations: {},
        paperdolls: {
            30: {
                colorSelections: [ {
                    gloss: 0,
                    weight: 0,
                    colorID: "5",
                    colorNameA: "119",
                    colorNameBC: null
                } ],
                modifiers: [ {
                    modifierLocationID: "10",
                    paperdollResourceID: "20",
                    paperdollResourceVariation: 0
                } ]
            }
        },
        races: {},
        characterPartTypes: {
            "type/top": {
                sourcePath: "res:/character/top.type",
                sex: "female",
                partPath: "topinner/top",
                resourceVersion: "v1",
                colorVariant: null,
                partSource: "source/top"
            }
        },
        characterPartSources: {
            "source/top": {
                sourcePath: "res:/character/top",
                sex: "female",
                partPath: "topinner/top",
                versions: [ {
                    resourceVersion: "v1",
                    metadata: null,
                    configurationCandidates: [ "res:/character/top.black" ],
                    geometryCandidates: [ "res:/character/top.gr2" ],
                    textureCandidates: [ "res:/character/top_d.png" ]
                } ],
                metadata: null
            }
        },
        characterPartMetadata: {},
        characterMaterialProfiles: {},
        characterProjectionProfiles: {},
        characterRecipeProfiles: {}
    };
}
