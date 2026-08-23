// Adapted from CCPWGL Tw2ColorCurve2 (MIT, Copyright (c) 2020
// ccpgames rawrafox cppctamber) and corroborated by historical Tr2ColorCurve
// Black records.
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { IncarnaColorCurveInterpolation } from "./enums.js";
import { Tr2ColorKey } from "./Tr2ColorKey.js";

/**
 * Historical Curve2 color layout used by Incarna Black assets.
 *
 * This is distinct from runtime-trinity's current Carbon `Tr2CurveColor`,
 * whose persisted representation is four component scalar curves.
 */
@type.define({ className: "Tr2ColorCurve", family: "incarna" })
export class Tr2ColorCurve extends CjsModel
{

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
  @type.color
  startValue = vec4.fromValues(0, 0, 0, 1);

  @io.readwrite
  @type.color
  currentValue = vec4.fromValues(0, 0, 0, 1);

  @io.persist
  @type.color
  endValue = vec4.fromValues(0, 0, 0, 1);

  @io.persist
  @type.vec4
  startTangent = vec4.create();

  @io.persist
  @type.vec4
  endTangent = vec4.create();

  @io.persist
  @type.uint32
  @type.enum("Interpolation")
  interpolation = IncarnaColorCurveInterpolation.LINEAR;

  @io.persist
  @type.list("Tr2ColorKey")
  keys = [];

  @io.persist
  @type.float32
  length = 0;

  /** Sorts keys and reconciles a last key beyond the authored end. */
  Sort()
  {
    sortCurve2(this);
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
    this.GetValueAt(time, this.currentValue);
  }

  /** Evaluates the historical curve into `out`. */
  GetValueAt(time, out)
  {
    time = time / this.timeScale + this.timeOffset;
    if (this.length <= 0 || time <= 0)
    {
      return vec4.copy(out, this.startValue);
    }

    if (time > this.length)
    {
      if (this.cycle)
      {
        time %= this.length;
      }
      else if (this.reversed)
      {
        return vec4.copy(out, this.startValue);
      }
      else
      {
        return vec4.copy(out, this.endValue);
      }
    }

    if (this.reversed) time = this.length - time;
    if (!this.keys.length) return this.Interpolate(time, null, null, out);

    let startKey = this.keys[0];
    let endKey = this.keys[this.keys.length - 1];
    if (time <= startKey.time)
    {
      return this.Interpolate(time, null, startKey, out);
    }
    if (time >= endKey.time)
    {
      return this.Interpolate(time, endKey, null, out);
    }

    for (let i = 0; i + 1 < this.keys.length; i++)
    {
      startKey = this.keys[i];
      endKey = this.keys[i + 1];
      if (startKey.time <= time && endKey.time > time) break;
    }
    return this.Interpolate(time, startKey, endKey, out);
  }

  /** Evaluates one historical Curve2 segment into `out`. */
  Interpolate(time, lastKey, nextKey, out)
  {
    let startValue = this.startValue;
    let endValue = this.endValue;
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
      endValue = nextKey.value;
      deltaTime = nextKey.time - lastKey.time;
    }
    else if (nextKey)
    {
      endValue = nextKey.value;
      deltaTime = nextKey.time;
    }
    else if (lastKey)
    {
      startValue = lastKey.value;
      deltaTime = this.length - lastKey.time;
    }

    if (interpolation !== IncarnaColorCurveInterpolation.LINEAR || deltaTime === 0)
    {
      return vec4.copy(out, startValue);
    }
    return vec4.lerp(out, startValue, endValue, time / deltaTime);
  }

  static inputDimension = 4;
  static outputDimension = 4;
  static valueProperty = "currentValue";
  static curveType = 2;
  static Key = Tr2ColorKey;
  static Interpolation = IncarnaColorCurveInterpolation;

}

function sortCurve2(curve)
{
  if (!curve.keys.length) return;
  curve.keys.sort((a, b) => a.time - b.time);
  const last = curve.keys[curve.keys.length - 1];
  if (last.time <= curve.length) return;

  const previousLength = curve.length;
  const endValue = curve.endValue;
  const endTangent = curve.endTangent;
  curve.length = last.time;
  curve.endValue = last.value;
  curve.endTangent = last.leftTangent;
  if (previousLength > 0)
  {
    last.time = previousLength;
    last.value = endValue;
    last.leftTangent = endTangent;
  }
}
