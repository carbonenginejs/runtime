// Source: E:\carbonengine\trinity\trinity\TriSequencer.h
// Source: E:\carbonengine\trinity\trinity\TriSequencer.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { TriOperator } from "@carbonenginejs/runtime-utils/graphics";


/**
 * Vector function combining its child vector functions with Carbon's multiply,
 * add or average operator; multiply starts from ones and the additive paths from
 * zero.
 */
@type.define({ className: "TriVectorSequencer", family: "curves" })
export class TriVectorSequencer extends CjsModel
{
  @io.persist
  @type.int32
  @type.enum("TRIOPERATOR")
  operator = TriOperator.TRIOP_MULTIPLY;

  @io.persist
  @type.vec3
  value = vec3.create();

  @io.persist
  @type.float64
  start = 0;

  @io.persist
  @type.list("ITriVectorFunction")
  functions = [];

  @io.persist
  @type.string
  name = "";

  #childValue = vec3.create();

  /**
   * Updates the cached result of the child vector functions.
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    this.GetValueAt(time, this.value);
  }

  /**
   * Updates the cached result and copies it into `out`.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    this.GetValueAt(time, this.value);
    return vec3.copy(out, this.value);
  }

  /**
   * Combines child vectors using Carbon's multiply, add, or average operation.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    if (this.operator === TriOperator.TRIOP_MULTIPLY)
    {
      vec3.set(out, 1, 1, 1);
      for (const curve of this.functions)
      {
        curve.GetValueAt(time, this.#childValue);
        vec3.multiply(out, out, this.#childValue);
      }
      return out;
    }

    vec3.zero(out);
    for (const curve of this.functions)
    {
      curve.GetValueAt(time, this.#childValue);
      vec3.add(out, out, this.#childValue);
    }
    if (this.operator === TriOperator.TRIOP_AVERAGE && this.functions.length)
    {
      vec3.scale(out, out, 1 / this.functions.length);
    }
    return out;
  }

  /**
   * Sums child-function velocities as Carbon does for every operator.
   */
  @carbon.method
  @impl.adapted
  GetValueDotAt(time, out)
  {
    vec3.zero(out);
    for (const curve of this.functions)
    {
      curve.GetValueDotAt(time, this.#childValue);
      vec3.add(out, out, this.#childValue);
    }
    return out;
  }

  /**
   * Sums child-function accelerations as Carbon does for every operator.
   */
  @carbon.method
  @impl.adapted
  GetValueDoubleDotAt(time, out)
  {
    vec3.zero(out);
    for (const curve of this.functions)
    {
      curve.GetValueDoubleDotAt(time, this.#childValue);
      vec3.add(out, out, this.#childValue);
    }
    return out;
  }

  /**
   * Carbon leaves interpolated-position output unchanged for this sequencer.
   */
  @carbon.method
  @impl.noop
  InterpolatedPosition(_time, out)
  {
    return out;
  }

  static TRIOPERATOR = TriOperator;

}
