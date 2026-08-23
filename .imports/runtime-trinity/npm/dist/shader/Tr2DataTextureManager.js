import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_textureWidth, _init_extra_textureWidth, _init_textureHeight, _init_extra_textureHeight, _init_blockDataNextIdx, _init_extra_blockDataNextIdx, _init_maxBlockCount, _init_extra_maxBlockCount, _init_maxPixelCount, _init_extra_maxPixelCount, _init_name, _init_extra_name;

/** Packs shader-readable data blocks into a shared texture, whose allocation an engine adapter owns. */
let _Tr2DataTextureManage;
class Tr2DataTextureManager extends CjsModel {
  static {
    ({
      e: [_init_textureWidth, _init_extra_textureWidth, _init_textureHeight, _init_extra_textureHeight, _init_blockDataNextIdx, _init_extra_blockDataNextIdx, _init_maxBlockCount, _init_extra_maxBlockCount, _init_maxPixelCount, _init_extra_maxPixelCount, _init_name, _init_extra_name],
      c: [_Tr2DataTextureManage, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2DataTextureManager",
      family: "shader"
    })], [[[io, io.read, type, type.uint32], 16, "textureWidth"], [[io, io.read, type, type.uint32], 16, "textureHeight"], [[io, io.read, type, type.int32], 16, "blockDataNextIdx"], [[io, io.read, type, type.uint32], 16, "maxBlockCount"], [[io, io.read, type, type.uint32], 16, "maxPixelCount"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_textureWidth (uint32_t) [READ] */
  textureWidth = _init_textureWidth(this, 256);

  /** m_textureHeight (uint32_t) [READ] */
  textureHeight = (_init_extra_textureWidth(this), _init_textureHeight(this, 4));

  /** m_blockDataNextIdx (int32_t) [READ] */
  blockDataNextIdx = (_init_extra_textureHeight(this), _init_blockDataNextIdx(this, 1));

  /** m_maxBlockCount (uint32_t) [READ] */
  maxBlockCount = (_init_extra_blockDataNextIdx(this), _init_maxBlockCount(this, 0));

  /** m_maxPixelCount (uint32_t) [READ] */
  maxPixelCount = (_init_extra_maxBlockCount(this), _init_maxPixelCount(this, 0));

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_maxPixelCount(this), _init_name(this, ""));
  static {
    _initClass();
  }
}

export { _Tr2DataTextureManage as Tr2DataTextureManager };
//# sourceMappingURL=Tr2DataTextureManager.js.map
