import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_texture, _init_extra_texture, _init_channel, _init_extra_channel;

/** Reference to one logical channel of a resolved character texture. */
let _CjsCharacterTextureC;
class CjsCharacterTextureChannel extends CjsModel {
  static {
    ({
      e: [_init_texture, _init_extra_texture, _init_channel, _init_extra_channel],
      c: [_CjsCharacterTextureC, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterTextureChannel",
      family: "character"
    })], [[[io, io.readwrite, void 0, type.model("CjsCharacterTextureAsset")], 16, "texture"], [[io, io.readwrite, type, type.string], 16, "channel"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_channel(this);
  }
  texture = _init_texture(this, null);
  channel = (_init_extra_texture(this), _init_channel(this, "a"));
  static {
    _initClass();
  }
}

export { _CjsCharacterTextureC as CjsCharacterTextureChannel };
//# sourceMappingURL=CjsCharacterTextureChannel.js.map
