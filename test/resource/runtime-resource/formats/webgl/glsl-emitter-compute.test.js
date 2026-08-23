import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

// These fixtures are real EVE compute stages. They are game-derived bytes and
// are never committed, so this suite skips unless they are supplied locally.
const FIXTURE_DIR = new URL("./fixtures/", import.meta.url);
const HAVE_FIXTURES = existsSync(new URL("ssao_prepare_native_depths.compute.dxbc", FIXTURE_DIR));
const fixtureTest = HAVE_FIXTURES
    ? test
    : (name, fn) => test.skip(`${name} (needs local EVE compute fixtures in test/formats/webgl/fixtures/)`, fn);

import CjsWebglFormat from "../../../../../src/resource/formats/webgl/index.js";
import { buildDoubleStoreComputeDxbc } from "./synthetic.js";

/**
 * Reads one DXBC fixture from `test/fixtures/`.
 *
 * The compute fixtures are real EVE SSAO (FFX-CACAO) cs_5_0 stages extracted
 * by `scripts/packageTr2WebglEffect.js` (local-only, never committed — see
 * `.gitignore`): PrepareNativeDepths (4 constant-slice UAV stores),
 * GenerateQ2 (gather4 on texture2darray, dynamic cb-sourced slice), and
 * NonSmartHalfApply (single store to a plain 2D UAV).
 *
 * @param {string} name Fixture file name.
 * @returns {Buffer} Fixture bytes.
 */
function fixture(name)
{
    return readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
}

fixtureTest("routes constant-slice UAV stores to per-slice fragment outputs (PrepareNativeDepths)", () =>
{
    const result = CjsWebglFormat.emitGlsl(fixture("ssao_prepare_native_depths.compute.dxbc"), {
        source: "ssao.PrepareNativeDepths"
    });

    assert.equal(result.stageName, "compute");
    for (const slice of [ 0, 1, 2, 3 ])
    {
        assert.match(
            result.source,
            new RegExp(`layout\\(location = ${slice}\\) out highp vec4 cjsUav0_s${slice};`)
        );
    }
    assert.doesNotMatch(result.source, /out highp vec4 cjsUav0;/);

    // Distinct value routing per slice — the old single-output lowering
    // clobbered slices 0..2 with the last store's value.
    assert.match(result.source, /cjsUav0_s0\.xyzw = vec4\(r0\.wwww\);/);
    assert.match(result.source, /cjsUav0_s1\.xyzw = vec4\(r0\.zzzz\);/);
    assert.match(result.source, /cjsUav0_s2\.xyzw = vec4\(r0\.xxxx\);/);
    assert.match(result.source, /cjsUav0_s3\.xyzw = vec4\(r0\.yyyy\);/);

    assert.deepEqual(result.computeFragment, {
        threadGroup: [ 8, 8, 1 ],
        dispatchOriginUniform: "cjsDispatchOrigin",
        uavOutputs: [
            { register: 0, slice: 0, location: 0, glslName: "cjsUav0_s0" },
            { register: 0, slice: 1, location: 1, glslName: "cjsUav0_s1" },
            { register: 0, slice: 2, location: 2, glslName: "cjsUav0_s2" },
            { register: 0, slice: 3, location: 3, glslName: "cjsUav0_s3" }
        ]
    });
});

fixtureTest("emits the texture2darray gather4 emulation (GenerateQ2)", () =>
{
    const result = CjsWebglFormat.emitGlsl(fixture("ssao_generate_q2.compute.dxbc"), {
        source: "ssao.GenerateQ2"
    });

    assert.match(
        result.source,
        /vec4 hlslcc_textureGather4ArrayEmulated\(mediump sampler2DArray samp, vec3 uvw, int channel\)/
    );
    assert.match(result.source, /hlslcc_textureGather4ArrayEmulated\(s\d+, vec3\(/);

    // Single store with a cb-sourced (dynamic) slice keeps the single-output
    // shape: the slice coordinate is dropped and the host attaches the layer.
    assert.match(result.source, /layout\(location = 0\) out highp vec4 cjsUav0;/);
    assert.deepEqual(result.computeFragment.uavOutputs, [
        { register: 0, slice: null, location: 0, glslName: "cjsUav0" }
    ]);
});

fixtureTest("keeps single-store UAVs on the single-output lowering (NonSmartHalfApply)", () =>
{
    const result = CjsWebglFormat.emitGlsl(fixture("ssao_nonsmart_half_apply.compute.dxbc"), {
        source: "ssao.NonSmartHalfApply"
    });

    assert.match(result.source, /layout\(location = 0\) out highp vec4 cjsUav0;/);
    assert.match(result.source, /cjsUav0\.xyzw = /);
    assert.doesNotMatch(result.source, /cjsUav0_s/);
    assert.deepEqual(result.computeFragment, {
        threadGroup: [ 8, 8, 1 ],
        dispatchOriginUniform: "cjsDispatchOrigin",
        uavOutputs: [ { register: 0, slice: null, location: 0, glslName: "cjsUav0" } ]
    });
});

// Synthetic DXBC, so these two do not need the game-derived fixtures above and
// must not be gated behind them: they were skipping silently, which left the
// map-style kill list - the rule that decides whether a compute stage can be
// lowered to fragment at all - with no coverage whatsoever.
test("rejects multiple UAV stores with a dynamic array slice as not map-style", () =>
{
    assert.throws(
        () => CjsWebglFormat.emitGlsl(buildDoubleStoreComputeDxbc(8), { source: "synthetic" }),
        /multiple UAV stores with a dynamic array slice are not supported/
    );
});

test("rejects multiple stores to one non-array UAV as not map-style", () =>
{
    assert.throws(
        () => CjsWebglFormat.emitGlsl(buildDoubleStoreComputeDxbc(3), { source: "synthetic" }),
        /multiple stores to one non-array UAV are not supported/
    );
});
