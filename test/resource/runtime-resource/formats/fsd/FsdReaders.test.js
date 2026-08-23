import assert from "node:assert/strict";
import test from "node:test";

import audioMetadataReader, { CjsFsd64SchemaAudioMetadata } from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaAudioMetadata.js";
import {
    CHARACTER_STATIC_DATA_PATHS,
    CjsFsd64ReaderSetCharacterStaticData,
} from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64ReaderSetCharacterStaticData.js";
import characterResourcesReader, { CjsFsd64SchemaCharacterResources } from "../../../../../src/resource/formats/fsd/64/readers/CjsFsd64SchemaCharacterResources.js";
import { CjsFsd64Reader } from "../../../../../src/resource/formats/fsd/64/core/CjsFsd64Reader.js";

test("reads a complete synthetic character_resources map", () =>
{
    const bytes = CreateCharacterFixture();
    const result = characterResourcesReader.Read(bytes.buffer);

    assert.equal(result.size, 1);
    assert.deepEqual(result.get(42), {
        resGender: 1,
        resPath: "outer/Test/Types/Test.type",
        typeID: -1,
    });
    assert.deepEqual(characterResourcesReader.ReadJSON(bytes.buffer), {
        42: {
            resGender: 1,
            resPath: "outer/Test/Types/Test.type",
            typeID: "-1",
        },
    });
});

test("reads every audio metadata collection from a synthetic container", () =>
{
    const result = audioMetadataReader.Read(CreateAudioFixture());

    assert.deepEqual(result.Events.get("event_test"), {
        eventID: 123456789,
        eventsStoppedBy: [],
        is2D: 1,
        isLoop: 0,
        isVital: 1,
        maxRadiusAttenuation: 600,
        playbackDuration: {
            playbackDurationMax: 2.5,
            playbackDurationMin: 1.25,
            playbackDurationType: "oneShot",
        },
        soundbanks: [ "Test.bnk" ],
        wwiseID: "{01234567-89AB-CDEF-0123-456789ABCDEF}",
    });
    assert.deepEqual(result.SoundBanks.get("Test.bnk"), {
        EssentialMedia: 0,
        EssentialSoundBank: 1,
        id: "{11111111-2222-3333-4444-555555555555}",
        name: "Test",
        // The container stores parent as a keyed map, so Read() returns one,
        // matching every other map this reader produces. ReadJSON() flattens it.
        parent: new Map([
            [ "id", "{11111111-2222-3333-4444-555555555555}" ],
            [ "name", "Test" ],
        ]),
        path: "\\SoundBanks\\Test\\Test",
        shortId: 987654321,
    });
    assert.deepEqual(result.WemFileIDs.get("1000334009"), {
        IsEssential: 1,
        SoundBank: "Test.bnk",
    });
});

test("reader classes expose exact logical paths and schema identities", () =>
{
    assert.equal(CjsFsd64SchemaAudioMetadata.path, "res:/staticdata/audiometadata.fsdbinary");
    assert.equal(CjsFsd64SchemaCharacterResources.path, "res:/staticdata/character_resources.fsdbinary");
    // 32 characters pin the layout alone, so the reader survives a data change
    // and accepts another publisher's build of the same layout.
    assert.equal(CjsFsd64SchemaAudioMetadata.schemaID.length, 32);
    assert.equal(CjsFsd64SchemaCharacterResources.schemaID.length, 48);
});

test("registers typed character staticdata readers by logical path", () =>
{
    const fsd = new CjsFsd64Reader();
    const readers = CjsFsd64ReaderSetCharacterStaticData.create();

    CjsFsd64ReaderSetCharacterStaticData.registerAll(fsd);

    assert.ok(CHARACTER_STATIC_DATA_PATHS.includes("res:/staticdata/paperdolls.fsdbinary"));
    assert.equal(fsd.Has("res:/staticdata/paperdolls.fsdbinary"), true);
    assert.equal(fsd.Has("res:/staticdata/character_colornames.fsdbinary"), true);
    assert.equal(readers.length, 12);

    for (const reader of readers)
    {
        const schema = reader.constructor.getFsdSchema();
        assert.equal(schema.schema, "carbonenginejs.fsdBinarySchema");
        assert.equal(typeof schema.name, "string");
        assert.notEqual(schema.name, "");
        assert.equal(schema.path, reader.constructor.path);
        assert.equal(schema.schemaID, reader.constructor.schemaID);
        assert.equal(typeof reader.ReadJSON, "function");
    }
});

test("rejects a file with an incompatible schema identity", () =>
{
    const bytes = CreateCharacterFixture();
    bytes[0] ^= 0xff;

    assert.throws(
        () => characterResourcesReader.Read(bytes),
        error => error.code === "CJS_FSD_SCHEMA_UNSUPPORTED",
    );
});

function CreateCharacterFixture()
{
    const bytes = CreateContainer(256, CjsFsd64SchemaCharacterResources.schemaID);
    const view = new DataView(bytes.buffer);
    const root = 32;
    const table = 64;
    const record = 96;
    const pathData = 200;

    SetUint64(view, root, table - root);
    SetUint64(view, root + 8, 1);
    SetUint64(view, table - 8, 1);
    SetUint64(view, table, record - root);
    SetUint64(view, record - 8, 1);
    SetUint64(view, record, 42);
    SetUint64(view, record + 16, pathData - root);
    view.setInt32(record + 40, -1, true);
    view.setUint8(record + 45, 1);
    view.setUint32(record + 48, 0xc0, true);
    SetString(bytes, view, pathData, "outer/Test/Types/Test.type");
    return bytes;
}

/**
 * Builds the three-section audio container with real bucket tables.
 *
 * The root publishes three map headers, each pointing at a bucket table whose
 * entries point at record blocks. Counts live eight bytes before the block they
 * describe, which is the container's convention for tables, buckets and lists
 * alike.
 */
function CreateAudioFixture()
{
    const bytes = CreateContainer(1280, CjsFsd64SchemaAudioMetadata.schemaID);
    const view = new DataView(bytes.buffer);
    const root = 32;
    const relative = offset => offset - root;

    // Root: Events, SoundBanks and WemFileIDs map headers.
    SetUint64(view, root, relative(96));
    SetUint64(view, root + 8, 1);
    SetUint64(view, root + 16, relative(272));
    SetUint64(view, root + 24, 1);
    SetUint64(view, root + 32, relative(480));
    SetUint64(view, root + 40, 1);

    // Strings.
    SetString(bytes, view, 640, "event_test");
    SetString(bytes, view, 680, "oneShot");
    SetString(bytes, view, 720, "Test.bnk");
    SetString(bytes, view, 760, "{01234567-89AB-CDEF-0123-456789ABCDEF}");
    SetString(bytes, view, 840, "{11111111-2222-3333-4444-555555555555}");
    SetString(bytes, view, 920, "Test");
    SetString(bytes, view, 960, "\\SoundBanks\\Test\\Test");
    SetString(bytes, view, 1000, "id");
    SetString(bytes, view, 1040, "name");
    SetString(bytes, view, 1080, "1000334009");

    // Events: one 72-byte record.
    SetUint64(view, 88, 1);
    SetUint64(view, 96, relative(128));
    SetUint64(view, 120, 1);
    SetUint64(view, 128, relative(640));
    SetUint64(view, 136, 123456789);
    SetUint64(view, 144, relative(224));
    SetUint64(view, 216, 0);
    SetUint64(view, 152, relative(680));
    view.setFloat32(160, 1.25, true);
    view.setFloat32(164, 2.5, true);
    SetUint64(view, 168, 7);
    SetUint64(view, 176, relative(240));
    SetUint64(view, 232, 1);
    SetUint64(view, 240, relative(720));
    SetUint64(view, 184, relative(760));
    view.setFloat32(192, 600, true);
    view.setUint8(196, 1);
    view.setUint8(197, 0);
    view.setUint8(198, 1);

    // SoundBanks: one 64-byte record whose parent is a two-entry map.
    SetUint64(view, 264, 1);
    SetUint64(view, 272, relative(304));
    SetUint64(view, 296, 1);
    SetUint64(view, 304, relative(720));
    SetUint64(view, 312, relative(840));
    SetUint64(view, 320, relative(920));
    SetUint64(view, 328, relative(392));
    SetUint64(view, 336, 2);
    SetUint64(view, 344, relative(960));
    SetUint64(view, 352, 987654321);
    view.setUint8(360, 0);
    view.setUint8(361, 1);

    SetUint64(view, 384, 1);
    SetUint64(view, 392, relative(424));
    SetUint64(view, 416, 2);
    SetUint64(view, 424, relative(1000));
    SetUint64(view, 432, relative(840));
    SetUint64(view, 440, relative(1040));
    SetUint64(view, 448, relative(920));

    // WemFileIDs: one 24-byte record.
    SetUint64(view, 472, 1);
    SetUint64(view, 480, relative(512));
    SetUint64(view, 504, 1);
    SetUint64(view, 512, relative(1080));
    SetUint64(view, 520, relative(720));
    SetUint64(view, 528, 1);

    return bytes;
}

function CreateContainer(size, schemaID)
{
    const bytes = new Uint8Array(size);
    const view = new DataView(bytes.buffer);

    for (let index = 0; index < schemaID.length / 2; index++)
    {
        bytes[index] = Number.parseInt(schemaID.slice(index * 2, index * 2 + 2), 16);
    }

    SetUint64(view, 24, size - 32);
    return bytes;
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
