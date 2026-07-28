// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { impl, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import {
  isPlainObject,
  isUint32
} from "@carbonenginejs/runtime-utils/is";

/** Reflected shader constant metadata. */
@type.define({ className: "Tr2EffectConstant", family: "shader" })
export class Tr2EffectConstant extends CjsModel
{

  /** name (BlueSharedString) */
  @type.string
  name = "";

  /** offset (unsigned) */
  @type.uint32
  offset = 0;

  /** size (unsigned) */
  @type.uint32
  size = 0;

  /** type (Type - enum Type) */
  @type.int32
  @schema.enum("Type")
  type = 0;

  /** dimension (unsigned) */
  @type.uint32
  dimension = 0;

  /** elements (unsigned) */
  @type.uint32
  elements = 0;

  /** isSRGB (bool) */
  @type.boolean
  isSRGB = false;

  /** isAutoregister (bool) */
  @type.boolean
  isAutoregister = false;

  /**
   * Build one constant from its portable JSON reflection record.
   *
   * @param {object} value Portable constant record.
   * @returns {Tr2EffectConstant} Reflected constant.
   */
  @impl.custom
  @impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing.")
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
