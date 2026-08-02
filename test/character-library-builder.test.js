import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterAncestry,
    CjsCharacterBloodline,
    CjsCharacterLibrary,
    CjsCharacterPaperdoll,
    CjsCharacterRace,
    CjsCharacterResource
} from "../npm/dist/index.js";
import { CjsCharacterLibraryBuilder } from "../npm/dist/library-builder/index.js";

test("builds model-shaped character JSON with separate domain and graph identities", () =>
{
    const documents = CreateDocuments();
    const value = CjsCharacterLibraryBuilder.build(documents, {
        sourceTarget: "tranquility",
        sourceBuild: "synthetic-build"
    });

    assert.equal(value.schema, "carbonenginejs.characterLibrary");
    assert.equal(value.schemaVersion, 4);
    assert.equal(value.sourceTarget, "tranquility");
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
                resPathList: [ "res:/example/idle.black" ],
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
                resPath: "res:/example/background.png",
                resourceCategory: "background"
            }
        },
        characterResources: {
            21: {
                resPath: "res:/example/topinner.type",
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
