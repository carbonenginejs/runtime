import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { IEveSOFDataHullLocatorSet as _IEveSOFDataHullLocat } from './IEveSOFDataHullLocatorSet.js';

let _initClass, _init_locators, _init_extra_locators, _init_name, _init_extra_name;

/** EveSOFDataHullLocatorSet (eve) - generated from schema shapeHash 9cacbf77.... */
let _EveSOFDataHullLocato;
class EveSOFDataHullLocatorSet extends _IEveSOFDataHullLocat {
  static {
    ({
      e: [_init_locators, _init_extra_locators, _init_name, _init_extra_name],
      c: [_EveSOFDataHullLocato, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullLocatorSet",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("EveSOFDataTransform")], 16, "locators"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, _IEveSOFDataHullLocat));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_locators (PEveSOFDataTransformVector) [READ, PERSIST] */
  locators = _init_locators(this, []);

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_locators(this), _init_name(this, ""));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullLocato as EveSOFDataHullLocatorSet };
//# sourceMappingURL=EveSOFDataHullLocatorSet.js.map
