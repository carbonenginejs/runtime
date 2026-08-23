/**
 * Trinity sampler descriptor read from compiled effect metadata.
 */
class HlslSamplerDescription {
  /**
  * Creates a sampler descriptor with Carbon's default zeroed fields.
  */
  constructor() {
    this.comparison = false;
    this.minFilter = 0;
    this.magFilter = 0;
    this.mipFilter = 0;
    this.addressU = 0;
    this.addressV = 0;
    this.addressW = 0;
    this.mipLODBias = 0;
    this.mipLODBiasRaw = 0;
    this.maxAnisotropy = 0;
    this.comparisonFunc = 0;
    this.borderColor = [0, 0, 0, 0];
    this.borderColorRaw = [0, 0, 0, 0];
    this.minLOD = 0;
    this.minLODRaw = 0;
    this.maxLOD = 0;
    this.maxLODRaw = 0;
    this.isDynamic = true;
  }

  /**
  * Returns a JSON-safe sampler snapshot.
  *
  * @returns {object} Serializable sampler descriptor.
  */
  toJSON() {
    return {
      comparison: this.comparison,
      minFilter: this.minFilter,
      magFilter: this.magFilter,
      mipFilter: this.mipFilter,
      addressU: this.addressU,
      addressV: this.addressV,
      addressW: this.addressW,
      mipLODBias: this.mipLODBias,
      maxAnisotropy: this.maxAnisotropy,
      comparisonFunc: this.comparisonFunc,
      borderColor: this.borderColor.slice(),
      minLOD: this.minLOD,
      maxLOD: this.maxLOD,
      isDynamic: this.isDynamic
    };
  }
}

export { HlslSamplerDescription };
//# sourceMappingURL=HlslSamplerDescription.js.map
