// Source: trinity/trinity/Resources/TriGrannyRes.h
// Schema: format-carbon resources/Tr2GrannyIntersectionResult.json; maintained by the runtime resource layer.
import { exposure as be } from "#be";
import { CjsSchema, type } from "#schema";
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

CjsSchema.exposure.inherit(IRoot)(Tr2GrannyIntersectionResult);
CjsSchema.decorateField(Tr2GrannyIntersectionResult, "position", be.mapAttribute(be.READWRITE), type.vec3);
CjsSchema.decorateField(Tr2GrannyIntersectionResult, "hasPosition", be.mapAttribute(be.READWRITE), type.boolean);
CjsSchema.decorateField(Tr2GrannyIntersectionResult, "normal", be.mapAttribute(be.READWRITE), type.vec3);
CjsSchema.decorateField(Tr2GrannyIntersectionResult, "hasNormal", be.mapAttribute(be.READWRITE), type.boolean);
CjsSchema.decorateField(Tr2GrannyIntersectionResult, "uv", be.mapAttribute(be.READWRITE), type.vec2);
CjsSchema.decorateField(Tr2GrannyIntersectionResult, "hasUv", be.mapAttribute(be.READWRITE), type.boolean);
CjsSchema.decorateField(Tr2GrannyIntersectionResult, "boneIndex", be.mapAttribute(be.READWRITE), type.int32);
CjsSchema.decorateField(Tr2GrannyIntersectionResult, "hasBoneIndex", be.mapAttribute(be.READWRITE), type.boolean);
CjsSchema.decorateField(Tr2GrannyIntersectionResult, "meshIndex", be.mapAttribute(be.READWRITE), type.int32);
CjsSchema.decorateField(Tr2GrannyIntersectionResult, "areaIndex", be.mapAttribute(be.READWRITE), type.int32);
CjsSchema.exposure.define("Tr2GrannyIntersectionResult")(Tr2GrannyIntersectionResult);
