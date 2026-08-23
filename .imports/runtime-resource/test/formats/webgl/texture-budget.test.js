import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { buildEffectPackage } from "../../../src/formats/webgl/core/effectPackage.js";

/**
 * Guards the WebGL2 texture budget on the shaders that actually strain it.
 *
 * WebGL2 guarantees 16 texture image units per stage. The v5 quad `.sm_depth`
 * shaders declare 19 resources, and only fit once the detail maps merge into one
 * array and the local-light buffers pack into one texture. A regression in
 * either saving is otherwise invisible until a shader fails to link on a
 * 16-unit device, which is not something a unit test would ever see.
 *
 * Game assets are never committed, so this is opt-in:
 *
 *   WEBGL_DEPTH_CORPUS_DIR=path/to/effect.dx11 npm test
 *
 * Point it at any directory above some `.sm_depth` files; the walk recurses, so
 * an effect tree root works as well as one leaf directory. See
 * docs/contracts/webgl2-texture-budget.md — in particular, `.sm_hi` is the wrong
 * file: it carries no lights and peaks at 16, so measuring it proves nothing
 * about this constraint.
 */

/** WebGL2's guaranteed texture image units per shader stage. */
const WEBGL2_TEXTURE_UNITS = 16;

/**
 * Lists every `.sm_depth` file under a directory, recursively.
 *
 * @param {string} dir Corpus root.
 * @returns {Promise<string[]>} Paths relative to the root.
 */
async function depthShadersUnder(dir)
{
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".sm_depth"))
        .map((entry) => path.relative(dir, path.join(entry.parentPath ?? entry.path, entry.name)));
}

const SAMPLER_DECLARATION = /uniform \w+ u?i?sampler\w+ \w+;/gu;

const corpusDir = process.env.WEBGL_DEPTH_CORPUS_DIR || null;

/**
 * Peak sampler declarations in any one stage, across every permutation.
 *
 * @param {Uint8Array} bytes Compiled effect bytes.
 * @param {string} source Source name.
 * @param {string} localLights Local-light lowering mode.
 * @returns {{peak:number, failed:number, excluded:number}} Measurement.
 */
function measure(bytes, source, localLights)
{
    const pkg = buildEffectPackage(bytes, {
        source,
        allPermutations: true,
        allowFailures: true,
        localLights
    });

    let peak = 0;
    for (const unit of pkg.backendBodySet.passUnits)
    {
        for (const shader of unit.shaders)
        {
            const declarations = shader.code.match(SAMPLER_DECLARATION) ?? [];
            if (declarations.length > peak) peak = declarations.length;
        }
    }

    return {
        peak,
        failed: pkg.info.failedShaderCount + pkg.info.failedBodyCount,
        excluded: pkg.info.excludedShaderCount
    };
}

test(
    "every .sm_depth shader fits WebGL2's 16 texture units once lights are packed",
    { skip: corpusDir ? false : "set WEBGL_DEPTH_CORPUS_DIR to run the texture budget guard" },
    async () =>
    {
        assert.ok((await stat(corpusDir)).isDirectory(), `corpus dir not found: ${corpusDir}`);

        const files = await depthShadersUnder(corpusDir);
        assert.ok(files.length, `no .sm_depth files under ${corpusDir}`);

        for (const name of files)
        {
            const bytes = await readFile(path.join(corpusDir, name));
            const lowered = measure(bytes, name, "packed-texture");

            // A shader that failed to translate leaves the sample and flatters
            // the count, so the peak means nothing without this.
            assert.equal(lowered.failed, 0, `${name}: ${lowered.failed} translation failure(s)`);
            assert.equal(lowered.excluded, 0, `${name}: ${lowered.excluded} exclusion(s)`);

            assert.ok(
                lowered.peak <= WEBGL2_TEXTURE_UNITS,
                `${name}: peak ${lowered.peak} samplers exceeds WebGL2's ${WEBGL2_TEXTURE_UNITS}`
            );
        }
    }
);

test(
    "the light packing is what buys the headroom, not an accident of the corpus",
    { skip: corpusDir ? false : "set WEBGL_DEPTH_CORPUS_DIR to run the texture budget guard" },
    async () =>
    {
        // Without this the first test would still pass if the lowering silently
        // stopped doing anything and the shaders happened to fit anyway. At
        // least one shader must be over the limit before lowering, and that same
        // shader must come under it after.
        const files = await depthShadersUnder(corpusDir);
        let strained = 0;

        for (const name of files)
        {
            const bytes = await readFile(path.join(corpusDir, name));
            const raw = measure(bytes, name, "none");
            if (raw.peak <= WEBGL2_TEXTURE_UNITS) continue;

            strained += 1;
            const lowered = measure(bytes, name, "packed-texture");
            assert.ok(
                lowered.peak < raw.peak,
                `${name}: packing freed nothing (${raw.peak} -> ${lowered.peak})`
            );
        }

        assert.ok(
            strained > 0,
            "no shader in the corpus exceeds 16 units before lowering; "
            + "this corpus cannot detect a regression — point it at the quad .sm_depth files"
        );
    }
);
