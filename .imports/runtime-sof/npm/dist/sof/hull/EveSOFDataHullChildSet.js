import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_visibilityGroup, _init_extra_visibilityGroup, _init_items, _init_extra_items;

/** EveSOFDataHullChildSet (eve) - generated from schema shapeHash 7e44fd77.... */
let _EveSOFDataHullChildS;
class EveSOFDataHullChildSet extends CjsModel {
  static {
    ({
      e: [_init_visibilityGroup, _init_extra_visibilityGroup, _init_items, _init_extra_items],
      c: [_EveSOFDataHullChildS, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullChildSet",
      family: "eve"
    })], [[[io, io.persist, type, type.string], 16, "visibilityGroup"], [[io, io.persist, void 0, type.list("EveSOFDataHullChildSetItem")], 16, "items"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_items(this);
  }
  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  visibilityGroup = _init_visibilityGroup(this, "primary");

  /** m_items (PEveSOFDataHullChildSetItemVector) [READ, PERSIST] */
  items = (_init_extra_visibilityGroup(this), _init_items(this, []));
  GetName() {
    return this.visibilityGroup;
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataHullChildS as EveSOFDataHullChildSet };
//# sourceMappingURL=EveSOFDataHullChildSet.js.map
