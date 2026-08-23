import assert from "node:assert/strict";
import test from "node:test";

import ancestriesReader, { CjsFsd64SchemaAncestries } from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaAncestries.js";
import archetypesReader, { CjsFsd64SchemaArchetypes } from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaArchetypes.js";
import bloodlinesReader, { CjsFsd64SchemaBloodlines } from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaBloodlines.js";
import avatarBehaviorsReader, {
    CjsFsd64SchemaCharacterAvatarBehaviors,
} from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaCharacterAvatarBehaviors.js";
import colorLocationsReader, {
    CjsFsd64SchemaCharacterColorLocations,
} from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaCharacterColorLocations.js";
import colorNamesReader, { CjsFsd64SchemaCharacterColorNames } from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaCharacterColorNames.js";
import modifierLocationsReader, {
    CjsFsd64SchemaCharacterModifierLocations,
} from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaCharacterModifierLocations.js";
import portraitResourcesReader, {
    CjsFsd64SchemaCharacterPortraitResources,
} from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaCharacterPortraitResources.js";
import sculptingLocationsReader, {
    CjsFsd64SchemaCharacterSculptingLocations,
} from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaCharacterSculptingLocations.js";
import paperdollsReader, { CjsFsd64SchemaPaperdolls } from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaPaperdolls.js";
import racesReader, { CjsFsd64SchemaRaces } from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaRaces.js";

test("reads ancestry, archetype, and bloodline presence fields", () =>
{
    const ancestry = ancestriesReader.Read(CreateMapFixture(
        CjsFsd64SchemaAncestries.schemaID,
        56,
        (bytes, view, record, root) =>
        {
            SetUint64(view, record, 7);
            SetUint64(view, record + 8, 1200 - root);
            for (let index = 0; index < 9; index++)
            {
                view.setInt32(record + 16 + index * 4, index + 10, true);
            }
            view.setUint32(record + 52, 0x0f, true);
            SetString(bytes, view, 1200, "A short history");
        },
    )).get(7);
    assert.deepEqual(ancestry, {
        bloodlineID: 10,
        charisma: 11,
        descriptionID: 12,
        iconID: 13,
        intelligence: 14,
        memory: 15,
        nameID: 16,
        perception: 17,
        shortDescription: "A short history",
        willpower: 18,
    });

    const archetype = archetypesReader.Read(CreateMapFixture(
        CjsFsd64SchemaArchetypes.schemaID,
        40,
        (bytes, view, record, root) =>
        {
            SetUint64(view, record, 8);
            SetStringList(bytes, view, root, record + 8, 1200, [
                [ 1300, "activity_test" ],
                [ 1340, "feature_test" ],
            ]);
            SetUint64(view, record + 16, 1400 - root);
            view.setInt32(record + 24, 101, true);
            view.setInt32(record + 28, 102, true);
            view.setUint32(record + 32, 0x0f, true);
            SetString(bytes, view, 1400, "Station");
        },
    )).get(8);
    assert.deepEqual(archetype, {
        contentTags: [ "activity_test", "feature_test" ],
        descriptionID: 101,
        location: "Station",
        titleID: 102,
    });

    const bloodline = bloodlinesReader.Read(CreateMapFixture(
        CjsFsd64SchemaBloodlines.schemaID,
        48,
        (_bytes, view, record) =>
        {
            view.setUint32(record, 9, true);
            for (let index = 0; index < 10; index++)
            {
                view.setInt32(record + 4 + index * 4, index + 20, true);
            }
            view.setUint32(record + 44, 0x03, true);
        },
    )).get(9);
    assert.deepEqual(bloodline, {
        charisma: 20,
        corporationID: 21,
        descriptionID: 22,
        iconID: 23,
        intelligence: 24,
        memory: 25,
        nameID: 26,
        perception: 27,
        raceID: 28,
        willpower: 29,
    });
});

test("reads avatar and character customization catalogs", () =>
{
    const avatar = avatarBehaviorsReader.Read(CreateMapFixture(
        CjsFsd64SchemaCharacterAvatarBehaviors.schemaID,
        32,
        (bytes, view, record, root) =>
        {
            SetUint64(view, record, 1);
            SetUint64(view, record + 8, 1200 - root);
            SetStringList(bytes, view, root, record + 16, 1300, [
                [ 1400, "res:/animation/test.gr2" ],
            ]);
            view.setUint8(record + 24, 2);
            SetString(bytes, view, 1200, "idle");
        },
    )).get(1);
    assert.deepEqual(avatar, {
        name: "idle",
        resGender: 2,
        resPathList: [ "res:/animation/test.gr2" ],
    });

    const colorLocation = colorLocationsReader.Read(CreateStringPairFixture(
        CjsFsd64SchemaCharacterColorLocations.schemaID,
        "hair",
        null,
        (view, record) =>
        {
            view.setUint8(record + 16, 1);
            view.setUint8(record + 17, 0);
        },
    )).get(12);
    assert.deepEqual(colorLocation, { colorKey: "hair", hasGloss: 1, hasWeight: 0 });

    const colorName = colorNamesReader.Read(CreateStringPairFixture(
        CjsFsd64SchemaCharacterColorNames.schemaID,
        "black",
        null,
        (view, record) => view.setUint8(record + 16, 1),
    )).get(12);
    assert.deepEqual(colorName, { colorName: "black", hairColor: 1 });

    const modifierLocation = modifierLocationsReader.Read(CreateStringPairFixture(
        CjsFsd64SchemaCharacterModifierLocations.schemaID,
        "head",
        "variation",
    )).get(12);
    assert.deepEqual(modifierLocation, { modifierKey: "head", variationKey: "variation" });

    const sculptingLocation = sculptingLocationsReader.Read(CreateStringPairFixture(
        CjsFsd64SchemaCharacterSculptingLocations.schemaID,
        "utilityShapes",
        "pinchLeft\npinchRight",
    )).get(12);
    assert.deepEqual(sculptingLocation, {
        weightKeyCategory: "utilityShapes",
        weightKeyPrefix: "pinchLeft\npinchRight",
    });
});

test("reads portrait resources and nested race skills", () =>
{
    const portrait = portraitResourcesReader.Read(CreateMapFixture(
        CjsFsd64SchemaCharacterPortraitResources.schemaID,
        32,
        (bytes, view, record, root) =>
        {
            SetUint64(view, record, 15);
            SetUint64(view, record + 8, 1200 - root);
            SetUint64(view, record + 16, 1300 - root);
            view.setInt32(record + 24, 9001, true);
            view.setUint32(record + 28, 1, true);
            SetString(bytes, view, 1200, "res:/portrait/background.dds");
            SetString(bytes, view, 1300, "background");
        },
    )).get(15);
    assert.deepEqual(portrait, {
        resPath: "res:/portrait/background.dds",
        resourceCategory: "background",
        typeID: 9001,
    });

    const raceBytes = CreateMapFixture(
        CjsFsd64SchemaRaces.schemaID,
        48,
        (_bytes, view, record, root) =>
        {
            SetUint64(view, record, 16);
            SetUint64(view, record + 8, 800 - root);
            SetUint64(view, record + 16, 1);
            view.setInt32(record + 24, 201, true);
            view.setInt32(record + 28, 202, true);
            view.setInt32(record + 32, 203, true);
            view.setInt32(record + 36, 204, true);
            view.setUint32(record + 40, 0x0f, true);
            SetUint64(view, 792, 1);
            SetUint64(view, 800, 840 - root);
            SetUint64(view, 832, 1);
            view.setInt32(840, 3300, true);
            view.setInt32(844, 4, true);
        },
    );
    const race = racesReader.Read(raceBytes).get(16);
    assert.deepEqual(race, {
        descriptionID: 201,
        iconID: 202,
        nameID: 203,
        shipTypeID: 204,
        skills: new Map([ [ 3300, 4 ] ]),
    });
    assert.deepEqual(racesReader.ReadJSON(raceBytes), {
        16: {
            descriptionID: "201",
            iconID: "202",
            nameID: "203",
            shipTypeID: "204",
            skills: {
                3300: 4,
            },
        },
    });
});

test("reads paper-doll doubles, timestamps, and nested selections", () =>
{
    const paperdollBytes = CreateMapFixture(
        CjsFsd64SchemaPaperdolls.schemaID,
        352,
        (bytes, view, record, root) =>
        {
            const object = record + 8;
            SetUint64(view, record, 77);
            view.setFloat64(object, 0.25, true);
            view.setFloat64(object + 232, 0.75, true);
            view.setFloat64(object + 248, 0.5, true);
            view.setFloat64(object + 256, 3, true);
            SetUint64(view, object + 104, 800 - root);
            SetUint64(view, 792, 1);
            view.setFloat64(800, 0.4, true);
            view.setFloat64(808, 0.6, true);
            view.setInt32(816, 10, true);
            view.setInt32(820, 11, true);
            view.setInt32(824, 12, true);
            SetUint64(view, object + 240, 900 - root);
            SetUint64(view, 892, 1);
            view.setInt32(900, 20, true);
            view.setInt32(904, 21, true);
            view.setInt32(908, 22, true);
            SetUint64(view, object + 272, 1000 - root);
            SetUint64(view, 992, 1);
            view.setFloat64(1000, -0.5, true);
            view.setFloat64(1008, 0.25, true);
            view.setFloat64(1016, 0.75, true);
            view.setInt32(1024, 30, true);
            SetTimestamp(bytes, view, root, object + 112, 2000, "2026-01-01 01:02:03");
            SetTimestamp(bytes, view, root, object + 216, 2100, "2026-01-02 01:02:03");
            SetTimestamp(bytes, view, root, object + 224, 2200, "2026-01-03 01:02:03");
            view.setInt32(object + 312, 40, true);
            view.setInt32(object + 316, 41, true);
            view.setInt32(object + 320, 42, true);
            view.setInt32(object + 324, 43, true);
            view.setInt32(object + 328, 44, true);
            view.setInt32(object + 332, 1, true);
            SetUint64(view, object + 336, 1);
        },
    );
    const paperdoll = paperdollsReader.Read(paperdollBytes).get(77);

    assert.equal(paperdoll.browLeftCurl, 0.25);
    assert.equal(paperdoll.lightIntensity, 0.75);
    assert.equal(paperdoll.orientChar, 0.5);
    assert.equal(paperdoll.portraitPoseNumber, 3);
    assert.equal(paperdoll.renderStatus, 44);
    assert.equal(paperdoll.neverRender, 1);
    assert.deepEqual(paperdoll.colorSelections, [ {
        gloss: 0.4,
        weight: 0.6,
        colorID: 10,
        colorNameA: 11,
        colorNameBC: 12,
    } ]);
    assert.deepEqual(paperdoll.modifiers, [ {
        modifierLocationID: 20,
        paperdollResourceID: 21,
        paperdollResourceVariation: 22,
    } ]);
    assert.deepEqual(paperdoll.sculptWeights, [ {
        weightForwardBack: -0.5,
        weightLeftRight: 0.25,
        weightUpDown: 0.75,
        sculptLocationID: 30,
    } ]);

    const paperdollJSON = paperdollsReader.ReadJSON(paperdollBytes)["77"];
    assert.equal(paperdollJSON.backgroundID, "40");
    assert.equal(paperdollJSON.lightColorID, "41");
    assert.equal(paperdollJSON.lightID, "42");
    assert.equal(paperdollJSON.paperdollState, 43);
    assert.deepEqual(paperdollJSON.colorSelections[0], {
        gloss: 0.4,
        weight: 0.6,
        colorID: "10",
        colorNameA: "11",
        colorNameBC: "12",
    });
    assert.deepEqual(paperdollJSON.modifiers[0], {
        modifierLocationID: "20",
        paperdollResourceID: "21",
        paperdollResourceVariation: 22,
    });
    assert.equal(paperdollJSON.sculptWeights[0].sculptLocationID, "30");
});

function CreateStringPairFixture(schemaID, first, second, finish = () => {})
{
    return CreateMapFixture(schemaID, 24, (bytes, view, record, root) =>
    {
        SetUint64(view, record, 12);
        SetUint64(view, record + 8, 1200 - root);
        SetString(bytes, view, 1200, first);

        if (second !== null)
        {
            SetUint64(view, record + 16, 1300 - root);
            SetString(bytes, view, 1300, second);
        }

        finish(view, record);
    });
}

function CreateMapFixture(schemaID, recordSize, WriteRecord)
{
    const bytes = CreateContainer(4096, schemaID);
    const view = new DataView(bytes.buffer);
    const root = 32;
    const table = 64;
    const record = 96;

    SetUint64(view, root, table - root);
    SetUint64(view, root + 8, 1);
    SetUint64(view, table - 8, 1);
    SetUint64(view, table, record - root);
    SetUint64(view, record - 8, 1);
    WriteRecord(bytes, view, record, root, recordSize);
    return bytes;
}

function CreateContainer(size, schemaID)
{
    const bytes = new Uint8Array(size);
    const view = new DataView(bytes.buffer);

    for (let index = 0; index < 24; index++)
    {
        bytes[index] = Number.parseInt(schemaID.slice(index * 2, index * 2 + 2), 16);
    }

    SetUint64(view, 24, size - 32);
    return bytes;
}

function SetStringList(bytes, view, root, pointerOffset, tableOffset, entries)
{
    SetUint64(view, pointerOffset, tableOffset - root);
    SetUint64(view, tableOffset - 8, entries.length);

    entries.forEach(([ stringOffset, value ], index) =>
    {
        SetUint64(view, tableOffset + index * 8, stringOffset - root);
        SetString(bytes, view, stringOffset, value);
    });
}

function SetTimestamp(bytes, view, root, pointerOffset, dataOffset, value)
{
    SetUint64(view, pointerOffset, dataOffset - root);
    SetString(bytes, view, dataOffset, value);
}

function SetString(bytes, view, dataOffset, value)
{
    const encoded = new TextEncoder().encode(value);
    SetUint64(view, dataOffset - 8, encoded.byteLength);
    bytes.set(encoded, dataOffset);
}

function SetUint64(view, offset, value)
{
    view.setBigUint64(offset, BigInt(value), true);
}
