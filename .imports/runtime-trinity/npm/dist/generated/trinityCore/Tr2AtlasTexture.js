import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_atlasHeight, _init_extra_atlasHeight, _init_height, _init_extra_height, _init_name, _init_extra_name, _init_resPath, _init_extra_resPath, _init_atlas, _init_extra_atlas, _init_atlasWidth, _init_extra_atlasWidth, _init_width, _init_extra_width, _init_x, _init_extra_x, _init_y, _init_extra_y;

/** Tr2AtlasTexture (trinityCore) - generated from schema shapeHash 483a9389.... */
let _Tr2AtlasTexture;
class Tr2AtlasTexture extends CjsModel {
  static {
    ({
      e: [_init_atlasHeight, _init_extra_atlasHeight, _init_height, _init_extra_height, _init_name, _init_extra_name, _init_resPath, _init_extra_resPath, _init_atlas, _init_extra_atlas, _init_atlasWidth, _init_extra_atlasWidth, _init_width, _init_extra_width, _init_x, _init_extra_x, _init_y, _init_extra_y, _initProto],
      c: [_Tr2AtlasTexture, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2AtlasTexture",
      family: "trinityCore"
    })], [[[io, io.read, type, type.uint32], 16, "atlasHeight"], [[io, io.read, type, type.uint32], 16, "height"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.string], 16, "resPath"], [[io, io.read, void 0, type.objectRef("Tr2TextureAtlas")], 16, "atlas"], [[io, io.read, type, type.uint32], 16, "atlasWidth"], [[io, io.read, type, type.uint32], 16, "width"], [[io, io.read, type, type.uint32], 16, "x"], [[io, io.read, type, type.uint32], 16, "y"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "LockBufferAndMargin"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "LockBuffer"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "UnlockBuffer"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_y(this);
  }
  /** m_textureHeight (unsigned int) [READ] */
  atlasHeight = (_initProto(this), _init_atlasHeight(this, 0));

  /** m_height (unsigned int) [READ] */
  height = (_init_extra_atlasHeight(this), _init_height(this, 0));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_height(this), _init_name(this, ""));

  /** m_resPath (std::string) [READ] */
  resPath = (_init_extra_name(this), _init_resPath(this, ""));

  /** m_textureAtlas (Tr2TextureAtlasPtr) [READ] */
  atlas = (_init_extra_resPath(this), _init_atlas(this, null));

  /** m_textureWidth (unsigned int) [READ] */
  atlasWidth = (_init_extra_atlas(this), _init_atlasWidth(this, 0));

  /** m_width (unsigned int) [READ] */
  width = (_init_extra_atlasWidth(this), _init_width(this, 0));

  /** m_x (unsigned int) [READ] */
  x = (_init_extra_width(this), _init_x(this, 0));

  /** m_y (unsigned int) [READ] */
  y = (_init_extra_x(this), _init_y(this, 0));

  /** Carbon method LockBufferAndMargin -> PyLockBufferAndMargin (MAP_METHOD). */
  LockBufferAndMargin(...args) {
    throw new Error("Tr2AtlasTexture.LockBufferAndMargin is not implemented in CarbonEngineJS.");
  }

  /** Carbon method LockBuffer -> PyLockBuffer (MAP_METHOD). */
  LockBuffer(...args) {
    throw new Error("Tr2AtlasTexture.LockBuffer is not implemented in CarbonEngineJS.");
  }

  /** Carbon method UnlockBuffer (MAP_METHOD_AND_WRAP). */
  UnlockBuffer(...args) {
    throw new Error("Tr2AtlasTexture.UnlockBuffer is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2AtlasTexture as Tr2AtlasTexture };
//# sourceMappingURL=Tr2AtlasTexture.js.map
