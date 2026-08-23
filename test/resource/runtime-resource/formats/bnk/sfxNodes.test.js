import assert from "node:assert/strict";
import test from "node:test";

import CjsBnkFormat from "../../../../../src/resource/formats/bnk/index.js";
import { readWwiseVar } from "../../../../../src/resource/formats/bnk/core/helpers.js";

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

test("uses an exact NodeBase prefix to disambiguate SFX tail anchors", () =>
{
    const known = new Map([
        [ 0, { type: 2 } ],
    ]);
    const ambiguousTail = new Writer()
        .u32(1)
        .u32(0)
        .u32(0)
        .u8(0)
        .bytes();

    assert.equal(CjsBnkFormat.wwise.parseSfxLayer(
        ambiguousTail,
        known,
        { bankVersion: 150 },
    ), null);

    const parsed = CjsBnkFormat.wwise.parseSfxLayer(
        Concat(NodeBase().bytes(), ambiguousTail),
        known,
        { bankVersion: 150 },
    );

    assert.deepEqual(parsed.children, [ 0 ]);
    assert.deepEqual(parsed.layers, []);
    assert.equal(parsed.continuousValidation, false);
});

test("decodes exact v150 Actor-Mixer NodeBase hierarchy facts", () =>
{
    const attenuationId = 0x11223344;
    const actor = NodeBase({
        overrideBusId: 77,
        directParentId: 88,
        properties: [
            { id: 0x00, float: -6 },
            { id: 0x01, float: 1200 },
            { id: 0x54, raw: 0 },
            { id: 0x55, raw: attenuationId },
        ],
        positioningFlags: 0x03,
        spatialFlags: 0x09,
    })
        .u32(2)
        .u32(SOUND_A)
        .u32(0xdeadbeef)
        .bytes();
    const parsed = CjsBnkFormat.wwise.parseSfxActorMixer(actor, {
        bankVersion: 150,
    });

    assert.equal(parsed.type, "actor-mixer");
    assert.deepEqual(parsed.children, [ SOUND_A, 0xdeadbeef ]);
    assert.equal(parsed.nodeBase.overrideBusId, 77);
    assert.equal(parsed.nodeBase.directParentId, 88);
    assert.equal(parsed.nodeBase.attenuationId, attenuationId);
    assert.equal(parsed.nodeBase.loopCount, 0);
    assert.equal(parsed.nodeBase.properties[0].floatValue, -6);
    assert.equal(
        parsed.nodeBase.properties[2].valueType,
        "loop-count",
    );
    assert.equal(parsed.nodeBase.properties[3].valueType, "id");
    assert.equal(parsed.nodeBase.positioning.overrideParent, true);
    assert.equal(parsed.nodeBase.positioning.listenerRelative, true);
    assert.equal(
        parsed.nodeBase.positioning.spatial.enableAttenuation,
        true,
    );

    assert.equal(CjsBnkFormat.wwise.parseSfxActorMixer(
        actor,
        { bankVersion: 154 },
    ), null);
    assert.equal(CjsBnkFormat.wwise.parseSfxActorMixer(
        actor.subarray(0, actor.byteLength - 1),
        { bankVersion: 150 },
    ), null);
    assert.equal(CjsBnkFormat.wwise.parseSfxActorMixer(
        Concat(actor, Uint8Array.of(0)),
        { bankVersion: 150 },
    ), null);
});

test("consumes v150 NodeBase positioning automation exactly", () =>
{
    const actor = NodeBase({
        positioningFlags: 0x23,
        spatialFlags: 0x09,
        automation: {
            pathMode: 2,
            transitionTime: 250,
            vertices: [
                { x: 1, y: 2, z: 3, duration: 100 },
            ],
            playlist: [
                { verticesOffset: 0, numVertices: 1 },
            ],
            ranges: [
                { x: 4, y: 5, z: 6 },
            ],
        },
    })
        .u32(0)
        .bytes();
    const parsed = CjsBnkFormat.wwise.parseSfxActorMixer(actor, {
        bankVersion: 150,
    });

    assert.equal(parsed.nodeBase.positioning.positionType, 1);
    assert.equal(parsed.nodeBase.positioning.automation.pathMode, 2);
    assert.deepEqual(
        parsed.nodeBase.positioning.automation.vertices[0],
        { x: 1, y: 2, z: 3, duration: 100 },
    );
    assert.deepEqual(
        parsed.nodeBase.positioning.automation.playlist[0],
        { verticesOffset: 0, numVertices: 1 },
    );
    assert.deepEqual(
        parsed.nodeBase.positioning.automation.ranges[0],
        { x: 4, y: 5, z: 6 },
    );
});

test("keeps alignment through nonempty v150 NodeBase branches", () =>
{
    const actor = new Writer()
        .u8(1).u8(1).u8(1)
        .u8(2).u32(100).u8(0x07)
        .u8(1).u8(1)
        .u8(3).u32(200).u8(1)
        .u32(77)
        .u32(88)
        .u8(0x03)
        .u8(0)
        .u8(1).u8(0x10).f32(-1).f32(2)
        .u8(0)
        .u8(0x1c)
        .u32(1).u32(2).u32(3).u32(4)
        .u32(5)
        .u8(0x1b).u8(2).u16(4).u8(3).u8(0x0f)
        .variable(1)
        .variable(130).u8(2).u8(1)
        .variable(1)
        .u32(300).u8(4).variable(1)
        .u32(301).u16(1).u16(130).f32(-3)
        .u16(1)
        .u32(400).u8(2).u8(3).variable(130)
        .u32(401).u8(4).u16(1)
        .point(0, 1, 4)
        .u32(0)
        .bytes();
    const parsed = CjsBnkFormat.wwise.parseSfxActorMixer(actor, {
        bankVersion: 150,
    });
    const base = parsed.nodeBase;

    assert.equal(base.fx.overrideParent, true);
    assert.equal(base.fx.bypassAll, true);
    assert.deepEqual(base.fx.slots[0], {
        index: 2,
        fxId: 100,
        flags: 0x07,
        bypass: true,
        shareSet: true,
        rendered: true,
    });
    assert.deepEqual(base.metadata.slots[0], {
        index: 3,
        fxId: 200,
        shareSetRaw: 1,
        shareSet: true,
    });
    assert.equal(base.ranges[0].id, 0x10);
    assert.equal(base.ranges[0].minFloat, -1);
    assert.equal(base.ranges[0].maxFloat, 2);
    assert.deepEqual(base.aux.auxIds, [ 1, 2, 3, 4 ]);
    assert.equal(base.aux.reflectionsAuxBusId, 5);
    assert.equal(base.advanced.maxInstances, 4);
    assert.equal(base.advanced.normalizeLoudness, true);
    assert.equal(base.state.properties[0].propertyId, 130);
    assert.deepEqual(base.state.groups[0].states[0].values, [
        {
            propertyId: 130,
            value: -3,
        },
    ]);
    assert.equal(base.rtpcs[0].parameterId, 130);
    assert.deepEqual(base.rtpcs[0].points[0], {
        from: 0,
        to: 1,
        interpolation: 4,
    });
});

test("skips v150 source-plugin parameters before a Sound NodeBase", () =>
{
    const payload = new Writer()
        .u32(0x00040002)
        .u8(0)
        .u32(9001)
        .u32(64)
        .u8(0)
        .u32(3)
        .u8(9).u8(8).u8(7)
        .append(NodeBase({ directParentId: 700 }).bytes())
        .bytes();
    const result = CjsBnkFormat.wwise.sfxNodesFromBanks([
        {
            source: "plugin.bnk",
            bankVersion: 150,
            hirc: [
                {
                    type: 2,
                    id: SOUND_A,
                    pluginId: 0x00040002,
                    pluginType: 2,
                    streamType: 0,
                    sourceId: 9001,
                    inMemoryMediaSize: 64,
                    sourceBits: 0,
                    payload,
                },
            ],
        },
    ]);

    assert.equal(result.nodes.get(SOUND_A).pluginType, 2);
    assert.equal(result.nodeBases.get(SOUND_A).directParentId, 700);
    assert.deepEqual(result.diagnostics.nodeBaseFailed, []);
});

test("decodes exact v150 attenuation objects without naming curve slots", () =>
{
    const minimal = Attenuation().bytes();
    const parsedMinimal = CjsBnkFormat.wwise.parseSfxAttenuation(
        minimal,
        { bankVersion: 150 },
    );

    assert.equal(minimal.byteLength, 24);
    assert.deepEqual(parsedMinimal.curveToUse, Array(19).fill(-1));
    assert.deepEqual(parsedMinimal.curves, []);
    assert.deepEqual(parsedMinimal.rtpcs, []);

    const rich = Attenuation({
        heightSpread: 1,
        cone: {
            insideDegrees: 60,
            outsideDegrees: 120,
            outsideVolume: -12,
            lowPass: 2,
            highPass: 3,
        },
        curveToUse: [ 0, ...Array(18).fill(-1) ],
        curves: [
            {
                scaling: 2,
                points: [
                    { from: 0, to: 1, interpolation: 4 },
                    { from: 100, to: 0, interpolation: 4 },
                ],
            },
        ],
    }).bytes();
    const parsed = CjsBnkFormat.wwise.parseSfxAttenuation(
        rich,
        { bankVersion: 150 },
    );

    assert.equal(parsed.heightSpread, true);
    assert.equal(parsed.cone.outsideVolume, -12);
    assert.equal(parsed.curveToUse[0], 0);
    assert.equal(parsed.curves[0].scaling, 2);
    assert.deepEqual(parsed.curves[0].points[1], {
        from: 100,
        to: 0,
        interpolation: 4,
    });
    assert.equal("maxDistance" in parsed, false);

    const signedSentinels = minimal.slice();
    signedSentinels[2] = 0xfe;
    assert.equal(CjsBnkFormat.wwise.parseSfxAttenuation(
        signedSentinels,
        { bankVersion: 150 },
    ).curveToUse[0], -2);

    const invalidScaling = rich.slice();
    invalidScaling[42] = 1;
    assert.equal(CjsBnkFormat.wwise.parseSfxAttenuation(
        invalidScaling,
        { bankVersion: 150 },
    ), null);

    assert.equal(CjsBnkFormat.wwise.parseSfxAttenuation(
        Concat(rich, Uint8Array.of(0)),
        { bankVersion: 150 },
    ), null);
    assert.equal(CjsBnkFormat.wwise.parseSfxAttenuation(
        rich,
        { bankVersion: 154 },
    ), null);
});

test("aggregates playback, hierarchy, NodeBase, and attenuation separately", () =>
{
    const randomPayload = Prefix()
        .u16(1).u16(0).u16(0)
        .f32(0).f32(0).f32(0)
        .u16(0)
        .u8(0).u8(0).u8(0).u8(0)
        .children(SOUND_A)
        .u16(1).u32(SOUND_A).s32(50)
        .bytes();
    const soundPayload = SoundPayload(NodeBase().bytes());
    const actorPayload = NodeBase({ directParentId: 7001 })
        .u32(1)
        .u32(SOUND_A)
        .bytes();
    const attenuationPayload = Attenuation().bytes();
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
                sourceBits: 0,
                payload: soundPayload,
            },
            {
                type: 5,
                id: 2001,
                payload: randomPayload,
            },
            {
                type: 7,
                id: 7001,
                payload: actorPayload,
            },
            {
                type: 14,
                id: 8001,
                payload: attenuationPayload,
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

    assert.equal(result.diagnostics.parsed, 4);
    assert.equal(result.diagnostics.failed.length, 0);
    assert.equal(result.diagnostics.nodeBaseFailed.length, 1);
    assert.equal(
        result.diagnostics.nodeBaseFailed[0].reason,
        "container NodeBase did not consume its exact byte range",
    );
    assert.equal(result.nodes.get(SOUND_A).pluginType, 1);
    assert.equal(result.nodes.get(2001).type, "random");
    assert.equal(result.nodes.has(7001), false);
    assert.equal(result.nodes.has(8001), false);
    assert.deepEqual(result.actorMixers.get(7001).children, [ SOUND_A ]);
    assert.equal(result.attenuations.get(8001).type, "attenuation");
    assert.equal(result.nodeBases.has(SOUND_A), true);
    assert.equal(result.nodeBases.has(7001), true);
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

    append(bytes)
    {
        this.values.push(...bytes);
        return this;
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

function NodeBase({
    overrideBusId = 0,
    directParentId = 0,
    properties = [],
    positioningFlags = 0,
    spatialFlags = 0,
    automation = null,
} = {})
{
    const writer = new Writer();

    writer
        .u8(0).u8(0)
        .u8(0).u8(0)
        .u32(overrideBusId)
        .u32(directParentId)
        .u8(0)
        .u8(properties.length);

    for (const property of properties)
    {
        writer.u8(property.id);
    }
    for (const property of properties)
    {
        if (property.raw !== undefined)
        {
            writer.u32(property.raw);
        }
        else
        {
            writer.f32(property.float);
        }
    }

    writer
        .u8(0)
        .u8(positioningFlags);

    if ((positioningFlags & 0x03) === 0x03)
    {
        writer.u8(spatialFlags);

        if (((positioningFlags >>> 5) & 0x03) !== 0)
        {
            const value = automation ?? {
                pathMode: 0,
                transitionTime: 0,
                vertices: [],
                playlist: [],
                ranges: [],
            };

            writer
                .u8(value.pathMode)
                .s32(value.transitionTime)
                .u32(value.vertices.length);

            for (const vertex of value.vertices)
            {
                writer
                    .f32(vertex.x)
                    .f32(vertex.y)
                    .f32(vertex.z)
                    .s32(vertex.duration);
            }

            writer.u32(value.playlist.length);

            for (const item of value.playlist)
            {
                writer.u32(item.verticesOffset).u32(item.numVertices);
            }
            for (const range of value.ranges)
            {
                writer.f32(range.x).f32(range.y).f32(range.z);
            }
        }
    }

    return writer
        .u8(0).u32(0)
        .u8(0).u8(0).u16(0).u8(0).u8(0)
        .variable(0)
        .variable(0)
        .u16(0);
}

function Attenuation({
    heightSpread = 0,
    cone = null,
    curveToUse = Array(19).fill(-1),
    curves = [],
} = {})
{
    const writer = new Writer()
        .u8(heightSpread)
        .u8(cone ? 1 : 0);

    if (cone)
    {
        writer
            .f32(cone.insideDegrees)
            .f32(cone.outsideDegrees)
            .f32(cone.outsideVolume)
            .f32(cone.lowPass)
            .f32(cone.highPass);
    }

    for (const index of curveToUse)
    {
        writer.u8(index);
    }

    writer.u8(curves.length);

    for (const curve of curves)
    {
        writer.u8(curve.scaling).u16(curve.points.length);

        for (const point of curve.points)
        {
            writer.point(point.from, point.to, point.interpolation);
        }
    }

    return writer.u16(0);
}

function SoundPayload(nodeBase)
{
    return new Writer()
        .u32(0x00040001)
        .u8(0)
        .u32(9001)
        .u32(64)
        .u8(0)
        .append(nodeBase)
        .bytes();
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
