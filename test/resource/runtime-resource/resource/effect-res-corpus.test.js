import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { CjsCarbonEffectReader } from "../../../../src/resource/format/carbonEffect/CjsCarbonEffectReader.js";
import { CjsCarbonEffectWriter } from "../../../../src/resource/format/carbonEffect/CjsCarbonEffectWriter.js";
import { Tr2EffectRes } from "../../../../src/resource/shader/Tr2EffectRes.js";

/**
 * Every shipped effect, through the classes, back to the same bytes.
 *
 * `carbon-effect-corpus.test.js` proves the byte codec: records in, the same
 * records out. This proves the layer above it — that a `Tr2Shader` holds enough
 * of the file to rebuild the file, not merely enough to describe it.
 *
 * Byte equality is the assertion on purpose. A record-level comparison passed
 * while three separate things were being lost, because each loss was invisible
 * once the records had been rebuilt from the same lossy classes:
 *
 *   - a non-dynamic sampler's name, which Carbon's reader nulls but the file
 *     still carries (1631 files);
 *   - the file's stage order, which is authored rather than derivable — across
 *     288,528 passes, 156 write vertex/geometry/pixel and 12 write
 *     vertex/pixel/geometry (21 files);
 *   - the offset word behind a zero-size blob, which the writer passes through
 *     and which is not always the null sentinel (150 files).
 *
 * None of the three is a runtime fault; all three are fidelity, and fidelity is
 * what makes this check worth running at all. A test that tolerates named
 * exceptions stops catching the next one.
 *
 * Enable with a directory of Carbon effect containers:
 *
 *   CARBON_EFFECT_CORPUS_DIR=path/to/effects node --test test/resource/...
 *
 * The tree is walked recursively and files are selected by content — a v15
 * container opens on its version dword — so a flat content-addressed store works
 * as well as a resource tree.
 */

const corpusDir = process.env.CARBON_EFFECT_CORPUS_DIR || null;
const CARBON_V15 = [ 15, 0, 0, 0 ];

async function collectContainers(dir, out = [])
{
    for (const entry of await readdir(dir, { withFileTypes: true }))
    {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory())
        {
            await collectContainers(full, out);
            continue;
        }
        try
        {
            if ((await stat(full)).size < 64) continue;
            const head = (await readFile(full)).subarray(0, 4);
            if (CARBON_V15.every((byte, index) => head[index] === byte)) out.push(full);
        }
        catch
        {
            // Unreadable entries are not the subject of this proof.
        }
    }
    return out;
}

/**
 * Rebuilds a container from the classes a resource hydrates out of it.
 *
 * The header is copied because it is not description content: the compiler
 * version and source hash belong to whoever compiled the effect.
 *
 * @param {Uint8Array} bytes Source container.
 * @returns {Uint8Array} Rebuilt container.
 */
function reemit(bytes)
{
    const reader = new CjsCarbonEffectReader(bytes);
    const res = new Tr2EffectRes().DoLoad(bytes);
    const writer = new CjsCarbonEffectWriter({
        compilerVersion: reader.compilerVersion,
        sourceHash: new TextDecoder().decode(reader.sourceHash)
    });
    for (const axis of reader.permutations)
    {
        writer.addPermutation({
            name: axis.name.value,
            options: axis.options.map(option => option.value),
            defaultOption: axis.defaultOption,
            description: axis.description.value,
            type: axis.type
        });
    }
    for (let index = 0; index < reader.records.length; index += 1)
    {
        writer.addBody(
            index,
            res.GetShaderByIndex(index).effect.toCarbonBinary()
        );
    }
    return writer.toBytes();
}

test(
    "every shipped effect re-emits byte for byte through the reflection classes",
    { skip: corpusDir ? false : "set CARBON_EFFECT_CORPUS_DIR to run the real-file proof" },
    async () =>
    {
        const files = await collectContainers(corpusDir);
        assert.ok(files.length > 0, `no Carbon v15 containers under ${corpusDir}`);

        let bodies = 0;
        const failed = [];
        for (const file of files)
        {
            const bytes = new Uint8Array(await readFile(file));
            try
            {
                const out = reemit(bytes);
                bodies += new CjsCarbonEffectReader(bytes).records.length;
                if (out.length !== bytes.length
                    || !out.every((byte, index) => byte === bytes[index]))
                {
                    failed.push(`${file}: ${bytes.length} -> ${out.length} bytes`);
                }
            }
            catch (error)
            {
                failed.push(`${file}: ${error.message}`);
            }
        }

        // Name the first few rather than only the count: a bare count says
        // something broke without saying what to open.
        assert.deepEqual(
            failed.slice(0, 5),
            [],
            `${failed.length} of ${files.length} files failed to re-emit`
        );
        console.log(
            `      ${files.length} containers, ${bodies} bodies, byte-identical`
        );
    }
);
