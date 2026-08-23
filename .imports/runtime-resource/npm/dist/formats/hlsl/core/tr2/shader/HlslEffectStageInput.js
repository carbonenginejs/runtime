/**
 * Decoded per-stage input metadata for constants, resources, samplers, and signatures.
 */
class HlslEffectStageInput {
  static INVALID = 0xffffffff;
  static SHADER_CONSTANTS_MAX = 256 * 16;

  /**
  * Creates an empty stage input record.
  */
  constructor() {
    this.m_exists = false;
    this.resources = new Map();
    this.uavs = new Map();
    this.samplers = new Map();
    this.m_shader = HlslEffectStageInput.INVALID;
    this.constants = [];
    this.m_constantValueSize = 0;
    this.constantValues = new Uint8Array(0);
    this.sourceConstantValueSize = 0;
    this.sourceConstantValues = new Uint8Array(0);
    this.signature = {
      pipelineInputs: [],
      registers: [],
      samplers: [],
      threadGroupSize: {
        x: 0,
        y: 0,
        z: 0
      }
    };
    this.annotation = [];
    this.cjsShaderBytecode = null;
  }

  /**
  * Returns a JSON-safe stage input metadata snapshot.
  *
  * @returns {object} Serializable stage input metadata.
  */
  toJSON() {
    return {
      m_exists: this.m_exists,
      resources: mapToJson(this.resources),
      uavs: mapToJson(this.uavs),
      samplers: mapToJson(this.samplers),
      m_shader: this.m_shader,
      constants: this.constants.map(entry => entry?.toJSON?.() ?? entry),
      m_constantValueSize: this.m_constantValueSize,
      constantValues: Array.from(this.constantValues),
      signature: cloneJson(this.signature),
      annotation: this.annotation.map(entry => entry?.toJSON?.() ?? entry),
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
function mapToJson(map) {
  return Array.from(map.entries()).map(([registerIndex, value]) => ({
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
function cloneJson(value) {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneJson(entry)]));
  }
  return value;
}

export { HlslEffectStageInput };
//# sourceMappingURL=HlslEffectStageInput.js.map
