import { DxbcReadError } from "./errors.js";

/**
 * Program type names indexed by the SM4/SM5 version-token program-type field.
 */
export const DxbcProgramTypeNames = Object.freeze([
    "pixel",
    "vertex",
    "geometry",
    "hull",
    "domain",
    "compute"
]);

/**
 * DXBC shader program chunk reader for `SHEX`/`SHDR` token streams.
 *
 * Decodes the version header and exposes the raw instruction tokens for the
 * translator stages that follow. Token interpretation stays out of this class
 * so container inspection never depends on opcode coverage.
 */
export class DxbcShaderProgram
{
    /**
     * Creates an empty shader program; call a read entry point to populate its version, stage, and instructions.
     */
    constructor()
    {
        this.fourCC = "";
        this.majorVersion = 0;
        this.minorVersion = 0;
        this.programType = 0;
        this.programTypeName = "unknown";
        this.lengthDwords = 0;
        this.tokens = new Uint32Array(0);
        this.source = "memory";
    }

    /**
   * Reads the program version header and copies the aligned token stream.
   *
   * @param {{fourCC:string,bytes:Uint8Array}} chunk Chunk record from `DxbcContainer`.
   * @param {object} [options] Read options.
   * @param {string} [options.source] Source name used in error details.
   * @returns {DxbcShaderProgram} This program.
   */
    Read(chunk, options = {})
    {
        this.fourCC = chunk.fourCC;
        this.source = options.source || "memory";
        const bytes = chunk.bytes;
        if (bytes.length < 8)
        {
            throw new DxbcReadError("DXBC shader chunk is smaller than the program header", {
                source: this.source,
                fourCC: this.fourCC,
                chunkSize: bytes.length
            });
        }

        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const versionToken = view.getUint32(0, true);
        this.minorVersion = versionToken & 0xf;
        this.majorVersion = (versionToken >>> 4) & 0xf;
        this.programType = (versionToken >>> 16) & 0xffff;
        this.programTypeName = DxbcProgramTypeNames[this.programType] || "unknown";
        this.lengthDwords = view.getUint32(4, true);
        if (this.lengthDwords < 2 || this.lengthDwords * 4 > bytes.length)
        {
            throw new DxbcReadError("DXBC program length disagrees with the chunk size", {
                source: this.source,
                fourCC: this.fourCC,
                lengthDwords: this.lengthDwords,
                chunkSize: bytes.length
            });
        }

        // Copy through DataView so unaligned subarrays and big-endian hosts both decode correctly.
        this.tokens = new Uint32Array(this.lengthDwords);
        for (let index = 0; index < this.lengthDwords; index += 1)
        {
            this.tokens[index] = view.getUint32(index * 4, true);
        }
        return this;
    }

    /**
   * Returns serializable program metadata while omitting the token stream.
   *
   * @returns {object} JSON-safe program summary.
   */
    toJSON()
    {
        return {
            fourCC: this.fourCC,
            majorVersion: this.majorVersion,
            minorVersion: this.minorVersion,
            programType: this.programType,
            programTypeName: this.programTypeName,
            lengthDwords: this.lengthDwords
        };
    }
}
