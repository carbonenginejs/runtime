import test from "node:test";
import assert from "node:assert/strict";

import { CjsWebglFormat } from "../../../src/formats/webgl/index.js";
import { inspectGlslEffectContainer } from "../../../src/formats/webgl/core/inspectGlslEffectContainer.js";
import { buildMinimalStagedEffectBytes } from "./synthetic.js";

/**
 * The container replaced the chunk package's inspection, so it has to be held to
 * the same standard: report the structure that is really there, and fail rather
 * than guess when the bytes are wrong.
 *
 * The chunk inspection reported tags, offsets and sizes. None of that survives,
 * and the tests below deliberately assert that none of it *reappears* — a
 * `chunks` array on a container summary would be read as truth by the next
 * person to open the file.
 */

/** Four permutations over two distinct translations, with 1 and 2 passes. */
function twoBodyEffect()
{
    return buildMinimalStagedEffectBytes({
        version: 15,
        permutations: [
            { name: "QUALITY", options: [ "LOW", "HIGH" ], defaultOption: 1, description: "quality", type: 1 },
            { name: "SKINNED", options: [ "OFF", "ON" ], defaultOption: 0, description: "skinning", type: 1 }
        ],
        bodyPassCounts: [ 1, 2, 1, 2 ],
        distinctBodyRanges: true
    });
}

/**
 * Builds the container bytes for the fixture above.
 *
 * @returns {Uint8Array} Container bytes.
 */
function containerBytes()
{
    const result = CjsWebglFormat.buildEffect(twoBodyEffect(), {
        source: "synthetic.sm_depth",
        allowFailures: true
    });
    return Uint8Array.from(result.bytes);
}

test("container inspection reports the offset table, its aliasing and the permutation axes", () =>
{
    const summary = inspectGlslEffectContainer(containerBytes(), { source: "synthetic.sm_depth" });

    assert.equal(summary.isContainer, true);
    assert.equal(summary.version, 15);
    assert.equal(summary.recordCount, 4);
    assert.equal(summary.permutationProduct, 4);
    assert.equal(summary.dense, true);

    // Four rows resolving to two bodies. This is the sharing the container
    // exists to express, and the number the chunk vocabulary had no way to say.
    assert.equal(summary.uniqueBodyCount, 2);
    assert.equal(summary.aliasedRowCount, 2);

    assert.deepEqual(
        summary.permutationAxes,
        [
            { name: "QUALITY", type: 1, defaultOption: 1, options: [ "LOW", "HIGH" ] },
            { name: "SKINNED", type: 1, defaultOption: 0, options: [ "OFF", "ON" ] }
        ]
    );
    assert.ok(summary.arenaByteLength > 0, "the string arena must be measured");
    assert.equal(summary.byteLength, containerBytes().length);
});

test("container inspection decodes once per distinct body, not once per row", () =>
{
    const summary = inspectGlslEffectContainer(containerBytes());

    // The two distinct bodies carry one and two passes. Counting per row instead
    // would give 1+2+1+2 = 6 and 4 techniques, and would still look plausible —
    // which is exactly why the number is pinned here rather than left implied.
    assert.equal(summary.techniqueCount, 2);
    assert.equal(summary.passCount, 3);
    assert.equal(summary.programCount + summary.emptyProgramCount, 3);
    assert.deepEqual(summary.stageNames, [ "vertex" ]);
});

test("container inspection separates declared stages from stored programs", () =>
{
    const summary = inspectGlslEffectContainer(containerBytes());

    // This fixture's stages are synthetic DXBC that does not lower, so every
    // stage slot is declared and every program is empty. A summary that reported
    // only "3 stages" would describe a complete effect and a completely
    // untranslated one identically.
    assert.equal(summary.programCount, 0);
    assert.equal(summary.emptyProgramCount, 3);
    assert.equal(summary.backendBlockCount, 0);
});

test("container inspection reports no chunk vocabulary", () =>
{
    const summary = inspectGlslEffectContainer(containerBytes());

    for (const key of [ "chunks", "isCewg", "shaderCount", "stageCount" ])
    {
        assert.ok(!(key in summary), `container summary must not report "${key}"`);
    }
});

test("container inspection fails closed on damaged bytes rather than reporting a guess", () =>
{
    // Each control damages one field the inspection depends on and requires the
    // read to throw. A summary that still returned numbers here would be worse
    // than no summary: the numbers would be wrong and would look fine.
    const version = containerBytes();
    new DataView(version.buffer, version.byteOffset).setUint32(0, 99, true);
    assert.throws(
        () => inspectGlslEffectContainer(version),
        /Unsupported Carbon effect version/u,
        "a wrong container version must be rejected"
    );

    const arena = containerBytes();
    // The arena size sits after version (4) + compiler version (4) + hash (32).
    new DataView(arena.buffer, arena.byteOffset).setUint32(40, 0xffffff, true);
    assert.throws(
        () => inspectGlslEffectContainer(arena),
        /string-table size/u,
        "an arena size running past the file must be rejected"
    );

    const truncated = containerBytes().slice(0, 32);
    assert.throws(
        () => inspectGlslEffectContainer(truncated),
        undefined,
        "a truncated container must be rejected"
    );
});
