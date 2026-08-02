// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { CjsSchema, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { isPlainObject } from "@carbonenginejs/runtime-utils/is";
import {
  recordRawBits,
  recordText,
  toRecordFloat,
  toRecordText
} from "../reflection/carbonRecordFields.js";

/** Reflected sampler name and complete device-free sampler descriptor. */
export class Tr2SamplerSetup extends CjsModel
{

  /** name (const char*) */
  name = "";

  /** Whether the source sampler carried a name rather than authored null. */
  hasName = false;

  /** sampler (Tr2SamplerStateAL) */
  sampler = null;

  /** Whether the sampler occupies a dynamic register rather than static signature state. */
  isDynamic = false;

  /**
   * Construct a canonical sampler record from JS/JSON model values.
   *
   * @param {object} values Canonical model values.
   * @param {object} options CjsModel import options.
   * @returns {Tr2SamplerSetup} Hydrated sampler.
   */
  static from(values = {}, options = {})
  {
    let normalized = values;
    if (values && Object.hasOwn(values, "name")
      && !Object.hasOwn(values, "hasName"))
    {
      normalized = {
        ...values,
        hasName: values.name !== null,
        name: values.name === null ? "" : values.name
      };
    }
    return super.from(normalized, options);
  }

  /**
   * Build one dynamic sampler from its Carbon v15 description record.
   *
   * The name is kept whatever `isDynamic` says. Carbon nulls a non-dynamic
   * sampler's name while reading (`Tr2EffectDescription.cpp:430-433`), but that
   * is a runtime decision made on the way to a device — the file still carries
   * the string, and this graph has to be able to re-emit the file it came from.
   * Dropping it loses arena content: measured across the shipped corpus, this
   * single rule accounted for every non-byte-identical re-emission.
   *
   * A consumer that wants Carbon's runtime view asks for it: the name is
   * meaningful only when `isDynamic`.
   *
   * @param {object} record Carbon sampler record.
   * @returns {Tr2SamplerSetup} Reflected sampler.
   */
  static fromCarbonBinary(record)
  {
    if (!isPlainObject(record))
    {
      throw new TypeError("Carbon effect sampler record must be an object");
    }

    const sampler = new this();
    sampler.isDynamic = !!record.isDynamic;
    sampler.name = recordText(record.name);
    sampler.hasName = sampler.name !== "";
    sampler.sampler = {
      comparison: !!record.comparison,
      minFilter: record.minFilter,
      magFilter: record.magFilter,
      mipFilter: record.mipFilter,
      addressU: record.addressU,
      addressV: record.addressV,
      addressW: record.addressW,
      mipLODBiasRaw: recordRawBits(record.mipLODBias),
      maxAnisotropy: record.maxAnisotropy,
      comparisonFunc: record.comparisonFunc,
      borderColorRaw: (record.borderColor ?? []).map(recordRawBits),
      minLODRaw: recordRawBits(record.minLOD),
      maxLODRaw: recordRawBits(record.maxLOD)
    };
    return sampler;
  }


  /**
   * Emit this sampler as a Carbon v15 record.
   *
   * The name is written whether or not it is meaningful: Carbon's writer always
   * emits the field, and the string it emits is the one the compiler authored,
   * not the one Carbon's reader keeps.
   *
   * @param {number} registerIndex Register this sampler is bound at.
   * @returns {object} Carbon sampler record.
   */
  toCarbonBinary(registerIndex)
  {
    const descriptor = this.sampler ?? {};
    return {
      registerIndex,
      name: toRecordText(this.name),
      comparison: descriptor.comparison ? 1 : 0,
      minFilter: descriptor.minFilter,
      magFilter: descriptor.magFilter,
      mipFilter: descriptor.mipFilter,
      addressU: descriptor.addressU,
      addressV: descriptor.addressV,
      addressW: descriptor.addressW,
      mipLODBias: toRecordFloat(descriptor.mipLODBiasRaw),
      maxAnisotropy: descriptor.maxAnisotropy,
      comparisonFunc: descriptor.comparisonFunc,
      borderColor: (descriptor.borderColorRaw ?? [ 0, 0, 0, 0 ])
        .slice(0, 4).map(toRecordFloat),
      minLOD: toRecordFloat(descriptor.minLODRaw),
      maxLOD: toRecordFloat(descriptor.maxLODRaw),
      isDynamic: this.isDynamic ? 1 : 0
    };
  }

}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2SamplerSetup, {
  className: "Tr2SamplerSetup",
  family: "shader",
  fields: {
    name: type.string,
    hasName: [ impl.adapted, impl.reason("The schema string field cannot distinguish an authored null sampler name from an empty name; portable reflection must retain that distinction for static sampler records."), type.boolean ],
    sampler: type.rawStruct("Tr2SamplerStateAL"),
    isDynamic: [ impl.adapted, impl.reason("The portable effect contract distinguishes dynamic and static sampler declarations before an engine creates sampler state."), type.boolean ]
  }
});
