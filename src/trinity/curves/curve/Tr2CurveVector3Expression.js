// Source: trinity/trinity/Curves/Tr2CurveVector3Expression.h
// Source: trinity/trinity/Curves/Tr2CurveVector3Expression.cpp
// Source: trinity/trinity/Curves/Tr2CurveVector3Expression_Blue.cpp
import { ITriColorFunction, ITriVectorFunction, ITriFunction, IInitialize } from "#blue";
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { CjsControllerExpressionProgram } from "../../controllers/expression/CjsControllerExpressionProgram.js";


/**
 * Vector curve whose x, y and z components are each produced by an independently
 * compiled expression evaluated at time divided by timeScale.
 *
 * Native inheritance and Blue query exposure are declared separately below.
 * Existing JavaScript expression parsing, evaluation fallback, random generation
 * and floating-point arithmetic remain adaptations; no native differential parity
 * is claimed. Sampling retains the seconds overloads with time-first output-buffer
 * signatures; Be::Time overloads remain unimplemented. Programs are not resources.
 */
@meta.define({
  className: "Tr2CurveVector3Expression",
  family: "curves"
})
@meta.blue.inherit(ITriVectorFunction, IInitialize)
export class Tr2CurveVector3Expression extends ITriColorFunction
{
  /** Authored narrow-string name. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** Native PERSISTONLY expression storage; readers bypass the live setter. */
  @meta.member("expressionX")
  @meta.blue.persistOnly
  @meta.type.expression
  _expressionX = "";

  /** Live expression property, separate from persisted backing storage. */
  @meta.property()
  @meta.blue.readwrite
  @meta.type.expression
  @meta.implemented
  get expressionX()
  {
    return this.GetExpressionX();
  }

  /** @param {string} value Source compiled immediately by the native setter. */
  @meta.implemented
  set expressionX(value)
  {
    this.SetExpressionX(value);
  }

  /** Native PERSISTONLY expression storage; readers bypass the live setter. */
  @meta.member("expressionY")
  @meta.blue.persistOnly
  @meta.type.expression
  _expressionY = "";

  /** Live expression property, separate from persisted backing storage. */
  @meta.property()
  @meta.blue.readwrite
  @meta.type.expression
  @meta.implemented
  get expressionY()
  {
    return this.GetExpressionY();
  }

  /** @param {string} value Source compiled immediately by the native setter. */
  @meta.implemented
  set expressionY(value)
  {
    this.SetExpressionY(value);
  }

  /** Native PERSISTONLY expression storage; readers bypass the live setter. */
  @meta.member("expressionZ")
  @meta.blue.persistOnly
  @meta.type.expression
  _expressionZ = "";

  /** Live expression property, separate from persisted backing storage. */
  @meta.property()
  @meta.blue.readwrite
  @meta.type.expression
  @meta.implemented
  get expressionZ()
  {
    return this.GetExpressionZ();
  }

  /** @param {string} value Source compiled immediately by the native setter. */
  @meta.implemented
  set expressionZ(value)
  {
    this.SetExpressionZ(value);
  }

  /** Cached value after the last update. */
  @meta.blue.read
  @meta.type.vec3
  currentValue = vec3.create();

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

  /** Compiled JavaScript component programs; no held resources. */
  _programs = [null, null, null];

  /** Last successfully compiled component sources, separate from hydrated backing text. */
  _compiledSources = ["", "", ""];

  /** Last scaled seconds value supplied to expression inputs. */
  _currentTime = 0;

  /**
   * Compiles nonempty persisted components through their indexed setter.
   * Adapted: uses the existing JavaScript expression program.
   * @returns {boolean} True.
   */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    for (let index = 0; index < 3; index++)
    {
      const expression = this.GetExpression(index);
      if (expression !== "")
      {
        this["_expression" + "XYZ"[index]] = "";
        this.SetExpression(index, expression);
      }
    }
    return true;
  }

  /**
   * Updates the cached vector value.
   */
  @meta.blue.method
  @meta.implemented
  UpdateValue(time)
  {
    this.GetValue(time, this.currentValue);
  }

  /**
   * Updates and returns the vector value.
   */

  @meta.blue.method
  @meta.adapted
  Update(time, out)
  {
    this._sample(time, this.currentValue);
    vec3.copy(out, this.currentValue);
    if (out.length > 3)
    {
      out[3] = 0;
    }
    return out;
  }

  /**
   * Gets the vector value at a time.
   */

  @meta.blue.method
  @meta.adapted
  GetValueAt(time, out)
  {
    return this._sample(time, out);
  }

  /**
   * Gets the vector value.
   */
  @meta.blue.method
  @meta.adapted
  GetValue(time, out)
  {
    this.Compile();
    const context = this.GetContext(time);
    out[0] = Tr2CurveVector3Expression._evaluate(this._programs[0], context);
    out[1] = Tr2CurveVector3Expression._evaluate(this._programs[1], context);
    out[2] = Tr2CurveVector3Expression._evaluate(this._programs[2], context);
    return out;
  }

  /**
   * Derivatives are not represented by Carbon expression curves.
   */
  @meta.blue.method
  @meta.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * Derivatives are not represented by Carbon expression curves.
   */
  @meta.blue.method
  @meta.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Expression curves do not have segment interpolation state.
   */
  @meta.blue.method
  @meta.noop
  InterpolatedPosition(_time, out)
  {
    return out;
  }

  /**
   * Gets one authored component source; native callers supply indices 0 through 2.
   * @param {number} index Native component index.
   * @returns {string} Stored source text.
   */
  @meta.blue.method
  @meta.implemented
  GetExpression(index)
  {
    return this["_expression" + "XYZ"[index]];
  }

  /**
   * Compiles a nonempty component source immediately and commits it on success.
   * Adapted: the existing JavaScript program replaces native parser bytecode.
   * Empty input changes only stored source, retaining the compiled program.
   * @param {number} index Native component index, 0 through 2.
   * @param {string} expression Authored source text.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetExpression(index, expression)
  {
    if (expression === "")
    {
      this["_expression" + "XYZ"[index]] = expression;
      return;
    }
    const program = CjsControllerExpressionProgram.Compile(expression, { emptyValue: 0 });
    if (!program.IsValid()) return;
    this._programs[index] = program;
    this._compiledSources[index] = expression;
    this["_expression" + "XYZ"[index]] = expression;
  }

  /** Gets the authored x-component expression source. */
  @meta.blue.method
  @meta.implemented
  GetExpressionX()
  {
    return this.GetExpression(0);
  }

  /** Gets the authored y-component expression source. */
  @meta.blue.method
  @meta.implemented
  GetExpressionY()
  {
    return this.GetExpression(1);
  }

  /** Gets the authored z-component expression source. */
  @meta.blue.method
  @meta.implemented
  GetExpressionZ()
  {
    return this.GetExpression(2);
  }

  /**
   * Sets the x-component source through the native indexed setter.
   * Adapted: compilation uses the existing JavaScript expression program.
   * @param {string} expression Authored source text.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetExpressionX(expression)
  {
    this.SetExpression(0, expression);
  }

  /**
   * Sets the y-component source through the native indexed setter.
   * Adapted: compilation uses the existing JavaScript expression program.
   * @param {string} expression Authored source text.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetExpressionY(expression)
  {
    this.SetExpression(1, expression);
  }

  /**
   * Sets the z-component source through the native indexed setter.
   * Adapted: compilation uses the existing JavaScript expression program.
   * @param {string} expression Authored source text.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetExpressionZ(expression)
  {
    this.SetExpression(2, expression);
  }

  /**
   * Backs the expression `input`/`inputAt` functions by sampling the n-th input
   * curve, defaulting to the time of the most recent GetContext call and
   * returning 0 only for an out-of-range index. In-range inputs must implement
   * the owned scalar-function contract.
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
   * Gets this curve's per-instance random constant, which stays fixed until
   * ResetRandomConstant is called so `randomConstant` expressions are stable
   * over time.
   */
  @meta.blue.method
  @meta.implemented
  GetRandomConstant()
  {
    return this.randomConstant;
  }

  /** Draws a new per-instance random constant in [0, 1). */
  @meta.blue.method
  @meta.implemented
  ResetRandomConstant()
  {
    this.randomConstant = Math.random();
  }

  /** Gets the curve expression terms offered to an editor for autocompletion. */
  @meta.blue.method
  @meta.adapted
  GetExpressionTermInfo()
  {
    return CjsControllerExpressionProgram.getCurveTermInfo();
  }

  /**
   * Compiles and evaluates an arbitrary expression against this curve's context
   * at time 0, returning 0 when it does not compile.
   */
  @meta.blue.method
  @meta.adapted
  EvaluateExpression(expression)
  {
    const program = CjsControllerExpressionProgram.Compile(expression, {
      emptyValue: 0
    });
    return program.IsValid() ? Number(program.Evaluate(this.GetContext(0))) || 0 : 0;
  }

  /**
   * Compiles changed nonempty stored source through the native setters.
   * Adapted: SOF can hydrate backing members without Initialize on a warm object.
   * Compare against each last successful source; failed parsing and empty source
   * retain existing programs, including after failed initialization.
   * Invalid nonempty backing text is retried on later samples.
   */
  Compile()
  {
    for (let index = 0; index < 3; index++)
    {
      const expression = this.GetExpression(index);
      if (expression !== "" && (!this._programs[index] || this._compiledSources[index] !== expression))
      {
        this.SetExpression(index, expression);
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
    this._currentTime = scaledTime;
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
   * Compiles as needed and writes the three evaluated components into the
   * caller-owned `out`, zeroing a fourth component when `out` is longer than 3.
   */
  _sample(time, out)
  {
    this.Compile();
    const context = this.GetContext(time);
    out[0] = Tr2CurveVector3Expression._evaluate(this._programs[0], context);
    out[1] = Tr2CurveVector3Expression._evaluate(this._programs[1], context);
    out[2] = Tr2CurveVector3Expression._evaluate(this._programs[2], context);
    if (out.length > 3)
    {
      out[3] = 0;
    }
    return out;
  }

  /**
   * Evaluates one component program, substituting 0 for a missing or invalid
   * program and for NaN/zero results; infinities remain unchanged.
   */
  static _evaluate(program, context)
  {
    return program?.IsValid() ? Number(program.Evaluate(context)) || 0 : 0;
  }
}

meta.blue.interfaceTable({
  interfaces: [ Tr2CurveVector3Expression, ITriColorFunction, ITriVectorFunction, ITriFunction, IInitialize ],
  chainTo: null
})(Tr2CurveVector3Expression);
