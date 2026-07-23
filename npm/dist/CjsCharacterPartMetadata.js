import { applyDecs2311 as _applyDecs2311 } from './_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from './CjsCharacterNode.js';

let _initClass, _init_id, _init_extra_id, _init_alternativeTextureSourcePath, _init_extra_alternativeTextureSourcePath, _init_forcesLooseTop, _init_extra_forcesLooseTop, _init_hidesBootShin, _init_extra_hidesBootShin, _init_lod1Replacement, _init_extra_lod1Replacement, _init_lod2Replacement, _init_extra_lod2Replacement, _init_numColorAreas, _init_extra_numColorAreas, _init_dependentModifiers, _init_extra_dependentModifiers, _init_occludesModifiers, _init_extra_occludesModifiers, _init_soundTag, _init_extra_soundTag, _init_swapTops, _init_extra_swapTops, _init_swapBottom, _init_extra_swapBottom, _init_swapSocks, _init_extra_swapSocks, _init_wap, _init_extra_wap;
let _CjsCharacterPartMeta;
class CjsCharacterPartMetadata extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_alternativeTextureSourcePath, _init_extra_alternativeTextureSourcePath, _init_forcesLooseTop, _init_extra_forcesLooseTop, _init_hidesBootShin, _init_extra_hidesBootShin, _init_lod1Replacement, _init_extra_lod1Replacement, _init_lod2Replacement, _init_extra_lod2Replacement, _init_numColorAreas, _init_extra_numColorAreas, _init_dependentModifiers, _init_extra_dependentModifiers, _init_occludesModifiers, _init_extra_occludesModifiers, _init_soundTag, _init_extra_soundTag, _init_swapTops, _init_extra_swapTops, _init_swapBottom, _init_extra_swapBottom, _init_swapSocks, _init_extra_swapSocks, _init_wap, _init_extra_wap],
      c: [_CjsCharacterPartMeta, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterPartMetadata",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.path, io, io.persist], 16, "alternativeTextureSourcePath"], [[type, type.boolean, io, io.persist], 16, "forcesLooseTop"], [[type, type.boolean, io, io.persist], 16, "hidesBootShin"], [[type, type.path, io, io.persist], 16, "lod1Replacement"], [[type, type.path, io, io.persist], 16, "lod2Replacement"], [[type, type.uint32, io, io.persist], 16, "numColorAreas"], [[void 0, type.list("string"), io, io.persist], 16, "dependentModifiers"], [[void 0, type.list("string"), io, io.persist], 16, "occludesModifiers"], [[type, type.uint32, io, io.persist], 16, "soundTag"], [[type, type.boolean, io, io.persist], 16, "swapTops"], [[type, type.boolean, io, io.persist], 16, "swapBottom"], [[type, type.boolean, io, io.persist], 16, "swapSocks"], [[type, type.boolean, io, io.persist], 16, "wap"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_wap(this);
  }
  id = _init_id(this, "");
  alternativeTextureSourcePath = (_init_extra_id(this), _init_alternativeTextureSourcePath(this, null));
  forcesLooseTop = (_init_extra_alternativeTextureSourcePath(this), _init_forcesLooseTop(this, null));
  hidesBootShin = (_init_extra_forcesLooseTop(this), _init_hidesBootShin(this, null));
  lod1Replacement = (_init_extra_hidesBootShin(this), _init_lod1Replacement(this, null));
  lod2Replacement = (_init_extra_lod1Replacement(this), _init_lod2Replacement(this, null));
  numColorAreas = (_init_extra_lod2Replacement(this), _init_numColorAreas(this, null));
  dependentModifiers = (_init_extra_numColorAreas(this), _init_dependentModifiers(this, []));
  occludesModifiers = (_init_extra_dependentModifiers(this), _init_occludesModifiers(this, []));
  soundTag = (_init_extra_occludesModifiers(this), _init_soundTag(this, null));
  swapTops = (_init_extra_soundTag(this), _init_swapTops(this, null));
  swapBottom = (_init_extra_swapTops(this), _init_swapBottom(this, null));
  swapSocks = (_init_extra_swapBottom(this), _init_swapSocks(this, null));
  wap = (_init_extra_swapSocks(this), _init_wap(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterPartMeta as CjsCharacterPartMetadata };
//# sourceMappingURL=CjsCharacterPartMetadata.js.map
