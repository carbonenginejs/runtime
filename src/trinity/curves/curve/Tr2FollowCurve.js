// Source: trinity/trinity/Curves/Tr2FollowCurve.h
// Source: trinity/trinity/Curves/Tr2FollowCurve.cpp
// Source: trinity/trinity/Curves/Tr2FollowCurve_Blue.cpp
import { vec3 } from "#math/vec3";
import { BlueList, ITriFunction, ITriVectorFunction, IListNotify } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";
import { ITr2FollowCurveKey } from "../ITr2FollowCurveKey.js";
import { meta } from "#schema";
import { Tr2FollowCurveKeyInterpolation } from "../enums.js";


/**
 * Vector curve interpolated through an ordered list of follow-curve keys, each
 * supplying its own position, tangents and interpolation for the segment that
 * follows it.
 */
@meta.define({
  className: "Tr2FollowCurve",
  family: "curves"
})
@meta.blue.inherit(IListNotify)
export class Tr2FollowCurve extends ITriVectorFunction
{
  /**
   * Authored name identifying the follow curve.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /**
   * Owned follow keys supplying positions, tangents and segment interpolation. Insertion and
   * removal notifications sort them by key time in seconds.
   * @type {BlueList<ITr2FollowCurveKey>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITr2FollowCurveKey")
  keys = new BlueList(ITr2FollowCurveKey, { className: null, listOps: 0 });

  /**
   * Cached three-component position from the latest UpdateValue or Update.
   * @type {Float32Array}
   */
  @meta.blue.read
  @meta.type.vec3
  currentValue = vec3.create();

  /**
   * Reusable JavaScript scratch position sampled from the segment's starting key.
   * @type {Float32Array}
   */
  _keyValue0 = vec3.create();

  /**
   * Reusable JavaScript scratch position sampled from the segment's ending key.
   * @type {Float32Array}
   */
  _keyValue1 = vec3.create();

  /**
   * Reusable JavaScript scratch buffer receiving the ending key's unscaled left tangent.
   * @type {Float32Array}
   */
  _leftTangent = vec3.create();

  /**
   * Reusable JavaScript scratch buffer receiving the starting key's unscaled right tangent.
   * @type {Float32Array}
   */
  _rightTangent = vec3.create();

  /**
   * JavaScript scratch holding the starting key's right tangent multiplied by segment duration
   * for Hermite interpolation.
   * @type {Float32Array}
   */
  _inTangent = vec3.create();

  /**
   * JavaScript scratch holding the ending key's left tangent multiplied by segment duration for
   * Hermite interpolation.
   * @type {Float32Array}
   */
  _outTangent = vec3.create();

  /** Installs the native list observer after the owned key list has been created. */
  constructor()
  {
    super();
    this.keys.SetNotify(this);
  }

  /**
   * Updates the cached vector value for the supplied time.
   * Adapted: the existing JS vector output buffer replaces native value assignment.
   */
  @meta.blue.method
  @meta.adapted
  UpdateValue(time)
  {
    this.GetValue(time, this.currentValue);
  }

  /**
   * Updates the cached value and copies it into `out`.
   * Adapted: retains JS time-first/output-last arguments and numeric seconds;
   * native Be::Time and double overloads share this seconds-based entry point.
   */
  @meta.blue.method
  @meta.adapted
  Update(time, out)
  {
    this.UpdateValue(time);
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Gets the vector value at `time` into `out`.
   * Adapted: retains JS time-first/output-last arguments, numeric seconds and
   * caller-owned vectors instead of native overloads/value returns.
   */
  @meta.blue.method
  @meta.adapted
  GetValueAt(time, out)
  {
    return this.GetValue(time, out);
  }

  /**
   * Native first-derivative no-op leaves output untouched; JS keeps time first.
   */
  @meta.blue.method
  @meta.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * Native second-derivative no-op leaves output untouched; JS keeps time first.
   */
  @meta.blue.method
  @meta.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Native interpolated-position no-op leaves output untouched; JS keeps time first.
   */
  @meta.blue.method
  @meta.noop
  InterpolatedPosition(_time, out)
  {
    return out;
  }

  /**
   * Gets the vector value at `time` into `out`.
   * Adapted: retains JS time-first/output-last arguments, numeric seconds and
   * caller-owned vectors instead of native overloads/value returns.
   */
  @meta.blue.method
  @meta.adapted
  GetValue(time, out)
  {
    let currentKey = null;
    let nextKey = null;
    for (const key of this.keys)
    {
      if (time < key.GetTime())
      {
        nextKey = key;
        break;
      }
      currentKey = key;
    }
    if (nextKey && currentKey)
    {
      return this.GetSegmentValue(out, time, currentKey, nextKey);
    }
    if (currentKey)
    {
      return currentKey.GetValue(out);
    }
    return vec3.zero(out);
  }

  /**
   * JS helper for native OnListModified's stable, in-place ordering.
   * Keeps the owned list and its observer; equal keys retain their stored order.
   */
  @meta.ours
  Sort()
  {
    // Native stable_sort compares keys directly and does not notify the list.
    this.keys.sort((a, b) => a.GetTime() < b.GetTime() ? -1 : b.GetTime() < a.GetTime() ? 1 : 0);
  }

  /**
   * Handles a Carbon list-modified notification.
   */
  @meta.blue.method
  @meta.implemented
  OnListModified(event, _key, _key2, _value, list)
  {
    if (list !== this.keys) return;
    switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
    {
      case BLUELISTEVENT.BELIST_REMOVED:
      case BLUELISTEVENT.BELIST_INSERTED:
        this.Sort();
        break;
      default:
        break;
    }
  }

  /**
   * Evaluates the native key segment into `out`.
   * Adapted: caller-owned vectors and JS Number arithmetic replace native vector
   * returns/float temporaries; direct key contract calls remain required.
   */
  @meta.blue.method
  @meta.adapted
  GetSegmentValue(out, time, k0, k1)
  {
    switch (k0.GetInterpolationType())
    {
      case Tr2FollowCurveKeyInterpolation.CONSTANT:
        return time === k1.GetTime() ? k1.GetValue(out) : k0.GetValue(out);
      case Tr2FollowCurveKeyInterpolation.LINEAR:
        if (k1.GetTime() === k0.GetTime())
        {
          return k1.GetValue(out);
        }
        return vec3.lerp(out, k0.GetValue(this._keyValue0), k1.GetValue(this._keyValue1), (time - k0.GetTime()) / (k1.GetTime() - k0.GetTime()));
      case Tr2FollowCurveKeyInterpolation.HERMITE:
        return this.GetHermiteSegmentValue(out, time, k0, k1);
      default:
        return vec3.zero(out);
    }
  }

  /**
   * JS helper for the native GetSegmentValue Hermite branch, using scratch
   * vectors and the existing equivalent vector Hermite helper.
   */
  @meta.ours
  GetHermiteSegmentValue(out, time, k0, k1)
  {
    const length = k1.GetTime() - k0.GetTime();
    if (length === 0)
    {
      return k1.GetValue(out);
    }
    vec3.scale(this._inTangent, k0.GetRightTangent(this._rightTangent), length);
    vec3.scale(this._outTangent, k1.GetLeftTangent(this._leftTangent), length);
    return vec3.hermite(out, k0.GetValue(this._keyValue0), this._inTangent, this._outTangent, k1.GetValue(this._keyValue1), (time - k0.GetTime()) / length);
  }
}

// IListNotify is native C++ inheritance, deliberately absent from its QI table.
meta.blue.interfaceTable({
  interfaces: [ITriVectorFunction, ITriFunction],
  chainTo: null
})(Tr2FollowCurve);
