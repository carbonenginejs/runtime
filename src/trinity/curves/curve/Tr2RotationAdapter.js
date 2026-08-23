// Source: trinity/trinity/Curves/Tr2RotationAdapter.h
// Source: trinity/trinity/Curves/Tr2RotationAdapter.cpp
import { quat } from "#math/quat";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * Quaternion function wrapping a child quaternion curve behind its own time
 * remapping, falling back to a fixed authored quaternion when no child curve is
 * attached.
 */
@type.define({
  className: "Tr2RotationAdapter",
  family: "curves"
})
export class Tr2RotationAdapter extends CjsModel
{
  @io.persist
  @type.quat
  value = quat.create();

  @io.persist
  @type.objectRef("ITriQuaternionFunction")
  curve = null;

  @io.read
  @type.quat
  currentValue = quat.create();

  #start = 0;

  #offset = 0;

  #timeScale = 1;

  /**
   * Updates the cached quaternion value when a child curve is attached.
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
   * Updates the cached value and copies it into `out`.
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
      quat.copy(this.currentValue, this.value);
    }
    return quat.copy(out, this.currentValue);
  }

  /**
   * Gets the quaternion value at `time` into `out`.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    if (this.curve)
    {
      return this.curve.GetValueAt(this.GetLocalTime(time), out);
    }
    return quat.copy(out, this.value);
  }

  /**
   * Gets the first derivative quaternion at the supplied time.
   */
  @carbon.method
  @impl.adapted
  GetValueDotAt(_time, out)
  {
    return quat.identity(out);
  }

  /**
   * Gets the second derivative quaternion at the supplied time.
   */
  @carbon.method
  @impl.adapted
  GetValueDoubleDotAt(_time, out)
  {
    return quat.identity(out);
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
