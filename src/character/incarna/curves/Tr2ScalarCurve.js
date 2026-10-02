// Adapted from CCPWGL Tw2ScalarCurve2 (MIT, Copyright (c) 2020
// ccpgames rawrafox cppctamber) and corroborated by historical Tr2ScalarCurve
// Black records.
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { meta } from "#schema";
import { IncarnaScalarCurveInterpolation } from "./enums.js";
import { Tr2ScalarKey } from "./Tr2ScalarKey.js";

/**
 * Historical Curve2 scalar layout used by Incarna Black assets.
 *
 * This is distinct from the Trinity layer's current Carbon `Tr2CurveScalar`,
 * which owns the modern key, tangent, and extrapolation representation.
 */
@meta.define({ className: "Tr2ScalarCurve", family: "incarna" })
// Historical Incarna compatibility: loaded Curve2 keys must be sorted once.
// This explicit contract preserves the legacy asset behavior; it is not a
// declaration from the current Carbon curve exposure table.
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class Tr2ScalarCurve
{

  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.persist
  @meta.type.boolean
  cycle = false;

  @meta.blue.persist
  @meta.type.boolean
  reversed = false;

  @meta.blue.persist
  @meta.type.float32
  timeOffset = 0;

  @meta.blue.persist
  @meta.type.float32
  timeScale = 1;

  @meta.blue.persist
  @meta.type.float32
  startValue = 0;

  @meta.blue.readwrite
  @meta.type.float32
  currentValue = 0;

  @meta.blue.persist
  @meta.type.float32
  endValue = 0;

  @meta.blue.persist
  @meta.type.float32
  startTangent = 0;

  @meta.blue.persist
  @meta.type.float32
  endTangent = 0;

  @meta.blue.persist
  @meta.type.uint32
  @meta.type.enum("Interpolation")
  interpolation = IncarnaScalarCurveInterpolation.LINEAR;

  @meta.blue.persist
  @meta.type.list("Tr2ScalarKey")
  keys = [];

  @meta.blue.persist
  @meta.type.float32
  length = 0;

  /** Sorts keys and reconciles a last key beyond the authored end. */
  Sort()
  {
    if (!this.keys.length) return;
    this.keys.sort((a, b) => a.time - b.time);
    const last = this.keys[this.keys.length - 1];
    if (last.time <= this.length) return;

    const previousLength = this.length;
    const endValue = this.endValue;
    const endTangent = this.endTangent;
    this.length = last.time;
    this.endValue = last.value;
    this.endTangent = last.leftTangent;
    if (previousLength > 0)
    {
      last.time = previousLength;
      last.value = endValue;
      last.leftTangent = endTangent;
    }
  }

  /** Initializes derived key ordering. */
  Initialize()
  {
    this.Sort();
  }

  /** Gets the authored duration. */
  GetLength()
  {
    return this.length;
  }

  /** Updates the public binding value. */
  UpdateValue(time)
  {
    this.currentValue = this.GetValueAt(time);
  }

  /** Evaluates the historical curve. */
  GetValueAt(time)
  {
    time = time / this.timeScale + this.timeOffset;
    if (this.length <= 0 || time <= 0) return this.startValue;

    if (time > this.length)
    {
      if (this.cycle)
      {
        time %= this.length;
      }
      else if (this.reversed)
      {
        return this.startValue;
      }
      else
      {
        return this.endValue;
      }
    }

    if (this.reversed) time = this.length - time;
    if (!this.keys.length) return this.Interpolate(time, null, null);

    let startKey = this.keys[0];
    let endKey = this.keys[this.keys.length - 1];
    if (time <= startKey.time) return this.Interpolate(time, null, startKey);
    if (time >= endKey.time) return this.Interpolate(time, endKey, null);

    for (let i = 0; i + 1 < this.keys.length; i++)
    {
      startKey = this.keys[i];
      endKey = this.keys[i + 1];
      if (startKey.time <= time && endKey.time > time) break;
    }
    return this.Interpolate(time, startKey, endKey);
  }

  /** Evaluates one historical Curve2 segment. */
  Interpolate(time, lastKey, nextKey)
  {
    let startValue = this.startValue;
    let endValue = this.endValue;
    let startTangent = this.startTangent;
    let endTangent = this.endTangent;
    let interpolation = this.interpolation;
    let deltaTime = this.length;

    if (lastKey)
    {
      interpolation = lastKey.interpolation;
      time -= lastKey.time;
    }
    if (lastKey && nextKey)
    {
      startValue = lastKey.value;
      startTangent = lastKey.rightTangent;
      endValue = nextKey.value;
      endTangent = nextKey.leftTangent;
      deltaTime = nextKey.time - lastKey.time;
    }
    else if (nextKey)
    {
      endValue = nextKey.value;
      endTangent = nextKey.leftTangent;
      deltaTime = nextKey.time;
    }
    else if (lastKey)
    {
      startValue = lastKey.value;
      startTangent = lastKey.rightTangent;
      deltaTime = this.length - lastKey.time;
    }

    if (deltaTime === 0) return startValue;
    const t = time / deltaTime;
    if (interpolation === IncarnaScalarCurveInterpolation.LINEAR)
    {
      return startValue + (endValue - startValue) * t;
    }
    if (interpolation === IncarnaScalarCurveInterpolation.HERMITE)
    {
      const t2 = t * t;
      const t3 = t2 * t;
      const endWeight = -2 * t3 + 3 * t2;
      const startWeight = 1 - endWeight;
      const endTangentWeight = t3 - t2;
      const startTangentWeight = t + endTangentWeight - t2;
      return startValue * startWeight + endValue * endWeight
        + startTangent * startTangentWeight + endTangent * endTangentWeight;
    }
    return startValue;
  }

  static inputDimension = 1;
  static outputDimension = 1;
  static valueProperty = "currentValue";
  static curveType = 2;
  static Key = Tr2ScalarKey;
  static Interpolation = IncarnaScalarCurveInterpolation;

}
