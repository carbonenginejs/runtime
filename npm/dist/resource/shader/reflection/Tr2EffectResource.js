import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { isPlainObject, isUint32 } from '@carbonenginejs/runtime-utils/is';

let _initStatic, _initClass, _init_isSRGB, _init_extra_isSRGB, _init_isAutoregister, _init_extra_isAutoregister, _init_name, _init_extra_name, _init_type, _init_extra_type, _init_arrayElements, _init_extra_arrayElements;

/** Reflected SRV or UAV resource metadata. */
let _Tr2EffectResource;
new class extends _identity {
  static [class Tr2EffectResource extends CjsModel {
    static {
      ({
        e: [_init_isSRGB, _init_extra_isSRGB, _init_isAutoregister, _init_extra_isAutoregister, _init_name, _init_extra_name, _init_type, _init_extra_type, _init_arrayElements, _init_extra_arrayElements, _initStatic],
        c: [_Tr2EffectResource, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2EffectResource",
        family: "shader"
      })], [[[type, type.boolean], 16, "isSRGB"], [[type, type.boolean], 16, "isAutoregister"], [[type, type.string], 16, "name"], [[type, type.int32, void 0, schema.enum("Type")], 16, "type"], [[type, type.uint32], 16, "arrayElements"], [[impl, impl.custom, void 0, impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing.")], 26, "fromPortable"]], 0, void 0, CjsModel));
      _initStatic(this);
    }
    constructor(...args) {
      super(...args);
      _init_extra_arrayElements(this);
    }
    /** isSRGB (bool) */
    isSRGB = _init_isSRGB(this, false);

    /** isAutoregister (bool) */
    isAutoregister = (_init_extra_isSRGB(this), _init_isAutoregister(this, false));

    /** name (const char*) */
    name = (_init_extra_isAutoregister(this), _init_name(this, ""));

    /** type (Type - enum Type) */
    type = (_init_extra_name(this), _init_type(this, 0));

    /** arrayElements (uint32_t) */
    arrayElements = (_init_extra_type(this), _init_arrayElements(this, 0));

    /**
     * Build one SRV or UAV from its portable JSON reflection record.
     *
     * @param {object} value Portable resource record.
     * @returns {Tr2EffectResource} Reflected resource.
     */
    static fromPortable(value) {
      if (!isPlainObject(value)) {
        throw new TypeError("Portable effect resource must be an object");
      }
      if (!isUint32(value.type)) {
        throw new RangeError("Portable resource type must fit uint32");
      }
      if (!isUint32(value.arrayElements)) {
        throw new RangeError("Portable resource array element count must fit uint32");
      }
      const resource = new this();
      resource.name = String(value.name ?? "");
      resource.type = value.type;
      resource.arrayElements = value.arrayElements;
      resource.isSRGB = !!value.isSRGB;
      resource.isAutoregister = !!value.isAutoregister;
      return resource;
    }
  }];
  BINDLESS_SAMPLER = 100;
  Type = Object.freeze({
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
  constructor() {
    super(_Tr2EffectResource), _initClass();
  }
}();

export { _Tr2EffectResource as Tr2EffectResource };
//# sourceMappingURL=Tr2EffectResource.js.map
