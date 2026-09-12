// Source: trinity/trinity/Resources/TriGrannyRes.h
// Schema: format-carbon resources/Tr2GrannyIntersectionResult.json; maintained by the runtime resource layer.
import { CjsSchema, io, type } from "#schema";
import { CjsModel } from "#model";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";

/** Tr2GrannyIntersectionResult (resources) - maintained from schema shapeHash f0ccc62b.... */
export class Tr2GrannyIntersectionResult extends CjsModel
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
    position: [ io.readwrite, type.vec3 ],
    hasPosition: [ io.readwrite, type.boolean ],
    normal: [ io.readwrite, type.vec3 ],
    hasNormal: [ io.readwrite, type.boolean ],
    uv: [ io.readwrite, type.vec2 ],
    hasUv: [ io.readwrite, type.boolean ],
    boneIndex: [ io.readwrite, type.int32 ],
    hasBoneIndex: [ io.readwrite, type.boolean ],
    meshIndex: [ io.readwrite, type.int32 ],
    areaIndex: [ io.readwrite, type.int32 ]
  }
});
