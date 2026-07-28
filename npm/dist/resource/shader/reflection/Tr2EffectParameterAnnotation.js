import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { dwordToFloat } from '@carbonenginejs/runtime-utils/math/num';
import { isPlainObject, isUint32 } from '@carbonenginejs/runtime-utils/is';

let _initStatic, _initClass, _init_name, _init_extra_name, _init_type, _init_extra_type, _init_boolValue, _init_extra_boolValue, _init_rawValue, _init_extra_rawValue, _init_intValue, _init_extra_intValue, _init_floatValue, _init_extra_floatValue, _init_stringValue, _init_extra_stringValue;

/** Typed annotation attached to a reflected effect parameter. */
let _Tr2EffectParameterAn;
new class extends _identity {
  static [class Tr2EffectParameterAnnotation extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_type, _init_extra_type, _init_boolValue, _init_extra_boolValue, _init_rawValue, _init_extra_rawValue, _init_intValue, _init_extra_intValue, _init_floatValue, _init_extra_floatValue, _init_stringValue, _init_extra_stringValue, _initStatic],
        c: [_Tr2EffectParameterAn, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2EffectParameterAnnotation",
        family: "shader"
      })], [[[type, type.string], 16, "name"], [[type, type.int32, void 0, schema.enum("Type")], 16, "type"], [[type, type.boolean], 16, "boolValue"], [[impl, impl.adapted, void 0, impl.reason("Carbon reads numeric annotations into typed values; the portable source contract retains the exact uint32 payload so NaN, negative zero, and integer bit patterns round-trip losslessly."), type, type.uint32], 16, "rawValue"], [[type, type.int32], 16, "intValue"], [[type, type.float32], 16, "floatValue"], [[type, type.string], 16, "stringValue"], [[impl, impl.custom, void 0, impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract while retaining exact numeric bits.")], 26, "fromPortable"]], 0, void 0, CjsModel));
      _initStatic(this);
    }
    constructor(...args) {
      super(...args);
      _init_extra_stringValue(this);
    }
    /** name (const char*) */
    name = _init_name(this, "");

    /** type (Type - enum Type) */
    type = (_init_extra_name(this), _init_type(this, 0));

    /** boolValue (bool) */
    boolValue = (_init_extra_type(this), _init_boolValue(this, false));

    /** Exact serialized BOOL, INT, or FLOAT payload bits. */
    rawValue = (_init_extra_boolValue(this), _init_rawValue(this, 0));

    /** intValue (int) */
    intValue = (_init_extra_rawValue(this), _init_intValue(this, 0));

    /** floatValue (float) */
    floatValue = (_init_extra_intValue(this), _init_floatValue(this, 0));

    /** stringValue (const char*) */
    stringValue = (_init_extra_floatValue(this), _init_stringValue(this, ""));

    /**
     * Build one typed annotation from its portable JSON reflection record.
     *
     * @param {object} value Portable annotation record.
     * @returns {Tr2EffectParameterAnnotation} Reflected annotation.
     */
    static fromPortable(value) {
      if (!isPlainObject(value)) {
        throw new TypeError("Portable effect annotation must be an object");
      }
      if (!isUint32(value.type)) {
        throw new RangeError("Portable annotation type must fit uint32");
      }
      const annotation = new this();
      annotation.name = String(value.name ?? "");
      annotation.type = value.type;
      switch (annotation.type) {
        case this.Type.BOOL:
          if (!isUint32(value.rawValue)) {
            throw new RangeError("Portable boolean annotation must fit uint32");
          }
          annotation.rawValue = value.rawValue;
          annotation.boolValue = annotation.rawValue !== 0;
          break;
        case this.Type.INT:
          if (!isUint32(value.rawValue)) {
            throw new RangeError("Portable integer annotation must fit uint32");
          }
          annotation.rawValue = value.rawValue;
          annotation.intValue = annotation.rawValue | 0;
          break;
        case this.Type.FLOAT:
          if (!isUint32(value.rawValue)) {
            throw new RangeError("Portable float annotation must fit uint32");
          }
          annotation.rawValue = value.rawValue;
          annotation.floatValue = dwordToFloat(annotation.rawValue);
          break;
        case this.Type.STRING:
          annotation.stringValue = String(value.stringValue ?? "");
          break;
        default:
          throw new Error(`Portable annotation type ${annotation.type} is unsupported`);
      }
      return annotation;
    }
  }];
  Type = Object.freeze({
    BOOL: 0,
    INT: 1,
    FLOAT: 2,
    STRING: 3
  });
  constructor() {
    super(_Tr2EffectParameterAn), _initClass();
  }
}();

export { _Tr2EffectParameterAn as Tr2EffectParameterAnnotation };
//# sourceMappingURL=Tr2EffectParameterAnnotation.js.map
