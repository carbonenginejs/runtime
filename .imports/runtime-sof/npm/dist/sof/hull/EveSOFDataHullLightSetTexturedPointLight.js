import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { EveSOFDataHullLightSetItem as _EveSOFDataHullLightS$1 } from './EveSOFDataHullLightSetItem.js';

let _initClass, _init_texturePath, _init_extra_texturePath;

/** EveSOFDataHullLightSetTexturedPointLight (eve) - generated from schema shapeHash daa6d349.... */
// Carbon derives this from EveSOFDataHullLightSetItem (EveSOFData.h:
// 1410-1417) and re-maps the base surface WITHOUT lightColor, adding
// texturePath (EveSOFData_Blue.cpp:1076-1094): a textured point light takes
// its color from the texture, not the faction color set.
let _EveSOFDataHullLightS;
class EveSOFDataHullLightSetTexturedPointLight extends _EveSOFDataHullLightS$1 {
  static {
    ({
      e: [_init_texturePath, _init_extra_texturePath],
      c: [_EveSOFDataHullLightS, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullLightSetTexturedPointLight",
      family: "eve"
    }), type.hideInherited(["lightColor"])], [[[io, io.persist, type, type.string], 16, "texturePath"]], 0, void 0, _EveSOFDataHullLightS$1));
  }
  constructor(...args) {
    super(...args);
    _init_extra_texturePath(this);
  }
  /** m_data.texturePath (std::wstring) [READWRITE, PERSIST] */
  texturePath = _init_texturePath(this, "");
  static {
    _initClass();
  }
}

export { _EveSOFDataHullLightS as EveSOFDataHullLightSetTexturedPointLight };
//# sourceMappingURL=EveSOFDataHullLightSetTexturedPointLight.js.map
