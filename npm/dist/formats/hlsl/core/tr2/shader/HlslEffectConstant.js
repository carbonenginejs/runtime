/**
 * Constant-buffer parameter metadata read from a Trinity effect body.
 */
class HlslEffectConstant {
  static Type = Object.freeze({
    FLOAT: 0,
    INT: 1,
    UINT: 2,
    BOOL: 3,
    OTHER: 4
  });

  /**
  * Creates an empty constant record with Carbon-compatible defaults.
  */
  constructor() {
    this.name = "";
    this.offset = 0;
    this.size = 0;
    this.type = HlslEffectConstant.Type.FLOAT;
    this.dimension = 0;
    this.elements = 0;
    this.isSRGB = false;
    this.isAutoregister = false;
  }

  /**
  * Returns a JSON-safe constant metadata snapshot.
  *
  * @returns {object} Serializable constant metadata.
  */
  toJSON() {
    return {
      ...this
    };
  }
}

export { HlslEffectConstant };
//# sourceMappingURL=HlslEffectConstant.js.map
