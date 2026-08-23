import assert from "node:assert/strict";
import test from "node:test";
import CjsBnkFormat from "../../../../../src/resource/formats/bnk/index.js";

function effectPayload({
    pluginId = 0x007f0003,
    parameterBlock = Uint8Array.of(),
    media = [],
    rtpcs = [],
    stateProperties = [],
    stateGroups = [],
    propertyValues = [],
} = {})
{
    const bytes = [];
    const scratch = new DataView(new ArrayBuffer(4));
    const u8 = value => bytes.push(value & 0xff);
    const u16 = value => bytes.push(value & 0xff, (value >>> 8) & 0xff);
    const u32 = (value) =>
    {
        bytes.push(
            value & 0xff,
            (value >>> 8) & 0xff,
            (value >>> 16) & 0xff,
            (value >>> 24) & 0xff,
        );
    };
    const f32 = (value) =>
    {
        scratch.setFloat32(0, value, true);
        for (let index = 0; index < 4; index++)
        {
            bytes.push(scratch.getUint8(index));
        }
    };
    const variable = (value) =>
    {
        const groups = [ value & 0x7f ];
        let remaining = Math.floor(value / 128);

        while (remaining)
        {
            groups.unshift((remaining & 0x7f) | 0x80);
            remaining = Math.floor(remaining / 128);
        }
        bytes.push(...groups);
    };

    u32(pluginId);
    if (pluginId !== 0 && pluginId !== 0xffffffff)
    {
        u32(parameterBlock.byteLength);
        bytes.push(...parameterBlock);
    }
    u8(media.length);
    for (const item of media)
    {
        u8(item.index);
        u32(item.sourceId);
    }
    u16(rtpcs.length);
    for (const rtpc of rtpcs)
    {
        u32(rtpc.controlId);
        u8(rtpc.controlType);
        u8(rtpc.accumulation);
        variable(rtpc.parameterId);
        u32(rtpc.curveId);
        u8(rtpc.scaling);
        u16(rtpc.points.length);
        for (const point of rtpc.points)
        {
            f32(point.from);
            f32(point.to);
            u32(point.interpolation);
        }
    }
    variable(stateProperties.length);
    for (const property of stateProperties)
    {
        variable(property.propertyId);
        u8(property.accumulation);
        u8(property.inDb ? 1 : 0);
    }
    variable(stateGroups.length);
    for (const group of stateGroups)
    {
        u32(group.groupId);
        u8(group.syncType);
        variable(group.states.length);
        for (const state of group.states)
        {
            u32(state.stateId);
            u16(state.values.length);
            for (const value of state.values) u16(value.propertyId);
            for (const value of state.values) f32(value.value);
        }
    }
    u16(propertyValues.length);
    for (const property of propertyValues)
    {
        if (property.propertyId > 0x7f)
        {
            throw new RangeError("test fixture uses one-byte variables");
        }
        u8(property.propertyId);
        u8(property.accumulation);
        f32(property.value);
    }

    return Uint8Array.from(bytes);
}

test("parseEffectNode preserves opaque plug-in parameters and typed references", () =>
{
    const payload = effectPayload({
        pluginId: 0x007f0003,
        parameterBlock: Uint8Array.of(1, 2, 3, 4),
        media: [ { index: 0, sourceId: 154360724 } ],
        propertyValues: [ {
            propertyId: 5,
            accumulation: 2,
            value: -11,
        } ],
    });
    const effect = CjsBnkFormat.wwise.parseEffectNode(payload);

    assert.equal(effect.pluginId, 0x007f0003);
    assert.equal(effect.pluginType, 3);
    assert.equal(effect.companyId, 0);
    assert.equal(effect.pluginClassId, 0x007f);
    assert.deepEqual(effect.parameterBlock, Uint8Array.of(1, 2, 3, 4));
    assert.deepEqual(effect.media, [ { index: 0, sourceId: 154360724 } ]);
    assert.deepEqual(effect.rtpcs, []);
    assert.deepEqual(effect.state, { properties: [], groups: [] });
    assert.deepEqual(effect.propertyValues, [ {
        propertyId: 5,
        accumulation: 2,
        value: -11,
    } ]);
    assert.equal(effect.byteLength, payload.byteLength);

    const identity = CjsBnkFormat.wwise.parseEffectNode(effectPayload({
        pluginId: 0x1234abc3,
    }));

    assert.equal(identity.pluginType, 3);
    assert.equal(identity.companyId, 0x0abc);
    assert.equal(identity.pluginClassId, 0x1234);
});

test("parseEffectNode preserves RTPC and state chunks before properties", () =>
{
    const rtpc = {
        controlId: 101,
        controlType: 2,
        accumulation: 3,
        parameterId: 0x184,
        curveId: 202,
        scaling: 4,
        points: [ { from: -1, to: 6, interpolation: 5 } ],
    };
    const stateProperty = {
        propertyId: 0x185,
        accumulation: 2,
        inDb: true,
    };
    const stateGroup = {
        groupId: 303,
        syncType: 4,
        states: [ {
            stateId: 404,
            values: [ { propertyId: 17, value: -9 } ],
        } ],
    };
    const effect = CjsBnkFormat.wwise.parseEffectNode(effectPayload({
        rtpcs: [ rtpc ],
        stateProperties: [ stateProperty ],
        stateGroups: [ stateGroup ],
        propertyValues: [ {
            propertyId: 6,
            accumulation: 1,
            value: 3,
        } ],
    }));

    assert.deepEqual(effect.rtpcs, [ rtpc ]);
    assert.deepEqual(effect.state, {
        properties: [ { ...stateProperty, inDbRaw: 1 } ],
        groups: [ stateGroup ],
    });
    assert.deepEqual(effect.propertyValues, [ {
        propertyId: 6,
        accumulation: 1,
        value: 3,
    } ]);
});

test("parseEffectNode rejects malformed and unqualified bodies", () =>
{
    const payload = effectPayload({ parameterBlock: Uint8Array.of(1, 2) });
    const invalidAccumulation = effectPayload({
        propertyValues: [ { propertyId: 1, accumulation: 7, value: 0 } ],
    });

    assert.equal(CjsBnkFormat.wwise.parseEffectNode(
        payload,
        { bankVersion: 149 },
    ), null);
    assert.equal(CjsBnkFormat.wwise.parseEffectNode(
        payload.subarray(0, payload.byteLength - 1),
    ), null);
    assert.equal(
        CjsBnkFormat.wwise.parseEffectNode(invalidAccumulation),
        null,
    );
});

test("effectNodesFromBanks catalogs only v150 ShareSet and Custom records", () =>
{
    assert.equal(CjsBnkFormat.HIRC_V150_TYPE_NAMES[16], "fx-share-set");
    assert.equal(CjsBnkFormat.HIRC_V150_TYPE_NAMES[17], "fx-custom");
    assert.equal(CjsBnkFormat.HIRC_V150_TYPE_NAMES[18], "auxiliary-bus");

    const result = CjsBnkFormat.wwise.effectNodesFromBanks([
        {
            source: "init.bnk",
            bankVersion: 150,
            hirc: [
                { type: 16, id: 100, payload: effectPayload() },
                { type: 17, id: 200, payload: effectPayload({ pluginId: 0 }) },
                { type: 18, id: 300, payload: effectPayload() },
                { type: 16, id: 400, payload: Uint8Array.of(1) },
            ],
        },
        {
            source: "overlay.bnk",
            bankVersion: 150,
            hirc: [ { type: 16, id: 100, payload: effectPayload() } ],
        },
        {
            source: "old.bnk",
            bankVersion: 149,
            hirc: [ { type: 16, id: 500, payload: effectPayload() } ],
        },
    ]);

    assert.equal(result.effects.get(100).type, "effect-share-set");
    assert.equal(result.effects.get(100).bank, "overlay.bnk");
    assert.equal(result.effects.get(200).type, "effect-custom");
    assert.equal(result.effects.has(300), false);
    assert.deepEqual(result.diagnostics.duplicates, [ {
        id: 100,
        previousBank: "init.bnk",
        bank: "overlay.bnk",
    } ]);
    assert.deepEqual(result.diagnostics.failed, [ {
        bank: "init.bnk",
        version: 150,
        type: "effect-share-set",
        id: 400,
        reason: "invalid v150 effect body",
    } ]);
    assert.deepEqual(result.diagnostics.unsupportedVersions, [ {
        bank: "old.bnk",
        version: 149,
    } ]);
});
