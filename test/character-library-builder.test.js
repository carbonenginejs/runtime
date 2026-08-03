import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterAncestry,
    CjsCharacterBloodline,
    CjsCharacterMaterialProfile,
    CjsCharacterLibrary,
    CjsCharacterLibraryDocuments,
    CjsCharacterLibraryManager,
    CjsCharacterPartMetadata,
    CjsCharacterPartSource,
    CjsCharacterPartType,
    CjsCharacterPaperdoll,
    CjsCharacterProjectionProfile,
    CjsCharacterRace,
    CjsCharacterRecipeProfile,
    CjsCharacterResource
} from "../npm/dist/index.js";
import { CjsCharacterLibraryBuilder } from "../npm/dist/library-builder/index.js";

test("builds model-shaped character JSON with separate domain and graph identities", () =>
{
    const documents = CreateDocuments();
    const value = CjsCharacterLibraryBuilder.build(documents, {
        sourceTarget: "example-target",
        sourceBuild: "synthetic-build"
    });

    assert.equal(value.schema, "carbonenginejs.characterLibrary");
    assert.equal(value.schemaVersion, 6);
    assert.equal(value.sourceTarget, "example-target");
    assert.ok(Array.isArray(value.documents.ancestries));
    assert.equal(value.documents.ancestries[0].recordID, "1");
    assert.equal(value.documents.characterResources[0].typeID, "9001");
    assert.deepEqual(value.documents.ancestries[0].bloodlineID, {
        _ref: value.documents.bloodlines[0]._id
    });
    assert.deepEqual(value.documents.bloodlines[0].raceID, {
        _ref: value.documents.races[0]._id
    });
    assert.equal(value.documents.races[0].recordID, "3");
    assert.equal(value.documents.races[1]._id, undefined);
    assert.equal(value.documents.characterResources[0].clothingRemovesCategory, null);
    assert.equal(
        value.documents.paperdolls[0].modifiers[1].paperdollResourceID,
        "404",
        "a dangling domain identity remains visible instead of becoming an invalid _ref"
    );

});

test("from and SetValues hydrate the same character-library model shape", () =>
{
    const value = CjsCharacterLibraryBuilder.build(CreateDocuments(), {
        sourceProvider: "synthetic"
    });
    const from = CjsCharacterLibrary.from(value);
    const assigned = new CjsCharacterLibrary();

    assigned.SetValues(value);

    for (const library of [ from, assigned ])
    {
        const ancestry = library.Get("ancestries", 1);
        const bloodline = library.Get("bloodlines", 2);
        const race = library.Get("races", 3);
        const resource = library.Get("characterResources", 21);
        const paperdoll = library.Get("paperdolls", 30);

        assert.ok(ancestry instanceof CjsCharacterAncestry);
        assert.ok(bloodline instanceof CjsCharacterBloodline);
        assert.ok(race instanceof CjsCharacterRace);
        assert.ok(resource instanceof CjsCharacterResource);
        assert.ok(paperdoll instanceof CjsCharacterPaperdoll);
        assert.strictEqual(ancestry.bloodlineID, bloodline);
        assert.strictEqual(bloodline.raceID, race);
        assert.strictEqual(paperdoll.modifiers[0].paperdollResourceID, resource);
        assert.equal(paperdoll.modifiers[1].paperdollResourceID, "404");
        assert.equal(resource.typeID, "9001");
        assert.equal(library.sourceProvider, "synthetic");
        assert.equal(library.GetDocument("races"), library.documents.races);
        assert.equal(library.Has("races", 3), true);
        assert.equal(library.Get("races", 404), null);
    }

    assert.deepEqual(assigned.GetValues(), from.GetValues());
    assert.equal(typeof CjsCharacterLibrary.schema.getSchema, "function");
});

test("lists document names without exporting the complete library graph", () =>
{
    const library = CjsCharacterLibrary.from(
        CjsCharacterLibraryBuilder.build(CreateDocuments())
    );

    Object.defineProperty(library.documents, "GetValues", {
        configurable: true,
        value: () =>
        {
            throw new Error("ListDocuments must not export document values");
        }
    });

    const expected = [
        "ancestries",
        "archetypes",
        "bloodlines",
        "characterAvatarBehaviors",
        "characterColorLocations",
        "characterColorNames",
        "characterModifierLocations",
        "characterPortraitResources",
        "characterResources",
        "characterSculptingLocations",
        "paperdolls",
        "races",
        "characterPartTypes",
        "characterPartSources",
        "characterPartMetadata",
        "characterMaterialProfiles",
        "characterProjectionProfiles",
        "characterRecipeProfiles"
    ];
    const documentSchema = CjsCharacterLibraryDocuments.schema
        .getSchema(CjsCharacterLibraryDocuments);
    const schemaFields = documentSchema.fields.map(field => field.name);

    assert.deepEqual(library.ListDocuments(), expected);
    assert.deepEqual(schemaFields, expected);
    assert.deepEqual(Object.keys(library.documents), expected);
    assert.deepEqual(
        Object.keys(CjsCharacterLibraryBuilder.build(CreateDocuments()).documents),
        expected
    );

    for (const field of documentSchema.fields)
    {
        assert.equal(field.type.kind, "list");
        assert.equal(
            CjsCharacterLibraryDocuments.getDocumentType(field.name),
            field.type.itemType
        );
    }
});

test("folds source-backed profiles and exact external resource candidates into one catalog", () =>
{
    const documents = CreateDocuments();
    const typePath = "res:/example/topinner/definition";
    const sourceID = "male/topinner/example";
    const metadataPath = "res:/example/topinner/metadata";

    documents.characterPartTypes = {
        [typePath]: {
            sourcePath: typePath,
            sex: "male",
            partPath: "topinner/example",
            resourceVersion: "v2",
            colorVariant: "blue",
            partSource: sourceID
        }
    };
    documents.characterPartSources = {
        [sourceID]: {
            sourcePath: "res:/example/topinner",
            sex: "male",
            partPath: "topinner/example",
            metadata: metadataPath,
            versions: [ {
                resourceVersion: "v2",
                metadata: metadataPath,
                configurationCandidates: [ "res:/example/topinner/configuration.asset" ],
                geometryCandidates: [ "res:/example/topinner/geometry.asset" ],
                textureCandidates: [ "res:/example/topinner/texture.asset" ]
            } ]
        }
    };
    documents.characterPartMetadata = {
        [metadataPath]: {
            sourcePath: metadataPath,
            forcesLooseTop: true,
            dependentModifiers: [ "dependants/tuck/basic" ],
            occludesModifiers: [ "topouter" ]
        }
    };
    documents.characterMaterialProfiles = {
        "res:/example/topinner/materials/blue": {
            sourcePath: "res:/example/topinner/materials/blue",
            colors: [ { value: [ 0.1, 0.2, 0.3, 1 ] } ],
            pattern: "stripe",
            patternColors: [ { value: [ 0.4, 0.5, 0.6, 1 ] } ],
            patternTransform: [ 0, 0, 1, 1 ],
            patternRotation: 0.25,
            specularColors: [ { value: [ 0.7, 0.8, 0.9, 1 ] } ]
        }
    };
    documents.characterProjectionProfiles = {
        "res:/example/topinner/projections/logo": {
            sourcePath: "res:/example/topinner/projections/logo",
            label: "logo",
            mode: 2,
            aspectRatio: 1,
            bodyEnabled: true,
            texturePath: "res:/example/topinner/logo.asset",
            offset: [ 0.25, 0.5 ],
            position: [ 1, 2, 3 ],
            scale: 1
        }
    };
    documents.characterRecipeProfiles = {
        "res:/example/recipes/example": {
            sourcePath: "res:/example/recipes/example",
            sex: "male",
            entries: [ {
                category: "topinner",
                path: "topinner/example",
                weight: 1,
                colorVariation: "blue",
                colors: [ { value: [ 0.1, 0.2, 0.3, 1 ] } ],
                patternTransform: [ 0, 0, 1, 1 ]
            } ]
        }
    };

    const values = CjsCharacterLibraryBuilder.build(documents);
    const resourceValue = values.documents.characterResources[0];
    const typeValue = values.documents.characterPartTypes[0];
    const sourceValue = values.documents.characterPartSources[0];

    assert.equal(resourceValue.resPath, typePath, "the authored resource path remains visible");
    assert.deepEqual(resourceValue.partType, { _ref: typeValue._id });
    assert.deepEqual(typeValue.partSource, { _ref: sourceValue._id });
    assert.deepEqual(sourceValue.metadata, {
        _ref: values.documents.characterPartMetadata[0]._id
    });
    assert.deepEqual(sourceValue.versions[0].metadata, {
        _ref: values.documents.characterPartMetadata[0]._id
    });

    const library = CjsCharacterLibrary.from(values);
    const resource = library.Get("characterResources", 21);
    const partType = library.Get("characterPartTypes", typePath);
    const source = library.Get("characterPartSources", sourceID);
    const metadata = library.Get("characterPartMetadata", metadataPath);
    const material = library.Get(
        "characterMaterialProfiles",
        "res:/example/topinner/materials/blue"
    );
    const projection = library.Get(
        "characterProjectionProfiles",
        "res:/example/topinner/projections/logo"
    );
    const recipe = library.Get(
        "characterRecipeProfiles",
        "res:/example/recipes/example"
    );

    assert.ok(partType instanceof CjsCharacterPartType);
    assert.ok(source instanceof CjsCharacterPartSource);
    assert.ok(source.metadata instanceof CjsCharacterPartMetadata);
    assert.ok(material instanceof CjsCharacterMaterialProfile);
    assert.ok(projection instanceof CjsCharacterProjectionProfile);
    assert.ok(recipe instanceof CjsCharacterRecipeProfile);
    assert.strictEqual(resource.partType, partType);
    assert.strictEqual(partType.partSource, source);
    assert.strictEqual(source.metadata, metadata);
    assert.strictEqual(source.versions[0].metadata, metadata);
    assert.equal(metadata.forcesLooseTop, true);
    assert.deepEqual(metadata.dependentModifiers, [ "dependants/tuck/basic" ]);
    assert.ok(Array.from(material.colors[0].value).every(
        (value, index) => Math.abs(value - [ 0.1, 0.2, 0.3, 1 ][index]) < 1e-6
    ));
    assert.equal(material.pattern, "stripe");
    assert.equal(projection.bodyEnabled, true);
    assert.deepEqual(Array.from(projection.offset), [ 0.25, 0.5 ]);
    assert.equal(recipe.entries[0].category, "topinner");
    assert.equal(recipe.entries[0].colorVariation, "blue");
    assert.ok(Array.from(recipe.entries[0].colors[0].value).every(
        (value, index) => Math.abs(value - [ 0.1, 0.2, 0.3, 1 ][index]) < 1e-6
    ));
    assert.deepEqual(source.versions[0].configurationCandidates, [
        "res:/example/topinner/configuration.asset"
    ]);
    assert.deepEqual(source.versions[0].geometryCandidates, [
        "res:/example/topinner/geometry.asset"
    ]);
    assert.deepEqual(source.versions[0].textureCandidates, [
        "res:/example/topinner/texture.asset"
    ]);
});

test("adds already-hydrated editor records without cloning or rehydrating them", () =>
{
    const library = CjsCharacterLibrary.from(
        CjsCharacterLibraryBuilder.build(CreateDocuments())
    );
    const resource = new CjsCharacterResource();

    resource.SetValues({
        recordID: "22",
        resPath: "res:/example/topouter/definition",
        typeID: "9002",
        resGender: 1
    });

    assert.strictEqual(library.Add("characterResources", resource), resource);
    assert.strictEqual(library.Get("characterResources", 22), resource);
    assert.throws(
        () => library.Add("characterResources", resource),
        /already contains record/u
    );
    assert.throws(
        () => library.Add("races", resource),
        /requires CjsCharacterRace/u
    );

    const invalidRace = new CjsCharacterRace();
    invalidRace.recordID = 23;
    const raceCount = library.documents.races.length;

    assert.throws(
        () => library.Add("races", invalidRace),
        /recordID must be a non-empty string/u
    );
    assert.equal(library.documents.races.length, raceCount);

    const values = library.GetValues({ refs: true });
    const roundTrip = CjsCharacterLibrary.from(JSON.parse(JSON.stringify(values)));

    assert.ok(roundTrip.Get("characterResources", 22) instanceof CjsCharacterResource);
    assert.equal(roundTrip.Get("characterResources", 22).resPath, resource.resPath);
});

test("rebuilds private record indexes after direct editor mutation", () =>
{
    const library = CjsCharacterLibrary.from(
        CjsCharacterLibraryBuilder.build(CreateDocuments())
    );
    const replacement = new CjsCharacterRace();

    assert.ok(library.Get("races", 3));
    replacement.SetValues({ recordID: "5", nameID: "1005" });
    replacement.recordID = 5;
    library.documents.races[0] = replacement;

    assert.throws(
        () => library.Reindex("races"),
        /recordID must be a non-empty string/u
    );

    replacement.recordID = "5";
    library.Reindex("races");

    assert.equal(library.Get("races", 3), null);
    assert.strictEqual(library.Get("races", 5), replacement);
});

test("installs or loads one combined character library without rebuilding its items", async () =>
{
    const value = CjsCharacterLibraryBuilder.build(CreateDocuments());
    const hydrated = CjsCharacterLibrary.from(value);
    const direct = new CjsCharacterLibraryManager(hydrated);

    assert.strictEqual(direct.GetLibrary(), hydrated);
    assert.strictEqual(direct.Get("characterResources", 21), hydrated.Get("characterResources", 21));

    let loads = 0;
    const manager = new CjsCharacterLibraryManager(null, {
        resourceLoader: async path =>
        {
            loads += 1;
            assert.equal(path, "res:/character/character-library.json");
            return value;
        }
    });
    const first = manager.LoadLibraryAsync(" RES:\\CHARACTER\\CHARACTER-LIBRARY.JSON ");
    const second = manager.LoadLibraryAsync("res:/character/character-library.json");

    assert.equal(await first, true);
    assert.equal(await second, true);
    assert.equal(loads, 1);
    assert.ok(manager.Get("characterResources", 21) instanceof CjsCharacterResource);
    assert.equal(await manager.LoadLibraryAsync("res:/character/character-library.json"), true);
    assert.equal(loads, 2, "completed loads are not retained as a runtime cache");
});

test("combined character library installation is atomic", () =>
{
    const installed = CjsCharacterLibrary.from(
        CjsCharacterLibraryBuilder.build(CreateDocuments())
    );
    const invalid = CjsCharacterLibrary.from(
        CjsCharacterLibraryBuilder.build(CreateDocuments())
    );
    const manager = new CjsCharacterLibraryManager(installed);

    invalid.documents.races[1].recordID = invalid.documents.races[0].recordID;

    assert.throws(
        () => manager.InstallLibrary(invalid),
        /contains duplicate record/u
    );
    assert.strictEqual(manager.GetLibrary(), installed);

    assert.throws(
        () => manager.InstallLibrary({ schema: "wrong", schemaVersion: 6 }),
        /schema version 6/u
    );
    assert.strictEqual(manager.GetLibrary(), installed);

    const retired = CjsCharacterLibraryBuilder.build(CreateDocuments());

    retired.schemaVersion = 5;
    assert.throws(
        () => manager.InstallLibrary(retired),
        /schema version 6/u
    );
    assert.strictEqual(manager.GetLibrary(), installed);

    assert.throws(
        () => manager.InstallLibrary({
            schema: "carbonenginejs.characterLibrary",
            schemaVersion: 6
        }),
        /documents must be a plain object/u
    );
    assert.strictEqual(manager.GetLibrary(), installed);
});

test("combined character library loading preserves synchronous and missing-loader behavior", async () =>
{
    const value = CjsCharacterLibraryBuilder.build(CreateDocuments());
    const manager = new CjsCharacterLibraryManager();

    assert.equal(manager.LoadLibrary("res:/character/library.json"), false);
    assert.equal(await manager.LoadLibraryAsync("res:/character/library.json"), false);

    manager.SetResourceLoader(() => value);
    assert.throws(
        () => manager.LoadLibrary(42),
        /path must be a non-empty string/u
    );
    assert.equal(manager.LoadLibrary("res:/character/library.json"), true);
    assert.ok(manager.Get("races", 3) instanceof CjsCharacterRace);

    manager.SetResourceLoader(async () => value);
    await assert.rejects(
        manager.LoadLibraryAsync(42),
        /path must be a non-empty string/u
    );
    assert.throws(
        () => manager.LoadLibrary("res:/character/library.json"),
        /requires a synchronous loader/u
    );
});

test("the newest combined-library request wins asynchronous loader races", async () =>
{
    const original = CjsCharacterLibraryBuilder.build(CreateDocuments(), {
        sourceBuild: "original"
    });
    const replacement = CjsCharacterLibraryBuilder.build(CreateDocuments(), {
        sourceBuild: "replacement"
    });
    let resolveLoad;
    const manager = new CjsCharacterLibraryManager(null, {
        resourceLoader: () => new Promise(resolve =>
        {
            resolveLoad = resolve;
        })
    });
    const pending = manager.LoadLibraryAsync("res:/character/old.json");

    await Promise.resolve();
    manager.InstallLibrary(replacement);
    resolveLoad(original);

    assert.equal(await pending, false);
    assert.equal(manager.GetLibrary().sourceBuild, "replacement");
});

test("failed asynchronous library loads can be retried", async () =>
{
    const value = CjsCharacterLibraryBuilder.build(CreateDocuments());
    let attempts = 0;
    const manager = new CjsCharacterLibraryManager(value, {
        resourceLoader: async () =>
        {
            attempts += 1;

            if (attempts === 1)
            {
                throw new Error("synthetic load failure");
            }

            return value;
        }
    });
    const installed = manager.GetLibrary();

    await assert.rejects(
        manager.LoadLibraryAsync("res:/character/retry.json"),
        /synthetic load failure/u
    );
    assert.strictEqual(manager.GetLibrary(), installed);
    assert.equal(await manager.LoadLibraryAsync("res:/character/retry.json"), true);
    assert.equal(attempts, 2);
});

test("a newer asynchronous request suppresses an older pending result", async () =>
{
    const baseline = CjsCharacterLibraryBuilder.build(CreateDocuments(), {
        sourceBuild: "baseline"
    });
    const older = CjsCharacterLibraryBuilder.build(CreateDocuments(), {
        sourceBuild: "older"
    });
    const resolvers = new Map();
    const manager = new CjsCharacterLibraryManager(baseline, {
        resourceLoader: path => new Promise(resolve => resolvers.set(path, resolve))
    });
    const olderRequest = manager.LoadLibraryAsync("res:/character/older.json");
    const newerRequest = manager.LoadLibraryAsync("res:/character/newer.json");

    await Promise.resolve();
    resolvers.get("res:/character/newer.json")(null);
    assert.equal(await newerRequest, false);
    resolvers.get("res:/character/older.json")(older);
    assert.equal(await olderRequest, false);
    assert.equal(manager.GetLibrary().sourceBuild, "baseline");
});

test("asynchronous library loads retain the loader selected when they start", async () =>
{
    const original = CjsCharacterLibraryBuilder.build(CreateDocuments(), {
        sourceBuild: "original-loader"
    });
    let originalLoads = 0;
    let replacementLoads = 0;
    const manager = new CjsCharacterLibraryManager(null, {
        resourceLoader: async () =>
        {
            originalLoads += 1;
            return original;
        }
    });
    const pending = manager.LoadLibraryAsync("res:/character/captured-loader.json");

    manager.SetResourceLoader(async () =>
    {
        replacementLoads += 1;
        return null;
    });

    assert.equal(await pending, true);
    assert.equal(manager.GetLibrary().sourceBuild, "original-loader");
    assert.equal(originalLoads, 1);
    assert.equal(replacementLoads, 0);
});

test("CjsModel graph export round-trips a hydrated library", () =>
{
    const library = CjsCharacterLibrary.from(
        CjsCharacterLibraryBuilder.build(CreateDocuments())
    );
    const values = JSON.parse(JSON.stringify(library.GetValues({ refs: true })));
    const roundTrip = CjsCharacterLibrary.from(values);
    const clone = library.Clone({ refs: true });

    assert.equal(values.documents.characterResources[0].typeID, "9001");
    assert.ok(JSON.stringify(values).includes("_id"));
    assert.ok(JSON.stringify(values).includes("_ref"));
    assert.strictEqual(
        roundTrip.Get("ancestries", 1).bloodlineID,
        roundTrip.Get("bloodlines", 2)
    );
    assert.strictEqual(
        roundTrip.Get("paperdolls", 30).modifiers[0].paperdollResourceID,
        roundTrip.Get("characterResources", 21)
    );
    assert.notStrictEqual(clone, library);
    assert.strictEqual(
        clone.Get("bloodlines", 2).raceID,
        clone.Get("races", 3)
    );
});

test("accepts independently named document inputs", () =>
{
    const documents = CreateDocuments();
    const descriptors = Object.entries(documents).map(([ name, data ]) => ({ name, data }));
    const value = CjsCharacterLibraryBuilder.buildFromInputs({
        documents: descriptors,
        sourceGame: "synthetic-game"
    });

    assert.equal(value.sourceGame, "synthetic-game");
    assert.equal(value.documents.races[0].recordID, "3");
});

test("rejects malformed source-document inputs at the builder boundary", () =>
{
    assert.throws(
        () => CjsCharacterLibraryBuilder.build({}),
        /missing documents/u
    );

    const extra = CreateDocuments();
    extra.unmodelledFacts = {};
    assert.throws(
        () => CjsCharacterLibraryBuilder.build(extra),
        /unsupported documents/u
    );

    const reserved = CreateDocuments();
    reserved.races[3]._id = 99;
    assert.throws(
        () => CjsCharacterLibraryBuilder.build(reserved),
        /reserved model metadata _id/u
    );

    const collision = CreateDocuments();
    collision.races[3].recordID = "source-owned";
    assert.throws(
        () => CjsCharacterLibraryBuilder.build(collision),
        /already defines reserved recordID/u
    );

    const cyclic = CreateDocuments();
    cyclic.races[3].cycle = cyclic.races[3];
    assert.throws(
        () => CjsCharacterLibraryBuilder.build(cyclic),
        /contains a cycle/u
    );

    const blankIdentity = CreateDocuments();
    blankIdentity.races[" "] = { nameID: "blank" };
    assert.throws(
        () => CjsCharacterLibraryBuilder.build(blankIdentity),
        /recordID must be a non-empty string/u
    );

    const unknown = CreateDocuments();
    unknown.races[3].futureField = true;
    assert.throws(
        () => CjsCharacterLibraryBuilder.build(unknown),
        /unsupported field "futureField"/u
    );

    const invalidNestedModel = CreateDocuments();
    invalidNestedModel.characterMaterialProfiles = {
        material: {
            sourcePath: "res:/example/material",
            colors: [ [ 0.1, 0.2, 0.3, 1 ] ]
        }
    };
    assert.throws(
        () => CjsCharacterLibraryBuilder.build(invalidNestedModel),
        /colors\[0\] must be a plain object/u
    );
});

function CreateDocuments()
{
    return {
        ancestries: {
            1: {
                bloodlineID: "2",
                nameID: "1001"
            }
        },
        archetypes: {
            1: {
                contentTags: [ "career" ],
                location: "station"
            }
        },
        bloodlines: {
            2: {
                raceID: "3",
                nameID: "1002"
            }
        },
        characterAvatarBehaviors: {
            1: {
                name: "idle",
                resPathList: [ "res:/example/idle.asset" ],
                resGender: 1
            }
        },
        characterColorLocations: {
            10: {
                colorKey: "primary",
                hasGloss: 1,
                hasWeight: 1
            }
        },
        characterColorNames: {
            11: {
                colorName: "dark",
                hairColor: 0
            }
        },
        characterModifierLocations: {
            20: {
                modifierKey: "topinner",
                variationKey: "default"
            }
        },
        characterPortraitResources: {
            40: {
                resPath: "res:/example/background.asset",
                resourceCategory: "background"
            }
        },
        characterResources: {
            21: {
                resPath: "res:/example/topinner/definition",
                clothingAlsoCoversCategory: "20",
                clothingRemovesCategory: "0",
                typeID: "9001",
                resGender: 1
            }
        },
        characterSculptingLocations: {
            30: {
                weightKeyCategory: "face",
                weightKeyPrefix: "jaw"
            }
        },
        paperdolls: {
            30: {
                modifiers: [ {
                    modifierLocationID: "20",
                    paperdollResourceID: "21",
                    paperdollResourceVariation: 2
                }, {
                    modifierLocationID: "20",
                    paperdollResourceID: "404",
                    paperdollResourceVariation: 0
                } ],
                colorSelections: [ {
                    gloss: 0.25,
                    weight: 0.75,
                    colorID: "10",
                    colorNameA: "11",
                    colorNameBC: "0"
                } ],
                sculptWeights: [ {
                    weightForwardBack: 0.1,
                    weightLeftRight: 0.2,
                    weightUpDown: 0.3,
                    sculptLocationID: "30"
                } ],
                backgroundID: "40",
                headTilt: 0.5
            }
        },
        races: {
            3: {
                nameID: "1003",
                skills: { 3300: 4 }
            },
            4: {
                nameID: "1004"
            }
        }
    };
}
