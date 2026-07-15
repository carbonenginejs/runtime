import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsImageDTO as _CjsImageDTO } from './CjsImageDTO.js';

let _initClass, _init_dimension, _init_extra_dimension, _init_arraySize, _init_extra_arraySize, _init_subresources, _init_extra_subresources, _init_variants, _init_extra_variants, _init_faces, _init_extra_faces, _init_mipCount, _init_extra_mipCount, _init_isCompressed, _init_extra_isCompressed, _init_hasMipMaps, _init_extra_hasMipMaps;

/**
 * Texture DTO for image families that may later be consumed by engine-gpu.
 *
 * Formats may provide both compressed (`variants`) and decoded (`imageBytes`)
 * representations; engine-gpu chooses what to do with them.
 */
let _CjsTextureDTO;
new class extends _identity {
  static [class CjsTextureDTO extends _CjsImageDTO {
    static {
      ({
        e: [_init_dimension, _init_extra_dimension, _init_arraySize, _init_extra_arraySize, _init_subresources, _init_extra_subresources, _init_variants, _init_extra_variants, _init_faces, _init_extra_faces, _init_mipCount, _init_extra_mipCount, _init_isCompressed, _init_extra_isCompressed, _init_hasMipMaps, _init_extra_hasMipMaps],
        c: [_CjsTextureDTO, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "CjsTextureDTO",
        family: "resource"
      })], [[[io, io.persist, type, type.string], 16, "dimension"], [[io, io.persist, type, type.uint32], 16, "arraySize"], [[io, io.persist, void 0, type.list("unknown")], 16, "subresources"], [[io, io.persist, void 0, type.list("unknown")], 16, "variants"], [[io, io.persist, void 0, type.list("unknown")], 16, "faces"], [[io, io.persist, type, type.uint32], 16, "mipCount"], [[io, io.persist, type, type.boolean], 16, "isCompressed"], [[io, io.persist, type, type.boolean], 16, "hasMipMaps"]], 0, void 0, _CjsImageDTO));
    }
    dimension = _init_dimension(this, "");
    arraySize = (_init_extra_dimension(this), _init_arraySize(this, 0));
    subresources = (_init_extra_arraySize(this), _init_subresources(this, []));
    variants = (_init_extra_subresources(this), _init_variants(this, []));
    faces = (_init_extra_variants(this), _init_faces(this, []));
    mipCount = (_init_extra_faces(this), _init_mipCount(this, 0));
    isCompressed = (_init_extra_mipCount(this), _init_isCompressed(this, false));
    hasMipMaps = (_init_extra_isCompressed(this), _init_hasMipMaps(this, false));
    constructor(values = null) {
      super(), _init_extra_hasMipMaps(this);
      this.SetValues(values || {}, {
        markDirty: false,
        skipUpdate: true,
        skipEvents: true
      });
    }
  }];
  payload = "texture";
  constructor() {
    super(_CjsTextureDTO), _initClass();
  }
}();

export { _CjsTextureDTO as CjsTextureDTO };
//# sourceMappingURL=CjsTextureDTO.js.map
