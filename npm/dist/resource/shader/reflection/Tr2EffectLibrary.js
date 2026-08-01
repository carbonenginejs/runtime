import { CjsSchema, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { isPlainObject, isArray, isUint32 } from '@carbonenginejs/runtime-utils/is';
import { clonePortableSourceProgram } from '../portable.js';
import { Tr2EffectStageInput } from './Tr2EffectStageInput.js';

// Source: trinity/trinity/Shader/Tr2EffectDescription.h

/** Reflected shader-library metadata. */
class Tr2EffectLibrary extends CjsModel {
  /** payloadSize (uint32_t) */
  payloadSize = 0;

  /** libraryHandle (uint32_t) */
  libraryHandle = 0;

  /** rayGenName (BlueSharedStringW) */
  rayGenName = "";

  /** missName (BlueSharedStringW) */
  missName = "";

  /** closestHitName (BlueSharedStringW) */
  closestHitName = "";

  /** anyHitName (BlueSharedStringW) */
  anyHitName = "";

  /** intersectionName (BlueSharedStringW) */
  intersectionName = "";

  /** hitGroupName (BlueSharedStringW) */
  hitGroupName = "";

  /** globalInput (Tr2EffectStageInput) */
  globalInput = null;

  /** localInput (Tr2EffectStageInput) */
  localInput = null;

  /** globalResourceSetDesc (Tr2ResourceSetDescriptionAL) */
  globalResourceSetDesc = null;

  /** Exact source library program metadata and owned bytes. */
  sourceProgram = null;

  /** Portable export records retained before backend library registration. */
  exports = [];

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
      if (values?.[field] && !(values[field] instanceof Tr2EffectStageInput)) {
        normalized = normalized === values ? {
          ...values
        } : normalized;
        normalized[field] = Tr2EffectStageInput.from(values[field], options);
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
    library.globalInput = Tr2EffectStageInput.fromPortableInput(value.globalInput);
    library.localInput = Tr2EffectStageInput.fromPortableInput(value.localInput);
    return library;
  }
}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2EffectLibrary, {
  className: "Tr2EffectLibrary",
  family: "shader",
  fields: {
    payloadSize: type.uint32,
    libraryHandle: type.uint32,
    rayGenName: type.string,
    missName: type.string,
    closestHitName: type.string,
    anyHitName: type.string,
    intersectionName: type.string,
    hitGroupName: type.string,
    globalInput: type.rawStruct("Tr2EffectStageInput"),
    localInput: type.rawStruct("Tr2EffectStageInput"),
    globalResourceSetDesc: type.rawStruct("Tr2ResourceSetDescriptionAL"),
    sourceProgram: [impl.adapted, impl.reason("Carbon registers the library with the renderer while reading; the device-free graph retains the source program for later engine realization."), type.rawStruct("CjsEffectSourceProgram")],
    exports: [impl.adapted, impl.reason("Carbon resolves these exports into a renderer library handle; the device-free graph keeps the declarative export list."), type.rawStruct("CjsEffectLibraryExports")]
  }
});

export { Tr2EffectLibrary };
//# sourceMappingURL=Tr2EffectLibrary.js.map
