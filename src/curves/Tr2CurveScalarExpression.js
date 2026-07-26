// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveScalarExpression.h
// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveScalarExpression.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsControllerExpressionProgram } from "../controllers/CjsControllerExpressionProgram.js";


/**
 * Scalar curve whose value is produced by a compiled expression evaluated at
 * time divided by timeScale, with input1..input4 and a stable per-instance
 * random constant available as terms.
 */
@type.define({
  className: "Tr2CurveScalarExpression",
  family: "curves"
})
export class Tr2CurveScalarExpression extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.persistOnly
  @type.expression
  expression = "";

  @io.read
  @type.float32
  currentValue = 0;

  #program = null;

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

  #currentTime = 0;

  /**
   * Compiles the authored expression after load.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.#program = CjsControllerExpressionProgram.Compile(this.expression, {
      emptyValue: 0
    });
    return true;
  }

  /**
   * Updates the cached scalar value.
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    this.currentValue = this.GetValue(time);
  }

  /**
   * Updates and returns the scalar value.
   */
  @carbon.method
  @impl.implemented
  Update(time)
  {
    this.currentValue = this.GetValue(time);
    return this.currentValue;
  }

  /**
   * Gets the scalar value at a time.
   */
  @carbon.method
  @impl.implemented
  GetValueAt(time)
  {
    return this.GetValue(time);
  }

  /**
   * Scales expression time.
   */
  @carbon.method
  @impl.implemented
  ScaleTime(scale)
  {
    this.timeScale = scale;
  }

  /**
   * Evaluates the expression.
   */
  @carbon.method
  @impl.adapted
  GetValue(time)
  {
    if (!this.expression)
    {
      return 0;
    }
    const program = this.Compile();
    if (!program.IsValid())
    {
      return 0;
    }
    const scaledTime = time / this.timeScale;
    this.#currentTime = scaledTime;
    return Number(program.Evaluate({
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
    })) || 0;
  }

  /**
   * Gets the authored expression.
   */
  @carbon.method
  @impl.implemented
  GetExpression()
  {
    return this.expression;
  }

  /**
   * Sets and compiles the authored expression.
   */
  @carbon.method
  @impl.adapted
  SetExpression(expression, options = {})
  {
    const changed = this.SetValues({ expression }, { ...options, skipUpdate: true, returnBoolean: true });
    if (!changed)
    {
      return false;
    }
    this.#program = CjsControllerExpressionProgram.Compile(expression, {
      emptyValue: 0
    });
    if (options.skipUpdate !== true)
    {
      this.UpdateValues({ ...options, source: options.source ?? this });
    }
    return true;
  }

  /**
   * Gets this curve's random constant.
   */
  @carbon.method
  @impl.implemented
  GetRandomConstant()
  {
    return this.randomConstant;
  }

  /**
   * Gets an input curve value at the current or supplied time.
   */
  @carbon.method
  @impl.implemented
  GetInputValue(index, time = this.#currentTime)
  {
    const input = this.inputs[index | 0];
    return input ? input.GetValueAt(time) : 0;
  }

  /**
   * Regenerates the random constant.
   */
  @carbon.method
  @impl.implemented
  ResetRandomConstant()
  {
    this.randomConstant = Math.random();
  }

  /**
   * Gets expression terms exposed by this curve.
   */
  @carbon.method
  @impl.adapted
  GetExpressionTermInfo()
  {
    return CjsControllerExpressionProgram.getCurveTermInfo();
  }

  /**
   * Evaluates an arbitrary expression with this curve's context.
   */
  @carbon.method
  @impl.adapted
  EvaluateExpression(expression)
  {
    const program = CjsControllerExpressionProgram.Compile(expression, {
      emptyValue: 0
    });
    if (!program.IsValid())
    {
      return 0;
    }
    return Number(program.Evaluate({
      curve: this,
      self: this
    })) || 0;
  }

  /**
   * Returns the cached program, recompiling first when it is missing or was
   * built from different source text.
   */
  Compile()
  {
    if (!this.#program || this.#program.source !== this.expression)
    {
      this.SetExpression(this.expression);
    }
    return this.#program;
  }
}
