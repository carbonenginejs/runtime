import { CjsSchema } from "#schema/CjsSchema";

const HEADER_SIZE = 32;
const strictTextDecoder = new TextDecoder("utf-8", { fatal: true });

/**
 * Provides bounds-checked access to 64-bit FSD container bytes.
 */
export class CjsFsd64Binary
{
    /**
     * Binary value types accepted by declarative reader schemas.
     *
     * Schema files store these property names as strings so they remain inert
     * JSON. Schema validation resolves the names through this object.
     */
    static Type = {
        /**
         * A single flag bit inside a byte, addressed by `offset` plus `bit`.
         *
         * The container packs several independent flags into one byte, so a
         * schema that called such a field `UINT_8` would describe the byte
         * rather than the field and hand a consumer 1 where it expected true.
         */
        BOOLEAN: "BOOLEAN",
        FLOAT_32: "FLOAT_32",
        FLOAT_64: "FLOAT_64",
        INT_32: "INT_32",
        INT_32_IDENTIFIER: "INT_32_IDENTIFIER",
        LIST: "LIST",
        MAP: "MAP",
        OBJECT: "OBJECT",
        STRING: "STRING",
        UINT_8: "UINT_8",
        UINT_32: "UINT_32",
        UINT_32_IDENTIFIER: "UINT_32_IDENTIFIER",
        UINT_64: "UINT_64",
        UINT_64_IDENTIFIER: "UINT_64_IDENTIFIER",
    };

    _bytes;

    _view;

    /**
     * Creates a validated view over caller-supplied container bytes.
     *
     * @param {ArrayBuffer|ArrayBufferView} bytes Container bytes; views keep their offsets.
     * @param {object} [options={}] Validation options.
     * @param {string} [options.path] Source name used in errors; "FSD input" when absent.
     * @param {string|Array<string>} [options.schemaID] Accepted schema identities, passed to AssertSchema.
     * @throws {TypeError} When bytes is neither an ArrayBuffer nor a view.
     * @throws {Error} When the header is short or its payload length does not match.
     */
    constructor(bytes, options = {})
    {
        this._bytes = NormalizeBytes(bytes);
        this._view = new DataView(
            this._bytes.buffer,
            this._bytes.byteOffset,
            this._bytes.byteLength,
        );

        this._AssertContainer(options.path ?? "FSD input");

        if (options.schemaID)
        {
            this.AssertSchema(options.schemaID, options.path);
        }
    }

    /**
     * Returns the complete container byte length.
     *
     * @returns {number} Byte length of the container.
     */
    get ByteLength()
    {
        return this._bytes.byteLength;
    }

    /**
     * Returns the payload length declared by the container header.
     *
     * @returns {number} Declared payload length.
     */
    get PayloadLength()
    {
        return this.Uint64(24);
    }

    /**
     * Returns the first byte offset after the fixed container header.
     *
     * @returns {number} The header size, 32.
     */
    get RootOffset()
    {
        return HEADER_SIZE;
    }

    /**
     * Returns the lossless hexadecimal schema identity from the header.
     *
     * @returns {string} 48 lowercase hexadecimal characters.
     */
    get SchemaID()
    {
        return Hex(this._bytes.subarray(0, 24));
    }

    /**
     * Returns the layout half of the schema identity.
     *
     * The 24-byte identity is two values: the first sixteen bytes identify the
     * record layout and are stable across builds and across publishers, while
     * the last eight are a digest of the data itself and change whenever the
     * file's contents do. Measured 2026-08-14 across CCP build 3466501 and
     * NetEase build 3466057: eleven datasets agreed on the first sixteen bytes
     * and differed on the last eight in every case, the sole exception being a
     * file that is byte-identical on both.
     *
     * @returns {string} 32 lowercase hexadecimal characters.
     */
    get LayoutID()
    {
        return Hex(this._bytes.subarray(0, 16));
    }

    /**
     * Rejects the container when its schema identity differs from the expected value.
     *
     * A 32-character expectation pins the layout alone, which is what a reader
     * wants: it keeps decoding the same dataset after its contents change and
     * accepts the same layout from another publisher. A 48-character
     * expectation additionally pins the content digest, so it accepts exactly
     * one build's bytes.
     *
     * Several identities may be passed. The identity is not a hash of the byte
     * layout alone, so one layout can appear under two of them: Infinity's
     * `dogmaeffects.fsdbinary` reads `3f128288…` where CCP and Serenity read
     * `b7107f57…`, yet every offset, every presence bit and the modifier entry
     * are the same. A reader may accept both, and should say what it measured
     * to justify each one.
     *
     * @param {string|Array<string>} expected One or more 32- or 48-character identities.
     * @param {string} [path="FSD input"] Source name used in the error.
     * @throws {Error} When no expected identity matches; the error carries `code` "CJS_FSD_SCHEMA_UNSUPPORTED".
     */
    AssertSchema(expected, path = "FSD input")
    {
        const wanted = (Array.isArray(expected) ? expected : [ expected ])
            .map(value => String(value).toLowerCase());
        const actual = new Set(wanted.map(value => value.length === 32 ? this.LayoutID : this.SchemaID));

        if (wanted.some(value => actual.has(value))) return;

        // Reported in the form that was asked for, so a reader pinning the
        // content digest is not told about the layout half it did not ask about.
        const reported = wanted[0].length === 32 ? this.LayoutID : this.SchemaID;
        const error = new Error(`Unsupported FSD schema for ${path}: ${reported}`);

        error.code = "CJS_FSD_SCHEMA_UNSUPPORTED";
        error.actualSchemaID = reported;
        error.expectedSchemaID = wanted.length === 1 ? wanted[0] : wanted;
        error.path = path;
        throw error;
    }

    /**
     * Resolves one payload-relative offset to an absolute container offset.
     *
     * @param {number} relativeOffset Payload-relative byte offset.
     * @returns {number} The absolute byte offset.
     */
    Absolute(relativeOffset)
    {
        const absolute = this.RootOffset + relativeOffset;
        this.AssertRange(absolute, 0);
        return absolute;
    }

    /**
     * Aligns an absolute byte offset to the next eight-byte boundary.
     *
     * @param {number} offset Absolute byte offset.
     * @returns {number} The offset rounded up to a multiple of 8.
     */
    Align8(offset)
    {
        return Math.ceil(offset / 8) * 8;
    }

    /**
     * Rejects a byte range which falls outside the supplied container.
     *
     * @param {number} offset Absolute byte offset.
     * @param {number} size Range byte length.
     * @throws {RangeError} When the range is not inside the container.
     */
    AssertRange(offset, size)
    {
        if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size) ||
            offset < 0 || size < 0 || offset + size > this.ByteLength)
        {
            const error = new RangeError(`FSD offset is outside the input: ${offset} + ${size}`);
            error.code = "CJS_FSD_OFFSET_INVALID";
            error.offset = offset;
            error.size = size;
            throw error;
        }
    }

    /**
     * Reads one unsigned byte at an absolute offset.
     *
     * @param {number} offset Absolute byte offset.
     * @returns {number} The byte value.
     */
    Byte(offset)
    {
        this.AssertRange(offset, 1);
        return this._view.getUint8(offset);
    }

    /**
     * Returns a bounded byte view without copying its contents.
     *
     * @param {number} offset Absolute byte offset.
     * @param {number} size Byte length.
     * @returns {Uint8Array} A view over the container bytes.
     */
    Bytes(offset, size)
    {
        this.AssertRange(offset, size);
        return this._bytes.subarray(offset, offset + size);
    }

    /**
     * Reads one little-endian 32-bit floating-point value.
     *
     * @param {number} offset Absolute byte offset.
     * @returns {number} The value.
     */
    Float32(offset)
    {
        this.AssertRange(offset, 4);
        return this._view.getFloat32(offset, true);
    }

    /**
     * Reads one little-endian 64-bit floating-point value.
     *
     * @param {number} offset Absolute byte offset.
     * @returns {number} The value.
     */
    Float64(offset)
    {
        this.AssertRange(offset, 8);
        return this._view.getFloat64(offset, true);
    }

    /**
     * Reads one little-endian signed 32-bit integer.
     *
     * @param {number} offset Absolute byte offset.
     * @returns {number} The value.
     */
    Int32(offset)
    {
        this.AssertRange(offset, 4);
        return this._view.getInt32(offset, true);
    }

    /**
     * Reads one little-endian unsigned 32-bit integer.
     *
     * @param {number} offset Absolute byte offset.
     * @returns {number} The value.
     */
    Uint32(offset)
    {
        this.AssertRange(offset, 4);
        return this._view.getUint32(offset, true);
    }

    /**
     * Reads one little-endian unsigned 64-bit safe integer.
     *
     * @param {number} offset Absolute byte offset.
     * @returns {number} The value.
     * @throws {RangeError} When the value exceeds Number.MAX_SAFE_INTEGER.
     */
    Uint64(offset)
    {
        this.AssertRange(offset, 8);
        const value = this._view.getBigUint64(offset, true);

        if (value > BigInt(Number.MAX_SAFE_INTEGER))
        {
            const error = new RangeError(`FSD uint64 is not a safe JavaScript offset/count: ${value}`);
            error.code = "CJS_FSD_UINT64_UNSAFE";
            error.offset = offset;
            throw error;
        }

        return Number(value);
    }

    /**
     * Reads an unsigned 64-bit identity without passing through a JavaScript
     * number, returning its lossless decimal JSON representation.
     *
     * @param {number} offset Absolute byte offset.
     * @returns {string} The value in decimal.
     */
    Uint64Identity(offset)
    {
        this.AssertRange(offset, 8);
        return this._view.getBigUint64(offset, true).toString(10);
    }

    /**
     * Returns a safe unsigned 64-bit value or null for an invalid read.
     *
     * @param {number} offset Absolute byte offset.
     * @returns {number|null} The value, or null when out of range or unsafe.
     */
    TryUint64(offset)
    {
        if (!Number.isSafeInteger(offset) || offset < 0 || offset + 8 > this.ByteLength)
        {
            return null;
        }

        const value = this._view.getBigUint64(offset, true);
        return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : null;
    }

    /**
     * Returns the absolute offsets of every record in an FSD hash-map.
     *
     * @param {number} recordSize Byte size of one record.
     * @param {number} [headerOffset=this.RootOffset] Absolute offset of the map header.
     * @returns {Array<number>} Absolute record offsets, bucket by bucket.
     * @throws {Error} When the bucket records do not add up to the declared count.
     */
    MapEntries(recordSize, headerOffset = this.RootOffset)
    {
        AssertRecordSize(recordSize);
        this.AssertRange(headerOffset, 16);

        const expectedCount = this.Uint64(headerOffset + 8);

        if (expectedCount === 0)
        {
            return [];
        }

        const tableOffset = this.Absolute(this.Uint64(headerOffset));
        const bucketCount = this.Uint64(tableOffset - 8);
        this._AssertElementRange(tableOffset, bucketCount, 8);

        const offsets = [];

        for (let index = 0; index < bucketCount; index++)
        {
            const bucketOffset = this.Absolute(this.Uint64(tableOffset + index * 8));
            const recordCount = this.Uint64(bucketOffset - 8);
            this._AssertElementRange(bucketOffset, recordCount, recordSize);

            for (let recordIndex = 0; recordIndex < recordCount; recordIndex++)
            {
                offsets.push(bucketOffset + recordIndex * recordSize);
            }
        }

        if (offsets.length !== expectedCount)
        {
            const error = new Error(
                `FSD map contains ${offsets.length} records; its header declares ${expectedCount}.`,
            );
            error.code = "CJS_FSD_RECORD_COUNT_INVALID";
            error.actualCount = offsets.length;
            error.expectedCount = expectedCount;
            throw error;
        }

        return offsets;
    }

    /**
     * Returns absolute offsets for a count-prefixed FSD list.
     *
     * @param {number} relativeOffset Payload-relative list pointer; 0 is an empty list.
     * @param {number} recordSize Byte size of one element.
     * @param {number} [maximumCount=Number.MAX_SAFE_INTEGER] Largest accepted element count.
     * @returns {Array<number>} Absolute element offsets.
     * @throws {RangeError} When the pointer is invalid or the count exceeds the limit.
     */
    ListEntries(relativeOffset, recordSize, maximumCount = Number.MAX_SAFE_INTEGER)
    {
        AssertRecordSize(recordSize);

        if (relativeOffset === 0)
        {
            return [];
        }

        if (!Number.isSafeInteger(relativeOffset) || relativeOffset < 8)
        {
            const error = new RangeError(`FSD list pointer is invalid: ${relativeOffset}`);
            error.code = "CJS_FSD_OFFSET_INVALID";
            error.offset = relativeOffset;
            throw error;
        }

        const dataOffset = this.Absolute(relativeOffset);
        const count = this.Uint64(dataOffset - 8);

        if (count > maximumCount)
        {
            const error = new RangeError(`FSD list count exceeds its limit: ${count}`);
            error.code = "CJS_FSD_COUNT_INVALID";
            error.count = count;
            error.maximumCount = maximumCount;
            throw error;
        }

        this._AssertElementRange(dataOffset, count, recordSize);
        return Array.from(
            { length: count },
            (_, index) => dataOffset + index * recordSize,
        );
    }

    /**
     * Returns a printable ASCII string or null for invalid evidence.
     *
     * @param {number} relativeOffset Payload-relative string pointer.
     * @param {number} [maximumLength=4096] Largest accepted byte length.
     * @returns {string|null} The string, or null.
     */
    StringAtDataPointer(relativeOffset, maximumLength = 4096)
    {
        const value = this.Utf8StringAtDataPointer(relativeOffset, maximumLength);

        if (value === null)
        {
            return null;
        }

        for (const character of value)
        {
            const code = character.codePointAt(0);

            if (code < 32 || code > 126)
            {
                return null;
            }
        }

        return value;
    }

    /**
     * Returns a strict UTF-8 string or null for invalid evidence.
     *
     * @param {number} relativeOffset Payload-relative string pointer.
     * @param {number} [maximumLength=4096] Largest accepted byte length.
     * @returns {string|null} The string, or null.
     */
    Utf8StringAtDataPointer(relativeOffset, maximumLength = 4096)
    {
        if (!Number.isSafeInteger(relativeOffset) || relativeOffset < 8)
        {
            return null;
        }

        const dataOffset = this.RootOffset + relativeOffset;
        const length = this.TryUint64(dataOffset - 8);

        if (length === null || length > maximumLength || dataOffset + length > this.ByteLength)
        {
            return null;
        }

        try
        {
            return strictTextDecoder.decode(this._bytes.subarray(dataOffset, dataOffset + length));
        }
        catch
        {
            return null;
        }
    }

    /**
     * Returns a bounded printable string list or null for invalid evidence.
     *
     * @param {number} relativeOffset Payload-relative list pointer.
     * @param {number} [maximumCount=100] Largest accepted string count.
     * @returns {Array<string>|null} The strings, or null.
     */
    StringList(relativeOffset, maximumCount = 100)
    {
        if (!Number.isSafeInteger(relativeOffset) || relativeOffset < 8)
        {
            return null;
        }

        const tableOffset = this.RootOffset + relativeOffset;
        const count = this.TryUint64(tableOffset - 8);

        if (count === null || count > maximumCount || tableOffset + count * 8 > this.ByteLength)
        {
            return null;
        }

        const values = [];

        for (let index = 0; index < count; index++)
        {
            const value = this.StringAtDataPointer(this.TryUint64(tableOffset + index * 8));

            if (value === null)
            {
                return null;
            }

            values.push(value);
        }

        return values;
    }

    /**
     * Returns a bounded unsigned 32-bit list or null for invalid evidence.
     *
     * @param {number} relativeOffset Payload-relative list pointer; 0 is an empty list.
     * @param {number} [maximumCount=100] Largest accepted element count.
     * @returns {Array<number>|null} The values, or null.
     */
    Uint32List(relativeOffset, maximumCount = 100)
    {
        if (relativeOffset === 0)
        {
            return [];
        }

        if (!Number.isSafeInteger(relativeOffset) || relativeOffset < 8)
        {
            return null;
        }

        const dataOffset = this.RootOffset + relativeOffset;
        const count = this.TryUint64(dataOffset - 8);

        if (count === null || count > maximumCount || dataOffset + count * 4 > this.ByteLength)
        {
            return null;
        }

        return Array.from(
            { length: count },
            (_, index) => this.Uint32(dataOffset + index * 4),
        );
    }

    /**
     * Validates the byte range occupied by a repeated fixed-size value.
     *
     * @param {number} offset Absolute offset of the first element.
     * @param {number} count Element count.
     * @param {number} size Byte size of one element.
     * @throws {RangeError} When the count is invalid or the range leaves the container.
     */
    _AssertElementRange(offset, count, size)
    {
        if (!Number.isSafeInteger(count) || count < 0 ||
            count > Math.floor(this.ByteLength / size))
        {
            const error = new RangeError(`FSD element count is invalid: ${count}`);
            error.code = "CJS_FSD_COUNT_INVALID";
            error.count = count;
            error.elementSize = size;
            throw error;
        }

        this.AssertRange(offset, count * size);
    }

    /**
     * Validates the fixed header and its declared payload length.
     *
     * @param {string} path Source name used in errors.
     * @throws {Error} When the header is short or the payload length does not match.
     */
    _AssertContainer(path)
    {
        if (this.ByteLength < HEADER_SIZE)
        {
            const error = new Error(`FSD input is smaller than its ${HEADER_SIZE}-byte header: ${path}`);
            error.code = "CJS_FSD_HEADER_INVALID";
            throw error;
        }

        const payloadLength = this.Uint64(24);

        if (payloadLength !== this.ByteLength - HEADER_SIZE)
        {
            const error = new Error(`FSD payload length does not match its header: ${path}`);
            error.code = "CJS_FSD_LENGTH_INVALID";
            error.actualLength = this.ByteLength - HEADER_SIZE;
            error.expectedLength = payloadLength;
            throw error;
        }
    }
}

/**
 * Rejects a record size that is not a positive safe integer.
 *
 * @param {number} value Record byte size.
 * @throws {RangeError} When the size is invalid.
 */
function AssertRecordSize(value)
{
    if (!Number.isSafeInteger(value) || value < 1)
    {
        const error = new RangeError(`FSD record size is invalid: ${value}`);
        error.code = "CJS_FSD_RECORD_SIZE_INVALID";
        throw error;
    }
}

/**
 * Formats bytes as lowercase hexadecimal.
 *
 * @param {Uint8Array} bytes Bytes to format.
 * @returns {string} Two characters per byte.
 */
function Hex(bytes)
{
    return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
}

/**
 * Views caller bytes as a Uint8Array over the same storage.
 *
 * @param {ArrayBuffer|ArrayBufferView} input Caller bytes.
 * @returns {Uint8Array} A view over the same storage.
 * @throws {TypeError} When input is neither an ArrayBuffer nor a view.
 */
function NormalizeBytes(input)
{
    if (input instanceof ArrayBuffer)
    {
        return new Uint8Array(input);
    }

    if (ArrayBuffer.isView(input))
    {
        return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }

    const error = new TypeError("FSD input must be an ArrayBuffer or an ArrayBuffer view.");
    error.code = "CJS_FSD_INPUT_INVALID";
    throw error;
}

export default CjsFsd64Binary;

CjsSchema.meta.define("CjsFsd64Binary")(CjsFsd64Binary);
