import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { buildEffectPackage } from "../../../src/formats/webgl/core/effectPackage.js";
import { CjsCarbonEffectReader } from "../../../src/format/carbonEffect/CjsCarbonEffectReader.js";
import { writeGlslBackendBlock } from "../../../src/formats/webgl/core/glslBackendBlock.js";
import { HlslShaderStageNames } from "../../../src/formats/hlsl/core/tr2/HlslRenderContextEnum.js";

/**
 * Proves the emitted container carries the same translation the packager built.
 *
 * This was the switchover's safety net while `effectPackage` returned both a
 * chunk package and a container, so the two could be compared on real effects.
 * The chunk path is gone and `bytes` is the container, so what this now guards
 * is the container against the translation it was built from -- which is the
 * comparison that mattered all along. What is checked is not that the container
 * parses, which is table stakes, but that every program text and every per-pass
 * backend block survives the round trip unchanged, for every permutation the
 * effect declares.
 *
 * Game assets are never committed, so this is opt-in:
 *
 *   WEBGL_CORPUS_DIR=path/to/effect.dx11 npm test
 *
 * The walk recurses and takes `.sm_hi`, `.sm_lo` and `.sm_depth` alike. Nothing
 * is sampled or capped: a partial sweep reported as a pass is how a switchover
 * ships a hole.
 */

const SHADER_EXTENSIONS = new Set([ ".sm_hi", ".sm_lo", ".sm_depth" ]);

/**
 * Stage names come from the enum, not a local table.
 *
 * This file used to carry `{0:"vertex",1:"pixel",5:"compute"}`, which is wrong:
 * Carbon's compute is 2 and 5 is domain. The corpus has neither stage, so the
 * safety net could not have caught its own error — a compute stage would have
 * been looked up under an undefined name and counted as a mismatch, and a domain
 * stage would have been compared as if it were compute.
 */
const STAGE_NAME = HlslShaderStageNames;

const corpusDir = process.env.WEBGL_CORPUS_DIR || null;
const decoder = new TextDecoder();

/**
 * Lists every compiled effect under a directory, recursively.
 *
 * @param {string} dir Corpus root.
 * @returns {Promise<string[]>} Absolute paths.
 */
async function effectsUnder(dir)
{
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    return entries
        .filter((entry) => entry.isFile() && SHADER_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
        .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
}

/**
 * Compares one package's container against the translation it was built from.
 *
 * Both halves are counted rather than asserted, so a caller can also use this to
 * confirm a deliberately corrupted container *fails* — a comparison that cannot
 * fail proves nothing about the one that passes.
 *
 * @param {object} pkg Built effect package.
 * @param {Uint8Array} bytes Container bytes to read back, corrupt or not.
 * @param {string} source Source name, for diagnostics.
 * @returns {{programs:number, programMismatches:number, blocks:number, blockMismatches:number}} Tally.
 */
function compareContainer(pkg, bytes, source)
{
    const units = new Map(pkg.backendBodySet.passUnits.map((unit) => [ unit.key, unit ]));
    const bodyByKey = new Map(pkg.backendBodySet.bodies.map((body) => [ body.bodyKey, body ]));
    const reader = new CjsCarbonEffectReader(bytes, { source });

    let programs = 0;
    let programMismatches = 0;
    let blocks = 0;
    let blockMismatches = 0;

    for (let index = 0; index < reader.records.length; index += 1)
    {
        const variant = pkg.permutationGraph.variants[index];
        const body = bodyByKey.get(variant.bodyKey);

        // An untranslated body has nothing to compare; the package records why
        // separately, and the completeness rules cover that.
        if (body?.status !== "translated") continue;

        const description = reader.readDescription(index, { backend: true });
        const unitByPass = new Map(body.passes.map((pass) => [ pass.passKey, units.get(pass.unitKey) ]));

        for (const technique of description.techniques)
        {
            for (const [ passIndex, pass ] of technique.passes.entries())
            {
                const passKey = `${technique.name.value}.pass${passIndex}`;
                const unit = unitByPass.get(passKey);
                if (!unit) continue;

                for (const stage of pass.stages)
                {
                    if (!stage.shaderData.size) continue;
                    const stageName = STAGE_NAME[stage.type];
                    const expected = unit.shaders.find((shader) => shader.key === `${passKey}.${stageName}`);
                    programs += 1;
                    if (!expected || decoder.decode(stage.shaderData.bytes) !== expected.code)
                    {
                        programMismatches += 1;
                    }
                }

                if (!pass.backendBlock?.size) continue;

                // Byte-for-byte against what the encoder would produce from the
                // in-memory translation, rather than a field-by-field compare.
                // Naming the fields means the ones nobody thought to name go
                // unchecked, and this block is exactly where a new field will be
                // added — the local-light record was added to it this week.
                blocks += 1;
                const expected = writeGlslBackendBlock({
                    stages: unit.block ?? {},
                    transforms: (unit.resourceTransforms ?? [])
                        .filter((transform) => transform.layoutKey === passKey)
                });
                const stored = pass.backendBlock.bytes;
                if (stored.length !== expected.length
                    || expected.some((byte, index) => stored[index] !== byte))
                {
                    blockMismatches += 1;
                }
            }
        }
    }

    return { programs, programMismatches, blocks, blockMismatches };
}

/**
 * Builds a package and hands back its container bytes as a private copy.
 *
 * @param {string} filePath Compiled effect path.
 * @returns {Promise<{pkg:object, bytes:Uint8Array, source:string}>} Built package.
 */
async function packageOf(filePath)
{
    const source = path.basename(filePath);
    const pkg = buildEffectPackage(await readFile(filePath), {
        source,
        allPermutations: true,
        allowFailures: true
    });
    return { pkg, bytes: Uint8Array.from(pkg.bytes), source };
}

/**
 * Locates a run of bytes inside the container.
 *
 * A view's own `byteOffset` is not usable here: the reader is free to hand back
 * a copy rather than a subarray, and a copy's offset points into a different
 * buffer entirely — which reads as a plausible small number and silently
 * corrupts the header instead of the payload. Searching for the bytes is slower
 * and cannot be wrong.
 *
 * @param {Uint8Array} bytes Container bytes.
 * @param {Uint8Array} needle Run to locate.
 * @returns {number|null} Offset of the first occurrence, or null.
 */
function offsetWithin(bytes, needle)
{
    if (!needle?.length || needle.length > bytes.length) return null;
    const last = bytes.length - needle.length;
    for (let start = 0; start <= last; start += 1)
    {
        if (bytes[start] !== needle[0]) continue;
        let index = 1;
        while (index < needle.length && bytes[start + index] === needle[index]) index += 1;
        if (index === needle.length) return start;
    }
    return null;
}

test(
    "every emitted container carries back the exact translation it was built from",
    { skip: corpusDir ? false : "set WEBGL_CORPUS_DIR to run the container round trip" },
    async (t) =>
    {
        assert.ok((await stat(corpusDir)).isDirectory(), `corpus dir not found: ${corpusDir}`);

        const files = await effectsUnder(corpusDir);
        assert.ok(files.length, `no compiled effects under ${corpusDir}`);

        let programs = 0;
        let blocks = 0;
        const failures = [];

        for (const filePath of files)
        {
            const { pkg, bytes, source } = await packageOf(filePath);
            const tally = compareContainer(pkg, bytes, source);
            programs += tally.programs;
            blocks += tally.blocks;

            if (tally.programMismatches || tally.blockMismatches)
            {
                failures.push(
                    `${source}: ${tally.programMismatches}/${tally.programs} program(s) and `
                    + `${tally.blockMismatches}/${tally.blocks} block(s) differ`
                );
            }
        }

        assert.deepEqual(failures, [], failures.join("\n"));

        // Say what was covered. A pass with no scale attached reads the same
        // whether it compared forty thousand programs or four.
        t.diagnostic(
            `${files.length} effect(s), ${programs} program text(s), ${blocks} backend block(s)`
        );

        // A sweep that compared nothing would pass every assertion above.
        assert.ok(programs > 0, `no program text compared across ${files.length} effect(s)`);
        assert.ok(blocks > 0, `no backend block compared across ${files.length} effect(s)`);
    }
);

test(
    "the comparison notices a container that is wrong",
    { skip: corpusDir ? false : "set WEBGL_CORPUS_DIR to run the container round trip" },
    async () =>
    {
        // Both halves are controlled separately, because they fail independently:
        // a corrupted program text leaves the blocks intact and vice versa, and a
        // control that only ever exercises one half would let the other rot.
        const files = await effectsUnder(corpusDir);
        assert.ok(files.length, `no compiled effects under ${corpusDir}`);

        let programControls = 0;
        let blockControls = 0;

        for (const filePath of files)
        {
            const { pkg, bytes, source } = await packageOf(filePath);
            const reader = new CjsCarbonEffectReader(bytes, { source });

            // Find one program text and one backend block to damage, taking the
            // first of each rather than searching for a convenient one.
            let programOffset = null;
            let blockOffset = null;
            for (let index = 0; index < reader.records.length; index += 1)
            {
                const description = reader.readDescription(index, { backend: true });
                for (const technique of description.techniques)
                {
                    for (const pass of technique.passes)
                    {
                        for (const stage of pass.stages)
                        {
                            programOffset ??= offsetWithin(bytes, stage.shaderData?.bytes);
                        }
                        blockOffset ??= offsetWithin(bytes, pass.backendBlock?.bytes);
                    }
                }
                if (programOffset !== null && blockOffset !== null) break;
            }

            if (programOffset !== null)
            {
                const damaged = Uint8Array.from(bytes);
                damaged[programOffset] ^= 0x01;
                const tally = compareContainer(pkg, damaged, source);
                assert.ok(
                    tally.programMismatches > 0,
                    `${source}: flipping a program-text bit at ${programOffset} changed nothing`
                );
                programControls += 1;
            }

            if (blockOffset !== null)
            {
                const damaged = Uint8Array.from(bytes);
                damaged[blockOffset] ^= 0x01;
                let tally = null;
                try
                {
                    tally = compareContainer(pkg, damaged, source);
                }
                catch
                {
                    // A damaged length or tag can make the block unreadable, which
                    // is a detection too — the container did not pass silently.
                    blockControls += 1;
                    continue;
                }
                assert.ok(
                    tally.blockMismatches > 0,
                    `${source}: flipping a backend-block bit at ${blockOffset} changed nothing`
                );
                blockControls += 1;
            }

            if (programControls && blockControls) break;
        }

        assert.ok(programControls > 0, "no program text was available to corrupt");
        assert.ok(blockControls > 0, "no backend block was available to corrupt");
    }
);
