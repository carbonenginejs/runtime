import { CjsSchema, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { isPlainObject, isArray } from '@carbonenginejs/runtime-utils/is';
import { Tr2EffectParameterAnnotation } from './Tr2EffectParameterAnnotation.js';
import { Tr2EffectTechnique } from './Tr2EffectTechnique.js';

// Source: trinity/trinity/Shader/Tr2EffectDescription.h
// Source: trinity/trinity/Shader/Tr2EffectDescription.cpp

/** Complete device-free effect description for one selected shader body. */
class Tr2EffectDescription extends CjsModel {
  /** techniques (TrackableStdVector<Tr2EffectTechnique>) */
  techniques = [];

  /** annotations (Tr2EffectAnnotationMap) */
  annotations = new Map();

  /**
   * Construct a canonical effect description from JS/JSON model values.
   *
   * @param {object} values Canonical model values.
   * @param {object} options CjsModel import options.
   * @returns {Tr2EffectDescription} Hydrated description.
   */
  static from(values = {}, options = {}) {
    let normalized = values;
    let annotations = null;
    if (values && Object.hasOwn(values, "annotations")) {
      const entries = values.annotations instanceof Map ? values.annotations : Object.entries(values.annotations ?? {});
      annotations = new Map();
      for (const [parameterName, records] of entries) {
        if (!Array.isArray(records)) {
          throw new TypeError(`Effect annotations for "${parameterName}" must be an array`);
        }
        annotations.set(String(parameterName), records.map(record => record instanceof Tr2EffectParameterAnnotation ? record : Tr2EffectParameterAnnotation.from(record, options)));
      }
      normalized = {
        ...values,
        annotations
      };
    }
    const effect = super.from(normalized, options);
    if (annotations) {
      effect.annotations = annotations;
    }
    return effect;
  }

  /**
   * Build one complete effect description from its portable JSON record.
   *
   * @param {object} value Portable effect-description record.
   * @returns {Tr2EffectDescription} Reflected description.
   */
  static fromPortable(value) {
    if (!isPlainObject(value)) {
      throw new TypeError("Portable effect description must be an object");
    }
    if (!isArray(value.annotations)) {
      throw new TypeError("Portable effect annotation groups must be an array");
    }
    if (!isArray(value.techniques)) {
      throw new TypeError("Portable effect techniques must be an array");
    }
    if (value.annotationGroupCount !== value.annotations.length || value.techniqueCount !== value.techniques.length) {
      throw new Error("Portable effect description counts disagree with its collections");
    }
    const effect = new this();
    effect.annotations = this.readPortableAnnotationGroups(value.annotations);
    effect.techniques = value.techniques.map(entry => Tr2EffectTechnique.fromPortable(entry));
    return effect;
  }

  /** Build parameter-name-indexed annotation groups. */
  static readPortableAnnotationGroups(values) {
    const result = new Map();
    for (const value of values) {
      if (!isPlainObject(value)) {
        throw new TypeError("Portable effect annotation group must be an object");
      }
      const parameterName = String(value.parameterName ?? "");
      if (!isArray(value.annotations)) {
        throw new TypeError(`Portable annotations for parameter "${parameterName}" must be an array`);
      }
      if (result.has(parameterName)) {
        throw new Error(`Portable effect annotation group "${parameterName}" is duplicated`);
      }
      result.set(parameterName, value.annotations.map(entry => Tr2EffectParameterAnnotation.fromPortable(entry)));
    }
    return result;
  }
}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2EffectDescription, {
  className: "Tr2EffectDescription",
  family: "shader",
  methods: [{
    name: "fromPortable",
    impl: {
      custom: true,
      status: "custom",
      reason: "Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing."
    }
  }, {
    name: "readPortableAnnotationGroups",
    impl: {
      custom: true,
      status: "custom",
      reason: "Carbon reads annotation groups from compiled bytes; CarbonEngineJS indexes the validated portable groups into canonical maps."
    }
  }]
});
CjsSchema.decorateField(Tr2EffectDescription, "techniques", type.list("Tr2EffectTechnique"));
CjsSchema.decorateField(Tr2EffectDescription, "annotations", type.map("Tr2EffectParameterAnnotationMap"));

export { Tr2EffectDescription };
//# sourceMappingURL=Tr2EffectDescription.js.map
