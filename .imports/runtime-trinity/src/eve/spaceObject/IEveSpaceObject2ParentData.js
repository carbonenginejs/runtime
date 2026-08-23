// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Eve/IEveSpaceObject2.h (IEveSpaceObject2::ParentData)
// Hand-maintained. Carbon nests this struct inside the IEveSpaceObject2
// interface; the JS identity concatenates owner and inner name
// (IEveSpaceObject2 + ParentData) because a bare inner name is not unique
// across the corpus - fifteen inner names are claimed by several owners and
// thirteen collide with a top-level class.
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { type } from "@carbonenginejs/runtime-utils/schema";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";


/** The per-frame parent state a space object hands to its attachments. */
@type.define({ className: "IEveSpaceObject2ParentData", family: "eve/spaceObject" })
export class IEveSpaceObject2ParentData extends CjsModel
{

  /** transform (Matrix) - the parent's world transform. */
  @type.mat4
  transform = mat4.create();

  /** killCount (uint32_t) - EveSpaceObject2::GetParentData never assigns it,
   * so it stays zero through that path (EveSpaceObject2.cpp:1874). */
  @type.uint32
  killCount = 0;

  /** shipData (Vector4) - m_spaceObjectShipData. */
  @type.vec4
  shipData = vec4.create();

  /** clipSphereCenter (Vector3). */
  @type.vec3
  clipSphereCenter = vec3.create();

  /** clipRadiusSq (float). */
  @type.float32
  clipRadiusSq = 0;

  /** clipRadius2Sq (float). */
  @type.float32
  clipRadius2Sq = 0;

  /** clipFactor (float) - the parent's clipSphereFactor. */
  @type.float32
  clipFactor = 0;

  /** clipFactor2 (float) - the parent's clipSphereFactor2. */
  @type.float32
  clipFactor2 = 0;

  /** customData (Vector4). */
  @type.vec4
  customData = vec4.create();

  /**
   * shLighting (const Vector4*) - Carbon borrows a pointer to the parent's
   * seven packed spherical-harmonic coefficients and copies them at fill time,
   * zeroing when the pointer is null (EveSpaceObjectDecal.cpp:376-383). The
   * port holds the parent's array by reference with the same null contract; it
   * is runtime state, so it carries no persistence.
   */
  shLighting = null;

  /** Carbon's packed spherical-harmonic coefficient count
   * (Tr2ShLightingManager::PACKED_COEFFICIENT_COUNT). */
  static SH_COEFFICIENT_COUNT = 7;

}
