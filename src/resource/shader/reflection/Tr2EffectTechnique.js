// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { CjsSchema, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import {
  isArray,
  isPlainObject
} from "@carbonenginejs/runtime-utils/is";
import { Tr2EffectLibrary } from "./Tr2EffectLibrary.js";
import { Tr2Pass } from "./Tr2Pass.js";
import { recordText } from "./carbonRecordFields.js";

/** Reflected effect technique and its passes and libraries. */
export class Tr2EffectTechnique extends CjsModel
{

  /** name (BlueSharedString) */
  name = "";

  /** passes (TrackableStdVector<Tr2Pass>) */
  passes = [];

  /** libraries (std::vector<Tr2EffectLibrary>) */
  libraries = [];

  /** shaderTypeMask (unsigned int) */
  shaderTypeMask = 0;

  /**
   * Build one technique from its Carbon v15 description record.
   *
   * The technique's shader-type mask is not stored; it is the union of its
   * passes' masks, so it is recomputed here exactly as the portable path does.
   *
   * @param {object} record Carbon technique record.
   * @returns {Tr2EffectTechnique} Reflected technique.
   */
  static fromCarbonBinary(record)
  {
    if (!isPlainObject(record))
    {
      throw new TypeError("Carbon effect technique record must be an object");
    }

    const technique = new this();
    technique.name = recordText(record.name);
    technique.passes = record.passes.map(
      entry => Tr2Pass.fromCarbonBinary(entry)
    );
    technique.libraries = record.libraries.map(
      entry => Tr2EffectLibrary.fromCarbonBinary(entry)
    );
    technique.shaderTypeMask = technique.passes.reduce(
      (mask, pass) => mask | pass.shaderTypeMask,
      0
    ) >>> 0;
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
  fields: {
    name: type.string,
    passes: type.list("Tr2Pass"),
    libraries: type.list("Tr2EffectLibrary"),
    shaderTypeMask: type.uint32
  }
});
