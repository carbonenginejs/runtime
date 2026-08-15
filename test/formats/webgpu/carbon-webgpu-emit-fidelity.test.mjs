import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, readdir, stat } from "node:fs/promises";

import { CjsCarbonEffectReader } from "../../../src/format/carbonEffect/CjsCarbonEffectReader.js";
import CjsWebgpuFormat from "../../../src/formats/webgpu/index.js";

/**
 * Proves the WebGPU emit preserves what the shared codec preserves.
 *
 * The byte-exact corpus proof covers the SHARED codec: read a file, write it
 * back, compare bytes. The WebGPU emit is not that path. It round-trips the
 * description through the same Carbon classes and then replaces program slots
 * and appends a backend block, so its fidelity is *inherited* — it holds only
 * because the emit touches `stage.sourceProgram` and `pass.backendBlock` and
 * nothing else.
 *
 * Inherited is not tested. Nothing failed if that restraint were widened, and
 * the five WebGPU documentation pages that promise preservation would quietly
 * become false. This closes that gap.
 *
 * Two fields carry the whole risk, because both are things Carbon's own runtime
 * discards and the file keeps:
 *
 *   - a NON-DYNAMIC sampler's name, which `FindSamplerByName` never needs, so a
 *     reader modelled on Carbon's runtime drops it (1,631 corpus files); and
 *   - the authored per-pass STAGE ORDER, which is not derivable — across
 *     288,528 passes, 156 write vertex/geometry/pixel and 12 write
 *     vertex/pixel/geometry (21 files).
 *
 * Both are compared source-to-emitted per body, so a widened emit fails here
 * rather than in a consumer months later.
 *
 *   CARBON_EFFECT_CORPUS_DIR=path/to/effects npm test
 *
 * Game bytes are never committed; fetch them through tools-core at a pinned
 * build. Point the variable at any tree containing compiled effect files.
 */

const EXTENSIONS = new Set([ ".sm_hi", ".sm_lo", ".sm_depth" ]);

/**
 * Yields every compiled effect file under a directory tree.
 *
 * @param {string} dir Directory to walk.
 * @yields {string} File path.
 */
async function* walk(dir)
{
    for (const entry of await readdir(dir, { withFileTypes: true }))
    {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(entryPath);
        else if (EXTENSIONS.has(path.extname(entry.name).toLowerCase())) yield entryPath;
    }
}

/**
 * Collects every sampler name and every pass stage order in a description.
 *
 * Keyed by position rather than by name, because a name is one of the things
 * under test: keying by it would hide exactly the loss this looks for.
 *
 * @param {object} description Description record tree.
 * @returns {{samplers: Array<string|null>, stageOrders: number[][]}} Projection.
 */
function project(description)
{
    const samplers = [];
    const stageOrders = [];

    for (const technique of description.techniques ?? [])
    {
        for (const pass of technique.passes ?? [])
        {
            // The authored order IS the sequence of stage records in the pass.
            // `pass.stageOrder` exists on the runtime reflection class, not on
            // this record tree, so reading it here yields `undefined` and
            // silently compares empty arrays — which is exactly what this test
            // did on its first run, reporting 84,912 comparisons that proved
            // nothing.
            stageOrders.push((pass.stages ?? []).map(stage => stage?.type ?? null));
            for (const stage of pass.stages ?? [])
            {
                for (const sampler of stage.samplers ?? [])
                {
                    // The STRING, never the arena reference. A name is stored
                    // as `{offset, value}`, and the offset legitimately moves
                    // when the emit re-interns the arena — comparing the
                    // reference reports every file as broken and hides whether
                    // the name itself survived.
                    const name = sampler?.name;
                    samplers.push(typeof name === "object" && name !== null
                        ? name.value ?? null
                        : name ?? null);
                }
            }
        }
    }

    return { samplers, stageOrders };
}

const corpusDir = process.env.CARBON_EFFECT_CORPUS_DIR || null;

test(
    "the WebGPU emit preserves non-dynamic sampler names and authored stage order",
    { skip: corpusDir ? false : "set CARBON_EFFECT_CORPUS_DIR to run the real-file proof" },
    async () =>
    {
        assert.ok((await stat(corpusDir)).isDirectory(), `corpus dir not found: ${corpusDir}`);

        let files = 0;
        let built = 0;
        let namedSamplers = 0;
        let totalOrders = 0;
        let nonCanonicalOrders = 0;
        const failures = [];

        for await (const filePath of walk(corpusDir))
        {
            files += 1;
            const bytes = new Uint8Array(await readFile(filePath));

            let emitted;
            try
            {
                emitted = CjsWebgpuFormat.buildEffect(bytes, { source: filePath });
            }
            catch
            {
                // A file this backend cannot translate is not a fidelity
                // failure. Only what is emitted is under test here.
                continue;
            }
            built += 1;

            const source = new CjsCarbonEffectReader(bytes, { source: filePath });
            const result = new CjsCarbonEffectReader(emitted.bytes, { source: `${filePath}#emitted` });

            if (source.records.length !== result.records.length)
            {
                failures.push(`${filePath}: body count ${source.records.length} -> ${result.records.length}`);
                continue;
            }

            const seen = new Set();
            for (let index = 0; index < source.records.length; index += 1)
            {
                if (seen.has(source.records[index].offset)) continue;
                seen.add(source.records[index].offset);

                const before = project(source.readDescription(index));
                const after = project(result.readDescription(index, { backend: true }));

                namedSamplers += before.samplers.filter(Boolean).length;
                totalOrders += before.stageOrders.length;
                // Counted separately because it is rare — 21 files in the
                // shipped corpus — and it is the case that actually
                // distinguishes a preserved order from a re-derived one. A run
                // reporting zero here has exercised the common path only, and
                // says so rather than implying more than it proved.
                nonCanonicalOrders += before.stageOrders.filter(order =>
                    order.length > 1 && order.some((value, at) => at > 0 && value < order[at - 1])).length;

                if (JSON.stringify(before.samplers) !== JSON.stringify(after.samplers))
                {
                    failures.push(`${filePath}#${index}: sampler names changed`);
                }
                if (JSON.stringify(before.stageOrders) !== JSON.stringify(after.stageOrders))
                {
                    failures.push(`${filePath}#${index}: stage order changed`);
                }
                if (failures.length > 8) break;
            }

            if (failures.length > 8) break;
        }

        console.log(
            `webgpu emit fidelity: ${built} of ${files} files emitted; `
            + `${namedSamplers} sampler names, ${totalOrders} stage orders `
            + `(${nonCanonicalOrders} non-canonical) compared`
        );

        // A sweep that compared nothing would pass silently, so the evidence
        // has to exist before its preservation means anything.
        assert.ok(built > 0, "no file emitted; the sweep proved nothing");
        assert.ok(namedSamplers > 0, "no sampler names compared; the sweep proved nothing");
        assert.ok(totalOrders > 0, "no stage orders compared; the sweep proved nothing");
        assert.deepEqual(failures, []);
    }
);
