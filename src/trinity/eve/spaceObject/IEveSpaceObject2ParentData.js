// Source: trinity/trinity/Eve/IEveSpaceObject2.h (IEveSpaceObject2::ParentData)
// Hand-maintained. Carbon nests this struct inside the IEveSpaceObject2
// interface; the JS identity concatenates owner and inner name
// (IEveSpaceObject2 + ParentData) because a bare inner name is not unique
// across the corpus - fifteen inner names are claimed by several owners and
// thirteen collide with a top-level class.
//
// A plain class, not a model: it is internal per-frame data, filled by the
// owner's update pass (GetParentData) and copied member by member by the
// consumer, exactly as Carbon passes and copies the struct. Nothing hydrates
// it or edits it from a UI; if something ever needs to, compose values onto
// it rather than giving it the model base.
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";


/** The per-frame parent state a space object hands to its attachments. */
export class IEveSpaceObject2ParentData
{

  /** transform (Matrix) - the parent's world transform. */
  transform = mat4.create();

  /** killCount (uint32_t) - EveSpaceObject2::GetParentData never assigns it,
   * so it stays zero through that path (EveSpaceObject2.cpp:1874). */
  killCount = 0;

  /** shipData (Vector4) - m_spaceObjectShipData. */
  shipData = vec4.create();

  /** clipSphereCenter (Vector3). */
  clipSphereCenter = vec3.create();

  /** clipRadiusSq (float). */
  clipRadiusSq = 0;

  /** clipRadius2Sq (float). */
  clipRadius2Sq = 0;

  /** clipFactor (float) - the parent's clipSphereFactor. */
  clipFactor = 0;

  /** clipFactor2 (float) - the parent's clipSphereFactor2. */
  clipFactor2 = 0;

  /** customData (Vector4). */
  customData = vec4.create();

  /**
   * shLighting (const Vector4*) - Carbon borrows a pointer to the parent's
   * seven packed spherical-harmonic coefficients and copies them at fill time,
   * zeroing when the pointer is null (EveSpaceObjectDecal.cpp:376-383). The
   * port holds the parent's array by reference with the same null contract.
   */
  shLighting = null;

  /** Carbon's packed spherical-harmonic coefficient count
   * (Tr2ShLightingManager::PACKED_COEFFICIENT_COUNT). */
  static SH_COEFFICIENT_COUNT = 7;

}
