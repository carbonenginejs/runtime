import assert from "node:assert/strict";
import test from "node:test";

import CjsBnkFormat from "../../../src/formats/bnk/index.js";
import { readWwiseVar } from "../../../src/formats/bnk/core/helpers.js";

const SOUND_A = 1001;
const SOUND_B = 1002;
const SOUND_C = 1003;
const KNOWN = new Map([
    [ SOUND_A, { type: 2 } ],
    [ SOUND_B, { type: 2 } ],
    [ SOUND_C, { type: 2 } ],
]);

test("reads canonical MSB-first Wwise variable integers", () =>
{
    assert.deepEqual(readWwiseVar(Uint8Array.of(0x7f)), {
        value: 127,
        nextOffset: 1,
    });
    assert.deepEqual(readWwiseVar(Uint8Array.of(0x81, 0x00)), {
        value: 128,
        nextOffset: 2,
    });
    assert.deepEqual(
        readWwiseVar(Uint8Array.of(0x8f, 0xff, 0xff, 0xff, 0x7f)),
        {
            value: 0xffffffff,
            nextOffset: 5,
        },
    );
    assert.equal(readWwiseVar(Uint8Array.of(0x80)), null);
    assert.equal(readWwiseVar(Uint8Array.of(0x80, 0x00)), null);
    assert.equal(
        readWwiseVar(Uint8Array.of(0x90, 0x80, 0x80, 0x80, 0x00)),
        null,
    );
});

test("decodes exact-end v150 Step Random/Sequence tails", () =>
{
    const writer = Prefix();

    writer
        .u16(2).u16(0).u16(1)
        .f32(0).f32(0).f32(0)
        .u16(1)
        .u8(0).u8(1).u8(0).u8(0x11)
        .children(SOUND_A, SOUND_B, SOUND_C)
        .u16(3)
        .u32(SOUND_B).s32(25)
        .u32(SOUND_A).s32(75)
        .u32(SOUND_C).s32(10);

    const random = CjsBnkFormat.wwise.parseSfxRandomSequence(
        writer.bytes(),
        KNOWN,
        { bankVersion: 150 },
    );

    assert.equal(random.type, "random");
    assert.equal(random.randomMode, 1);
    assert.equal(random.avoidRepeatCount, 1);
    assert.equal(random.usingWeight, true);
    assert.equal(random.global, true);
    assert.deepEqual(random.children, [ SOUND_A, SOUND_B, SOUND_C ]);
    assert.deepEqual(random.playlist.map(value => value.playId), [
        SOUND_B,
        SOUND_A,
        SOUND_C,
    ]);

    const sequence = Prefix()
        .u16(1).u16(0).u16(0)
        .f32(0).f32(0).f32(0)
        .u16(0)
        .u8(0).u8(0).u8(1).u8(0)
        .children(SOUND_A, SOUND_B)
        .u16(0)
        .bytes();

    assert.equal(
        CjsBnkFormat.wwise.parseSfxRandomSequence(
            sequence,
            KNOWN,
            { bankVersion: 150 },
        ).type,
        "sequence",
    );
    assert.equal(
        CjsBnkFormat.wwise.parseSfxRandomSequence(
            sequence,
            KNOWN,
            { bankVersion: 149 },
        ),
        null,
    );
    assert.equal(
        CjsBnkFormat.wwise.parseSfxRandomSequence(
            Concat(sequence, Uint8Array.of(1)),
            KNOWN,
            { bankVersion: 150 },
        ),
        null,
    );
});

test("decodes v150 Switch assignments, empty cases, and parameters", () =>
{
    const bytes = Prefix()
        .u8(1)
        .u32(500)
        .u32(601)
        .u8(0)
        .children(SOUND_A, SOUND_B)
        .u32(3)
        .u32(600).u32(2).u32(SOUND_A).u32(SOUND_B)
        .u32(601).u32(1).u32(9001)
        .u32(602).u32(0)
        .u32(1)
        .u32(9002).u8(0x03).u8(0x01).s32(250).s32(125)
        .bytes();
    const node = CjsBnkFormat.wwise.parseSfxSwitch(
        bytes,
        KNOWN,
        { bankVersion: 150 },
    );

    assert.equal(node.groupType, 1);
    assert.equal(node.groupId, 500);
    assert.equal(node.defaultValueId, 601);
    assert.deepEqual(node.assignments[0].childIds, [ SOUND_A, SOUND_B ]);
    assert.deepEqual(node.assignments[1].childIds, [ 9001 ]);
    assert.deepEqual(node.assignments[2].childIds, []);
    assert.deepEqual(node.parameters[0], {
        childId: 9002,
        firstOnly: true,
        continuePlayback: true,
        onSwitchMode: 1,
        fadeOutMs: 250,
        fadeInMs: 125,
    });
});

test("decodes v150 Layer tracks without lowering their curves", () =>
{
    const bytes = Prefix()
        .children(SOUND_A, SOUND_B)
        .u32(1)
        .u32(700)
        .u16(1)
        .u32(800).u8(0).u8(2).variable(128)
        .u32(801).u8(0).u16(2)
        .point(0, -6, 4).point(1, 0, 4)
        .u32(900).u8(0)
        .u32(2)
        .u32(SOUND_A).u32(2)
        .point(0, 1, 4).point(1, 0, 4)
        .u32(SOUND_B).u32(2)
        .point(0, 0, 4).point(1, 1, 4)
        .u8(0)
        .bytes();
    const node = CjsBnkFormat.wwise.parseSfxLayer(
        bytes,
        KNOWN,
        { bankVersion: 150 },
    );

    assert.deepEqual(node.children, [ SOUND_A, SOUND_B ]);
    assert.equal(node.layers[0].initialRtpcs[0].parameterId, 128);
    assert.equal(node.layers[0].initialRtpcs[0].accumulation, 2);
    assert.equal(node.layers[0].associations.length, 2);
    assert.deepEqual(node.layers[0].associations[1].points[1], {
        from: 1,
        to: 1,
        interpolation: 4,
    });
});

test("aggregates typed SFX nodes while preserving actions and diagnostics", () =>
{
    const randomPayload = Prefix()
        .u16(1).u16(0).u16(0)
        .f32(0).f32(0).f32(0)
        .u16(0)
        .u8(0).u8(0).u8(0).u8(0)
        .children(SOUND_A)
        .u16(1).u32(SOUND_A).s32(50)
        .bytes();
    const inspection = {
        source: "effects.bnk",
        bankVersion: 150,
        hirc: [
            {
                type: 2,
                id: SOUND_A,
                pluginId: 0x00040001,
                pluginType: 1,
                streamType: 0,
                sourceId: 9001,
                inMemoryMediaSize: 64,
                payload: new Uint8Array(),
            },
            {
                type: 5,
                id: 2001,
                payload: randomPayload,
            },
            {
                type: 3,
                id: 3001,
                actionType: 0x0403,
                targetId: 2001,
                payload: new Uint8Array(),
            },
            {
                type: 4,
                id: 4001,
                actionIds: [ 3001 ],
                payload: new Uint8Array(),
            },
        ],
    };
    const result = CjsBnkFormat.wwise.sfxNodesFromBanks([ inspection ]);

    assert.equal(result.diagnostics.parsed, 2);
    assert.equal(result.diagnostics.failed.length, 0);
    assert.equal(result.nodes.get(SOUND_A).pluginType, 1);
    assert.equal(result.nodes.get(2001).type, "random");
    assert.deepEqual(result.events.get(4001).actionIds, [ 3001 ]);
    assert.equal(result.actions.get(3001).targetId, 2001);

    const unsupported = CjsBnkFormat.wwise.sfxNodesFromBanks([
        {
            ...inspection,
            source: "old.bnk",
            bankVersion: 149,
        },
    ]);

    assert.deepEqual(unsupported.diagnostics.unsupportedVersions, [
        { bank: "old.bnk", version: 149 },
    ]);
    assert.equal(unsupported.nodes.size, 0);
});

class Writer
{
    constructor()
    {
        this.values = [];
    }

    u8(value)
    {
        this.values.push(value & 0xff);
        return this;
    }

    u16(value)
    {
        return this.number(2, (view) => view.setUint16(0, value, true));
    }

    u32(value)
    {
        return this.number(4, (view) => view.setUint32(0, value, true));
    }

    s32(value)
    {
        return this.number(4, (view) => view.setInt32(0, value, true));
    }

    f32(value)
    {
        return this.number(4, (view) => view.setFloat32(0, value, true));
    }

    variable(value)
    {
        const groups = [ value & 0x7f ];
        let remaining = Math.floor(value / 128);

        while (remaining)
        {
            groups.unshift((remaining & 0x7f) | 0x80);
            remaining = Math.floor(remaining / 128);
        }
        this.values.push(...groups);
        return this;
    }

    children(...ids)
    {
        this.u32(ids.length);
        for (const id of ids) this.u32(id);
        return this;
    }

    point(from, to, interpolation)
    {
        return this.f32(from).f32(to).u32(interpolation);
    }

    number(size, write)
    {
        const bytes = new Uint8Array(size);

        write(new DataView(bytes.buffer));
        this.values.push(...bytes);
        return this;
    }

    bytes()
    {
        return Uint8Array.from(this.values);
    }
}

function Prefix()
{
    return new Writer().u8(0xaa).u8(0x55).u8(0x33);
}

function Concat(...values)
{
    const size = values.reduce((sum, value) => sum + value.byteLength, 0);
    const result = new Uint8Array(size);
    let at = 0;

    for (const value of values)
    {
        result.set(value, at);
        at += value.byteLength;
    }
    return result;
}
