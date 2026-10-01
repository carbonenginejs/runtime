// Source: trinity/trinity/Curves/Tr2CurveVector3Lerp.h
// Source: trinity/trinity/Curves/Tr2CurveVector3Lerp.cpp
import { vec3 } from "#math/vec3";
import { ITriFunction, ITriVectorFunction } from "#blue";
import { carbon, impl, edit, type } from "#schema";
import { Tr2CurveVector3LerpKeyInterpolation } from "../enums.js";


/**
 * Vector curve that eases from a fixed initial value into a child vector curve,
 * blending over the interval ending at curveStartTime with the configured start
 * interpolation.
 */
@type.define({
  className: "Tr2CurveVector3Lerp",
  family: "curves"
})
export class Tr2CurveVector3Lerp extends ITriVectorFunction
{
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  @edit.readwrite
  @type.vec3
  initialValue = vec3.create();

  @edit.readwrite
  @type.int32
  @type.enum("trinity.Tr2CurveVector3LerpKeyInterpolation")
  startInterpolation = Tr2CurveVector3LerpKeyInterpolation.HERMITE;

  @edit.readwrite
  @edit.persist
  @type.objectRef("ITriVectorFunction")
  curve = null;

  @edit.readwrite
  @edit.persist
  @type.float32
  curveStartTime = 1;

  @edit.read
  @type.vec3
  currentValue = vec3.create();

  _curveStartValue = vec3.create();

  _zeroTangent = vec3.create();

  /**
   * Updates the cached value for the supplied time.
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
   * Copies the native returned vector into a caller-owned output buffer.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination vector.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }

  /**
   * Updates the cache and copies it into the caller-owned output.
   * JavaScript combines native time overloads with seconds first and output last.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    this.GetValueAt(time, this.currentValue);
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Samples into the caller-owned output without updating the cache.
   * JavaScript combines native time overloads with seconds first and output last.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
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
   * Retains the native no-op first derivative, leaving output unchanged.
   * @param {number} _time Unused time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The unchanged destination.
   */
  @carbon.method
  @impl.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * Retains the native no-op second derivative, leaving output unchanged.
   * @param {number} _time Unused time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The unchanged destination.
   */
  @carbon.method
  @impl.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Retains the native no-op position interpolation, leaving output unchanged.
   * @param {number} _time Unused time in seconds.
   * @param {Float32Array|Float64Array} out Destination position.
   * @returns {Float32Array|Float64Array} The unchanged destination.
   */
  @carbon.method
  @impl.noop
  InterpolatedPosition(_time, out)
  {
    return out;
  }

  /**
   * Blends the initial value to the child curve first value.
   * Native private helper; JavaScript uses a caller-owned output and reusable scratch vectors.
   * @param {Float32Array} out Destination vector.
   * @param {number} time Time in seconds.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  LerpToFirstKey(out, time)
  {
    if (!this.curve)
    {
      return vec3.copy(out, this.initialValue);
    }
    this.curve.GetValueAt(0, this._curveStartValue);
    if (this.curveStartTime <= 0)
    {
      return vec3.copy(out, this._curveStartValue);
    }
    const ratio = time / this.curveStartTime;
    if (this.startInterpolation === Tr2CurveVector3LerpKeyInterpolation.LINEAR)
    {
      return vec3.lerp(out, this.initialValue, this._curveStartValue, ratio);
    }
    return vec3.hermite(out, this.initialValue, this._zeroTangent, this._zeroTangent, this._curveStartValue, ratio);
  }

  static Tr2CurveVector3LerpKeyInterpolation = Tr2CurveVector3LerpKeyInterpolation;

}

// Exact native exposure table; no inherited or implicit entries.
carbon.interfaceTable({
  interfaces: [Tr2CurveVector3Lerp, ITriFunction, ITriVectorFunction],
  chainTo: null
})(Tr2CurveVector3Lerp);
