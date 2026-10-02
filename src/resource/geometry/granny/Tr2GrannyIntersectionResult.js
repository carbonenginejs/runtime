// Source: trinity/trinity/Resources/TriGrannyRes.h
// Schema: format-carbon resources/Tr2GrannyIntersectionResult.json; maintained by the runtime resource layer.
import { CjsSchema, meta } from "#schema";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";

/** Data record mirroring Carbon's Granny intersection-query result: hit position, normal, UV, bone index, and mesh/area indices with per-field presence flags. */
export class Tr2GrannyIntersectionResult
{

  /** m_result.position (Vector3) [READWRITE] */
  position = vec3.create();

  /** m_result.hasPosition (bool) [READWRITE] */
  hasPosition = false;

  /** m_result.normal (Vector3) [READWRITE] */
  normal = vec3.create();

  /** m_result.hasNormal (bool) [READWRITE] */
  hasNormal = false;

  /** m_result.uv (Vector2) [READWRITE] */
  uv = vec2.create();

  /** m_result.hasUv (bool) [READWRITE] */
  hasUv = false;

  /** m_result.boneIndex (int32_t) [READWRITE] */
  boneIndex = 0;

  /** m_result.hasBoneIndex (bool) [READWRITE] */
  hasBoneIndex = false;

  /** m_result.meshIndex (int32_t) [READWRITE] */
  meshIndex = 0;

  /** m_result.areaIndex (int32_t) [READWRITE] */
  areaIndex = 0;

}

CjsSchema.define(Tr2GrannyIntersectionResult, {
  className: "Tr2GrannyIntersectionResult", family: "resources",
  fields: {
    position: [ meta.blue.readwrite, meta.type.vec3 ],
    hasPosition: [ meta.blue.readwrite, meta.type.boolean ],
    normal: [ meta.blue.readwrite, meta.type.vec3 ],
    hasNormal: [ meta.blue.readwrite, meta.type.boolean ],
    uv: [ meta.blue.readwrite, meta.type.vec2 ],
    hasUv: [ meta.blue.readwrite, meta.type.boolean ],
    boneIndex: [ meta.blue.readwrite, meta.type.int32 ],
    hasBoneIndex: [ meta.blue.readwrite, meta.type.boolean ],
    meshIndex: [ meta.blue.readwrite, meta.type.int32 ],
    areaIndex: [ meta.blue.readwrite, meta.type.int32 ]
  }
});
