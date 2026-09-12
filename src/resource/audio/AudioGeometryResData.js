// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/AudioGeometryResData.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";

/** AudioGeometryResData (resources) - maintained from schema shapeHash 89e7ddb7.... */
export class AudioGeometryResData extends CjsModel
{

  /** m_id (uint64_t) */
  id = 0;

  /** m_vertices (std::vector<Vector3>) */
  vertices = [];

  /** m_indices (std::vector<uint32_t>) */
  indices = [];

  /** m_minBounds (Vector3) */
  minBounds = vec3.create();

  /** m_maxBounds (Vector3) */
  maxBounds = vec3.create();

  /** s_nextId (static std::atomic<uint64_t>) */
  s_nextId = null;

}

CjsSchema.define(AudioGeometryResData, {
  className: "AudioGeometryResData", family: "resources",
  fields: {
    id: type.uint64,
    vertices: type.list("Vector3"),
    indices: type.list("uint32_t"),
    minBounds: type.vec3,
    maxBounds: type.vec3,
    s_nextId: type.rawStruct("static std::atomic<uint64_t>")
  }
});
