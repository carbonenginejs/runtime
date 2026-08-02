import test from "node:test";
import assert from "node:assert/strict";
import {
    createBusEffectChain,
    indexBusEffectCatalog,
    parseGraphStaticParametricEq,
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
        filters: [],
        gains: [],
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
        connect(target) { node.connectedTo = target; },
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
