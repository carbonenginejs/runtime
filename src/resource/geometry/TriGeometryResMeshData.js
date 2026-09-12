// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResMeshData.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** TriGeometryResMeshData (resources) - maintained from schema shapeHash 3d7f49cc.... */
export class TriGeometryResMeshData extends CjsModel
{

  /** m_name (std::string) */
  name = "";

  /** m_vertexDeclarationHandle (unsigned int) */
  vertexDeclarationHandle = 0;

  /** m_bytesPerVertex (unsigned int) */
  bytesPerVertex = -1;

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

CjsSchema.define(TriGeometryResMeshData, {
  className: "TriGeometryResMeshData", family: "resources",
  fields: {
    name: type.string,
    vertexDeclarationHandle: type.uint32,
    bytesPerVertex: type.uint32,
    minBounds: type.vec3,
    maxBounds: type.vec3,
    boundingSphere: type.vec4,
    jointBindings: type.unknown,
    audioGeometry: type.rawStruct("AudioGeometryResData"),
    decals: type.list("MeshDecalData"),
    lodMask: type.uint32,
    lods: type.rawStruct("TrackableStdVector<std::unique_ptr<TriGeometryResLodData>>")
  }
});
