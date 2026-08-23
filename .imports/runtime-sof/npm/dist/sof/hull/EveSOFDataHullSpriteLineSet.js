import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_name, _init_extra_name, _init_skinned, _init_extra_skinned, _init_visibilityGroup, _init_extra_visibilityGroup, _init_items, _init_extra_items;

/** EveSOFDataHullSpriteLineSet (eve) - generated from schema shapeHash b00a68a1.... */
let _EveSOFDataHullSprite;
class EveSOFDataHullSpriteLineSet extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_skinned, _init_extra_skinned, _init_visibilityGroup, _init_extra_visibilityGroup, _init_items, _init_extra_items],
      c: [_EveSOFDataHullSprite, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullSpriteLineSet",
      family: "eve"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "skinned"], [[io, io.persist, type, type.string], 16, "visibilityGroup"], [[io, io.persist, void 0, type.list("EveSOFDataHullSpriteLineSetItem")], 16, "items"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_items(this);
  }
  /** m_name (std::string) [READWRITE, PERSIST] */
  name = _init_name(this, "");

  /** m_skinned (bool) [READWRITE, PERSIST] */
  skinned = (_init_extra_name(this), _init_skinned(this, false));

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  visibilityGroup = (_init_extra_skinned(this), _init_visibilityGroup(this, "primary"));

  /** m_items (PEveSOFDataHullSpriteLineSetItemVector) [READ, PERSIST] */
  items = (_init_extra_visibilityGroup(this), _init_items(this, []));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullSprite as EveSOFDataHullSpriteLineSet };
//# sourceMappingURL=EveSOFDataHullSpriteLineSet.js.map
