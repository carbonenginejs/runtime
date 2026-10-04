// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveDamageOverlay.h:63-69 (EveDamageOverlay::OwnerInfo)
// Hand-maintained. Carbon nests this struct inside EveDamageOverlay; the JS identity concatenates owner
// and inner name, as IEveSpaceObject2ParentData does.
//
// A plain class, not a model: what the overlay needs to know about whoever owns it. Each owner keeps one
// and refills it before EveDamageOverlay.UpdateAsyncronous, which reads it during that call only.
import { vec4 } from "#math/vec4";


/** Supplies owner bounds, visibility and damage-locator access to a damage overlay. */
export class EveDamageOverlayOwnerInfo
{

  boundingSphere = vec4.fromValues(0, 0, 0, -1);

  estimatedPixelDiameter = 0;

  isInFrustum = false;

  /** std::function<bool(int, Vector3&)>; null when the owner resolves no damage locators. */
  getDamageLocatorPositionOS = null;

  /**
   * Restores the struct's member defaults.
   * @param {EveDamageOverlayOwnerInfo} out Record to reset.
   * @returns {EveDamageOverlayOwnerInfo} out
   */
  static Reset(out)
  {
    vec4.set(out.boundingSphere, 0, 0, 0, -1);
    out.estimatedPixelDiameter = 0;
    out.isInFrustum = false;
    out.getDamageLocatorPositionOS = null;
    return out;
  }

}
