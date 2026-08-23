import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_name, _init_extra_name, _init_skinned, _init_extra_skinned, _init_zOffset, _init_extra_zOffset, _init_coneTextureResPath, _init_extra_coneTextureResPath, _init_glowTextureResPath, _init_extra_glowTextureResPath, _init_visibilityGroup, _init_extra_visibilityGroup, _init_items, _init_extra_items;

/** EveSOFDataHullSpotlightSet (eve) - generated from schema shapeHash ab0a5bcb.... */
let _EveSOFDataHullSpotli;
class EveSOFDataHullSpotlightSet extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_skinned, _init_extra_skinned, _init_zOffset, _init_extra_zOffset, _init_coneTextureResPath, _init_extra_coneTextureResPath, _init_glowTextureResPath, _init_extra_glowTextureResPath, _init_visibilityGroup, _init_extra_visibilityGroup, _init_items, _init_extra_items],
      c: [_EveSOFDataHullSpotli, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullSpotlightSet",
      family: "eve"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "skinned"], [[io, io.persist, type, type.float32], 16, "zOffset"], [[io, io.persist, type, type.string], 16, "coneTextureResPath"], [[io, io.persist, type, type.string], 16, "glowTextureResPath"], [[io, io.persist, type, type.string], 16, "visibilityGroup"], [[io, io.persist, void 0, type.list("EveSOFDataHullSpotlightSetItem")], 16, "items"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_items(this);
  }
  /** m_name (std::string) [READWRITE, PERSIST] */
  name = _init_name(this, "");

  /** m_skinned (bool) [READWRITE, PERSIST] */
  skinned = (_init_extra_name(this), _init_skinned(this, false));

  /** m_zOffset (float) [READWRITE, PERSIST] */
  zOffset = (_init_extra_skinned(this), _init_zOffset(this, 0));

  /** m_coneTextureResPath (std::string) [READWRITE, PERSIST] */
  coneTextureResPath = (_init_extra_zOffset(this), _init_coneTextureResPath(this, ""));

  /** m_glowTextureResPath (std::string) [READWRITE, PERSIST] */
  glowTextureResPath = (_init_extra_coneTextureResPath(this), _init_glowTextureResPath(this, ""));

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  visibilityGroup = (_init_extra_glowTextureResPath(this), _init_visibilityGroup(this, "primary"));

  /** m_items (PEveSOFDataHullSpotlightSetItemVector) [READ, PERSIST] */
  items = (_init_extra_visibilityGroup(this), _init_items(this, []));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullSpotli as EveSOFDataHullSpotlightSet };
//# sourceMappingURL=EveSOFDataHullSpotlightSet.js.map
