import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_skinnedVertices, _init_extra_skinnedVertices, _init_geometry, _init_extra_geometry, _init_meshIndex, _init_extra_meshIndex, _init_transforms, _init_extra_transforms, _init_boneOffset, _init_extra_boneOffset, _init_skinnedVertexOffset, _init_extra_skinnedVertexOffset, _init_morphAnimationDatas, _init_extra_morphAnimationDatas, _init_morphAnimationDataOffset, _init_extra_morphAnimationDataOffset, _init_morphAnimationDataCount, _init_extra_morphAnimationDataCount, _init_isDirty, _init_extra_isDirty, _init_screenSize, _init_extra_screenSize, _init_lodIndex, _init_extra_lodIndex;

/** Tr2RaytracingMesh (raytracing) - generated from schema shapeHash cfaecf2a.... */
let _Tr2RaytracingMesh;
class Tr2RaytracingMesh extends CjsModel {
  static {
    ({
      e: [_init_skinnedVertices, _init_extra_skinnedVertices, _init_geometry, _init_extra_geometry, _init_meshIndex, _init_extra_meshIndex, _init_transforms, _init_extra_transforms, _init_boneOffset, _init_extra_boneOffset, _init_skinnedVertexOffset, _init_extra_skinnedVertexOffset, _init_morphAnimationDatas, _init_extra_morphAnimationDatas, _init_morphAnimationDataOffset, _init_extra_morphAnimationDataOffset, _init_morphAnimationDataCount, _init_extra_morphAnimationDataCount, _init_isDirty, _init_extra_isDirty, _init_screenSize, _init_extra_screenSize, _init_lodIndex, _init_extra_lodIndex],
      c: [_Tr2RaytracingMesh, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2RaytracingMesh",
      family: "raytracing"
    })], [[type.objectRef("Tr2BufferAL"), 0, "skinnedVertices"], [type.objectRef("TriGeometryRes"), 0, "geometry"], [[type, type.uint32], 16, "meshIndex"], [type.list("float"), 0, "transforms"], [[type, type.uint32], 16, "boneOffset"], [[type, type.uint32], 16, "skinnedVertexOffset"], [type.list("uint8_t"), 0, "morphAnimationDatas"], [[type, type.uint32], 16, "morphAnimationDataOffset"], [[type, type.uint32], 16, "morphAnimationDataCount"], [[type, type.boolean], 16, "isDirty"], [[type, type.float32], 16, "screenSize"], [[type, type.int32], 16, "lodIndex"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_lodIndex(this);
  }
  /** m_skinnedVertices (const Tr2BufferAL*) */
  skinnedVertices = _init_skinnedVertices(this, null);

  /** m_geometry (TriGeometryResPtr) */
  geometry = (_init_extra_skinnedVertices(this), _init_geometry(this, null));

  /** m_meshIndex (uint32_t) */
  meshIndex = (_init_extra_geometry(this), _init_meshIndex(this, 0));

  /** m_transforms (std::vector<float>) */
  transforms = (_init_extra_meshIndex(this), _init_transforms(this, []));

  /** m_boneOffset (uint32_t) */
  boneOffset = (_init_extra_transforms(this), _init_boneOffset(this, 0));

  /** m_skinnedVertexOffset (uint32_t) */
  skinnedVertexOffset = (_init_extra_boneOffset(this), _init_skinnedVertexOffset(this, 0));

  /** m_morphAnimationDatas (std::vector<uint8_t>) */
  morphAnimationDatas = (_init_extra_skinnedVertexOffset(this), _init_morphAnimationDatas(this, []));

  /** m_morphAnimationDataOffset (uint32_t) */
  morphAnimationDataOffset = (_init_extra_morphAnimationDatas(this), _init_morphAnimationDataOffset(this, 0));

  /** m_morphAnimationDataCount (uint32_t) */
  morphAnimationDataCount = (_init_extra_morphAnimationDataOffset(this), _init_morphAnimationDataCount(this, 0));

  /** m_isDirty (bool) */
  isDirty = (_init_extra_morphAnimationDataCount(this), _init_isDirty(this, false));

  /** m_screenSize (float) */
  screenSize = (_init_extra_isDirty(this), _init_screenSize(this, 0));

  /** m_lodIndex (int) */
  lodIndex = (_init_extra_screenSize(this), _init_lodIndex(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2RaytracingMesh as Tr2RaytracingMesh };
//# sourceMappingURL=Tr2RaytracingMesh.js.map
