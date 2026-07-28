// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { impl, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { dwordToFloat } from "@carbonenginejs/runtime-utils/math/num";
import {
  isPlainObject,
  isUint32
} from "@carbonenginejs/runtime-utils/is";

/** Typed annotation attached to a reflected effect parameter. */
@type.define({ className: "Tr2EffectParameterAnnotation", family: "shader" })
export class Tr2EffectParameterAnnotation extends CjsModel
{

  /** name (const char*) */
  @type.string
  name = "";

  /** type (Type - enum Type) */
  @type.int32
  @schema.enum("Type")
  type = 0;

  /** boolValue (bool) */
  @type.boolean
  boolValue = false;

  /** Exact serialized BOOL, INT, or FLOAT payload bits. */
  @impl.adapted
  @impl.reason("Carbon reads numeric annotations into typed values; the portable source contract retains the exact uint32 payload so NaN, negative zero, and integer bit patterns round-trip losslessly.")
  @type.uint32
  rawValue = 0;

  /** intValue (int) */
  @type.int32
  intValue = 0;

  /** floatValue (float) */
  @type.float32
  floatValue = 0;

  /** stringValue (const char*) */
  @type.string
  stringValue = "";

  /**
   * Build one typed annotation from its portable JSON reflection record.
   *
   * @param {object} value Portable annotation record.
   * @returns {Tr2EffectParameterAnnotation} Reflected annotation.
   */
  @impl.custom
  @impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract while retaining exact numeric bits.")
  static fromPortable(value)
  {
    if (!isPlainObject(value))
    {
      throw new TypeError("Portable effect annotation must be an object");
    }
    if (!isUint32(value.type))
    {
      throw new RangeError("Portable annotation type must fit uint32");
    }

    const annotation = new this();
    annotation.name = String(value.name ?? "");
    annotation.type = value.type;

    switch (annotation.type)
    {
      case this.Type.BOOL:
        if (!isUint32(value.rawValue))
        {
          throw new RangeError(
            "Portable boolean annotation must fit uint32"
          );
        }
        annotation.rawValue = value.rawValue;
        annotation.boolValue = annotation.rawValue !== 0;
        break;

      case this.Type.INT:
        if (!isUint32(value.rawValue))
        {
          throw new RangeError(
            "Portable integer annotation must fit uint32"
          );
        }
        annotation.rawValue = value.rawValue;
        annotation.intValue = annotation.rawValue | 0;
        break;

      case this.Type.FLOAT:
        if (!isUint32(value.rawValue))
        {
          throw new RangeError(
            "Portable float annotation must fit uint32"
          );
        }
        annotation.rawValue = value.rawValue;
        annotation.floatValue = dwordToFloat(annotation.rawValue);
        break;

      case this.Type.STRING:
        annotation.stringValue = String(value.stringValue ?? "");
        break;

      default:
        throw new Error(
          `Portable annotation type ${annotation.type} is unsupported`
        );
    }

    return annotation;
  }

  static Type = Object.freeze({
    BOOL: 0,
    INT: 1,
    FLOAT: 2,
    STRING: 3
  });

}
