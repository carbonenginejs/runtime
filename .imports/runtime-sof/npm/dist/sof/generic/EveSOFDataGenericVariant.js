import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_hullArea, _init_extra_hullArea, _init_name, _init_extra_name, _init_isTransparent, _init_extra_isTransparent;

/** EveSOFDataGenericVariant (eve) - generated from schema shapeHash fdb9ef63.... */
let _EveSOFDataGenericVar;
class EveSOFDataGenericVariant extends CjsModel {
  static {
    ({
      e: [_init_hullArea, _init_extra_hullArea, _init_name, _init_extra_name, _init_isTransparent, _init_extra_isTransparent],
      c: [_EveSOFDataGenericVar, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataGenericVariant",
      family: "eve"
    })], [[[io, io.persist, void 0, type.objectRef("EveSOFDataHullArea")], 16, "hullArea"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "isTransparent"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_isTransparent(this);
  }
  /** m_hullArea (EveSOFDataHullAreaPtr) [READWRITE, PERSIST] */
  hullArea = _init_hullArea(this, null);

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_hullArea(this), _init_name(this, ""));

  /** m_isTransparent (bool) [READWRITE, PERSIST] */
  isTransparent = (_init_extra_name(this), _init_isTransparent(this, false));
  static {
    _initClass();
  }
}

export { _EveSOFDataGenericVar as EveSOFDataGenericVariant };
//# sourceMappingURL=EveSOFDataGenericVariant.js.map
