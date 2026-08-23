import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { CjsByteWriter } from "../../../../src/resource/format/CjsByteWriter.js";
import {
    passthroughArena,
    writeEffectDescription
} from "../../../../src/resource/format/carbonEffect/carbonEffectRecords.js";
import { CjsCarbonEffectReader } from "../../../../src/resource/format/carbonEffect/CjsCarbonEffectReader.js";
import {
    CjsCarbonEffectWriter,
    writeCarbonEffectFile
} from "../../../../src/resource/format/carbonEffect/CjsCarbonEffectWriter.js";

/**
 * Optional real-file proof. Reads every compiled effect under the directory in
 * CARBON_EFFECT_CORPUS_DIR and re-emits it, byte for byte, three ways:
 *
 *   1. each description blob, through the file's own arena — proves the v15
 *      field order against CCP's own bytes;
 *   2. the whole container from raw bodies and the source arena — proves the
 *      header order, the body-offset base arithmetic and the alias path;
 *   3. the whole container with the arena rebuilt from the references we found —
 *      proves the sorted-offset policy, and is the only one of the three that
 *      can legitimately differ, because an arena may retain blobs the file no
 *      longer references. When it differs the divergence is reported exactly;
 *      it is never downgraded to a weaker comparison.
 *
 * Point it at a tree containing all three shipped backends — `effect.dx11`,
 * `effect.dx12` and `effect.metal`. All three are the same v15 container with a
 * different program payload (DXBC, DXBC, AIR) and no language field anywhere, so
 * a byte-exact round trip across the three tests "the metadata region is
 * backend-invariant" directly rather than arguing it from the writer. Metal is
 * reachable only through the `macos-metal` overlay registered in
 * `tools-core/data.local`; it is absent from the default index path.
 *
 * Game assets are never committed (org rule). Fetch through tools-core at the
 * pinned build and point the variable at the result:
 *   CARBON_EFFECT_CORPUS_DIR=path/to/effects npm test
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
 * Canonicalises an offset table's alias grouping: which permutation rows share a
 * body, independent of where that body sits.
 *
 * Aliasing is the one thing the write path *decides* rather than preserves. Phase 1
 * proved re-emission — read the rows, write them back — which carries aliases
 * across without ever choosing them. Deciding is new logic: Carbon compares packed
 * bodies pairwise and points a duplicate's row at the surviving twin
 * (`ShaderCompiler.cpp:717-744`, `:804-820`), which is why `bodyKey` was dropped in
 * favour of "identical offset is the alias". Get that decision wrong and the result
 * is a structurally valid file with wrong sharing: every check passes, the arena is
 * sound, and the wrong permutation resolves to the wrong body.
 *
 * CCP's own files are the oracle, because they already contain the answer.
 *
 * @param {object[]} records Offset-table rows.
 * @returns {string} Canonical grouping, comparable across files.
 */
function aliasGrouping(records)
{
    const byOffset = new Map();
    for (let index = 0; index < records.length; index += 1)
    {
        if (!byOffset.has(records[index].offset)) byOffset.set(records[index].offset, []);
        byOffset.get(records[index].offset).push(index);
    }
    return JSON.stringify(
        Array.from(byOffset.values())
            .map((group) => group.slice().sort((a, b) => a - b))
            .sort((a, b) => a[0] - b[0])
    );
}

/**
 * Returns the first offset at which two byte runs differ, or -1.
 *
 * @param {Uint8Array} a First byte run.
 * @param {Uint8Array} b Second byte run.
 * @returns {number} First differing offset, or -1 when equal.
 */
function firstDifference(a, b)
{
    const shared = Math.min(a.length, b.length);
    for (let index = 0; index < shared; index += 1)
    {
        if (a[index] !== b[index]) return index;
    }
    return a.length === b.length ? -1 : shared;
}

const corpusDir = process.env.CARBON_EFFECT_CORPUS_DIR || null;

test(
    "real v15 effect containers re-emit byte-exactly",
    { skip: corpusDir ? false : "set CARBON_EFFECT_CORPUS_DIR to run the real-file proof" },
    async () =>
    {
        assert.ok((await stat(corpusDir)).isDirectory(), `corpus dir not found: ${corpusDir}`);

        let files = 0;
        let bodies = 0;
        let uniqueBodies = 0;
        let sparse = 0;
        let misordered = 0;
        const descriptionFailures = [];
        const containerFailures = [];
        const rebuildDivergences = [];
        const aliasMismatches = [];
        let aliasingFiles = 0;
        let maxAliasRatio = 1;

        for await (const filePath of walk(corpusDir))
        {
            files += 1;
            const original = new Uint8Array(await readFile(filePath));
            const reader = new CjsCarbonEffectReader(original, { source: filePath });

            if (!reader.diagnostics.dense) sparse += 1;
            if (!reader.diagnostics.indicesMatchPosition) misordered += 1;
            bodies += reader.records.length;
            uniqueBodies += reader.diagnostics.uniqueBodyCount;

            // 1. Every distinct description blob re-emits exactly.
            const seen = new Set();
            const descriptions = new Array(reader.records.length);
            for (let index = 0; index < reader.records.length; index += 1)
            {
                const description = reader.readDescription(index);
                descriptions[index] = description;
                if (seen.has(reader.records[index].offset)) continue;
                seen.add(reader.records[index].offset);

                const writer = new CjsByteWriter();
                writeEffectDescription(writer, description, { arena: passthroughArena });
                const emitted = writer.toBytes();
                const source = reader.bodyBytes(index);
                const difference = firstDifference(emitted, source);
                if (difference !== -1)
                {
                    descriptionFailures.push({
                        filePath,
                        index,
                        difference,
                        emittedLength: emitted.length,
                        sourceLength: source.length
                    });
                }
            }

            // 2. The whole container, reusing the source arena and bodies.
            const reemitted = writeCarbonEffectFile({
                compilerVersion: reader.compilerVersion,
                sourceHash: reader.sourceHash,
                stringTableBytes: reader.stringTableBytes,
                permutationRows: reader.permutations.map((axis) => ({
                    name: axis.name.value,
                    nameOffset: axis.name.offset,
                    defaultOption: axis.defaultOption,
                    descriptionOffset: axis.description.offset,
                    type: axis.type,
                    options: axis.options.map((option) => option.offset)
                })),
                bodies: reader.records.map((record, index) => ({
                    index,
                    bytes: reader.bodyBytes(index)
                }))
            });
            const containerDifference = firstDifference(reemitted, original);
            if (containerDifference !== -1)
            {
                containerFailures.push({
                    filePath,
                    difference: containerDifference,
                    emittedLength: reemitted.length,
                    sourceLength: original.length
                });
            }

            // 3. The whole container with the arena rebuilt from what we read.
            const rebuilt = new CjsCarbonEffectWriter({
                compilerVersion: reader.compilerVersion,
                sourceHash: reader.sourceHash
            });
            for (const axis of reader.permutations)
            {
                rebuilt.addPermutation({
                    name: axis.name.value,
                    defaultOption: axis.defaultOption,
                    description: axis.description.value,
                    type: axis.type,
                    options: axis.options.map((option) => option.value)
                });
            }
            for (let index = 0; index < descriptions.length; index += 1)
            {
                rebuilt.addBody(index, descriptions[index]);
            }
            const rebuiltBytes = rebuilt.toBytes();
            const rebuiltArenaSize = rebuilt.stringTable.byteLength;

            // Assert the alias decision by name, before the byte comparison. A
            // byte diff would catch a wrong grouping too, but it would report it as
            // "these files differ at offset 918204", which is not a diagnosis.
            const rebuiltReader = new CjsCarbonEffectReader(rebuiltBytes, {
                source: `${filePath}#rebuilt`
            });
            const sourceGrouping = aliasGrouping(reader.records);
            if (aliasGrouping(rebuiltReader.records) !== sourceGrouping)
            {
                aliasMismatches.push({
                    filePath,
                    rows: reader.records.length,
                    sourceBodies: reader.diagnostics.uniqueBodyCount,
                    rebuiltBodies: rebuiltReader.diagnostics.uniqueBodyCount
                });
            }
            if (reader.records.length > reader.diagnostics.uniqueBodyCount) aliasingFiles += 1;
            maxAliasRatio = Math.max(
                maxAliasRatio,
                reader.records.length / reader.diagnostics.uniqueBodyCount
            );

            if (firstDifference(rebuiltBytes, original) !== -1)
            {
                rebuildDivergences.push({
                    filePath,
                    difference: firstDifference(rebuiltBytes, original),
                    arenaDelta: reader.stringTableSize - rebuiltArenaSize,
                    sourceArenaSize: reader.stringTableSize,
                    rebuiltArenaSize,
                    sourceLength: original.length,
                    rebuiltLength: rebuiltBytes.length
                });

                // The only legitimate reason a rebuild differs is that the source
                // arena retains blobs the file no longer references, which makes
                // the rebuilt arena strictly smaller. Anything else is a defect
                // in the sorted-offset policy and must not be waved through.
                assert.ok(
                    rebuiltArenaSize < reader.stringTableSize,
                    `${filePath}: rebuilt arena is not smaller than the source arena (${rebuiltArenaSize} vs ${reader.stringTableSize}), so the divergence is not unreferenced-blob retention`
                );
            }
        }

        console.log(
            `carbon effect corpus: ${files} files, ${bodies} rows, ${uniqueBodies} distinct bodies; `
            + `${sparse} sparse, ${misordered} misordered; ${rebuildDivergences.length} arena rebuilds diverged`
        );
        console.log(
            `alias decision: ${aliasingFiles} files alias, max ratio `
            + `${maxAliasRatio.toFixed(1)}:1, ${aliasMismatches.length} groupings disagreed with CCP`
        );
        if (rebuildDivergences.length)
        {
            console.log("arena rebuild divergences (first 5):", rebuildDivergences.slice(0, 5));
        }

        assert.ok(files > 0, "no compiled effect files found under the corpus dir");
        assert.deepEqual(aliasMismatches.slice(0, 5), [], `${aliasMismatches.length} files where our alias decision disagreed with CCP's compiler`);
        assert.ok(maxAliasRatio > 1, "no aliasing file in the corpus; the alias decision is untested");
        assert.deepEqual(descriptionFailures.slice(0, 5), [], `${descriptionFailures.length} description blobs did not re-emit byte-exactly`);
        assert.deepEqual(containerFailures.slice(0, 5), [], `${containerFailures.length} containers did not re-emit byte-exactly`);
    }
);
