import assert from "node:assert/strict";
import test from "node:test";
import CjsBnkFormat from "../../../src/formats/bnk/index.js";

// Synthetic music-hierarchy payloads (bank generator version 150 layouts,
// field order hand-verified against EVE's music banks 2026-07-19). The bytes
// before the children+meter anchor simulate the undecoded NodeBaseParams
// block; 0xAA filler cannot form a valid anchor or track-type tail.

const TRACK_ID = 4101;
const SEGMENT_ID = 4001;
const KNOWN_IDS = new Set([ TRACK_ID, SEGMENT_ID ]);

function writer()
{
    const bytes = [];
    const scratch = new DataView(new ArrayBuffer(8));
    return {
        u8(value) { bytes.push(value & 0xff); return this; },
        u16(value) { bytes.push(value & 0xff, (value >> 8) & 0xff); return this; },
        u32(value) { bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff); return this; },
        s32(value) { return this.u32(value >>> 0); },
        f32(value) { scratch.setFloat32(0, value, true); for (let i = 0; i < 4; i++) bytes.push(scratch.getUint8(i)); return this; },
        f64(value) { scratch.setFloat64(0, value, true); for (let i = 0; i < 8; i++) bytes.push(scratch.getUint8(i)); return this; },
        fill(count) { for (let i = 0; i < count; i++) bytes.push(0xaa); return this; },
        stringZ(text) { for (const char of text) bytes.push(char.charCodeAt(0)); bytes.push(0); return this; },
        bytes() { return new Uint8Array(bytes); }
    };
}

function writeNodeTail(w, children)
{
    w.u32(children.length);
    for (const child of children) w.u32(child);
    w.f64(1000).f64(0).f32(120).u8(4).u8(4); // AkMeterInfo: grid/offset/tempo/4/4
    w.u8(1);   // meter override flag
    w.u32(0);  // stingers
}

function writeRule(w)
{
    w.u32(1);              // one rule
    w.u32(1).s32(-1);      // src: any
    w.u32(1).s32(-1);      // dst: any
    w.s32(500).u32(4).s32(0).u32(2).u32(0).u8(1);                    // src rule (NextBar)
    w.s32(0).u32(4).s32(0).u32(0).u32(0).u16(0).u16(0).u8(0).u8(0);  // dst rule
    w.u8(0);               // no transition segment
}

test("parseMusicSegment decodes children, meter, duration, and cue markers exactly", () =>
{
    const w = writer();
    w.fill(7); // NodeBaseParams stand-in
    writeNodeTail(w, [ TRACK_ID ]);
    w.f64(270000);      // duration
    w.u32(2);           // markers
    w.u32(11).f64(1000).stringZ("");
    w.u32(22).f64(265000).stringZ("exit");
    const segment = CjsBnkFormat.wwise.parseMusicSegment(w.bytes(), KNOWN_IDS);
    assert.ok(segment, "segment parses");
    assert.deepEqual(segment.children, [ TRACK_ID ]);
    assert.equal(segment.meter.tempo, 120);
    assert.equal(segment.meter.beatsPerBar, 4);
    assert.equal(segment.duration, 270000);
    assert.deepEqual(segment.markers.map(m => [ m.position, m.name ]), [ [ 1000, "" ], [ 265000, "exit" ] ]);

    const truncated = w.bytes().subarray(0, w.bytes().byteLength - 3);
    assert.equal(CjsBnkFormat.wwise.parseMusicSegment(truncated, KNOWN_IDS), null, "inexact payloads are rejected");
});

test("parseMusicTrack decodes sources, clips, and both tail layouts", () =>
{
    const simple = writer();
    simple.u8(0);   // uFlags
    simple.u32(1);  // one source
    simple.u32(0x00040001).u8(1).u32(900001).u32(4171).u8(0);
    simple.u32(1);  // one clip
    simple.u32(0).u32(900001).u32(0).f64(0).f64(500).f64(-250).f64(180000);
    simple.u32(1);  // subtracks
    simple.u32(0);  // clip automation
    simple.fill(9); // NodeBaseParams stand-in
    simple.u8(0);   // trackType normal
    simple.f32(0.1);
    const track = CjsBnkFormat.wwise.parseMusicTrack(simple.bytes());
    assert.ok(track, "normal track parses");
    assert.equal(track.trackType, 0);
    assert.equal(track.sources[0].sourceId, 900001);
    assert.deepEqual(
        [ track.clips[0].playAt, track.clips[0].beginTrimOffset, track.clips[0].endTrimOffset, track.clips[0].srcDuration ],
        [ 0, 500, -250, 180000 ]);

    const switched = writer();
    switched.u8(0).u32(0); // no sources
    switched.u32(0);       // no clips (no subtrack count when zero)
    switched.u32(0);       // no automation
    switched.fill(9);
    switched.u8(3);        // trackType switch
    switched.u8(0).u32(777).u32(888); // groupType/groupId/defaultSwitch
    switched.u32(2).u32(888).u32(999);
    switched.s32(600).u32(4).s32(0).u32(2).u32(0).s32(400).u32(4).s32(0); // trans params
    switched.f32(0.25);
    const switchTrack = CjsBnkFormat.wwise.parseMusicTrack(switched.bytes());
    assert.ok(switchTrack, "switch track parses");
    assert.equal(switchTrack.trackType, 3);
    assert.equal(switchTrack.switchParams.groupId, 777);
    assert.deepEqual(switchTrack.switchParams.assoc, [ 888, 999 ]);
});

test("parseMusicPlaylist decodes transition rules and the pre-order tree", () =>
{
    const w = writer();
    w.fill(5);
    writeNodeTail(w, [ SEGMENT_ID ]);
    writeRule(w);
    w.u32(2); // two playlist items: sequence root + one leaf
    w.u32(0).u32(101).u32(1).s32(0).u16(0).u16(0).u16(0).u32(50000).u16(1).u8(1).u8(0);
    w.u32(SEGMENT_ID).u32(102).u32(0).s32(-1).u16(1).u16(0).u16(0).u32(50000).u16(0).u8(0).u8(0);
    const playlist = CjsBnkFormat.wwise.parseMusicPlaylist(w.bytes(), KNOWN_IDS);
    assert.ok(playlist, "playlist parses");
    assert.equal(playlist.rules[0].src.syncType, 2, "NextBar rule survives");
    assert.equal(playlist.playlist.length, 2);
    assert.equal(playlist.playlist[0].childCount, 1);
    assert.equal(playlist.playlist[1].segmentId, SEGMENT_ID);
    assert.equal(playlist.playlist[1].rsType, -1, "leaf marker");
});

test("parseMusicSwitch decodes argument groups and the decision tree; musicNodesFromBanks aggregates", () =>
{
    const w = writer();
    w.fill(5);
    writeNodeTail(w, [ SEGMENT_ID ]);
    writeRule(w);
    w.u8(1);        // continuePlayback
    w.u32(1);       // tree depth
    w.u32(31337);   // argument group id
    w.u8(0);        // argument group type
    w.u32(24).u8(0); // treeDataSize (2 nodes), mode
    w.u32(0).u16(1).u16(1).u16(50000).u16(100);          // root -> children [1..2)
    w.u32(555).u32(SEGMENT_ID >>> 0).u16(50000).u16(100); // leaf key 555 -> segment
    const bytes = w.bytes();
    const switchNode = CjsBnkFormat.wwise.parseMusicSwitch(bytes, KNOWN_IDS);
    assert.ok(switchNode, "switch container parses");
    assert.equal(switchNode.argumentGroups[0].groupId, 31337);
    assert.equal(switchNode.treeNodes.length, 2);
    assert.equal(switchNode.treeNodes[1].key, 555);
    assert.equal(switchNode.treeNodes[1].audioNodeId, SEGMENT_ID);
    assert.equal(switchNode.rules[0].src.transitionTime, 500);

    const fakeInspection = {
        source: "synthetic.bnk",
        hirc: [
            // Non-music entry contributes its id to the bank's known-id set
            // (the switch payload's child references it).
            { type: 2, id: SEGMENT_ID, payload: null },
            { type: 12, id: 9001, payload: bytes },
            { type: 12, id: 9002, payload: bytes.subarray(0, 10) }
        ]
    };
    const { nodes, diagnostics } = CjsBnkFormat.wwise.musicNodesFromBanks([ fakeInspection ]);
    assert.equal(nodes.get(9001)?.type, "music-switch-container");
    assert.equal(nodes.get(9001)?.bank, "synthetic.bnk");
    assert.equal(diagnostics.parsed, 1);
    assert.deepEqual(diagnostics.failed, [ { bank: "synthetic.bnk", type: "music-switch-container", id: 9002 } ]);
});
