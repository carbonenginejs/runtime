// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveVector3Lerp.h
// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveVector3Lerp.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2CurveVector3LerpKeyInterpolation } from "./enums.js";


/**
 * Vector curve that eases from a fixed initial value into a child vector curve,
 * blending over the interval ending at curveStartTime with the configured start
 * interpolation.
 */
@type.define({
  className: "Tr2CurveVector3Lerp",
  family: "curves"
})
export class Tr2CurveVector3Lerp extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.readwrite
  @type.vec3
  initialValue = vec3.create();

  @io.read
  @type.vec3
  currentValue = vec3.create();

  @io.persist
  @type.float32
  curveStartTime = 1;

  @io.readwrite
  @type.uint32
  @schema.enum("Tr2CurveVector3LerpKeyInterpolation")
  startInterpolation = Tr2CurveVector3LerpKeyInterpolation.HERMITE;

  @io.persist
  @type.objectRef("ITriVectorFunction")
  curve = null;

  #curveStartValue = vec3.create();

  #zeroTangent = vec3.create();

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
   * Gets the vector value at `time` into `out`.
   */
  @carbon.method
  @impl.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }

  /**
   * Updates the cached value and copies it into `out`.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    this.GetValueAt(time, this.currentValue);
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Gets the vector value at `time` into `out`.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    if (!this.curve)
    {
      return vec3.copy(out, this.initialValue);
    }
    if (time < this.curveStartTime && this.curveStartTime > 0)
    {
      return this.LerpToFirstKey(out, time);
    }
    return this.curve.GetValueAt(time - this.curveStartTime, out);
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
   * Blends from the authored initial value to the child curve's first value.
   */
  LerpToFirstKey(out, time)
  {
    if (!this.curve)
    {
      return vec3.copy(out, this.initialValue);
    }
    this.curve.GetValueAt(0, this.#curveStartValue);
    if (this.curveStartTime <= 0)
    {
      return vec3.copy(out, this.#curveStartValue);
    }
    const ratio = time / this.curveStartTime;
    if (this.startInterpolation === Tr2CurveVector3LerpKeyInterpolation.LINEAR)
    {
      return vec3.lerp(out, this.initialValue, this.#curveStartValue, ratio);
    }
    return vec3.hermite(out, this.initialValue, this.#zeroTangent, this.#zeroTangent, this.#curveStartValue, ratio);
  }

  static Tr2CurveVector3LerpKeyInterpolation = Tr2CurveVector3LerpKeyInterpolation;

}
