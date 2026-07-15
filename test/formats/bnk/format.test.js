import assert from "node:assert/strict";
import test from "node:test";
import CjsBnkFormat, { CjsBnkFormat as NamedCjsBnkFormat } from "../../../src/formats/bnk/index.js";

test("exports default and named CjsBnkFormat", () =>
{
    assert.equal(CjsBnkFormat, NamedCjsBnkFormat);
    assert.deepEqual(CjsBnkFormat.inputTypes, [ "bnk" ]);
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
    assert.deepEqual(info.hirc[0], {
        type: 2,
        typeName: "sound",
        id: 0x1111,
        offset: info.hirc[0].offset,
        size: 4
    });
    assert.equal(info.hirc[1].typeName, "event");
    assert.equal(info.hirc[1].id, 0x2222);

    assert.deepEqual(info.names, [ { bankId: 559876543, name: "init" } ]);
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
    const support = CjsBnkFormat.isSupported(bytes);

    assert.equal(raw.payloadType, "raw");
    assert.equal(raw.bytes, bytes);
    assert.equal(raw.containerOnly, true);
    assert.equal(media.payloadType, "media");
    assert.equal(media.items.length, 2);
    assert.equal(metadata.sourceFormat, "bnk");
    assert.equal(support.supported, "partial");
    assert.equal(support.preferred, "media");
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
    const support = CjsBnkFormat.isSupported(bytes);

    assert.equal(info.mediaCount, 0);
    assert.equal(support.preferred, "raw");
    assert.equal(support.variants.find((variant) => variant.kind === "media").supported, false);
});

test("rejects non-bnk bytes without throwing from probes", () =>
{
    const junk = new Uint8Array([ 1, 2, 3, 4, 5, 6, 7, 8 ]);
    const support = CjsBnkFormat.isSupported(junk);

    assert.equal(CjsBnkFormat.isBNK(junk), false);
    assert.equal(support.supported, "none");
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
    const parsed = CjsBnkFormat.parseSoundbanksInfo(bytes);

    assert.equal(CjsBnkFormat.isSoundbanksInfo(document), true);
    assert.equal(CjsBnkFormat.isSoundbanksInfo(text), true);
    assert.equal(CjsBnkFormat.isSoundbanksInfo(bytes), true);
    assert.equal(CjsBnkFormat.isSoundbanksInfo("{}"), false);
    assert.equal(CjsBnkFormat.isSoundbanksInfo(new Uint8Array([ 1, 2 ])), false);

    assert.equal(parsed.platform, "Windows");
    assert.equal(parsed.soundBankVersion, "150");
    assert.equal(parsed.bankCount, 2);
    assert.equal(parsed.mediaCount, 3);
    assert.equal(parsed.streamingMediaCount, 1);
    assert.equal(parsed.eventCount, 2);
    assert.deepEqual(parsed.languages, [ "English(US)", "SFX" ]);
    assert.equal(parsed.banks[0].switchGroups[0].switches[1].name, "large");
});

test("builds catalogs and joins them with bank inspections", () =>
{
    const catalog = CjsBnkFormat.buildSoundbanksCatalog(makeSoundbanksInfo());

    assert.equal(catalog.banksById["559876543"].shortName, "Effects");
    assert.equal(catalog.mediaById["101"].length, 2);
    assert.equal(catalog.mediaById["101"][0].bankName, "Effects");
    assert.equal(catalog.eventsByName["turret_fire_play"].id, "8738");

    const joined = CjsBnkFormat.joinSoundbanksInfo(CjsBnkFormat.inspect(makeBnk()), catalog);

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
    assert.throws(() => CjsBnkFormat.parseSoundbanksInfo("not json"), /not valid JSON/u);
    assert.throws(() => CjsBnkFormat.parseSoundbanksInfo({ SoundBanksInfo: {} }), /SoundBanksInfo\.SoundBanks/u);
});

test("computes Wwise ids as FNV-1 hashes of lowercased names", () =>
{
    assert.equal(CjsBnkFormat.wwiseIdFromName("SFX"), 393239870);
    assert.equal(CjsBnkFormat.wwiseIdFromName("English(US)"), 684519430);
    assert.equal(CjsBnkFormat.wwiseIdFromName("Voice"), 3170124113);
    assert.equal(CjsBnkFormat.wwiseIdFromName("Common"), 2395677314);
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
    const catalog = CjsBnkFormat.buildSoundbanksCatalog(document);
    const bankInfo = {
        bankId: 777,
        languageId: CjsBnkFormat.wwiseIdFromName("German"),
        media: [ { id: 101, length: 1, available: true } ],
        hirc: []
    };
    const joined = CjsBnkFormat.joinSoundbanksInfo(bankInfo, catalog);

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
