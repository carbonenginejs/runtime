import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { isArrayLike } from '@carbonenginejs/runtime-utils/is';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { ResetBehavior } from '../enums.js';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';

let _initProto, _initClass, _init_resetBehavior, _init_extra_resetBehavior, _init_locatorIndex, _init_extra_locatorIndex, _init_locatorSetName, _init_extra_locatorSetName;

/**
 * Controller action that moves its owner's clip-sphere center on start, either
 * back to the object center or onto a locator chosen from a named set or from
 * the last damage-locator hit.
 */
let _Tr2ActionResetClipSp;
new class extends _identity {
  static [class Tr2ActionResetClipSphereCenter extends CjsModel {
    static {
      ({
        e: [_init_resetBehavior, _init_extra_resetBehavior, _init_locatorIndex, _init_extra_locatorIndex, _init_locatorSetName, _init_extra_locatorSetName, _initProto],
        c: [_Tr2ActionResetClipSp, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ActionResetClipSphereCenter",
        family: "controllers"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("ResetBehavior")], 16, "resetBehavior"], [[io, io.persist, type, type.int32], 16, "locatorIndex"], [[io, io.persist, type, type.string], 16, "locatorSetName"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_locatorSetName(this);
    }
    resetBehavior = (_initProto(this), _init_resetBehavior(this, ResetBehavior.OBJECT_CENTER));
    locatorIndex = (_init_extra_resetBehavior(this), _init_locatorIndex(this, -1));
    locatorSetName = (_init_extra_locatorIndex(this), _init_locatorSetName(this, ""));

    /**
     * Resets the owner clip-sphere center from object or locator data.
     */
    Start(controller) {
      const owner = ITr2ControllerAction.getOwner(controller);
      if (this.resetBehavior === ResetBehavior.OBJECT_CENTER) {
        if (ITr2ControllerAction.hasFunction(owner, "ResetClipSphereCenter")) {
          owner.ResetClipSphereCenter();
          return;
        }
        const value = ITr2ControllerAction.callTarget(owner, "GetBoundingSphereCenter") ?? (ITr2ControllerAction.hasProperty(owner, "boundingSphereCenter") ? owner.boundingSphereCenter : null);
        if (isArrayLike(value, 3) && ITr2ControllerAction.hasProperty(owner, "clipSphereCenter") && isArrayLike(owner.clipSphereCenter, 3)) {
          vec3.copy(owner.clipSphereCenter, value);
          return;
        }
        return;
      }
      const locatorSetName = this.resetBehavior === ResetBehavior.LAST_DAMAGELOCATOR_HIT ? "damage" : this.locatorSetName;
      const locatorIndex = this.resetBehavior === ResetBehavior.LAST_DAMAGELOCATOR_HIT ? _Tr2ActionResetClipSp.#toIndex(ITr2ControllerAction.callTarget(owner, "GetLastDamageLocatorHit"), -1) : this.locatorIndex;
      const center = _Tr2ActionResetClipSp.#resolveLocatorPosition(owner, locatorSetName, locatorIndex);
      if (!center) {
        return;
      }
      if (ITr2ControllerAction.hasFunction(owner, "ResetClipSphereCenterToPos")) {
        owner.ResetClipSphereCenterToPos(center);
        return;
      }
      if (ITr2ControllerAction.hasProperty(owner, "clipSphereCenter") && isArrayLike(owner.clipSphereCenter, 3)) {
        vec3.copy(owner.clipSphereCenter, center);
        return;
      }
      if (ITr2ControllerAction.hasFunction(owner, "ResetClipSphereCenter")) {
        owner.ResetClipSphereCenter(center);
      }
    }

    /**
     * Gets a position from a named locator set, picking a uniformly random locator
     * when the index is negative, and accepting either a bare 3-component locator
     * or one carrying a `position`.
     */

    /**
     * Truncates a value to a 32-bit integer locator index, substituting the
     * fallback when it is not finite.
     */
  }];
  #resolveLocatorPosition(owner, setName, index) {
    const locators = ITr2ControllerAction.callTarget(owner, "GetLocatorsForSet", setName) ?? (ITr2ControllerAction.hasProperty(owner, "locatorSets") && Array.isArray(owner.locatorSets) ? owner.locatorSets.find(set => ITr2ControllerAction.hasProperty(set, "name") && set.name === setName)?.locators : null);
    if (!Array.isArray(locators) || !locators.length) {
      return null;
    }
    const resolvedIndex = index < 0 ? Math.floor(Math.random() * locators.length) : index;
    const locator = locators[resolvedIndex] ?? null;
    if (isArrayLike(locator, 3)) {
      return locator;
    }
    if (ITr2ControllerAction.hasProperty(locator, "position") && isArrayLike(locator.position, 3)) {
      return locator.position;
    }
    return null;
  }
  #toIndex(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number | 0 : fallback;
  }
  ResetBehavior = ResetBehavior;
  constructor() {
    super(_Tr2ActionResetClipSp), _initClass();
  }
}();

export { _Tr2ActionResetClipSp as Tr2ActionResetClipSphereCenter };
//# sourceMappingURL=Tr2ActionResetClipSphereCenter.js.map
