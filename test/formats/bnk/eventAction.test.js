import assert from "node:assert/strict";
import test from "node:test";

import CjsBnkFormat from "../../../src/formats/bnk/index.js";

test("decodes exact v150 Play action properties, ranges, and tail", () =>
{
    const action = CjsBnkFormat.wwise.parseEventAction(concat(
        u16(0x0403),
        u32(0x12345678),
        [ 0 ],
        [ 2, 0x39, 0x3b ],
        i32(-120),
        f32(50),
        [ 1, 0x39 ],
        i32(-10),
        i32(20),
        [ 4 ],
        u32(2395677314),
        u32(0),
    ), { bankVersion: 150 });

    assert.equal(action.actionName, "play");
    assert.equal(action.actionMode, "element");
    assert.equal(action.actionScope, "game-object");
    assert.equal(action.targetId, 0x12345678);
    assert.equal(action.targetIsBus, false);
    assert.equal(action.delayTimeMs, -120);
    assert.equal(action.probability, 50);
    assert.deepEqual(action.delayRangeMs, { min: -10, max: 20 });
    assert.equal(action.fadeCurve, 4);
    assert.equal(action.bankId, 2395677314);
    assert.equal(action.bankType, 0);
});

test("decodes exact v150 scoped Stop All exceptions", () =>
{
    const action = CjsBnkFormat.wwise.parseEventAction(concat(
        u16(0x0105),
        u32(0),
        [ 0 ],
        [ 1, 0x3a ],
        i32(250),
        [ 0 ],
        [ 4, 6, 2 ],
        u32(1001),
        [ 0 ],
        u32(1002),
        [ 1 ],
    ));

    assert.equal(action.actionName, "stop");
    assert.equal(action.actionMode, "all");
    assert.equal(action.actionScope, "game-object");
    assert.equal(action.transitionTimeMs, 250);
    assert.equal(action.fadeCurve, 4);
    assert.equal(action.actionFlags, 6);
    assert.deepEqual(action.exceptions, [
        {
            targetId: 1001,
            targetIsBus: false,
            targetFlags: 0,
        },
        {
            targetId: 1002,
            targetIsBus: true,
            targetFlags: 1,
        },
    ]);
});

test("decodes Post Event and fails closed for inexact action bodies", () =>
{
    const body = concat(
        u16(0x2103),
        u32(4444),
        [ 0, 0, 0 ],
    );
    const action = CjsBnkFormat.wwise.parseEventAction(body);

    assert.equal(action.actionName, "post-event");
    assert.equal(action.targetId, 4444);
    assert.equal(action.actionScope, "game-object");
    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(
            concat(body, [ 1 ]),
        ),
        null,
    );
    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(
            body.subarray(0, body.byteLength - 1),
        ),
        null,
    );
    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(
            body,
            { bankVersion: 149 },
        ),
        null,
    );
});

function u16(value)
{
    const bytes = new Uint8Array(2);

    new DataView(bytes.buffer).setUint16(0, value, true);
    return bytes;
}

function u32(value)
{
    const bytes = new Uint8Array(4);

    new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
    return bytes;
}

function i32(value)
{
    const bytes = new Uint8Array(4);

    new DataView(bytes.buffer).setInt32(0, value, true);
    return bytes;
}

function f32(value)
{
    const bytes = new Uint8Array(4);

    new DataView(bytes.buffer).setFloat32(0, value, true);
    return bytes;
}

function concat(...parts)
{
    const values = parts.map(part =>
        part instanceof Uint8Array ? part : Uint8Array.from(part));
    const bytes = new Uint8Array(values.reduce(
        (total, value) => total + value.byteLength,
        0,
    ));
    let offset = 0;

    for (const value of values)
    {
        bytes.set(value, offset);
        offset += value.byteLength;
    }

    return bytes;
}
