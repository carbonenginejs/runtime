import test from "node:test";
import assert from "node:assert/strict";
import {
    createBusEffectChain,
    createWwiseEffectChain,
    indexBusEffectCatalog,
    normalizeStaticSourceEffectChain,
    normalizeWwiseDynamicsMode,
    normalizeWwiseDistortionMode,
    normalizeWwiseModulationMode,
    normalizeWwiseMeterFeedbackMode,
    normalizeWwiseVoiceLimitMode,
    parseGraphFeedbackFreeMeter,
    parseGraphSharedBusEffect,
    parseGraphStaticWwiseCompressor,
    parseGraphStaticParametricEq,
    parseGraphStaticWwiseDelay,
    parseGraphStaticWwiseFlanger,
    parseGraphStaticWwiseGuitarDistortion,
    parseGraphStaticWwiseTremolo,
    parseGraphStaticWwisePeakLimiter,
    parseStaticParametricEqBytes,
    parseStaticWwiseDelayBytes,
    parseStaticWwiseGuitarDistortionBytes,
    parseStaticWwiseTremoloBytes,
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
        compressors: [],
        filters: [],
        gains: [],
        oscillators: [],
        waveShapers: [],
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
        createDynamicsCompressor()
        {
            const node = Node({
                threshold: { value: 0 },
                knee: { value: 30 },
                ratio: { value: 12 },
                attack: { value: 0.003 },
                release: { value: 0.25 },
            });
            context.compressors.push(node);
            return node;
        },
        createGain()
        {
            const node = Node({ gain: { value: 1 } });
            context.gains.push(node);
            return node;
        },
        createOscillator()
        {
            const node = Node({
                type: "",
                frequency: { value: 0 },
                starts: [],
                stops: [],
                start(at) { node.starts.push(at); },
                stop(at) { node.stops.push(at); },
            });
            context.oscillators.push(node);
            return node;
        },
        createWaveShaper()
        {
            const node = Node({ curve: null, oversample: "none" });
            context.waveShapers.push(node);
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

function CompressorBytes({
    thresholdDb = -18,
    ratio = 20.1,
    attackSeconds = 0.03,
    releaseSeconds = 0.25,
    outputGainDb = 3,
    processLfe = 1,
    channelLink = 1,
} = {})
{
    const bytes = new Uint8Array(22);
    const view = new DataView(bytes.buffer);

    view.setFloat32(0, thresholdDb, true);
    view.setFloat32(4, ratio, true);
    view.setFloat32(8, attackSeconds, true);
    view.setFloat32(12, releaseSeconds, true);
    view.setFloat32(16, outputGainDb, true);
    view.setUint8(20, processLfe);
    view.setUint8(21, channelLink);
    return bytes;
}

function GraphCompressor(bytes = CompressorBytes())
{
    const effect = GraphEffect(bytes);

    effect.pluginId = 0x006c0003;
    return effect;
}

function FlangerBytes({
    delayTimeMs = 12.3,
    blend = 1,
    feedforward = 1,
    feedback = 0.5,
    modulationDepthPercent = 33.2,
    modulationFrequencyHz = 0.42,
    waveform = 0,
    smoothingPercent = 52,
    pwmPercent = 50,
    phaseOffsetDegrees = 0,
    phaseMode = 0,
    phaseSpreadDegrees = 0,
    outputGainDb = 0,
    wetDryMixPercent = 100,
    lfoEnabled = 1,
    processCenter = 0,
    processLfe = 0,
} = {})
{
    const bytes = new Uint8Array(59);
    const view = new DataView(bytes.buffer);

    view.setFloat32(0, delayTimeMs, true);
    view.setFloat32(4, blend, true);
    view.setFloat32(8, feedforward, true);
    view.setFloat32(12, feedback, true);
    view.setFloat32(16, modulationDepthPercent, true);
    view.setFloat32(20, modulationFrequencyHz, true);
    view.setUint32(24, waveform, true);
    view.setFloat32(28, smoothingPercent, true);
    view.setFloat32(32, pwmPercent, true);
    view.setFloat32(36, phaseOffsetDegrees, true);
    view.setUint32(40, phaseMode, true);
    view.setFloat32(44, phaseSpreadDegrees, true);
    view.setFloat32(48, outputGainDb, true);
    view.setFloat32(52, wetDryMixPercent, true);
    view.setUint8(56, lfoEnabled);
    view.setUint8(57, processCenter);
    view.setUint8(58, processLfe);
    return bytes;
}

function GraphFlanger(bytes = FlangerBytes())
{
    const effect = GraphEffect(bytes);

    effect.pluginId = 0x007d0003;
    return effect;
}

function TremoloBytes({
    modulationDepthPercent = 100,
    modulationFrequencyHz = 1,
    waveform = 0,
    smoothingPercent = 0,
    pwmPercent = 50,
    phaseOffsetDegrees = 0,
    phaseMode = 0,
    phaseSpreadDegrees = 0,
    outputGainDb = 0,
    processCenter = 1,
    processLfe = 1,
} = {})
{
    const bytes = new Uint8Array(38);
    const view = new DataView(bytes.buffer);

    view.setFloat32(0, modulationDepthPercent, true);
    view.setFloat32(4, modulationFrequencyHz, true);
    view.setUint32(8, waveform, true);
    view.setFloat32(12, smoothingPercent, true);
    view.setFloat32(16, pwmPercent, true);
    view.setFloat32(20, phaseOffsetDegrees, true);
    view.setUint32(24, phaseMode, true);
    view.setFloat32(28, phaseSpreadDegrees, true);
    view.setFloat32(32, outputGainDb, true);
    view.setUint8(36, processCenter);
    view.setUint8(37, processLfe);
    return bytes;
}

function GraphTremolo(bytes = TremoloBytes())
{
    const effect = GraphEffect(bytes);

    effect.pluginId = 0x00830003;
    return effect;
}

function GuitarDistortionBytes({
    drivePercent = 34,
    distortionType = 2,
    firstPostGainDb = 4.5,
    preEqEnabled = false,
    tonePercent = 0,
    rectificationPercent = 0,
    outputGainDb = 0,
    wetDryMixPercent = 100,
} = {})
{
    const bytes = new Uint8Array(126);
    const view = new DataView(bytes.buffer);
    const bands = [
        [ 1, 3.5, 83, 1, preEqEnabled ],
        [ 1, -4.5, 347, Math.fround(0.1), false ],
        [ 0, 0, 1000, 1, false ],
        [ 1, firstPostGainDb, 83, 1, true ],
        [ 1, -4.5, 1359, 1.5, true ],
        [ 0, 0, 1000, 1, false ],
    ];
    let at = 0;

    for (const [ type, gain, frequency, q, enabled ] of bands)
    {
        view.setUint32(at, type, true);
        view.setFloat32(at + 4, gain, true);
        view.setFloat32(at + 8, frequency, true);
        view.setFloat32(at + 12, q, true);
        view.setUint8(at + 16, enabled ? 1 : 0);
        at += 17;
    }
    view.setUint32(at, distortionType, true);
    view.setFloat32(at + 4, drivePercent, true);
    view.setFloat32(at + 8, tonePercent, true);
    view.setFloat32(at + 12, rectificationPercent, true);
    view.setFloat32(at + 16, outputGainDb, true);
    view.setFloat32(at + 20, wetDryMixPercent, true);
    return bytes;
}

function GraphGuitarDistortion(bytes = GuitarDistortionBytes())
{
    const effect = GraphEffect(bytes);

    effect.type = "effect-custom";
    effect.pluginId = 0x007e0003;
    effect.bankVersion = 150;
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

test("normalizes static Wwise Delay only for source effect chains", () =>
{
    const delay = parseStaticWwiseDelayBytes(DelayBytes({
        delayTimeSeconds: 0.28,
        feedbackPercent: 32,
        wetDryMixPercent: 30.5,
    }), {
        effectId: "2464647643",
        slotIndex: 0,
    });
    const normalized = normalizeStaticSourceEffectChain(
        [ delay ],
        "Audio source",
    );

    assert.deepEqual(normalized, [ delay ]);
    assert.throws(
        () => indexBusEffectCatalog(Catalog([ delay ])),
        /unsupported type delay/u,
        "legacy distributed Bus catalogs remain EQ-only",
    );
});

test("normalizes source Compressors and realizes them only through opt-in", () =>
{
    const decoded = parseGraphStaticWwiseCompressor(
        GraphCompressor(),
        "4243759709",
        1,
    );
    const compressor = { ...decoded, type: "compressor" };
    const normalized = normalizeStaticSourceEffectChain(
        [ compressor ],
        "Audio source",
    );

    assert.deepEqual(normalized, [ compressor ]);
    assert.equal(
        createWwiseEffectChain(Context(), normalized),
        null,
        "strict playback keeps the existing complete-chain dry fallback",
    );
    const context = Context();
    const chain = createWwiseEffectChain(context, normalized, {
        wwiseDynamics: "approximate-web-audio",
    });

    assert.equal(chain.input, context.compressors[0]);
    assert.equal(context.compressors[0].threshold.value, -18);
    assert.equal(context.compressors[0].ratio.value, 20);
    assert.equal(chain.output, context.gains[0]);
    assert.equal(
        createWwiseEffectChain({}, normalized, {
            wwiseDynamics: "approximate-web-audio",
        }),
        null,
        "missing browser primitives retain audible dry playback",
    );
});

test("normalizes source Peak Limiters and reuses the opt-in dynamics stage", () =>
{
    const decoded = parseGraphStaticWwisePeakLimiter(
        GraphPeakLimiter(),
        "754157063",
        0,
    );
    const limiter = { ...decoded, type: "peak-limiter" };
    const normalized = normalizeStaticSourceEffectChain(
        [ limiter ],
        "Audio source",
    );

    assert.deepEqual(normalized, [ limiter ]);
    assert.equal(createWwiseEffectChain(Context(), normalized), null);
    const context = Context();
    const chain = createWwiseEffectChain(context, normalized, {
        wwiseDynamics: "approximate-web-audio",
    });

    assert.equal(chain.input, context.compressors[0]);
    assert.equal(context.compressors[0].threshold.value, -1);
    assert.equal(context.compressors[0].attack.value, 0);
    assert.equal(chain.output, context.delays[0]);
    assert.ok(
        Math.abs(context.delays[0].delayTime.value - 0.004) < 1e-8,
    );
    const mixed = normalizeStaticSourceEffectChain([ limiter, {
        effectId: "900",
        slotIndex: 1,
        type: "parametric-eq",
        bands: [ {
            index: 0,
            filterType: "peaking",
            gainDb: -3,
            frequencyHz: 1000,
            q: 1,
        } ],
        outputGainDb: 0,
        processLfe: true,
    } ], "Audio source");
    const strict = Context();

    assert.equal(createWwiseEffectChain(strict, mixed), null);
    assert.equal(strict.compressors.length, 0);
    assert.equal(strict.filters.length, 0);
    const unavailable = Context();

    delete unavailable.createDelay;
    assert.equal(
        createWwiseEffectChain(unavailable, mixed, {
            wwiseDynamics: "approximate-web-audio",
        }),
        null,
        "missing lookahead padding omits the whole chain and stays dry",
    );
    assert.equal(unavailable.compressors.length, 0);
    assert.equal(unavailable.filters.length, 0);
});

test("decodes and realizes only the opted-in static Wwise Flanger subset", () =>
{
    const decoded = parseGraphStaticWwiseFlanger(
        GraphFlanger(),
        "2906410516",
        0,
    );
    const normalized = normalizeStaticSourceEffectChain(
        [ decoded ],
        "Audio source",
    );

    assert.deepEqual(decoded, {
        effectId: "2906410516",
        slotIndex: 0,
        type: "flanger",
        delayTimeSeconds: Math.fround(12.3) / 1000,
        blend: 1,
        feedforward: 1,
        feedback: 0.5,
        modulationDepthPercent: Math.fround(33.2),
        modulationFrequencyHz: Math.fround(0.42),
        outputGainDb: 0,
        wetDryMixPercent: 100,
        lfoEnabled: true,
        processCenter: false,
        processLfe: false,
    });
    assert.equal(createWwiseEffectChain(Context(), normalized), null);
    const context = Context();
    const chain = createWwiseEffectChain(context, normalized, {
        wwiseModulation: "approximate-web-audio",
    });
    const [ input, dry, blend, feedforward, feedback, wet, output, depth ] =
        context.gains;
    const [ delay ] = context.delays;
    const [ oscillator ] = context.oscillators;
    const delayRange = decoded.delayTimeSeconds
        * decoded.modulationDepthPercent / 100;

    assert.equal(chain.input, input);
    assert.equal(chain.output, output);
    assert.equal(delay.delayTime.value, decoded.delayTimeSeconds);
    assert.equal(delay.maxDelayTime, decoded.delayTimeSeconds + delayRange);
    assert.equal(dry.gain.value, 0);
    assert.equal(blend.gain.value, 1);
    assert.equal(feedforward.gain.value, 1);
    assert.equal(feedback.gain.value, 0.5);
    assert.equal(wet.gain.value, 1);
    assert.equal(output.gain.value, 1);
    assert.equal(oscillator.type, "sine");
    assert.equal(oscillator.frequency.value, decoded.modulationFrequencyHz);
    assert.equal(depth.gain.value, delayRange);
    assert.deepEqual(input.connections, [ dry, blend, delay ]);
    assert.deepEqual(delay.connections, [ feedforward, feedback ]);
    assert.equal(depth.connectedTo, delay.delayTime);

    const unavailable = Context();

    delete unavailable.createOscillator;
    assert.equal(createWwiseEffectChain(unavailable, normalized, {
        wwiseModulation: "approximate-web-audio",
    }), null);
    assert.equal(unavailable.gains.length, 0);
    assert.equal(unavailable.delays.length, 0);
});

test("validates Flanger policy, exact shape, and fixed-delay LFO omission", () =>
{
    assert.equal(normalizeWwiseModulationMode(), "strict");
    assert.equal(
        normalizeWwiseModulationMode("approximate-web-audio"),
        "approximate-web-audio",
    );
    assert.throws(
        () => normalizeWwiseModulationMode("web-audio"),
        /Unsupported Wwise modulation realization mode/u,
    );
    for (const parameters of [
        { delayTimeMs: 0.1 },
        { blend: 1.1 },
        { feedforward: -1.1 },
        { feedback: 1.1 },
        { modulationDepthPercent: 101 },
        { modulationFrequencyHz: 0.01 },
        { waveform: 1 },
        { smoothingPercent: 101 },
        { pwmPercent: -1 },
        { phaseOffsetDegrees: 1 },
        { phaseMode: 1 },
        { phaseSpreadDegrees: 1 },
        { outputGainDb: 25 },
        { wetDryMixPercent: 101 },
        { lfoEnabled: 2 },
        { processCenter: 2 },
        { processLfe: 2 },
    ])
    {
        assert.throws(() => parseGraphStaticWwiseFlanger(
            GraphFlanger(FlangerBytes(parameters)),
            "900",
            0,
        ));
    }

    const fixed = parseGraphStaticWwiseFlanger(GraphFlanger(FlangerBytes({
        lfoEnabled: 0,
    })), "290827855", 0);
    const context = Context();

    delete context.createOscillator;
    assert.ok(createWwiseEffectChain(context, [ fixed ], {
        wwiseModulation: "approximate-web-audio",
    }));
    assert.equal(context.oscillators.length, 0);
});

test("decodes and realizes only the empirical static Wwise Tremolo subset", () =>
{
    const decoded = parseGraphStaticWwiseTremolo(
        GraphTremolo(),
        "2196086003",
        1,
    );
    const normalized = normalizeStaticSourceEffectChain(
        [ decoded ],
        "Audio source",
    );

    assert.deepEqual(decoded, {
        effectId: "2196086003",
        slotIndex: 1,
        type: "tremolo",
        modulationDepthPercent: 100,
        modulationFrequencyHz: 1,
        outputGainDb: 0,
        processCenter: true,
        processLfe: true,
    });
    assert.equal(createWwiseEffectChain(Context(), normalized), null);
    const context = Context();
    const chain = createWwiseEffectChain(context, normalized, {
        wwiseModulation: "approximate-web-audio",
    });
    const [ input, output, depth ] = context.gains;
    const [ oscillator ] = context.oscillators;

    assert.equal(chain.input, input);
    assert.equal(chain.output, output);
    assert.equal(input.gain.value, 0.5);
    assert.equal(output.gain.value, 1);
    assert.equal(input.connectedTo, output);
    assert.equal(oscillator.type, "sine");
    assert.equal(oscillator.frequency.value, 1);
    assert.equal(depth.gain.value, 0.5);
    assert.equal(depth.connectedTo, input.gain);

    const unavailable = Context();

    delete unavailable.createOscillator;
    assert.equal(createWwiseEffectChain(unavailable, normalized, {
        wwiseModulation: "approximate-web-audio",
    }), null);
    assert.equal(unavailable.gains.length, 0);
    assert.equal(createWwiseEffectChain(Context(), [ {
        ...decoded,
        processLfe: false,
    } ], {
        wwiseModulation: "approximate-web-audio",
    }), null);

    const unavailableEq = Context();
    const equalizer = parseGraphStaticParametricEq(
        GraphEffect(),
        "900",
        2,
    );

    delete unavailableEq.createBiquadFilter;
    assert.equal(createWwiseEffectChain(
        unavailableEq,
        [ decoded, equalizer ],
        { wwiseModulation: "approximate-web-audio" },
    ), null);
    assert.equal(unavailableEq.gains.length, 0);
    assert.equal(unavailableEq.oscillators.length, 0);
    assert.equal(unavailableEq.filters.length, 0);
});

test("validates the bounded Tremolo shape and omits a zero-depth LFO", () =>
{
    assert.throws(() => parseStaticWwiseTremoloBytes(
        TremoloBytes(),
        { effectId: "900", slotIndex: 0, bankVersion: 151 },
    ), /unsupported parameter block/u);

    for (const parameters of [
        { modulationDepthPercent: 101 },
        { modulationFrequencyHz: 0.01 },
        { waveform: 1 },
        { smoothingPercent: 101 },
        { pwmPercent: -1 },
        { phaseOffsetDegrees: 1 },
        { phaseMode: 1 },
        { phaseSpreadDegrees: 1 },
        { outputGainDb: 25 },
        { processCenter: false },
        { processLfe: false },
        { processCenter: 2 },
        { processLfe: 2 },
    ])
    {
        assert.throws(() => parseGraphStaticWwiseTremolo(
            GraphTremolo(TremoloBytes(parameters)),
            "900",
            0,
        ));
    }

    const fixed = parseGraphStaticWwiseTremolo(GraphTremolo(TremoloBytes({
        modulationDepthPercent: 0,
    })), "901", 0);
    const context = Context();

    delete context.createOscillator;
    assert.ok(createWwiseEffectChain(context, [ fixed ], {
        wwiseModulation: "approximate-web-audio",
    }));
    assert.equal(context.oscillators.length, 0);
});

test("decodes and explicitly approximates static EVE Guitar Distortion", () =>
{
    assert.equal(normalizeWwiseDistortionMode(), "strict");
    assert.equal(
        normalizeWwiseDistortionMode("approximate-web-audio"),
        "approximate-web-audio",
    );
    assert.throws(
        () => normalizeWwiseDistortionMode("web-audio"),
        /Unsupported Wwise distortion realization mode/u,
    );
    const decoded = parseGraphStaticWwiseGuitarDistortion(
        GraphGuitarDistortion(),
        "168001308",
        2,
    );
    const normalized = normalizeStaticSourceEffectChain(
        [ decoded ],
        "Audio source",
    );

    assert.deepEqual(decoded, {
        effectId: "168001308",
        slotIndex: 2,
        type: "guitar-distortion",
        preEqBands: [],
        postEqBands: [
            {
                index: 0,
                filterType: "peaking",
                gainDb: 4.5,
                frequencyHz: 83,
                q: 1,
            },
            {
                index: 1,
                filterType: "peaking",
                gainDb: -4.5,
                frequencyHz: 1359,
                q: 1.5,
            },
        ],
        distortionType: "heavy",
        drivePercent: 34,
        tonePercent: 0,
        rectificationPercent: 0,
        outputGainDb: 0,
        wetDryMixPercent: 100,
    });
    assert.equal(createWwiseEffectChain(Context(), normalized), null);
    const context = Context();
    const chain = createWwiseEffectChain(context, normalized, {
        wwiseDistortion: "approximate-web-audio",
    });
    const [ shaper ] = context.waveShapers;
    const [ lowPeak, highPeak ] = context.filters;

    assert.equal(chain.input, shaper);
    assert.equal(chain.output, highPeak);
    assert.equal(shaper.oversample, "4x");
    assert.equal(shaper.curve.length, 4096);
    assert.equal(shaper.curve[0], -1);
    assert.equal(shaper.curve.at(-1), 1);
    assert.ok(shaper.curve[2047] < 0);
    assert.ok(shaper.curve[2048] > 0);
    assert.ok(shaper.curve[1024] < shaper.curve[2048]);
    assert.equal(shaper.connectedTo, lowPeak);
    assert.equal(lowPeak.connectedTo, highPeak);
    assert.equal(lowPeak.type, "peaking");
    assert.equal(lowPeak.gain.value, 4.5);
    assert.equal(lowPeak.frequency.value, 83);
    assert.equal(lowPeak.Q.value, 1);
    assert.equal(highPeak.type, "peaking");
    assert.equal(highPeak.gain.value, -4.5);
    assert.equal(highPeak.frequency.value, 1359);
    assert.equal(highPeak.Q.value, 1.5);

    for (const missing of [ "createWaveShaper", "createBiquadFilter" ])
    {
        const unavailable = Context();

        delete unavailable[missing];
        assert.equal(createWwiseEffectChain(unavailable, normalized, {
            wwiseDistortion: "approximate-web-audio",
        }), null);
        assert.equal(unavailable.waveShapers.length, 0);
        assert.equal(unavailable.filters.length, 0);
    }
});

test("rejects dynamic, malformed, or unsupported Guitar Distortion", () =>
{
    assert.throws(() => parseStaticWwiseGuitarDistortionBytes(
        GuitarDistortionBytes(),
        { effectId: "168001308", slotIndex: 0, bankVersion: 151 },
    ), /unsupported parameter block/u);

    for (const parameters of [
        { drivePercent: 101 },
        { distortionType: 3 },
        { tonePercent: -1 },
        { rectificationPercent: 101 },
        { outputGainDb: 25 },
        { wetDryMixPercent: 99 },
    ])
    {
        assert.throws(() => parseGraphStaticWwiseGuitarDistortion(
            GraphGuitarDistortion(GuitarDistortionBytes(parameters)),
            "168001308",
            0,
        ), /unsupported Wwise Guitar Distortion parameters/u);
    }
    assert.doesNotThrow(() => parseGraphStaticWwiseGuitarDistortion(
        GraphGuitarDistortion(GuitarDistortionBytes({
            distortionType: 1,
            drivePercent: 20,
            tonePercent: 50,
            rectificationPercent: 25,
            firstPostGainDb: 4,
            preEqEnabled: true,
        })),
        "900",
        0,
    ));
    const dynamic = GraphGuitarDistortion();

    dynamic.controls.rtpcCount = 1;
    assert.throws(() => parseGraphStaticWwiseGuitarDistortion(
        dynamic,
        "168001308",
        0,
    ), /not a static Wwise Guitar Distortion/u);
});

test("approximates Overdrive rectification and output gain atomically", () =>
{
    const effect = parseGraphStaticWwiseGuitarDistortion(
        GraphGuitarDistortion(GuitarDistortionBytes({
            distortionType: 1,
            drivePercent: 20,
            rectificationPercent: 25,
            outputGainDb: 6,
        })),
        "900",
        0,
    );
    const unavailable = Context();

    delete unavailable.createGain;
    assert.equal(createWwiseEffectChain(unavailable, [ effect ], {
        wwiseDistortion: "approximate-web-audio",
    }), null);
    assert.equal(unavailable.waveShapers.length, 0);
    assert.equal(unavailable.filters.length, 0);

    const context = Context();
    const chain = createWwiseEffectChain(context, [ effect ], {
        wwiseDistortion: "approximate-web-audio",
    });
    const [ shaper ] = context.waveShapers;
    const [ output ] = context.gains;

    assert.equal(chain.output, output);
    assert.ok(Math.abs(shaper.curve[1024]) < shaper.curve[3071]);
    assert.ok(Math.abs(output.gain.value - 10 ** (6 / 20)) < 1e-12);
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

test("keeps Wwise dynamics strict by default and validates the opt-in mode", () =>
{
    assert.equal(normalizeWwiseDynamicsMode(), "strict");
    assert.equal(
        normalizeWwiseDynamicsMode("approximate-web-audio"),
        "approximate-web-audio",
    );
    assert.throws(
        () => normalizeWwiseDynamicsMode("web-audio"),
        /Unsupported Wwise dynamics realization mode/u,
    );
    assert.throws(
        () => parseGraphSharedBusEffect(GraphCompressor(), "940", 0),
        /unsupported/u,
    );
    assert.throws(
        () => parseGraphSharedBusEffect(GraphPeakLimiter(), "930", 1),
        /unsupported/u,
    );
});

test("decodes only eligible static Wwise Compressors for browser approximation", () =>
{
    const decoded = parseGraphStaticWwiseCompressor(
        GraphCompressor(),
        "940",
        2,
    );

    assert.deepEqual(decoded, {
        effectId: "940",
        slotIndex: 2,
        type: "compressor",
        thresholdDb: -18,
        ratio: Math.fround(20.1),
        attackSeconds: Math.fround(0.03),
        releaseSeconds: 0.25,
        outputGainDb: 3,
        processLfe: true,
        channelLink: true,
    });
    assert.deepEqual(
        parseGraphSharedBusEffect(GraphCompressor(), "940", 2, {
            wwiseDynamics: "approximate-web-audio",
        }),
        { ...decoded, type: "compressor-approximation" },
    );
    for (const parameters of [
        { attackSeconds: 0 },
        { attackSeconds: 1.01 },
        { releaseSeconds: 1.01 },
        { processLfe: 0 },
        { channelLink: 0 },
    ])
    {
        assert.throws(() => parseGraphSharedBusEffect(
            GraphCompressor(CompressorBytes(parameters)),
            "940",
            0,
            { wwiseDynamics: "approximate-web-audio" },
        ));
    }
    assert.throws(() => parseGraphSharedBusEffect(
        GraphPeakLimiter(PeakLimiterBytes({ releaseSeconds: 1.01 })),
        "930",
        0,
        { wwiseDynamics: "approximate-web-audio" },
    ));
});

test("builds approximate Compressor and Peak Limiter stages in authored order", () =>
{
    const context = Context();
    const compressor = parseGraphSharedBusEffect(
        GraphCompressor(),
        "940",
        0,
        { wwiseDynamics: "approximate-web-audio" },
    );
    const limiter = parseGraphSharedBusEffect(
        GraphPeakLimiter(),
        "930",
        2,
        { wwiseDynamics: "approximate-web-audio" },
    );
    const chain = createBusEffectChain(
        context,
        new Map([ [ "500", [ compressor, Effect({ slotIndex: 1 }), limiter ] ] ]),
        [ "500" ],
    );
    const [ compressorNode, limiterNode ] = context.compressors;
    const [ compressorGain, limiterGain ] = context.gains;
    const [ limiterDelay ] = context.delays;
    const compressorMakeupDb = -0.6 * -18 * (1 - 1 / 20);
    const limiterMakeupDb = -0.6 * -1 * (1 - 1 / 10);

    assert.equal(chain.input, compressorNode);
    assert.equal(compressorNode.threshold.value, -18);
    assert.equal(compressorNode.knee.value, 0);
    assert.equal(compressorNode.ratio.value, 20, "Web Audio ratio clamps at 20:1");
    assert.equal(compressorNode.attack.value, Math.fround(0.03));
    assert.equal(compressorNode.release.value, 0.25);
    assert.ok(Math.abs(
        compressorGain.gain.value - 10 ** ((3 - compressorMakeupDb) / 20),
    ) < 1e-12);
    assert.equal(compressorGain.connectedTo, context.filters[0]);
    assert.equal(context.filters[0].connectedTo, limiterNode);
    assert.equal(limiterNode.attack.value, 0);
    assert.equal(limiterNode.release.value, Math.fround(0.1));
    assert.ok(Math.abs(
        limiterGain.gain.value - 10 ** (-limiterMakeupDb / 20),
    ) < 1e-12);
    assert.equal(limiterGain.connectedTo, limiterDelay);
    assert.ok(Math.abs(limiterDelay.delayTime.value - 0.004) < 1e-9);
    assert.equal(chain.output, limiterDelay);
});

test("rejects malformed or dynamic Wwise Compressor records", () =>
{
    const mutations = [
        effect => { effect.parameterByteLength = 21; },
        effect => { effect.media.push({ index: 0, sourceId: "10" }); },
        effect => { effect.controls.rtpcCount = 1; },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(CompressorBytes({
                ratio: 51,
            })).toString("base64");
        },
        effect =>
        {
            effect.parametersBase64 = Buffer.from(CompressorBytes({
                releaseSeconds: 2.01,
            })).toString("base64");
        },
    ];

    for (const mutate of mutations)
    {
        const effect = GraphCompressor();

        mutate(effect);
        assert.throws(() =>
            parseGraphStaticWwiseCompressor(effect, "940", 0));
    }
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
                releaseSeconds: 5.001,
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
        telemetryOmitted: false,
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

test("omits signal-transparent Meter telemetry only through explicit policy", () =>
{
    const graph = GraphMeter(MeterBytes({
        gameParameterId: 1312763804,
    }));

    assert.equal(normalizeWwiseMeterFeedbackMode(), "strict");
    assert.equal(
        normalizeWwiseMeterFeedbackMode("omit-telemetry"),
        "omit-telemetry",
    );
    assert.throws(
        () => normalizeWwiseMeterFeedbackMode("ignore"),
        /Unsupported Wwise Meter feedback mode/u,
    );
    assert.deepEqual(
        parseGraphSharedBusEffect(graph, "910", 2, {
            wwiseMeterFeedback: "omit-telemetry",
        }),
        {
            effectId: "910",
            slotIndex: 2,
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
            gameParameterId: 1312763804,
            telemetryOmitted: true,
        },
    );
    assert.throws(
        () => parseGraphSharedBusEffect(
            GraphMeter(MeterBytes({
                applyDownstreamVolume: 1,
                gameParameterId: 1312763804,
            })),
            "910",
            0,
            { wwiseMeterFeedback: "omit-telemetry" },
        ),
        /observable Wwise Meter feedback/u,
    );
});

test("validates explicit Wwise voice-limit policy", () =>
{
    assert.equal(normalizeWwiseVoiceLimitMode(), "strict");
    assert.equal(normalizeWwiseVoiceLimitMode("ignore"), "ignore");
    assert.throws(
        () => normalizeWwiseVoiceLimitMode("omit"),
        /Unsupported Wwise voice-limit mode/u,
    );
});
