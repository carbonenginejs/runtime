// Source: E:\carbonengine\trinity\trinity\Eve\Renderable\Stretch\EveRemotePositionCurve.h
// Source: E:\carbonengine\trinity\trinity\Eve\Renderable\Stretch\EveRemotePositionCurve.cpp
import { num } from "@carbonenginejs/runtime-utils/num";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


/**
 * A vector function that offsets a start-point curve by a vector sweeping from
 * one authored direction to another over a fixed time, once or repeatedly.
 */
@type.define({
  className: "EveRemotePositionCurve",
  family: "eve/renderable/stretch"
})
export class EveRemotePositionCurve extends CjsModel
{
  @io.persist
  @type.float32
  delayTime = 0;

  @io.persist
  @type.boolean
  cycle = false;

  @io.readwrite
  @type.vec3
  value = vec3.create();

  @io.persist
  @type.vec3
  offsetDir2 = vec3.create();

  @io.persist
  @type.objectRef("ITriVectorFunction")
  startPositionCurve = null;

  @io.persist
  @type.vec3
  offsetDir1 = vec3.create();

  @io.persist
  @type.float32
  sweepTime = 1;

  #startTime = 0;

  #startPosition = vec3.create();

  #currentOffsetDir = vec3.create();

  /**
   * Time-only entry point; evaluates the curve for its effect on value and
   * discards the returned vector.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's output-first Be::Time overload is represented by the org-standard time-first JavaScript curve convention.")
  UpdateValue(time)
  {
    this.Update(time, this.#startPosition);
  }

  /**
   * Advances the sweep and writes the start-curve position plus the interpolated offset into both value and out. The start time latches on the first call, the sweep stays at its first direction until delayTime has passed, and with cycle set it wraps every sweepTime instead of holding at the second direction.
   * @param {Array} out - caller-owned vec3; zeroed when there is no start-position curve
   * @returns {Array} out
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's output-first Be::Time overload is represented by the org-standard time-first JavaScript curve convention.")
  Update(time, out)
  {
    if (!this.startPositionCurve)
    {
      return vec3.zero(out);
    }
    if (this.#startTime === 0)
    {
      this.#startTime = time;
    }
    const timeSinceStart = time - this.#startTime;
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
    vec3.lerp(this.#currentOffsetDir, this.offsetDir1, this.offsetDir2, s);
    this.startPositionCurve.GetValueAt(time, this.#startPosition);
    vec3.add(this.value, this.#startPosition, this.#currentOffsetDir);
    return vec3.copy(out, this.value);
  }

  /**
   * Reports the value computed by the last Update; the time argument is ignored
   * and nothing is re-evaluated.
   */
  @carbon.method
  @impl.implemented
  GetValueAt(_time, out)
  {
    return vec3.copy(out, this.value);
  }

  /**
   * The first derivative is not modelled for this curve; out is returned
   * untouched.
   */
  @carbon.method
  @impl.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * The second derivative is not modelled for this curve; out is returned
   * untouched.
   */
  @carbon.method
  @impl.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Copies the value computed by the last Update; the time argument is ignored
   * and nothing is re-evaluated.
   */
  @carbon.method
  @impl.implemented
  InterpolatedPosition(_time, out)
  {
    return vec3.copy(out, this.value);
  }
}
