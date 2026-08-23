import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { ReflectionMode } from '@carbonenginejs/runtime-utils/graphics';

let _initClass, _init_reflectionMode, _init_extra_reflectionMode, _init_name, _init_extra_name;

/** EveSOFDataGenericHullCategory (eve) - generated from schema shapeHash 8a182e5f.... */
let _EveSOFDataGenericHul;
class EveSOFDataGenericHullCategory extends CjsModel {
  static {
    ({
      e: [_init_reflectionMode, _init_extra_reflectionMode, _init_name, _init_extra_name],
      c: [_EveSOFDataGenericHul, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataGenericHullCategory",
      family: "eve"
    })], [[[io, io.persist, type, type.int32, void 0, type.enum("ReflectionMode")], 16, "reflectionMode"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_reflectionMode (EntityComponents::ReflectionMode - enum ReflectionMode) [READWRITE, PERSIST, ENUM] */
  reflectionMode = _init_reflectionMode(this, ReflectionMode.REFLECT_NEVER);

  /** m_categoryName (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_reflectionMode(this), _init_name(this, ""));
  static {
    _initClass();
  }
}

export { _EveSOFDataGenericHul as EveSOFDataGenericHullCategory };
//# sourceMappingURL=EveSOFDataGenericHullCategory.js.map
