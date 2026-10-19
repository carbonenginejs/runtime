import { CjsSchema } from "#schema/CjsSchema";

/**
 * Decoded per-stage input metadata for constants, resources, samplers, and signatures.
 */
export class HlslEffectStageInput
{
    static invalid = 0xffffffff;

    static shaderConstantsMax = 256 * 16;

    /**
     * Whether the stage was loaded from the effect file (Shader/Tr2EffectDescription.cpp:14).
     * @type {boolean}
     */
    m_exists = false;

    /**
     * Textures by register (Shader/Tr2EffectDescription.h:178).
     * @type {Map<number, HlslEffectResource>}
     */
    resources = new Map();

    /**
     * UAVs by register (Shader/Tr2EffectDescription.h:180).
     * @type {Map<number, HlslEffectResource>}
     */
    uavs = new Map();

    /**
     * Samplers by register (Shader/Tr2EffectDescription.h:182).
     * @type {Map<number, HlslSamplerSetup>}
     */
    samplers = new Map();

    /**
     * Shader handle; INVALID until registered (Shader/Tr2EffectDescription.cpp:14).
     * @type {number}
     */
    m_shader = HlslEffectStageInput.invalid;

    /**
     * Constants used by the shader (Shader/Tr2EffectDescription.h:186).
     * @type {HlslEffectConstant[]}
     */
    constants = [];

    /**
     * Default constant buffer size in bytes (Shader/Tr2EffectDescription.cpp:14).
     * @type {number}
     */
    m_constantValueSize = 0;

    /**
     * Default constant buffer contents (Shader/Tr2EffectDescription.h:190); ours is sized to the data.
     * @type {Uint8Array}
     */
    constantValues = new Uint8Array(0);

    /**
     * Constant buffer size as stored in the source; ours.
     * @type {number}
     */
    sourceConstantValueSize = 0;

    /**
     * Constant buffer contents as stored in the source; ours.
     * @type {Uint8Array}
     */
    sourceConstantValues = new Uint8Array(0);

    /**
     * Shader pipeline inputs (Shader/Tr2EffectDescription.h:192).
     * @type {{pipelineInputs: object[], registers: object[], samplers: object[], threadGroupSize: {x: number, y: number, z: number}}}
     */
    signature = {
        pipelineInputs: [],
        registers: [],
        samplers: [],
        threadGroupSize: { x: 0, y: 0, z: 0 }
    };

    /**
     * Stage annotations (Shader/Tr2EffectDescription.h:193).
     * @type {HlslEffectParameterAnnotation[]}
     */
    annotation = [];

    /**
     * Captured stage bytecode; ours, null until registered.
     * @type {object|null}
     */
    cjsShaderBytecode = null;

    /**
   * Returns a JSON-safe stage input metadata snapshot.
   *
   * @returns {object} Serializable stage input metadata.
   */
    toJSON()
    {
        return {
            m_exists: this.m_exists,
            resources: mapToJson(this.resources),
            uavs: mapToJson(this.uavs),
            samplers: mapToJson(this.samplers),
            m_shader: this.m_shader,
            constants: this.constants.map((entry) => entry.toJSON()),
            m_constantValueSize: this.m_constantValueSize,
            constantValues: Array.from(this.constantValues),
            signature: cloneJson(this.signature),
            annotation: this.annotation.map((entry) => entry.toJSON()),
            cjsShaderBytecode: this.cjsShaderBytecode?.toJSON?.() ?? this.cjsShaderBytecode
        };
    }
}

/**
 * Serializes a register-indexed metadata map.
 *
 * @param {Map<number, object>} map Register-indexed map.
 * @returns {object[]} JSON-safe register/value records.
 */
function mapToJson(map)
{
    return Array.from(map.entries()).map(([ registerIndex, value ]) => ({
        registerIndex,
        value: value?.toJSON?.() ?? value
    }));
}

/**
 * Deep-clones plain JSON-like structures used in effect signatures.
 *
 * @param {*} value Value to clone.
 * @returns {*} JSON-like clone.
 */
function cloneJson(value)
{
    if (Array.isArray(value)) return value.map(cloneJson);
    if (value && typeof value === "object")
    {
        return Object.fromEntries(Object.entries(value).map(([ key, entry ]) => [ key, cloneJson(entry) ]));
    }
    return value;
}

CjsSchema.meta.define(HlslEffectStageInput, { className: "HlslEffectStageInput", donors: [ "Tr2EffectStageInput" ] });
