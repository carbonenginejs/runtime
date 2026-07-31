import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { HlslEffectRes } from "../../src/formats/hlsl/core/tr2/resources/HlslEffectRes.js";
import { buildEffectBodyReflection } from "../../src/formats/hlsl/portable.js";
import { CjsCarbonEffectReader } from "../../src/format/carbonEffect/CjsCarbonEffectReader.js";
import { carbonDescriptionFromPortable } from "../../src/format/carbonEffect/carbonDescriptionFromPortable.js";

/**
 * The mapping oracle: our producer's data, back into Carbon records.
 *
 * Every other container proof is Carbon records in and the same Carbon records out,
 * checkable against shipped bytes. This direction has no such proof available,
 * because CCP never wrote one of our packages — and round-tripping it through our
 * own reader would be self-consistent, which is weak in exactly the way `jsonEqual`
 * was weak.
 *
 * But an oracle does exist. Our reflection is derived from a dx11 file's own
 * reflection through the HLSL reader, so the Carbon region we emit should be
 * near-identical to the Carbon region of the file it came from. Every difference
 * must be nameable; an unexplained one is a mapping bug, and a long list means we
 * have drifted further from Carbon than we think.
 *
 * Depth beats breadth here: each difference needs judgement, so this runs on a few
 * effects of different shapes rather than the whole corpus. Enable with the same
 * variable as the corpus sweep.
 */

const corpusDir = process.env.CARBON_EFFECT_CORPUS_DIR || null;

// Different shapes: a heavily-permuted material effect, a simple utility effect,
// and a depth variant whose pass set differs from its colour sibling.
const TARGETS = [
    "dx11/managed/space/spaceobject/v5/quad/quadv5.sm_hi",
    "dx11/utility/textureviewer.sm_hi",
    "dx11/managed/space/spaceobject/v5/quad/quadv5.sm_depth",
    // Carries a geometry stage, which is the only shape that exercises the stage
    // ordering difference. None of the three effects above has one, which is
    // exactly why the whole class stayed invisible until the oracle was run
    // corpus-wide — depth was right about how to examine a difference and wrong
    // about how many kinds exist.
    "dx11/managed/space/specialfx/cloudsimple.sm_lo"
];

/**
 * Collects every field-level difference between two record trees.
 *
 * Blob references compare by declared size and bytes, never by offset: an offset is
 * an arena placement, and the two sides have different arenas by construction.
 *
 * @param {*} left Source-file record subtree.
 * @param {*} right Mapped record subtree.
 * @param {string} where Path for reporting.
 * @param {string[]} out Collected differences.
 */
function diffRecords(left, right, where, out)
{
    if (left instanceof Uint8Array || right instanceof Uint8Array)
    {
        const a = left ?? new Uint8Array(0);
        const b = right ?? new Uint8Array(0);
        if (a.byteLength !== b.byteLength)
        {
            out.push(`${where}: byte length ${a.byteLength} vs ${b.byteLength}`);
            return;
        }
        for (let index = 0; index < a.length; index += 1)
        {
            if (a[index] !== b[index])
            {
                out.push(`${where}: bytes differ at ${index}`);
                return;
            }
        }
        return;
    }

    if (Array.isArray(left) || Array.isArray(right))
    {
        const a = left ?? [];
        const b = right ?? [];
        if (a.length !== b.length)
        {
            out.push(`${where}: length ${a.length} vs ${b.length}`);
            return;
        }
        for (let index = 0; index < a.length; index += 1)
        {
            diffRecords(a[index], b[index], `${where}[${index}]`, out);
        }
        return;
    }

    if (left && right && typeof left === "object" && typeof right === "object")
    {
        const keys = new Set([ ...Object.keys(left), ...Object.keys(right) ]);
        for (const key of keys)
        {
            // An arena offset is a placement, not a value. The source file and our
            // mapping have different arenas, so offsets are expected to differ and
            // comparing them would drown the real signal.
            if (key === "offset" && ("value" in left || "bytes" in left)) continue;
            diffRecords(left[key], right[key], `${where}.${key}`, out);
        }
        return;
    }

    if (left !== right)
    {
        out.push(`${where}: ${JSON.stringify(left)} vs ${JSON.stringify(right)}`);
    }
}

/**
 * Differences that are expected, with the reason each is legitimate.
 *
 * Anything not matched here is a mapping bug. Keep this list short; a long list is
 * itself the finding.
 */
const EXPLAINED = [
    {
        // Carbon's reader nulls a non-dynamic sampler's name
        // (Tr2EffectDescription.cpp:430-433) but the byte on disk still points at
        // the interned name. Reading the file yields the stored name; our portable
        // reflection carries the post-nulling value.
        pattern: /\.samplers\[\d+\]\.name\.value: "[^"]*" vs ""$/u,
        why: "sampler name nulled for non-dynamic samplers by Carbon's reader"
    }
];

/**
 * Stage order is compared separately, and is a known legitimate difference.
 *
 * The runtime stores stages in a type-indexed array — `pass.stageInputs[type]`,
 * Carbon's own design at `Tr2EffectDescription.cpp:536` — so a file's original
 * stage order is not retained anywhere after reading, and the portable reflection
 * emits ascending type order (`portableReflection.js:381-388`). Where a file
 * writes `vertex, geometry, pixel` we write `vertex, pixel, geometry`.
 *
 * Carbon reconstructs identically either way, because it reads each stage's type
 * byte and assigns by it. The consequence is only that our Carbon region is
 * field-identical rather than byte-identical for those passes.
 *
 * It is compared as its own quantity rather than left to the field diff, because
 * **a reordering masquerades as every field differing**: a positional comparison
 * of misaligned stages reports `usedMask`, `registers`, `constants` and
 * `shaderData` all disagreeing, which is the symptom count, not the cause count.
 * Measured corpus-wide: 107 body-passes, every one of them `0,3,1` vs `0,1,3`.
 *
 * Aligns both sides' stages by type, and reports any order difference.
 *
 * @param {object} original Source-file description.
 * @param {object} mapped Mapped description.
 * @param {string} target Effect path, for reporting.
 * @param {number} index Body index.
 * @param {string[]} orderDiffs Collected order differences.
 */
function alignStagesByType(original, mapped, target, index, orderDiffs)
{
    for (let t = 0; t < original.techniques.length; t += 1)
    {
        for (let p = 0; p < original.techniques[t].passes.length; p += 1)
        {
            const left = original.techniques[t].passes[p].stages;
            const right = mapped.techniques[t].passes[p].stages;
            const before = left.map((entry) => entry.type).join(",");
            const after = right.map((entry) => entry.type).join(",");
            if (before !== after) orderDiffs.push(`${target}#${index} t${t}p${p}: ${before} vs ${after}`);
            left.sort((a, b) => a.type - b.type);
            right.sort((a, b) => a.type - b.type);
        }
    }
}

test(
    "our Carbon region matches the dx11 file it was derived from",
    { skip: corpusDir ? false : "set CARBON_EFFECT_CORPUS_DIR to run the mapping oracle" },
    async () =>
    {
        assert.ok((await stat(corpusDir)).isDirectory(), `corpus dir not found: ${corpusDir}`);

        const unexplained = [];
        const explained = new Map();
        const orderDiffs = [];
        let compared = 0;

        for (const target of TARGETS)
        {
            const filePath = path.join(corpusDir, target);
            const bytes = new Uint8Array(await readFile(filePath));

            const source = new CjsCarbonEffectReader(bytes, { source: filePath });
            const effectRes = new HlslEffectRes();
            assert.ok(effectRes.DoLoad(bytes, { sourcePath: filePath }), `failed to load ${target}`);

            // One body per distinct offset: aliased rows are the same bytes.
            const seen = new Set();
            for (let index = 0; index < source.records.length; index += 1)
            {
                if (seen.has(source.records[index].offset)) continue;
                seen.add(source.records[index].offset);

                const reflection = buildEffectBodyReflection(effectRes, index);
                const mapped = carbonDescriptionFromPortable(reflection);
                const original = source.readDescription(index);

                alignStagesByType(original, mapped, target, index, orderDiffs);

                const differences = [];
                diffRecords(original, mapped, `${target}#${index}`, differences);
                compared += 1;

                for (const difference of differences)
                {
                    const match = EXPLAINED.find((entry) => entry.pattern.test(difference));
                    if (match) explained.set(match.why, (explained.get(match.why) ?? 0) + 1);
                    else unexplained.push(difference);
                }
            }
        }

        console.log(`carbon mapping: ${compared} bodies compared across ${TARGETS.length} effects`);
        for (const [ why, count ] of explained)
        {
            console.log(`  explained x${count}: ${why}`);
        }
        if (orderDiffs.length)
        {
            console.log(`  stage order differs in ${orderDiffs.length} passes (ascending by type)`);
            for (const entry of orderDiffs.slice(0, 5)) console.log(`    ${entry}`);
        }
        if (unexplained.length)
        {
            console.log(`  unexplained: ${unexplained.length}`);
            for (const difference of unexplained.slice(0, 20)) console.log(`    ${difference}`);
        }

        assert.ok(compared > 0, "no bodies compared");
        assert.deepEqual(
            unexplained.slice(0, 20),
            [],
            `${unexplained.length} unexplained differences between our Carbon region and the source file's`
        );

        // Our order is ascending by stage type, always. Any *other* reordering
        // would be a real mapping bug rather than the known information loss, so
        // the shape is asserted rather than the count.
        const unexpectedOrder = orderDiffs.filter((entry) =>
        {
            const [ before, after ] = entry.split(": ")[1].split(" vs ");
            const ascending = before.split(",").map(Number).sort((a, b) => a - b).join(",");
            return after !== ascending;
        });
        assert.deepEqual(
            unexpectedOrder,
            [],
            `stage reordering that is not simply ascending-by-type:\n${unexpectedOrder.join("\n")}`
        );
    }
);
