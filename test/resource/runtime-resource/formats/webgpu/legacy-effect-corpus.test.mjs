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
                new CjsCarbonEffectReader(built.bytes, { source }).readDescription(0);
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
