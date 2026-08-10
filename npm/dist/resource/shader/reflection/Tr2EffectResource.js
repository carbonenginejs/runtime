import { CjsSchema, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { isPlainObject } from '@carbonenginejs/runtime-utils/is';
import { recordText, toRecordText } from './carbonRecordFields.js';

// Source: trinity/trinity/Shader/Tr2EffectDescription.h

/** Reflected SRV or UAV resource metadata. */
class Tr2EffectResource extends CjsModel {
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
  static fromCarbonBinary(record) {
    if (!isPlainObject(record)) {
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
   * Emit this resource as a Carbon v15 texture or UAV record.
   *
   * A UAV record is one byte shorter: it carries no `isSRGB`, because Carbon's
   * reader hardcodes it false and `Uav::Save` omits it. Emitting the field
   * anyway would desynchronise every following field in the stage.
   *
   * @param {number} registerIndex Register this resource is bound at.
   * @param {boolean} [uav] Whether to emit the UAV shape.
   * @returns {object} Carbon texture or UAV record.
   */
  toCarbonBinary(registerIndex, uav = false) {
    const record = {
      registerIndex,
      name: toRecordText(this.name),
      type: this.type,
      count: this.arrayElements,
      isAutoregister: this.isAutoregister ? 1 : 0
    };
    if (uav) {
      return record;
    }
    return {
      registerIndex,
      name: record.name,
      type: record.type,
      count: record.count,
      isSRGB: this.isSRGB ? 1 : 0,
      isAutoregister: record.isAutoregister
    };
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
    type: [type.int32, type.enum("Type")],
    arrayElements: type.uint32
  }
});

export { Tr2EffectResource };
//# sourceMappingURL=Tr2EffectResource.js.map
