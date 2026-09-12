// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResLodData.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** TriGeometryResLodData (resources) - maintained from schema shapeHash 92d97df7.... */
export class TriGeometryResLodData extends CjsModel
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
    mesh: type.objectRef("TriGeometryResMeshData"),
    grannyMeshIndex: type.int32,
    name: type.string,
    originalLodIndex: type.int32,
    maxScreenSize: type.float32,
    vertexCount: type.uint32,
    primitiveCount: type.uint32,
    uvDensities: type.list("float"),
    areas: type.unknown,
    allocationsValid: type.boolean,
    vertexAllocation: type.rawStruct("Tr2SuballocatedBuffer::Allocation"),
    indexAllocation: type.rawStruct("Tr2SuballocatedBuffer::Allocation"),
    morphTargetAllocation: type.rawStruct("Tr2SuballocatedBuffer::Allocation"),
    morphTargetNames: type.list("std::string"),
    morphTargetDeformationAmounts: type.list("float"),
    isBakedMorphTarget: type.list("bool"),
    morphVertexDeclaration: type.uint32,
    bytesPerMorphTargetVertex: type.uint32,
    reversedIndicesValid: type.boolean,
    reversedIndexAllocation: type.rawStruct("Tr2SuballocatedBuffer::Allocation")
  }
});
