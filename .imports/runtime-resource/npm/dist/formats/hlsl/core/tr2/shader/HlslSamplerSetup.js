import { HlslSamplerDescription } from './HlslSamplerDescription.js';

/**
 * Trinity sampler binding that pairs a metadata name with a sampler descriptor.
 */
class HlslSamplerSetup {
  /**
  * Creates a sampler setup with an empty name and default descriptor.
  */
  constructor() {
    this.name = null;
    this.sampler = new HlslSamplerDescription();
  }

  /**
  * Returns a JSON-safe sampler binding.
  *
  * @returns {object} Serializable sampler setup.
  */
  toJSON() {
    return {
      name: this.name,
      sampler: this.sampler?.toJSON?.() ?? this.sampler
    };
  }
}

export { HlslSamplerSetup };
//# sourceMappingURL=HlslSamplerSetup.js.map
