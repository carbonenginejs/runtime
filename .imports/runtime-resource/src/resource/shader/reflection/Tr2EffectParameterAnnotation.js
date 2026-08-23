// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { CjsSchema, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { dwordToFloat } from "@carbonenginejs/runtime-utils/math/num";
import {
  isPlainObject
} from "@carbonenginejs/runtime-utils/is";
import { recordRawValue, recordText, toRecordRawValue, toRecordText } from "./carbonRecordFields.js";

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
   * Build one typed annotation from its Carbon v15 description record.
   *
   * The type byte decides which member is meaningful, and every non-string type
   * arrives as four untyped bytes rather than a number — Carbon writes the value
   * through one member of a `{float,int32_t}` union and reads it back through
   * another, so the bit pattern is the only faithful carrier. `rawValue` keeps
   * those bits and the typed accessor is derived from them, never the reverse.
   *
   * @param {object} record Carbon annotation record.
   * @returns {Tr2EffectParameterAnnotation} Reflected annotation.
   */
  static fromCarbonBinary(record)
  {
    if (!isPlainObject(record))
    {
      throw new TypeError("Carbon effect annotation record must be an object");
    }

    const annotation = new this();
    annotation.name = recordText(record.name);
    annotation.type = record.type;

    switch (annotation.type)
    {
      case this.Type.BOOL:
        annotation.rawValue = recordRawValue(record.rawValue);
        annotation.boolValue = annotation.rawValue !== 0;
        break;

      case this.Type.INT:
        annotation.rawValue = recordRawValue(record.rawValue);
        annotation.intValue = annotation.rawValue | 0;
        break;

      case this.Type.FLOAT:
        annotation.rawValue = recordRawValue(record.rawValue);
        annotation.floatValue = dwordToFloat(annotation.rawValue);
        break;

      case this.Type.STRING:
        annotation.stringValue = recordText(record.stringValue);
        break;

      default:
        throw new Error(
          `Carbon effect annotation type ${annotation.type} is unsupported`
        );
    }

    return annotation;
  }

  /**
   * Emit this annotation as a Carbon v15 record.
   *
   * The type byte decides which branch the writer takes, and every non-string
   * type travels as the raw bits rather than the typed member.
   *
   * @returns {object} Carbon annotation record.
   */
  toCarbonBinary()
  {
    if (this.type === Tr2EffectParameterAnnotation.Type.STRING)
    {
      return {
        name: toRecordText(this.name),
        type: this.type,
        stringValue: toRecordText(this.stringValue),
        rawValue: null
      };
    }
    return {
      name: toRecordText(this.name),
      type: this.type,
      stringValue: null,
      rawValue: toRecordRawValue(this.rawValue)
    };
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
  family: "shader",
  fields: {
    name: type.string,
    type: [ type.int32, type.enum("Type") ],
    boolValue: type.boolean,
    rawValue: [ impl.adapted, impl.reason("Carbon reads numeric annotations into typed values; the portable source contract retains the exact uint32 payload so NaN, negative zero, and integer bit patterns round-trip losslessly."), type.uint32 ],
    intValue: type.int32,
    floatValue: type.float32,
    stringValue: type.string
  }
});
