import test from "node:test";
import assert from "node:assert/strict";
import {
    createBusEffectChain,
    indexBusEffectCatalog,
    parseGraphFeedbackFreeMeter,
    parseGraphSharedBusEffect,
    parseGraphStaticParametricEq,
    parseGraphStaticWwiseDelay,
    parseGraphStaticWwisePeakLimiter,
    parseStaticParametricEqBytes,
} from "../src/internal/busEffects.js";

function Effect(overrides = {})
{
    return {
        effectId: "900",
        slotIndex: 0,
        type: "parametric-eq",
        bands: [ {
            index: 0,
            filterType: "peaking",
            gainDb: -13,
            frequencyHz: 120,
            q: 5,
        } ],
        outputGainDb: 0,
        processLfe: true,
        ...overrides,
    };
}

function Catalog(effects = [ Effect() ])
{
    return {
        schemaVersion: 1,
        buses: { "500": effects },
    };
}

function Context()
{
    const context = {
        sampleRate: 48000,
        delays: [],
        filters: [],
        gains: [],
        createDelay(maxDelayTime)
        {
            const node = Node({
                delayTime: { value: 0 },
                maxDelayTime,
            });
            context.delays.push(node);
            return node;
        },
        createBiquadFilter()
        {
            const node = Node({
                type: "",
                frequency: { value: 0 },
                Q: { value: 0 },
                gain: { value: 0 },
            });
            context.filters.push(node);
            return node;
        },
        createGain()
        {
            const node = Node({ gain: { value: 1 } });
            context.gains.push(node);
            return node;
        },
    };
    return context;
}

function Node(fields)
{
    const node = {
        ...fields,
        connectedTo: null,
        connections: [],
        connect(target)
        {
            node.connections.push(target);
            node.connectedTo ??= target;
        },
    };
    return node;
}

function ParametricEqBytes({
    enabled = [ true, false, true ],
    processLfe = 1,
} = {})
{
    const bytes = new Uint8Array(56);
    const view = new DataView(bytes.buffer);
    const bands = [
        [ 6, -13, 120, 5 ],
        [ 0, 0, 8000, 0.707 ],
        [ 5, 3, 12000, 1 ],
    ];
    let at = 0;

    for (const [ index, values ] of bands.entries())
    {
        view.setUint32(at, values[0], true);
        view.setFloat32(at + 4, values[1], true);
        view.setFloat32(at + 8, values[2], true);
        view.setFloat32(at + 12, values[3], true);
        view.setUint8(at + 16, enabled[index] ? 1 : 0);
        at += 17;
    }
    view.setFloat32(at, -6, true);
    view.setUint8(at + 4, processLfe);
    return bytes;
}

function GraphEffect(bytes = ParametricEqBytes())
{
    return {
        type: "effect-share-set",
        pluginId: 0x00690003,
        parameterByteLength: bytes.byteLength,
        parametersBase64: Buffer.from(bytes).toString("base64"),
        media: [],
        controls: {
            rtpcCount: 0,
            statePropertyCount: 0,
            stateGroupCount: 0,
            propertyValueCount: 0,
        },
    };
}

function MeterBytes({
    attack = 0,
    release = 0.3,
    minimum = -48,
    maximum = 0,
    hold = 0,
    infiniteHold = 0,
    mode = 0,
    scope = 0,
    applyDownstreamVolume = 0,
    gameParameterId = 0,
} = {})
{
    const bytes = new Uint8Array(28);
    const view = new DataView(bytes.buffer);

    view.setFloat32(0, attack, true);
    view.setFloat32(4, release, true);
    view.setFloat32(8, minimum, true);
    view.setFloat32(12, maximum, true);
    view.setFloat32(16, hold, true);
    view.setUint8(20, infiniteHold);
    view.setUint8(21, mode);
    view.setUint8(22, scope);
    view.setUint8(23, applyDownstreamVolume);
    view.setUint32(24, gameParameterId, true);
    return bytes;
}

function GraphMeter(bytes = MeterBytes())
{
    const effect = GraphEffect(bytes);

    effect.pluginId = 0x00810003;
    return effect;
}

function DelayBytes({
    delayTimeSeconds = 0.5,
    feedbackPercent = 15,
    wetDryMixPercent = 25,
    outputGainDb = 0,
    feedbackEnabled = 1,
    processLfe = 1,
} = {})
{
    const bytes = new Uint8Array(18);
    const view = new DataView(bytes.buffer);

    view.setFloat32(0, delayTimeSeconds, true);
    view.setFloat32(4, feedbackPercent, true);
    view.setFloat32(8, wetDryMixPercent, true);
    view.setFloat32(12, outputGainDb, true);
    view.setUint8(16, feedbackEnabled);
    view.setUint8(17, processLfe);
    return bytes;
}

function GraphDelay(bytes = DelayBytes())
{
    const effect = GraphEffect(bytes);

    effect.type = "effect-custom";
    effect.pluginId = 0x006a0003;
    return effect;
}

function PeakLimiterBytes({
    thresholdDb = -1,
    ratio = 10,
    lookaheadSeconds = 0.01,
    releaseSeconds = 0.1,
    outputGainDb = 0,
    processLfe = 1,
    channelLink = 1,
} = {})
{
    const bytes = new Uint8Array(22);
    const view = new DataView(bytes.buffer);

    view.setFloat32(0, thresholdDb, true);
    view.setFloat32(4, ratio, true);
    view.setFloat32(8, lookaheadSeconds, true);
    view.setFloat32(12, releaseSeconds, true);
    view.setFloat32(16, outputGainDb, true);
    view.setUint8(20, processLfe);
    view.setUint8(21, channelLink);
    return bytes;
}

function GraphPeakLimiter(bytes = PeakLimiterBytes())
{
    const effect = GraphEffect(bytes);

    effect.pluginId = 0x006e0003;
    return effect;
}

test("indexes canonical static Parametric EQ catalogs in slot and band order", () =>
{
    const indexed = indexBusEffectCatalog(Catalog([
        Effect({
            effectId: "902",
            slotIndex: 2,
            bands: [
                {
                    index: 2,
                    filterType: "highshelf",
                    gainDb: 3,
                    frequencyHz: 12000,
                    q: 1,
                },
                {
                    index: 0,
                    filterType: "lowpass",
                    gainDb: 0,
                    frequencyHz: 8000,
                    q: 0.707,
                },
            ],
        }),
        Effect({ effectId: "901", slotIndex: 1 }),
    ]));

    assert.deepEqual(indexed.get("500").map(effect => effect.effectId), [
        "901",
        "902",
    ]);
    assert.deepEqual(indexed.get("500")[1].bands.map(band => band.index), [
        0,
        2,
    ]);
    assert.equal(Object.isFrozen(indexed.get("500")), true);
});

test("rejects malformed or unsupported bus-effect catalogs", () =>
{
    for (const mutate of [
        value => { value.schemaVersion = 2; },
        value => { value.buses["0500"] = value.buses["500"]; },
        value => { value.buses["500"] = []; },
        value => { value.buses["500"][0].effectId = "0900"; },
        value => { value.buses["500"][0].slotIndex = 4; },
        value => { value.buses["500"][0].type = "compressor"; },
        value => { value.buses["500"][0].bands[0].index = 3; },
        value => { value.buses["500"][0].bands[0].filterType = "allpass"; },
        value => { value.buses["500"][0].bands[0].frequencyHz = 0; },
        value => { value.buses["500"][0].bands[0].q = Infinity; },
        value => { value.buses["500"][0].outputGainDb = 201; },
        value => { value.buses["500"][0].processLfe = false; },
        value => { value.buses["500"].push(Effect()); },
        value => { value.buses["500"][0].bands.push({ ...value.buses["500"][0].bands[0] }); },
    ])
    {
        const value = Catalog();

        mutate(value);
        assert.throws(() => indexBusEffectCatalog(value));
    }
});

test("builds dry-route Parametric EQ nodes in bus, slot, and band order", () =>
{
    const context = Context();
    const indexed = indexBusEffectCatalog({
        schemaVersion: 1,
        buses: {
            "500": [ Effect({
                bands: [
                    {
                        index: 0,
                        filterType: "peaking",
                        gainDb: -13,
                        frequencyHz: 120,
                        q: 5,
                    },
                    {
                        index: 2,
                        filterType: "highshelf",
                        gainDb: 3,
                        frequencyHz: 96000,
                        q: 1,
                    },
                ],
                outputGainDb: -6,
            }) ],
            "1": [ Effect({
                effectId: "901",
                bands: [ {
                    index: 1,
                    filterType: "highpass",
                    gainDb: 0,
                    frequencyHz: 60,
                    q: 0.5,
                } ],
            }) ],
        },
    });
    const chain = createBusEffectChain(context, indexed, [ "500", "1" ]);

    assert.equal(chain.nodes.length, 4);
    assert.equal(chain.input, context.filters[0]);
    assert.equal(context.filters[0].type, "peaking");
    assert.equal(context.filters[0].frequency.value, 120);
    assert.equal(context.filters[0].Q.value, 5);
    assert.equal(context.filters[0].gain.value, -13);
    assert.equal(context.filters[1].frequency.value, 24000, "frequency clamps to Nyquist");
    assert.equal(context.filters[0].connectedTo, context.filters[1]);
    assert.equal(context.filters[1].connectedTo, context.gains[0]);
    assert.ok(Math.abs(context.gains[0].gain.value - 10 ** (-6 / 20)) < 1e-12);
    assert.equal(context.gains[0].connectedTo, context.filters[2]);
    assert.equal(chain.output, context.filters[2]);
});

test("skips authored-neutral Parametric EQ without allocating Web Audio nodes", () =>
{
    const context = Context();
    const indexed = indexBusEffectCatalog(Catalog([
        Effect({ bands: [], outputGainDb: 0 }),
    ]));

    assert.equal(createBusEffectChain(context, indexed, [ "500" ]), null);
    assert.equal(context.filters.length, 0);
    assert.equal(context.gains.length, 0);
});

test("builds one static Wwise Delay split and feedback loop", () =>
{
    const context = Context();
    const delay = parseGraphStaticWwiseDelay(GraphDelay(DelayBytes({
        delayTimeSeconds: 1,
        feedbackPercent: 45,
        wetDryMixPercent: 75,
        outputGainDb: -6,
    })), "920", 3);
    const chain = createBusEffectChain(
        context,
        new Map([ [ "500", [ delay ] ] ]),
        [ "500" ],
    );
    const [ input, dry, wet, output, feedback ] = context.gains;
    const [ delayNode ] = context.delays;

    assert.equal(chain.input, input);
    assert.equal(chain.output, output);
    assert.equal(chain.nodes.length, 6);
    assert.equal(delayNode.maxDelayTime, 1);
    assert.equal(delayNode.delayTime.value, 1);
    assert.equal(dry.gain.value, 0.25);
    assert.equal(wet.gain.value, 0.75);
    assert.ok(Math.abs(output.gain.value - 10 ** (-6 / 20)) < 1e-12);
    assert.equal(feedback.gain.value, 0.45);
    assert.deepEqual(input.connections, [ dry, delayNode ]);
    assert.deepEqual(delayNode.connections, [ wet, feedback ]);
    assert.deepEqual(feedback.connections, [ delayNode ]);
    assert.deepEqual(dry.connections, [ output ]);
    assert.deepEqual(wet.connections, [ output ]);
});

test("keeps Meter, Wwise Delay, and Parametric EQ in authored order", () =>
{
    const context = Context();
    const meter = parseGraphFeedbackFreeMeter(GraphMeter(), "910", 0);
    const delay = parseGraphStaticWwiseDelay(GraphDelay(), "920", 1);
    const eq = Effect({ slotIndex: 2 });
    const chain = createBusEffectChain(
        context,
        new Map([ [ "500", [ meter, delay, eq ] ] ]),
        [ "500" ],
    );
    const delayInput = context.gains[0];
    const delayOutput = context.gains[3];

    assert.equal(chain.input, delayInput, "the omitted Meter allocates no node");
    assert.deepEqual(
        delayInput.connections,
        [ context.gains[1], context.delays[0] ],
    );
    assert.equal(delayOutput.connectedTo, context.filters[0]);
    assert.equal(chain.output, context.filters[0]);
});

test("decodes the source-proven v150 static Parametric EQ parameter layout", () =>
{
    const effect = parseStaticParametricEqBytes(ParametricEqBytes(), {
        effectId: "900",
        slotIndex: 2,
    });

    assert.equal(effect.effectId, "900");
    assert.equal(effect.slotIndex, 2);
    assert.deepEqual(effect.bands.map(band => [
        band.index,
        band.filterType,
        band.gainDb,
        band.frequencyHz,
        band.q,
    ]), [
        [ 0, "peaking", -13, 120, 5 ],
        [ 2, "highshelf", 3, 12000, 1 ],
    ]);
    assert.equal(effect.outputGainDb, -6);
    assert.equal(effect.processLfe, true);

    assert.deepEqual(
        parseGraphStaticParametricEq(GraphEffect(), "900", 2),
        effect,
    );
});

test("rejects malformed or dynamic portable-graph Parametric EQ effects", () =>
{
    const mutations = [
        effect => { effect.pluginId = 0x006c0003; },
        effect => { effect.parameterByteLength = 55; },
        effect => { effect.media.push({ index: 0, sourceId: "10" }); },
        effect => { effect.controls.rtpcCount = 1; },
        effect => { effect.controls.statePropertyCount = 1; },
        effect => { effect.controls.stateGroupCount = 1; },
        effect => { effect.controls.propertyValueCount = 1; },
        effect =>
        {
            const bytes = ParametricEqBytes({ processLfe: 0 });
            effect.parametersBase64 = Buffer.from(bytes).toString("base64");
        },
        effect =>
        {
            const bytes = ParametricEqBytes();
            bytes[16] = 2;
            effect.parametersBase64 = Buffer.from(bytes).toString("base64");
        },
        effect =>
        {
            const bytes = ParametricEqBytes();
            new DataView(bytes.buffer).setUint32(0, 7, true);
            effect.parametersBase64 = Buffer.from(bytes).toString("base64");
        },
    ];

    for (const mutate of mutations)
    {
        const effect = GraphEffect();

        mutate(effect);
        assert.throws(() =>
            parseGraphStaticParametricEq(effect, "900", 0));
    }
});

test("decodes only static source-proven v150 Wwise Delay parameters", () =>
{
    const effect = parseGraphStaticWwiseDelay(GraphDelay(DelayBytes({
        delayTimeSeconds: 1,
        feedbackPercent: 60,
        wetDryMixPercent: 100,
        feedbackEnabled: 0,
    })), "920", 2);

    assert.deepEqual(effect, {
        effectId: "920",
        slotIndex: 2,
        type: "delay",
        delayTimeSeconds: 1,
        feedbackPercent: 60,
        wetDryMixPercent: 100,
        outputGainDb: 0,
        feedbackEnabled: false,
        processLfe: true,
    });
    const context = Context();
    const chain = createBusEffectChain(
        context,
        new Map([ [ "500", [ effect ] ] ]),
        [ "500" ],
    );

    assert.equal(chain.nodes.length, 5, "disabled feedback allocates no loop gain");
    assert.equal(context.gains.length, 4);
    assert.deepEqual(context.delays[0].connections, [ context.gains[2] ]);
});

test("rejects dynamic, malformed, or independently routed Wwise Delays", () =>
{
    const mutations = [
        effect => { effect.pluginId = 0x006b0003; },
        effect => { effect.parameterByteLength = 17; },
        effect => { effect.media.push({ index: 0, sourceId: "10" }); },
        effect => { effect.controls.rtpcCount = 1; },
        effect => { effect.controls.statePropertyCount = 1; },
        effect => { effect.controls.stateGroupCount = 1; },
        effect => { effect.controls.propertyValueCount = 1; },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(DelayBytes({
                delayTimeSeconds: 0,
            })).toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(DelayBytes({
                feedbackPercent: 101,
            })).toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(DelayBytes({
                wetDryMixPercent: -1,
            })).toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(DelayBytes({
                outputGainDb: 0.1,
            })).toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(DelayBytes({
                feedbackEnabled: 2,
            })).toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(DelayBytes({
                processLfe: 0,
            })).toString("base64");
        },
    ];

    for (const mutate of mutations)
    {
        const effect = GraphDelay();

        mutate(effect);
        assert.throws(() =>
            parseGraphStaticWwiseDelay(effect, "920", 0));
    }
});

test("decodes the source-proven v150 static Wwise Peak Limiter layout", () =>
{
    const effect = parseGraphStaticWwisePeakLimiter(
        GraphPeakLimiter(),
        "3134687450",
        3,
    );

    assert.deepEqual(effect, {
        effectId: "3134687450",
        slotIndex: 3,
        type: "peak-limiter",
        thresholdDb: -1,
        ratio: 10,
        lookaheadSeconds: Math.fround(0.01),
        releaseSeconds: Math.fround(0.1),
        outputGainDb: 0,
        processLfe: true,
        channelLink: true,
    });
    assert.throws(
        () => parseGraphSharedBusEffect(
            GraphPeakLimiter(),
            "3134687450",
            3,
        ),
        /unsupported/u,
        "decoding must not admit a Peak Limiter to exact playback",
    );
    assert.deepEqual(
        parseGraphStaticWwisePeakLimiter(GraphPeakLimiter(PeakLimiterBytes({
            thresholdDb: -96.3,
            ratio: 50,
            lookaheadSeconds: 0.001,
            releaseSeconds: 0.5,
            outputGainDb: 24,
            processLfe: 0,
            channelLink: 0,
        })), "930", 0),
        {
            effectId: "930",
            slotIndex: 0,
            type: "peak-limiter",
            thresholdDb: Math.fround(-96.3),
            ratio: 50,
            lookaheadSeconds: Math.fround(0.001),
            releaseSeconds: 0.5,
            outputGainDb: 24,
            processLfe: false,
            channelLink: false,
        },
    );
});

test("rejects dynamic or malformed Wwise Peak Limiter parameter blocks", () =>
{
    const mutations = [
        effect => { effect.pluginId = 0x006c0003; },
        effect => { effect.parameterByteLength = 21; },
        effect => { effect.media.push({ index: 0, sourceId: "10" }); },
        effect => { effect.controls.rtpcCount = 1; },
        effect => { effect.controls.statePropertyCount = 1; },
        effect => { effect.controls.stateGroupCount = 1; },
        effect => { effect.controls.propertyValueCount = 1; },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(PeakLimiterBytes({
                thresholdDb: -97,
            })).toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(PeakLimiterBytes({
                ratio: 50.1,
            })).toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(PeakLimiterBytes({
                lookaheadSeconds: 0,
            })).toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(PeakLimiterBytes({
                releaseSeconds: 0.501,
            })).toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(PeakLimiterBytes({
                outputGainDb: -24.1,
            })).toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(PeakLimiterBytes({
                processLfe: 2,
            })).toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(PeakLimiterBytes({
                channelLink: 2,
            })).toString("base64");
        },
    ];

    for (const mutate of mutations)
    {
        const effect = GraphPeakLimiter();

        mutate(effect);
        assert.throws(() =>
            parseGraphStaticWwisePeakLimiter(effect, "930", 0));
    }
});

test("decodes only feedback-free v150 Wwise Meters as audio-transparent omissions", () =>
{
    const effect = parseGraphFeedbackFreeMeter(GraphMeter(), "910", 3);
    const floor = parseGraphFeedbackFreeMeter(GraphMeter(MeterBytes({
        minimum: -96.3,
        maximum: -96.3,
    })), "911", 0);

    assert.deepEqual(effect, {
        effectId: "910",
        slotIndex: 3,
        type: "meter-omission",
        attack: 0,
        release: Math.fround(0.3),
        minimum: -48,
        maximum: 0,
        hold: 0,
        infiniteHold: false,
        mode: "peak",
        scope: "global",
        applyDownstreamVolume: false,
        gameParameterId: 0,
    });
    assert.equal(floor.minimum, Math.fround(-96.3));
    assert.equal(floor.maximum, Math.fround(-96.3));
});

test("rejects dynamic, feedback-capable, or malformed Wwise Meters", () =>
{
    const mutations = [
        effect => { effect.type = "unknown-effect"; },
        effect => { effect.parameterByteLength = 27; },
        effect =>
        {
            const bytes = new Uint8Array(29);

            bytes.set(MeterBytes());
            effect.parametersBase64 = Buffer.from(bytes).toString("base64");
        },
        effect => { effect.media.push({ index: 0, sourceId: "10" }); },
        effect => { effect.controls.rtpcCount = 1; },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(MeterBytes({
                applyDownstreamVolume: 1,
            })).toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(MeterBytes({
                gameParameterId: 1312763804,
            })).toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(MeterBytes({ mode: 2 }))
                .toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(MeterBytes({ scope: 2 }))
                .toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(MeterBytes({ attack: 10.1 }))
                .toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(MeterBytes({ minimum: -97 }))
                .toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(MeterBytes({ maximum: 13 }))
                .toString("base64");
        },
    ];

    for (const mutate of mutations)
    {
        const effect = GraphMeter();

        mutate(effect);
        assert.throws(() =>
            parseGraphFeedbackFreeMeter(effect, "910", 0));
    }
});
