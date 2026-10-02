// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResMeshData.json; maintained by the runtime resource layer.
import { CjsSchema, meta } from "#schema";
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
    name: meta.type.string,
    vertexDeclarationHandle: meta.type.uint32,
    bytesPerVertex: meta.type.uint32,
    minBounds: meta.type.vec3,
    maxBounds: meta.type.vec3,
    boundingSphere: meta.type.vec4,
    jointBindings: meta.type.unknown,
    audioGeometry: meta.type.rawStruct("AudioGeometryResData"),
    decals: meta.type.list("MeshDecalData"),
    lodMask: meta.type.uint32,
    lods: meta.type.rawStruct("TrackableStdVector<std::unique_ptr<TriGeometryResLodData>>")
  }
});
