import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_visibilityGroup, _init_extra_visibilityGroup, _init_banners, _init_extra_banners;

/** EveSOFDataHullBannerSet (eve) - generated from schema shapeHash a31a1da4.... */
let _EveSOFDataHullBanner;
class EveSOFDataHullBannerSet extends CjsModel {
  static {
    ({
      e: [_init_visibilityGroup, _init_extra_visibilityGroup, _init_banners, _init_extra_banners],
      c: [_EveSOFDataHullBanner, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullBannerSet",
      family: "eve"
    })], [[[io, io.persist, type, type.string], 16, "visibilityGroup"], [[io, io.persist, void 0, type.list("EveSOFDataHullBannerSetItem")], 16, "banners"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_banners(this);
  }
  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  visibilityGroup = _init_visibilityGroup(this, "primary");

  /** m_banners (PEveSOFDataHullBannerSetItemVector) [READ, PERSIST] */
  banners = (_init_extra_visibilityGroup(this), _init_banners(this, []));
  GetName() {
    return this.visibilityGroup;
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataHullBanner as EveSOFDataHullBannerSet };
//# sourceMappingURL=EveSOFDataHullBannerSet.js.map
