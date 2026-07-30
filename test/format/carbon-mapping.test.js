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
    "dx11/managed/space/spaceobject/v5/quad/quadv5.sm_depth"
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

test(
    "our Carbon region matches the dx11 file it was derived from",
    { skip: corpusDir ? false : "set CARBON_EFFECT_CORPUS_DIR to run the mapping oracle" },
    async () =>
    {
        assert.ok((await stat(corpusDir)).isDirectory(), `corpus dir not found: ${corpusDir}`);

        const unexplained = [];
        const explained = new Map();
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
    }
);
