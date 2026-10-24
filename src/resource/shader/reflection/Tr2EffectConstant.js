// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { assertCarbonRecord } from "../../format/carbonRecordGuard.js";

import {
} from "#utils/is";
import { recordText, toRecordText } from "./carbonRecordFields.js";

/** Reflected shader constant metadata. */
export class Tr2EffectConstant
{
  /** Stable name independent of minification; no registry is required. */
  static className = "Tr2EffectConstant";

  /** name (BlueSharedString) */
  name = "";

  /** offset (unsigned). Carbon leaves it unset (Shader/Tr2EffectDescription.h:48). */
  offset = 0;

  /** size (unsigned). Carbon leaves it unset (Shader/Tr2EffectDescription.h:50). */
  size = 0;

  /** type (Type - enum Type). Carbon leaves it unset (Shader/Tr2EffectDescription.h:52). */
  type = 0;

  /** dimension (unsigned). Carbon leaves it unset (Shader/Tr2EffectDescription.h:54). */
  dimension = 0;

  /** elements (unsigned). Carbon leaves it unset (Shader/Tr2EffectDescription.h:56). */
  elements = 0;

  /** isSRGB (bool). Carbon leaves it unset (Shader/Tr2EffectDescription.h:58). */
  isSRGB = false;

  /** isAutoregister (bool). Carbon leaves it unset (Shader/Tr2EffectDescription.h:60). */
  isAutoregister = false;

  /**
   * Build one constant from its Carbon v15 description record.
   *
   * The record's numeric fields are already the widths Carbon declares, so this
   * is a rename plus the two byte-to-bool conversions; only `name` needs
   * dereferencing, because strings live in the container's arena.
   *
   * @param {object} record Carbon constant record.
   * @returns {Tr2EffectConstant} Reflected constant.
   */
  static fromCarbonBinary(record)
  {
    assertCarbonRecord(record, "constant");

    const constant = new this();
    constant.name = recordText(record.name);
    constant.offset = record.offset;
    constant.size = record.size;
    constant.type = record.type;
    constant.dimension = record.dimension;
    constant.elements = record.elements;
    constant.isSRGB = !!record.isSRGB;
    constant.isAutoregister = !!record.isAutoregister;
    return constant;
  }

  /**
   * Emit this constant as a Carbon v15 description record.
   *
   * @returns {object} Carbon constant record.
   */
  toCarbonBinary()
  {
    return {
      name: toRecordText(this.name),
      offset: this.offset,
      size: this.size,
      type: this.type,
      dimension: this.dimension,
      elements: this.elements,
      isSRGB: this.isSRGB ? 1 : 0,
      isAutoregister: this.isAutoregister ? 1 : 0
    };
  }

  static Type = Object.freeze({
    FLOAT: 0,
    INT: 1,
    UINT: 2,
    BOOL: 3,
    OTHER: 4
  });

}
