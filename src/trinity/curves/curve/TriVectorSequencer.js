// Source: trinity/trinity/TriSequencer.h
// Source: trinity/trinity/TriSequencer.cpp
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { TriOperator } from "#consts/graphics";


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
   * Combines child vectors using Carbon's dispatch (TriSequencer.cpp:70-73):
   * MULTIPLY and ADD select their combiner, and EVERY other operator falls
   * to the average arm - the donor's `else`, not an ADD default. Each donor
   * combiner also has a duplicate double-position overload; one body here.
   */
  @carbon.method
  @impl.implemented
  GetValueAt(time, out)
  {
    if (this.operator === TriOperator.TRIOP_MULTIPLY) return this.GetValueAtMult(time, out);
    if (this.operator === TriOperator.TRIOP_ADD) return this.GetValueAtAdd(time, out);
    return this.GetValueAtAverage(time, out);
  }

  /**
   * Carbon GetValueAtMult (cpp:75-89/:132-146): seed (1,1,1), multiply
   * component-wise - the donor writes the three axes out by hand.
   */
  @carbon.method
  @impl.implemented
  GetValueAtMult(time, out)
  {
    vec3.set(out, 1, 1, 1);
    for (const curve of this.functions)
    {
      curve.GetValueAt(time, this.#childValue);
      vec3.multiply(out, out, this.#childValue);
    }
    return out;
  }

  /**
   * Carbon GetValueAtAdd (cpp:106-120/:148-160): seed zero, accumulate.
   */
  @carbon.method
  @impl.implemented
  GetValueAtAdd(time, out)
  {
    vec3.zero(out);
    for (const curve of this.functions)
    {
      curve.GetValueAt(time, this.#childValue);
      vec3.add(out, out, this.#childValue);
    }
    return out;
  }

  /**
   * Carbon GetValueAtAverage (cpp:91-104/:162-176): the multiplier is
   * computed BEFORE the size check and applied per sample. On an empty list
   * the infinite multiplier is never used and the zero seed comes back -
   * transcribed, not guarded.
   */
  @carbon.method
  @impl.implemented
  GetValueAtAverage(time, out)
  {
    vec3.zero(out);
    const multiplier = 1 / this.functions.length;
    for (const curve of this.functions)
    {
      curve.GetValueAt(time, this.#childValue);
      vec3.scaleAndAdd(out, out, this.#childValue, multiplier);
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
