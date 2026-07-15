import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_vertexBufferStride, _init_extra_vertexBufferStride, _init_positionOffset, _init_extra_positionOffset, _init_positionType, _init_extra_positionType, _init_tangentOffset, _init_extra_tangentOffset, _init_tangentType, _init_extra_tangentType, _init_vertexCount, _init_extra_vertexCount;

/** TriMorphTargetGeometryConstants (resources) - generated from schema shapeHash d650628c.... */
let _TriMorphTargetGeomet;
class TriMorphTargetGeometryConstants extends CjsModel {
  static {
    ({
      e: [_init_vertexBufferStride, _init_extra_vertexBufferStride, _init_positionOffset, _init_extra_positionOffset, _init_positionType, _init_extra_positionType, _init_tangentOffset, _init_extra_tangentOffset, _init_tangentType, _init_extra_tangentType, _init_vertexCount, _init_extra_vertexCount],
      c: [_TriMorphTargetGeomet, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriMorphTargetGeometryConstants",
      family: "resources"
    })], [[[type, type.uint32], 16, "vertexBufferStride"], [[type, type.uint32], 16, "positionOffset"], [[type, type.uint32], 16, "positionType"], [[type, type.uint32], 16, "tangentOffset"], [[type, type.uint32], 16, "tangentType"], [[type, type.uint32], 16, "vertexCount"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_vertexCount(this);
  }
  /** vertexBufferStride (uint32_t) */
  vertexBufferStride = _init_vertexBufferStride(this, 0);

  /** positionOffset (uint32_t) */
  positionOffset = (_init_extra_vertexBufferStride(this), _init_positionOffset(this, 0));

  /** positionType (uint32_t) */
  positionType = (_init_extra_positionOffset(this), _init_positionType(this, 0));

  /** tangentOffset (uint32_t) */
  tangentOffset = (_init_extra_positionType(this), _init_tangentOffset(this, 0));

  /** tangentType (uint32_t) */
  tangentType = (_init_extra_tangentOffset(this), _init_tangentType(this, 0));

  /** vertexCount (uint32_t) */
  vertexCount = (_init_extra_tangentType(this), _init_vertexCount(this, 0));
  static {
    _initClass();
  }
}

export { _TriMorphTargetGeomet as TriMorphTargetGeometryConstants };
//# sourceMappingURL=TriMorphTargetGeometryConstants.js.map
