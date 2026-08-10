// Source: E:\carbonengine\trinity\trinity\Curves\Tr2ScalarExprKeyCurve.h
// Source: E:\carbonengine\trinity\trinity\Curves\Tr2ScalarExprKeyCurve.cpp
import { num } from "@carbonenginejs/runtime-utils/num";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2CurveInterpolation } from "../enums.js";
import { Tr2ScalarExprKey } from "../key/Tr2ScalarExprKey.js";


/**
 * Keyed scalar curve whose key times, values and tangents are themselves
 * expressions re-evaluated on every sample, with optional cycling and reversed
 * playback over the key range.
 */
@type.define({
  className: "Tr2ScalarExprKeyCurve",
  family: "curves"
})
export class Tr2ScalarExprKeyCurve extends CjsModel
{
  @io.persist
  @type.uint32
  interpolation = Tr2CurveInterpolation.LINEAR;

  @io.read
  @type.float32
  currentValue = 0;

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.boolean
  cycle = false;

  @io.persist
  @type.boolean
  reversed = false;

  @io.persist
  @type.float32
  timeOffset = 0;

  @io.persist
  @type.float32
  timeScale = 1;

  @io.persist
  @type.list("Tr2ScalarExprKey")
  keys = [];

  startTangent = 0;

  endTangent = 0;

  /**
   * Initializes and sorts keys.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.#reEvaluateKeys();
    return true;
  }

  /**
   * Gets authored duration.
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    this.currentValue = this.GetValueAt(time);
  }

  /**
   * Updates and returns value.
   */
  Update(time)
  {
    this.currentValue = this.GetValueAt(time);
    return this.currentValue;
  }

  /**
   * Gets value at a time.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time)
  {
    if (!this.keys.length)
    {
      return 0;
    }
    this.#reEvaluateKeys();
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
      return this.#interpolate(time, null, first);
    }
    if (time >= Number(last.time))
    {
      return this.#interpolate(time, last, null);
    }
    let endKey = first;
    for (let i = 1; i < this.keys.length; i++)
    {
      const startKey = endKey;
      endKey = this.keys[i];
      if (Number(endKey.time) > time)
      {
        return this.#interpolate(time, startKey, endKey);
      }
    }
    return Number(last.value);
  }

  /**
   * Gets a key time.
   */
  @carbon.method
  @impl.implemented
  GetKeyTime(index)
  {
    return Number(this.keys[index]?.time ?? 0);
  }

  /**
   * Sets a key time.
   */
  @carbon.method
  @impl.implemented
  SetKeyTime(index, time)
  {
    if (this.keys[index])
    {
      this.keys[index].time = time;
    }
  }

  /**
   * Gets a key value.
   */
  @carbon.method
  @impl.implemented
  GetKeyValue(index)
  {
    return Number(this.keys[index]?.value ?? 0);
  }

  /**
   * Sets a key value.
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  GetKeyCount()
  {
    return this.keys.length;
  }

  /**
   * Gets a key interpolation value.
   */
  @carbon.method
  @impl.implemented
  GetKeyInterpolation(index)
  {
    return Number(this.keys[index]?.interpolation ?? 0);
  }

  /**
   * Sets a key interpolation value.
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  GetKeyLeftTangent(index)
  {
    const key = this.keys[index];
    return key ? key.left : this.startTangent;
  }

  /**
   * Sets a key left tangent.
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  GetKeyRightTangent(index)
  {
    const key = this.keys[index];
    return key ? key.right : this.endTangent;
  }

  /**
   * Sets a key right tangent.
   */
  @carbon.method
  @impl.implemented
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
  GetKeyTangent(index, left = false)
  {
    return left ? this.GetKeyLeftTangent(index) : this.GetKeyRightTangent(index);
  }

  /**
   * JS convenience tangent setter.
   */
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
   * Adds a key.
   */
  @carbon.method
  @impl.adapted
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
    this.keys.splice(index, 0, key);
    return index;
  }

  /**
   * Removes a key.
   */
  @carbon.method
  @impl.implemented
  RemoveKey(index)
  {
    this.keys.splice(index, 1);
  }

  /**
   * Sorts and re-evaluates keys.
   */
  @carbon.method
  @impl.adapted
  Sort()
  {
    this.#reEvaluateKeys();
  }

  /**
   * Re-evaluates every key's expressions in order, passing each key its
   * predecessor so expressions can reference prevKeyTime and prevKeyValue.
   */
  #reEvaluateKeys()
  {
    let previousKey = null;
    for (const key of this.keys)
    {
      key.ReEvaluate(previousKey);
      previousKey = key;
    }
  }

  /**
   * Converts caller time into curve-local time by applying timeScale and
   * timeOffset, reversing it when `reversed` is set and wrapping it into the
   * key-range length when `cycle` is set.
   */
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
   */
  #interpolate(time, lastKey, nextKey)
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
