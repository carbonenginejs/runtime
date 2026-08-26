// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResMeshData.json; maintained by the runtime resource layer.
import { type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** TriGeometryResMeshData (resources) - maintained from schema shapeHash 3d7f49cc.... */
@type.define({ className: "TriGeometryResMeshData", family: "resources" })
export class TriGeometryResMeshData extends CjsModel
{

  /** m_name (std::string) */
  @type.string
  name = "";

  /** m_vertexDeclarationHandle (unsigned int) */
  @type.uint32
  vertexDeclarationHandle = 0;

  /** m_bytesPerVertex (unsigned int) */
  @type.uint32
  bytesPerVertex = -1;

  /** m_minBounds (Vector3) */
  @type.vec3
  minBounds = vec3.create();

  /** m_maxBounds (Vector3) */
  @type.vec3
  maxBounds = vec3.create();

  /** m_boundingSphere (Vector4) */
  @type.vec4
  boundingSphere = vec4.create();

  /** m_jointBindings (TrackableStdVector<TriJointBinding>) */
  @type.unknown
  jointBindings = null;

  /** m_audioGeometry (std::unique_ptr<AudioGeometryResData>) */
  @type.rawStruct("AudioGeometryResData")
  audioGeometry = null;

  /** m_decals (std::vector<std::shared_ptr<MeshDecalData>>) */
  @type.list("MeshDecalData")
  decals = [];

  /** m_lodMask (uint32_t) */
  @type.uint32
  lodMask = 0;

  /** m_lods (TrackableStdVector<std::unique_ptr<TriGeometryResLodData>>) */
  @type.rawStruct("TrackableStdVector<std::unique_ptr<TriGeometryResLodData>>")
  lods = null;

}
