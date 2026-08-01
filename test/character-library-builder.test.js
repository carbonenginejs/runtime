import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterDocumentLibrary
} from "../npm/dist/index.js";
import { CjsCharacterLibraryBuilder } from "../npm/dist/library-builder/index.js";

test("builds a transparent character library and links proven relationships", () =>
{
    const documents = EmptyDocuments();

    documents.ancestries = {
        100: {
            bloodlineID: "10",
            label: "Explorer"
        }
    };
    documents.bloodlines = {
        10: {
            raceID: "1",
            label: "First"
        },
        20: {
            raceID: "2",
            label: "Unselected"
        }
    };
    documents.races = {
        1: { label: "One" },
        2: { label: "Two" },
        3: { label: "Unreferenced" }
    };
    documents.characterModifierLocations = {
        5: { modifierKey: "hair" },
        6: { modifierKey: "unreferenced" }
    };
    documents.characterResources = {
        7: { path: "res:/synthetic.type" },
        8: { path: "res:/unused.type" }
    };
    documents.characterColorLocations = {
        9: { colorKey: "primary" }
    };
    documents.characterColorNames = {
        11: { colorName: "dark" },
        12: { colorName: "light" }
    };
    documents.characterSculptingLocations = {
        13: { weightKeyPrefix: "jaw" }
    };
    documents.paperdolls = {
        200: {
            modifiers: [ {
                modifierLocationID: "5",
                paperdollResourceID: "7",
                variation: 0
            }, {
                modifierLocationID: "5",
                paperdollResourceID: "999",
                variation: 1
            } ],
            colorSelections: [ {
                colorID: "9",
                colorNameA: "11",
                colorNameBC: "12"
            }, {
                colorID: "0",
                colorNameA: "0",
                colorNameBC: "0"
            } ],
            sculptWeights: [ {
                sculptLocationID: "13",
                forwardBack: 0.25
            } ]
        }
    };

    const document = CjsCharacterLibraryBuilder.build(documents, {
        sourceTarget: "example",
        sourceBuild: "1"
    });

    assert.equal(CjsCharacterDocumentLibrary.schema, "carbonenginejs.characterLibrary");
    assert.equal(CjsCharacterDocumentLibrary.schemaVersion, 3);
    assert.equal(CjsCharacterDocumentLibrary.isDocument(document), true);
    assert.equal(CjsCharacterDocumentLibrary.validate(document), document);
    assert.equal(document.schema, "carbonenginejs.characterLibrary");
    assert.equal(document.schemaVersion, 3);
    assert.equal(document.sourceTarget, "example");
    assert.deepEqual(document.documents.ancestries[100].bloodlineID, { _ref: "10" });
    assert.equal(document.documents.bloodlines[10]._id, "10");
    assert.equal(Object.hasOwn(document.documents.bloodlines[20], "_id"), false);
    assert.equal(document.documents.races[1]._id, "1");
    assert.equal(document.documents.races[2]._id, "2");
    assert.equal(Object.hasOwn(document.documents.races[3], "_id"), false);
    assert.equal(document.documents.characterModifierLocations[5]._id, "5");
    assert.equal(Object.hasOwn(document.documents.characterModifierLocations[6], "_id"), false);
    assert.deepEqual(
        document.documents.paperdolls[200].modifiers[1].paperdollResourceID,
        { _ref: "999" },
        "dangling authored relationships remain visible"
    );
    assert.deepEqual(document.documents.paperdolls[200].colorSelections[1].colorID, {
        _ref: "0"
    });
    assert.equal(Object.hasOwn(document.documents.paperdolls[200], "_id"), false);
    assert.deepEqual(documents.ancestries[100].bloodlineID, "10", "input is not mutated");
    assert.deepEqual(JSON.parse(JSON.stringify(document)), document);
});

test("accepts named JSON documents from independent adapters", () =>
{
    const input = Object.entries(EmptyDocuments()).map(([ name, data ]) => ({
        name,
        data
    }));
    const ancestry = input.find(value => value.name === "ancestries");
    const bloodlines = input.find(value => value.name === "bloodlines");
    const races = input.find(value => value.name === "races");

    ancestry.data[1] = { bloodlineID: 2, extraSourceField: true };
    bloodlines.data[2] = { raceID: 3, _key: "2" };
    races.data[3] = { _key: "3", name: { en: "Example" } };

    const document = CjsCharacterLibraryBuilder.buildFromInputs({
        documents: input,
        sourceGame: "example",
        sourceProvider: "mixed"
    });

    assert.deepEqual(document.documents.ancestries[1], {
        bloodlineID: { _ref: "2" },
        extraSourceField: true
    });
    assert.deepEqual(document.documents.bloodlines[2], {
        _id: "2",
        raceID: { _ref: "3" },
        _key: "2"
    });
    assert.deepEqual(document.documents.races[3], {
        _id: "3",
        _key: "3",
        name: { en: "Example" }
    });
    assert.equal(CjsCharacterLibraryBuilder.validate(document), document);
    assert.equal(
        CjsCharacterLibraryBuilder.stringify(document),
        JSON.stringify(document, null, 2)
    );
});

test("indexes source documents without hydrating legacy character models", () =>
{
    const documents = EmptyDocuments();

    documents.ancestries[1] = { bloodlineID: "2" };
    documents.bloodlines[2] = { raceID: "3" };
    documents.races[3] = { name: "Example" };

    const built = CjsCharacterLibraryBuilder.build(documents);
    const library = new CjsCharacterDocumentLibrary(built);
    const copy = CjsCharacterDocumentLibrary.copy(built);
    const ancestry = library.Get("ancestries", 1);
    const bloodline = library.ResolveReference("bloodlines", ancestry.bloodlineID);
    const race = library.ResolveReference("races", bloodline.raceID);

    assert.equal(library.ListDocuments().length, 12);
    assert.notEqual(copy, built);
    assert.deepEqual(copy, built);
    assert.equal(library.GetDocument("races"), library.GetDocumentData().documents.races);
    assert.equal(bloodline._id, "2");
    assert.equal(race.name, "Example");
    assert.equal(library.ResolveReference("races", { _ref: "404" }), null);
    assert.throws(
        () => library.ResolveReference("races", 3),
        /must be a \{_ref\} object/u
    );
});

test("rejects incomplete, non-JSON, and malformed document inputs", () =>
{
    assert.throws(
        () => CjsCharacterLibraryBuilder.build({}),
        /missing documents/u
    );

    const cyclic = EmptyDocuments();
    cyclic.races[1] = {};
    cyclic.races[1].cycle = cyclic.races[1];

    assert.throws(
        () => CjsCharacterLibraryBuilder.build(cyclic),
        /contains a cycle/u
    );

    const malformed = EmptyDocuments();
    malformed.paperdolls[1] = { modifiers: {} };

    assert.throws(
        () => CjsCharacterLibraryBuilder.build(malformed),
        /modifiers must be an array/u
    );

    const reserved = EmptyDocuments();
    reserved.races[1] = { _id: "1" };

    assert.throws(
        () => CjsCharacterLibraryBuilder.build(reserved),
        /reserved _id/u
    );
});

function EmptyDocuments()
{
    return {
        ancestries: {},
        archetypes: {},
        bloodlines: {},
        characterAvatarBehaviors: {},
        characterColorLocations: {},
        characterColorNames: {},
        characterModifierLocations: {},
        characterPortraitResources: {},
        characterResources: {},
        characterSculptingLocations: {},
        paperdolls: {},
        races: {}
    };
}
