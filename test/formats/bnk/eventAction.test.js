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

test("decodes exact v150 Set and Reset Voice Volume actions", () =>
{
    const set = CjsBnkFormat.wwise.parseEventAction(concat(
        u16(0x0a03),
        u32(0x12345678),
        [ 0 ],
        [ 2, 0x39, 0x3a ],
        i32(50),
        i32(250),
        [ 0 ],
        [ 7, 2 ],
        f32(-3),
        f32(-3),
        f32(1),
        [ 0 ],
    ));
    const reset = CjsBnkFormat.wwise.parseEventAction(concat(
        u16(0x0b02),
        u32(0x87654321),
        [ 0, 0, 0 ],
        [ 9, 2 ],
        f32(0),
        f32(0),
        f32(0),
        [ 0 ],
    ));

    assert.equal(set.actionName, "set-voice-volume");
    assert.equal(set.actionScope, "game-object");
    assert.equal(set.actionMode, "element");
    assert.equal(set.delayTimeMs, 50);
    assert.equal(set.transitionTimeMs, 250);
    assert.equal(set.fadeCurve, 7);
    assert.equal(set.valueMode, "relative");
    assert.equal(set.volumeDb, -3);
    assert.deepEqual(set.volumeRangeDb, { min: -3, max: 1 });

    assert.equal(reset.actionName, "reset-voice-volume");
    assert.equal(reset.actionScope, "global");
    assert.equal(reset.fadeCurve, 9);
    assert.equal(reset.valueMode, undefined);
    assert.equal(reset.volumeDb, undefined);
    assert.equal(reset.volumeRangeDb, undefined);
});

test("decodes exact v150 Set and Reset Voice Pitch actions", () =>
{
    const set = CjsBnkFormat.wwise.parseEventAction(concat(
        u16(0x0803),
        u32(0x12345678),
        [ 0 ],
        [ 1, 0x3a ],
        i32(250),
        [ 0 ],
        [ 9, 2 ],
        f32(240),
        f32(-20),
        f32(30),
        [ 0 ],
    ));
    const reset = CjsBnkFormat.wwise.parseEventAction(concat(
        u16(0x0903),
        u32(0x87654321),
        [ 0, 0, 0 ],
        [ 4, 1 ],
        f32(0),
        f32(0),
        f32(0),
        [ 0 ],
    ));

    assert.equal(set.actionName, "set-voice-pitch");
    assert.equal(set.actionScope, "game-object");
    assert.equal(set.actionMode, "element");
    assert.equal(set.transitionTimeMs, 250);
    assert.equal(set.fadeCurve, 9);
    assert.equal(set.valueMode, "relative");
    assert.equal(set.pitchCents, 240);
    assert.deepEqual(set.pitchRangeCents, { min: -20, max: 30 });

    assert.equal(reset.actionName, "reset-voice-pitch");
    assert.equal(reset.actionScope, "game-object");
    assert.equal(reset.valueMode, undefined);
    assert.equal(reset.pitchCents, undefined);
    assert.equal(reset.pitchRangeCents, undefined);
});

test("fails closed for inexact Voice Volume bodies", () =>
{
    const exact = concat(
        u16(0x0a03),
        u32(1234),
        [ 0, 0, 0, 4, 1 ],
        f32(-6),
        f32(0),
        f32(0),
        [ 0 ],
    );
    const unsupportedProperty = concat(
        u16(0x0a03),
        u32(1234),
        [ 0, 1, 0x3b ],
        f32(100),
        [ 0, 4, 1 ],
        f32(-6),
        f32(0),
        f32(0),
        [ 0 ],
    );

    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(
            concat(exact.subarray(0, exact.byteLength - 1), [ 1 ]),
        ),
        null,
    );
    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(
            exact.subarray(0, exact.byteLength - 1),
        ),
        null,
    );
    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(unsupportedProperty),
        null,
    );
});

test("fails closed for inexact Voice Pitch bodies", () =>
{
    const exact = concat(
        u16(0x0803),
        u32(1234),
        [ 0, 0, 0, 4, 1 ],
        f32(240),
        f32(0),
        f32(0),
        [ 0 ],
    );
    const nonzeroReset = concat(
        u16(0x0903),
        u32(1234),
        [ 0, 0, 0, 4, 1 ],
        f32(1),
        f32(0),
        f32(0),
        [ 0 ],
    );
    const invalidCurve = concat(
        u16(0x0803),
        u32(1234),
        [ 0, 0, 0, 10, 1 ],
        f32(240),
        f32(0),
        f32(0),
        [ 0 ],
    );

    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(
            concat(exact.subarray(0, exact.byteLength - 1), [ 1 ]),
        ),
        null,
    );
    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(
            exact.subarray(0, exact.byteLength - 1),
        ),
        null,
    );
    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(nonzeroReset),
        null,
    );
    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(invalidCurve),
        null,
    );
});

test("decodes exact v150 Set State and Set Switch actions", () =>
{
    const setStateBody = concat(
        u16(0x1204),
        u32(0x60000002),
        [ 0 ],
        [ 1, 0x39 ],
        i32(250),
        [ 0 ],
        u32(0x60000001),
        u32(0x60000002),
    );
    const setSwitchBody = concat(
        u16(0x1901),
        u32(0x50000002),
        [ 0, 0, 0 ],
        u32(0x50000001),
        u32(0x50000002),
    );
    const setState = CjsBnkFormat.wwise.parseEventAction(setStateBody);
    const setSwitch = CjsBnkFormat.wwise.parseEventAction(setSwitchBody);

    assert.equal(setState.actionName, "set-state");
    assert.equal(setState.targetId, 0x60000002);
    assert.equal(setState.delayTimeMs, 250);
    assert.equal(setState.groupId, 0x60000001);
    assert.equal(setState.valueId, 0x60000002);

    assert.equal(setSwitch.actionName, "set-switch");
    assert.equal(setSwitch.targetId, 0x50000002);
    assert.equal(setSwitch.groupId, 0x50000001);
    assert.equal(setSwitch.valueId, 0x50000002);

    for (const body of [ setStateBody, setSwitchBody ])
    {
        assert.equal(
            CjsBnkFormat.wwise.parseEventAction(
                body.subarray(0, body.byteLength - 1),
            ),
            null,
        );
        assert.equal(
            CjsBnkFormat.wwise.parseEventAction(concat(body, [ 0 ])),
            null,
        );
    }
});

test("decodes exact v150 Set and Reset Game Parameter actions", () =>
{
    const setGlobalBody = concat(
        u16(0x1302),
        u32(0x70000001),
        [ 0 ],
        [ 2, 0x39, 0x3a ],
        i32(250),
        i32(1000),
        [ 2, 0x39, 0x3a ],
        i32(-25),
        i32(75),
        i32(-100),
        i32(200),
        [ 4, 0, 1 ],
        f32(75),
        f32(-5),
        f32(5),
        [ 0 ],
    );
    const setObjectBody = concat(
        u16(0x1303),
        u32(0x70000002),
        [ 0, 0, 0 ],
        [ 9, 1, 2 ],
        f32(-10),
        f32(0),
        f32(0),
        [ 1 ],
        u32(0x71000001),
        [ 0 ],
    );
    const resetObjectBody = concat(
        u16(0x1403),
        u32(0x70000003),
        [ 0, 0, 0 ],
        [ 4, 0, 0 ],
        f32(0),
        f32(0),
        f32(0),
        [ 0 ],
    );
    const setGlobal = CjsBnkFormat.wwise.parseEventAction(setGlobalBody);
    const setObject = CjsBnkFormat.wwise.parseEventAction(setObjectBody);
    const resetObject = CjsBnkFormat.wwise.parseEventAction(resetObjectBody);

    assert.equal(setGlobal.actionName, "set-game-parameter");
    assert.equal(setGlobal.actionScope, "global");
    assert.equal(setGlobal.delayTimeMs, 250);
    assert.deepEqual(setGlobal.delayRangeMs, { min: -25, max: 75 });
    assert.equal(setGlobal.transitionTimeMs, 1000);
    assert.deepEqual(setGlobal.transitionRangeMs, { min: -100, max: 200 });
    assert.equal(setGlobal.fadeCurve, 4);
    assert.equal(setGlobal.bypassTransition, false);
    assert.equal(setGlobal.valueMode, "absolute");
    assert.equal(setGlobal.gameParameterValue, 75);
    assert.deepEqual(setGlobal.gameParameterRange, { min: -5, max: 5 });
    assert.deepEqual(setGlobal.exceptions, []);

    assert.equal(setObject.actionScope, "game-object");
    assert.equal(setObject.fadeCurve, 9);
    assert.equal(setObject.bypassTransition, true);
    assert.equal(setObject.valueMode, "relative");
    assert.equal(setObject.gameParameterValue, -10);
    assert.deepEqual(setObject.exceptions, [ {
        targetId: 0x71000001,
        targetIsBus: false,
        targetFlags: 0,
    } ]);

    assert.equal(resetObject.actionName, "reset-game-parameter");
    assert.equal(resetObject.valueMode, undefined);
    assert.equal(resetObject.gameParameterValue, undefined);
    assert.equal(resetObject.gameParameterRange, undefined);
});

test("fails closed for inexact Game Parameter action bodies", () =>
{
    const exact = concat(
        u16(0x1303),
        u32(1234),
        [ 0, 0, 0, 4, 0, 1 ],
        f32(10),
        f32(0),
        f32(0),
        [ 0 ],
    );
    const invalidCurve = concat(
        u16(0x1303),
        u32(1234),
        [ 0, 0, 0, 10, 0, 1 ],
        f32(10),
        f32(0),
        f32(0),
        [ 0 ],
    );
    const invalidValueMode = concat(
        u16(0x1303),
        u32(1234),
        [ 0, 0, 0, 4, 0, 3 ],
        f32(10),
        f32(0),
        f32(0),
        [ 0 ],
    );
    const invalidResetMeaning = concat(
        u16(0x1403),
        u32(1234),
        [ 0, 0, 0, 4, 0, 1 ],
        f32(0),
        f32(0),
        f32(0),
        [ 0 ],
    );
    const invalidResetValue = concat(
        u16(0x1403),
        u32(1234),
        [ 0, 0, 0, 4, 0, 0 ],
        f32(1),
        f32(0),
        f32(0),
        [ 0 ],
    );
    const reservedTargetFlags = concat(
        u16(0x1303),
        u32(1234),
        [ 0x80, 0, 0, 4, 0, 1 ],
        f32(10),
        f32(0),
        f32(0),
        [ 0 ],
    );
    const unsupportedProperty = concat(
        u16(0x1303),
        u32(1234),
        [ 0, 1, 0x3b ],
        f32(50),
        [ 0, 4, 0, 1 ],
        f32(10),
        f32(0),
        f32(0),
        [ 0 ],
    );
    const duplicateTransitionProperty = concat(
        u16(0x1303),
        u32(1234),
        [ 0, 2, 0x3a, 0x3a ],
        i32(100),
        i32(200),
        [ 0, 4, 0, 1 ],
        f32(10),
        f32(0),
        f32(0),
        [ 0 ],
    );
    const nonCanonicalExceptions = concat(
        exact.subarray(0, exact.byteLength - 1),
        [ 0x80, 0 ],
    );

    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(
            exact.subarray(0, exact.byteLength - 1),
        ),
        null,
    );
    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(concat(exact, [ 0 ])),
        null,
    );
    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(invalidCurve),
        null,
    );
    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(invalidValueMode),
        null,
    );
    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(invalidResetMeaning),
        null,
    );
    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(invalidResetValue),
        null,
    );
    for (const invalid of [
        reservedTargetFlags,
        unsupportedProperty,
        duplicateTransitionProperty,
    ])
    {
        assert.equal(CjsBnkFormat.wwise.parseEventAction(invalid), null);
    }
    assert.equal(
        CjsBnkFormat.wwise.parseEventAction(nonCanonicalExceptions),
        null,
    );
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
