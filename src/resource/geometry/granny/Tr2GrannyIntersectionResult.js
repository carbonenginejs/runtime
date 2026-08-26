// Source: trinity/trinity/Resources/TriGrannyRes.h
// Schema: format-carbon resources/Tr2GrannyIntersectionResult.json; maintained by the runtime resource layer.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";

/** Tr2GrannyIntersectionResult (resources) - maintained from schema shapeHash f0ccc62b.... */
@type.define({ className: "Tr2GrannyIntersectionResult", family: "resources" })
export class Tr2GrannyIntersectionResult extends CjsModel
{

  /** m_result.position (Vector3) [READWRITE] */
  @io.readwrite
  @type.vec3
  position = vec3.create();

  /** m_result.hasPosition (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  hasPosition = false;

  /** m_result.normal (Vector3) [READWRITE] */
  @io.readwrite
  @type.vec3
  normal = vec3.create();

  /** m_result.hasNormal (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  hasNormal = false;

  /** m_result.uv (Vector2) [READWRITE] */
  @io.readwrite
  @type.vec2
  uv = vec2.create();

  /** m_result.hasUv (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  hasUv = false;

  /** m_result.boneIndex (int32_t) [READWRITE] */
  @io.readwrite
  @type.int32
  boneIndex = 0;

  /** m_result.hasBoneIndex (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  hasBoneIndex = false;

  /** m_result.meshIndex (int32_t) [READWRITE] */
  @io.readwrite
  @type.int32
  meshIndex = 0;

  /** m_result.areaIndex (int32_t) [READWRITE] */
  @io.readwrite
  @type.int32
  areaIndex = 0;

}
