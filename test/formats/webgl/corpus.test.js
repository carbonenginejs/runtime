import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import CjsDxbcFormat from "../../../src/formats/dxbc/index.js";
import CjsWebglFormat from "../../../src/formats/webgl/index.js";

/**
 * Optional corpus sweep: scans the directory supplied by WEBGL_CORPUS_DIR for
 * `.sm_hi` compiled effect files with embedded DXBC payloads (raw magic scan,
 * same approach as
 * the dxbc format's own corpus test — no effect-container
 * parsing), emits GLSL for every vertex/pixel payload, and counts map-style
 * compute successes/kill-list rejections without failing on them. Not part
 * of the baseline checks; game assets are never committed. Enable with:
 *   WEBGL_CORPUS_DIR=path/to/effects npm test
 */

function resolveCorpusDir()
{
    return process.env.WEBGL_CORPUS_DIR || null;
}

async function* walk(dir)
{
    for (const entry of await readdir(dir, { withFileTypes: true }))
    {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(entryPath);
        else if (entry.name.endsWith(".sm_hi")) yield entryPath;
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

const KILL_LIST_PATTERN = /not supported|No GLSL lowering|unimplementable/i;

const corpusDir = resolveCorpusDir();

test(
    "corpus sweep emits GLSL for every vertex/pixel DXBC payload under *.sm_hi files",
    { skip: corpusDir ? false : "set WEBGL_CORPUS_DIR to run the corpus sweep" },
    async () =>
    {
        assert.ok((await stat(corpusDir)).isDirectory(), `corpus dir not found: ${corpusDir}`);

        let files = 0;
        let payloads = 0;
        let vertexPixelSuccess = 0;
        let computeSuccess = 0;
        let computeRejections = 0;
        let otherSkipped = 0;
        const vertexPixelFailures = [];

        for await (const filePath of walk(corpusDir))
        {
            files += 1;
            const bytes = new Uint8Array(await readFile(filePath));

            for (const blob of dxbcBlobs(bytes))
            {
                payloads += 1;

                let stageName = null;
                try
                {
                    stageName = CjsDxbcFormat.inspect(blob, { source: filePath }).programTypeName;
                }
                catch
                {
                    // Not a well-formed DXBC container at this offset; the magic
                    // scan is best-effort, so treat as not applicable.
                    otherSkipped += 1;
                    continue;
                }

                const isVertexOrPixel = stageName === "vertex" || stageName === "pixel";
                const isCompute = stageName === "compute";

                try
                {
                    CjsWebglFormat.emitGlsl(blob, { source: filePath });
                    if (isVertexOrPixel) vertexPixelSuccess += 1;
                    else if (isCompute) computeSuccess += 1;
                    else otherSkipped += 1;
                }
                catch (error)
                {
                    if (isVertexOrPixel)
                    {
                        vertexPixelFailures.push({ filePath, stageName, message: error.message });
                    }
                    else if (isCompute)
                    {
                        // Map-style-only lowering: real compute-pipeline features
                        // (shared memory, barriers, atomics, raw/structured/typed
                        // UAV reads) are an expected, counted rejection, not a
                        // failure.
                        assert.match(error.message, KILL_LIST_PATTERN,
                            `unexpected compute failure in ${filePath}: ${error.message}`);
                        computeRejections += 1;
                    }
                    else
                    {
                        otherSkipped += 1;
                    }
                }
            }
        }

        console.log(
            `corpus: ${files} .sm_hi files, ${payloads} DXBC payloads, ` +
            `${vertexPixelSuccess} vertex/pixel emissions, ${computeSuccess} compute emissions, ` +
            `${computeRejections} compute kill-list rejections, ${otherSkipped} skipped (non-vs/ps/compute)`
        );

        assert.ok(payloads > 0, "no DXBC payloads found under the corpus dir");
        assert.ok(vertexPixelSuccess > 0, "no vertex/pixel DXBC payloads were emitted");
        assert.deepEqual(vertexPixelFailures.slice(0, 5), [], `${vertexPixelFailures.length} vertex/pixel emission failures`);
    }
);
