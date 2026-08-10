import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_name, _init_extra_name, _init_value, _init_extra_value, _init_signedDistance, _init_extra_signedDistance, _init_distanceToClosest, _init_extra_distanceToClosest, _init_direction, _init_extra_direction, _init_sourceObject, _init_extra_sourceObject, _init_targetObject, _init_extra_targetObject, _init_sourcePosition, _init_extra_sourcePosition, _init_targetPosition, _init_extra_targetPosition;

/**
 * Scalar function reporting the distance between two tracked positions, either
 * the full separation or its projection onto a fixed direction, and optionally
 * signed by which side of that direction the target lies.
 */
let _Tr2DistanceTracker;
class Tr2DistanceTracker extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_value, _init_extra_value, _init_signedDistance, _init_extra_signedDistance, _init_distanceToClosest, _init_extra_distanceToClosest, _init_direction, _init_extra_direction, _init_sourceObject, _init_extra_sourceObject, _init_targetObject, _init_extra_targetObject, _init_sourcePosition, _init_extra_sourcePosition, _init_targetPosition, _init_extra_targetPosition, _initProto],
      c: [_Tr2DistanceTracker, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2DistanceTracker",
      family: "curves"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.float32], 16, "value"], [[io, io.persist, type, type.boolean], 16, "signedDistance"], [[io, io.persist, type, type.boolean], 16, "distanceToClosest"], [[io, io.persist, type, type.vec3], 16, "direction"], [[io, io.notify, io, io.persist, void 0, type.objectRef("ITriVectorFunction")], 16, "sourceObject"], [[io, io.notify, io, io.persist, void 0, type.objectRef("ITriVectorFunction")], 16, "targetObject"], [[io, io.persist, type, type.vec3], 16, "sourcePosition"], [[io, io.persist, type, type.vec3], 16, "targetPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"]], 0, void 0, CjsModel));
  }
  name = (_initProto(this), _init_name(this, ""));
  value = (_init_extra_name(this), _init_value(this, 0));
  signedDistance = (_init_extra_value(this), _init_signedDistance(this, true));
  distanceToClosest = (_init_extra_signedDistance(this), _init_distanceToClosest(this, true));
  direction = (_init_extra_distanceToClosest(this), _init_direction(this, vec3.create()));
  sourceObject = (_init_extra_direction(this), _init_sourceObject(this, null));
  targetObject = (_init_extra_sourceObject(this), _init_targetObject(this, null));
  sourcePosition = (_init_extra_targetObject(this), _init_sourcePosition(this, vec3.create()));
  targetPosition = (_init_extra_sourcePosition(this), _init_targetPosition(this, vec3.create()));
  #difference = (_init_extra_targetPosition(this), vec3.create());

  /**
   * Updates source and target positions, then recalculates distance.
   */
  UpdateValue(time) {
    if (this.sourceObject) {
      this.sourceObject.GetValueAt(time, this.sourcePosition);
    }
    if (this.targetObject) {
      this.targetObject.GetValueAt(time, this.targetPosition);
    }
    vec3.subtract(this.#difference, this.targetPosition, this.sourcePosition);
    const projection = vec3.dot(this.#difference, this.direction);
    if (this.distanceToClosest) {
      this.value = projection;
      if (!this.signedDistance) {
        this.value = Math.abs(this.value);
      }
      return;
    }
    this.value = vec3.length(this.#difference);
    if (this.signedDistance && projection < 0) {
      this.value = -this.value;
    }
  }

  /**
   * Refreshes the value after a notified source/target modification.
   */
  OnModified(options = {}) {
    const time = Number(options?.time ?? 0);
    this.UpdateValue(time);
    return true;
  }
  static {
    _initClass();
  }
}

export { _Tr2DistanceTracker as Tr2DistanceTracker };
//# sourceMappingURL=Tr2DistanceTracker.js.map
