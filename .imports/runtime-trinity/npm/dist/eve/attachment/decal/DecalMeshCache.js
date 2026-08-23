import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_buffers, _init_extra_buffers;

/**
 * DecalMeshCache.MeshBuffers - one LOD's clipped decal buffers. The generator
 * had flattened these two members onto DecalMeshCache itself; corrected at
 * promotion to Carbon's nested struct shape.
 */
class DecalMeshCacheMeshBuffers {
  /** vertexBuffer (std::unique_ptr<uint8_t[]>) */
  vertexBuffer = null;

  /** indexBuffer (std::unique_ptr<uint8_t[]>) */
  indexBuffer = null;
}

/** DecalMeshCache (eve/attachment/decal) - generated from schema shapeHash 1a839484.... */
let _DecalMeshCache;
new class extends _identity {
  static [class DecalMeshCache extends CjsModel {
    static {
      ({
        e: [_init_buffers, _init_extra_buffers],
        c: [_DecalMeshCache, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "DecalMeshCache",
        family: "eve/attachment/decal"
      })], [[type.list("MeshBuffers"), 0, "buffers"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_buffers(this);
    }
    /** buffers (std::vector<MeshBuffers>) */
    buffers = _init_buffers(this, []);
  }];
  MeshBuffers = DecalMeshCacheMeshBuffers;
  constructor() {
    super(_DecalMeshCache), _initClass();
  }
}();

export { _DecalMeshCache as DecalMeshCache, DecalMeshCacheMeshBuffers };
//# sourceMappingURL=DecalMeshCache.js.map
