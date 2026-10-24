import { CjsCarbonEffectReader } from "../../../../../src/resource/format/carbonEffect/CjsCarbonEffectReader.js";
import { effectHeader } from "../../../../../src/resource/format/effect/effectHeader.js";
import test from "node:test";
import assert from "node:assert/strict";

import { CjsCarbonEffectFormat } from "../../../../../src/resource/formats/carbonEffect/index.js";
import { readEffectAnalysis } from "../../../../../src/resource/formats/hlsl/core/analysis.js";
import { buildEffectBytes } from "./synthetic.js";

test("static read and instance Read share one code path", () =>
{
    const bytes = buildEffectBytes();
    const fromStatic = CjsCarbonEffectFormat.read(bytes, { source: "synthetic" });
    const fromInstance = new CjsCarbonEffectFormat({ source: "synthetic" }).Read(bytes);
    assert.deepEqual(fromStatic, fromInstance);
});

test("json emit is the documented plain effect graph", () =>
{
    const bytes = buildEffectBytes({
        permutations: [ {
            name: "BLEND_MODE",
            description: "Blend mode selector",
            defaultOption: 0,
            options: [ "OPAQUE", "TRANSPARENT" ]
        } ],
        // One row per permutation: the shared reader enforces the dense,
        // positionally indexed offset table every shipped file has.
        bodies: [ { size: 1 }, { size: 1 } ]
    });
    const result = CjsCarbonEffectFormat.read(bytes, { source: "synthetic" });

    assert.equal(result.version, 8);
    assert.equal(result.bodyCount, 2);
    assert.equal(result.loadError, null);
    assert.deepEqual(result.permutations.map((entry) => entry.name), [ "BLEND_MODE" ]);
    assert.deepEqual(result.permutations[0].options, [ "OPAQUE", "TRANSPARENT" ]);
    // The synthetic body is one garbage byte, so the default permutation
    // cannot be decoded into an effect description; the graph reports that
    // plainly.
    assert.equal(result.effect, null);
    // JSON-compatible end to end
    assert.equal(typeof JSON.stringify(result), "string");
});

test("raw emit retains a reader without resource lifecycle", () =>
{
    const result = CjsCarbonEffectFormat.read(buildEffectBytes(), { emit: "raw" });

    assert.equal(result.constructor, CjsCarbonEffectReader);
    assert.equal("IsGood" in result, false);
    assert.equal(effectHeader(result).version, 8);
});

test("Inspect summarizes the default permutation without a full JSON conversion", () =>
{
    const summary = CjsCarbonEffectFormat.inspect(buildEffectBytes(), { source: "synthetic" });

    assert.equal(summary.version, 8);
    assert.equal(summary.isGood, true);
    assert.equal(summary.permutationCount, 0);
    assert.equal(summary.bodyCount, 1);
    // The synthetic body is one garbage byte, so the default permutation
    // cannot be decoded into a Tr2Shader; Inspect reports that gracefully.
    assert.deepEqual(summary.techniques, []);
    assert.equal(summary.effectName, null);
});

test("metadata emit reports selected permutation options without shader bytecode", () =>
{
    const bytes = buildEffectBytes({
        permutations: [
            {
                name: "BLEND_MODE",
                description: "Blend mode selector",
                defaultOption: 1,
                options: [ "OPAQUE", "TRANSPARENT" ]
            },
            {
                name: "QUALITY",
                description: "Quality selector",
                defaultOption: 0,
                options: [ "LOW", "HIGH" ]
            }
        ],
        bodies: [ { size: 1 }, { size: 1 }, { size: 1 }, { size: 1 } ]
    });

    const defaults = CjsCarbonEffectFormat.read(bytes, {
        emit: "metadata",
        source: "synthetic"
    });
    assert.equal(defaults.bodyCount, 4);
    assert.equal(defaults.bodyIndex, 1);
    assert.deepEqual(defaults.selectedOptions.map((entry) => [ entry.name, entry.value, entry.source ]), [
        [ "BLEND_MODE", "TRANSPARENT", "default" ],
        [ "QUALITY", "LOW", "default" ]
    ]);
    assert.equal(defaults.effect, null);

    const selected = new CjsCarbonEffectFormat({
        emit: "metadata",
        source: "synthetic"
    }).Read(bytes, {
        permutation: new Map([
            [ "BLEND_MODE", "OPAQUE" ],
            [ "QUALITY", "HIGH" ]
        ])
    });
    assert.equal(selected.bodyIndex, 2);
    assert.deepEqual(selected.selectedOptions.map((entry) => [ entry.name, entry.value, entry.source ]), [
        [ "BLEND_MODE", "OPAQUE", "local" ],
        [ "QUALITY", "HIGH", "local" ]
    ]);
});

test("readEffectAnalysis resolves one permutation without changing stable emits", () =>
{
    const bytes = buildEffectBytes({
        permutations: [
            {
                name: "BLEND_MODE",
                description: "Blend mode selector",
                defaultOption: 1,
                options: [ "OPAQUE", "TRANSPARENT" ]
            },
            {
                name: "QUALITY",
                description: "Quality selector",
                defaultOption: 0,
                options: [ "LOW", "HIGH" ]
            }
        ],
        bodies: [ { size: 1 }, { size: 1 }, { size: 1 }, { size: 1 } ]
    });

    const analysis = readEffectAnalysis(bytes, {
        source: "synthetic",
        permutation: new Map([
            [ "BLEND_MODE", "OPAQUE" ],
            [ "QUALITY", "HIGH" ]
        ])
    });

    assert.equal(analysis.reader.constructor, CjsCarbonEffectReader);
    assert.equal("shader" in analysis, false);
    assert.equal(analysis.effectDescription, null);
    assert.equal(analysis.bindingManifest, null);
    assert.equal(analysis.selection.bodyIndex, 2);
    assert.deepEqual(analysis.selection.selectedOptions.map((entry) => [ entry.name, entry.value, entry.source ]), [
        [ "BLEND_MODE", "OPAQUE", "local" ],
        [ "QUALITY", "HIGH", "local" ]
    ]);
});

test("profiles hold values and reject invalid emits", () =>
{
    const reader = new CjsCarbonEffectFormat({ emit: "raw", source: "profile" });
    assert.equal(reader.GetValues().emit, "raw");
    assert.equal(reader.GetValues({ source: "override" }).source, "override");
    assert.equal(reader.GetValues().source, "profile");
    assert.equal(new CjsCarbonEffectFormat({ emit: "metadata" }).GetValues().emit, "metadata");
    assert.throws(() => new CjsCarbonEffectFormat({ emit: "nonsense" }), /emit must be/);
    assert.throws(() => CjsCarbonEffectFormat.read(buildEffectBytes(), { emit: "nonsense" }), /emit must be/);
});

test("toJSON converts typed arrays and nested structures", () =>
{
    const converted = CjsCarbonEffectFormat.toJSON({
        tokens: new Uint32Array([ 1, 2 ]),
        nested: [ { mask: new Uint8Array([ 3 ]) } ]
    });
    assert.deepEqual(converted, { tokens: [ 1, 2 ], nested: [ { mask: [ 3 ] } ] });

    const reader = new CjsCarbonEffectFormat();
    assert.deepEqual(reader.ToJSON(new Uint8Array([ 4, 5 ])), [ 4, 5 ]);
});

test("is accepts a well-formed header and rejects garbage or truncated data", () =>
{
    assert.equal(CjsCarbonEffectFormat.is(null, buildEffectBytes()), true);
    assert.equal(CjsCarbonEffectFormat.is(null, new Uint8Array([ 1, 2, 3, 4, 5 ])), false);
    assert.equal(CjsCarbonEffectFormat.is(null, new Uint8Array(0)), false);
    assert.equal(CjsCarbonEffectFormat.is(null, buildEffectBytes({ version: 99 })), false);
});

test("out-of-range version is rejected with a read error", () =>
{
    assert.throws(() => CjsCarbonEffectFormat.read(buildEffectBytes({ version: 99 })), /Unsupported Carbon effect version 99/);
});

test("truncated header is rejected with a read error", () =>
{
    const bytes = buildEffectBytes().subarray(0, 2);
    assert.throws(() => CjsCarbonEffectFormat.read(bytes));
});

test("CLASS_KEYS lists the hydratable node kinds", () =>
{
    assert.deepEqual(CjsCarbonEffectFormat.classKeys, [
        "Root",
        "Permutation",
        "EffectDescription",
        "Technique",
        "Pass",
        "StageInput",
        "Constant",
        "Resource",
        "Sampler",
        "ShaderBytecode"
    ]);
});

test("classes option hydrates registered node kinds instead of plain objects", () =>
{
    class EffectRoot
    {}
    class ShaderPermutation
    {}

    const bytes = buildEffectBytes({
        permutations: [ { name: "BLEND_MODE", description: "", defaultOption: 0, options: [ "OPAQUE" ] } ]
    });
    const result = CjsCarbonEffectFormat.read(bytes, {
        source: "synthetic",
        classes: { Root: EffectRoot, Permutation: ShaderPermutation }
    });

    assert.ok(result instanceof EffectRoot);
    assert.ok(result.permutations[0] instanceof ShaderPermutation);
    assert.equal(result.permutations[0].name, "BLEND_MODE");
});

test("instance SetClass/SetClasses/GetClass/HasClass manage the node class map", () =>
{
    class EffectRoot
    {}

    const reader = new CjsCarbonEffectFormat();
    assert.equal(reader.HasClass("Root"), false);
    reader.SetClass("Root", EffectRoot);
    assert.equal(reader.HasClass("Root"), true);
    assert.equal(reader.GetClass("Root"), EffectRoot);

    reader.SetClass("Root", null);
    assert.equal(reader.HasClass("Root"), false);

    reader.SetClasses({ Root: EffectRoot });
    assert.equal(reader.GetClass("Root"), EffectRoot);

    assert.throws(() => reader.GetClass("NotARealKey"), /unknown class key/);
    assert.throws(() => reader.SetClass("NotARealKey", EffectRoot), /unknown class key/);
    assert.throws(() => reader.SetClass("Root", 123), /must be a constructor/);
});

test("unknown options and non-object classes are rejected", () =>
{
    assert.throws(() => new CjsCarbonEffectFormat({ nonsense: true }), /unknown option/);
    assert.throws(() => CjsCarbonEffectFormat.read(buildEffectBytes(), { classes: 123 }), /classes option must be an object/);
});
