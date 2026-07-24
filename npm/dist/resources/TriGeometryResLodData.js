import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_mesh, _init_extra_mesh, _init_grannyMeshIndex, _init_extra_grannyMeshIndex, _init_name, _init_extra_name, _init_originalLodIndex, _init_extra_originalLodIndex, _init_maxScreenSize, _init_extra_maxScreenSize, _init_vertexCount, _init_extra_vertexCount, _init_primitiveCount, _init_extra_primitiveCount, _init_uvDensities, _init_extra_uvDensities, _init_areas, _init_extra_areas, _init_allocationsValid, _init_extra_allocationsValid, _init_vertexAllocation, _init_extra_vertexAllocation, _init_indexAllocation, _init_extra_indexAllocation, _init_morphTargetAllocation, _init_extra_morphTargetAllocation, _init_morphTargetNames, _init_extra_morphTargetNames, _init_morphTargetDeformationAmounts, _init_extra_morphTargetDeformationAmounts, _init_isBakedMorphTarget, _init_extra_isBakedMorphTarget, _init_morphVertexDeclaration, _init_extra_morphVertexDeclaration, _init_bytesPerMorphTargetVertex, _init_extra_bytesPerMorphTargetVertex, _init_reversedIndicesValid, _init_extra_reversedIndicesValid, _init_reversedIndexAllocation, _init_extra_reversedIndexAllocation;

/** TriGeometryResLodData (resources) - maintained from schema shapeHash 92d97df7.... */
let _TriGeometryResLodDat;
class TriGeometryResLodData extends CjsModel {
  static {
    ({
      e: [_init_mesh, _init_extra_mesh, _init_grannyMeshIndex, _init_extra_grannyMeshIndex, _init_name, _init_extra_name, _init_originalLodIndex, _init_extra_originalLodIndex, _init_maxScreenSize, _init_extra_maxScreenSize, _init_vertexCount, _init_extra_vertexCount, _init_primitiveCount, _init_extra_primitiveCount, _init_uvDensities, _init_extra_uvDensities, _init_areas, _init_extra_areas, _init_allocationsValid, _init_extra_allocationsValid, _init_vertexAllocation, _init_extra_vertexAllocation, _init_indexAllocation, _init_extra_indexAllocation, _init_morphTargetAllocation, _init_extra_morphTargetAllocation, _init_morphTargetNames, _init_extra_morphTargetNames, _init_morphTargetDeformationAmounts, _init_extra_morphTargetDeformationAmounts, _init_isBakedMorphTarget, _init_extra_isBakedMorphTarget, _init_morphVertexDeclaration, _init_extra_morphVertexDeclaration, _init_bytesPerMorphTargetVertex, _init_extra_bytesPerMorphTargetVertex, _init_reversedIndicesValid, _init_extra_reversedIndicesValid, _init_reversedIndexAllocation, _init_extra_reversedIndexAllocation],
      c: [_TriGeometryResLodDat, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriGeometryResLodData",
      family: "resources"
    })], [[type.objectRef("TriGeometryResMeshData"), 0, "mesh"], [[type, type.int32], 16, "grannyMeshIndex"], [[type, type.string], 16, "name"], [[type, type.int32], 16, "originalLodIndex"], [[type, type.float32], 16, "maxScreenSize"], [[type, type.uint32], 16, "vertexCount"], [[type, type.uint32], 16, "primitiveCount"], [type.list("float"), 0, "uvDensities"], [[type, type.unknown], 16, "areas"], [[type, type.boolean], 16, "allocationsValid"], [type.rawStruct("Tr2SuballocatedBuffer::Allocation"), 0, "vertexAllocation"], [type.rawStruct("Tr2SuballocatedBuffer::Allocation"), 0, "indexAllocation"], [type.rawStruct("Tr2SuballocatedBuffer::Allocation"), 0, "morphTargetAllocation"], [type.list("std::string"), 0, "morphTargetNames"], [type.list("float"), 0, "morphTargetDeformationAmounts"], [type.list("bool"), 0, "isBakedMorphTarget"], [[type, type.uint32], 16, "morphVertexDeclaration"], [[type, type.uint32], 16, "bytesPerMorphTargetVertex"], [[type, type.boolean], 16, "reversedIndicesValid"], [type.rawStruct("Tr2SuballocatedBuffer::Allocation"), 0, "reversedIndexAllocation"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_reversedIndexAllocation(this);
  }
  /** m_mesh (TriGeometryResMeshData*) */
  mesh = _init_mesh(this, null);

  /** m_grannyMeshIndex (int32_t) */
  grannyMeshIndex = (_init_extra_mesh(this), _init_grannyMeshIndex(this, 0));

  /** m_name (std::string) */
  name = (_init_extra_grannyMeshIndex(this), _init_name(this, ""));

  /** m_originalLodIndex (int32_t) */
  originalLodIndex = (_init_extra_name(this), _init_originalLodIndex(this, 0));

  /** m_maxScreenSize (float) */
  maxScreenSize = (_init_extra_originalLodIndex(this), _init_maxScreenSize(this, 0));

  /** m_vertexCount (unsigned int) */
  vertexCount = (_init_extra_maxScreenSize(this), _init_vertexCount(this, 0));

  /** m_primitiveCount (unsigned int) */
  primitiveCount = (_init_extra_vertexCount(this), _init_primitiveCount(this, 0));

  /** m_uvDensities (std::vector<float>) */
  uvDensities = (_init_extra_primitiveCount(this), _init_uvDensities(this, []));

  /** m_areas (TrackableStdVector<TriGeometryResAreaData>) */
  areas = (_init_extra_uvDensities(this), _init_areas(this, null));

  /** m_allocationsValid (bool) */
  allocationsValid = (_init_extra_areas(this), _init_allocationsValid(this, false));

  /** m_vertexAllocation (Tr2SuballocatedBuffer::Allocation) */
  vertexAllocation = (_init_extra_allocationsValid(this), _init_vertexAllocation(this, null));

  /** m_indexAllocation (Tr2SuballocatedBuffer::Allocation) */
  indexAllocation = (_init_extra_vertexAllocation(this), _init_indexAllocation(this, null));

  /** m_morphTargetAllocation (Tr2SuballocatedBuffer::Allocation) */
  morphTargetAllocation = (_init_extra_indexAllocation(this), _init_morphTargetAllocation(this, null));

  /** m_morphTargetNames (std::vector<std::string>) */
  morphTargetNames = (_init_extra_morphTargetAllocation(this), _init_morphTargetNames(this, []));

  /** m_morphTargetDeformationAmounts (std::vector<float>) */
  morphTargetDeformationAmounts = (_init_extra_morphTargetNames(this), _init_morphTargetDeformationAmounts(this, []));

  /** m_isBakedMorphTarget (std::vector<bool>) */
  isBakedMorphTarget = (_init_extra_morphTargetDeformationAmounts(this), _init_isBakedMorphTarget(this, []));

  /** m_morphVertexDeclaration (unsigned int) */
  morphVertexDeclaration = (_init_extra_isBakedMorphTarget(this), _init_morphVertexDeclaration(this, 0));

  /** m_bytesPerMorphTargetVertex (unsigned int) */
  bytesPerMorphTargetVertex = (_init_extra_morphVertexDeclaration(this), _init_bytesPerMorphTargetVertex(this, 0));

  /** m_reversedIndicesValid (bool) */
  reversedIndicesValid = (_init_extra_bytesPerMorphTargetVertex(this), _init_reversedIndicesValid(this, false));

  /** m_reversedIndexAllocation (Tr2SuballocatedBuffer::Allocation) */
  reversedIndexAllocation = (_init_extra_reversedIndicesValid(this), _init_reversedIndexAllocation(this, null));
  static {
    _initClass();
  }
}

export { _TriGeometryResLodDat as TriGeometryResLodData };
//# sourceMappingURL=TriGeometryResLodData.js.map
