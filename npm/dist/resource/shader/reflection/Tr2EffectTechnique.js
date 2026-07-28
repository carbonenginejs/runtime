import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { isPlainObject, isArray } from '@carbonenginejs/runtime-utils/is';
import { Tr2EffectLibrary as _Tr2EffectLibrary } from './Tr2EffectLibrary.js';
import { Tr2Pass as _Tr2Pass } from './Tr2Pass.js';

let _initStatic, _initClass, _init_name, _init_extra_name, _init_passes, _init_extra_passes, _init_libraries, _init_extra_libraries, _init_shaderTypeMask, _init_extra_shaderTypeMask;

/** Reflected effect technique and its passes and libraries. */
let _Tr2EffectTechnique;
class Tr2EffectTechnique extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_passes, _init_extra_passes, _init_libraries, _init_extra_libraries, _init_shaderTypeMask, _init_extra_shaderTypeMask, _initStatic],
      c: [_Tr2EffectTechnique, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2EffectTechnique",
      family: "shader"
    })], [[[type, type.string], 16, "name"], [type.list("Tr2Pass"), 0, "passes"], [type.list("Tr2EffectLibrary"), 0, "libraries"], [[type, type.uint32], 16, "shaderTypeMask"], [[impl, impl.custom, void 0, impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing.")], 26, "fromPortable"]], 0, void 0, CjsModel));
    _initStatic(this);
  }
  constructor(...args) {
    super(...args);
    _init_extra_shaderTypeMask(this);
  }
  /** name (BlueSharedString) */
  name = _init_name(this, "");

  /** passes (TrackableStdVector<Tr2Pass>) */
  passes = (_init_extra_name(this), _init_passes(this, []));

  /** libraries (std::vector<Tr2EffectLibrary>) */
  libraries = (_init_extra_passes(this), _init_libraries(this, []));

  /** shaderTypeMask (unsigned int) */
  shaderTypeMask = (_init_extra_libraries(this), _init_shaderTypeMask(this, 0));

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
    technique.passes = value.passes.map(entry => _Tr2Pass.fromPortable(entry));
    technique.libraries = value.libraries.map(entry => _Tr2EffectLibrary.fromPortable(entry));
    technique.shaderTypeMask = technique.passes.reduce((mask, pass) => mask | pass.shaderTypeMask, 0) >>> 0;
    return technique;
  }
  static {
    _initClass();
  }
}

export { _Tr2EffectTechnique as Tr2EffectTechnique };
//# sourceMappingURL=Tr2EffectTechnique.js.map
