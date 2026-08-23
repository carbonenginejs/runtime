// Source: trinity/trinity/TriSequencer.h
// Source: trinity/trinity/TriSequencer.cpp
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { TriOperator } from "#consts/graphics";


/**
 * Color function combining its child color functions with Carbon's multiply or
 * add operator; both paths start from opaque white, so an additive sequencer is
 * offset by white.
 */
@type.define({ className: "TriColorSequencer", family: "curves" })
export class TriColorSequencer extends CjsModel
{
  @io.persist
  @type.int32
  @type.enum("TRIOPERATOR")
  operator = TriOperator.TRIOP_MULTIPLY;

  @io.persist
  @type.color
  value = vec4.create();

  @io.persist
  @type.float64
  start = 0;

  @io.persist
  @type.list("ITriColorFunction")
  functions = [];

  @io.persist
  @type.string
  name = "";

  #childValue = vec4.create();

  /**
   * Updates the cached result of the child color functions.
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
    return vec4.copy(out, this.value);
  }

  /**
   * Combines child colors using Carbon's multiply or add operation.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    if (this.operator === TriOperator.TRIOP_MULTIPLY)
    {
      vec4.set(out, 1, 1, 1, 1);
      for (const curve of this.functions)
      {
        curve.GetValueAt(time, this.#childValue);
        vec4.multiply(out, out, this.#childValue);
      }
      return out;
    }

    // Carbon's double-seconds overload starts additive evaluation at white.
    // TriCurveSet drives UpdateValue(double), so preserve that observable quirk.
    vec4.set(out, 1, 1, 1, 1);
    for (const curve of this.functions)
    {
      curve.GetValueAt(time, this.#childValue);
      vec4.add(out, out, this.#childValue);
    }
    return out;
  }

  /**
   * Gets the longest duration exposed by a child function.
   */
  @carbon.method
  @impl.implemented
  Length()
  {
    let maxDuration = 0;
    for (const curve of this.functions)
    {
      const duration = curve.Length?.();
      if (typeof duration === "number")
      {
        maxDuration = Math.max(maxDuration, duration);
      }
    }
    return maxDuration;
  }

  static TRIOPERATOR = TriOperator;

}
