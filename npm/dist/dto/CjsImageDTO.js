import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsObjectDTO as _CjsObjectDTO } from './CjsObjectDTO.js';

let _initClass, _init_width, _init_extra_width, _init_height, _init_extra_height, _init_channels, _init_extra_channels, _init_pixelFormat, _init_extra_pixelFormat, _init_colorSpace, _init_extra_colorSpace, _init_origin, _init_extra_origin, _init_alphaMode, _init_extra_alphaMode, _init_strideBytes, _init_extra_strideBytes, _init_data, _init_extra_data, _init_imageBytes, _init_extra_imageBytes, _init_pixels, _init_extra_pixels, _init_strideInfo, _init_extra_strideInfo;

/**
 * Image-oriented DTO for decoded pixel data.
 *
 * Runtime-resource can hydrate this class from raw image parser output, while
 * more texture-specific fields can be added by subclasses.
 */
let _CjsImageDTO;
new class extends _identity {
  static [class CjsImageDTO extends _CjsObjectDTO {
    static {
      ({
        e: [_init_width, _init_extra_width, _init_height, _init_extra_height, _init_channels, _init_extra_channels, _init_pixelFormat, _init_extra_pixelFormat, _init_colorSpace, _init_extra_colorSpace, _init_origin, _init_extra_origin, _init_alphaMode, _init_extra_alphaMode, _init_strideBytes, _init_extra_strideBytes, _init_data, _init_extra_data, _init_imageBytes, _init_extra_imageBytes, _init_pixels, _init_extra_pixels, _init_strideInfo, _init_extra_strideInfo],
        c: [_CjsImageDTO, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "CjsImageDTO",
        family: "resource"
      })], [[[io, io.persist, type, type.uint32], 16, "width"], [[io, io.persist, type, type.uint32], 16, "height"], [[io, io.persist, type, type.uint32], 16, "channels"], [[io, io.persist, type, type.string], 16, "pixelFormat"], [[io, io.persist, type, type.string], 16, "colorSpace"], [[io, io.persist, type, type.string], 16, "origin"], [[io, io.persist, type, type.string], 16, "alphaMode"], [[io, io.persist, type, type.uint32], 16, "strideBytes"], [[io, io.persist, type, type.unknown], 16, "data"], [[io, io.persist, type, type.unknown], 16, "imageBytes"], [[io, io.persist, type, type.unknown], 16, "pixels"], [[io, io.persist, type, type.unknown], 16, "strideInfo"]], 0, void 0, _CjsObjectDTO));
    }
    width = _init_width(this, 0);
    height = (_init_extra_width(this), _init_height(this, 0));
    channels = (_init_extra_height(this), _init_channels(this, 0));
    pixelFormat = (_init_extra_channels(this), _init_pixelFormat(this, ""));
    colorSpace = (_init_extra_pixelFormat(this), _init_colorSpace(this, ""));
    origin = (_init_extra_colorSpace(this), _init_origin(this, ""));
    alphaMode = (_init_extra_origin(this), _init_alphaMode(this, ""));
    strideBytes = (_init_extra_alphaMode(this), _init_strideBytes(this, 0));
    data = (_init_extra_strideBytes(this), _init_data(this, null));

    /** Compatibility field; use data for canonical decoded bytes. */
    imageBytes = (_init_extra_data(this), _init_imageBytes(this, null));

    /** Compatibility field; canonical RGBA payloads use data: Uint8Array. */
    pixels = (_init_extra_imageBytes(this), _init_pixels(this, null));
    strideInfo = (_init_extra_pixels(this), _init_strideInfo(this, null));
    constructor(values = null) {
      super(), _init_extra_strideInfo(this);
      this.SetValues(values || {}, {
        markDirty: false,
        skipUpdate: true,
        skipEvents: true
      });
    }
  }];
  payload = "image";
  constructor() {
    super(_CjsImageDTO), _initClass();
  }
}();

export { _CjsImageDTO as CjsImageDTO };
//# sourceMappingURL=CjsImageDTO.js.map
