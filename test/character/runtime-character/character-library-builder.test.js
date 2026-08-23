import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterAncestry,
    CjsCharacterBloodline,
    CjsCharacterDefinition,
    CjsCharacterMaterialProfile,
    CjsCharacterLibrary,
    CjsCharacterLibraryDocuments,
    CjsCharacterLibraryManager,
    CjsCharacterModifierLocation,
    CjsCharacterModifierReference,
    CjsCharacterPartMetadata,
    CjsCharacterPartSource,
    CjsCharacterPartType,
    CjsCharacterPaperdoll,
    CjsCharacterProjectionProfile,
    CjsCharacterRace,
    CjsCharacterRecipeProfile,
    CjsCharacterResource,
    CjsCharacterTextureMetadata
} from "../../../npm/dist/character/index.js";
import { CjsCharacterLibraryBuilder } from "../../../npm/dist/character/library-builder/index.js";
import {
    CjsFsd64ReaderSetCharacterStaticData,
} from "../../../npm/dist/resource/formats/fsd/64/readers/index.js";

test("resource builder fetches every required cFSD document into a hydrated library", async () =>
{
    const readers = CjsFsd64ReaderSetCharacterStaticData.create();
    const byPath = new Map(readers.map(reader => [
        reader.constructor.path,
        reader.constructor,
    ]));
    const requested = [];
    const library = await CjsCharacterLibraryBuilder.buildFromResources({
        sourceTarget: "example-target",
        sourceBuild: "synthetic-build",
        async fetch(path)
        {
            assert.equal(this, globalThis);
            requested.push(path);
            const Reader = byPath.get(path);

            assert.ok(Reader, `unexpected character resource ${path}`);
            return {
                ok: true,
                async arrayBuffer()
                {
                    return CreateEmptyMapContainer(Reader.schemaID).buffer;
                }
            };
        }
    });

    assert.ok(library instanceof CjsCharacterLibrary);
    assert.equal(requested.length, 12);
    assert.deepEqual(new Set(requested), new Set(byPath.keys()));
    assert.equal(library.sourceTarget, "example-target");
    assert.equal(library.sourceBuild, "synthetic-build");

    for (const name of CjsCharacterLibraryDocuments.listDocumentNames())
    {
        assert.deepEqual(library.documents[name], []);
    }

    assert.deepEqual(
        CjsCharacterLibrary.from(library.GetValues()).GetValues(),
        library.GetValues()
    );
});

test("resource builder accepts one injected source object", async () =>
{
    const readers = CjsFsd64ReaderSetCharacterStaticData.create();
    const byPath = new Map(readers.map(reader => [
        reader.constructor.path,
        reader.constructor,
    ]));
    const requested = [];
    const source = {
        read(path, context)
        {
            assert.equal(this, source);
            requested.push(context.document);
            return CreateEmptyMapContainer(byPath.get(path).schemaID);
        },
    };
    const library = await CjsCharacterLibraryBuilder.buildFromResources({ source });

    assert.ok(library instanceof CjsCharacterLibrary);
    assert.deepEqual(
        new Set(requested),
        new Set(CjsCharacterLibraryDocuments.listDocumentNames()
            .filter(name => CjsCharacterLibraryDocuments.isRequiredDocument(name))),
    );
});

test("resource builder reports explicitly identified legacy 32-bit FSD", async () =>
{
    await assert.rejects(CjsCharacterLibraryBuilder.buildFromResources({
        fsdOptions: { bitWidth: 32 },
        source()
        {
            return new Uint8Array(1);
        },
    }), error => error?.code === "CJS_FSD_32_UNSUPPORTED");
});

function CreateEmptyMapContainer(schemaID)
{
    const size = 48;
    const bytes = new Uint8Array(size);
    const view = new DataView(bytes.buffer);

    for (let index = 0; index < schemaID.length / 2; index++)
    {
        bytes[index] = Number.parseInt(
            schemaID.slice(index * 2, index * 2 + 2),
            16
        );
    }

    view.setUint32(24, size - 32, true);
    return bytes;
}

test("builds model-shaped character JSON with separate domain and graph identities", () =>
{
    const documents = CreateDocuments();
    const value = CjsCharacterLibraryBuilder.build(documents, {
        sourceTarget: "example-target",
        sourceBuild: "synthetic-build"
    });

    assert.equal(value.schema, "carbonenginejs.characterLibrary");
    assert.equal(value.schemaVersion, 10);
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

test("migrates complete schema-v8 values to the canonical schema-v10 shape", () =>
{
    const legacy = CjsCharacterLibraryBuilder.build(CreateDocuments());
    legacy.schemaVersion = 8;
    delete legacy.documents.characterTextureMetadata;

    const from = CjsCharacterLibrary.from(legacy);
    const assigned = new CjsCharacterLibrary();
    assigned.SetValues(legacy);

    assert.equal(from.schemaVersion, 10);
    assert.equal(assigned.schemaVersion, 10);
    assert.deepEqual(from.documents.characterTextureMetadata, []);
    assert.deepEqual(assigned.GetValues({ refs: true }), from.GetValues({ refs: true }));
    assert.equal(legacy.schemaVersion, 8, "migration does not mutate caller values");
    assert.equal(Object.hasOwn(legacy.documents, "characterTextureMetadata"), false);
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
        "characterDefinitions",
        "characterPartTypes",
        "characterPartSources",
        "characterPartMetadata",
        "characterMaterialProfiles",
        "characterProjectionProfiles",
        "characterRecipeProfiles",
        "characterTextureMetadata"
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
            sourcePaths: [ typePath ],
            sex: "male",
            partPath: "topinner/example",
            resourceVersion: "v2",
            colorVariant: "blue",
            bloodlineIDs: [ "1", "2" ],
            partSource: sourceID,
            partSources: [ sourceID ]
        }
    };
    documents.characterDefinitions = {
        [typePath]: {
            sourcePath: typePath,
            extension: ".type",
            values: [ "topinner/example", "v2", "blue", [ 1, 2 ] ]
        },
        "res:/example/topinner/materials/blue.color": {
            sourcePath: "res:/example/topinner/materials/blue.color",
            extension: ".color",
            values: {
                colors: [ [ 0.1, 0.2, 0.3, 1 ] ],
                authoredExtra: { retained: true }
            }
        }
    };
    documents.characterPartSources = {
        [sourceID]: {
            sourcePath: "res:/example/topinner",
            sourcePaths: [ "res:/example/topinner" ],
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
            occludesModifiers: [ "topinner" ],
            dependencies: [ {
                authoredValue: "dependants/tuck/basic",
                modifierPath: "dependants/tuck/basic",
                partSource: sourceID,
                weight: 0.35
            } ],
            occlusions: [ {
                authoredValue: "topinner",
                modifierPath: "topinner",
                modifierLocation: "20"
            } ]
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
    assert.deepEqual(typeValue.partSources, [ { _ref: sourceValue._id } ]);
    assert.deepEqual(sourceValue.metadata, {
        _ref: values.documents.characterPartMetadata[0]._id
    });
    assert.deepEqual(sourceValue.versions[0].metadata, {
        _ref: values.documents.characterPartMetadata[0]._id
    });
    assert.deepEqual(
        values.documents.characterPartMetadata[0].dependencies[0].partSource,
        { _ref: sourceValue._id }
    );
    assert.equal(
        values.documents.characterPartMetadata[0].dependencies[0].weight,
        0.35
    );
    assert.deepEqual(
        values.documents.characterPartMetadata[0].occlusions[0].modifierLocation,
        { _ref: values.documents.characterModifierLocations[0]._id }
    );

    const library = CjsCharacterLibrary.from(values);
    const resource = library.Get("characterResources", 21);
    const definition = library.Get("characterDefinitions", typePath);
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

    assert.equal(metadata.dependencies[0].weight, 0.35);

    assert.ok(partType instanceof CjsCharacterPartType);
    assert.ok(definition instanceof CjsCharacterDefinition);
    assert.ok(source instanceof CjsCharacterPartSource);
    assert.ok(source.metadata instanceof CjsCharacterPartMetadata);
    assert.ok(material instanceof CjsCharacterMaterialProfile);
    assert.ok(projection instanceof CjsCharacterProjectionProfile);
    assert.ok(recipe instanceof CjsCharacterRecipeProfile);
    assert.strictEqual(resource.partType, partType);
    assert.deepEqual(definition.values, [ "topinner/example", "v2", "blue", [ 1, 2 ] ]);
    assert.equal(
        library.Get(
            "characterDefinitions",
            "res:/example/topinner/materials/blue.color"
        ).values.authoredExtra.retained,
        true
    );
    assert.strictEqual(partType.partSource, source);
    assert.strictEqual(partType.partSources[0], source);
    assert.deepEqual(partType.sourcePaths, [ typePath ]);
    assert.deepEqual(partType.bloodlineIDs, [ "1", "2" ]);
    assert.deepEqual(source.sourcePaths, [ "res:/example/topinner" ]);
    assert.strictEqual(source.metadata, metadata);
    assert.strictEqual(source.versions[0].metadata, metadata);
    assert.equal(metadata.forcesLooseTop, true);
    assert.deepEqual(metadata.dependentModifiers, [ "dependants/tuck/basic" ]);
    assert.ok(metadata.dependencies[0] instanceof CjsCharacterModifierReference);
    assert.strictEqual(metadata.dependencies[0].partSource, source);
    assert.strictEqual(
        metadata.occlusions[0].modifierLocation,
        library.Get("characterModifierLocations", 20)
    );
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

test("hydrates direct lists of sex-specific part-source relationships", () =>
{
    const documents = CreateDocuments();
    const typePath = "res:/example/shared/definition";

    documents.characterResources[21].resPath = typePath;
    documents.characterPartTypes = {
        [typePath]: {
            sourcePath: "res:/example/female/shared/definition",
            sourcePaths: [
                "res:/example/female/shared/definition",
                "res:/example/male/shared/definition"
            ],
            sex: "",
            partPath: "hair/shared",
            resourceVersion: null,
            colorVariant: null,
            bloodlineIDs: [],
            partSource: null,
            partSources: [ "female/hair/shared", "male/hair/shared" ]
        }
    };
    documents.characterPartSources = Object.fromEntries([ "female", "male" ].map(sex => [
        `${sex}/hair/shared`,
        {
            sourcePath: `res:/example/${sex}/shared`,
            sourcePaths: [ `res:/example/${sex}/shared` ],
            sex,
            partPath: "hair/shared",
            versions: [ {
                resourceVersion: null,
                configurationCandidates: [],
                geometryCandidates: [],
                textureCandidates: []
            } ],
            metadata: null
        }
    ]));

    const values = CjsCharacterLibraryBuilder.build(documents);
    const typeValue = values.documents.characterPartTypes[0];

    assert.deepEqual(typeValue.partSources, values.documents.characterPartSources.map(
        source => ({ _ref: source._id })
    ));

    const library = CjsCharacterLibrary.from(values);
    const partType = library.Get("characterPartTypes", typePath);

    assert.equal(partType.partSources.length, 2);
    assert.equal(partType.partSources[0].sex, "female");
    assert.equal(partType.partSources[1].sex, "male");
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

test("creates, removes, deletes, and clears records through observable library methods", () =>
{
    const library = CjsCharacterLibrary.from(
        CjsCharacterLibraryBuilder.build(CreateDocuments())
    );
    const events = [];
    let deleted = null;

    for (const eventName of [ "recordadded", "recordremoved", "recorddeleted", "documentcleared" ])
    {
        library.OnEvent(eventName, (_owner, payload) => events.push([ eventName, payload ]));
    }

    const created = library.Create("characterResources", {
        recordID: "22",
        resPath: "res:/example/topouter/created",
        typeID: "9002",
        resGender: 1
    });

    assert.ok(created instanceof CjsCharacterResource);
    assert.strictEqual(library.Get("characterResources", 22), created);
    assert.equal(library.documents.__state.flags.has("index:characterResources"), false);
    assert.equal(events[0][0], "recordadded");
    assert.equal(events[0][1].documentName, "characterResources");
    assert.strictEqual(events[0][1].record, created);

    assert.equal(library.Remove("characterResources", created), true);
    assert.equal(library.Get("characterResources", 22), null);
    assert.equal(events[1][0], "recordremoved");

    const existing = library.Get("characterResources", 21);
    assert.equal(library.Delete("characterResources", existing, {
        delete(record)
        {
            deleted = record;
        }
    }), true);
    assert.strictEqual(deleted, existing);
    assert.equal(library.Get("characterResources", 21), null);
    assert.deepEqual(events.slice(2, 4).map(([ name ]) => name), [
        "recordremoved",
        "recorddeleted"
    ]);

    const count = library.GetDocument("races").length;
    assert.equal(library.Clear("races"), true);
    assert.deepEqual(library.GetDocument("races"), []);
    assert.equal(library.Get("races", 3), null);
    assert.equal(events.at(-1)[0], "documentcleared");
    assert.equal(events.at(-1)[1].count, count);

    const quiet = library.Create("characterResources", {
        recordID: "23",
        resPath: "res:/example/topouter/quiet",
        typeID: "9003",
        resGender: 1
    }, {
        notify: false,
        skipEvents: true
    });

    assert.strictEqual(library.Get("characterResources", 23), quiet);
    assert.equal(events.at(-1)[0], "documentcleared");
});

test("inspects extension-neutral resource data through one resident resource-manager path", async () =>
{
    const library = CjsCharacterLibrary.from(
        CjsCharacterLibraryBuilder.build(CreateDocuments())
    );
    const events = [];
    const requests = [];
    const resMan = {
        async GetObject(path, options)
        {
            requests.push([ path, options ]);
            return {
                metadata: {
                    sourceFormat: "png",
                    width: 1024,
                    height: 2048,
                    offset: { x: 250000, y: -125000, unit: 0 },
                    physicalPixelDimensions: { x: 500000, y: 1000000, unit: 0 }
                }
            };
        }
    };

    library.SetResourceManager(resMan);
    library.OnEvent("recordadded", (_owner, payload) => events.push(payload));
    const [ first, second ] = await Promise.all([
        library.InspectResourceForData("RES:/Character/Pants.DDS"),
        library.InspectResourceForData("res:/character/pants.png")
    ]);

    assert.strictEqual(first, second);
    assert.ok(first instanceof CjsCharacterTextureMetadata);
    assert.equal(first.recordID, "res:/character/pants");
    assert.equal(first.sourcePath, "res:/character/pants.png");
    assert.equal(first.offsetXRaw, 250000);
    assert.equal(first.offsetYRaw, -125000);
    assert.equal(first.offsetUnit, 0);
    assert.equal(first.physicalPixelDimensionsXRaw, 500000);
    assert.equal(first.physicalPixelDimensionsYRaw, 1000000);
    assert.equal(first.physicalPixelDimensionsUnit, 0);
    assert.equal(first.offsetX, 0.25);
    assert.equal(first.offsetY, -0.125);
    assert.equal(first.extentX, 0.5);
    assert.equal(first.extentY, 1);
    assert.equal(first.hasPlacementMetadata, true);
    assert.equal(first.placementEncoding, "png-oFFs-pHYs-millionths");
    assert.equal(first.placementPolicy, "ccp-character-atlas-millionths-v1");
    assert.equal(first.placementStatus, "experimental-policy");
    assert.deepEqual(requests, [ [
        "res:/character/pants.png",
        { emit: "raw", cacheSource: true }
    ] ]);
    assert.equal(events.length, 1);
    assert.equal(events[0].documentName, "characterTextureMetadata");
    assert.strictEqual(events[0].record, first);

    assert.strictEqual(
        await library.InspectResourceForData("res:/character/pants"),
        first
    );
    assert.equal(requests.length, 1);
});

test("retains non-character PNG ancillary units without promoting placement policy", () =>
{
    const values = CjsCharacterTextureMetadata.fromPngInspection(
        "res:/character/example",
        "res:/character/example.png",
        {
            sourceFormat: "png",
            width: 64,
            height: 32,
            offset: { x: -8, y: 12, unit: 1 },
            physicalPixelDimensions: { x: 3780, y: 3780, unit: 1 }
        }
    );

    assert.equal(values.offsetXRaw, -8);
    assert.equal(values.offsetYRaw, 12);
    assert.equal(values.offsetUnit, 1);
    assert.equal(values.physicalPixelDimensionsXRaw, 3780);
    assert.equal(values.physicalPixelDimensionsUnit, 1);
    assert.equal(values.hasOffsetMetadata, true);
    assert.equal(values.hasPhysicalPixelDimensionsMetadata, true);
    assert.equal(values.hasPlacementMetadata, false);
    assert.equal(values.offsetX, 0);
    assert.equal(values.extentX, 1);
    assert.equal(values.placementPolicy, null);
    assert.equal(values.placementStatus, null);
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

test("asynchronous library loading preserves the configured resource manager", async () =>
{
    const value = CjsCharacterLibraryBuilder.build(CreateDocuments());
    const requests = [];
    const manager = new CjsCharacterLibraryManager(null, {
        resourceLoader: async () => value,
        resourceManager: {
            async GetObject(path, options)
            {
                requests.push([ path, options ]);
                return {
                    metadata: {
                        sourceFormat: "png",
                        width: 128,
                        height: 64,
                        offset: null,
                        physicalPixelDimensions: null
                    }
                };
            }
        }
    });

    assert.equal(await manager.LoadLibraryAsync("res:/character/library.json"), true);
    const metadata = await manager.InspectResourceForData("res:/character/pants.dds");

    assert.ok(metadata instanceof CjsCharacterTextureMetadata);
    assert.deepEqual(requests, [ [
        "res:/character/pants.png",
        { emit: "raw", cacheSource: true }
    ] ]);
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
        () => manager.InstallLibrary({ schema: "wrong", schemaVersion: 7 }),
        /schema version 7, 8, 9, or 10/u
    );
    assert.strictEqual(manager.GetLibrary(), installed);

    const retired = CjsCharacterLibraryBuilder.build(CreateDocuments());

    retired.schemaVersion = 5;
    assert.throws(
        () => manager.InstallLibrary(retired),
        /schema version 7, 8, 9, or 10/u
    );
    assert.strictEqual(manager.GetLibrary(), installed);

    assert.throws(
        () => manager.InstallLibrary({
            schema: "carbonenginejs.characterLibrary",
            schemaVersion: 7
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

test("preserves graph hydration metadata without confusing it with domain identity", () =>
{
    const documents = CreateDocuments();

    documents.races[3]._id = 1;
    documents.characterDefinitions = {
        "res:/character/a.yaml": {
            sourcePath: "res:/character/a.yaml",
            extension: ".yaml",
            values: {
                _type: "CjsCharacterModifierLocation",
                _id: "definition-location",
                modifierKey: "topmiddle",
                variationKey: ""
            }
        },
        "res:/character/b.yaml": {
            sourcePath: "res:/character/b.yaml",
            extension: ".yaml",
            values: { _ref: "definition-location" }
        }
    };

    const values = CjsCharacterLibraryBuilder.build(documents);
    const hydrated = CjsCharacterLibrary.from(values);
    const first = hydrated.Get("characterDefinitions", "res:/character/a.yaml");
    const second = hydrated.Get("characterDefinitions", "res:/character/b.yaml");

    assert.equal(values.documents.races.find(value => value.recordID === "3")._id, 1);
    assert.notEqual(values.documents.bloodlines[0]._id, 1);
    assert.equal(first.recordID, "res:/character/a.yaml");
    assert.ok(first.values instanceof CjsCharacterModifierLocation);
    assert.equal(first.values.modifierKey, "topmiddle");
    assert.strictEqual(second.values, first.values);
});

test("never lets generated relationship ids satisfy an unresolved supplied graph reference", () =>
{
    const documents = CreateDocuments();

    documents.races[3]._id = 1;
    documents.characterDefinitions = {
        "res:/character/unresolved.yaml": {
            sourcePath: "res:/character/unresolved.yaml",
            extension: ".yaml",
            values: { _ref: 2 }
        }
    };

    assert.throws(
        () => CjsCharacterLibraryBuilder.build(documents),
        /Unresolved character graph _ref ids: 2/u
    );
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
