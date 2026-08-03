import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterAppearanceLayer,
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

test("requires strict version identity and refuses ambiguous candidate inventories", () =>
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

    assert.equal(ambiguousPlan.parts.length, 0);
    assert.equal(ambiguousPlan.layers.length, 0);
    assert.deepEqual(ambiguousPlan.diagnostics.map(item => item.code), [
        "PART_CANDIDATES_UNRESOLVED"
    ]);
    assert.deepEqual(ambiguousPlan.textures, []);
    assert.deepEqual(ambiguousPlan.targets, []);
});

test("refuses to infer candidate inheritance from an unversioned inventory", () =>
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

    assert.equal(plan.parts.length, 0);
    assert.equal(plan.layers.length, 0);
    assert.deepEqual(plan.diagnostics.map(item => item.code), [
        "PART_CANDIDATES_UNRESOLVED"
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
    assert.ok(codes.includes("PART_METADATA_RULES_UNRESOLVED"));
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

function CreateDocuments()
{
    return {
        ancestries: {},
        archetypes: {},
        bloodlines: {},
        characterAvatarBehaviors: {},
        characterColorLocations: {},
        characterColorNames: {},
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
