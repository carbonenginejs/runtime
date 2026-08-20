/**
 * Name/value shader permutation option used during effect lookup.
 */
class HlslShaderOption {
  /**
  * Creates a shader option selection.
  *
  * @param {string} [name] Permutation axis name.
  * @param {string} [value] Selected option value.
  */
  constructor(name = "", value = "") {
    this.name = name;
    this.value = value;
  }

  /**
  * Returns a JSON-safe option selection.
  *
  * @returns {object} Serializable option selection.
  */
  toJSON() {
    return {
      name: this.name,
      value: this.value
    };
  }
}

export { HlslShaderOption };
//# sourceMappingURL=HlslShaderOption.js.map
