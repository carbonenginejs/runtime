import { DxbcReader } from "./DxbcReader.js";
import { DxbcReadError } from "./errors.js";

const SIGNATURE_TABLE_HEADER_SIZE = 8;

const semanticNameDecoder = new TextDecoder("latin1");

/**
 * Per-fourCC signature element layouts.
 *
 * `ISGN`/`OSGN`/`PCSG` use the 24-byte Shader Model 4 layout. `OSG5` prefixes
 * a stream index. `ISG1`/`OSG1`/`PSG1` prefix a stream index and append a
 * minimum-precision field.
 */
const SIGNATURE_ELEMENT_LAYOUTS = Object.freeze({
    ISGN: { stride: 24, hasStream: false, hasMinPrecision: false },
    OSGN: { stride: 24, hasStream: false, hasMinPrecision: false },
    PCSG: { stride: 24, hasStream: false, hasMinPrecision: false },
    OSG5: { stride: 28, hasStream: true, hasMinPrecision: false },
    ISG1: { stride: 32, hasStream: true, hasMinPrecision: true },
    OSG1: { stride: 32, hasStream: true, hasMinPrecision: true },
    PSG1: { stride: 32, hasStream: true, hasMinPrecision: true }
});

/**
 * Register component type names indexed by DXBC signature component-type ids.
 */
export const DxbcComponentTypeNames = Object.freeze([ "unknown", "uint32", "int32", "float32" ]);

/**
 * DXBC input/output signature chunk reader for `ISGN`-family chunks.
 */
export class DxbcSignatureChunk
{
    /**
     * Creates an empty signature chunk; call a read entry point to populate its parameter records.
     */
    constructor()
    {
        this.fourCC = "";
        this.elements = [];
        this.source = "memory";
    }

    /**
   * Reads a signature chunk payload into semantic/register element records.
   *
   * @param {{fourCC:string,bytes:Uint8Array}} chunk Chunk record from `DxbcContainer`.
   * @param {object} [options] Read options.
   * @param {string} [options.source] Source name used in error details.
   * @returns {DxbcSignatureChunk} This signature.
   */
    Read(chunk, options = {})
    {
        this.fourCC = chunk.fourCC;
        this.source = options.source || "memory";
        const layout = SIGNATURE_ELEMENT_LAYOUTS[this.fourCC];
        if (!layout)
        {
            throw new DxbcReadError("Unsupported DXBC signature chunk", {
                source: this.source,
                fourCC: this.fourCC
            });
        }

        const bytes = chunk.bytes;
        const reader = new DxbcReader(bytes, { source: this.source });
        const elementCount = reader.ReadUint32();
        const elementOffset = reader.ReadUint32() || SIGNATURE_TABLE_HEADER_SIZE;
        if (elementOffset + elementCount * layout.stride > bytes.length)
        {
            throw new DxbcReadError("DXBC signature elements lie outside the chunk", {
                source: this.source,
                fourCC: this.fourCC,
                elementCount,
                elementOffset,
                chunkSize: bytes.length
            });
        }

        this.elements = [];
        reader.offset = elementOffset;
        for (let index = 0; index < elementCount; index += 1)
        {
            const stream = layout.hasStream ? reader.ReadUint32() : 0;
            const semanticNameOffset = reader.ReadUint32();
            const semanticIndex = reader.ReadUint32();
            const systemValueType = reader.ReadUint32();
            const componentType = reader.ReadUint32();
            const registerIndex = reader.ReadUint32();
            const mask = reader.ReadUint8();
            const readWriteMask = reader.ReadUint8();
            reader.Skip(2);
            const minPrecision = layout.hasMinPrecision ? reader.ReadUint32() : 0;

            this.elements.push({
                semanticName: this._readSemanticName(bytes, semanticNameOffset, index),
                semanticIndex,
                systemValueType,
                componentType,
                componentTypeName: DxbcComponentTypeNames[componentType] || "unknown",
                registerIndex,
                mask,
                readWriteMask,
                stream,
                minPrecision
            });
        }
        return this;
    }

    /**
   * Finds a signature element by semantic name and index.
   *
   * @param {string} semanticName Case-insensitive semantic name such as `"TEXCOORD"`.
   * @param {number} [semanticIndex] Semantic index, defaulting to 0.
   * @returns {object|null} Element record or null.
   */
    findElement(semanticName, semanticIndex = 0)
    {
        const wanted = String(semanticName).toUpperCase();
        return this.elements.find(
            (element) => element.semanticName.toUpperCase() === wanted && element.semanticIndex === semanticIndex
        ) || null;
    }

    /**
   * Resolves a null-terminated semantic name inside the chunk payload.
   *
   * @param {Uint8Array} bytes Chunk payload.
   * @param {number} offset Name offset relative to the chunk payload start.
   * @param {number} index Element index used in error details.
   * @returns {string} Decoded semantic name.
   * @private
   */
    _readSemanticName(bytes, offset, index)
    {
        if (offset >= bytes.length)
        {
            throw new DxbcReadError("DXBC signature semantic name lies outside the chunk", {
                source: this.source,
                fourCC: this.fourCC,
                elementIndex: index,
                offset,
                chunkSize: bytes.length
            });
        }
        let end = offset;
        while (end < bytes.length && bytes[end] !== 0)
        {
            end += 1;
        }
        return semanticNameDecoder.decode(bytes.subarray(offset, end));
    }
}
