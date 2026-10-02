// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/AudioGeometryResData.json; maintained by the runtime resource layer.
import { CjsSchema, meta } from "#schema";
import { vec3 } from "#math/vec3";

/** Data record mirroring Carbon's per-mesh audio-geometry block: an id plus the vertices, indices, and min/max bounds consumed by audio occlusion. */
export class AudioGeometryResData
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
    id: meta.type.uint64,
    vertices: meta.type.list("Vector3"),
    indices: meta.type.list("uint32_t"),
    minBounds: meta.type.vec3,
    maxBounds: meta.type.vec3,
    s_nextId: meta.type.rawStruct("static std::atomic<uint64_t>")
  }
});
