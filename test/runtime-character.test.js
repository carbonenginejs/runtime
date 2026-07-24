import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import {
    CjsCharacterBlendshapeLimits,
    CjsCharacterFaceSetup,
    CjsCharacterGraph,
    CjsCharacterLibrary,
    CjsCharacterLibraryData,
    CjsCharacterLodBundle,
    CjsCharacterModifierNames,
    CjsCharacterPartDefinition,
    CjsCharacterPartMetadata,
    CjsCharacterPresentation,
    CjsCharacterPose,
    CjsCharacterProjection,
    CjsCharacterRecipe,
    CjsCharacterResolvedPart,
    CjsCharacterSculptField,
    CjsCharacterUniqueCharacter,
    Tr2GStateAnimation,
    Tr2GStateParameter
} from "../npm/dist/index.js";

test("owns Carbon's character GState runtime shells", () =>
{
    const parameter = new Tr2GStateParameter();
    parameter.SetName("speed");
    parameter.SetNodeName("movement");
    parameter.SetValue(0.75);

    assert.equal(parameter.GetName(), "speed");
    assert.equal(parameter.GetNodeName(), "movement");
    assert.equal(parameter.GetValue(), 0.75);
    assert.equal(parameter.Initialize(), true);
    assert.equal(CjsSchema.GetConstructor("Tr2GStateParameter"), Tr2GStateParameter);
    assert.equal(CjsSchema.GetConstructor("Tr2GStateAnimation"), Tr2GStateAnimation);

    const animation = new Tr2GStateAnimation();
    assert.deepEqual(animation.parameters, []);
    assert.equal(animation.animationEnabled, true);
    animation.resPath = "res:/animation/walk.gr2";
    animation.gStateResPath = "res:/animation/walk.gsf";
    animation.model = "human";
    assert.equal(animation.GetResPath(), "res:/animation/walk.gr2");
    assert.equal(animation.GetGStateResPath(), "res:/animation/walk.gsf");
    assert.equal(animation.GetModel(), "human");
    assert.equal(animation.resPath_, animation.resPath);
    assert.equal(animation.gStateResPath_, animation.gStateResPath);
    assert.equal(animation.model_, animation.model);
    assert.equal(CjsSchema.getField(Tr2GStateAnimation, "resPath_")?.io?.persistOnly, true);
    assert.equal(CjsSchema.getMethod(Tr2GStateParameter, "Initialize")?.carbon?.method, true);
    assert.equal(CjsSchema.getMethod(Tr2GStateAnimation, "SetResPath")?.impl?.status, "adapted");
    assert.throws(() => animation.IsFullyLoaded(), /not implemented/);
});

test("hydrates and exports a pure character graph", () =>
{
    const graph = CjsCharacterGraph.from({
        recipe: { sex: "female", entries: [ { category: "head", path: "head/head_generic" } ] },
        poses: [ { name: "portrait", bones: [ { name: "Head", rotation: [ 0, 0.1, 0 ] } ] } ],
        dependencies: [ { path: "res:/graphics/character/head.gr2", kind: "geometry" } ]
    });
    assert.ok(graph.recipe instanceof CjsCharacterRecipe);
    assert.ok(graph.poses[0] instanceof CjsCharacterPose);
    assert.equal(graph.GetDependencies()[0].path, "res:/graphics/character/head.gr2");
    assert.equal(graph.GetValues().recipe.entries[0].category, "head");
});

test("publishes typed schema metadata for shared model behavior", () =>
{
    new CjsCharacterGraph();
    assert.equal(CjsSchema.getClassFamily(CjsCharacterGraph), "character");
    assert.equal(CjsSchema.getField(CjsCharacterGraph, "recipe").type.className, "CjsCharacterRecipe");
    assert.equal(CjsSchema.getField(CjsCharacterGraph, "dependencies").type.itemType, "CjsCharacterDependency");
    assert.equal(CjsSchema.getField(CjsCharacterGraph, "morphs").type.valueType, "float32");
    assert.equal(CjsSchema.getField(CjsCharacterGraph, "name").io.persist, true);
});

test("stores morph and pose state without integration", () =>
{
    const graph = new CjsCharacterGraph();
    const events = [];
    graph.OnEvent("modified", (target, payload) => events.push([target, payload]));
    graph.SetMorph("Smile", 0.75, { source: graph }).SetActivePose("portrait", { source: graph });
    assert.equal(graph.morphs.get("Smile"), 0.75);
    assert.equal(graph.activePose, "portrait");
    // core-types 0.12: the modified event carries { source } only - there is
    // no changed-property list (kb §8); each mutator settles its own event.
    assert.equal(events.length, 2, "each mutator emitted one modified event");
    assert.equal(events.every(entry => entry[0] === graph && entry[1].source === graph), true);
    assert.deepEqual(graph.GetValues().morphs, { Smile: 0.75 });
    assert.throws(() => graph.SetMorph("", 1), /non-empty string/);
    assert.throws(() => graph.SetMorph("Smile", Infinity), /must be finite/);
    assert.throws(() => graph.SetActivePose(null), /must be a string/);
});

test("uses the shared SetValues change-result contract", () =>
{
    const graph = new CjsCharacterGraph();
    assert.deepEqual(graph.SetValues({ name: "Pilot" }), new Set(["name"]));
    assert.equal(graph.SetValues({ name: "Pilot" }), false);
    assert.equal(graph.SetValues({ name: "Capsuleer" }, { returnBoolean: true }), true);
});

test("hydrates a deterministic character library and builds transient indexes", () =>
{
    const library = new CjsCharacterLibrary({
        sourceBuild: "3430261",
        sourceRefs: {
            "#ref1": "res:/graphics/character/female/paperdoll/accessories/glasses/monocle_01/metadata.yaml"
        },
        sources: [ {
            ref: "#ref1",
            profile: "partMetadata",
            build: "3430261",
            checksum: "65237f11fdc81b42a109884d24c4ee9e",
            byteLength: 256
        } ],
        partMetadata: [ {
            id: "female/accessories/glasses/monocle_01",
            numColorAreas: 3,
            dependentModifiers: [ "utilityshapes/righteyepatchShape", "utilityshapes/hidebrowrightShape" ]
        } ],
        parts: [ {
            id: "female/accessories/glasses/monocle_01",
            name: "monocle_01",
            sex: "female",
            category: "accessories/glasses",
            path: "accessories/glasses/monocle_01",
            metadataId: "female/accessories/glasses/monocle_01"
        } ],
        projections: [ {
            id: "female/tattoo/armleft/sleeve01",
            label: "arml",
            bodyEnabled: true,
            maskPathEnabled: true,
            offset: [ -0.25, 0 ],
            position: [ 0.325, 1.43, -0.076 ],
            texturePath: "res:/graphics/character/decals/tattoos/sleeve/sleeve01/sleeve01.dds"
        } ],
        poses: [ {
            id: "female/head/head_generic",
            name: "head_generic",
            bones: [ { name: "Trajectory", translation: [ 0, 0, -0.01680232 ] } ]
        } ],
        presets: [ {
            id: "eve",
            name: "Eve",
            sex: "female",
            entries: [ {
                category: "head",
                path: "head/head_generic",
                weight: 1
            } ]
        } ],
        sculptFields: [ {
            id: "NoseBridge_Front",
            name: "NoseBridge_Front",
            attributes: [ "Bridge_up", "Bridge_down" ],
            markerPosition: [ -0.975, -0.06, 2.616 ],
            vertices: [ {
                index: 0,
                position: [ -1.24, 0, 4.32 ],
                coordinates: [ -1.24, 4.32 ],
                weights: { Bridge_up: 1, Bridge_down: 0 }
            } ],
            triangles: [ { indices: [ 0, 4, 2 ] } ]
        } ],
        blendshapeLimits: [ {
            id: "amarr_amarr_female",
            sex: "female",
            head: "amarr_amarr",
            limits: { CheeksMiddle_backShape: [ 0, 0.33 ] }
        } ],
        uniqueCharacters: [ {
            id: "amarrfemaleclothing",
            sex: "female",
            resources: { configPaths: [ "res:/unique/unique.black" ] },
            blendshapeWeights: { aashape: 1.2 },
            animationOffsets: { Head: [ 0, 0.001, 0 ] }
        } ],
        modifierNames: {
            female: { body: [ "BodyShape" ], face: [], utility: [] },
            male: { body: [], face: [], utility: [] }
        },
        faceSetup: {
            bindPoses: {},
            animation: {},
            controls: { female: {}, male: {} },
            tweakSettings: { gammaCurves: { default: 1 }, wrinkleMultiplier: 1, correctionMultiplier: 2 }
        },
        presentation: {
            backgrounds: {
                air_station: {
                    aspect_ratio: 0.61275,
                    offset: [ 0, 0 ],
                    path: "res:/graphics/character/global/paperdolllibrary/backgrounds/air_station.png",
                    scale: 1
                }
            }
        }
    });

    assert.ok(library.data instanceof CjsCharacterLibraryData);
    assert.ok(library.GetPart("female/accessories/glasses/monocle_01") instanceof CjsCharacterPartDefinition);
    assert.ok(library.GetPartMetadata("female/accessories/glasses/monocle_01") instanceof CjsCharacterPartMetadata);
    assert.equal(library.GetPart("female/accessories/glasses/monocle_01").metadataId, "female/accessories/glasses/monocle_01");
    assert.ok(library.GetProjection("female/tattoo/armleft/sleeve01") instanceof CjsCharacterProjection);
    assert.ok(library.GetPose("female/head/head_generic") instanceof CjsCharacterPose);
    assert.ok(library.GetPreset("eve") instanceof CjsCharacterRecipe);
    assert.ok(library.GetSculptField("NoseBridge_Front") instanceof CjsCharacterSculptField);
    assert.ok(library.GetBlendshapeLimits("amarr_amarr_female") instanceof CjsCharacterBlendshapeLimits);
    assert.ok(library.GetUniqueCharacter("amarrfemaleclothing") instanceof CjsCharacterUniqueCharacter);
    assert.ok(library.data.modifierNames instanceof CjsCharacterModifierNames);
    assert.ok(library.data.faceSetup instanceof CjsCharacterFaceSetup);
    assert.ok(library.data.presentation instanceof CjsCharacterPresentation);
    assert.equal(library.GetPresentationProfile("backgrounds", "air_station").scale, 1);
    assert.equal(library.GetPartsBySex("female").length, 1);
    assert.equal(library.GetPartsByCategory("accessories/glasses").length, 1);
    assert.equal(library.GetPart("missing"), null);

    const json = library.data.GetValues();
    assert.equal(json.schema, "carbonenginejs.characterLibrary");
    assert.equal(json.sourceRefs["#ref1"], "res:/graphics/character/female/paperdoll/accessories/glasses/monocle_01/metadata.yaml");
    assert.equal(json.sources[0].ref, "#ref1");
    assert.deepEqual(json.sculptFields[0].vertices[0].weights, { Bridge_up: 1, Bridge_down: 0 });
    assert.deepEqual(json.blendshapeLimits[0].limits.CheeksMiddle_backShape, [ 0, 0.33 ]);
    assert.equal(json.uniqueCharacters[0].blendshapeWeights.aashape, 1.2);
    assert.equal(Object.hasOwn(json, "indexes"), false);
});

test("hydrates compact schema-v2 library artifacts through the public constructor", () =>
{
    const partID = "female/head/head_generic/types/head_generic";
    const materialID = "female/head/head_generic/default";
    const data = {
        schema: "carbonenginejs.characterLibrary",
        schemaVersion: 2,
        sourceTarget: "eve",
        sourceGame: "Eve",
        sourceProvider: "ccp",
        sourceBuild: "3435006",
        materials: {
            [materialID]: { slot: "head/head_generic" }
        },
        partSources: {
            "female/head/head_generic": {
                metadata: { numColorAreas: 3 },
                resources: {
                    configPaths: [
                        "res:/graphics/character/female/paperdoll/head/head_generic.black",
                        "res:/graphics/character/female/paperdoll_lod/head/head_generic/head_generic_lod2.black"
                    ],
                    geometryPaths: [
                        "res:/graphics/character/female/paperdoll/head/head_generic.gr2",
                        "res:/graphics/character/female/paperdoll_lod/head/head_generic/head_generic_lod2.gr2"
                    ]
                },
                versions: {
                    default: {
                        types: {
                            [partID]: {
                                materialId: materialID,
                                typeID: "54321",
                                name: "Generic Head"
                            }
                        }
                    }
                }
            }
        }
    };
    const expanded = CjsCharacterLibrary.expandData(data);
    const library = new CjsCharacterLibrary(data);

    assert.equal(expanded.schemaVersion, 1);
    assert.equal(expanded.parts[0].id, partID);
    assert.equal(data.schemaVersion, 2);
    assert.equal(library.data.schemaVersion, 1);
    assert.equal(library.data.sourceTarget, "eve");
    assert.equal(library.data.sourceGame, "Eve");
    assert.equal(library.data.sourceProvider, "ccp");
    assert.equal(library.data.sourceBuild, "3435006");
    assert.equal(library.GetPart(partID).metadataId, "female/head/head_generic");
    assert.deepEqual(library.GetPart(partID).colorIds, [ materialID ]);
    assert.equal(library.GetPartMetadata("female/head/head_generic").numColorAreas, 3);
    assert.equal(library.GetMaterial(materialID).slot, "head/head_generic");
    assert.equal(library.GetPart(partID).lodBundles.length, 2);
    assert.equal(library.GetPart(partID).typeID, "54321");
    assert.equal(library.GetPartByTypeID(54321).id, partID);
    assert.deepEqual(library.ResolveName("generic head"), {
        kind: "character",
        typeID: "54321",
        partID
    });
    assert.deepEqual(library.SearchName("generic-head"), [ {
        kind: "character",
        typeID: "54321",
        partID
    } ]);
    assert.ok(library.GetPart(partID).lodBundles.every(value => value instanceof CjsCharacterLodBundle));
});

test("preserves selectable character identities without typeID values", () =>
{
    const library = new CjsCharacterLibrary({
        parts: [
            {
                id: "female/accessories/brow/ring_left",
                name: "Brow Ring",
                sex: "female",
                category: "accessories/brow",
                path: "accessories/brow/ring_left"
            },
            {
                id: "female/accessories/brow/ring_right",
                name: "Brow Ring",
                sex: "female",
                category: "accessories/brow",
                path: "accessories/brow/ring_right"
            }
        ]
    });

    assert.deepEqual(library.LookupName("brow ring"), [
        {
            kind: "character",
            typeID: null,
            partID: "female/accessories/brow/ring_left"
        },
        {
            kind: "character",
            typeID: null,
            partID: "female/accessories/brow/ring_right"
        }
    ]);
    assert.equal(library.ResolvePart({ id: "female/accessories/brow/ring_left" }).typeID, null);
    assert.equal(library.GetPartsByCategory("ACCESSORIES", { recursive: true }).length, 2);
    assert.equal(library.GetPartsBySex("FEMALE").length, 2);
    assert.throws(() => library.ResolveName("Brow Ring"), /ambiguous \(2 identities\)/);
    assert.throws(() => library.ResolveSearchName("brow-ring"), /ambiguous \(2 identities\)/);
});

test("resolves character LOD configuration and geometry as one public bundle", () =>
{
    const partID = "female/outer/jacket/types/jacket";
    const library = new CjsCharacterLibrary({
        parts: [ {
            id: partID,
            typeID: "12345",
            name: "Jacket Prime",
            sex: "female",
            category: "outer",
            path: "outer/jacket",
            lodBundles: [
                {
                    resolvedLod: null,
                    configurationPath: "res:/character/jacket.black",
                    geometryPath: "res:/character/jacket.gr2",
                    modelFamily: "jacket"
                },
                {
                    resolvedLod: 2,
                    configurationPath: "res:/character/jacket_lod2.black",
                    geometryPath: "res:/character/jacket_lod2.gr2",
                    modelFamily: "jacket"
                }
            ]
        } ]
    });

    const available = library.GetPartLodBundles(partID);
    available.length = 0;

    assert.equal(library.GetPartLodBundles(partID).length, 2);

    assert.equal(library.GetPartByTypeID(12345).id, partID);
    assert.equal(library.GetPartByName("jacket prime").id, partID);
    assert.deepEqual(library.LookupName("Jacket Prime"), [ {
        kind: "character",
        typeID: "12345",
        partID
    } ]);
    assert.deepEqual(library.ResolveSearchName("jacket-prime"), {
        kind: "character",
        typeID: "12345",
        partID
    });

    const exact = library.ResolvePartLodBundle({ typeID: "12345" }, 2);
    assert.ok(exact instanceof CjsCharacterLodBundle);
    assert.equal(exact.requestedLod, 2);
    assert.equal(exact.resolvedLod, 2);
    assert.equal(exact.configurationPath, "res:/character/jacket_lod2.black");
    assert.equal(exact.geometryPath, "res:/character/jacket_lod2.gr2");
    assert.equal(exact.fallbackReason, "");

    const fallback = library.ResolvePartLodBundle(partID, 1);
    assert.equal(fallback.requestedLod, 1);
    assert.equal(fallback.resolvedLod, null);
    assert.equal(fallback.configurationPath, "res:/character/jacket.black");
    assert.equal(fallback.geometryPath, "res:/character/jacket.gr2");
    assert.equal(fallback.fallbackReason, "base");
    assert.equal(library.ResolvePartLodBundle("missing", 1), null);
    assert.throws(() => library.ResolvePartLodBundle(partID, -1), /non-negative integer/);
});

test("selects the nearest complete LOD bundle when no base bundle exists", () =>
{
    const resolved = CjsCharacterLodBundle.resolve([
        {
            resolvedLod: 0,
            configurationPath: "res:/character/head_lod0.black",
            geometryPath: "res:/character/head_lod0.gr2",
            modelFamily: "head"
        },
        {
            resolvedLod: 2,
            configurationPath: "res:/character/head_lod2.black",
            geometryPath: "res:/character/head_lod2.gr2",
            modelFamily: "head"
        }
    ], 1);

    assert.equal(resolved.requestedLod, 1);
    assert.equal(resolved.resolvedLod, 2);
    assert.equal(resolved.configurationPath, "res:/character/head_lod2.black");
    assert.equal(resolved.geometryPath, "res:/character/head_lod2.gr2");
    assert.equal(resolved.fallbackReason, "nearest");
});

test("builds typed graph parts from one atomic LOD bundle", () =>
{
    const partID = "female/outer/jacket/types/jacket-prime";
    const library = new CjsCharacterLibrary({
        partMetadata: [ {
            id: "female/outer/jacket",
            numColorAreas: 3
        } ],
        parts: [ {
            id: partID,
            typeID: "12345",
            name: "Jacket Prime",
            sex: "female",
            category: "outer",
            path: "outer/jacket",
            metadataId: "female/outer/jacket",
            colorIds: [ "female/outer/jacket/red" ],
            projectionId: "female/outer/jacket/decal",
            resourcePaths: [
                "res:/character/jacket.black",
                "res:/character/jacket.gr2",
                "res:/character/jacket_lod2.black",
                "res:/character/jacket_lod2.gr2",
                "res:/character/jacket_detail.dds"
            ],
            lodBundles: [
                {
                    resolvedLod: null,
                    configurationPath: "res:/character/jacket.black",
                    geometryPath: "res:/character/jacket.gr2",
                    modelFamily: "jacket"
                },
                {
                    resolvedLod: 2,
                    configurationPath: "res:/character/jacket_lod2.black",
                    geometryPath: "res:/character/jacket_lod2.gr2",
                    modelFamily: "jacket"
                }
            ]
        } ],
        materials: [ {
            id: "female/outer/jacket/red",
            slot: "outer/jacket",
            resourcePaths: [ "res:/character/jacket_color.dds" ]
        } ],
        projections: [ {
            id: "female/outer/jacket/decal",
            texturePath: "res:/character/jacket_decal.dds",
            maskPath: "res:/character/jacket_mask.dds",
            maskPathEnabled: false
        } ],
        presets: [ {
            id: "pilot",
            name: "Pilot",
            sex: "female",
            entries: []
        } ]
    });

    const resolved = library.ResolveGraphPart({ typeID: 12345 }, { lod: 2, weight: 0.75 });
    assert.ok(resolved instanceof CjsCharacterResolvedPart);
    assert.equal(resolved.partID, partID);
    assert.equal(resolved.weight, 0.75);
    assert.equal(resolved.lodBundle.resolvedLod, 2);
    assert.equal(resolved.lodBundle.configurationPath, "res:/character/jacket_lod2.black");
    assert.equal(resolved.lodBundle.geometryPath, "res:/character/jacket_lod2.gr2");
    assert.equal(resolved.metadata.numColorAreas, 3);
    assert.deepEqual(resolved.resourcePaths, [ "res:/character/jacket_detail.dds" ]);

    const dependencyPaths = resolved.dependencies.map(value => value.path).sort();
    assert.deepEqual(dependencyPaths, [
        "res:/character/jacket_color.dds",
        "res:/character/jacket_decal.dds",
        "res:/character/jacket_detail.dds",
        "res:/character/jacket_lod2.black",
        "res:/character/jacket_lod2.gr2",
        "res:/character/jacket_mask.dds"
    ]);
    assert.equal(dependencyPaths.includes("res:/character/jacket.black"), false);
    assert.equal(dependencyPaths.includes("res:/character/jacket.gr2"), false);
    assert.equal(resolved.dependencies.find(value => value.path.endsWith("jacket_mask.dds")).required, false);

    const graph = library.BuildGraphFromParts([
        { selection: { typeID: 12345 }, lod: 2, weight: 0.75 }
    ], { id: "pilot-graph", recipe: "pilot" });

    assert.ok(graph instanceof CjsCharacterGraph);
    assert.ok(graph.parts[0] instanceof CjsCharacterResolvedPart);
    assert.equal(graph.parts[0].lodBundle.resolvedLod, 2);
    assert.equal(graph.recipe.id, "pilot");
    assert.equal(graph.sex, "female");
    assert.deepEqual(graph.materials.map(value => value.id), [ "female/outer/jacket/red" ]);
    assert.deepEqual(graph.projections.map(value => value.id), [ "female/outer/jacket/decal" ]);
    assert.equal(graph.dependencies.length, 6);

    assert.throws(
        () => library.BuildGraphFromParts([ { typeID: 12345 }, { typeID: 12345 } ]),
        /duplicate part/
    );
});

test("keeps configuration-only parts but rejects geometry without a complete LOD bundle", () =>
{
    const library = new CjsCharacterLibrary({
        parts: [
            {
                id: "male/beard/stubble",
                sex: "male",
                category: "beard",
                path: "beard/stubble",
                resourcePaths: [ "res:/character/stubble.black" ]
            },
            {
                id: "female/head/incomplete",
                sex: "female",
                category: "head",
                path: "head/incomplete",
                resourcePaths: [ "res:/character/incomplete.gr2" ]
            }
        ]
    });

    const stubble = library.ResolveGraphPart("male/beard/stubble", { lod: 0 });
    assert.equal(stubble.lodBundle, null);
    assert.deepEqual(stubble.resourcePaths, [ "res:/character/stubble.black" ]);
    assert.equal(stubble.dependencies[0].kind, "configuration");

    assert.throws(
        () => library.ResolveGraphPart("female/head/incomplete", { lod: 0 }),
        /no complete LOD bundle/
    );
});

test("resolves prepared recipes against canonical presets and enforces blocking issues", () =>
{
    const
        partID = "female/hair/example/types/example_blue",
        metadataID = "female/head/head_generic",
        materialID = "female/hair/example/blue";
    const library = new CjsCharacterLibrary({
        partMetadata: [ {
            id: metadataID,
            dependentModifiers: [ "utilityshapes/base" ]
        } ],
        parts: [ {
            id: partID,
            typeID: "9001",
            name: "Example Blue",
            sex: "female",
            category: "hair",
            path: "hair/example",
            colorIds: [ materialID ],
            lodBundles: [ {
                resolvedLod: null,
                configurationPath: "res:/character/example.black",
                geometryPath: "res:/character/example.gr2",
                modelFamily: "example"
            } ]
        } ],
        materials: [ {
            id: materialID,
            slot: "hair/example"
        } ],
        presets: [
            {
                id: "complete",
                name: "Complete",
                sex: "female",
                entries: [
                    { category: "facemodifiers", path: "facemodifiers/smile", weight: 0.75 },
                    { category: "hair", path: "hair/example", weight: 1 },
                    { category: "head", path: "head/head_generic", weight: 1 },
                    { category: "skintone", path: "skintone/default", weight: 1 }
                ]
            },
            {
                id: "diagnostic",
                name: "Diagnostic",
                sex: "female",
                entries: [ { category: "hair", path: "hair/example", weight: 1 } ]
            }
        ],
        recipeLinks: {
            complete: {
                presetID: "complete",
                sex: "female",
                entries: [
                    { entryIndex: 0, kind: "morph", status: "resolved", morphName: "smile" },
                    { entryIndex: 1, kind: "part", status: "resolved", partID },
                    { entryIndex: 2, kind: "rule", status: "resolved", metadataID },
                    { entryIndex: 3, kind: "material", status: "resolved", materialID }
                ]
            },
            diagnostic: {
                presetID: "diagnostic",
                sex: "female",
                entries: [ {
                    entryIndex: 0,
                    kind: "part",
                    status: "ambiguous",
                    candidatePartIDs: [ partID ],
                    issueCode: "missing-type-discriminator"
                } ]
            }
        }
    });

    const canonical = library.ResolveRecipe({ id: "complete", entries: [] }, { lod: 2 });
    assert.equal(canonical.recipe.entries.length, 4,
        "prepared links must always address the stored preset entries");
    assert.equal(canonical.complete, true);
    assert.equal(canonical.parts[0].partID, partID);
    assert.equal(canonical.parts[0].lodBundle.requestedLod, 2);
    assert.equal(canonical.parts[0].lodBundle.fallbackReason, "base");
    assert.equal(canonical.rules[0].metadata.id, metadataID);
    assert.equal(canonical.morphs.get("smile"), 0.75);
    assert.deepEqual(canonical.materialIDs, [ materialID ]);

    const graph = library.BuildGraphFromResolution(canonical);
    assert.equal(graph.complete, true);
    assert.equal(graph.parts[0].recipeEntryIndex, 1);
    assert.deepEqual(graph.materials.map(value => value.id), [ materialID ]);
    assert.deepEqual(graph.dependencies.map(value => value.path), [
        "res:/character/example.black",
        "res:/character/example.gr2"
    ]);

    const diagnostic = library.ResolveRecipe("diagnostic");
    assert.equal(diagnostic.complete, false);
    assert.equal(diagnostic.issues[0].code, "missing-type-discriminator");
    assert.throws(() => library.BuildGraphFromResolution(diagnostic), /1 blocking issue/);

    const tampered = diagnostic.GetValues();
    tampered.complete = true;
    assert.throws(() => library.BuildGraphFromResolution(tampered), /1 blocking issue/,
        "a persisted complete flag must not bypass blocking diagnostics");
    assert.equal(library.BuildGraphFromResolution(tampered, { strict: false }).complete, false);

    const wrongSex = canonical.GetValues();
    wrongSex.parts[0].sex = "male";
    assert.throws(() => library.BuildGraphFromResolution(wrongSex), /1 blocking issue/);
    const wrongSexGraph = library.BuildGraphFromResolution(wrongSex, { strict: false });
    assert.equal(wrongSexGraph.complete, false);
    assert.equal(wrongSexGraph.resolutionIssues[0].code, "part-sex-mismatch");

    assert.throws(() => library.ResolveRecipe(null), /requires a library preset identity/);
});

test("character library rejects incomplete and duplicate catalog identities", () =>
{
    assert.throws(
        () => new CjsCharacterLibrary({ parts: [ { category: "head", path: "head/head_generic" } ] }),
        /parts entry is missing id/
    );
    assert.throws(
        () => new CjsCharacterLibrary({
            parts: [
                { id: "female/head", category: "head", path: "head/a" },
                { id: "female/head", category: "head", path: "head/b" }
            ]
        }),
        /duplicate parts id "female\/head"/
    );
    assert.throws(
        () => new CjsCharacterLibrary({
            parts: [ { id: "female/head", category: "head", path: "head/a", metadataId: "missing" } ]
        }),
        /references unknown metadata "missing"/
    );
    assert.throws(
        () => new CjsCharacterLibrary({
            parts: [ {
                id: "female/head",
                category: "head",
                path: "head/a",
                colorIds: [ "missing" ]
            } ]
        }),
        /references unknown material "missing"/
    );
    assert.throws(
        () => new CjsCharacterLibrary({
            parts: [ {
                id: "female/head",
                category: "head",
                path: "head/a",
                projectionId: "missing"
            } ]
        }),
        /references unknown projection "missing"/
    );
    assert.throws(
        () => new CjsCharacterLibrary({
            presets: [ {
                id: "pilot",
                sex: "female",
                entries: [ { category: "head", path: "head/a" } ]
            } ],
            recipeLinks: {
                pilot: {
                    presetID: "pilot",
                    entries: [
                        { entryIndex: 0, kind: "morph", status: "resolved", morphName: "a" },
                        { entryIndex: 0, kind: "morph", status: "resolved", morphName: "b" }
                    ]
                }
            }
        }),
        /duplicate entryIndex 0/
    );
    assert.throws(
        () => new CjsCharacterLibrary({
            presets: [ {
                id: "pilot",
                sex: "female",
                entries: [ { category: "head", path: "head/a" } ]
            } ],
            recipeLinks: {
                pilot: {
                    presetID: "pilot",
                    sex: "male",
                    entries: [ { entryIndex: 0, kind: "morph", status: "resolved", morphName: "a" } ]
                }
            }
        }),
        /link sex "male" does not match preset sex "female"/
    );
});

test("publishes typed character-library schema metadata", () =>
{
    new CjsCharacterLibraryData();
    assert.equal(CjsSchema.getField(CjsCharacterLibraryData, "partMetadata").type.itemType, "CjsCharacterPartMetadata");
    assert.equal(CjsSchema.getField(CjsCharacterLibraryData, "recipeLinks").type.valueType,
        "CjsCharacterRecipeLinkSet");
    assert.equal(CjsSchema.getField(CjsCharacterLibraryData, "parts").type.itemType, "CjsCharacterPartDefinition");
    assert.equal(CjsSchema.getField(CjsCharacterLibraryData, "sourceRefs").type.valueType, "path");
    assert.equal(CjsSchema.getField(CjsCharacterLibraryData, "sourceTarget").type.kind, "string");
    assert.equal(CjsSchema.getField(CjsCharacterLibraryData, "sculptFields").type.itemType, "CjsCharacterSculptField");
    assert.equal(CjsSchema.getField(CjsCharacterLibraryData, "presentation").type.className, "CjsCharacterPresentation");
    assert.equal(CjsSchema.getField(CjsCharacterLibraryData, "uniqueCharacters").type.itemType, "CjsCharacterUniqueCharacter");
    assert.equal(CjsSchema.getField(CjsCharacterLibraryData, "modifierNames").type.className, "CjsCharacterModifierNames");
    assert.equal(CjsSchema.getField(CjsCharacterLibraryData, "faceSetup").type.className, "CjsCharacterFaceSetup");
    assert.equal(CjsSchema.getField(CjsCharacterPartDefinition, "typeID").type.kind, "string");
    assert.equal(CjsSchema.getField(CjsCharacterPartDefinition, "lodBundles").type.itemType, "CjsCharacterLodBundle");
    assert.equal(CjsSchema.getField(CjsCharacterGraph, "parts").type.itemType, "CjsCharacterResolvedPart");
    assert.equal(CjsSchema.getField(CjsCharacterResolvedPart, "dependencies").type.itemType, "CjsCharacterDependency");
    assert.equal(CjsSchema.getField(CjsCharacterLodBundle, "configurationPath").type.kind, "path");
    assert.equal(CjsSchema.getField(CjsCharacterLodBundle, "resolvedLod").type.kind, "int32");
    assert.equal(CjsSchema.getField(CjsCharacterPresentation, "cameras").type.valueType, "unknown");
    assert.equal(CjsSchema.getField(CjsCharacterBlendshapeLimits, "limits").type.valueType, "vec2");
    assert.equal(CjsSchema.getField(CjsCharacterLibrary, "data").io.read, true);
});
