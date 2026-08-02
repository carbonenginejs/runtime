// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { CjsSchema, impl, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import {
  isPlainObject,
  isUint32
} from "@carbonenginejs/runtime-utils/is";
import { recordText } from "./carbonRecordFields.js";

/** Reflected SRV or UAV resource metadata. */
export class Tr2EffectResource extends CjsModel
{

  /** isSRGB (bool) */
  isSRGB = false;

  /** isAutoregister (bool) */
  isAutoregister = false;

  /** name (const char*) */
  name = "";

  /** type (Type - enum Type) */
  type = 0;

  /** arrayElements (uint32_t) */
  arrayElements = 0;

  /**
   * Build one SRV or UAV from its Carbon v15 description record.
   *
   * Both a texture record and a UAV record land here, and they are not the same
   * shape: a UAV record carries no `isSRGB` at all. Carbon's reader hardcodes
   * `isSRGB = false` for UAVs rather than reading a byte, and `Uav::Save` omits
   * it, so the field being absent is correct rather than missing — reading
   * `undefined` through `!!` reproduces Carbon exactly. The array size is spelled
   * `count` in the record and `arrayElements` on the class.
   *
   * @param {object} record Carbon texture or UAV record.
   * @returns {Tr2EffectResource} Reflected resource.
   */
  static fromCarbonBinary(record)
  {
    if (!isPlainObject(record))
    {
      throw new TypeError("Carbon effect resource record must be an object");
    }

    const resource = new this();
    resource.name = recordText(record.name);
    resource.type = record.type;
    resource.arrayElements = record.count;
    resource.isSRGB = !!record.isSRGB;
    resource.isAutoregister = !!record.isAutoregister;
    return resource;
  }

  /**
   * Build one SRV or UAV from its portable JSON reflection record.
   *
   * @param {object} value Portable resource record.
   * @returns {Tr2EffectResource} Reflected resource.
   */
  static fromPortable(value)
  {
    if (!isPlainObject(value))
    {
      throw new TypeError("Portable effect resource must be an object");
    }
    if (!isUint32(value.type))
    {
      throw new RangeError("Portable resource type must fit uint32");
    }
    if (!isUint32(value.arrayElements))
    {
      throw new RangeError(
        "Portable resource array element count must fit uint32"
      );
    }

    const resource = new this();
    resource.name = String(value.name ?? "");
    resource.type = value.type;
    resource.arrayElements = value.arrayElements;
    resource.isSRGB = !!value.isSRGB;
    resource.isAutoregister = !!value.isAutoregister;
    return resource;
  }

  static BINDLESS_SAMPLER = 100;

  static Type = Object.freeze({
    TEXTURE_1D: 1,
    TEXTURE_2D: 2,
    TEXTURE_3D: 3,
    TEXTURE_CUBE: 4,
    TEXTURE_TYPELESS: 5,
    BUFFER: 6,
    STRUCTURED_BUFFER: 7,
    TBUFFER: 8,
    BYTEADDRESS_BUFFER: 9,
    UAV_RWTYPED: 10,
    UAV_RWSTRUCTURED: 11,
    UAV_RWBYTEADDRESS: 12,
    UAV_APPEND_STRUCTURED: 13,
    UAV_CONSUME_STRUCTURED: 14,
    UAV_RWSTRUCTURED_WITH_COUNTER: 15
  });

}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2EffectResource, {
  className: "Tr2EffectResource",
  family: "shader",
  fields: {
    isSRGB: type.boolean,
    isAutoregister: type.boolean,
    name: type.string,
    type: [ type.int32, schema.enum("Type") ],
    arrayElements: type.uint32
  }
});
