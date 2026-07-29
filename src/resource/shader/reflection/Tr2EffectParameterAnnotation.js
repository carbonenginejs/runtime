// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { CjsSchema, impl, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { dwordToFloat } from "@carbonenginejs/runtime-utils/math/num";
import {
  isPlainObject,
  isUint32
} from "@carbonenginejs/runtime-utils/is";

/** Typed annotation attached to a reflected effect parameter. */
export class Tr2EffectParameterAnnotation extends CjsModel
{

  /** name (const char*) */
  name = "";

  /** type (Type - enum Type) */
  type = 0;

  /** boolValue (bool) */
  boolValue = false;

  /** Exact serialized BOOL, INT, or FLOAT payload bits. */
  rawValue = 0;

  /** intValue (int) */
  intValue = 0;

  /** floatValue (float) */
  floatValue = 0;

  /** stringValue (const char*) */
  stringValue = "";

  /**
   * Build one typed annotation from its portable JSON reflection record.
   *
   * @param {object} value Portable annotation record.
   * @returns {Tr2EffectParameterAnnotation} Reflected annotation.
   */
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

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2EffectParameterAnnotation, {
  className: "Tr2EffectParameterAnnotation",
  family: "shader"
});
CjsSchema.decorateField(Tr2EffectParameterAnnotation, "name", type.string);
CjsSchema.decorateField(Tr2EffectParameterAnnotation, "type", type.int32, schema.enum("Type"));
CjsSchema.decorateField(Tr2EffectParameterAnnotation, "boolValue", type.boolean);
CjsSchema.decorateField(Tr2EffectParameterAnnotation, "rawValue", impl.adapted, impl.reason("Carbon reads numeric annotations into typed values; the portable source contract retains the exact uint32 payload so NaN, negative zero, and integer bit patterns round-trip losslessly."), type.uint32);
CjsSchema.decorateField(Tr2EffectParameterAnnotation, "intValue", type.int32);
CjsSchema.decorateField(Tr2EffectParameterAnnotation, "floatValue", type.float32);
CjsSchema.decorateField(Tr2EffectParameterAnnotation, "stringValue", type.string);
