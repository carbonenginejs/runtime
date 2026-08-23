import test from "node:test";
import assert from "node:assert/strict";

import CjsWebglFormat from "../../../../../src/resource/formats/webgl/index.js";
import { buildDetailMapPixelDxbc } from "./synthetic.js";

/**
 * The detail-map merge exists for one reason: the affected shaders sit at
 * exactly 16 textures against WebGL2's 16-unit guarantee, so three bindings must
 * become one to leave room for anything else - lighting in particular. See
 * docs/contracts/webgl2-texture-budget.md.
 */

test("three detail maps become one array sampled at three literal layers", () =>
{
    const result = CjsWebglFormat.emitGlsl(buildDetailMapPixelDxbc([ 3, 4, 5 ]), {
        source: "synthetic",
        detailMapArrayRegisters: [ 3, 4, 5 ]
    });

    assert.match(result.source, /uniform mediump sampler2DArray sDetailArrayMap;/u);
    assert.doesNotMatch(result.source, /uniform mediump sampler2D s[345];/u);

    // The register a sample came from is what selects its layer.
    assert.match(result.source, /texture\(sDetailArrayMap, vec3\(vec2\(r0\.xy\), 0\.0\)\)/u);
    assert.match(result.source, /texture\(sDetailArrayMap, vec3\(vec2\(r0\.xy\), 1\.0\)\)/u);
    assert.match(result.source, /texture\(sDetailArrayMap, vec3\(vec2\(r0\.xy\), 2\.0\)\)/u);
});

test("the merge frees texture units: three bindings become one", () =>
{
    const before = CjsWebglFormat.emitGlsl(buildDetailMapPixelDxbc([ 3, 4, 5 ]), { source: "synthetic" });
    const after = CjsWebglFormat.emitGlsl(buildDetailMapPixelDxbc([ 3, 4, 5 ]), {
        source: "synthetic",
        detailMapArrayRegisters: [ 3, 4, 5 ]
    });

    const samplerCount = (result) =>
        (result.source.match(/uniform mediump u?i?sampler\w+ \w+;/gu) ?? []).length;

    assert.equal(samplerCount(before), 3);
    assert.equal(samplerCount(after), 1);
});

test("the array binding reports its layers and where they came from", () =>
{
    const result = CjsWebglFormat.emitGlsl(buildDetailMapPixelDxbc([ 3, 4, 5 ]), {
        source: "synthetic",
        detailMapArrayRegisters: [ 3, 4, 5 ]
    });

    const bindings = result.bindings.filter((binding) => binding.kind === "resource");

    // One binding, not three: the engine binds one array texture.
    assert.equal(bindings.length, 1);
    assert.deepEqual(bindings[0], {
        kind: "resource",
        registerIndex: 3,
        name: "sDetailArrayMap",
        samplerType: "sampler2DArray",
        dimensionName: "texture2darray",
        arrayLayerCount: 3,
        mergedFrom: [ 3, 4, 5 ],
        // The merged layers all sample through one sampler, so the single
        // uniform standing for them can carry its state unambiguously.
        pairedSamplerRegisters: [ 0 ]
    });
});

test("two detail maps merge too, because heat+detail shaders ship that way", () =>
{
    const result = CjsWebglFormat.emitGlsl(buildDetailMapPixelDxbc([ 3, 4 ]), {
        source: "synthetic",
        detailMapArrayRegisters: [ 3, 4 ]
    });

    assert.match(result.source, /uniform mediump sampler2DArray sDetailArrayMap;/u);
    assert.match(result.source, /vec3\(vec2\(r0\.xy\), 1\.0\)/u);
    assert.doesNotMatch(result.source, /vec3\(vec2\(r0\.xy\), 2\.0\)/u);
});

test("an unmerged shader is byte-for-byte unchanged", () =>
{
    // The option is opt-in, so a build that does not pass it must be identical
    // to one from before the feature existed.
    const withOption = CjsWebglFormat.emitGlsl(buildDetailMapPixelDxbc([ 3, 4, 5 ]), {
        source: "synthetic",
        detailMapArrayRegisters: []
    });
    const without = CjsWebglFormat.emitGlsl(buildDetailMapPixelDxbc([ 3, 4, 5 ]), {
        source: "synthetic"
    });

    assert.equal(withOption.source, without.source);
    assert.match(without.source, /uniform mediump sampler2D s3;/u);
});
