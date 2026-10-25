import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import CjsWebgpuFormat from "../../../../../src/resource/formats/webgpu/index.js";
import { CjsCarbonEffectReader } from "../../../../../src/resource/format/carbonEffect/CjsCarbonEffectReader.js";

/**
 * Optional real-file proof: every pre-v8 `.fxt` under
 * CARBON_EFFECT_LEGACY_CORPUS_DIR translates to a WebGPU container in selected
 * mode, as the in-memory shader loader asks for it, and that container reads
 * back. Build 1142708's `graphics/shaders/compiled/dx11/*.fxt` are the corpus;
 * fetch them through tools-core at that build. Game assets are never committed.
 *
 *   CARBON_EFFECT_LEGACY_CORPUS_DIR=path/to/fxt npm test
 */

/**
 * Files the translator does not yet handle, each with the failure it reports.
 * A file leaving this list must be removed from it, and a new failure fails.
 */
const KNOWN_UNSUPPORTED = new Map([
    [ "ssao.fxt", /unsupported observable undefined path/u ]
]);

const corpusDir = process.env.CARBON_EFFECT_LEGACY_CORPUS_DIR || null;

/** Stage type of each WGSL visibility. */
const STAGE_OF_VISIBILITY = { vertex: 0, fragment: 1, compute: 5 };

/** Register class of each WGSL resource kind. */
const CLASS_OF_KIND = { "uniform-buffer": "b", "sampled-resource": "t", "sampler": "s", "storage-resource": "u" };

/**
 * A pass's signature registers as sorted "stage:class+index" slots.
 *
 * @param {object} pass Pass record.
 * @returns {string[]} Slots.
 */
function signatureSlots(pass)
{
    const slots = new Set();
    for (const stage of pass.stages)
    {
        for (const register of stage.registers)
        {
            const kind = register.registerType & 64 ? "u" : register.registerType & 32 ? "t" : register.registerType === 1 ? "s" : "b";
            slots.add(`${stage.type}:${kind}${register.registerIndex}`);
        }
    }
    return [ ...slots ].sort();
}

/**
 * A WGSL layout's bindings as sorted "stage:class+index" slots.
 *
 * @param {object} layout WGSL pass layout.
 * @returns {string[]} Slots.
 */
function layoutSlots(layout)
{
    const slots = new Set();
    for (const group of layout.bindGroups)
    {
        for (const binding of group.bindings)
        {
            for (const visibility of binding.visibility)
            {
                slots.add(`${STAGE_OF_VISIBILITY[visibility]}:${CLASS_OF_KIND[binding.resourceKind]}${binding.registerIndex}`);
            }
        }
    }
    return [ ...slots ].sort();
}

test(
    "real pre-v8 effect containers translate in selected mode and read back",
    { skip: corpusDir ? false : "set CARBON_EFFECT_LEGACY_CORPUS_DIR to run the pre-v8 translation proof" },
    async () =>
    {
        assert.ok((await stat(corpusDir)).isDirectory(), `corpus dir not found: ${corpusDir}`);

        let translated = 0;
        const failures = [];
        const files = (await readdir(corpusDir)).filter((name) => name.toLowerCase().endsWith(".fxt"));
        for (const name of files)
        {
            const source = `res:/graphics/shaders/compiled/dx11/${name}`;
            const bytes = new Uint8Array(await readFile(path.join(corpusDir, name)));
            try
            {
                const built = CjsWebgpuFormat.buildEffect(bytes, { source, permutation: [] });
                assert.equal(built.info.completeness.sourceComplete, false);
                const description = new CjsCarbonEffectReader(built.bytes, { source }).readDescription(0);
                // Below v9 the source has no register signature; the emitted
                // v15 body holds one from the bytecode's declarations, and it
                // must name exactly the slots the WGSL layout binds.
                for (const [ passIndex, pass ] of description.techniques[0].passes.entries())
                {
                    const layout = built.wgsl.layouts.find(entry => entry.passIndex === passIndex);
                    assert.deepEqual(signatureSlots(pass), layoutSlots(layout), `${name} pass ${passIndex}`);
                }
                translated += 1;
                assert.equal(KNOWN_UNSUPPORTED.has(name), false, `${name} now translates; remove it from KNOWN_UNSUPPORTED`);
            }
            catch (error)
            {
                if (KNOWN_UNSUPPORTED.has(name) && KNOWN_UNSUPPORTED.get(name).test(error.message)) continue;
                failures.push({ name, message: error.message });
            }
        }

        console.log(`pre-v8 translation: ${translated} of ${files.length} .fxt, ${KNOWN_UNSUPPORTED.size} known unsupported`);
        assert.ok(files.length > 0, "no .fxt files found under the corpus dir");
        assert.deepEqual(failures, []);
    }
);
