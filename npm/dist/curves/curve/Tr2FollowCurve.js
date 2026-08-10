import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2FollowCurveKeyInterpolation } from '../enums.js';

let _initProto, _initClass, _init_currentValue, _init_extra_currentValue, _init_keys, _init_extra_keys, _init_name, _init_extra_name;

/**
 * Vector curve interpolated through an ordered list of follow-curve keys, each
 * supplying its own position, tangents and interpolation for the segment that
 * follows it.
 */
let _Tr2FollowCurve;
class Tr2FollowCurve extends CjsModel {
  static {
    ({
      e: [_init_currentValue, _init_extra_currentValue, _init_keys, _init_extra_keys, _init_name, _init_extra_name, _initProto],
      c: [_Tr2FollowCurve, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2FollowCurve",
      family: "curves"
    })], [[[io, io.read, type, type.vec3], 16, "currentValue"], [[io, io.persist, void 0, type.list("ITr2FollowCurveKey")], 16, "keys"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "InterpolatedPosition"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnListModified"]], 0, void 0, CjsModel));
  }
  currentValue = (_initProto(this), _init_currentValue(this, vec3.create()));
  keys = (_init_extra_currentValue(this), _init_keys(this, []));
  name = (_init_extra_keys(this), _init_name(this, ""));
  #keyValue0 = (_init_extra_name(this), vec3.create());
  #keyValue1 = vec3.create();
  #leftTangent = vec3.create();
  #rightTangent = vec3.create();
  #inTangent = vec3.create();
  #outTangent = vec3.create();

  /**
   * Updates the cached vector value for the supplied time.
   */
  UpdateValue(time) {
    this.GetValueAt(time, this.currentValue);
  }

  /**
   * Updates the cached value and copies it into `out`.
   */
  Update(time, out) {
    this.UpdateValue(time);
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Gets the vector value at `time` into `out`.
   */
  GetValueAt(time, out) {
    let currentKey = null;
    let nextKey = null;
    for (const key of this.keys) {
      if (time < key.GetTime()) {
        nextKey = key;
        break;
      }
      currentKey = key;
    }
    if (nextKey && currentKey) {
      return this.GetSegmentValue(out, time, currentKey, nextKey);
    }
    if (currentKey) {
      return currentKey.GetValue(out);
    }
    return vec3.zero(out);
  }

  /**
   * Derivative stub retained for Carbon interface compatibility.
   */
  GetValueDotAt(_time, out) {
    return out;
  }

  /**
   * Second-derivative stub retained for Carbon interface compatibility.
   */
  GetValueDoubleDotAt(_time, out) {
    return out;
  }

  /**
   * Position interpolation stub retained for Carbon interface compatibility.
   */
  InterpolatedPosition(_time, out) {
    return out;
  }

  /**
   * Gets the vector value at `time` into `out`.
   */
  GetValue(time, out) {
    return this.GetValueAt(time, out);
  }

  /**
   * Sorts keys by authored time after list edits.
   */
  Sort() {
    this.keys = this.keys.map((key, index) => ({
      key,
      index
    })).sort((a, b) => a.key.GetTime() - b.key.GetTime() || a.index - b.index).map(entry => entry.key);
  }

  /**
   * Handles a Carbon list-modified notification.
   */
  OnListModified() {
    this.Sort();
  }

  /**
   * Evaluates a key segment into `out`.
   */
  GetSegmentValue(out, time, k0, k1) {
    switch (k0.GetInterpolationType()) {
      case Tr2FollowCurveKeyInterpolation.CONSTANT:
        return time === k1.GetTime() ? k1.GetValue(out) : k0.GetValue(out);
      case Tr2FollowCurveKeyInterpolation.LINEAR:
        if (k1.GetTime() === k0.GetTime()) {
          return k1.GetValue(out);
        }
        return vec3.lerp(out, k0.GetValue(this.#keyValue0), k1.GetValue(this.#keyValue1), (time - k0.GetTime()) / (k1.GetTime() - k0.GetTime()));
      case Tr2FollowCurveKeyInterpolation.HERMITE:
        return this.GetHermiteSegmentValue(out, time, k0, k1);
      default:
        return vec3.zero(out);
    }
  }

  /**
   * Evaluates a Hermite segment into `out`.
   */
  GetHermiteSegmentValue(out, time, k0, k1) {
    const length = k1.GetTime() - k0.GetTime();
    if (length === 0) {
      return k1.GetValue(out);
    }
    vec3.scale(this.#inTangent, k0.GetRightTangent(this.#rightTangent), length);
    vec3.scale(this.#outTangent, k1.GetLeftTangent(this.#leftTangent), length);
    return vec3.hermite(out, k0.GetValue(this.#keyValue0), this.#inTangent, this.#outTangent, k1.GetValue(this.#keyValue1), (time - k0.GetTime()) / length);
  }
  static {
    _initClass();
  }
}

export { _Tr2FollowCurve as Tr2FollowCurve };
//# sourceMappingURL=Tr2FollowCurve.js.map
