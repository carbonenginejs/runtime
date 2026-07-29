// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import {
  isPlainObject,
  isUint32
} from "@carbonenginejs/runtime-utils/is";

/** Reflected shader constant metadata. */
export class Tr2EffectConstant extends CjsModel
{

  /** name (BlueSharedString) */
  name = "";

  /** offset (unsigned) */
  offset = 0;

  /** size (unsigned) */
  size = 0;

  /** type (Type - enum Type) */
  type = 0;

  /** dimension (unsigned) */
  dimension = 0;

  /** elements (unsigned) */
  elements = 0;

  /** isSRGB (bool) */
  isSRGB = false;

  /** isAutoregister (bool) */
  isAutoregister = false;

  /**
   * Build one constant from its portable JSON reflection record.
   *
   * @param {object} value Portable constant record.
   * @returns {Tr2EffectConstant} Reflected constant.
   */
  static fromPortable(value)
  {
    if (!isPlainObject(value))
    {
      throw new TypeError("Portable effect constant must be an object");
    }
    if (!isUint32(value.offset))
    {
      throw new RangeError("Portable constant offset must fit uint32");
    }
    if (!isUint32(value.size))
    {
      throw new RangeError("Portable constant size must fit uint32");
    }
    if (!isUint32(value.type))
    {
      throw new RangeError("Portable constant type must fit uint32");
    }
    if (!isUint32(value.dimension))
    {
      throw new RangeError("Portable constant dimension must fit uint32");
    }
    if (!isUint32(value.elements))
    {
      throw new RangeError(
        "Portable constant element count must fit uint32"
      );
    }

    const constant = new this();
    constant.name = String(value.name ?? "");
    constant.offset = value.offset;
    constant.size = value.size;
    constant.type = value.type;
    constant.dimension = value.dimension;
    constant.elements = value.elements;
    constant.isSRGB = !!value.isSRGB;
    constant.isAutoregister = !!value.isAutoregister;
    return constant;
  }

  static Type = Object.freeze({
    FLOAT: 0,
    INT: 1,
    UINT: 2,
    BOOL: 3,
    OTHER: 4
  });

}

// Declared imperatively rather than with decorators, so this module stays plain
// ESM that loads from source without a transform, which lets its tests import
// source instead of build output.
//
// Field order matters: it drives GetValues() export order. Statics belong in
// `methods` here rather than in a decorateMethod() call, which targets the
// prototype and would register a static as an instance field.
CjsSchema.define(Tr2EffectConstant, {
  className: "Tr2EffectConstant",
  family: "shader",
  fields: [
    { name: "name", type: { kind: "string" } },
    { name: "offset", type: { kind: "uint32" } },
    { name: "size", type: { kind: "uint32" } },
    { name: "type", enum: { enumType: "Type" }, type: { kind: "int32" } },
    { name: "dimension", type: { kind: "uint32" } },
    { name: "elements", type: { kind: "uint32" } },
    { name: "isSRGB", type: { kind: "boolean" } },
    { name: "isAutoregister", type: { kind: "boolean" } }
  ],
  methods: [
    {
      name: "fromPortable",
      impl: {
        reason: "Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing.",
        custom: true,
        status: "custom"
      }
    }
  ]
});
