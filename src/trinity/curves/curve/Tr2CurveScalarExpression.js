// Source: trinity/trinity/Curves/Tr2CurveScalarExpression.h
// Source: trinity/trinity/Curves/Tr2CurveScalarExpression.cpp
// Source: trinity/trinity/Curves/Tr2CurveScalarExpression_Blue.cpp
import { ITriScalarFunction, ITriFunction, IInitialize } from "#blue";
import { meta } from "#schema";
import { CjsControllerExpressionProgram } from "../../controllers/expression/CjsControllerExpressionProgram.js";


/**
 * Scalar curve whose value is produced by a compiled expression evaluated at
 * time divided by timeScale, with input1..input4 and a stable per-instance
 * random constant available as terms.
 *
 * Native inheritance and Blue query exposure are declared separately below.
 * Existing JavaScript expression parsing, evaluation fallback, random generation
 * and floating-point arithmetic remain adaptations; no native differential parity
 * is claimed. Sampling retains the seconds overloads and returns numbers;
 * Be::Time overloads remain unimplemented. Programs are local state, not resources.
 */
@meta.define({
  className: "Tr2CurveScalarExpression",
  family: "curves"
})
@meta.blue.inherit(IInitialize)
export class Tr2CurveScalarExpression extends ITriScalarFunction
{
  /** Authored narrow-string name. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** Native PERSISTONLY expression storage; readers bypass the live setter. */
  @meta.member("expression")
  @meta.blue.persistOnly
  @meta.type.expression
  _expression = "";

  /** Live expression property, separate from persisted backing storage. */
  @meta.property()
  @meta.blue.readwrite
  @meta.type.expression
  @meta.implemented
  get expression()
  {
    return this.GetExpression();
  }

  /** @param {string} value Source compiled immediately by the native setter. */
  @meta.implemented
  set expression(value)
  {
    this.SetExpression(value);
  }

  /** Cached value after the last update. */
  @meta.blue.read
  @meta.type.float32
  currentValue = 0;

  /** Compiled JavaScript expression program; no held resource. */
  _program = null;

  /** Source of the last successful program; tracks uninitialized stored-member hydration. */
  _compiledSource = "";

  /** Owned scalar input functions in native declaration order. */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITriScalarFunction")
  inputs = [];

  /** First authored scalar argument. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  input1 = 0;

  /** Second authored scalar argument. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  input2 = 0;

  /** Third authored scalar argument. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  input3 = 0;

  /** Fourth authored scalar argument. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  input4 = 0;

  /** Native runtime time scale; not an exposed member. */
  timeScale = 1;

  /** Runtime random constant using the existing JavaScript random adapter. */
  randomConstant = Math.random();

  /** Last scaled seconds value supplied to expression inputs. */
  _currentTime = 0;

  /**
   * Compiles nonempty persisted source through its setter after load.
   * Adapted: uses the existing JavaScript expression program.
   * @returns {boolean} True.
   */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    if (this._expression !== "")
    {
      const expression = this._expression;
      this._expression = "";
      this.SetExpression(expression);
    }
    return true;
  }

  /**
   * Updates the cached scalar value.
   */
  @meta.blue.method
  @meta.implemented
  UpdateValue(time)
  {
    this.currentValue = this.GetValue(time);
  }

  /**
   * Updates and returns the scalar value.
   */
  @meta.blue.method
  @meta.implemented
  Update(time)
  {
    this.currentValue = this.GetValue(time);
    return this.currentValue;
  }

  /**
   * Gets the scalar value at a time.
   */
  @meta.blue.method
  @meta.implemented
  GetValueAt(time)
  {
    return this.GetValue(time);
  }

  /**
   * Scales expression time.
   */
  @meta.blue.method
  @meta.implemented
  ScaleTime(scale)
  {
    this.timeScale = scale;
  }

  /**
   * Evaluates the expression.
   * Adapted: retains the JavaScript program and evaluation-result fallback.
   */
  @meta.blue.method
  @meta.adapted
  GetValue(time)
  {
    if (!this.expression)
    {
      return 0;
    }
    const program = this.Compile();
    if (!program || !program.IsValid())
    {
      return 0;
    }
    const scaledTime = time / this.timeScale;
    this._currentTime = scaledTime;
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
  @meta.blue.method
  @meta.implemented
  GetExpression()
  {
    return this._expression;
  }

  /**
   * Compiles nonempty source immediately and commits it only on success.
   * Empty source changes only the stored text, retaining the program.
   * Adapted: uses the existing JavaScript expression program.
   * @param {string} expression Authored source text.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetExpression(expression)
  {
    if (expression === "")
    {
      this._expression = expression;
      return;
    }
    const program = CjsControllerExpressionProgram.Compile(expression, { emptyValue: 0 });
    if (!program.IsValid()) return;
    this._program = program;
    this._compiledSource = expression;
    this._expression = expression;
  }

  /**
   * Gets this curve's random constant.
   */
  @meta.blue.method
  @meta.implemented
  GetRandomConstant()
  {
    return this.randomConstant;
  }

  /**
   * Gets an input curve value at the current or supplied time.
   */
  @meta.blue.method
  @meta.implemented
  GetInputValue(index, time = this._currentTime)
  {
    index |= 0;
    if (index < 0 || index >= this.inputs.length)
    {
      return 0;
    }
    return this.inputs[index].GetValueAt(time);
  }

  /**
   * Regenerates the random constant.
   */
  @meta.blue.method
  @meta.implemented
  ResetRandomConstant()
  {
    this.randomConstant = Math.random();
  }

  /**
   * Gets expression terms exposed by this curve.
   * Adapted: returns the existing JavaScript expression-term records.
   */
  @meta.blue.method
  @meta.adapted
  GetExpressionTermInfo()
  {
    return CjsControllerExpressionProgram.getCurveTermInfo();
  }

  /**
   * Evaluates an arbitrary expression with this curve's context.
   * Adapted: retains the JavaScript compiler and zero-on-invalid result contract.
   */
  @meta.blue.method
  @meta.adapted
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
   * Returns the cached program, compiling changed nonempty stored source.
   * Adapted: SOF can hydrate backing members without Initialize on a warm object.
   * Compare with the last successful source; failed compilation retains its program,
   * and empty source must preserve the native setter's retained-program behavior.
   * Invalid nonempty backing text is retried on later samples.
   */
  Compile()
  {
    if (this._expression !== "" && (!this._program || this._compiledSource !== this._expression))
    {
      this.SetExpression(this._expression);
    }
    return this._program;
  }
}

meta.blue.interfaceTable({
  interfaces: [ Tr2CurveScalarExpression, ITriFunction, ITriScalarFunction, IInitialize ],
  chainTo: null
})(Tr2CurveScalarExpression);
