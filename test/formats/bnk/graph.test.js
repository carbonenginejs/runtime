import assert from "node:assert/strict";
import test from "node:test";
import CjsBnkFormat from "../../../src/formats/bnk/index.js";

// Fixture mirrors EVE's split-bank layout (bank generator version 150): an
// "events" bank holding only Event + Action objects, and a "media" bank
// holding the container/sound objects plus embedded media - edges must
// resolve across the merged graph. Everything is fabricated bytes.

const EVENT_ID = 1001;
const PLAY_ACTION_ID = 2001;
const STOP_ACTION_ID = 2002;
const CONTAINER_ID = 3001;
const SOUND_A_ID = 4001;
const SOUND_B_ID = 4002;
const STOP_ONLY_SOUND_ID = 4003;
const MIXER_ID = 5001;
const WEM_A = 900001;
const WEM_STREAMED = 900003;
const WEM_STOP_ONLY = 900002;

test("resolves event media across banks, ignores stop actions, never enters mixers", () =>
{
    const inspections = [
        CjsBnkFormat.inspect(makeEventsBnk()),
        CjsBnkFormat.inspect(makeMediaBnk())
    ];
    const { eventMedia, diagnostics } = CjsBnkFormat.wwise.eventMediaFromBanks(inspections, {
        knownWemIds: [ String(WEM_STREAMED) ]
    });

    assert.equal(diagnostics.eventCount, 1);
    const media = eventMedia.get(EVENT_ID);
    assert.ok(media, "event resolved across banks");
    // Play target container -> sounds A (embedded) and B (streamed); the
    // stop-only sound and mixer-only reach are excluded.
    assert.deepEqual([ ...media ].sort(), [ WEM_A, WEM_STREAMED ].sort());
});

test("a single bank alone resolves nothing under the split-bank layout", () =>
{
    const { eventMedia } = CjsBnkFormat.wwise.eventMediaFromBanks([ CjsBnkFormat.inspect(makeEventsBnk()) ]);
    assert.equal(eventMedia.size, 0);
});

test("the wwise static is the single home for the domain helpers", () =>
{
    assert.equal(CjsBnkFormat.wwise.wwiseIdFromName("SFX"), 393239870);
    assert.equal(CjsBnkFormat.wwise.isSoundbanksInfo("{}"), false);
    assert.equal(typeof CjsBnkFormat.wwise.parseSoundbanksInfo, "function");
    assert.equal(typeof CjsBnkFormat.wwise.eventMediaFromBanks, "function");
    assert.ok(Object.isFrozen(CjsBnkFormat.wwise));
    // No flat aliases: the class statics stay container-reading only.
    assert.equal(CjsBnkFormat.parseSoundbanksInfo, undefined);
    assert.equal(CjsBnkFormat.wwiseIdFromName, undefined);
});

// Events bank: one event with a play action targeting the cross-bank
// container and a stop action targeting a sound that must NOT contribute.
function makeEventsBnk()
{
    return makeBnk(11, [
        hircObject(4, EVENT_ID, concat([ 2 ], u32(PLAY_ACTION_ID), u32(STOP_ACTION_ID))),
        hircObject(3, PLAY_ACTION_ID, concat([ 0x03, 0x04 ], u32(CONTAINER_ID), [ 0, 0, 0, 4 ])),
        hircObject(3, STOP_ACTION_ID, concat([ 0x03, 0x01 ], u32(STOP_ONLY_SOUND_ID), [ 0, 0, 0, 4, 6, 0 ]))
    ]);
}

// Media bank: the container references both sounds at arbitrary offsets (the
// validated id-scan finds them) plus its parent mixer; the mixer references
// every sound and must not be entered. Sound B carries a back-pointer to the
// container - terminals stop the walk, so it must not loop or widen.
function makeMediaBnk()
{
    return makeBnk(22, [
        hircObject(5, CONTAINER_ID, concat([ 7, 7, 7 ], u32(SOUND_A_ID), [ 1 ], u32(SOUND_B_ID), u32(MIXER_ID))),
        hircObject(2, SOUND_A_ID, concat(u32(0x00040001), [ 0 ], u32(WEM_A), u32(64), [ 0 ])),
        hircObject(2, SOUND_B_ID, concat(u32(0x00040001), [ 1 ], u32(WEM_STREAMED), u32(16), [ 0 ], u32(CONTAINER_ID))),
        hircObject(2, STOP_ONLY_SOUND_ID, concat(u32(0x00040001), [ 0 ], u32(WEM_STOP_ONLY), u32(64), [ 0 ])),
        hircObject(7, MIXER_ID, concat([ 3 ], u32(SOUND_A_ID), u32(SOUND_B_ID), u32(STOP_ONLY_SOUND_ID)))
    ], {
        didx: concat(u32(WEM_A), u32(0), u32(64), u32(WEM_STOP_ONLY), u32(80), u32(64)),
        data: new Uint8Array(144)
    });
}

function u32(value)
{
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
    return bytes;
}

function concat(...parts)
{
    const flat = parts.map((part) => part instanceof Uint8Array ? part : Uint8Array.from(part));
    const bytes = new Uint8Array(flat.reduce((sum, part) => sum + part.byteLength, 0));
    let offset = 0;
    for (const part of flat)
    {
        bytes.set(part, offset);
        offset += part.byteLength;
    }
    return bytes;
}

function chunk(fourCC, payload)
{
    return concat([ ...fourCC ].map((c) => c.charCodeAt(0)), u32(payload.byteLength), payload);
}

function hircObject(type, id, body)
{
    return concat([ type ], u32(4 + body.byteLength), u32(id), body);
}

function makeBnk(bankId, objects, { didx = null, data = null } = {})
{
    const chunks = [ chunk("BKHD", concat(u32(150), u32(bankId), u32(0), u32(16))) ];
    if (didx) chunks.push(chunk("DIDX", didx));
    if (data) chunks.push(chunk("DATA", data));
    chunks.push(chunk("HIRC", concat(u32(objects.length), ...objects)));
    return concat(...chunks);
}
