import assert from "node:assert/strict";
import test from "node:test";
import CjsBnkFormat from "../../../src/formats/bnk/index.js";

function busPayload({
    parentId = 0,
    outputDeviceId = 0,
    properties = [],
    auxIds = [],
    reflectionsAuxBusId = 0,
    policyFlags = 0,
    maxInstances = 0,
    channelConfig = 0,
    hdrFlags = 0,
    recoveryTime = 0,
    maxDuckVolume = 0,
    ducks = [],
    bypassAll = false,
    effects = [],
    metadata = [],
    rtpcs = [],
    stateProperties = [],
    stateGroups = [],
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

    u32(parentId);
    if (parentId === 0) u32(outputDeviceId);
    bytes.push(properties.length, ...properties.map(property => property.id));
    for (const property of properties) f32(property.value);

    u8(0); // positioning flags
    u8(auxIds.length ? 0x08 : 0);
    for (const auxId of auxIds) u32(auxId);
    u32(reflectionsAuxBusId);
    u8(policyFlags);
    u16(maxInstances);
    u32(channelConfig);
    u8(hdrFlags);
    u32(recoveryTime);
    f32(maxDuckVolume);
    u32(ducks.length);
    for (const duck of ducks)
    {
        u32(duck.busId);
        f32(duck.volume);
        u32(duck.fadeOutTime);
        u32(duck.fadeInTime);
        u8(duck.curve);
        u8(duck.targetPropertyId);
    }
    u8(effects.length);
    if (effects.length) u8(bypassAll ? 1 : 0);
    for (const effect of effects)
    {
        u8(effect.index);
        u32(effect.fxId);
        u8(effect.flags);
    }
    u8(metadata.length);
    for (const item of metadata)
    {
        u8(item.index);
        u32(item.fxId);
        u8(item.shareSet ? 1 : 0);
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
    return Uint8Array.from(bytes);
}

test("parseBusNode preserves v150 root and child property prefixes", () =>
{
    const root = CjsBnkFormat.wwise.parseBusNode(busPayload({
        outputDeviceId: 55,
        properties: [ { id: 0x04, value: 0 } ],
    }));
    const child = CjsBnkFormat.wwise.parseBusNode(busPayload({
        parentId: 100,
        properties: [
            { id: 0x04, value: -12 },
            { id: 0x05, value: 3 },
            { id: 0x0d, value: -6 },
        ],
    }));
    const absent = CjsBnkFormat.wwise.parseBusNode(busPayload({
        parentId: 100,
    }));

    assert.equal(root.overrideBusId, 0);
    assert.equal(root.outputDeviceId, 55);
    assert.equal(root.busVolume, 0, "authored zero is retained");
    assert.equal(child.overrideBusId, 100);
    assert.equal(child.outputDeviceId, null);
    assert.equal(child.busVolume, -12);
    assert.equal(child.makeUpGain, 3);
    assert.equal(child.outputBusVolume, -6);
    assert.equal(child.properties[1].floatValue, 3);
    assert.equal(absent.busVolume, null, "absence differs from authored zero");
    assert.equal(absent.makeUpGain, null);
    assert.equal(absent.outputBusVolume, null);
});

test("parseBusNode preserves RTPC and state chunks after metadata", () =>
{
    const rtpc = {
        controlId: 501,
        controlType: 1,
        accumulation: 4,
        parameterId: 0x181,
        curveId: 502,
        scaling: 3,
        points: [ { from: 0, to: -12, interpolation: 2 } ],
    };
    const stateProperty = {
        propertyId: 0x182,
        accumulation: 5,
        inDb: false,
    };
    const stateGroup = {
        groupId: 503,
        syncType: 6,
        states: [ {
            stateId: 504,
            values: [ { propertyId: 18, value: 2.5 } ],
        } ],
    };
    const bus = CjsBnkFormat.wwise.parseBusNode(busPayload({
        parentId: 100,
        metadata: [ { index: 0, fxId: 500, shareSet: true } ],
        rtpcs: [ rtpc ],
        stateProperties: [ stateProperty ],
        stateGroups: [ stateGroup ],
    }));

    assert.deepEqual(bus.rtpcs, [ rtpc ]);
    assert.deepEqual(bus.state, {
        properties: [ { ...stateProperty, inDbRaw: 0 } ],
        groups: [ stateGroup ],
    });
});

test("parseBusNode rejects invalid qualified prefixes", () =>
{
    const duplicate = busPayload({
        parentId: 1,
        properties: [
            { id: 0x04, value: 1 },
            { id: 0x04, value: 2 },
        ],
    });

    for (const id of [ 0x04, 0x05, 0x0d ])
    {
        const notFinite = busPayload({
            parentId: 1,
            properties: [ { id, value: Number.NaN } ],
        });

        assert.equal(CjsBnkFormat.wwise.parseBusNode(notFinite), null);
    }

    assert.equal(CjsBnkFormat.wwise.parseBusNode(duplicate), null);
    assert.equal(CjsBnkFormat.wwise.parseBusNode(
        busPayload({ parentId: 1 }),
        { bankVersion: 154 },
    ), null);
    assert.equal(CjsBnkFormat.wwise.parseBusNode(
        Uint8Array.of(1, 0, 0, 0, 1, 4),
    ), null);
    assert.equal(CjsBnkFormat.wwise.parseBusNode(
        busPayload({ parentId: 1 }).subarray(0, 20),
    ), null);
    assert.equal(CjsBnkFormat.wwise.parseBusNode(Uint8Array.from([
        ...busPayload({ parentId: 1 }),
        0xff,
    ])), null, "trailing bytes reject an otherwise valid body");
});

test("parseBusNode preserves complete aux, duck, effect, and policy records", () =>
{
    const bus = CjsBnkFormat.wwise.parseBusNode(busPayload({
        parentId: 100,
        auxIds: [ 11, 12, 13, 14 ],
        reflectionsAuxBusId: 15,
        policyFlags: 0x0f,
        maxInstances: 7,
        channelConfig: 0x12345302,
        hdrFlags: 0x03,
        recoveryTime: -250,
        maxDuckVolume: -12,
        ducks: [ {
            busId: 200,
            volume: -6,
            fadeOutTime: -300,
            fadeInTime: -400,
            curve: 4,
            targetPropertyId: 0x04,
        } ],
        bypassAll: true,
        effects: [
            { index: 0, fxId: 300, flags: 0x02 },
            { index: 1, fxId: 301, flags: 0x01 },
        ],
        metadata: [ { index: 2, fxId: 400, shareSet: true } ],
    }));

    assert.deepEqual(bus.aux, {
        flags: 0x08,
        overrideUserAux: false,
        hasAux: true,
        overrideReflectionsAux: false,
        auxIds: [ 11, 12, 13, 14 ],
        reflectionsAuxBusId: 15,
    });
    assert.deepEqual(bus.policy, {
        flags: 0x0f,
        killNewest: true,
        useVirtualBehavior: true,
        ignoreParentMaxInstances: true,
        backgroundMusic: true,
        maxInstances: 7,
    });
    assert.deepEqual(bus.channelConfig, {
        raw: 0x12345302,
        channelCount: 2,
        configType: 3,
        channelMask: 0x12345,
    });
    assert.deepEqual(bus.hdr, {
        flags: 0x03,
        enabled: true,
        exponentialRelease: true,
    });
    assert.equal(bus.recoveryTime, -250);
    assert.equal(bus.maxDuckVolume, -12);
    assert.deepEqual(bus.ducks, [ {
        busId: 200,
        volume: -6,
        fadeOutTime: -300,
        fadeInTime: -400,
        curve: 4,
        targetPropertyId: 0x04,
    } ]);
    assert.deepEqual(bus.fx, {
        bypassAllRaw: 1,
        bypassAll: true,
        slots: [
            {
                index: 0,
                fxId: 300,
                flags: 0x02,
                bypass: false,
                shareSet: true,
            },
            {
                index: 1,
                fxId: 301,
                flags: 0x01,
                bypass: true,
                shareSet: false,
            },
        ],
    });
    assert.deepEqual(bus.metadata, {
        slots: [ {
            index: 2,
            fxId: 400,
            shareSetRaw: 1,
            shareSet: true,
        } ],
    });
    assert.deepEqual(bus.rtpcs, []);
    assert.deepEqual(bus.state, { properties: [], groups: [] });
    assert.equal(bus.byteLength, busPayload({
        parentId: 100,
        auxIds: [ 11, 12, 13, 14 ],
        reflectionsAuxBusId: 15,
        policyFlags: 0x0f,
        maxInstances: 7,
        channelConfig: 0x12345302,
        hdrFlags: 0x03,
        recoveryTime: -250,
        maxDuckVolume: -12,
        ducks: [ {
            busId: 200,
            volume: -6,
            fadeOutTime: -300,
            fadeInTime: -400,
            curve: 4,
            targetPropertyId: 0x04,
        } ],
        bypassAll: true,
        effects: [
            { index: 0, fxId: 300, flags: 0x02 },
            { index: 1, fxId: 301, flags: 0x01 },
        ],
        metadata: [ { index: 2, fxId: 400, shareSet: true } ],
    }).byteLength);
});

test("busNodesFromBanks catalogs only v150 Audio and Auxiliary Bus records", () =>
{
    const result = CjsBnkFormat.wwise.busNodesFromBanks([
        {
            source: "init.bnk",
            bankVersion: 150,
            hirc: [
                { type: 8, id: 100, payload: busPayload({ outputDeviceId: 9 }) },
                { type: 18, id: 200, payload: busPayload({ parentId: 100 }) },
                { type: 19, id: 300, payload: busPayload({ parentId: 100 }) },
                { type: 8, id: 400, payload: Uint8Array.of(1) },
            ],
        },
        {
            source: "overlay.bnk",
            bankVersion: 150,
            hirc: [
                { type: 8, id: 100, payload: busPayload({ outputDeviceId: 10 }) },
            ],
        },
        {
            source: "old.bnk",
            bankVersion: 149,
            hirc: [
                { type: 8, id: 500, payload: busPayload() },
            ],
        },
    ]);

    assert.equal(result.buses.get(100).type, "audio-bus");
    assert.equal(result.buses.get(100).outputDeviceId, 10, "later bank wins");
    assert.equal(result.buses.get(200).type, "auxiliary-bus");
    assert.equal(result.buses.has(300), false, "v150 type 19 is LFO");
    assert.deepEqual(result.diagnostics.duplicates, [ {
        id: 100,
        previousBank: "init.bnk",
        bank: "overlay.bnk",
    } ]);
    assert.deepEqual(result.diagnostics.failed, [ {
        bank: "init.bnk",
        version: 150,
        type: "audio-bus",
        id: 400,
        reason: "invalid v150 bus body",
    } ]);
    assert.deepEqual(result.diagnostics.unsupportedVersions, [ {
        bank: "old.bnk",
        version: 149,
    } ]);
});
