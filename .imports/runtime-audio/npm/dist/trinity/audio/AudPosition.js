import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass;

/**
 * Stores browser-safe front, top, and position vectors for Carbon
 * placement-observer updates.
 */
let _AudPosition;
class AudPosition extends CjsModel {
  static {
    ({
      e: [_initProto],
      c: [_AudPosition, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "AudPosition",
      family: "audio"
    })], [[[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("AkSoundPosition is represented by browser-safe front, top, and position vectors.")], 18, "UpdatePlacement"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnModified"]], 0, void 0, CjsModel));
  }
  /** Native AkSoundPosition replacement; not part of Blue serialization. */
  value = (_initProto(this), Object.freeze({
    front: vec3.fromValues(0, 0, 1),
    top: vec3.fromValues(0, 1, 0),
    position: vec3.create()
  }));

  /** Carbon IBluePlacementObserver method UpdatePlacement. */
  UpdatePlacement(front, top, position) {
    vec3.copy(this.value.front, front);
    vec3.copy(this.value.top, top);
    vec3.copy(this.value.position, position);
  }

  /** Carbon INotify method OnModified. */
  OnModified() {
    return true;
  }
  static {
    _initClass();
  }
}

export { _AudPosition as AudPosition };
//# sourceMappingURL=AudPosition.js.map
