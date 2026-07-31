// Source: trinity/trinity/Resources/Tr2EffectRes.cpp (DoLoad, GetShader)
// Source: trinity/shadercompiler/ShaderCompiler.cpp:746-845 (file assembly)

import { CjsByteReader } from "../CjsByteReader.js";
import { CjsFormatReadError } from "../CjsFormatError.js";
import { CARBON_EFFECT_DATA_VERSION, readEffectDescription } from "./carbonEffectRecords.js";

/** Byte count of the ASCII-hex MD5 source hash in the v15 header. */
export const CARBON_EFFECT_SOURCE_HASH_BYTES = 32;

/** Byte count of one offset-table row: `{u32 index, u32 offset, u32 size}`. */
export const CARBON_EFFECT_RECORD_BYTES = 12;

/**
 * Plain byte cursor over one description blob, carrying the Carbon effect error
 * class and message.
 *
 * Separate from the container reader because the container reader parses its
 * header in the constructor; a body needs a cursor, not a second header parse.
 */
export class CjsCarbonEffectBodyReader extends CjsByteReader
{
    static ReadError = CjsFormatReadError;

    static endOfDataMessage = "Unexpected end of Carbon effect data";
}

/**
 * Reader for Carbon's compiled-effect container at version 15.
 *
 * The header is (`ShaderCompiler.cpp:822-831`):
 *
 * ```
 * u32      version = 15
 * u8[4]    shaderCompilerVersion       <- four bytes, not a u32
 * char[32] sourceHash                  <- ASCII hex MD5 of the HLSL inputs
 * u32      stringTableSize | arena
 * u8       permutationCount | permutation records
 * u32      recordCount     | recordCount x { u32 index, u32 offset, u32 size }
 * description blobs
 * ```
 *
 * Only version 15 is accepted. Carbon's own reader takes 2..15
 * (`Tr2EffectRes.cpp:209`) but marks the v13/v14 field-order boundaries
 * unverified, and every file in the shipped dx11/dx12 corpus is v15, so a
 * lower version here means something unexpected rather than something old.
 */
export class CjsCarbonEffectReader extends CjsCarbonEffectBodyReader
{
    /** Cursor class used for description blobs. */
    static BodyReader = CjsCarbonEffectBodyReader;

    /**
     * Reads the container header, arena, permutation axes and offset table.
     *
     * @param {ArrayBuffer|ArrayBufferView|Uint8Array} bytes Container bytes.
     * @param {object} [options] Read options.
     * @param {string} [options.source] Source name used in error details.
     * @param {boolean} [options.permissive] Accept a sparse or misordered offset
     *     table instead of rejecting it. For forensic inspection of a file already
     *     known to be malformed; never for a load path.
     */
    constructor(bytes, options = {})
    {
        super(bytes, options);

        this.version = this.readUint32();
        if (this.version !== CARBON_EFFECT_DATA_VERSION)
        {
            throw this._error(
                `Unsupported Carbon effect version ${this.version}; expected ${CARBON_EFFECT_DATA_VERSION}`,
                { version: this.version }
            );
        }

        this.compilerVersion = Array.from(this.readRaw(4));
        this.sourceHash = Uint8Array.from(this.readRaw(CARBON_EFFECT_SOURCE_HASH_BYTES));

        this.stringTableSize = this.readUint32();
        if (this.offset + this.stringTableSize > this.bytes.length)
        {
            throw this._error("Invalid Carbon effect string-table size", {
                stringTableSize: this.stringTableSize,
                byteLength: this.bytes.length
            });
        }
        this.stringTableBytes = this.bytes.subarray(this.offset, this.offset + this.stringTableSize);
        this.skip(this.stringTableSize);
        this.setStringTable(this.stringTableBytes, this.stringTableSize);

        this.permutations = this.#readPermutations();
        this.records = this.#readRecords();
        this.headerEnd = this.offset;
        this.diagnostics = this.#inspect();

        if (!options.permissive)
        {
            this.requireDensePermutationTable();
        }
    }

    /**
     * Returns the product of the permutation axes' option counts — the number of
     * offset-table rows a fully populated file has.
     *
     * @returns {number} Permutation count.
     */
    get permutationProduct()
    {
        let product = 1;
        for (const permutation of this.permutations)
        {
            product *= permutation.options.length;
        }
        return product;
    }

    /**
     * Throws unless the offset table is dense and positionally indexed.
     *
     * Carbon indexes `m_offsets` positionally and never reads the stored `index`
     * field (`Tr2EffectRes.cpp:121-126`), so a sparse or misordered table does
     * not fail — it silently returns the wrong shader body. Carbon gets density
     * incidentally, from `g_compiledEffects` being a `std::map` densely keyed by
     * `AddPermutationsToWorkQueue`, and promises it nowhere.
     *
     * Measured across the whole shipped corpus at build 3444265 — 4833 files and
     * 78,498 rows across `effect.dx11`, `effect.dx12` and `effect.metal` — both
     * conditions hold in every file, so this runs by default.
     *
     * `--ignore-permutations` does make CCP's compiler emit only key 0 while
     * declaring every axis, so a sparse file is producible. That argues for an
     * escape hatch, not for permissiveness: because Carbon indexes positionally,
     * accepting such a file returns the wrong permutation's shader silently, which
     * is exactly the failure class this container port exists to close.
     * `{ permissive: true }` is the opt-in, for inspecting a file already known to
     * be malformed.
     */
    requireDensePermutationTable()
    {
        if (!this.diagnostics.dense)
        {
            throw this._error("Carbon effect offset table is sparse", {
                recordCount: this.records.length,
                permutationProduct: this.permutationProduct
            });
        }
        if (!this.diagnostics.indicesMatchPosition)
        {
            throw this._error("Carbon effect offset table is not positionally indexed", {
                firstMismatch: this.diagnostics.firstIndexMismatch
            });
        }
    }

    /**
     * Reads and parses one permutation's description blob.
     *
     * `backend` is **optional**, and omitting it is the interesting case. A
     * Carbon file ends each pass at the render states; ours adds one eight-byte
     * block reference. Nothing in the header distinguishes the two, and we
     * deliberately do not add anything — no envelope, no version of our own,
     * because CCP owns the version space and a container that announces itself
     * is an invention nothing requires.
     *
     * Instead the blob describes itself, using a rule the format already has.
     * Every sized record must parse to exactly its declared end (Rule 1), and a
     * body's declared size is in the offset table. So the wrong interpretation
     * either throws or leaves the cursor somewhere other than the end, and one
     * retry settles it.
     *
     * Pass `backend` explicitly when the caller knows — the loader does, because
     * backend selection is by resource path, mirroring Carbon's
     * `effect.dx11`/`effect.dx12`/`effect.metal`. Auto-detection is for bytes
     * that arrive without that context: tooling, caches, inspection.
     *
     * @param {number} index Permutation index, positional in the offset table.
     * @param {object} [options] Read options.
     * @param {boolean} [options.backend] Expect our optional per-pass trailing
     *     block. Omit to detect it from the blob's declared end.
     * @returns {object} Description record tree.
     */
    readDescription(index, options = {})
    {
        const record = this.records[index];
        if (!record)
        {
            throw this._error(`No Carbon effect body at permutation index ${index}`, {
                index,
                recordCount: this.records.length
            });
        }

        if (options.backend !== undefined)
        {
            return this.#readDescriptionAs(record, options.backend === true);
        }

        // Plain Carbon first: it is the larger population, and it is the reading
        // that must stay cheap.
        try
        {
            return this.#readDescriptionAs(record, false);
        }
        catch (withoutBlocks)
        {
            try
            {
                return this.#readDescriptionAs(record, true);
            }
            catch
            {
                // Report the plain-Carbon failure. If neither reading works the
                // blob is malformed, and the Carbon diagnosis is the useful one;
                // the backend attempt's error would describe a misparse of bytes
                // that were never a backend block.
                throw withoutBlocks;
            }
        }
    }

    /**
     * Parses one body under an exact backend-block assumption.
     *
     * @param {object} record Offset-table row.
     * @param {boolean} backend Whether to expect the per-pass block.
     * @returns {object} Description record tree.
     */
    #readDescriptionAs(record, backend)
    {
        const reader = new this.constructor.BodyReader(this.bytes, {
            source: this.source,
            offset: record.offset,
            end: record.offset + record.size,
            stringTable: this.stringTableBytes,
            stringTableSize: this.stringTableSize
        });
        return readEffectDescription(reader, { backend });
    }

    /**
     * Returns the raw description-blob bytes for one permutation.
     *
     * @param {number} index Permutation index, positional in the offset table.
     * @returns {Uint8Array} View over the body bytes.
     */
    bodyBytes(index)
    {
        const record = this.records[index];
        if (!record)
        {
            throw this._error(`No Carbon effect body at permutation index ${index}`, { index });
        }
        return this.bytes.subarray(record.offset, record.offset + record.size);
    }

    /**
     * Reads the permutation axis records (`ShaderCompiler.cpp:769-795`,
     * `Tr2EffectRes.cpp:263-292`).
     *
     * @returns {object[]} Permutation axes with arena references retained.
     */
    #readPermutations()
    {
        const permutations = [];
        const count = this.readUint8();
        for (let index = 0; index < count; index += 1)
        {
            const nameOffset = this.readUint32();
            const name = this.readStringAt(nameOffset);
            const defaultOption = this.readUint8();
            const descriptionOffset = this.readUint32();
            const description = this.readStringAt(descriptionOffset);
            const type = this.readUint8();

            const options = [];
            const optionCount = this.readUint8();
            for (let optionIndex = 0; optionIndex < optionCount; optionIndex += 1)
            {
                const offset = this.readUint32();
                options.push({ offset, value: this.readStringAt(offset) });
            }

            permutations.push({
                name: { offset: nameOffset, value: name },
                defaultOption,
                description: { offset: descriptionOffset, value: description },
                type,
                options
            });
        }
        return permutations;
    }

    /**
     * Reads the offset table (`ShaderCompiler.cpp:800-820`,
     * `Tr2EffectRes.cpp:294-311`).
     *
     * @returns {object[]} Offset-table rows.
     */
    #readRecords()
    {
        const count = this.readUint32();
        if (count === 0)
        {
            throw this._error("Carbon effect contains no compiled bodies");
        }
        if (this.offset + count * CARBON_EFFECT_RECORD_BYTES > this.bytes.length)
        {
            throw this._error("Carbon effect offset table runs past the end of the file", {
                recordCount: count,
                byteLength: this.bytes.length
            });
        }

        const records = [];
        for (let index = 0; index < count; index += 1)
        {
            records.push({
                index: this.readUint32(),
                offset: this.readUint32(),
                size: this.readUint32()
            });
        }
        return records;
    }

    /**
     * Validates every row's byte range and collects the structural diagnostics
     * Carbon relies on without stating.
     *
     * @returns {object} Structural diagnostics.
     */
    #inspect()
    {
        const headerEnd = this.headerEnd;
        const byteLength = this.bytes.length;
        let firstIndexMismatch = null;
        const uniqueOffsets = new Set();

        for (let index = 0; index < this.records.length; index += 1)
        {
            const record = this.records[index];
            if (record.index !== index && firstIndexMismatch === null)
            {
                firstIndexMismatch = { position: index, storedIndex: record.index };
            }
            const end = record.offset + record.size;
            if (record.offset < headerEnd || end > byteLength || record.size === 0)
            {
                throw this._error(`Carbon effect body record ${index} is out of range`, {
                    position: index,
                    offset: record.offset,
                    size: record.size,
                    headerEnd,
                    byteLength
                });
            }
            uniqueOffsets.add(record.offset);
        }

        // The body region must begin exactly where the header ends. Carbon computes
        // its first body offset as `4 + 4 + 32 + headerSize + stringTable.GetSize()`
        // (`ShaderCompiler.cpp:801`), so a gap or an overlap means our reconstruction
        // of that arithmetic disagrees with the writer's — which would silently
        // misread every body rather than fail. Carbon's own reader does not check
        // this; measured across 4833 shipped files, every one starts its body region
        // flush against the header with no slack.
        const firstBody = Math.min(...this.records.map((record) => record.offset));
        if (firstBody !== headerEnd)
        {
            throw this._error("Carbon effect body region does not start where the header ends", {
                firstBody,
                headerEnd,
                slack: firstBody - headerEnd
            });
        }

        return {
            recordCount: this.records.length,
            permutationProduct: this.permutationProduct,
            dense: this.records.length === this.permutationProduct,
            indicesMatchPosition: firstIndexMismatch === null,
            firstIndexMismatch,
            uniqueBodyCount: uniqueOffsets.size,
            aliasedRowCount: this.records.length - uniqueOffsets.size
        };
    }
}

export default CjsCarbonEffectReader;
