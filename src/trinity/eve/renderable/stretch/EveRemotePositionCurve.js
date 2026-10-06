// Source: trinity/trinity/Eve/Renderable/Stretch/EveRemotePositionCurve.h
// Source: trinity/trinity/Eve/Renderable/Stretch/EveRemotePositionCurve.cpp
import { num } from "#math/num";
import { vec3 } from "#math/vec3";
import { meta } from "#schema";
import { ITriVectorFunction, CcpTime } from "#blue";


/**
 * A vector function that offsets a start-point curve by a vector sweeping from
 * one authored direction to another over a fixed time, once or repeatedly.
 */
@meta.define({
  className: "EveRemotePositionCurve",
  family: "eve/renderable/stretch"
})
export class EveRemotePositionCurve extends ITriVectorFunction
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  delayTime = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  cycle = false;

  @meta.blue.readwrite
  @meta.type.vec3
  value = vec3.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  offsetDir2 = vec3.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.rootRef("ITriVectorFunction")
  startPositionCurve = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  offsetDir1 = vec3.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  sweepTime = 1;

  _startTime = 0;

  _startPosition = vec3.create();

  _currentOffsetDir = vec3.create();

  /**
   * Carbon's inline UpdateValue (EveRemotePositionCurve.h:20-24) calls the double Update, which is a no-op; the sweep
   * advances only through Update__Ticks.
   * @param {number} time Seconds.
   */
  @meta.blue.method
  @meta.implemented
  UpdateValue(time)
  {
    this.Update(time, this._startPosition);
  }

  /**
   * Carbon's Update(double) is a no-op returning its input (EveRemotePositionCurve.cpp:75-78); Update__Ticks advances
   * the sweep.
   * @param {number} _time Unused seconds.
   * @param {Float32Array} out Caller-owned vec3, returned unchanged.
   * @returns {Float32Array} out
   */
  @meta.blue.method
  @meta.implemented
  Update(_time, out)
  {
    return out;
  }

  /**
   * Carbon's Update(Be::Time) (cpp:28-69): advances the sweep and writes the start-curve position plus the
   * interpolated offset into both value and out. The start time latches on the first call, the sweep stays at its
   * first direction until delayTime has passed, and with cycle set it wraps every sweepTime instead of holding at the
   * second direction. JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Caller-owned vec3; zeroed when there is no start-position curve.
   * @returns {Float32Array} out
   */
  @meta.adapted
  Update__Ticks(time, out)
  {
    if (!this.startPositionCurve)
    {
      return vec3.zero(out);
    }
    if (this._startTime === 0)
    {
      this._startTime = time;
    }
    const timeSinceStart = Math.fround(CcpTime.timeAsDouble(time - this._startTime));
    let s = 0;
    if (timeSinceStart > this.delayTime)
    {
      if (this.cycle)
      {
        s = num.clamp((timeSinceStart - this.delayTime) % this.sweepTime / this.sweepTime, 0, 1);
      }
      else
      {
        s = num.clamp((timeSinceStart - this.delayTime) / this.sweepTime, 0, 1);
      }
    }
    vec3.lerp(this._currentOffsetDir, this.offsetDir1, this.offsetDir2, s);
    this.startPositionCurve.GetValueAt__Ticks(time, this._startPosition);
    vec3.add(this.value, this._startPosition, this._currentOffsetDir);
    return vec3.copy(out, this.value);
  }

  /**
   * Reports the value computed by the last Update; the time argument is ignored
   * and nothing is re-evaluated.
   */
  @meta.blue.method
  @meta.implemented
  GetValueAt(_time, out)
  {
    return vec3.copy(out, this.value);
  }

  /**
   * The first derivative is not modelled for this curve; out is returned
   * untouched.
   */
  @meta.blue.method
  @meta.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * The second derivative is not modelled for this curve; out is returned
   * untouched.
   */
  @meta.blue.method
  @meta.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Copies the value computed by the last Update; the time argument is ignored
   * and nothing is re-evaluated.
   */
  @meta.blue.method
  @meta.implemented
  InterpolatedPosition(_time, out)
  {
    return vec3.copy(out, this.value);
  }
}
