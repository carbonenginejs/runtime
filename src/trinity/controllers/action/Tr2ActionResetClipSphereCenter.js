// Source: trinity/trinity/Controllers/Actions/Tr2ActionResetClipSphereCenter.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionResetClipSphereCenter.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionResetClipSphereCenter_Blue.cpp
import { isArrayLike } from "#utils/is";
import { meta, types } from "#schema";
import { vec3 } from "#math/vec3";
import { ResetBehavior } from "../enums.js";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that moves its owner's clip-sphere center on start, either
 * back to the object center or onto a locator chosen from a named set or from
 * the last damage-locator hit.
 */
@meta.define({
  className: "Tr2ActionResetClipSphereCenter",
  family: "controllers"
})
export class Tr2ActionResetClipSphereCenter extends ITr2ControllerAction
{
  /** Named locator set used by the current custom-mode adapter. */
  @meta.member("locatorSetName")
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  locatorSetName = "";

  /** Locator index; the existing adapter selects randomly for negative values. */
  @meta.member("locatorIndex")
  @meta.edit.readwrite
  @meta.edit.persist
  @types.int32
  locatorIndex = -1;

  /** Authored reset mode; preserves the existing ResetBehavior identity. */
  @meta.member("resetBehavior")
  @meta.edit.readwrite
  @meta.edit.persist
  @types.int32
  @types.enum("trinity.Tr2ActionResetClipSphereCenter.ResetBehavior")
  resetBehavior = ResetBehavior.OBJECT_CENTER;

  /**
   * Resets the owner clip-sphere center from object or locator data.
   * Adapted: preserves the existing JavaScript owner adapter during base removal:
   * method or data-field owners are accepted without Carbon's EveSpaceObject2
   * BlueCastPtr (Tr2ActionResetClipSphereCenter.cpp:33). The bounding-center
   * fallback copies instead of the native negation (EveSpaceObject2.cpp:4418),
   * and unknown modes follow the custom locator path instead of native default
   * object-center reset. Those behavior migrations require a separate owner pass.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Start(controller)
  {
    const owner = ITr2ControllerAction.getOwner(controller);
    if (this.resetBehavior === ResetBehavior.OBJECT_CENTER)
    {
      if (ITr2ControllerAction.hasFunction(owner, "ResetClipSphereCenter"))
      {
        owner.ResetClipSphereCenter();
        return;
      }
      const value = ITr2ControllerAction.callTarget(owner, "GetBoundingSphereCenter") ?? (ITr2ControllerAction.hasProperty(owner, "boundingSphereCenter") ? owner.boundingSphereCenter : null);
      if (isArrayLike(value, 3) && ITr2ControllerAction.hasProperty(owner, "clipSphereCenter") && isArrayLike(owner.clipSphereCenter, 3))
      {
        vec3.copy(owner.clipSphereCenter, value);
        return;
      }
      return;
    }
    const locatorSetName = this.resetBehavior === ResetBehavior.LAST_DAMAGELOCATOR_HIT ? "damage" : this.locatorSetName;
    const locatorIndex = this.resetBehavior === ResetBehavior.LAST_DAMAGELOCATOR_HIT ? Tr2ActionResetClipSphereCenter._toIndex(ITr2ControllerAction.callTarget(owner, "GetLastDamageLocatorHit"), -1) : this.locatorIndex;
    const center = Tr2ActionResetClipSphereCenter._resolveLocatorPosition(owner, locatorSetName, locatorIndex);
    if (!center)
    {
      return;
    }
    if (ITr2ControllerAction.hasFunction(owner, "ResetClipSphereCenterToPos"))
    {
      owner.ResetClipSphereCenterToPos(center);
      return;
    }
    if (ITr2ControllerAction.hasProperty(owner, "clipSphereCenter") && isArrayLike(owner.clipSphereCenter, 3))
    {
      vec3.copy(owner.clipSphereCenter, center);
      return;
    }
    if (ITr2ControllerAction.hasFunction(owner, "ResetClipSphereCenter"))
    {
      owner.ResetClipSphereCenter(center);
    }
  }

  /**
   * Gets a position from a named locator set, picking a uniformly random locator
   * when the index is negative, and accepting either a bare 3-component locator
   * or one carrying a `position`.
   * Custom: retained owner-shape adapter; Carbon ResetClipSphereToLocator
   * (Tr2ActionResetClipSphereCenter.cpp:15-27) reads a native locator vector and
   * each locator's position. This adapter also accepts locatorSets data, skips
   * empty sets, and uses Math.random rather than the native rand() stream.
   */
  @meta.impl.custom
  static _resolveLocatorPosition(owner, setName, index)
  {
    const locators = ITr2ControllerAction.callTarget(owner, "GetLocatorsForSet", setName) ?? (ITr2ControllerAction.hasProperty(owner, "locatorSets") && Array.isArray(owner.locatorSets) ? owner.locatorSets.find(set => ITr2ControllerAction.hasProperty(set, "name") && set.name === setName)?.locators : null);
    if (!Array.isArray(locators) || !locators.length)
    {
      return null;
    }
    const resolvedIndex = index < 0 ? Math.floor(Math.random() * locators.length) : index;
    const locator = locators[resolvedIndex] ?? null;
    if (isArrayLike(locator, 3))
    {
      return locator;
    }
    if (ITr2ControllerAction.hasProperty(locator, "position") && isArrayLike(locator.position, 3))
    {
      return locator.position;
    }
    return null;
  }

  /**
   * Truncates a value to a 32-bit integer locator index, substituting the
   * fallback when it is not finite.
   * Custom: retained coercion for the JavaScript owner adapter; Carbon consumes
   * the int returned by EveSpaceObject2::GetLastDamageLocatorHit directly.
   */
  @meta.impl.custom
  static _toIndex(value, fallback)
  {
    const number = Number(value);
    return Number.isFinite(number) ? number | 0 : fallback;
  }

  static ResetBehavior = ResetBehavior;

}

// Native exposure ends at this concrete table (Tr2ActionResetClipSphereCenter_Blue.cpp:21-22,26).
meta.carbon.interfaceTable({
  interfaces: [Tr2ActionResetClipSphereCenter, ITr2ControllerAction],
  chainTo: null
})(Tr2ActionResetClipSphereCenter);
