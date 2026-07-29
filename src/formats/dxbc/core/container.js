import { asUint8Array } from "@carbonenginejs/runtime-utils/bytes";
import { CjsDxbcReader } from "./CjsDxbcReader.js";
import { DxbcReadError } from "./errors.js";

const DXBC_HEADER_SIZE = 32;
const DXBC_CHUNK_HEADER_SIZE = 8;
const DXBC_MAGIC = new Uint8Array([ 0x44, 0x58, 0x42, 0x43 ]);

const fourCCDecoder = new TextDecoder("latin1");

/**
 * DirectX shader bytecode container reader.
 *
 * Splits a DXBC blob into its chunk directory without interpreting chunk
 * payloads, so stripped containers (for example Carbon blobs without `RDEF`)
 * parse the same way as fully reflected ones.
 */
export class DxbcContainer
{
    /**
     * Creates an empty container; call a read entry point to populate it from bytes.
     */
    constructor()
    {
        this.bytes = new Uint8Array(0);
        this.checksum = new Uint8Array(0);
        this.version = 0;
        this.totalSize = 0;
        this.chunks = [];
        this.source = "memory";
    }

    /**
   * Checks whether a byte payload starts with the DXBC container magic.
   *
   * @param {ArrayBuffer|ArrayBufferView|Uint8Array} bytes Candidate payload.
   * @returns {boolean} True when the payload looks like DXBC.
   */
    static IsDxbc(bytes)
    {
        const data = asUint8Array(bytes);
        return data.length >= DXBC_MAGIC.length && DXBC_MAGIC.every((byte, index) => data[index] === byte);
    }

    /**
   * Reads the container header and chunk directory.
   *
   * @param {ArrayBuffer|ArrayBufferView|Uint8Array} bytes DXBC payload.
   * @param {object} [options] Read options.
   * @param {string} [options.source] Source name used in error details.
   * @returns {DxbcContainer} This container.
   */
    Read(bytes, options = {})
    {
        this.bytes = asUint8Array(bytes);
        this.source = options.source || "memory";

        if (!DxbcContainer.IsDxbc(this.bytes))
        {
            throw new DxbcReadError("Missing DXBC container magic", {
                source: this.source,
                length: this.bytes.length
            });
        }
        if (this.bytes.length < DXBC_HEADER_SIZE)
        {
            throw new DxbcReadError("DXBC payload is smaller than the container header", {
                source: this.source,
                length: this.bytes.length
            });
        }

        const reader = new CjsDxbcReader(this.bytes, { source: this.source, offset: DXBC_MAGIC.length });
        this.checksum = reader.ReadRaw(16).slice();
        this.version = reader.readUint32();
        this.totalSize = reader.readUint32();
        if (this.totalSize > this.bytes.length)
        {
            throw new DxbcReadError("DXBC container size exceeds the payload", {
                source: this.source,
                totalSize: this.totalSize,
                length: this.bytes.length
            });
        }

        const chunkCount = reader.readUint32();
        if (DXBC_HEADER_SIZE + chunkCount * 4 > this.totalSize)
        {
            throw new DxbcReadError("DXBC chunk directory exceeds the container size", {
                source: this.source,
                chunkCount,
                totalSize: this.totalSize
            });
        }

        this.chunks = [];
        for (let index = 0; index < chunkCount; index += 1)
        {
            const offset = reader.readUint32();
            this.chunks.push(this._readChunkAt(offset, index));
        }
        return this;
    }

    /**
   * Finds a chunk by its four-character code.
   *
   * @param {string} fourCC Chunk identifier such as `"SHEX"` or `"ISGN"`.
   * @returns {{fourCC:string,offset:number,size:number,bytes:Uint8Array}|null} Chunk record or null.
   */
    getChunk(fourCC)
    {
        return this.chunks.find((chunk) => chunk.fourCC === fourCC) || null;
    }

    /**
   * Returns serializable container metadata while omitting chunk payload bytes.
   *
   * @returns {object} JSON-safe container summary.
   */
    toJSON()
    {
        return {
            source: this.source,
            version: this.version,
            totalSize: this.totalSize,
            chunks: this.chunks.map(({ fourCC, offset, size }) => ({ fourCC, offset, size }))
        };
    }

    /**
   * Reads one chunk header and bounds-checks its payload.
   *
   * @param {number} offset Chunk offset from the container start.
   * @param {number} index Chunk directory index used in error details.
   * @returns {{fourCC:string,offset:number,size:number,bytes:Uint8Array}} Chunk record.
   * @private
   */
    _readChunkAt(offset, index)
    {
        if (offset + DXBC_CHUNK_HEADER_SIZE > this.totalSize)
        {
            throw new DxbcReadError("DXBC chunk header lies outside the container", {
                source: this.source,
                chunkIndex: index,
                offset,
                totalSize: this.totalSize
            });
        }
        const reader = new CjsDxbcReader(this.bytes, { source: this.source, offset });
        const fourCC = fourCCDecoder.decode(reader.ReadRaw(4));
        const size = reader.readUint32();
        if (offset + DXBC_CHUNK_HEADER_SIZE + size > this.totalSize)
        {
            throw new DxbcReadError("DXBC chunk payload lies outside the container", {
                source: this.source,
                chunkIndex: index,
                fourCC,
                offset,
                size,
                totalSize: this.totalSize
            });
        }
        return {
            fourCC,
            offset,
            size,
            bytes: this.bytes.subarray(offset + DXBC_CHUNK_HEADER_SIZE, offset + DXBC_CHUNK_HEADER_SIZE + size)
        };
    }
}
