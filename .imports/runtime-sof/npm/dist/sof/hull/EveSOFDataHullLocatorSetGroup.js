import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { IEveSOFDataHullLocatorSet as _IEveSOFDataHullLocat } from './IEveSOFDataHullLocatorSet.js';

let _initClass, _init_locatorSets, _init_extra_locatorSets, _init_name, _init_extra_name;

/** EveSOFDataHullLocatorSetGroup (eve) - generated from schema shapeHash 0b9a4431.... */
let _EveSOFDataHullLocato;
class EveSOFDataHullLocatorSetGroup extends _IEveSOFDataHullLocat {
  static {
    ({
      e: [_init_locatorSets, _init_extra_locatorSets, _init_name, _init_extra_name],
      c: [_EveSOFDataHullLocato, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullLocatorSetGroup",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("IEveSOFDataHullLocatorSet")], 16, "locatorSets"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, _IEveSOFDataHullLocat));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_locatorSets (PIEveSOFDataHullLocatorSetVector) [READ, PERSIST] */
  locatorSets = _init_locatorSets(this, []);

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_locatorSets(this), _init_name(this, ""));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullLocato as EveSOFDataHullLocatorSetGroup };
//# sourceMappingURL=EveSOFDataHullLocatorSetGroup.js.map
