import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { isPlainObject, isArray } from '@carbonenginejs/runtime-utils/is';
import { Tr2EffectParameterAnnotation as _Tr2EffectParameterAn } from './Tr2EffectParameterAnnotation.js';
import { Tr2EffectTechnique as _Tr2EffectTechnique } from './Tr2EffectTechnique.js';

let _initStatic, _initClass, _init_techniques, _init_extra_techniques, _init_annotations, _init_extra_annotations;

/** Complete device-free effect description for one selected shader body. */
let _Tr2EffectDescription;
class Tr2EffectDescription extends CjsModel {
  static {
    ({
      e: [_init_techniques, _init_extra_techniques, _init_annotations, _init_extra_annotations, _initStatic],
      c: [_Tr2EffectDescription, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2EffectDescription",
      family: "shader"
    })], [[type.list("Tr2EffectTechnique"), 0, "techniques"], [type.map("Tr2EffectParameterAnnotationMap"), 0, "annotations"], [[impl, impl.custom, void 0, impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing.")], 26, "fromPortable"], [[impl, impl.custom, void 0, impl.reason("Carbon reads annotation groups from compiled bytes; CarbonEngineJS indexes the validated portable groups into canonical maps.")], 26, "readPortableAnnotationGroups"]], 0, void 0, CjsModel));
    _initStatic(this);
  }
  constructor(...args) {
    super(...args);
    _init_extra_annotations(this);
  }
  /** techniques (TrackableStdVector<Tr2EffectTechnique>) */
  techniques = _init_techniques(this, []);

  /** annotations (Tr2EffectAnnotationMap) */
  annotations = (_init_extra_techniques(this), _init_annotations(this, new Map()));

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
        annotations.set(String(parameterName), records.map(record => record instanceof _Tr2EffectParameterAn ? record : _Tr2EffectParameterAn.from(record, options)));
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
    effect.techniques = value.techniques.map(entry => _Tr2EffectTechnique.fromPortable(entry));
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
      result.set(parameterName, value.annotations.map(entry => _Tr2EffectParameterAn.fromPortable(entry)));
    }
    return result;
  }
  static {
    _initClass();
  }
}

export { _Tr2EffectDescription as Tr2EffectDescription };
//# sourceMappingURL=Tr2EffectDescription.js.map
