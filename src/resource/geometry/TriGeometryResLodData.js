// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResLodData.json; maintained by the runtime resource layer.
import { CjsSchema, meta } from "#schema";

/** Data record mirroring Carbon's per-LOD geometry block: mesh reference, naming and screen-size selection data, vertex/primitive counts, UV densities, areas, and buffer-allocation references. */
export class TriGeometryResLodData
{

  /** m_mesh (TriGeometryResMeshData*) */
  mesh = null;

  /** m_grannyMeshIndex (int32_t) */
  grannyMeshIndex = 0;

  /** m_name (std::string) */
  name = "";

  /** m_originalLodIndex (int32_t) */
  originalLodIndex = 0;

  /** m_maxScreenSize (float) */
  maxScreenSize = 0;

  /** m_vertexCount (unsigned int) */
  vertexCount = 0;

  /** m_primitiveCount (unsigned int) */
  primitiveCount = 0;

  /** m_uvDensities (std::vector<float>) */
  uvDensities = [];

  /** m_areas (TrackableStdVector<TriGeometryResAreaData>) */
  areas = null;

  /** m_allocationsValid (bool) */
  allocationsValid = false;

  /** m_vertexAllocation (Tr2SuballocatedBuffer::Allocation) */
  vertexAllocation = null;

  /** m_indexAllocation (Tr2SuballocatedBuffer::Allocation) */
  indexAllocation = null;

  /** m_morphTargetAllocation (Tr2SuballocatedBuffer::Allocation) */
  morphTargetAllocation = null;

  /** m_morphTargetNames (std::vector<std::string>) */
  morphTargetNames = [];

  /** m_morphTargetDeformationAmounts (std::vector<float>) */
  morphTargetDeformationAmounts = [];

  /** m_isBakedMorphTarget (std::vector<bool>) */
  isBakedMorphTarget = [];

  /** m_morphVertexDeclaration (unsigned int) */
  morphVertexDeclaration = 0;

  /** m_bytesPerMorphTargetVertex (unsigned int) */
  bytesPerMorphTargetVertex = 0;

  /** m_reversedIndicesValid (bool) */
  reversedIndicesValid = false;

  /** m_reversedIndexAllocation (Tr2SuballocatedBuffer::Allocation) */
  reversedIndexAllocation = null;

}

CjsSchema.define(TriGeometryResLodData, {
  className: "TriGeometryResLodData", family: "resources",
  fields: {
    mesh: meta.type.objectRef("TriGeometryResMeshData"),
    grannyMeshIndex: meta.type.int32,
    name: meta.type.string,
    originalLodIndex: meta.type.int32,
    maxScreenSize: meta.type.float32,
    vertexCount: meta.type.uint32,
    primitiveCount: meta.type.uint32,
    uvDensities: meta.type.list("float"),
    areas: meta.type.unknown,
    allocationsValid: meta.type.boolean,
    vertexAllocation: meta.type.rawStruct("Tr2SuballocatedBuffer::Allocation"),
    indexAllocation: meta.type.rawStruct("Tr2SuballocatedBuffer::Allocation"),
    morphTargetAllocation: meta.type.rawStruct("Tr2SuballocatedBuffer::Allocation"),
    morphTargetNames: meta.type.list("std::string"),
    morphTargetDeformationAmounts: meta.type.list("float"),
    isBakedMorphTarget: meta.type.list("bool"),
    morphVertexDeclaration: meta.type.uint32,
    bytesPerMorphTargetVertex: meta.type.uint32,
    reversedIndicesValid: meta.type.boolean,
    reversedIndexAllocation: meta.type.rawStruct("Tr2SuballocatedBuffer::Allocation")
  }
});
