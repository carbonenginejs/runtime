import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_name, _init_extra_name, _init_visibilityGroup, _init_extra_visibilityGroup, _init_items, _init_extra_items;

/** EveSOFDataHullDecalSet (eve) - generated from schema shapeHash 6c3dc4d1.... */
let _EveSOFDataHullDecalS;
class EveSOFDataHullDecalSet extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_visibilityGroup, _init_extra_visibilityGroup, _init_items, _init_extra_items],
      c: [_EveSOFDataHullDecalS, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullDecalSet",
      family: "eve"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.string], 16, "visibilityGroup"], [[io, io.persist, void 0, type.list("EveSOFDataHullDecalSetItem")], 16, "items"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_items(this);
  }
  /** m_name (std::string) [READWRITE, PERSIST] */
  name = _init_name(this, "");

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  visibilityGroup = (_init_extra_name(this), _init_visibilityGroup(this, "primary"));

  /** m_items (PEveSOFDataHullDecalSetItemVector) [READ, PERSIST] */
  items = (_init_extra_visibilityGroup(this), _init_items(this, []));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullDecalS as EveSOFDataHullDecalSet };
//# sourceMappingURL=EveSOFDataHullDecalSet.js.map
