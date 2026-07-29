/**
 * JavaScript mirror of Carbon's resource-set descriptor builder.
 */
class HlslResourceSetDescription {
  /**
  * Creates an empty resource-set description for the supplied shader stages.
  *
  * @param {number[]} [shaderTypes] Shader stage enum values participating in the set.
  * @param {object[]} [signatures] Stage signatures read from the effect body.
  */
  constructor(shaderTypes = [], signatures = []) {
    this.shaderTypes = shaderTypes.slice();
    this.signatures = signatures.slice();
    this.samplers = [];
    this.heapViews = [];
  }

  /**
  * Records a static sampler binding for a shader register.
  *
  * @param {number} stageType Shader stage enum value.
  * @param {number} registerIndex Register index in the stage signature.
  * @param {object} sampler Sampler descriptor.
  */
  SetSampler(stageType, registerIndex, sampler) {
    this.samplers.push({
      stageType,
      registerIndex,
      sampler
    });
  }

  /**
  * Marks a shader-resource binding as heap-view based.
  *
  * @param {number} stageType Shader stage enum value.
  * @param {number} registerIndex Register index in the stage signature.
  */
  SetSrvHeapView(stageType, registerIndex) {
    this.heapViews.push({
      kind: "srv",
      stageType,
      registerIndex
    });
  }

  /**
  * Marks an unordered-access binding as heap-view based.
  *
  * @param {number} stageType Shader stage enum value.
  * @param {number} registerIndex Register index in the stage signature.
  */
  SetUavHeapView(stageType, registerIndex) {
    this.heapViews.push({
      kind: "uav",
      stageType,
      registerIndex
    });
  }

  /**
  * Marks a sampler binding as heap-view based.
  *
  * @param {number} stageType Shader stage enum value.
  * @param {number} registerIndex Register index in the stage signature.
  */
  SetSamplerHeapView(stageType, registerIndex) {
    this.heapViews.push({
      kind: "sampler",
      stageType,
      registerIndex
    });
  }

  /**
  * Returns a JSON-safe description of sampler and heap-view metadata.
  *
  * @returns {object} Serializable resource-set summary.
  */
  toJSON() {
    return {
      shaderTypes: this.shaderTypes.slice(),
      samplers: this.samplers.map(entry => ({
        ...entry
      })),
      heapViews: this.heapViews.map(entry => ({
        ...entry
      }))
    };
  }
}

export { HlslResourceSetDescription };
//# sourceMappingURL=HlslResourceSetDescription.js.map
