import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_items, _init_extra_items, _init_alwaysOn, _init_extra_alwaysOn, _init_hasTrails, _init_extra_hasTrails;

/** EveSOFDataHullBooster (eve) - generated from schema shapeHash 8aafe11c.... */
let _EveSOFDataHullBooste;
class EveSOFDataHullBooster extends CjsModel {
  static {
    ({
      e: [_init_items, _init_extra_items, _init_alwaysOn, _init_extra_alwaysOn, _init_hasTrails, _init_extra_hasTrails],
      c: [_EveSOFDataHullBooste, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullBooster",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("EveSOFDataHullBoosterItem")], 16, "items"], [[io, io.persist, type, type.boolean], 16, "alwaysOn"], [[io, io.persist, type, type.boolean], 16, "hasTrails"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_hasTrails(this);
  }
  /** m_items (PEveSOFDataHullBoosterItemVector) [READ, PERSIST] */
  items = _init_items(this, []);

  /** m_alwaysOn (bool) [READWRITE, PERSIST] */
  alwaysOn = (_init_extra_items(this), _init_alwaysOn(this, false));

  /** m_hasTrails (bool) [READWRITE, PERSIST] */
  hasTrails = (_init_extra_alwaysOn(this), _init_hasTrails(this, true));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullBooste as EveSOFDataHullBooster };
//# sourceMappingURL=EveSOFDataHullBooster.js.map
