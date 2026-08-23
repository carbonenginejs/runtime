import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { CjsHlslFormat } from "../../../src/formats/hlsl/index.js";

/**
 * Optional corpus sweep: parses every `.sm_hi` compiled effect file found
 * under the directory supplied by HLSL_CORPUS_DIR. Not part of the baseline
 * checks; game assets are never committed (org rule). Enable with:
 *   HLSL_CORPUS_DIR=path/to/effect.dx11 npm test
 */

function resolveCorpusDir()
{
    return process.env.HLSL_CORPUS_DIR || null;
}

async function* walk(dir)
{
    for (const entry of await readdir(dir, { withFileTypes: true }))
    {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(entryPath);
        else if (entry.name.toLowerCase().endsWith(".sm_hi")) yield entryPath;
    }
}

const corpusDir = resolveCorpusDir();

test(
    "corpus sweep parses every .sm_hi effect container",
    { skip: corpusDir ? false : "set HLSL_CORPUS_DIR to run the corpus sweep" },
    async () =>
    {
        assert.ok((await stat(corpusDir)).isDirectory(), `corpus dir not found: ${corpusDir}`);

        let files = 0;
        let permutations = 0;
        let techniques = 0;
        let quadv5Techniques = null;
        const failures = [];

        for await (const filePath of walk(corpusDir))
        {
            files += 1;
            const bytes = new Uint8Array(await readFile(filePath));
            try
            {
                // Default emit: "json" — the documented plain effect graph.
                const result = CjsHlslFormat.read(bytes, { source: filePath });
                permutations += result.permutations.length;

                if (result.effect)
                {
                    const names = result.effect.techniques.map((technique) => technique.name);
                    techniques += names.length;
                    if (path.basename(filePath).toLowerCase() === "quadv5.sm_hi") quadv5Techniques = names;
                }
            }
            catch (error)
            {
                failures.push({ filePath, message: error.message });
            }
        }

        console.log(`corpus: ${files} .sm_hi files, ${permutations} permutation axes, ${techniques} techniques decoded`);
        assert.ok(files > 0, "no .sm_hi files found under the corpus dir");
        assert.deepEqual(failures.slice(0, 5), [], `${failures.length} parse failures`);
        assert.ok(permutations > 0, "no permutation axes decoded across the corpus");
        assert.ok(techniques > 0, "no techniques decoded across the corpus");

        if (quadv5Techniques)
        {
            assert.deepEqual(quadv5Techniques, [ "Main", "Depth", "Picking", "Shadow", "DynamicLightShadow" ]);
        }
    }
);
