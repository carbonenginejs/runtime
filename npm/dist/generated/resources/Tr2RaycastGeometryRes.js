import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_lodIndices, _init_extra_lodIndices, _init_bvh, _init_extra_bvh;

/** Tr2RaycastGeometryRes (resources) - generated from schema shapeHash f30f73e8.... */
let _Tr2RaycastGeometryRe;
class Tr2RaycastGeometryRes extends CjsModel {
  static {
    ({
      e: [_init_lodIndices, _init_extra_lodIndices, _init_bvh, _init_extra_bvh],
      c: [_Tr2RaycastGeometryRe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2RaycastGeometryRes",
      family: "resources"
    })], [[type.list("int32_t"), 0, "lodIndices"], [type.rawStruct("BVH::BoundingVolumeHierarchy"), 0, "bvh"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_bvh(this);
  }
  /** m_lodIndices (std::vector<int32_t>) */
  lodIndices = _init_lodIndices(this, []);

  /** m_bvh (BVH::BoundingVolumeHierarchy) */
  bvh = (_init_extra_lodIndices(this), _init_bvh(this, null));
  static {
    _initClass();
  }
}

export { _Tr2RaycastGeometryRe as Tr2RaycastGeometryRes };
//# sourceMappingURL=Tr2RaycastGeometryRes.js.map
