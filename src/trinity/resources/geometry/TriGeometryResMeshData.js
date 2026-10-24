// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResMeshData.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** Data record mirroring Carbon's per-mesh geometry block: name, vertex layout facts, bounds, joint bindings, audio geometry, decals, and the LOD list. */
export class TriGeometryResMeshData
{

  /** m_name (std::string) */
  name = "";

  /** m_vertexDeclarationHandle (unsigned int) */
  vertexDeclarationHandle = 0;

  /** m_bytesPerVertex (unsigned int) */
  bytesPerVertex = 0xffffffff;

  /** m_minBounds (Vector3) */
  minBounds = vec3.create();

  /** m_maxBounds (Vector3) */
  maxBounds = vec3.create();

  /** m_boundingSphere (Vector4) */
  boundingSphere = vec4.create();

  /** m_jointBindings (TrackableStdVector<TriJointBinding>) */
  jointBindings = null;

  /** m_audioGeometry (std::unique_ptr<AudioGeometryResData>) */
  audioGeometry = null;

  /** m_decals (std::vector<std::shared_ptr<MeshDecalData>>) */
  decals = [];

  /** m_lodMask (uint32_t) */
  lodMask = 0;

  /** m_lods (TrackableStdVector<std::unique_ptr<TriGeometryResLodData>>) */
  lods = null;

}

CjsSchema.decorateField(TriGeometryResMeshData, "name", type.string);
CjsSchema.decorateField(TriGeometryResMeshData, "vertexDeclarationHandle", type.uint32);
CjsSchema.decorateField(TriGeometryResMeshData, "bytesPerVertex", type.uint32);
CjsSchema.decorateField(TriGeometryResMeshData, "minBounds", type.vec3);
CjsSchema.decorateField(TriGeometryResMeshData, "maxBounds", type.vec3);
CjsSchema.decorateField(TriGeometryResMeshData, "boundingSphere", type.vec4);
CjsSchema.decorateField(TriGeometryResMeshData, "jointBindings", type.list("TriJointBinding"));
CjsSchema.decorateField(TriGeometryResMeshData, "audioGeometry", type.rawStruct("AudioGeometryResData"));
CjsSchema.decorateField(TriGeometryResMeshData, "decals", type.list("MeshDecalData"));
CjsSchema.decorateField(TriGeometryResMeshData, "lodMask", type.uint32);
CjsSchema.decorateField(TriGeometryResMeshData, "lods", type.list("TriGeometryResLodData"));
CjsSchema.meta.carbon("TriGeometryResMeshData")(TriGeometryResMeshData);
