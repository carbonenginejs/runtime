// Source: trinity/trinity/Resources/TriGrannyRes.h
// Schema: format-carbon resources/Tr2GrannyIntersectionResult.json; maintained by the runtime resource layer.
import { CjsSchema, edit, type } from "#schema";
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
    position: [ edit.readwrite, type.vec3 ],
    hasPosition: [ edit.readwrite, type.boolean ],
    normal: [ edit.readwrite, type.vec3 ],
    hasNormal: [ edit.readwrite, type.boolean ],
    uv: [ edit.readwrite, type.vec2 ],
    hasUv: [ edit.readwrite, type.boolean ],
    boneIndex: [ edit.readwrite, type.int32 ],
    hasBoneIndex: [ edit.readwrite, type.boolean ],
    meshIndex: [ edit.readwrite, type.int32 ],
    areaIndex: [ edit.readwrite, type.int32 ]
  }
});
