// Source: trinity/trinity/Curves/Tr2ScalarExprKeyCurve.h
// Source: trinity/trinity/Curves/Tr2ScalarExprKeyCurve.cpp
// Source: trinity/trinity/Curves/Tr2ScalarExprKeyCurve_Blue.cpp
import { num } from "#math/num";
import { BlueList, ITriFunction, IInitialize, ITriCurveLength } from "#blue";
import { meta, types } from "#schema";
import { Tr2CurveInterpolation } from "../enums.js";
import { Tr2ScalarExprKey } from "../key/Tr2ScalarExprKey.js";


/**
 * Keyed scalar curve whose key times, values and tangents are themselves
 * expressions re-evaluated on every sample, with optional cycling and reversed
 * playback over the key range.
 */
@meta.define({
  className: "Tr2ScalarExprKeyCurve",
  family: "curves"
})
@meta.carbon.inherit(IInitialize, ITriCurveLength)
export class Tr2ScalarExprKeyCurve extends ITriFunction
{
  /**
   * Authored name identifying the expression-key scalar curve.
   * @type {string}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  name = "";

  /**
   * Enables repeated sampling after remapped time passes the evaluated key range.
   * @type {boolean}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  cycle = false;

  /**
   * Enables the native reverse-playback branch over the evaluated key span.
   * @type {boolean}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  reversed = false;

  /**
   * Offset in seconds subtracted after dividing sample time by timeScale.
   * @type {number}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  timeOffset = 0;

  /**
   * Dimensionless divisor converting input seconds to curve-local time.
   * @type {number}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  timeScale = 1;

  /**
   * Scalar cached by UpdateValue or the JavaScript Update convenience; native float.
   * @type {number}
   */
  @meta.edit.read
  @types.float32
  currentValue = 0;

  /**
   * Default interpolation code used by AddKey and sampling without a preceding key. Native
   * choices are CONSTANT, LINEAR and HERMITE.
   * @type {number}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.enum("trinity.Tr2CurveInterpolation")
  interpolation = Tr2CurveInterpolation.LINEAR;

  /**
   * Owned expression keys in stored evaluation order; reevaluation can change their times, values
   * and tangents.
   * @type {BlueList<Tr2ScalarExprKey>}
   */
  @meta.edit.read
  @meta.edit.persist
  @types.list("Tr2ScalarExprKey")
  keys = new BlueList(Tr2ScalarExprKey, { className: "Tr2ScalarExprKey", listOps: 0 });

  /**
   * Live difference between the last and first stored key times, in seconds; zero for an empty
   * list. Reading this accessor does not reevaluate expressions.
   * @type {number}
   */
  @meta.property()
  @meta.edit.read
  @types.float32
  get length()
  {
    return this.Length();
  }

  /**
   * Native scalar fallback returned by GetKeyLeftTangent when the requested key is absent.
   * @type {number}
   */
  startTangent = 0;

  /**
   * Native scalar fallback returned by GetKeyRightTangent when the requested key is absent.
   * @type {number}
   */
  endTangent = 0;

  /**
   * Re-evaluates expressions in stored key order without sorting.
   */
  @meta.carbon.method
  @meta.impl.implemented
  Initialize()
  {
    this._reEvaluateKeys();
    return true;
  }

  /**
   * Gets authored duration.
   */
  @meta.carbon.method
  @meta.impl.implemented
  Length()
  {
    if (!this.keys.length)
    {
      return 0;
    }
    return Number(this.keys[this.keys.length - 1].time) - Number(this.keys[0].time);
  }

  /**
   * Updates cached value.
   */
  @meta.carbon.method
  @meta.impl.implemented
  UpdateValue(time)
  {
    this.currentValue = this.GetValueAt(time);
  }

  /**
   * JS convenience sample returning the cached value, unlike native void UpdateValue.
   */
  @meta.impl.custom
  Update(time)
  {
    this.currentValue = this.GetValueAt(time);
    return this.currentValue;
  }

  /**
   * Gets value at a time.
   * Adapted: JS Number arithmetic and the existing scalar Hermite helper replace
   * native float temporaries. Native key-value-based cycling/reversal is retained.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetValueAt(time)
  {
    if (!this.keys.length)
    {
      return 0;
    }
    this._reEvaluateKeys();
    const length = this.Length();
    time = time / this.timeScale - this.timeOffset;
    if (length <= 0 || time <= 0)
    {
      return Number(this.keys[0].value);
    }
    const first = this.keys[0];
    const last = this.keys[this.keys.length - 1];
    if (time > length + Number(first.time))
    {
      if (this.cycle)
      {
        time = Number(first.value) + (time - Number(first.value)) % length;
      }
      else
      {
        return Number(this.reversed ? first.value : last.value);
      }
    }
    if (this.reversed)
    {
      time = Number(first.value) + (length - (time - Number(first.value)));
    }
    if (time <= Number(first.time))
    {
      return this._interpolate(time, null, first);
    }
    if (time >= Number(last.time))
    {
      return this._interpolate(time, last, null);
    }
    let startKey = first;
    let endKey = first;
    for (let i = 1; i < this.keys.length; i++)
    {
      startKey = endKey;
      endKey = this.keys[i];
      if (Number(endKey.time) > time)
      {
        break;
      }
    }
    // Native comparisons all fail for NaN; it still samples the final segment.
    return this._interpolate(time, startKey, endKey);
  }

  /**
   * Gets a key time.
   * Adapted: retains the existing JS out-of-range zero fallback instead of native unchecked indexing.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetKeyTime(index)
  {
    return Number(this.keys[index]?.time ?? 0);
  }

  /**
   * Sets a key time.
   * Adapted: retains the existing JS out-of-range no-op instead of native unchecked indexing.
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetKeyTime(index, time)
  {
    if (this.keys[index])
    {
      this.keys[index].time = time;
    }
  }

  /**
   * Gets a key value.
   * Adapted: retains the existing JS out-of-range zero fallback instead of native unchecked indexing.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetKeyValue(index)
  {
    return Number(this.keys[index]?.value ?? 0);
  }

  /**
   * Sets a key value.
   * Adapted: retains the existing JS out-of-range no-op instead of native unchecked indexing.
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetKeyValue(index, value)
  {
    if (this.keys[index])
    {
      this.keys[index].value = value;
    }
  }

  /**
   * Gets the number of keys.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetKeyCount()
  {
    return this.keys.length;
  }

  /**
   * Gets a key interpolation value.
   * Adapted: retains the existing JS out-of-range zero fallback instead of native unchecked indexing.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetKeyInterpolation(index)
  {
    return Number(this.keys[index]?.interpolation ?? 0);
  }

  /**
   * Sets a key interpolation value.
   * Adapted: retains the existing JS out-of-range no-op instead of native unchecked indexing.
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetKeyInterpolation(index, interpolation)
  {
    if (this.keys[index])
    {
      this.keys[index].interpolation = interpolation;
    }
  }

  /**
   * Gets a key left tangent.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetKeyLeftTangent(index)
  {
    const key = this.keys[index];
    return key ? key.left : this.startTangent;
  }

  /**
   * Sets a key left tangent.
   */
  @meta.carbon.method
  @meta.impl.implemented
  SetKeyLeftTangent(index, tangent)
  {
    if (this.keys[index])
    {
      this.keys[index].left = tangent;
    }
  }

  /**
   * Gets a key right tangent.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetKeyRightTangent(index)
  {
    const key = this.keys[index];
    return key ? key.right : this.endTangent;
  }

  /**
   * Sets a key right tangent.
   */
  @meta.carbon.method
  @meta.impl.implemented
  SetKeyRightTangent(index, tangent)
  {
    if (this.keys[index])
    {
      this.keys[index].right = tangent;
    }
  }

  /**
   * JS convenience tangent accessor.
   */
  @meta.impl.custom
  GetKeyTangent(index, left = false)
  {
    return left ? this.GetKeyLeftTangent(index) : this.GetKeyRightTangent(index);
  }

  /**
   * JS convenience tangent setter.
   */
  @meta.impl.custom
  SetKeyTangent(index, value, left = false)
  {
    if (left)
    {
      this.SetKeyLeftTangent(index, value);
    }
    else
    {
      this.SetKeyRightTangent(index, value);
    }
  }

  /**
   * Adds a key through the native typed list mutation surface.
   * Adapted: construction uses new and retains JS optional defaults and the existing
   * insertion scan (NaN inserts first); native instance creation can fail.
   */
  @meta.carbon.method
  @meta.impl.adapted
  AddKey(time, value, leftTangent = 0, rightTangent = 0, interpolation = this.interpolation)
  {
    let index = 0;
    while (index < this.keys.length && Number(this.keys[index].time) <= time)
    {
      index++;
    }
    const key = new Tr2ScalarExprKey();
    key.time = time;
    key.value = value;
    key.left = leftTangent;
    key.right = rightTangent;
    key.interpolation = interpolation;
    this.keys.Insert(index, key);
    return index;
  }

  /**
   * Removes a key through the native typed list mutation surface.
   * Adapted: invalid JS indexes are ignored; a negative index must not become the
   * BlueList clear sentinel because the native method receives an unsigned index.
   */
  @meta.carbon.method
  @meta.impl.adapted
  RemoveKey(index)
  {
    if (Number.isInteger(index) && index >= 0) this.keys.Remove(index);
  }

  /**
   * Re-evaluates expressions; the native editor compatibility name does not sort.
   */
  @meta.carbon.method
  @meta.impl.implemented
  Sort()
  {
    this._reEvaluateKeys();
  }

  /**
   * Re-evaluates every key's expressions in order, passing each key its
   * predecessor so expressions can reference prevKeyTime and prevKeyValue.
   */
  @meta.impl.implemented
  _reEvaluateKeys()
  {
    let previousKey = null;
    for (const key of this.keys)
    {
      key.UpdateValues(previousKey);
      previousKey = key;
    }
  }

  /**
   * JS convenience conversion, separate from the native key-value-based sample gates.
   * Converts caller time into curve-local time by applying timeScale and
   * timeOffset, reversing it when `reversed` is set and wrapping it into the
   * key-range length when `cycle` is set.
   */
  @meta.impl.custom
  GetLocalTime(time)
  {
    const length = this.Length();
    let localTime = time / this.timeScale - this.timeOffset;
    if (this.reversed)
    {
      localTime = length - localTime;
    }
    if (this.cycle && length > 0)
    {
      localTime %= length;
      if (localTime < 0)
      {
        localTime += length;
      }
    }
    return localTime;
  }

  /**
   * Interpolates between two adjacent keys using the left key's mode; a null key
   * on either side means the sample lies outside the key range and that end is
   * held flat at the present key's value.
   * Adapted: JS Number arithmetic and a scalar return replace native float/out storage;
   * Hermite uses the existing equivalent scalar helper.
   */
  @meta.impl.adapted
  _interpolate(time, lastKey, nextKey)
  {
    let deltaTime = this.Length();
    let startValue = Number(this.keys[0].value);
    let endValue = Number(this.keys[this.keys.length - 1].value);
    let interpolation = this.interpolation;
    if (lastKey)
    {
      interpolation = Number(lastKey.interpolation);
      time -= Number(lastKey.time);
    }
    switch (interpolation)
    {
      case Tr2CurveInterpolation.LINEAR:
        if (lastKey && nextKey)
        {
          startValue = Number(lastKey.value);
          endValue = Number(nextKey.value);
          deltaTime = Number(nextKey.time) - Number(lastKey.time);
        }
        else if (!lastKey && nextKey)
        {
          startValue = Number(nextKey.value);
          endValue = Number(nextKey.value);
          deltaTime = Number(nextKey.time);
        }
        else if (lastKey && !nextKey)
        {
          startValue = Number(lastKey.value);
          endValue = Number(lastKey.value);
          deltaTime = this.Length() - Number(lastKey.time);
        }
        return startValue + (endValue - startValue) * (time / deltaTime);
      case Tr2CurveInterpolation.HERMITE:
        {
          let inTangent = 0;
          let outTangent = 0;
          if (lastKey && nextKey)
          {
            startValue = Number(lastKey.value);
            inTangent = Number(lastKey.right);
            endValue = Number(nextKey.value);
            outTangent = Number(nextKey.left);
            deltaTime = Number(nextKey.time) - Number(lastKey.time);
          }
          else if (!lastKey && nextKey)
          {
            startValue = Number(nextKey.value);
            endValue = Number(nextKey.value);
            outTangent = Number(nextKey.left);
            deltaTime = Number(nextKey.time);
          }
          else if (lastKey && !nextKey)
          {
            startValue = Number(lastKey.value);
            endValue = Number(lastKey.value);
            inTangent = Number(lastKey.right);
            deltaTime = this.Length() - Number(lastKey.time);
          }
          return num.cubicHermite(startValue, inTangent, endValue, outTangent, time / deltaTime);
        }
      default:
        return Number(this.keys[0].value);
    }
  }
}

// Native exposure maps the three contracts without the concrete class.
meta.carbon.interfaceTable({
  interfaces: [ITriFunction, IInitialize, ITriCurveLength],
  chainTo: null
})(Tr2ScalarExprKeyCurve);
