// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { impl, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import {
  isPlainObject,
  isUint32
} from "@carbonenginejs/runtime-utils/is";

/** Reflected SRV or UAV resource metadata. */
@type.define({ className: "Tr2EffectResource", family: "shader" })
export class Tr2EffectResource extends CjsModel
{

  /** isSRGB (bool) */
  @type.boolean
  isSRGB = false;

  /** isAutoregister (bool) */
  @type.boolean
  isAutoregister = false;

  /** name (const char*) */
  @type.string
  name = "";

  /** type (Type - enum Type) */
  @type.int32
  @schema.enum("Type")
  type = 0;

  /** arrayElements (uint32_t) */
  @type.uint32
  arrayElements = 0;

  /**
   * Build one SRV or UAV from its portable JSON reflection record.
   *
   * @param {object} value Portable resource record.
   * @returns {Tr2EffectResource} Reflected resource.
   */
  @impl.custom
  @impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing.")
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
