import { exposure as be } from "#be";
import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Curves/Tr2CurveScalarExpression.h
// Source: trinity/trinity/Curves/Tr2CurveScalarExpression.cpp
// Source: trinity/trinity/Curves/Tr2CurveScalarExpression_Blue.cpp
import { ITriScalarFunction, ITriFunction, IInitialize } from "#blue";
import { meta, type, blue } from "#schema";
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
@be.define("Tr2CurveScalarExpression")
@blue.inherit(IInitialize)
@be.mapInterface(ITriFunction)
@be.mapInterface(ITriScalarFunction)
@be.mapInterface(IInitialize)
export class Tr2CurveScalarExpression extends ITriScalarFunction
{
  /** Authored narrow-string name. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** Native PERSISTONLY expression storage; readers bypass the live setter. */
  @blue.attribute("expression")
  @blue.persistOnly
  @type.expression
  _expression = "";

  /** Live expression property, separate from persisted backing storage. */
  @be.mapProperty()
  @type.expression
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
  @be.mapAttribute(be.READ)
  @type.float32
  currentValue = 0;

  /** Compiled JavaScript expression program; no held resource. */
  _program = null;

  /** Source of the last successful program; tracks uninitialized stored-member hydration. */
  _compiledSource = "";

  /** Owned scalar input functions in native declaration order. */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("ITriScalarFunction")
  inputs = [];

  /** First authored scalar argument. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  input1 = 0;

  /** Second authored scalar argument. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  input2 = 0;

  /** Third authored scalar argument. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  input3 = 0;

  /** Fourth authored scalar argument. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  input4 = 0;

  /** Native runtime time scale; not an exposed member. */
  timeScale = 1;

  /** Runtime random constant using the existing JavaScript random adapter. */
  randomConstant = carbonRandom.triFloatRandom01();

  /** Last scaled seconds value supplied to expression inputs. */
  _currentTime = 0;

  /**
   * Compiles nonempty persisted source through its setter after load.
   * Adapted: uses the existing JavaScript expression program.
   * @returns {boolean} True.
   */

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

  @meta.implemented
  UpdateValue(time)
  {
    this.currentValue = this.GetValue(time);
  }

  /**
   * Updates and returns the scalar value.
   */

  @meta.implemented
  Update(time)
  {
    this.currentValue = this.GetValue(time);
    return this.currentValue;
  }

  /**
   * Gets the scalar value at a time.
   */
  @blue.method
  @meta.implemented
  GetValueAt(time)
  {
    return this.GetValue(time);
  }

  /**
   * Scales expression time.
   */

  @meta.implemented
  ScaleTime(scale)
  {
    this.timeScale = scale;
  }

  /**
   * Evaluates the expression.
   * Adapted: retains the JavaScript program and evaluation-result fallback.
   */
  @blue.method
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

  @meta.implemented
  GetRandomConstant()
  {
    return this.randomConstant;
  }

  /**
   * Carbon's GetInputValue( index ): the n-th input sampled at the current
   * context time; zero for an out-of-range index.
   * @param {number} index Input index.
   * @returns {number}
   */

  @meta.implemented
  GetInputValue(index)
  {
    return this.GetInputValue__Time(index, this._currentTime);
  }

  /**
   * Carbon's GetInputValue( index, time ): the n-th input sampled at time.
   * @param {number} index Input index.
   * @param {number} time Sample time.
   * @returns {number}
   */
  @meta.implemented
  GetInputValue__Time(index, time)
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
  @be.mapMethodAndWrap()
  @meta.implemented
  ResetRandomConstant()
  {
    this.randomConstant = carbonRandom.triFloatRandom01();
  }

  /**
   * Gets expression terms exposed by this curve.
   * Adapted: returns the existing JavaScript expression-term records.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  GetExpressionTermInfo()
  {
    return CjsControllerExpressionProgram.getCurveTermInfo();
  }

  /**
   * Evaluates an arbitrary expression with this curve's context.
   * Adapted: retains the JavaScript compiler and zero-on-invalid result contract.
   */
  @be.mapMethodAndWrap()
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

