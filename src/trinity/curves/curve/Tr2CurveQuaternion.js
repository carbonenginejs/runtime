// Source: trinity/trinity/Curves/Tr2CurveQuaternion.h
// Source: trinity/trinity/Curves/Tr2CurveQuaternion.cpp
import { ITriQuaternionFunction, ITriCurveLength, ITriFunction } from "#blue";
import { quat } from "#math/quat";
import { carbon, impl, edit, type } from "#schema";
import { Tr2CurveExtrapolation, Tr2CurveInterpolation } from "../enums.js";
import { Tr2CurveQuaternionKey } from "../key/Tr2CurveQuaternionKey.js";


/**
 * Keyed quaternion curve evaluated in seconds, with per-key interpolation and
 * independent extrapolation modes before the first and after the last key.
 * JavaScript keeps time-first output-buffer calls instead of native output-first overloads.
 */
@type.define({
  className: "Tr2CurveQuaternion",
  family: "curves"
})
@carbon.inherit(ITriCurveLength)
export class Tr2CurveQuaternion extends ITriQuaternionFunction
{
  /**
   * Quaternion key records containing time, rotation, identifier and interpolation mode.
   * @type {Tr2CurveQuaternionKey[]}
   */
  @edit.read
  @edit.persist
  @type.array({ kind: "rawStruct", className: "Tr2CurveQuaternionKey" })
  keys = [];

  /**
   * Authored curve label stored as native std::string.
   * @type {string}
   */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /**
   * Cached sampled quaternion in native x, y, z, w component order.
   * @type {Float32Array}
   */
  @edit.read
  @type.quat
  currentValue = quat.create();

  /**
   * Native Tr2CurveExtrapolation policy used before the first key.
   * @type {number}
   */
  @edit.readwrite
  @edit.persist
  @type.uint32
  @type.enum("trinity.Tr2CurveExtrapolation")
  extrapolationBefore = Tr2CurveExtrapolation.CLAMP;

  /**
   * Native Tr2CurveExtrapolation policy used after the last key.
   * @type {number}
   */
  @edit.readwrite
  @edit.persist
  @type.uint32
  @type.enum("trinity.Tr2CurveExtrapolation")
  extrapolationAfter = Tr2CurveExtrapolation.CLAMP;

  /**
   * Cached key-segment index used by the JavaScript lookup adapter.
   * @type {number}
   */
  _lastSegment = 0;

  /**
   * Updates the cached quaternion value for the supplied time.
   *
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    this.GetValueAt(time, this.currentValue);
  }

  /**
   * Updates the cached value and copies it into `out`.
   *
   * @param {number} time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @returns {Float32Array|number[]} The caller-owned quaternion output.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    this.UpdateValue(time);
    return quat.copy(out, this.currentValue);
  }

  /**
   * Gets the quaternion value at `time` into `out`.
   *
   * @param {number} time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @returns {Float32Array|number[]} The caller-owned quaternion output.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    return this.Evaluate(out, time);
  }

  /**
   * Returns the native identity quaternion derivative.
   *
   * @param {number} _time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @returns {Float32Array|number[]} The caller-owned quaternion output.
   */
  @carbon.method
  @impl.implemented
  GetValueDotAt(_time, out)
  {
    return quat.identity(out);
  }

  /**
   * Returns the native identity quaternion second derivative.
   *
   * @param {number} _time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @returns {Float32Array|number[]} The caller-owned quaternion output.
   */
  @carbon.method
  @impl.implemented
  GetValueDoubleDotAt(_time, out)
  {
    return quat.identity(out);
  }

  /**
   * Gets the last authored key time, or zero for an empty curve.
   *
   * @returns {number} The curve result.
   */
  @carbon.method
  @impl.implemented
  Length()
  {
    return this.keys.length ? this.keys[this.keys.length - 1].time : 0;
  }

  /**
   * Gets the authored curve name.
   *
   * @returns {string} The curve result.
   */
  @impl.custom
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the authored curve name.
   *
   * @param {string} name Authored curve name.
   * @returns {void}
   */
  @impl.custom
  SetName(name)
  {
    this.name = name;
  }

  /**
   * Gets the quaternion value at `time` into `out`.
   *
   * @param {number} time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @returns {Float32Array|number[]} The caller-owned quaternion output.
   */
  @carbon.method
  @impl.adapted
  GetValue(time, out)
  {
    return this.Evaluate(out, time);
  }

  /**
   * Borrows the live cached value; Carbon returns a quaternion value copy.
   *
   * @returns {Float32Array|number[]} The live cached quaternion storage.
   */
  @carbon.method
  @impl.adapted
  GetCurrentValue()
  {
    return this.currentValue;
  }

  /**
   * Sorts keys by authored time after key edits.
   *
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  OnKeysChanged()
  {
    this.keys.sort((a, b) => a.time - b.time);
    this._lastSegment = 0;
  }

  /**
   * Adds a quaternion key and refreshes key ordering.
   *
   * @param {number} time Time in seconds.
   * @param {Float32Array|number[]} value Curve parameter.
   * @param {number} [interpolation = Tr2CurveInterpolation.LINEAR] Curve parameter.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  AddKey(time, value, interpolation = Tr2CurveInterpolation.LINEAR)
  {
    const key = new Tr2CurveQuaternionKey();
    key.time = time;
    quat.copy(key.value, value);
    key.interpolation = interpolation;
    key.id = 0;
    this.keys.push(key);
    this.OnKeysChanged();
  }

  /**
   * Sets both before and after extrapolation modes.
   *
   * @param {number} extrapolation Curve parameter.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  SetExtrapolation(extrapolation)
  {
    this.extrapolationAfter = this.extrapolationBefore = extrapolation;
  }

  /**
   * Converts caller time into the authored key range according to extrapolation.
   *
   * @param {number} time Time in seconds.
   * @returns {number} The curve result.
   */
  @carbon.method
  @impl.adapted
  GetLocalTime(time)
  {
    if (!this.keys.length)
    {
      return 0;
    }
    const first = this.keys[0].time;
    const last = this.keys[this.keys.length - 1].time;
    const length = last - first;
    if (length === 0)
    {
      return first;
    }
    if (time < first)
    {
      const quotient = -(time - first) / length;
      const intPart = Math.trunc(quotient);
      let fracPart = quotient - intPart;
      if (this.extrapolationBefore === Tr2CurveExtrapolation.CYCLE)
      {
        fracPart = 1 - fracPart;
      }
      else if (intPart % 2 !== 0)
      {
        fracPart = 1 - fracPart;
      }
      return fracPart * length + first;
    }
    if (time < last)
    {
      return time;
    }
    const quotient = (time - first) / length;
    const intPart = Math.trunc(quotient);
    let fracPart = quotient - intPart;
    if (this.extrapolationAfter === Tr2CurveExtrapolation.MIRROR && intPart % 2 !== 0)
    {
      fracPart = 1 - fracPart;
    }
    return fracPart * length + first;
  }

  /**
   * Finds the key segment containing local time, updating the segment cache.
   *
   * @param {number} time Time in seconds.
   * @returns {number} The curve result.
   */
  @impl.custom
  FindSegment(time)
  {
    const count = this.keys.length;
    if (this._lastSegment + 1 < count)
    {
      let k0 = this.keys[this._lastSegment];
      let k1 = this.keys[this._lastSegment + 1];
      if (time >= k0.time && time < k1.time)
      {
        return this._lastSegment;
      }
      if (this._lastSegment + 2 < count)
      {
        k0 = this.keys[this._lastSegment + 1];
        k1 = this.keys[this._lastSegment + 2];
        if (time >= k0.time && time < k1.time)
        {
          this._lastSegment++;
          return this._lastSegment;
        }
      }
      if (this._lastSegment > 1)
      {
        k0 = this.keys[this._lastSegment - 1];
        k1 = this.keys[this._lastSegment];
        if (time >= k0.time && time < k1.time)
        {
          this._lastSegment--;
          return this._lastSegment;
        }
      }
    }
    for (let i = 0; i + 1 < count; i++)
    {
      const k0 = this.keys[i];
      const k1 = this.keys[i + 1];
      if (time >= k0.time && time < k1.time)
      {
        this._lastSegment = i;
        return this._lastSegment;
      }
    }
    this._lastSegment = count - 2;
    return this._lastSegment;
  }

  /**
   * Evaluates the quaternion curve with Carbon extrapolation and interpolation rules.
   *
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @param {number} time Time in seconds.
   * @returns {Float32Array|number[]} The caller-owned quaternion output.
   */
  @impl.custom
  Evaluate(out, time)
  {
    const count = this.keys.length;
    if (!count)
    {
      return quat.identity(out);
    }
    const firstKey = this.keys[0];
    const lastKey = this.keys[count - 1];
    if (count === 1)
    {
      return quat.copy(out, firstKey.value);
    }
    if (this.extrapolationBefore === Tr2CurveExtrapolation.CLAMP && time <= firstKey.time)
    {
      return quat.copy(out, firstKey.value);
    }
    if (this.extrapolationAfter === Tr2CurveExtrapolation.CLAMP && time >= lastKey.time)
    {
      return quat.copy(out, lastKey.value);
    }
    const localTime = this.GetLocalTime(time);
    const segment = this.FindSegment(localTime);
    return this.GetSegmentValue(out, localTime, this.keys[segment], this.keys[segment + 1]);
  }

  /**
   * Evaluates the value inside a key segment using the segment interpolation mode.
   *
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @param {number} time Time in seconds.
   * @param {Tr2CurveQuaternionKey} k0 Segment start key.
   * @param {Tr2CurveQuaternionKey} k1 Segment end key.
   * @returns {Float32Array|number[]} The caller-owned quaternion output.
   */
  @carbon.method
  @impl.adapted
  GetSegmentValue(out, time, k0, k1)
  {
    if (k0.interpolation === Tr2CurveInterpolation.CONSTANT)
    {
      return quat.copy(out, time === k1.time ? k1.value : k0.value);
    }
    const length = k1.time - k0.time;
    if (length === 0)
    {
      return quat.copy(out, k1.value);
    }
    return quat.slerp(out, k0.value, k1.value, (time - k0.time) / length);
  }

  /**
   * Class-local view of the native extrapolation chooser values.
   * @type {Object<string, number>}
   */
  static Tr2CurveExtrapolation = Tr2CurveExtrapolation;

}

// Native exposure ends at this concrete table (Tr2CurveQuaternion_Blue.cpp).
carbon.interfaceTable({
  interfaces: [Tr2CurveQuaternion, ITriQuaternionFunction, ITriFunction, ITriCurveLength],
  chainTo: null
})(Tr2CurveQuaternion);
