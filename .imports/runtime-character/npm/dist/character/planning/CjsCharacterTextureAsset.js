import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_uri, _init_extra_uri, _init_role, _init_extra_role, _init_region, _init_extra_region, _init_quality, _init_extra_quality, _init_imageSize, _init_extra_imageSize, _init_atlasSize, _init_extra_atlasSize, _init_atlasRect, _init_extra_atlasRect, _init_origin, _init_extra_origin;

/** Resolved texture asset with independent decoded placement and semantic role. */
let _CjsCharacterTextureA;
class CjsCharacterTextureAsset extends CjsModel {
  static {
    ({
      e: [_init_uri, _init_extra_uri, _init_role, _init_extra_role, _init_region, _init_extra_region, _init_quality, _init_extra_quality, _init_imageSize, _init_extra_imageSize, _init_atlasSize, _init_extra_atlasSize, _init_atlasRect, _init_extra_atlasRect, _init_origin, _init_extra_origin],
      c: [_CjsCharacterTextureA, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterTextureAsset",
      family: "character"
    })], [[[io, io.readwrite, type, type.path], 16, "uri"], [[io, io.readwrite, type, type.string], 16, "role"], [[io, io.readwrite, type, type.string], 16, "region"], [[io, io.readwrite, type, type.string], 16, "quality"], [[io, io.readwrite, type, type.vec2], 16, "imageSize"], [[io, io.readwrite, type, type.vec2], 16, "atlasSize"], [[io, io.readwrite, type, type.vec4], 16, "atlasRect"], [[io, io.readwrite, void 0, type.model("CjsCharacterOrigin")], 16, "origin"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_origin(this);
  }
  uri = _init_uri(this, "");
  role = (_init_extra_uri(this), _init_role(this, ""));
  region = (_init_extra_role(this), _init_region(this, ""));
  quality = (_init_extra_region(this), _init_quality(this, null));
  imageSize = (_init_extra_quality(this), _init_imageSize(this, null));
  atlasSize = (_init_extra_imageSize(this), _init_atlasSize(this, null));
  atlasRect = (_init_extra_atlasSize(this), _init_atlasRect(this, null));
  origin = (_init_extra_atlasRect(this), _init_origin(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterTextureA as CjsCharacterTextureAsset };
//# sourceMappingURL=CjsCharacterTextureAsset.js.map
