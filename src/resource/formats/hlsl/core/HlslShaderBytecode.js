import { CjsSchema } from "#schema/CjsSchema";

import { asUint8Array } from "#utils/bytes";

/**
 * JavaScript stand-in for Carbon's shader-bytecode handle payload.
 */
export class HlslShaderBytecode
{
    /**
     * Trinity shader stage enum value, or null when unknown; set by the constructor.
     * @type {number|null}
     */
    stageType = null;

    /**
     * Friendly stage name, or null when unknown; set by the constructor.
     * @type {string|null}
     */
    stageName = null;

    /**
     * Shader bytecode bytes; set by the constructor.
     * @type {Uint8Array}
     */
    bytes = new Uint8Array(0);

    /**
     * Original bytecode size from the effect; set by the constructor.
     * @type {number}
     */
    shaderSize = 0;

    /**
     * Offset into the effect string table, or null; set by the constructor.
     * @type {number|null}
     */
    stringTableOffset = null;

    /**
     * Source effect name or path; set by the constructor.
     * @type {string}
     */
    effectName = "";

    /**
   * Captures bytecode and metadata for one compiled shader stage or library.
   *
   * @param {object} [options] Bytecode metadata.
   * @param {number|null} [options.stageType] Trinity shader stage enum value.
   * @param {string|null} [options.stageName] Friendly stage name.
   * @param {ArrayBuffer|ArrayBufferView|Uint8Array} [options.bytes] Shader bytecode bytes.
   * @param {number} [options.shaderSize] Original bytecode size from the effect.
   * @param {number|null} [options.stringTableOffset] Offset into the effect string table.
   * @param {string} [options.effectName] Source effect name or path.
   */
    constructor(options = {})
    {
        this.stageType = Number.isInteger(options.stageType) ? options.stageType : null;
        this.stageName = options.stageName || null;
        this.bytes = options.bytes ? asUint8Array(options.bytes) : new Uint8Array(0);
        this.shaderSize = Number(options.shaderSize) || this.bytes.length;
        this.stringTableOffset = Number.isInteger(options.stringTableOffset) ? options.stringTableOffset : null;
        this.effectName = options.effectName || "";
    }

    /**
   * Returns serializable metadata while omitting the potentially large byte array.
   *
   * @returns {object} JSON-safe bytecode summary.
   */
    toJSON()
    {
        return {
            stageType: this.stageType,
            stageName: this.stageName,
            shaderSize: this.shaderSize,
            stringTableOffset: this.stringTableOffset,
            effectName: this.effectName
        };
    }
}

CjsSchema.meta.define(HlslShaderBytecode, { className: "HlslShaderBytecode", donors: [ "Tr2ShaderBytecodeAL" ] });
