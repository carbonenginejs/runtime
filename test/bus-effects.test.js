import test from "node:test";
import assert from "node:assert/strict";
import {
    createBusEffectChain,
    indexBusEffectCatalog,
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
