// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveEulerRotationExpression.h
// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveEulerRotationExpression.cpp
import { fromYawPitchRoll, quat } from "@carbonenginejs/runtime-utils/quat";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsControllerExpressionProgram } from "../controllers/CjsControllerExpressionProgram.js";


/**
 * Quaternion curve built from three independently compiled expressions producing
 * yaw, pitch and roll in radians at time divided by timeScale.
 */
@type.define({
  className: "Tr2CurveEulerRotationExpression",
  family: "curves"
})
export class Tr2CurveEulerRotationExpression extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.persistOnly
  @type.expression
  expressionYaw = "";

  @io.persistOnly
  @type.expression
  expressionPitch = "";

  @io.persistOnly
  @type.expression
  expressionRoll = "";

  @io.read
  @type.quat
  currentValue = quat.create();

  @io.persist
  @type.float32
  input1 = 0;

  @io.persist
  @type.float32
  input2 = 0;

  @io.persist
  @type.float32
  input3 = 0;

  @io.persist
  @type.float32
  input4 = 0;

  @io.persist
  @type.list("ITriScalarFunction")
  inputs = [];

  timeScale = 1;

  randomConstant = Math.random();

  #programs = [null, null, null];

  #sources = ["", "", ""];

  #currentTime = 0;

  /**
   * Compiles component expressions.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.Compile();
    return true;
  }

  /**
   * Updates the cached quaternion.
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    this.GetValue(time, this.currentValue);
  }

  /**
   * Updates and returns the quaternion.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    this.GetValue(time, this.currentValue);
    return quat.copy(out, this.currentValue);
  }

  /**
   * Gets the quaternion value at a time.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    return this.GetValue(time, out);
  }

  /**
   * Gets the quaternion value.
   */
  @carbon.method
  @impl.adapted
  GetValue(time, out)
  {
    this.Compile();
    const context = this.GetContext(time);
    return fromYawPitchRoll(out, Tr2CurveEulerRotationExpression.#evaluate(this.#programs[0], context), Tr2CurveEulerRotationExpression.#evaluate(this.#programs[1], context), Tr2CurveEulerRotationExpression.#evaluate(this.#programs[2], context));
  }

  /**
   * Derivative stub retained for interface compatibility.
   */
  @carbon.method
  @impl.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * Second-derivative stub retained for interface compatibility.
   */
  @carbon.method
  @impl.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }
  /** The authored yaw expression source text, before compilation. */
  @carbon.method
  @impl.implemented
  GetExpressionYaw()
  {
    return this.expressionYaw;
  }
  /** The authored pitch expression source text, before compilation. */
  @carbon.method
  @impl.implemented
  GetExpressionPitch()
  {
    return this.expressionPitch;
  }
  /** The authored roll expression source text, before compilation. */
  @carbon.method
  @impl.implemented
  GetExpressionRoll()
  {
    return this.expressionRoll;
  }
  /**
   * Sets the yaw expression and drops its cached program so the next sample
   * recompiles.
   */
  @carbon.method
  @impl.adapted
  SetExpressionYaw(expression)
  {
    this.expressionYaw = expression;
    this.#programs[0] = null;
  }
  /**
   * Sets the pitch expression and drops its cached program so the next sample
   * recompiles.
   */
  @carbon.method
  @impl.adapted
  SetExpressionPitch(expression)
  {
    this.expressionPitch = expression;
    this.#programs[1] = null;
  }
  /**
   * Sets the roll expression and drops its cached program so the next sample
   * recompiles.
   */
  @carbon.method
  @impl.adapted
  SetExpressionRoll(expression)
  {
    this.expressionRoll = expression;
    this.#programs[2] = null;
  }
  /**
   * Backs the expression `input`/`inputAt` functions by sampling the n-th input
   * curve, defaulting to the time of the most recent GetContext call and
   * returning 0 when no such input exists.
   */
  @carbon.method
  @impl.implemented
  GetInputValue(index, time = this.#currentTime)
  {
    const input = this.inputs[index | 0];
    return input ? input.GetValueAt(time) : 0;
  }
  /**
   * Gets this curve's per-instance random constant, which stays fixed until
   * ResetRandomConstant is called so `randomConstant` expressions are stable
   * over time.
   */
  @carbon.method
  @impl.implemented
  GetRandomConstant()
  {
    return this.randomConstant;
  }
  /** Draws a new per-instance random constant in [0, 1). */
  @carbon.method
  @impl.implemented
  ResetRandomConstant()
  {
    this.randomConstant = Math.random();
  }
  /**
   * Gets the curve expression terms offered to an editor, including `radians`
   * because this curve's outputs are angles.
   */
  @carbon.method
  @impl.adapted
  GetExpressionTermInfo()
  {
    return CjsControllerExpressionProgram.getCurveTermInfo({
      includeRadians: true
    });
  }
  /**
   * Compiles and evaluates an arbitrary expression against this curve's context
   * at time 0, returning 0 when it does not compile.
   */
  @carbon.method
  @impl.adapted
  EvaluateExpression(expression)
  {
    const program = CjsControllerExpressionProgram.Compile(expression, {
      emptyValue: 0
    });
    return program.IsValid() ? Number(program.Evaluate(this.GetContext(0))) || 0 : 0;
  }
  /**
   * Compiles any of the yaw, pitch or roll expressions whose cached program is
   * missing or stale against the currently authored source.
   */
  Compile()
  {
    const expressions = [this.expressionYaw, this.expressionPitch, this.expressionRoll];
    for (let i = 0; i < expressions.length; i++)
    {
      if (!this.#programs[i] || this.#sources[i] !== expressions[i])
      {
        this.#programs[i] = CjsControllerExpressionProgram.Compile(expressions[i], {
          emptyValue: 0
        });
        this.#sources[i] = expressions[i];
      }
    }
  }
  /**
   * Builds the evaluation context for a sample, dividing the caller time by
   * timeScale, recording it as the current input time, and exposing it alongside
   * input1..input4 as expression variables.
   */
  GetContext(time)
  {
    const scaledTime = time / this.timeScale;
    this.#currentTime = scaledTime;
    return {
      curve: this,
      self: this,
      time: scaledTime,
      variables: {
        time: scaledTime,
        input1: this.input1,
        input2: this.input2,
        input3: this.input3,
        input4: this.input4
      }
    };
  }

  /**
   * Evaluates one angle program, substituting 0 for a missing or invalid program
   * and for any non-finite result.
   */
  static #evaluate(program, context)
  {
    return program?.IsValid() ? Number(program.Evaluate(context)) || 0 : 0;
  }
}
