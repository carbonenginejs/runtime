import test from "node:test";
import assert from "node:assert/strict";

import CjsWebglFormat, { CjsWebglFormat as NamedCjsWebglFormat } from "../../../../../src/resource/formats/webgl/index.js";
import { buildMinimalStagedEffectBytes } from "./synthetic.js";

/**
 * The format surface, now that a WebGL effect is a Carbon container.
 *
 * The fixture is a real container rather than hand-forged bytes, because there
 * is no longer a hand-forgeable chunk layout to mirror: the old `SAMPLE_CHUNKS`
 * plus `buildCarbonWebglPackage` existed to build INFO/META/GLSL by hand, and both are
 * gone with the format they described.
 */

function sampleBytes()
{
    return CjsWebglFormat.buildEffect(
        buildMinimalStagedEffectBytes({ version: 15 }),
        { source: "synthetic.sm_hi", allowFailures: true }
    ).bytes;
}

test("package root exports one public class", async () =>
{
    const mod = await import("../../../../../src/resource/formats/webgl/index.js");

    assert.deepEqual(Object.keys(mod).sort(), [ "CjsWebglFormat", "default" ].sort());
    assert.equal(mod.default, CjsWebglFormat);
    assert.equal(mod.CjsWebglFormat, CjsWebglFormat);
    assert.equal(NamedCjsWebglFormat, CjsWebglFormat);
});

test("static read and instance Read share one code path", () =>
{
    const bytes = sampleBytes();
    const fromStatic = CjsWebglFormat.read(bytes, { source: "synthetic" });
    const fromInstance = new CjsWebglFormat({ source: "synthetic" }).Read(bytes);
    assert.deepEqual(fromStatic, fromInstance);
});

test("read decodes a container into stage and shader records", () =>
{
    const result = CjsWebglFormat.read(sampleBytes(), { source: "synthetic" });

    assert.ok(Array.isArray(result.stages) && result.stages.length > 0);
    assert.ok(Array.isArray(result.shaders) && result.shaders.length > 0);
    assert.equal(result.stages[0].stageName, "vertex");
    assert.equal(result.stages[0].techniqueName, "Main");
    assert.equal(typeof result.stages[0].shaderKey, "string");
    assert.ok(result.stages[0].manifest, "each stage carries its Carbon reflection");
    assert.equal(typeof JSON.stringify(result), "string");
});

test("inspect summarizes without decoding every record", () =>
{
    const summary = CjsWebglFormat.inspect(sampleBytes());

    assert.equal(summary.isContainer, true);
    assert.equal(summary.version, 15);
    assert.equal(typeof summary.recordCount, "number");
    assert.equal(typeof summary.uniqueBodyCount, "number");

    // The point of `inspect` is that it is cheaper than `read`: it reports
    // structure and counts without handing back the records themselves.
    assert.equal("stages" in summary, false);
    assert.equal("shaders" in summary, false);
});

test("the container sniff accepts a container and rejects junk", () =>
{
    assert.equal(CjsWebglFormat.isWebglEffectContainer(sampleBytes()), true);
    assert.equal(CjsWebglFormat.isWebglEffectContainer(new Uint8Array([ 1, 2, 3 ])), false);
    assert.equal(CjsWebglFormat.isWebglEffectContainer(new TextEncoder().encode("GARBAGE!")), false);

    // The old chunk magic is not a container, and must not be mistaken for one.
    assert.equal(CjsWebglFormat.isWebglEffectContainer(new TextEncoder().encode("CEWG0000")), false);
});

test("read rejects a payload that is not a container", () =>
{
    assert.throws(
        () => CjsWebglFormat.read(new TextEncoder().encode("NOPE1234")),
        /Unsupported Carbon effect version/u
    );
});

test("profiles hold values and reject invalid emits/unknown options", () =>
{
    const reader = new CjsWebglFormat({ source: "profile" });
    assert.equal(reader.GetValues().emit, CjsWebglFormat.OUTPUT_JSON);
    assert.equal(reader.GetValues({ source: "override" }).source, "override");
    assert.equal(reader.GetValues().source, "profile");
    assert.throws(() => new CjsWebglFormat({ emit: "nonsense" }), /emit must be/u);
    assert.throws(() => new CjsWebglFormat({ bogus: true }), /unknown option/u);

    // "raw" used to select the live CarbonWebglPackage instance. There is no second
    // output any more, so it is not silently accepted as if there were.
    assert.throws(() => new CjsWebglFormat({ emit: "raw" }), /emit must be/u);
});

test("toJSON converts typed arrays and nested structures", () =>
{
    const converted = CjsWebglFormat.toJSON({
        tokens: new Uint32Array([ 1, 2 ]),
        nested: [ { mask: new Uint8Array([ 3 ]) } ]
    });
    assert.deepEqual(converted, { tokens: [ 1, 2 ], nested: [ { mask: [ 3 ] } ] });
});

/**
 * The permutation index is the only sound bridge between the container reader
 * and the permutation graph.
 *
 * `read()` mints `body_${N}` and dedupes by source-record offset; the graph
 * mints `body${N}` and dedupes by content. Those partitions coincide only
 * because the writer aliases byte-identical bodies onto one offset, so mapping
 * between the two spellings — or assuming the two ordinal sequences agree — is
 * relying on a property of the writer rather than a contract.
 *
 * This is the regression for the fix. It failed against a real ccpwgl
 * integration in a way nothing catches by itself: every permutation resolved to
 * a body that did not exist, and the effect loaded without error and drew
 * nothing.
 */
test("every permutation index resolves to exactly one body", () =>
{
    const result = CjsWebglFormat.read(sampleBytes(), { source: "synthetic" });

    assert.ok(Array.isArray(result.bodies), "read must expose a bodies index");
    assert.equal(result.bodies.length, result.bodyCount);

    const owners = new Map();
    for (const body of result.bodies)
    {
        assert.ok(body.permutationIndices.length > 0, `${body.key} owns no permutation`);
        for (const index of body.permutationIndices)
        {
            assert.equal(owners.has(index), false, `permutation ${index} claimed twice`);
            owners.set(index, body.key);
        }
    }

    // Total coverage: no permutation row is left without a body, which is the
    // exact failure this test exists to catch.
    assert.equal(owners.size, result.recordCount);
    for (let index = 0; index < result.recordCount; index += 1)
    {
        assert.ok(owners.has(index), `permutation ${index} resolves to no body`);
    }

    // And the body a permutation names actually has stages.
    const stageBodies = new Set(result.stages.map((stage) => stage.bodyKey));
    for (const key of owners.values())
    {
        assert.ok(stageBodies.has(key), `${key} has no stages`);
    }
});


test("read carries each pass's render states onto its stage records as `states`", () =>
{
    // ONE/ONE plus BLENDOP ADD - the additive decal state. Nothing in the
    // emitted GLSL implies it, so a consumer that reads only programs and
    // bindings draws the pass under whatever state the previous one left set.
    // For the three additive decal shaders, which write alpha 0, inheriting a
    // src-alpha blend multiplies the pass away entirely.
    const RENDER_STATES = [
        { state: 14, value: 0 },   // RS_ZWRITEENABLE
        { state: 19, value: 2 },   // RS_SRCBLEND  = BLEND_ONE
        { state: 20, value: 2 },   // RS_DESTBLEND = BLEND_ONE
        { state: 27, value: 1 },   // RS_ALPHABLENDENABLE
        { state: 171, value: 1 }   // RS_BLENDOP   = BLENDOP_ADD
    ];

    const bytes = CjsWebglFormat.buildEffect(
        buildMinimalStagedEffectBytes({ version: 15, renderStates: RENDER_STATES }),
        { source: "synthetic.sm_hi", allowFailures: true }
    ).bytes;

    const result = CjsWebglFormat.read(bytes, { source: "synthetic" });

    assert.ok(result.stages.length > 0);
    for (const stage of result.stages)
    {
        assert.deepEqual(stage.states, RENDER_STATES, stage.key);
        // Carbon reserves `renderStates` for the registration handle, and this
        // path registers nothing - so the name must not appear at all.
        assert.equal(stage.renderStates, undefined, stage.key);
    }
});

test("a pass with no render states reports an empty list, never undefined", () =>
{
    const result = CjsWebglFormat.read(sampleBytes(), { source: "synthetic" });

    for (const stage of result.stages)
    {
        assert.deepEqual(stage.states, [], stage.key);
    }
});
