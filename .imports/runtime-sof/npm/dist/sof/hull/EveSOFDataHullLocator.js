import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';

let _initClass, _init_name, _init_extra_name, _init_transform, _init_extra_transform;

/** EveSOFDataHullLocator (eve) - generated from schema shapeHash afb2ce68.... */
let _EveSOFDataHullLocato;
class EveSOFDataHullLocator extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_transform, _init_extra_transform],
      c: [_EveSOFDataHullLocato, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullLocator",
      family: "eve"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.mat4], 16, "transform"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_transform(this);
  }
  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = _init_name(this, "");

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  transform = (_init_extra_name(this), _init_transform(this, mat4.create()));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullLocato as EveSOFDataHullLocator };
//# sourceMappingURL=EveSOFDataHullLocator.js.map
