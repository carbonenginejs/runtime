/**
 * Trinity effect technique containing passes and optional shader libraries.
 */
class HlslEffectTechnique {
  /**
  * Creates an empty technique record.
  */
  constructor() {
    this.name = "";
    this.passes = [];
    this.libraries = [];
    this.shaderTypeMask = 0;
  }

  /**
  * Returns a JSON-safe technique metadata snapshot.
  *
  * @returns {object} Serializable technique metadata.
  */
  toJSON() {
    return {
      name: this.name,
      passes: this.passes.map(entry => entry?.toJSON?.() ?? entry),
      libraries: this.libraries.map(entry => entry?.toJSON?.() ?? entry),
      shaderTypeMask: this.shaderTypeMask
    };
  }
}

export { HlslEffectTechnique };
//# sourceMappingURL=HlslEffectTechnique.js.map
