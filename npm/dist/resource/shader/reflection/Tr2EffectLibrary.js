import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { isPlainObject, isArray, isUint32 } from '@carbonenginejs/runtime-utils/is';
import { clonePortableSourceProgram } from '../portable.js';
import { Tr2EffectStageInput as _Tr2EffectStageInput } from './Tr2EffectStageInput.js';

let _initStatic, _initClass, _init_payloadSize, _init_extra_payloadSize, _init_libraryHandle, _init_extra_libraryHandle, _init_rayGenName, _init_extra_rayGenName, _init_missName, _init_extra_missName, _init_closestHitName, _init_extra_closestHitName, _init_anyHitName, _init_extra_anyHitName, _init_intersectionName, _init_extra_intersectionName, _init_hitGroupName, _init_extra_hitGroupName, _init_globalInput, _init_extra_globalInput, _init_localInput, _init_extra_localInput, _init_globalResourceSetDesc, _init_extra_globalResourceSetDesc, _init_sourceProgram, _init_extra_sourceProgram, _init_exports, _init_extra_exports;

/** Reflected shader-library metadata. */
let _Tr2EffectLibrary;
class Tr2EffectLibrary extends CjsModel {
  static {
    ({
      e: [_init_payloadSize, _init_extra_payloadSize, _init_libraryHandle, _init_extra_libraryHandle, _init_rayGenName, _init_extra_rayGenName, _init_missName, _init_extra_missName, _init_closestHitName, _init_extra_closestHitName, _init_anyHitName, _init_extra_anyHitName, _init_intersectionName, _init_extra_intersectionName, _init_hitGroupName, _init_extra_hitGroupName, _init_globalInput, _init_extra_globalInput, _init_localInput, _init_extra_localInput, _init_globalResourceSetDesc, _init_extra_globalResourceSetDesc, _init_sourceProgram, _init_extra_sourceProgram, _init_exports, _init_extra_exports, _initStatic],
      c: [_Tr2EffectLibrary, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2EffectLibrary",
      family: "shader"
    })], [[[type, type.uint32], 16, "payloadSize"], [[type, type.uint32], 16, "libraryHandle"], [[type, type.string], 16, "rayGenName"], [[type, type.string], 16, "missName"], [[type, type.string], 16, "closestHitName"], [[type, type.string], 16, "anyHitName"], [[type, type.string], 16, "intersectionName"], [[type, type.string], 16, "hitGroupName"], [type.rawStruct("Tr2EffectStageInput"), 0, "globalInput"], [type.rawStruct("Tr2EffectStageInput"), 0, "localInput"], [type.rawStruct("Tr2ResourceSetDescriptionAL"), 0, "globalResourceSetDesc"], [[impl, impl.adapted, void 0, impl.reason("Carbon registers the library with the renderer while reading; the device-free graph retains the source program for later engine realization."), void 0, type.rawStruct("CjsEffectSourceProgram")], 16, "sourceProgram"], [[impl, impl.adapted, void 0, impl.reason("Carbon resolves these exports into a renderer library handle; the device-free graph keeps the declarative export list."), void 0, type.rawStruct("CjsEffectLibraryExports")], 16, "exports"], [[impl, impl.custom, void 0, impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing.")], 26, "fromPortable"]], 0, void 0, CjsModel));
    _initStatic(this);
  }
  constructor(...args) {
    super(...args);
    _init_extra_exports(this);
  }
  /** payloadSize (uint32_t) */
  payloadSize = _init_payloadSize(this, 0);

  /** libraryHandle (uint32_t) */
  libraryHandle = (_init_extra_payloadSize(this), _init_libraryHandle(this, 0));

  /** rayGenName (BlueSharedStringW) */
  rayGenName = (_init_extra_libraryHandle(this), _init_rayGenName(this, ""));

  /** missName (BlueSharedStringW) */
  missName = (_init_extra_rayGenName(this), _init_missName(this, ""));

  /** closestHitName (BlueSharedStringW) */
  closestHitName = (_init_extra_missName(this), _init_closestHitName(this, ""));

  /** anyHitName (BlueSharedStringW) */
  anyHitName = (_init_extra_closestHitName(this), _init_anyHitName(this, ""));

  /** intersectionName (BlueSharedStringW) */
  intersectionName = (_init_extra_anyHitName(this), _init_intersectionName(this, ""));

  /** hitGroupName (BlueSharedStringW) */
  hitGroupName = (_init_extra_intersectionName(this), _init_hitGroupName(this, ""));

  /** globalInput (Tr2EffectStageInput) */
  globalInput = (_init_extra_hitGroupName(this), _init_globalInput(this, null));

  /** localInput (Tr2EffectStageInput) */
  localInput = (_init_extra_globalInput(this), _init_localInput(this, null));

  /** globalResourceSetDesc (Tr2ResourceSetDescriptionAL) */
  globalResourceSetDesc = (_init_extra_localInput(this), _init_globalResourceSetDesc(this, null));

  /** Exact source library program metadata and owned bytes. */
  sourceProgram = (_init_extra_globalResourceSetDesc(this), _init_sourceProgram(this, null));

  /** Portable export records retained before backend library registration. */
  exports = (_init_extra_sourceProgram(this), _init_exports(this, []));

  /**
   * Construct one canonical library from JS/JSON model values.
   *
   * @param {object} values Canonical model values.
   * @param {object} options CjsModel import options.
   * @returns {Tr2EffectLibrary} Hydrated library.
   */
  static from(values = {}, options = {}) {
    let normalized = values;
    const inputs = new Map();
    for (const field of ["globalInput", "localInput"]) {
      if (values?.[field] && !(values[field] instanceof _Tr2EffectStageInput)) {
        normalized = normalized === values ? {
          ...values
        } : normalized;
        normalized[field] = _Tr2EffectStageInput.from(values[field], options);
        inputs.set(field, normalized[field]);
      }
    }
    const library = super.from(normalized, options);
    for (const [field, value] of inputs) {
      library[field] = value;
    }
    return library;
  }

  /**
   * Build one shader library from its portable JSON reflection record.
   *
   * @param {object} value Portable library record.
   * @returns {Tr2EffectLibrary} Reflected library.
   */
  static fromPortable(value) {
    if (!isPlainObject(value)) {
      throw new TypeError("Portable effect library must be an object");
    }
    if (!isArray(value.exports)) {
      throw new TypeError("Portable effect library exports must be an array");
    }
    if (value.exportCount !== value.exports.length) {
      throw new Error("Portable effect library export count disagrees with its collection");
    }
    const library = new this();
    if (!isUint32(value.payloadSize)) {
      throw new RangeError("Portable effect library payload size must fit uint32");
    }
    library.payloadSize = value.payloadSize;
    library.hitGroupName = String(value.hitGroupName ?? "");
    library.exports = value.exports.map(entry => {
      if (!isUint32(entry?.type)) {
        throw new RangeError("Portable effect library export type must fit uint32");
      }
      return {
        type: entry.type,
        name: String(entry?.name ?? "")
      };
    });
    for (const entry of library.exports) {
      if (entry.type === 0) library.rayGenName = entry.name;
      if (entry.type === 1) library.missName = entry.name;
      if (entry.type === 2) library.closestHitName = entry.name;
      if (entry.type === 3) library.anyHitName = entry.name;
      if (entry.type === 4) library.intersectionName = entry.name;
    }
    library.sourceProgram = clonePortableSourceProgram(value.sourceProgram, "library");
    library.globalInput = _Tr2EffectStageInput.fromPortableInput(value.globalInput);
    library.localInput = _Tr2EffectStageInput.fromPortableInput(value.localInput);
    return library;
  }
  static {
    _initClass();
  }
}

export { _Tr2EffectLibrary as Tr2EffectLibrary };
//# sourceMappingURL=Tr2EffectLibrary.js.map
