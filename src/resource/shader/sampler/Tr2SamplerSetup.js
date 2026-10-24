// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { assertCarbonRecord } from "../../format/carbonRecordGuard.js";

import {
  recordRawBits,
  recordText,
  toRecordFloat,
  toRecordText
} from "../reflection/carbonRecordFields.js";

/** Reflected sampler name and complete device-free sampler descriptor. */
export class Tr2SamplerSetup
{
  /** Stable name independent of minification; no registry is required. */
  static className = "Tr2SamplerSetup";

  /** name (const char*) */
  name = "";

  /**
   * Whether the source sampler carried a name rather than authored null.
   *
   * Adapted: The schema string field cannot distinguish an authored null sampler name from
   * an empty name; portable reflection must retain that distinction for static sampler
   * records.
   * @meta.adapted
   */
  hasName = false;

  /** sampler (Tr2SamplerStateAL) */
  sampler = null;

  /**
   * Whether the sampler occupies a dynamic register rather than static signature state.
   *
   * Adapted: The portable effect contract distinguishes dynamic and static sampler
   * declarations before an engine creates sampler state.
   * @meta.adapted
   */
  isDynamic = false;

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
    assertCarbonRecord(record, "sampler");

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
      // On one line deliberately: the raw-field guard requires the
      // reinterpretation to be visible on the same line as the raw access.
      borderColor: (descriptor.borderColorRaw ?? [ 0, 0, 0, 0 ]).slice(0, 4).map(toRecordFloat),
      minLOD: toRecordFloat(descriptor.minLODRaw),
      maxLOD: toRecordFloat(descriptor.maxLODRaw),
      isDynamic: this.isDynamic ? 1 : 0
    };
  }

}
