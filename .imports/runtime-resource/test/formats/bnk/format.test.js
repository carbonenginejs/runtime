import assert from "node:assert/strict";
import test from "node:test";
import CjsBnkFormat, { CjsBnkFormat as NamedCjsBnkFormat } from "../../../src/formats/bnk/index.js";

test("exports default and named CjsBnkFormat", () =>
{
    assert.equal(CjsBnkFormat, NamedCjsBnkFormat);
    assert.deepEqual(CjsBnkFormat.extensions, [ ".bnk" ]);
});

test("inspects bank header, media index, hierarchy, and names", () =>
{
    const bytes = makeBnk();
    const info = CjsBnkFormat.inspect(bytes);

    assert.equal(CjsBnkFormat.isBNK(bytes), true);
    assert.equal(info.bankVersion, 134);
    assert.equal(info.bankId, 559876543);
    assert.equal(info.languageId, 0);
    assert.deepEqual(info.chunks.map((chunk) => chunk.id), [ "BKHD", "DIDX", "DATA", "HIRC", "STID" ]);

    assert.equal(info.mediaCount, 2);
    assert.equal(info.media[0].id, 101);
    assert.equal(info.media[0].available, true);
    assert.equal(info.media[1].id, 202);
    assert.equal(info.media[1].available, true);

    assert.equal(info.hircCount, 2);
    assert.equal(info.hirc[0].type, 2);
    assert.equal(info.hirc[0].typeName, "sound");
    assert.equal(info.hirc[0].id, 0x1111);
    assert.equal(info.hirc[0].size, 4);
    // Body view excludes the leading u32 id; a body too short for its type's
    // layout carries no typed fields.
    assert.equal(info.hirc[0].payload.byteLength, 0);
    assert.equal(info.hirc[0].sourceId, undefined);
    assert.equal(info.hirc[1].typeName, "event");
    assert.equal(info.hirc[1].id, 0x2222);

    assert.deepEqual(info.names, [ { bankId: 559876543, name: "init" } ]);
});

test("decodes typed HIRC fields for events, actions, sounds, and music tracks", () =>
{
    const info = CjsBnkFormat.inspect(makeGraphBnk());
    const byId = new Map(info.hirc.map((entry) => [ entry.id, entry ]));

    assert.deepEqual(byId.get(0x4001).actionIds, [ 0x5001, 0x5002 ]);

    assert.equal(byId.get(0x5001).actionType, 0x0403);
    assert.equal(byId.get(0x5001).targetId, 0x6001);
    assert.equal(byId.get(0x5001).action, null);
    assert.equal(byId.get(0x5002).actionType, 0x0103);
    assert.equal(byId.get(0x5002).targetId, 0x6001);

    assert.equal(byId.get(0x6001).pluginId, 0x00040001);
    assert.equal(byId.get(0x6001).pluginType, 1);
    assert.equal(byId.get(0x6001).streamType, 0);
    assert.equal(byId.get(0x6001).sourceId, 901);
    assert.equal(byId.get(0x6001).inMemoryMediaSize, 64);
    assert.equal(byId.get(0x6001).sourceBits, 0);

    assert.deepEqual(byId.get(0x7001).sources, [
        {
            pluginId: 0x00040001,
            pluginType: 1,
            streamType: 1,
            sourceId: 902,
            inMemoryMediaSize: 16
        }
    ]);
    assert.equal(byId.get(0x8001).typeName, "fx-share-set");
});

test("qualifies shifted HIRC names by bank-version range", () =>
{
    for (const [ version, expected ] of [
        [ 127, "motion-bus" ],
        [ 128, "fx-share-set" ],
        [ 154, "fx-share-set" ],
        [ 155, "motion-bus" ],
    ])
    {
        const bytes = makeGraphBnk();

        writeU32LE(bytes, 8, version);
        const entry = CjsBnkFormat.inspect(bytes).hirc.find(
            item => item.id === 0x8001,
        );

        assert.equal(entry.typeName, expected, `bank version ${version}`);
    }
});

test("attaches exact typed setters to HIRC entries", () =>
{
    const stateBody = concatBytes(
        u16Bytes(0x1204),
        u32Bytes(0x60000002),
        Uint8Array.from([ 0, 1, 0x39 ]),
        i32Bytes(125),
        Uint8Array.from([ 0 ]),
        u32Bytes(0x60000001),
        u32Bytes(0x60000002),
    );
    const switchBody = concatBytes(
        u16Bytes(0x1901),
        u32Bytes(0x50000002),
        Uint8Array.from([ 0, 0, 0 ]),
        u32Bytes(0x50000001),
        u32Bytes(0x50000002),
    );
    const gameParameterBody = concatBytes(
        u16Bytes(0x1303),
        u32Bytes(0x70000001),
        Uint8Array.from([ 0, 0, 0, 4, 0, 1 ]),
        f32Bytes(10),
        f32Bytes(0),
        f32Bytes(0),
        Uint8Array.from([ 0 ]),
    );
    const info = CjsBnkFormat.inspect(makeActionBnk([
        { id: 0x12040001, body: stateBody },
        { id: 0x19010001, body: switchBody },
        { id: 0x13030001, body: gameParameterBody },
    ]));
    const byId = new Map(info.hirc.map(entry => [ entry.id, entry ]));

    assert.deepEqual(byId.get(0x12040001).action, {
        actionType: 0x1204,
        actionName: "set-state",
        actionFamily: 0x12,
        actionMode: "all",
        actionScope: "global",
        targetId: 0x60000002,
        targetIsBus: false,
        targetFlags: 0,
        properties: [ {
            id: 0x39,
            name: "delayTime",
            value: 125,
            rawValue: 125,
        } ],
        ranges: [],
        delayTimeMs: 125,
        groupId: 0x60000001,
        valueId: 0x60000002,
    });
    assert.equal(byId.get(0x19010001).action.actionName, "set-switch");
    assert.equal(byId.get(0x19010001).action.groupId, 0x50000001);
    assert.equal(byId.get(0x19010001).action.valueId, 0x50000002);
    assert.equal(
        byId.get(0x13030001).action.actionName,
        "set-game-parameter",
    );
    assert.equal(byId.get(0x13030001).action.gameParameterValue, 10);
});

test("extracts embedded media as views and flags wem payloads", () =>
{
    const bytes = makeBnk();
    const items = CjsBnkFormat.extractMedia(bytes);

    assert.equal(items.length, 2);
    assert.equal(items[0].id, 101);
    assert.equal(items[0].isWem, true);
    assert.equal(items[0].bytes.byteLength, 12);
    assert.equal(items[1].id, 202);
    assert.equal(items[1].isWem, false);
    assert.equal(items[0].bytes.buffer, bytes.buffer);

    const single = CjsBnkFormat.extractMedia(bytes, 202);
    assert.equal(single.length, 1);
    assert.equal(single[0].id, 202);
});

test("read emits raw, media, and json payloads", () =>
{
    const bytes = makeBnk();
    const raw = CjsBnkFormat.read(bytes);
    const media = CjsBnkFormat.read(bytes, { emit: "media" });
    const metadata = CjsBnkFormat.read(bytes, { emit: "json" });
    const support = CjsBnkFormat.getSupport(bytes);

    assert.equal(raw.payloadType, "raw");
    assert.equal(raw.bytes, bytes);
    assert.equal(media.payloadType, "media");
    assert.equal(media.items.length, 2);
    assert.equal(metadata.sourceFormat, "bnk");
    assert.equal(support.supported, true);
    assert.equal(support.preferredOutput, "media");
    assert.throws(() => CjsBnkFormat.read(bytes, { emit: "pcm" }), /unknown emit value/u);
});

test("marks media entries pointing outside DATA as unavailable", () =>
{
    const bytes = makeBnk({ overflowSecondEntry: true });
    const info = CjsBnkFormat.inspect(bytes);
    const items = CjsBnkFormat.extractMedia(bytes);

    assert.equal(info.media[0].available, true);
    assert.equal(info.media[1].available, false);
    assert.equal(items.length, 1);
});

test("banks without media report no extractable variant", () =>
{
    const bytes = makeBnk({ headerOnly: true });
    const info = CjsBnkFormat.inspect(bytes);
    const support = CjsBnkFormat.getSupport(bytes);

    assert.equal(info.mediaCount, 0);
    assert.equal(support.preferredOutput, "raw");
    assert.equal(support.outputs.find((variant) => variant.output === "media").supported, false);
});

test("rejects non-bnk bytes without throwing from probes", () =>
{
    const junk = new Uint8Array([ 1, 2, 3, 4, 5, 6, 7, 8 ]);
    const support = CjsBnkFormat.getSupport(junk);

    assert.equal(CjsBnkFormat.isBNK(junk), false);
    assert.equal(support.supported, false);
    assert.throws(() => CjsBnkFormat.inspect(junk), /expected a Wwise soundbank/u);
});

test("flags truncated trailing chunks instead of throwing", () =>
{
    const bytes = makeBnk().slice(0, 40);
    const info = CjsBnkFormat.inspect(bytes);
    assert.equal(info.chunks.some((chunk) => chunk.truncated), true);
});

test("detects and parses SoundbanksInfo documents", () =>
{
    const document = makeSoundbanksInfo();
    const text = JSON.stringify(document);
    const bytes = new TextEncoder().encode(text);
    const parsed = CjsBnkFormat.wwise.parseSoundbanksInfo(bytes);

    assert.equal(CjsBnkFormat.wwise.isSoundbanksInfo(document), true);
    assert.equal(CjsBnkFormat.wwise.isSoundbanksInfo(text), true);
    assert.equal(CjsBnkFormat.wwise.isSoundbanksInfo(bytes), true);
    assert.equal(CjsBnkFormat.wwise.isSoundbanksInfo("{}"), false);
    assert.equal(CjsBnkFormat.wwise.isSoundbanksInfo(new Uint8Array([ 1, 2 ])), false);

    assert.equal(parsed.platform, "Windows");
    assert.equal(parsed.soundBankVersion, "150");
    assert.equal(parsed.bankCount, 2);
    assert.equal(parsed.mediaCount, 3);
    assert.equal(parsed.streamingMediaCount, 1);
    assert.equal(parsed.eventCount, 2);
    assert.deepEqual(parsed.languages, [ "English(US)", "SFX" ]);
    assert.equal(parsed.banks[0].switchGroups[0].switches[1].name, "large");
});

test("parses legacy IncludedEvents and IncludedMemoryFiles documents", () =>
{
    const parsed = CjsBnkFormat.wwise.parseSoundbanksInfo({
        SoundBanksInfo: {
            SchemaVersion: "12",
            SoundBankVersion: "140",
            SoundBanks: [
                {
                    Id: "2395677314",
                    Language: "SFX",
                    ShortName: "Common",
                    Path: "Common.bnk",
                    IncludedEvents: [
                        {
                            Id: "1483003980",
                            Name: "Play_TestLoop",
                            MaxAttenuation: "100.",
                        },
                    ],
                    IncludedMemoryFiles: [
                        {
                            Id: "839160035",
                            Language: "SFX",
                            ShortName: "loop.wav",
                            Path: "SFX\\loop.wem",
                        },
                    ],
                },
            ],
        },
    });

    assert.equal(parsed.eventCount, 1);
    assert.equal(parsed.mediaCount, 1);
    assert.deepEqual(parsed.banks[0].events[0], {
        id: "1483003980",
        name: "Play_TestLoop",
        maxAttenuation: 100,
    });
    assert.deepEqual(parsed.banks[0].media[0], {
        id: "839160035",
        shortName: "loop.wav",
        cachePath: "",
        path: "SFX\\loop.wem",
        language: "SFX",
        streaming: false,
        location: "Memory",
    });
});

test("builds catalogs and joins them with bank inspections", () =>
{
    const catalog = CjsBnkFormat.wwise.buildSoundbanksCatalog(makeSoundbanksInfo());

    assert.equal(catalog.banksById["559876543"].shortName, "Effects");
    assert.equal(catalog.mediaById["101"].length, 2);
    assert.equal(catalog.mediaById["101"][0].bankName, "Effects");
    assert.equal(catalog.eventsByName["turret_fire_play"].id, "8738");

    const joined = CjsBnkFormat.wwise.joinSoundbanksInfo(CjsBnkFormat.inspect(makeBnk()), catalog);

    assert.equal(joined.bank.shortName, "Effects");
    assert.equal(joined.media.length, 2);
    assert.equal(joined.media[0].shortName, "weapons\\turret_small.wav");
    assert.equal(joined.media[1].shortName, null);
    assert.equal(joined.namedMediaCount, 1);
    assert.equal(joined.events.length, 1);
    assert.equal(joined.events[0].name, "turret_fire_play");
    assert.equal(joined.namedEventCount, 1);
});

test("rejects non-SoundbanksInfo input with a clear error", () =>
{
    assert.throws(() => CjsBnkFormat.wwise.parseSoundbanksInfo("not json"), /not valid JSON/u);
    assert.throws(() => CjsBnkFormat.wwise.parseSoundbanksInfo({ SoundBanksInfo: {} }), /SoundBanksInfo\.SoundBanks/u);
});

test("computes Wwise ids as FNV-1 hashes of lowercased names", () =>
{
    assert.equal(CjsBnkFormat.wwise.wwiseIdFromName("SFX"), 393239870);
    assert.equal(CjsBnkFormat.wwise.wwiseIdFromName("English(US)"), 684519430);
    assert.equal(CjsBnkFormat.wwise.wwiseIdFromName("Voice"), 3170124113);
    assert.equal(CjsBnkFormat.wwise.wwiseIdFromName("Common"), 2395677314);
});

test("join selects the language variant matching the BKHD languageId", () =>
{
    const document = makeSoundbanksInfo();
    document.SoundBanksInfo.SoundBanks.push({
        ...document.SoundBanksInfo.SoundBanks[1],
        Language: "German",
        Media: [
            {
                Id: "101",
                Language: "German",
                Streaming: "false",
                Location: "Memory",
                ShortName: "voc_aura_1_de.wav",
                CachePath: "Voices/German/voc_aura_1_DEDEDEDE.wem"
            }
        ]
    });
    const catalog = CjsBnkFormat.wwise.buildSoundbanksCatalog(document);
    const bankInfo = {
        bankId: 777,
        languageId: CjsBnkFormat.wwise.wwiseIdFromName("German"),
        media: [ { id: 101, length: 1, available: true } ],
        hirc: []
    };
    const joined = CjsBnkFormat.wwise.joinSoundbanksInfo(bankInfo, catalog);

    assert.equal(catalog.bankVariantsById["777"].length, 2);
    assert.equal(joined.bank.language, "German");
    assert.equal(joined.media[0].shortName, "voc_aura_1_de.wav");
});

function makeBnk({ overflowSecondEntry = false, headerOnly = false } = {})
{
    const wem = makeMiniWem();
    const blob = [ 9, 9, 9, 9 ];
    const dataBytes = wem.length + blob.length;
    const chunks = [];

    const bkhd = new Uint8Array(8 + 20);
    writeAscii(bkhd, 0, "BKHD");
    writeU32LE(bkhd, 4, 20);
    writeU32LE(bkhd, 8, 134);
    writeU32LE(bkhd, 12, 559876543);
    writeU32LE(bkhd, 16, 0);
    chunks.push(bkhd);

    if (!headerOnly)
    {
        const didx = new Uint8Array(8 + 24);
        writeAscii(didx, 0, "DIDX");
        writeU32LE(didx, 4, 24);
        writeU32LE(didx, 8, 101);
        writeU32LE(didx, 12, 0);
        writeU32LE(didx, 16, wem.length);
        writeU32LE(didx, 20, 202);
        writeU32LE(didx, 24, wem.length);
        writeU32LE(didx, 28, overflowSecondEntry ? blob.length + 100 : blob.length);
        chunks.push(didx);

        const data = new Uint8Array(8 + dataBytes);
        writeAscii(data, 0, "DATA");
        writeU32LE(data, 4, dataBytes);
        data.set(wem, 8);
        data.set(blob, 8 + wem.length);
        chunks.push(data);

        const hirc = new Uint8Array(8 + 4 + 18);
        writeAscii(hirc, 0, "HIRC");
        writeU32LE(hirc, 4, 22);
        writeU32LE(hirc, 8, 2);
        hirc[12] = 2;
        writeU32LE(hirc, 13, 4);
        writeU32LE(hirc, 17, 0x1111);
        hirc[21] = 4;
        writeU32LE(hirc, 22, 4);
        writeU32LE(hirc, 26, 0x2222);
        chunks.push(hirc);

        const name = "init";
        const stid = new Uint8Array(8 + 8 + 4 + 1 + name.length);
        writeAscii(stid, 0, "STID");
        writeU32LE(stid, 4, stid.length - 8);
        writeU32LE(stid, 8, 1);
        writeU32LE(stid, 12, 1);
        writeU32LE(stid, 16, 559876543);
        stid[20] = name.length;
        writeAscii(stid, 21, name);
        chunks.push(stid);
    }

    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks)
    {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    return bytes;
}

// Bank whose HIRC exercises the typed field decode (layouts per bank
// generator version 150): one event -> play + stop actions -> sound, plus a
// streamed music track.
function makeGraphBnk()
{
    const objects = [];
    const pushObject = (type, id, body) =>
    {
        const bytes = new Uint8Array(5 + 4 + body.length);
        bytes[0] = type;
        writeU32LE(bytes, 1, 4 + body.length);
        writeU32LE(bytes, 5, id);
        bytes.set(body, 9);
        objects.push(bytes);
    };

    const event = new Uint8Array(9);
    event[0] = 2;
    writeU32LE(event, 1, 0x5001);
    writeU32LE(event, 5, 0x5002);
    pushObject(4, 0x4001, event);

    const play = new Uint8Array(8);
    play[0] = 0x03; play[1] = 0x04;
    writeU32LE(play, 2, 0x6001);
    pushObject(3, 0x5001, play);

    const stop = new Uint8Array(8);
    stop[0] = 0x03; stop[1] = 0x01;
    writeU32LE(stop, 2, 0x6001);
    pushObject(3, 0x5002, stop);

    const sound = new Uint8Array(14);
    writeU32LE(sound, 0, 0x00040001);
    sound[4] = 0;
    writeU32LE(sound, 5, 901);
    writeU32LE(sound, 9, 64);
    pushObject(2, 0x6001, sound);

    const track = new Uint8Array(19);
    track[0] = 0;
    writeU32LE(track, 1, 1);
    writeU32LE(track, 5, 0x00040001);
    track[9] = 1;
    writeU32LE(track, 10, 902);
    writeU32LE(track, 14, 16);
    pushObject(11, 0x7001, track);
    pushObject(16, 0x8001, new Uint8Array());

    const hircBody = objects.reduce((sum, entry) => sum + entry.length, 4);
    const bytes = new Uint8Array(8 + 20 + 8 + hircBody);
    writeAscii(bytes, 0, "BKHD");
    writeU32LE(bytes, 4, 20);
    writeU32LE(bytes, 8, 150);
    writeU32LE(bytes, 12, 123456);
    writeAscii(bytes, 28, "HIRC");
    writeU32LE(bytes, 32, hircBody);
    writeU32LE(bytes, 36, objects.length);
    let offset = 40;
    for (const entry of objects)
    {
        bytes.set(entry, offset);
        offset += entry.length;
    }
    return bytes;
}

function makeActionBnk(actions)
{
    const objects = actions.map(({ id, body }) =>
    {
        const bytes = new Uint8Array(9 + body.byteLength);

        bytes[0] = 3;
        writeU32LE(bytes, 1, 4 + body.byteLength);
        writeU32LE(bytes, 5, id);
        bytes.set(body, 9);
        return bytes;
    });
    const hircBodyLength = objects.reduce(
        (total, object) => total + object.byteLength,
        4,
    );
    const bytes = new Uint8Array(8 + 20 + 8 + hircBodyLength);

    writeAscii(bytes, 0, "BKHD");
    writeU32LE(bytes, 4, 20);
    writeU32LE(bytes, 8, 150);
    writeU32LE(bytes, 12, 123456);
    writeAscii(bytes, 28, "HIRC");
    writeU32LE(bytes, 32, hircBodyLength);
    writeU32LE(bytes, 36, objects.length);

    let offset = 40;

    for (const object of objects)
    {
        bytes.set(object, offset);
        offset += object.byteLength;
    }
    return bytes;
}

function u16Bytes(value)
{
    const bytes = new Uint8Array(2);

    new DataView(bytes.buffer).setUint16(0, value, true);
    return bytes;
}

function u32Bytes(value)
{
    const bytes = new Uint8Array(4);

    new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
    return bytes;
}

function i32Bytes(value)
{
    const bytes = new Uint8Array(4);

    new DataView(bytes.buffer).setInt32(0, value, true);
    return bytes;
}

function f32Bytes(value)
{
    const bytes = new Uint8Array(4);

    new DataView(bytes.buffer).setFloat32(0, value, true);
    return bytes;
}

function concatBytes(...parts)
{
    const bytes = new Uint8Array(parts.reduce(
        (total, part) => total + part.byteLength,
        0,
    ));
    let offset = 0;

    for (const part of parts)
    {
        bytes.set(part, offset);
        offset += part.byteLength;
    }
    return bytes;
}

function makeSoundbanksInfo()
{
    return {
        SoundBanksInfo: {
            Platform: "Windows",
            BasePlatform: "Windows",
            SchemaVersion: "16",
            SoundBankVersion: "150",
            SoundBanks: [
                {
                    Id: "559876543",
                    Type: "User",
                    Language: "SFX",
                    ShortName: "Effects",
                    Path: "Effects.bnk",
                    Media: [
                        {
                            Id: "101",
                            Language: "SFX",
                            Streaming: "false",
                            Location: "Memory",
                            ShortName: "weapons\\turret_small.wav",
                            CachePath: "SFX/turret_small_ABCD1234.wem"
                        },
                        {
                            Id: "303",
                            Language: "SFX",
                            Streaming: "true",
                            Location: "Loose",
                            ShortName: "music\\ambient_loop.wav",
                            CachePath: "SFX/ambient_loop_00FF00FF.wem"
                        }
                    ],
                    Events: [
                        { Id: "8738", Name: "turret_fire_play" },
                        { Id: "9999", Name: "turret_fire_stop" }
                    ],
                    SwitchGroups: [
                        {
                            Id: "42",
                            Name: "ship_size",
                            Switches: [
                                { Id: "1", Name: "small" },
                                { Id: "2", Name: "large" }
                            ]
                        }
                    ]
                },
                {
                    Id: "777",
                    Type: "User",
                    Language: "English(US)",
                    ShortName: "Voice",
                    Path: "English(US)/Voice.bnk",
                    Media: [
                        {
                            Id: "101",
                            Language: "English(US)",
                            Streaming: "false",
                            Location: "Memory",
                            ShortName: "voc_aura_1.wav",
                            CachePath: "Voices/English(US)/voc_aura_1_EBD37622.wem"
                        }
                    ]
                }
            ]
        }
    };
}

function makeMiniWem()
{
    const bytes = new Uint8Array(12);
    writeAscii(bytes, 0, "RIFF");
    writeU32LE(bytes, 4, 4);
    writeAscii(bytes, 8, "WAVE");
    return bytes;
}

function writeAscii(bytes, offset, text)
{
    for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i);
}

function writeU32LE(bytes, offset, value)
{
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
    bytes[offset + 2] = (value >>> 16) & 0xff;
    bytes[offset + 3] = (value >>> 24) & 0xff;
}
