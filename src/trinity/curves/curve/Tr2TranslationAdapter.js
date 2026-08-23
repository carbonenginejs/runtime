// Source: trinity/trinity/Curves/Tr2TranslationAdapter.h
// Source: trinity/trinity/Curves/Tr2TranslationAdapter.cpp
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * Vector function wrapping a child vector curve behind its own time remapping
 * and rotating the sampled offset by a fixed rotation, falling back to a fixed
 * authored vector when no child curve is attached.
 */
@type.define({
  className: "Tr2TranslationAdapter",
  family: "curves"
})
export class Tr2TranslationAdapter extends CjsModel
{
  @io.persist
  @type.vec3
  value = vec3.create();

  @io.persist
  @type.objectRef("ITriVectorFunction")
  curve = null;

  @io.persist
  @type.quat
  rotationOffset = quat.create();

  @io.read
  @type.vec3
  currentValue = vec3.create();

  #start = 0;

  #offset = 0;

  #timeScale = 1;

  #dotValue0 = vec3.create();

  #dotValue1 = vec3.create();

  /**
   * Updates the cached vector value when a child curve is attached.
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    if (this.curve)
    {
      this.curve.Update(this.GetLocalTime(time), this.currentValue);
    }
  }

  /**
   * Updates the cached value, applies the rotation offset, and copies it into `out`.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    if (this.curve)
    {
      this.curve.Update(this.GetLocalTime(time), this.currentValue);
    }
    else
    {
      vec3.copy(this.currentValue, this.value);
    }
    vec3.transformQuat(this.currentValue, this.currentValue, this.rotationOffset);
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Gets the vector value at `time` into `out` without applying rotation offset.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    if (this.curve)
    {
      return this.curve.GetValueAt(this.GetLocalTime(time), out);
    }
    return vec3.copy(out, this.value);
  }

  /**
   * Gets Carbon's backward finite-difference vector derivative.
   */
  @carbon.method
  @impl.adapted
  GetValueDotAt(time, out)
  {
    if (!this.curve)
    {
      return vec3.zero(out);
    }
    const localTime = this.GetLocalTime(time);
    this.curve.GetValueAt(localTime, this.#dotValue0);
    this.curve.GetValueAt(localTime - 0.1, this.#dotValue1);
    vec3.subtract(out, this.#dotValue1, this.#dotValue0);
    return vec3.scale(out, out, 10);
  }

  /**
   * Gets the second derivative vector at the supplied time.
   */
  @carbon.method
  @impl.adapted
  GetValueDoubleDotAt(_time, out)
  {
    return vec3.zero(out);
  }

  /**
   * Copies the last cached value into `out`.
   */
  @carbon.method
  @impl.adapted
  InterpolatedPosition(_time, out)
  {
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Shifts the local curve start by a random offset inside `[-range, range]`.
   */
  @carbon.method
  @impl.adapted
  RandomizeStart(range = 60)
  {
    const radius = range || 60;
    this.#offset = (Math.random() * 2 - 1) * radius;
  }

  /**
   * Scales local curve time.
   */
  @carbon.method
  @impl.implemented
  ScaleTime(scale)
  {
    this.#timeScale = scale;
  }

  /**
   * Resets the local start time offset.
   */
  @carbon.method
  @impl.implemented
  ResetStart()
  {
    this.#start = 0;
  }

  /**
   * Converts caller time into local child-curve time.
   */
  GetLocalTime(time)
  {
    return time / this.#timeScale;
  }

  /**
   * Converts a runtime numeric-seconds `Be::Time` value into start-aware local time.
   */
  GetStartAwareLocalTime(time)
  {
    if (this.#start === 0)
    {
      this.#start = time;
    }
    return (time - this.#start + this.#offset) / this.#timeScale;
  }
}
