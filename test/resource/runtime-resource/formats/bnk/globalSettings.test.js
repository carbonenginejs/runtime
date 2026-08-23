import assert from "node:assert/strict";
import test from "node:test";

import CjsBnkFormat from "../../../../../src/resource/formats/bnk/index.js";

test("decodes every exact v150 Global Settings record family", () =>
{
    const payload = MakeGlobalSettings();
    const parsed = CjsBnkFormat.wwise.parseGlobalSettings(payload);
    const f = Math.fround;

    assert.deepEqual(parsed, {
        filterBehavior: 1,
        volumeThreshold: f(-96.3),
        maxVoices: 128,
        maxDangerousVirtualVoices: 4,
        stateGroups: [
            {
                id: 10,
                defaultTransitionTimeMs: 250,
                transitions: [
                    { fromId: 0, toId: 1, transitionTimeMs: 100 },
                    { fromId: 1, toId: 2, transitionTimeMs: 200 },
                ],
            },
            { id: 11, defaultTransitionTimeMs: 0, transitions: [] },
        ],
        switchGroups: [ {
            id: 20,
            controlId: 21,
            controlType: 4,
            points: [
                { from: f(-1.5), to: f(10.25), interpolation: 0 },
                { from: f(2.5), to: f(30.75), interpolation: 9 },
            ],
        } ],
        rtpcParameters: [
            {
                id: 30,
                defaultValue: f(-0.25),
                rampType: 0,
                rampUp: 0,
                rampDown: 0,
                builtInParameter: 0,
            },
            {
                id: 31,
                defaultValue: f(0.5),
                rampType: 1,
                rampUp: f(30000),
                rampDown: f(74),
                builtInParameter: 1,
            },
            {
                id: 32,
                defaultValue: f(1.25),
                rampType: 2,
                rampUp: f(2),
                rampDown: f(3),
                builtInParameter: 9,
            },
        ],
        acousticTextures: [ {
            id: 40,
            absorptionOffset: f(-0.1),
            absorptionLow: f(0.1),
            absorptionMidLow: f(0.2),
            absorptionMidHigh: f(0.3),
            absorptionHigh: f(0.4),
            scattering: f(0.5),
        } ],
    });
});

test("Global Settings decoding fails closed for inexact inputs", () =>
{
    const payload = MakeGlobalSettings();

    assert.equal(
        CjsBnkFormat.wwise.parseGlobalSettings(new DataView(payload.buffer)),
        null,
    );
    for (const bankVersion of [ 149, 151, 154 ])
    {
        assert.equal(
            CjsBnkFormat.wwise.parseGlobalSettings(
                payload,
                { bankVersion },
            ),
            null,
        );
    }
    for (let length = 0; length < payload.byteLength; length++)
    {
        assert.equal(
            CjsBnkFormat.wwise.parseGlobalSettings(
                payload.subarray(0, length),
            ),
            null,
        );
    }
    assert.equal(
        CjsBnkFormat.wwise.parseGlobalSettings(
            Concat(payload, Uint8Array.of(0)),
        ),
        null,
    );
});

test("Global Settings decoding rejects impossible counts and invalid values", () =>
{
    const payload = MakeGlobalSettings();

    for (const offset of [ 10, 22, 62, 75, 103, 170 ])
    {
        assert.equal(
            CjsBnkFormat.wwise.parseGlobalSettings(
                WithU32(payload, offset, 0xffffffff),
            ),
            null,
        );
    }
    for (const invalid of [
        WithU16(payload, 0, 2),
        WithU8(payload, 74, 5),
        WithU32(payload, 87, 10),
        WithU32(payload, 115, 3),
        WithU8(payload, 127, 10),
    ])
    {
        assert.equal(
            CjsBnkFormat.wwise.parseGlobalSettings(invalid),
            null,
        );
    }
    for (const [ offset, value ] of [
        [ 2, Number.NaN ],
        [ 79, Number.POSITIVE_INFINITY ],
        [ 111, Number.NaN ],
        [ 119, Number.NEGATIVE_INFINITY ],
        [ 178, Number.NaN ],
    ])
    {
        assert.equal(
            CjsBnkFormat.wwise.parseGlobalSettings(
                WithF32(payload, offset, value),
            ),
            null,
        );
    }
});

test("BNK inspection attaches exact STMG data and preserves malformed chunks", () =>
{
    const payload = MakeGlobalSettings();
    const info = CjsBnkFormat.inspect(MakeBank(payload));

    assert.equal(info.globalSettings.rtpcParameters.length, 3);
    assert.equal(info.globalSettings.rtpcParameters[2].builtInParameter, 9);
    assert.deepEqual(
        CjsBnkFormat.toJSON(info).globalSettings,
        info.globalSettings,
    );

    const trailing = CjsBnkFormat.inspect(MakeBank(
        Concat(payload, Uint8Array.of(0)),
    ));

    assert.equal(trailing.globalSettings, null);
    assert.ok(trailing.chunks.some(chunk => chunk.id === "STMG"));

    const duplicate = CjsBnkFormat.inspect(MakeBank(payload, {
        duplicate: true,
    }));

    assert.equal(duplicate.globalSettings, null);
    assert.equal(
        duplicate.chunks.filter(chunk => chunk.id === "STMG").length,
        2,
    );

    const truncated = CjsBnkFormat.inspect(MakeBank(payload, {
        truncateOuter: true,
    }));

    assert.equal(truncated.globalSettings, null);
    assert.equal(
        truncated.chunks.find(chunk => chunk.id === "STMG").truncated,
        true,
    );
});

function MakeGlobalSettings()
{
    return Concat(
        U16(1),
        F32(-96.3),
        U16(128),
        U16(4),
        U32(2),
        U32(10), U32(250), U32(2),
        U32(0), U32(1), U32(100),
        U32(1), U32(2), U32(200),
        U32(11), U32(0), U32(0),
        U32(1),
        U32(20), U32(21), U8(4), U32(2),
        F32(-1.5), F32(10.25), U32(0),
        F32(2.5), F32(30.75), U32(9),
        U32(3),
        U32(30), F32(-0.25), U32(0), F32(0), F32(0), U8(0),
        U32(31), F32(0.5), U32(1), F32(30000), F32(74), U8(1),
        U32(32), F32(1.25), U32(2), F32(2), F32(3), U8(9),
        U32(1),
        U32(40), F32(-0.1), F32(0.1), F32(0.2), F32(0.3),
        F32(0.4), F32(0.5),
    );
}

function MakeBank(payload, { duplicate = false, truncateOuter = false } = {})
{
    const headerPayload = new Uint8Array(20);

    new DataView(headerPayload.buffer).setUint32(0, 150, true);
    const stmg = Chunk(
        "STMG",
        payload,
        payload.byteLength + (truncateOuter ? 1 : 0),
    );

    return Concat(
        Chunk("BKHD", headerPayload),
        stmg,
        ...(duplicate ? [ Chunk("STMG", payload) ] : []),
    );
}

function Chunk(id, payload, declaredSize = payload.byteLength)
{
    const bytes = new Uint8Array(8 + payload.byteLength);

    for (let index = 0; index < 4; index++)
    {
        bytes[index] = id.charCodeAt(index);
    }
    new DataView(bytes.buffer).setUint32(4, declaredSize, true);
    bytes.set(payload, 8);
    return bytes;
}

function WithU8(source, offset, value)
{
    const bytes = source.slice();

    bytes[offset] = value;
    return bytes;
}

function WithU16(source, offset, value)
{
    const bytes = source.slice();

    new DataView(bytes.buffer).setUint16(offset, value, true);
    return bytes;
}

function WithU32(source, offset, value)
{
    const bytes = source.slice();

    new DataView(bytes.buffer).setUint32(offset, value >>> 0, true);
    return bytes;
}

function WithF32(source, offset, value)
{
    const bytes = source.slice();

    new DataView(bytes.buffer).setFloat32(offset, value, true);
    return bytes;
}

function U8(value)
{
    return Uint8Array.of(value);
}

function U16(value)
{
    const bytes = new Uint8Array(2);

    new DataView(bytes.buffer).setUint16(0, value, true);
    return bytes;
}

function U32(value)
{
    const bytes = new Uint8Array(4);

    new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
    return bytes;
}

function F32(value)
{
    const bytes = new Uint8Array(4);

    new DataView(bytes.buffer).setFloat32(0, value, true);
    return bytes;
}

function Concat(...parts)
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
