import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_channel, _init_extra_channel, _init_fill, _init_extra_fill, _init_path, _init_extra_path;

/** Tr2TexturePackChannel (resources) - maintained from schema shapeHash 3ea887a3.... */
let _Tr2TexturePackChanne;
class Tr2TexturePackChannel extends CjsModel {
  static {
    ({
      e: [_init_channel, _init_extra_channel, _init_fill, _init_extra_fill, _init_path, _init_extra_path],
      c: [_Tr2TexturePackChanne, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TexturePackChannel",
      family: "resources"
    })], [[[io, io.persist, type, type.uint8], 16, "channel"], [[io, io.persist, type, type.uint8], 16, "fill"], [[io, io.persist, type, type.string], 16, "path"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_path(this);
  }
  /** m_channel (uint8_t) [READWRITE, PERSIST, ENUM] */
  channel = _init_channel(this, 0);

  /** m_fill (uint8_t) [READWRITE, PERSIST] */
  fill = (_init_extra_channel(this), _init_fill(this, 0));

  /** m_path (std::wstring) [READWRITE, PERSIST] */
  path = (_init_extra_fill(this), _init_path(this, ""));
  static {
    _initClass();
  }
}

export { _Tr2TexturePackChanne as Tr2TexturePackChannel };
//# sourceMappingURL=Tr2TexturePackChannel.js.map
