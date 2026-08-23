// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveSpaceObjectDecal.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/perObjectData/DecalPSPerObjectData.json.).
import { type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** Represents the retired pixel-stage decal payload for display, ship, clip, radius, and spherical-harmonic lighting values now written through RawData. */
@type.define({ className: "DecalPSPerObjectData", family: "eve/perObjectData" })
export class DecalPSPerObjectData extends CjsModel
{

  /** m_displayData (Vector4) */
  @type.vec4
  displayData = vec4.create();

  /** m_shipData (Vector4) */
  @type.vec4
  shipData = vec4.create();

  /** m_clipData (Vector4) */
  @type.vec4
  clipData = vec4.create();

  /** m_clipRadius2Sq (float) */
  @type.float32
  clipRadius2Sq = 0;

  /** m_unused (Vector3) */
  @type.vec3
  unused = vec3.create();

  /** m_shLightingCoefficients (Vector4[PACKED_COEFFICIENT_COUNT = 7]) - the
   * generator flattened this to a single vec4; corrected at promotion. */
  @type.array("vec4")
  shLightingCoefficients = Array.from({ length: DecalPSPerObjectData.SH_COEFFICIENT_COUNT }, () => vec4.create());

  /** Tr2ShLightingManager::PACKED_COEFFICIENT_COUNT. */
  static SH_COEFFICIENT_COUNT = 7;

}
