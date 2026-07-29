import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { CjsDxbcFormat } from "../../../src/formats/dxbc/index.js";

/**
 * Optional corpus sweep: scans the directory supplied by DXBC_CORPUS_DIR for
 * embedded DXBC payloads (raw magic scan — no effect-container parsing) and
 * decodes every one. Not part of the baseline checks; game assets are never
 * committed. Enable with:
 *   DXBC_CORPUS_DIR=path/to/effects npm test
 */

function resolveCorpusDir()
{
    return process.env.DXBC_CORPUS_DIR || null;
}

async function* walk(dir)
{
    for (const entry of await readdir(dir, { withFileTypes: true }))
    {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(entryPath);
        else yield entryPath;
    }
}

function* dxbcBlobs(bytes)
{
    for (let i = 0; i + 32 <= bytes.length; i += 1)
    {
        if (bytes[i] === 0x44 && bytes[i + 1] === 0x58 && bytes[i + 2] === 0x42 && bytes[i + 3] === 0x43)
        {
            const size = bytes[i + 24] | (bytes[i + 25] << 8) | (bytes[i + 26] << 16) | (bytes[i + 27] << 24);
            if (size >= 32 && i + size <= bytes.length)
            {
                yield bytes.subarray(i, i + size);
                i += size - 1;
            }
        }
    }
}

const corpusDir = resolveCorpusDir();

test(
    "corpus sweep decodes every embedded DXBC payload",
    { skip: corpusDir ? false : "set DXBC_CORPUS_DIR to run the corpus sweep" },
    async () =>
    {
        assert.ok((await stat(corpusDir)).isDirectory(), `corpus dir not found: ${corpusDir}`);

        let files = 0;
        let payloads = 0;
        let instructions = 0;
        const failures = [];

        for await (const filePath of walk(corpusDir))
        {
            files += 1;
            const bytes = new Uint8Array(await readFile(filePath));
            for (const blob of dxbcBlobs(bytes))
            {
                payloads += 1;
                try
                {
                    const result = CjsDxbcFormat.read(blob, { emit: CjsDxbcFormat.OUTPUT_RAW, source: filePath });
                    if (result.decoder) instructions += result.decoder.instructions.length;
                }
                catch (error)
                {
                    failures.push({ filePath, message: error.message });
                }
            }
        }

        console.log(`corpus: ${files} files, ${payloads} DXBC payloads, ${instructions} instructions decoded`);
        assert.ok(payloads > 0, "no DXBC payloads found under the corpus dir");
        assert.deepEqual(failures.slice(0, 5), [], `${failures.length} decode failures`);
    }
);
