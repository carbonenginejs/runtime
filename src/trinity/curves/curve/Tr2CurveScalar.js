// Source: trinity/trinity/Curves/Tr2CurveScalar.h
// Source: trinity/trinity/Curves/Tr2CurveScalar.cpp
import { ITriScalarFunction, ITriCurveLength, ITriFunction } from "#blue";
import { meta } from "#schema";
import { num } from "#math/num";
import { Tr2CurveExtrapolation, Tr2CurveInterpolation, Tr2CurveTangentType } from "../enums.js";
import { Tr2CurveScalarKey } from "../key/Tr2CurveScalarKey.js";


/**
 * Keyed scalar curve evaluated in seconds, with per-key constant, linear or
 * Hermite interpolation and independent clamp, linear, cycle or mirror
 * extrapolation before the first and after the last key.
 */
@meta.define({
  className: "Tr2CurveScalar",
  family: "curves"
})
@meta.blue.inherit(ITriCurveLength)
export class Tr2CurveScalar extends ITriScalarFunction
{
  /**
   * Computes an AUTO key's tangent as the time-weighted blend of the incoming
   * and outgoing secant slopes; a zero-length interval on either side
   * contributes a slope of 0.
   *
   * @param {number} prevTime Curve parameter.
   * @param {number} prevValue Curve parameter.
   * @param {number} time Time in seconds.
   * @param {number} value Curve parameter.
   * @param {number} nextTime Curve parameter.
   * @param {number} nextValue Curve parameter.
   * @returns {number} The curve result.
   */
  @meta.adapted
  static getAutoTangent(prevTime, prevValue, time, value, nextTime, nextValue)
  {
    let left = 0;
    if (time - prevTime > num.EPSILON)
    {
      left = (value - prevValue) / (time - prevTime);
    }
    let right = 0;
    if (nextTime - time > num.EPSILON)
    {
      right = (nextValue - value) / (nextTime - time);
    }
    const x = (time - prevTime) / (nextTime - prevTime);
    return left * (1 - x) + right * x;
  }

  /**
   * Computes an AUTO_CLAMP key's tangent, returning 0 at a local extremum so the
   * curve does not overshoot, and otherwise damping the through-slope by how
   * close the key sits to its neighbours.
   *
   * @param {number} prevTime Curve parameter.
   * @param {number} prevValue Curve parameter.
   * @param {number} _time Time in seconds.
   * @param {number} value Curve parameter.
   * @param {number} nextTime Curve parameter.
   * @param {number} nextValue Curve parameter.
   * @returns {number} The curve result.
   */
  @meta.adapted
  static getAutoClampedTangent(prevTime, prevValue, _time, value, nextTime, nextValue)
  {
    if (value < prevValue && value < nextValue || value > prevValue && value > nextValue)
    {
      return 0;
    }
    const valueDiff = Math.abs(prevValue - nextValue);
    if (valueDiff === 0)
    {
      return 0;
    }
    let keyDistance = Math.abs(value - prevValue) / valueDiff;
    keyDistance = num.min(1, num.min(keyDistance, 1 - keyDistance) * 6);
    return (nextValue - prevValue) / (nextTime - prevTime) * keyDistance;
  }

  /**
   * Evaluates one segment at a local time using the interpolation mode of its
   * left key; Hermite tangents are authored per unit time and scaled by the
   * segment length here.
   *
   * @param {number} time Time in seconds.
   * @param {Tr2CurveScalarKey} k0 Segment start key.
   * @param {Tr2CurveScalarKey} k1 Segment end key.
   * @returns {number} The curve result.
   */
  @meta.adapted
  static getSegmentValue(time, k0, k1)
  {
    switch (k0.interpolation)
    {
      case Tr2CurveInterpolation.CONSTANT:
        return time === k1.time ? k1.value : k0.value;
      case Tr2CurveInterpolation.LINEAR:
        return k1.time === k0.time ? k1.value : k0.value + (k1.value - k0.value) * (time - k0.time) / (k1.time - k0.time);
      case Tr2CurveInterpolation.HERMITE:
        {
          const length = k1.time - k0.time;
          if (length === 0)
          {
            return k1.value;
          }
          return num.cubicHermite(k0.value, k0.rightTangent * length, k1.value, k1.leftTangent * length, (time - k0.time) / length);
        }
      default:
        return 0;
    }
  }

  /**
   * Evaluates the slope of one segment at a local time; constant segments report
   * 0 and Hermite segments report the cubic derivative rescaled back to
   * per-unit-time.
   *
   * @param {number} time Time in seconds.
   * @param {Tr2CurveScalarKey} k0 Segment start key.
   * @param {Tr2CurveScalarKey} k1 Segment end key.
   * @returns {number} The curve result.
   */
  @meta.adapted
  static getSegmentTangent(time, k0, k1)
  {
    switch (k0.interpolation)
    {
      case Tr2CurveInterpolation.CONSTANT:
        return 0;
      case Tr2CurveInterpolation.LINEAR:
        return (k1.value - k0.value) / (k1.time - k0.time);
      case Tr2CurveInterpolation.HERMITE:
        {
          const length = k1.time - k0.time;
          if (length === 0)
          {
            return k1.rightTangent;
          }
          const s = (time - k0.time) / length;
          return num.cubicHermiteDerivative(k0.value, k0.rightTangent * length, k1.value, k1.leftTangent * length, s) / length;
        }
      default:
        return 0;
    }
  }

  /**
   * Folds a scaled time back into the [first, last] key range: CYCLE repeats the
   * range and MIRROR reflects it on alternate repeats, with a zero-length range
   * collapsing to the first key time.
   *
   * @param {number} scaledTime Curve parameter.
   * @param {number} first Curve parameter.
   * @param {number} last Curve parameter.
   * @param {number} extrapolationBefore Curve parameter.
   * @param {number} extrapolationAfter Curve parameter.
   * @returns {number} The curve result.
   */
  @meta.ours
  static getWrappedLocalTime(scaledTime, first, last, extrapolationBefore, extrapolationAfter)
  {
    const length = last - first;
    if (length === 0)
    {
      return first;
    }
    if (scaledTime < first)
    {
      const quotient = -(scaledTime - first) / length;
      const intPart = num.roundToZero(quotient);
      let fracPart = quotient - intPart;
      if (extrapolationBefore === Tr2CurveExtrapolation.CYCLE)
      {
        fracPart = 1 - fracPart;
      }
      else if (intPart % 2 !== 0)
      {
        fracPart = 1 - fracPart;
      }
      return fracPart * length + first;
    }
    if (scaledTime <= last)
    {
      return scaledTime;
    }
    const quotient = (scaledTime - first) / length;
    const intPart = num.roundToZero(quotient);
    let fracPart = quotient - intPart;
    if (extrapolationAfter === Tr2CurveExtrapolation.MIRROR && intPart % 2 !== 0)
    {
      fracPart = 1 - fracPart;
    }
    return fracPart * length + first;
  }

  /**
   * Scalar key records with time, value, tangents, identifier and interpolation settings.
   * @type {Tr2CurveScalarKey[]}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.array({ kind: "rawStruct", className: "Tr2CurveScalarKey" })
  keys = [];

  /**
   * Authored curve label stored as native std::string.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /**
   * Offset subtracted after dividing incoming seconds by timeScale.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  timeOffset = 0;

  /**
   * Time divisor used by the native time / timeScale - timeOffset mapping.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  timeScale = 1;

  /**
   * Cached scalar produced by the most recent curve update.
   * @type {number}
   */
  @meta.blue.read
  @meta.type.float32
  currentValue = 0;

  /**
   * Native Tr2CurveExtrapolation policy used before the first key.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  @meta.type.enum("trinity.Tr2CurveExtrapolation")
  extrapolationBefore = Tr2CurveExtrapolation.CLAMP;

  /**
   * Native Tr2CurveExtrapolation policy used after the last key.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  @meta.type.enum("trinity.Tr2CurveExtrapolation")
  extrapolationAfter = Tr2CurveExtrapolation.CLAMP;

  /**
   * Cached key-segment index used by the JavaScript lookup adapter.
   * @type {number}
   */
  _lastSegment = 0;

  /**
   * Updates the cached scalar value for the supplied time.
   *
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  UpdateValue(time)
  {
    this.currentValue = this.GetValue(time);
  }

  /**
   * Updates and returns the cached scalar value for the supplied time.
   *
   * @param {number} time Time in seconds.
   * @returns {number} The curve result.
   */
  @meta.blue.method
  @meta.implemented
  Update(time)
  {
    this.currentValue = this.GetValue(time);
    return this.currentValue;
  }

  /**
   * Gets the scalar value at the supplied time.
   *
   * @param {number} time Time in seconds.
   * @returns {number} The curve result.
   */
  @meta.blue.method
  @meta.implemented
  GetValueAt(time)
  {
    return this.GetValue(time);
  }

  /**
   * Sets the curve time scale used by `GetScaledTime`.
   *
   * @param {number} scale Curve parameter.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  ScaleTime(scale)
  {
    this.timeScale = scale;
  }

  /**
   * Gets the last authored key time, or zero for an empty curve.
   *
   * @returns {number} The curve result.
   */
  @meta.blue.method
  @meta.implemented
  Length()
  {
    return this.keys.length ? this.keys[this.keys.length - 1].time : 0;
  }

  /**
   * Gets the authored curve name.
   *
   * @returns {string} The curve result.
   */
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = name;
  }

  /**
   * Evaluates the scalar curve with Carbon extrapolation and interpolation rules.
   *
   * @param {number} time Time in seconds.
   * @returns {number} The curve result.
   */
  @meta.blue.method
  @meta.implemented
  GetValue(time)
  {
    const count = this.keys.length;
    if (!count)
    {
      return 0;
    }
    const scaledTime = this.GetScaledTime(time);
    const firstKey = this.keys[0];
    const lastKey = this.keys[count - 1];
    if (this.extrapolationBefore === Tr2CurveExtrapolation.LINEAR && scaledTime < firstKey.time)
    {
      return firstKey.value - (firstKey.time - scaledTime) * firstKey.leftTangent;
    }
    if (this.extrapolationAfter === Tr2CurveExtrapolation.LINEAR && scaledTime > lastKey.time)
    {
      return lastKey.value + (scaledTime - lastKey.time) * lastKey.rightTangent;
    }
    if (count === 1)
    {
      return firstKey.value;
    }
    if (this.extrapolationBefore === Tr2CurveExtrapolation.CLAMP && scaledTime <= firstKey.time)
    {
      return firstKey.value;
    }
    if (this.extrapolationAfter === Tr2CurveExtrapolation.CLAMP && scaledTime >= lastKey.time)
    {
      return lastKey.value;
    }
    const localTime = this.GetLocalTime(time);
    const segment = this.FindSegment(localTime);
    return Tr2CurveScalar.getSegmentValue(localTime, this.keys[segment], this.keys[segment + 1]);
  }

  /**
   * Evaluates the scalar tangent with Carbon extrapolation and interpolation rules.
   *
   * @param {number} time Time in seconds.
   * @returns {number} The curve result.
   */
  @meta.blue.method
  @meta.implemented
  GetTangent(time)
  {
    const count = this.keys.length;
    if (!count)
    {
      return 0;
    }
    const scaledTime = this.GetScaledTime(time);
    const firstKey = this.keys[0];
    const lastKey = this.keys[count - 1];
    if (this.extrapolationBefore === Tr2CurveExtrapolation.LINEAR && scaledTime < firstKey.time)
    {
      return firstKey.leftTangent;
    }
    if (this.extrapolationAfter === Tr2CurveExtrapolation.LINEAR && scaledTime > lastKey.time)
    {
      return lastKey.rightTangent;
    }
    if (count === 1)
    {
      return firstKey.rightTangent;
    }
    if (this.extrapolationBefore === Tr2CurveExtrapolation.CLAMP && scaledTime <= firstKey.time)
    {
      return 0;
    }
    if (this.extrapolationAfter === Tr2CurveExtrapolation.CLAMP && scaledTime >= lastKey.time)
    {
      return 0;
    }
    const localTime = this.GetLocalTime(time);
    const segment = this.FindSegment(localTime, false);
    return Tr2CurveScalar.getSegmentTangent(localTime, this.keys[segment], this.keys[segment + 1]);
  }

  /**
   * Carbon-compatible alias for `GetTangent`.
   *
   * @param {number} time Time in seconds.
   * @returns {number} The curve result.
   */
  @meta.blue.method
  @meta.implemented
  GetTangentAt(time)
  {
    return this.GetTangent(time);
  }

  /**
   * Gets the last cached value.
   *
   * @returns {number} The curve result.
   */
  @meta.blue.method
  @meta.implemented
  GetCurrentValue()
  {
    return this.currentValue;
  }

  /**
   * Gets the time offset applied by `GetScaledTime`.
   *
   * @returns {number} The curve result.
   */
  @meta.blue.method
  @meta.implemented
  GetTimeOffset()
  {
    return this.timeOffset;
  }

  /**
   * Sets the time offset applied by `GetScaledTime`.
   *
   * @param {number} timeOffset Curve parameter.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  SetTimeOffset(timeOffset)
  {
    this.timeOffset = timeOffset;
  }

  /**
   * Gets the time scale applied by `GetScaledTime`.
   *
   * @returns {number} The curve result.
   */
  @meta.blue.method
  @meta.implemented
  GetTimeScale()
  {
    return this.timeScale;
  }

  /**
   * Sets the time scale applied by `GetScaledTime`.
   *
   * @param {number} timeScale Curve parameter.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  SetTimeScale(timeScale)
  {
    this.timeScale = timeScale;
  }

  /**
   * Checks whether the curve has no authored keys.
   *
   * @returns {boolean} Whether the curve has no keys.
   */
  @meta.blue.method
  @meta.implemented
  IsEmpty()
  {
    return this.keys.length === 0;
  }

  /**
   * Sorts keys and recomputes automatic tangents after key edits.
   *
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  OnKeysChanged()
  {
    this.keys.sort((a, b) => a.time - b.time);
    this._lastSegment = 0;
    for (let i = 0; i < this.keys.length; i++)
    {
      const key = this.keys[i];
      switch (key.tangentType)
      {
        case Tr2CurveTangentType.AUTO_CLAMP:
          if (i === 0 || i + 1 === this.keys.length)
          {
            key.leftTangent = 0;
            key.rightTangent = 0;
          }
          else
          {
            const tangent = Tr2CurveScalar.getAutoClampedTangent(this.keys[i - 1].time, this.keys[i - 1].value, key.time, key.value, this.keys[i + 1].time, this.keys[i + 1].value);
            key.leftTangent = tangent;
            key.rightTangent = tangent;
          }
          break;
        case Tr2CurveTangentType.AUTO:
          if (i === 0 || i + 1 === this.keys.length)
          {
            key.leftTangent = 0;
            key.rightTangent = 0;
          }
          else
          {
            const tangent = Tr2CurveScalar.getAutoTangent(this.keys[i - 1].time, this.keys[i - 1].value, key.time, key.value, this.keys[i + 1].time, this.keys[i + 1].value);
            key.leftTangent = tangent;
            key.rightTangent = tangent;
          }
          break;
        case Tr2CurveTangentType.FREE_JOINED:
          key.rightTangent = key.leftTangent;
          break;
      }
    }
  }

  /**
   * Adds a scalar key and refreshes key ordering and derived tangents.
   *
   * @param {number} time Time in seconds.
   * @param {number} value Curve parameter.
   * @param {number} [interpolation = Tr2CurveInterpolation.HERMITE] Curve parameter.
   * @param {number} [leftTangent = 0] Curve parameter.
   * @param {number} [rightTangent = 0] Curve parameter.
   * @param {number} [tangentType = Tr2CurveTangentType.AUTO_CLAMP] Curve parameter.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  AddKey(time, value, interpolation = Tr2CurveInterpolation.HERMITE, leftTangent = 0, rightTangent = 0, tangentType = Tr2CurveTangentType.AUTO_CLAMP)
  {
    const key = new Tr2CurveScalarKey();
    key.time = time;
    key.value = value;
    key.leftTangent = leftTangent;
    key.rightTangent = rightTangent;
    key.interpolation = interpolation;
    key.tangentType = tangentType;
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
  @meta.blue.method
  @meta.implemented
  SetExtrapolation(extrapolation)
  {
    this.extrapolationAfter = this.extrapolationBefore = extrapolation;
  }

  /**
   * Gets the mutable key list.
   *
   * @returns {Tr2CurveScalarKey[]} The curve result.
   */
  @meta.blue.method
  @meta.implemented
  GetKeys()
  {
    return this.keys;
  }

  /**
   * Applies a compact curve definition and refreshes derived key state.
   *
   * @param {{keys: Tr2CurveScalarKey[], keyCount: number, extrapolationBefore: number, extrapolationAfter: number}} definition Authored key range and extrapolation.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetDefinition(definition)
  {
    this.extrapolationBefore = definition.extrapolationBefore;
    this.extrapolationAfter = definition.extrapolationAfter;
    const records = definition.keys.slice(0, definition.keyCount).map(source =>
    {
      const key = new Tr2CurveScalarKey();
      key.time = source.time;
      key.value = source.value;
      key.leftTangent = source.leftTangent;
      key.rightTangent = source.rightTangent;
      key.id = source.id;
      key.interpolation = source.interpolation;
      key.tangentType = source.tangentType;
      return key;
    });
    this.keys.length = 0;
    for (const key of records) this.keys.push(key);
    this.OnKeysChanged();
  }

  /**
   * Gets a compact curve definition using the current key list.
   *
   * @returns {{keys: Tr2CurveScalarKey[], keyCount: number, extrapolationBefore: number, extrapolationAfter: number}} The curve result.
   */
  @meta.blue.method
  @meta.adapted
  GetDefinition()
  {
    return {
      keys: this.keys,
      keyCount: this.keys.length,
      extrapolationBefore: this.extrapolationBefore,
      extrapolationAfter: this.extrapolationAfter
    };
  }

  /**
   * Samples the curve into the destination buffer.
   *
   * @param {{width: number, stride: number, data: Float32Array|number[]}} destination Raster output and stride.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  Rasterize(destination)
  {
    for (let i = 0; i < destination.width; i++)
    {
      const t = destination.width === 1 ? 0.5 : i / (destination.width - 1);
      destination.data[i * destination.stride] = this.GetValue(t);
    }
  }

  /**
   * Converts caller time into curve-local scaled time.
   *
   * @param {number} time Time in seconds.
   * @returns {number} The curve result.
   */
  @meta.ours
  GetScaledTime(time)
  {
    return time / this.timeScale - this.timeOffset;
  }

  /**
   * Converts caller time into the authored key range according to extrapolation.
   *
   * @param {number} time Time in seconds.
   * @returns {number} The curve result.
   */
  @meta.blue.method
  @meta.adapted
  GetLocalTime(time)
  {
    if (!this.keys.length)
    {
      return 0;
    }
    const scaledTime = this.GetScaledTime(time);
    const first = this.keys[0].time;
    const last = this.keys[this.keys.length - 1].time;
    return Tr2CurveScalar.getWrappedLocalTime(scaledTime, first, last, this.extrapolationBefore, this.extrapolationAfter);
  }

  /**
   * Finds the key segment containing local time, optionally updating the segment cache.
   *
   * @param {number} time Time in seconds.
   * @param {boolean} [updateCache = true] Whether to retain the segment index.
   * @returns {number} The curve result.
   */
  @meta.ours
  FindSegment(time, updateCache = true)
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
          const segment = this._lastSegment + 1;
          if (updateCache)
          {
            this._lastSegment = segment;
          }
          return segment;
        }
      }
      if (this._lastSegment > 1)
      {
        k0 = this.keys[this._lastSegment - 1];
        k1 = this.keys[this._lastSegment];
        if (time >= k0.time && time < k1.time)
        {
          const segment = this._lastSegment - 1;
          if (updateCache)
          {
            this._lastSegment = segment;
          }
          return segment;
        }
      }
    }
    for (let i = 0; i + 1 < count; i++)
    {
      const k0 = this.keys[i];
      const k1 = this.keys[i + 1];
      if (time >= k0.time && time < k1.time)
      {
        if (updateCache)
        {
          this._lastSegment = i;
        }
        return i;
      }
    }
    if (updateCache)
    {
      this._lastSegment = count - 2;
    }
    return count - 2;
  }

  /**
   * One-shot static rasterization helper for compact curve definitions.
   *
   * @param {{width: number, stride: number, data: Float32Array|number[]}} destination Raster output and stride.
   * @param {{keys: Tr2CurveScalarKey[], keyCount: number, extrapolationBefore: number, extrapolationAfter: number}} definition Authored key range and extrapolation.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  static Rasterize(destination, definition)
  {
    this.rasterize(destination, definition);
  }

  /**
   * One-shot static rasterization helper for compact curve definitions.
   *
   * @param {{width: number, stride: number, data: Float32Array|number[]}} destination Raster output and stride.
   * @param {{keys: Tr2CurveScalarKey[], keyCount: number, extrapolationBefore: number, extrapolationAfter: number}} definition Authored key range and extrapolation.
   * @returns {void}
   */
  @meta.ours
  static rasterize(destination, definition)
  {
    const curve = new Tr2CurveScalar();
    curve.SetDefinition(definition);
    curve.Rasterize(destination);
  }

  /**
   * Class-local view of the native extrapolation chooser values.
   * @type {Object<string, number>}
   */
  static Tr2CurveExtrapolation = Tr2CurveExtrapolation;

}

// Native exposure ends at this concrete table (Tr2CurveScalar_Blue.cpp).
meta.blue.interfaceTable({
  interfaces: [Tr2CurveScalar, ITriScalarFunction, ITriFunction, ITriCurveLength],
  chainTo: null
})(Tr2CurveScalar);
