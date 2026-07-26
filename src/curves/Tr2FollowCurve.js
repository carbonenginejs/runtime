// Source: E:\carbonengine\trinity\trinity\Curves\Tr2FollowCurve.h
// Source: E:\carbonengine\trinity\trinity\Curves\Tr2FollowCurve.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2FollowCurveKeyInterpolation } from "./enums.js";


/**
 * Vector curve interpolated through an ordered list of follow-curve keys, each
 * supplying its own position, tangents and interpolation for the segment that
 * follows it.
 */
@type.define({
  className: "Tr2FollowCurve",
  family: "curves"
})
export class Tr2FollowCurve extends CjsModel
{
  @io.read
  @type.vec3
  currentValue = vec3.create();

  @io.persist
  @type.list("ITr2FollowCurveKey")
  keys = [];

  @io.persist
  @type.string
  name = "";

  #keyValue0 = vec3.create();

  #keyValue1 = vec3.create();

  #leftTangent = vec3.create();

  #rightTangent = vec3.create();

  #inTangent = vec3.create();

  #outTangent = vec3.create();

  /**
   * Updates the cached vector value for the supplied time.
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    this.GetValueAt(time, this.currentValue);
  }

  /**
   * Updates the cached value and copies it into `out`.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    this.UpdateValue(time);
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Gets the vector value at `time` into `out`.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
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
   * Derivative stub retained for Carbon interface compatibility.
   */
  @carbon.method
  @impl.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * Second-derivative stub retained for Carbon interface compatibility.
   */
  @carbon.method
  @impl.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Position interpolation stub retained for Carbon interface compatibility.
   */
  @carbon.method
  @impl.noop
  InterpolatedPosition(_time, out)
  {
    return out;
  }

  /**
   * Gets the vector value at `time` into `out`.
   */
  @carbon.method
  @impl.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }

  /**
   * Sorts keys by authored time after list edits.
   */
  Sort()
  {
    this.keys = this.keys.map((key, index) => ({
      key,
      index
    })).sort((a, b) => a.key.GetTime() - b.key.GetTime() || a.index - b.index).map(entry => entry.key);
  }

  /**
   * Handles a Carbon list-modified notification.
   */
  @carbon.method
  @impl.adapted
  OnListModified()
  {
    this.Sort();
  }

  /**
   * Evaluates a key segment into `out`.
   */
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
  GetHermiteSegmentValue(out, time, k0, k1)
  {
    const length = k1.GetTime() - k0.GetTime();
    if (length === 0)
    {
      return k1.GetValue(out);
    }
    vec3.scale(this.#inTangent, k0.GetRightTangent(this.#rightTangent), length);
    vec3.scale(this.#outTangent, k1.GetLeftTangent(this.#leftTangent), length);
    return vec3.hermite(out, k0.GetValue(this.#keyValue0), this.#inTangent, this.#outTangent, k1.GetValue(this.#keyValue1), (time - k0.GetTime()) / length);
  }
}
