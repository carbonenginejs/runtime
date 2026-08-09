// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionResetClipSphereCenter.h
// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionResetClipSphereCenter.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { isArrayLike } from "@carbonenginejs/runtime-utils/is";
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { ResetBehavior } from "../enums.js";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that moves its owner's clip-sphere center on start, either
 * back to the object center or onto a locator chosen from a named set or from
 * the last damage-locator hit.
 */
@type.define({
  className: "Tr2ActionResetClipSphereCenter",
  family: "controllers"
})
export class Tr2ActionResetClipSphereCenter extends CjsModel
{
  @io.persist
  @type.int32
  @schema.enum("ResetBehavior")
  resetBehavior = ResetBehavior.OBJECT_CENTER;

  @io.persist
  @type.int32
  locatorIndex = -1;

  @io.persist
  @type.string
  locatorSetName = "";

  /**
   * Resets the owner clip-sphere center from object or locator data.
   */
  @carbon.method
  @impl.adapted
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
    const locatorIndex = this.resetBehavior === ResetBehavior.LAST_DAMAGELOCATOR_HIT ? Tr2ActionResetClipSphereCenter.#toIndex(ITr2ControllerAction.callTarget(owner, "GetLastDamageLocatorHit"), -1) : this.locatorIndex;
    const center = Tr2ActionResetClipSphereCenter.#resolveLocatorPosition(owner, locatorSetName, locatorIndex);
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
   */
  static #resolveLocatorPosition(owner, setName, index)
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
   */
  static #toIndex(value, fallback)
  {
    const number = Number(value);
    return Number.isFinite(number) ? number | 0 : fallback;
  }

  static ResetBehavior = ResetBehavior;

}
