// Source: trinity/trinity/Curves/Tr2CurveCombiner.h
// Source: trinity/trinity/Curves/Tr2CurveCombiner.cpp
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * Vector function returning the component-wise sum of every child vector
 * function sampled at the same time; its length is the longest child's length.
 */
@type.define({
  className: "Tr2CurveCombiner",
  family: "curves"
})
export class Tr2CurveCombiner extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.array({
    kind: "objectRef",
    className: "ITriVectorFunction"
  })
  curves = [];

  @io.read
  @type.vec3
  currentValue = vec3.create();

  #childValue = vec3.create();

  /**
   * Updates the cached sum of every child vector function.
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    vec3.zero(this.currentValue);
    for (const curve of this.curves)
    {
      curve.Update(time, this.#childValue);
      vec3.add(this.currentValue, this.currentValue, this.#childValue);
    }
  }

  /**
   * Gets the longest child curve length.
   */
  @carbon.method
  @impl.implemented
  Length()
  {
    let maxLength = 0;
    for (const curve of this.curves)
    {
      const length = curve.Length?.();
      if (typeof length === "number")
      {
        maxLength = Math.max(length, maxLength);
      }
    }
    return maxLength;
  }

  /**
   * Gets the summed vector value at `time` into `out`.
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
    this.UpdateValue(time);
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Gets the summed vector value at `time` into `out`.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    vec3.zero(out);
    for (const curve of this.curves)
    {
      curve.GetValueAt(time, this.#childValue);
      vec3.add(out, out, this.#childValue);
    }
    return out;
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
}
