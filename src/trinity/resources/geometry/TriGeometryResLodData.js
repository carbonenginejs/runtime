// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResLodData.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";

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

CjsSchema.decorateField(TriGeometryResLodData, "mesh", type.rawStruct("TriGeometryResMeshData"));
CjsSchema.decorateField(TriGeometryResLodData, "grannyMeshIndex", type.int32);
CjsSchema.decorateField(TriGeometryResLodData, "name", type.string);
CjsSchema.decorateField(TriGeometryResLodData, "originalLodIndex", type.int32);
CjsSchema.decorateField(TriGeometryResLodData, "maxScreenSize", type.float32);
CjsSchema.decorateField(TriGeometryResLodData, "vertexCount", type.uint32);
CjsSchema.decorateField(TriGeometryResLodData, "primitiveCount", type.uint32);
CjsSchema.decorateField(TriGeometryResLodData, "uvDensities", type.list("float"));
CjsSchema.decorateField(TriGeometryResLodData, "areas", type.list("TriGeometryResAreaData"));
CjsSchema.decorateField(TriGeometryResLodData, "allocationsValid", type.boolean);
CjsSchema.decorateField(TriGeometryResLodData, "vertexAllocation", type.rawStruct("Tr2SuballocatedBuffer::Allocation"));
CjsSchema.decorateField(TriGeometryResLodData, "indexAllocation", type.rawStruct("Tr2SuballocatedBuffer::Allocation"));
CjsSchema.decorateField(TriGeometryResLodData, "morphTargetAllocation", type.rawStruct("Tr2SuballocatedBuffer::Allocation"));
CjsSchema.decorateField(TriGeometryResLodData, "morphTargetNames", type.list("std::string"));
CjsSchema.decorateField(TriGeometryResLodData, "morphTargetDeformationAmounts", type.list("float"));
CjsSchema.decorateField(TriGeometryResLodData, "isBakedMorphTarget", type.list("bool"));
CjsSchema.decorateField(TriGeometryResLodData, "morphVertexDeclaration", type.uint32);
CjsSchema.decorateField(TriGeometryResLodData, "bytesPerMorphTargetVertex", type.uint32);
CjsSchema.decorateField(TriGeometryResLodData, "reversedIndicesValid", type.boolean);
CjsSchema.decorateField(TriGeometryResLodData, "reversedIndexAllocation", type.rawStruct("Tr2SuballocatedBuffer::Allocation"));
CjsSchema.meta.carbon("TriGeometryResLodData")(TriGeometryResLodData);
