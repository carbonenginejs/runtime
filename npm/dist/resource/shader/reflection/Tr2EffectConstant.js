import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { isPlainObject, isUint32 } from '@carbonenginejs/runtime-utils/is';

let _initStatic, _initClass, _init_name, _init_extra_name, _init_offset, _init_extra_offset, _init_size, _init_extra_size, _init_type, _init_extra_type, _init_dimension, _init_extra_dimension, _init_elements, _init_extra_elements, _init_isSRGB, _init_extra_isSRGB, _init_isAutoregister, _init_extra_isAutoregister;

/** Reflected shader constant metadata. */
let _Tr2EffectConstant;
new class extends _identity {
  static [class Tr2EffectConstant extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_offset, _init_extra_offset, _init_size, _init_extra_size, _init_type, _init_extra_type, _init_dimension, _init_extra_dimension, _init_elements, _init_extra_elements, _init_isSRGB, _init_extra_isSRGB, _init_isAutoregister, _init_extra_isAutoregister, _initStatic],
        c: [_Tr2EffectConstant, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2EffectConstant",
        family: "shader"
      })], [[[type, type.string], 16, "name"], [[type, type.uint32], 16, "offset"], [[type, type.uint32], 16, "size"], [[type, type.int32, void 0, schema.enum("Type")], 16, "type"], [[type, type.uint32], 16, "dimension"], [[type, type.uint32], 16, "elements"], [[type, type.boolean], 16, "isSRGB"], [[type, type.boolean], 16, "isAutoregister"], [[impl, impl.custom, void 0, impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing.")], 26, "fromPortable"]], 0, void 0, CjsModel));
      _initStatic(this);
    }
    constructor(...args) {
      super(...args);
      _init_extra_isAutoregister(this);
    }
    /** name (BlueSharedString) */
    name = _init_name(this, "");

    /** offset (unsigned) */
    offset = (_init_extra_name(this), _init_offset(this, 0));

    /** size (unsigned) */
    size = (_init_extra_offset(this), _init_size(this, 0));

    /** type (Type - enum Type) */
    type = (_init_extra_size(this), _init_type(this, 0));

    /** dimension (unsigned) */
    dimension = (_init_extra_type(this), _init_dimension(this, 0));

    /** elements (unsigned) */
    elements = (_init_extra_dimension(this), _init_elements(this, 0));

    /** isSRGB (bool) */
    isSRGB = (_init_extra_elements(this), _init_isSRGB(this, false));

    /** isAutoregister (bool) */
    isAutoregister = (_init_extra_isSRGB(this), _init_isAutoregister(this, false));

    /**
     * Build one constant from its portable JSON reflection record.
     *
     * @param {object} value Portable constant record.
     * @returns {Tr2EffectConstant} Reflected constant.
     */
    static fromPortable(value) {
      if (!isPlainObject(value)) {
        throw new TypeError("Portable effect constant must be an object");
      }
      if (!isUint32(value.offset)) {
        throw new RangeError("Portable constant offset must fit uint32");
      }
      if (!isUint32(value.size)) {
        throw new RangeError("Portable constant size must fit uint32");
      }
      if (!isUint32(value.type)) {
        throw new RangeError("Portable constant type must fit uint32");
      }
      if (!isUint32(value.dimension)) {
        throw new RangeError("Portable constant dimension must fit uint32");
      }
      if (!isUint32(value.elements)) {
        throw new RangeError("Portable constant element count must fit uint32");
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
  }];
  Type = Object.freeze({
    FLOAT: 0,
    INT: 1,
    UINT: 2,
    BOOL: 3,
    OTHER: 4
  });
  constructor() {
    super(_Tr2EffectConstant), _initClass();
  }
}();

export { _Tr2EffectConstant as Tr2EffectConstant };
//# sourceMappingURL=Tr2EffectConstant.js.map
