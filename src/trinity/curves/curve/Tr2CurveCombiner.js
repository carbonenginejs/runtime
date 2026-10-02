// Source: trinity/trinity/Curves/Tr2CurveCombiner.h
// Source: trinity/trinity/Curves/Tr2CurveCombiner.cpp
import { mappedInterfaces } from "../../../global/compose/interface.js";
import { vec3 } from "#math/vec3";
import { ITriFunction, ITriVectorFunction, ITriCurveLength, BlueList } from "#blue";
import { carbon, impl, edit, type } from "#schema";


/**
 * Vector function returning the component-wise sum of every child vector
 * function sampled at the same time; its length is the longest child's length.
 */
@type.define({
  className: "Tr2CurveCombiner",
  family: "curves"
})
@carbon.inherit(ITriCurveLength)
export class Tr2CurveCombiner extends ITriVectorFunction
{
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  @edit.read
  @edit.persist
  @type.list("ITriVectorFunction")
  curves = new BlueList(ITriVectorFunction, { className: null, listOps: 0 });

  @edit.read
  @type.vec3
  currentValue = vec3.create();

  _childValue = vec3.create();

  /**
   * Updates every child with zeroed pooled scratch and commits the sum after success.
   * Invocation-local leases preserve nested updates and are released on failure.
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    const sum = vec3.alloc();
    try
    {
      vec3.zero(sum);
      const childValue = vec3.alloc();
      try
      {
        for (const curve of this.curves)
        {
          vec3.zero(childValue);
          curve.Update(time, childValue);
          vec3.add(sum, sum, childValue);
        }
        vec3.copy(this.currentValue, sum);
      }
      finally
      {
        vec3.unalloc(childValue);
      }
    }
    finally
    {
      vec3.unalloc(sum);
    }
  }

  /**
   * Returns the longest child exposing the exact native curve-length interface.
   * JavaScript mapped constructor identities implement native BlueCastPtr; an exposed Length method is required.
   * @returns {number} Duration in seconds.
   */
  @carbon.method
  @impl.adapted
  Length()
  {
    let maxLength = 0;
    for (const curve of this.curves)
    {
      if (mappedInterfaces(curve.constructor).has(ITriCurveLength))
      {
        maxLength = Math.max(curve.Length(), maxLength);
      }
    }
    return maxLength;
  }

  /**
   * Samples into a caller-owned destination instead of returning a native value.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }

  /**
   * Updates the summed cache and copies it to the destination.
   * JavaScript uses seconds-first/output-last calls instead of native overloads.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    this.UpdateValue(time);
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Samples the existing child-sum algorithm into the output.
   * JavaScript uses seconds-first/output-last calls; native tick overloads are not dispatched.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    vec3.zero(out);
    for (const curve of this.curves)
    {
      curve.GetValueAt(time, this._childValue);
      vec3.add(out, out, this._childValue);
    }
    return out;
  }

  /**
   * Retains the native no-op first derivative.
   * @param {number} _time Unused time.
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
   * Retains the native no-op second derivative.
   * @param {number} _time Unused time.
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
   * Retains the native no-op interpolated position.
   * @param {number} _time Unused time.
   * @param {Float32Array|Float64Array} out Destination position.
   * @returns {Float32Array|Float64Array} The unchanged destination.
   */
  @carbon.method
  @impl.noop
  InterpolatedPosition(_time, out)
  {
    return out;
  }
}

// Exact native exposure table, with no inherited exposure chain.
carbon.interfaceTable({ interfaces: [Tr2CurveCombiner, ITriFunction, ITriVectorFunction, ITriCurveLength], chainTo: null })(Tr2CurveCombiner);
