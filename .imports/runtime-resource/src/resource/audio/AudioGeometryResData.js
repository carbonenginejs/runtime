// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/AudioGeometryResData.json; maintained by runtime-resource.
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

/** AudioGeometryResData (resources) - maintained from schema shapeHash 89e7ddb7.... */
@type.define({ className: "AudioGeometryResData", family: "resources" })
export class AudioGeometryResData extends CjsModel
{

  /** m_id (uint64_t) */
  @type.uint64
  id = 0;

  /** m_vertices (std::vector<Vector3>) */
  @type.list("Vector3")
  vertices = [];

  /** m_indices (std::vector<uint32_t>) */
  @type.list("uint32_t")
  indices = [];

  /** m_minBounds (Vector3) */
  @type.vec3
  minBounds = vec3.create();

  /** m_maxBounds (Vector3) */
  @type.vec3
  maxBounds = vec3.create();

  /** s_nextId (static std::atomic<uint64_t>) */
  @type.rawStruct("static std::atomic<uint64_t>")
  s_nextId = null;

}
