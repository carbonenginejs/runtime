import { CjsSchema, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { isPlainObject, isArray } from '@carbonenginejs/runtime-utils/is';
import { Tr2EffectLibrary } from './Tr2EffectLibrary.js';
import { Tr2Pass } from './Tr2Pass.js';

// Source: trinity/trinity/Shader/Tr2EffectDescription.h

/** Reflected effect technique and its passes and libraries. */
class Tr2EffectTechnique extends CjsModel {
  /** name (BlueSharedString) */
  name = "";

  /** passes (TrackableStdVector<Tr2Pass>) */
  passes = [];

  /** libraries (std::vector<Tr2EffectLibrary>) */
  libraries = [];

  /** shaderTypeMask (unsigned int) */
  shaderTypeMask = 0;

  /**
   * Build one technique from its portable JSON reflection record.
   *
   * @param {object} value Portable technique record.
   * @returns {Tr2EffectTechnique} Reflected technique.
   */
  static fromPortable(value) {
    if (!isPlainObject(value)) {
      throw new TypeError("Portable effect technique must be an object");
    }
    if (!isArray(value.passes)) {
      throw new TypeError("Portable effect technique passes must be an array");
    }
    if (!isArray(value.libraries)) {
      throw new TypeError("Portable effect technique libraries must be an array");
    }
    if (value.passCount !== value.passes.length || value.libraryCount !== value.libraries.length) {
      throw new Error("Portable effect technique counts disagree with its collections");
    }
    const technique = new this();
    technique.name = String(value.name ?? "");
    technique.passes = value.passes.map(entry => Tr2Pass.fromPortable(entry));
    technique.libraries = value.libraries.map(entry => Tr2EffectLibrary.fromPortable(entry));
    technique.shaderTypeMask = technique.passes.reduce((mask, pass) => mask | pass.shaderTypeMask, 0) >>> 0;
    return technique;
  }
}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2EffectTechnique, {
  className: "Tr2EffectTechnique",
  family: "shader",
  methods: [{
    name: "fromPortable",
    impl: {
      custom: true,
      status: "custom",
      reason: "Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing."
    }
  }]
});
CjsSchema.decorateField(Tr2EffectTechnique, "name", type.string);
CjsSchema.decorateField(Tr2EffectTechnique, "passes", type.list("Tr2Pass"));
CjsSchema.decorateField(Tr2EffectTechnique, "libraries", type.list("Tr2EffectLibrary"));
CjsSchema.decorateField(Tr2EffectTechnique, "shaderTypeMask", type.uint32);

export { Tr2EffectTechnique };
//# sourceMappingURL=Tr2EffectTechnique.js.map
