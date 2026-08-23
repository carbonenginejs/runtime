import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, readdir, stat } from "node:fs/promises";

import { CjsCarbonEffectReader } from "../../../../../src/resource/format/carbonEffect/CjsCarbonEffectReader.js";
import { HlslEffectBindingManifest } from "../../../../../src/resource/formats/hlsl/core/tr2/shader/HlslEffectBindingManifest.js";
import { HlslEffectStateManager } from "../../../../../src/resource/formats/hlsl/core/HlslEffectStateManager.js";
import { HlslShaderBytecode } from "../../../../../src/resource/formats/hlsl/core/HlslShaderBytecode.js";
import { hlslShaderStageName } from "../../../../../src/resource/formats/hlsl/core/tr2/HlslRenderContextEnum.js";
import { readRaw } from "../../../../../src/resource/formats/hlsl/core/helpers.js";
import { buildEffectAnalysis } from "../../../../../src/resource/formats/webgpu/core/helpers.js";
import { runtimeDescriptionFromCarbon } from "../../../../../src/resource/formats/hlsl/core/carbonDescriptionToRuntime.js";

/**
 * Corpus-scale proof of the Carbon-to-runtime shape adapter.
 *
 * The always-green fixture next door proves the adapter against records built by
 * hand. This proves it against **every permutation of every shipped effect**,
 * which is where the two differ in the way that matters: a fixture reaches the
 * shapes somebody thought to write down, and the corpus reaches the ones nobody
 * did.
 *
 * Same design as the fixture test — **one file, read two ways**. A shipped
 * `effect.dx11` file is already a valid Carbon v15 container, so nothing is
 * rebuilt: the reference side goes through the HLSL reader, the candidate side
 * through the container reader and the adapter, over identical bytes. The arena
 * is therefore shared, which is what lets the diff stay **total** — no excluded
 * fields and no normalisation, over real data.
 *
 * Two things this run must get right, both of which are about the *reference*
 * side rather than the adapter, and both of which produced false divergences
 * before they were understood:
 *
 * - **`readRaw`, not `readEffectAnalysis`.** The latter resolves and parses the
 *   default permutation first, consuming state-manager handles before the loop
 *   begins, so every handle the reference reports is shifted. The tell was a
 *   file reporting `body2` handle 1 against the adapter's 5 — the reference had
 *   parsed body 2 first because it was the default.
 * - **One state manager per file, shared across bodies.** The handles are
 *   monotonic counters, and `effectRes` keeps one registry for the whole file,
 *   so the adapter has to accumulate into one registry too, in the same
 *   ascending body order.
 *
 * Neither is a mapping question, which is exactly why they are recorded here: a
 * total diff makes the harness's own assumptions load-bearing, and a harness
 * artefact reads precisely like a mapping bug.
 *
 * Measured at build 3444265 over `effect.dx11` **and** `effect.dx12`: **3222
 * files, 52,332 permutation bodies, 383,336 stages, zero divergences and zero
 * errors.**
 *
 * dx12 was added because dx11 alone was not enough, and it proved that twice:
 *
 * - Every dx12 body of `unpacked_quadv5.sm_hi` carries an `RtShadow` raytracing
 *   library. dx11 has none anywhere, so the adapter's original refusal to
 *   rebuild libraries never fired there and would have blocked every dx12
 *   package. These bodies are now the evidence that dropping libraries is
 *   invisible to the analysis.
 * - `patchSamplerHeapIndexConstant` grows a stage's constant-value size when a
 *   heap-index constant sits past the declared end. It fires only on dx12, and
 *   missing it under-allocates the buffer `packMaterial` writes into.
 *
 * The zero is a real measurement rather than a check that cannot fail. Earlier
 * revisions of this same sweep reported 651 and then 48 diverging files, and
 * each time the difference was real and diagnosable — a WebGPU-narrowed
 * three-stage name table where Carbon has six, then the two harness artefacts
 * above. It demonstrated its own failure twice before reaching zero.
 *
 * Zero errors also settles a question the fixture could not: every shipped body
 * that reaches the adapter rebuilds, including the library-bearing dx12 ones.
 *
 *   CARBON_EFFECT_CORPUS_DIR=path/to/effects npm test
 *
 * Game bytes are never committed; fetch them through tools-core at pinned build
 * 3444265. Point the variable at any tree containing `.sm_hi` / `.sm_lo` /
 * `.sm_depth` files.
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
 * Collects differing JSON paths between two documents, up to a cap.
 *
 * @param {*} left Reference value.
 * @param {*} right Candidate value.
 * @param {string} [at] Current path.
 * @param {string[]} [out] Accumulated differences.
 * @param {number} [cap] Maximum differences to collect.
 * @returns {string[]} Differing paths.
 */
function diffPaths(left, right, at = "", out = [], cap = 8)
{
    if (out.length >= cap) return out;

    if (Array.isArray(left) || Array.isArray(right))
    {
        if (!Array.isArray(left) || !Array.isArray(right))
        {
            out.push(`${at}: array/non-array`);
            return out;
        }
        if (left.length !== right.length)
        {
            out.push(`${at}: length ${left.length} vs ${right.length}`);
            return out;
        }
        for (let index = 0; index < left.length; index += 1)
        {
            diffPaths(left[index], right[index], `${at}[${index}]`, out, cap);
        }
        return out;
    }

    if (left && right && typeof left === "object" && typeof right === "object")
    {
        for (const key of [ ...new Set([ ...Object.keys(left), ...Object.keys(right) ]) ].sort())
        {
            const has = Object.prototype.hasOwnProperty.call(left, key)
                && Object.prototype.hasOwnProperty.call(right, key);
            if (!has)
            {
                out.push(`${at}.${key}: present on only one side`);
                continue;
            }
            diffPaths(left[key], right[key], `${at}.${key}`, out, cap);
        }
        return out;
    }

    if (!Object.is(left, right))
    {
        out.push(`${at}: ${JSON.stringify(left)} (${typeof left}) vs ${JSON.stringify(right)} (${typeof right})`);
    }
    return out;
}

/**
 * Builds one analysis document from an already-decoded description.
 *
 * @param {object} effectRes Loaded effect resource.
 * @param {object} effectDescription Runtime effect description.
 * @param {number} bodyIndex Permutation index.
 * @param {string} source Source label.
 * @returns {object} Analysis document.
 */
function analysisOf(effectRes, effectDescription, bodyIndex, source)
{
    const effectName = effectDescription?.effectName ?? "";
    return buildEffectAnalysis({
        effectRes,
        effectDescription,
        bindingManifest: HlslEffectBindingManifest.fromEffectDescription(effectDescription, { effectName }),
        selection: { bodyIndex, selectedOptions: [] }
    }, { source, decodeBytecode: false });
}

const corpusDir = process.env.CARBON_EFFECT_CORPUS_DIR || null;

test(
    "the container-derived analysis matches the source-derived analysis for every shipped permutation",
    { skip: corpusDir ? false : "set CARBON_EFFECT_CORPUS_DIR to run the real-file proof" },
    async () =>
    {
        assert.ok((await stat(corpusDir)).isDirectory(), `corpus dir not found: ${corpusDir}`);

        let files = 0;
        let bodies = 0;
        let stages = 0;
        const divergences = [];
        const failures = [];

        for await (const filePath of walk(corpusDir))
        {
            const source = path.relative(corpusDir, filePath).replace(/\\/g, "/");
            let bytes;
            try
            {
                bytes = new Uint8Array(await readFile(filePath));
            }
            catch (error)
            {
                failures.push(`${source}: unreadable — ${error.message}`);
                continue;
            }

            try
            {
                // readRaw, not readEffectAnalysis: see the header note. Parsing the
                // default body first would shift every handle the reference reports.
                const effectRes = readRaw(bytes, { source });
                const reader = new CjsCarbonEffectReader(bytes, { source });
                // One registry for the whole file, matching effectRes's own.
                const stateManager = new HlslEffectStateManager();
                files += 1;

                for (let bodyIndex = 0; bodyIndex < reader.records.length; bodyIndex += 1)
                {
                    const shader = effectRes.GetShaderByIndex(bodyIndex);
                    const sourceDescription = shader.GetEffectDescription();
                    const effectName = sourceDescription?.effectName ?? "";

                    const reference = analysisOf(effectRes, sourceDescription, bodyIndex, source);

                    const rebuilt = runtimeDescriptionFromCarbon(reader.readDescription(bodyIndex), {
                        effectName,
                        version: reader.version,
                        effectStateManager: stateManager,
                        bytecodeFor: (stage, stageType) => new HlslShaderBytecode({
                            stageType,
                            // Carbon's six stage names, not WebGPU's three. A
                            // three-entry table silently reports "geometry" as null.
                            stageName: hlslShaderStageName(stageType),
                            bytes: stage.shaderData.bytes,
                            shaderSize: stage.shaderData.size,
                            stringTableOffset: stage.shaderData.offset,
                            effectName
                        })
                    });

                    const candidate = analysisOf(effectRes, rebuilt, bodyIndex, source);

                    bodies += 1;
                    stages += reference.stages.length;

                    const differences = diffPaths(reference, candidate);
                    if (differences.length && divergences.length < 20)
                    {
                        divergences.push(`${source} body${bodyIndex}: ${differences.join("; ")}`);
                    }
                }
            }
            catch (error)
            {
                failures.push(`${source}: ${error.name}: ${error.message}`);
            }
        }

        assert.ok(files > 0, `no effect files found under ${corpusDir}`);
        assert.deepEqual(failures, [], `adapter failed on shipped effects:\n${failures.slice(0, 20).join("\n")}`);
        assert.deepEqual(
            divergences,
            [],
            `container-derived analysis diverges from source-derived:\n${divergences.join("\n")}`
        );

        console.log(
            `carbon analysis adapter: ${files} files, ${bodies} bodies, ${stages} stages, zero divergences`
        );
    }
);
