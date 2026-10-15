// Source: trinity/trinity/Resources/TriGrannyRes.h
// Schema: format-carbon resources/Tr2GrannyIntersectionResult.json; maintained by the runtime resource layer.
import { CjsSchema, type, blue } from "#schema";
import { IRoot } from "#blue";
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

CjsSchema.blue.inherit(IRoot)(Tr2GrannyIntersectionResult);
CjsSchema.blue.define(Tr2GrannyIntersectionResult, {
  className: "Tr2GrannyIntersectionResult",
  fields: {
    position: [ blue.readwrite, type.vec3 ],
    hasPosition: [ blue.readwrite, type.boolean ],
    normal: [ blue.readwrite, type.vec3 ],
    hasNormal: [ blue.readwrite, type.boolean ],
    uv: [ blue.readwrite, type.vec2 ],
    hasUv: [ blue.readwrite, type.boolean ],
    boneIndex: [ blue.readwrite, type.int32 ],
    hasBoneIndex: [ blue.readwrite, type.boolean ],
    meshIndex: [ blue.readwrite, type.int32 ],
    areaIndex: [ blue.readwrite, type.int32 ]
  }
});
