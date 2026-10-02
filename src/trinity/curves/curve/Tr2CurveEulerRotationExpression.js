// Source: trinity/trinity/Curves/Tr2CurveEulerRotationExpression.h
// Source: trinity/trinity/Curves/Tr2CurveEulerRotationExpression.cpp
import { fromYawPitchRoll, quat } from "#math/quat";
import { ITriFunction, ITriQuaternionFunction, ITriScalarFunction, IInitialize, BlueList } from "#blue";
import { meta } from "#schema";
import { CjsControllerExpressionProgram } from "../../controllers/expression/CjsControllerExpressionProgram.js";


/**
 * Quaternion curve built from three independently compiled expressions producing
 * yaw, pitch and roll in radians at time divided by timeScale.
 */
@meta.define({
  className: "Tr2CurveEulerRotationExpression",
  family: "curves"
})
@meta.blue.inherit(IInitialize)
export class Tr2CurveEulerRotationExpression extends ITriQuaternionFunction
{
  /**
   * Authored curve label stored as native std::string.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /**
   * Persisted yaw source text backing the live expressionYaw property.
   * @type {string}
   */
  @meta.member("expressionYaw")
  @meta.blue.persistOnly
  @meta.type.expression
  _expressionYaw = "";

  /** Gets the live yaw expression text. @returns {string} Source text. */
  @meta.property()
  @meta.blue.readwrite
  @meta.type.expression
  @meta.implemented
  get expressionYaw()
  {
    return this.GetExpressionYaw();
  }

  /** Writes through the compile/commit setter. @param {string} expression Source text. */
  @meta.implemented
  set expressionYaw(expression)
  {
    this.SetExpressionYaw(expression);
  }

  /**
   * Persisted pitch source text backing the live expressionPitch property.
   * @type {string}
   */
  @meta.member("expressionPitch")
  @meta.blue.persistOnly
  @meta.type.expression
  _expressionPitch = "";

  /** Gets the live pitch expression text. @returns {string} Source text. */
  @meta.property()
  @meta.blue.readwrite
  @meta.type.expression
  @meta.implemented
  get expressionPitch()
  {
    return this.GetExpressionPitch();
  }

  /** Writes through the compile/commit setter. @param {string} expression Source text. */
  @meta.implemented
  set expressionPitch(expression)
  {
    this.SetExpressionPitch(expression);
  }

  /**
   * Persisted roll source text backing the live expressionRoll property.
   * @type {string}
   */
  @meta.member("expressionRoll")
  @meta.blue.persistOnly
  @meta.type.expression
  _expressionRoll = "";

  /** Gets the live roll expression text. @returns {string} Source text. */
  @meta.property()
  @meta.blue.readwrite
  @meta.type.expression
  @meta.implemented
  get expressionRoll()
  {
    return this.GetExpressionRoll();
  }

  /** Writes through the compile/commit setter. @param {string} expression Source text. */
  @meta.implemented
  set expressionRoll(expression)
  {
    this.SetExpressionRoll(expression);
  }

  /**
   * Cached orientation quaternion produced from yaw, pitch and roll in radians.
   * @type {Float32Array}
   */
  @meta.blue.read
  @meta.type.quat
  currentValue = quat.create();

  /**
   * Owned native scalar-function input list sampled by expression input lookup.
   * @type {BlueList<ITriScalarFunction>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITriScalarFunction")
  inputs = new BlueList(ITriScalarFunction, { className: null, listOps: 0 });

  /**
   * First authored scalar argument exposed to each rotation expression.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  input1 = 0;

  /**
   * Second authored scalar argument exposed to each rotation expression.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  input2 = 0;

  /**
   * Third authored scalar argument exposed to each rotation expression.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  input3 = 0;

  /**
   * Fourth authored scalar argument exposed to each rotation expression.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  input4 = 0;

  /**
   * Divisor applied before expression evaluation and implicit-time input sampling.
   * @type {number}
   */
  timeScale = 1;

  /**
   * Per-instance random value retained until ResetRandomConstant; generated with Math.random.
   * @type {number}
   */
  randomConstant = Math.random();

  /**
   * Compiled JavaScript expression programs for yaw, pitch and roll; null means no program.
   * @type {Array<CjsControllerExpressionProgram|null>}
   */
  _programs = [null, null, null];

  /**
   * Source text of each successfully compiled program, used to detect pending recompilation.
   * @type {string[]}
   */
  _sources = ["", "", ""];

  /**
   * Most recent scaled evaluation time used by implicit-time input lookup.
   * @type {number}
   */
  _currentTime = 0;

  /**
   * Replays nonempty stored source through setters after clearing each backing field.
   * Uses the existing JavaScript parser; a failed compile retains its old program.
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
        this["_expression" + ["Yaw", "Pitch", "Roll"][index]] = "";
        this.SetExpression(index, expression);
      }
    }
    return true;
  }

  /**
   * Updates the cached quaternion.
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  UpdateValue(time)
  {
    this.GetValue(time, this.currentValue);
  }

  /**
   * Updates the cache and copies to a caller destination using the JavaScript output convention.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination.
   * @returns {Float32Array} The destination.
   */
  @meta.blue.method
  @meta.adapted
  Update(time, out)
  {
    this.GetValue(time, this.currentValue);
    return quat.copy(out, this.currentValue);
  }

  /**
   * Preserves the native GetValueAt alias via the JavaScript caller-output convention.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination.
   * @returns {Float32Array} The destination.
   */
  @meta.blue.method
  @meta.adapted
  GetValueAt(time, out)
  {
    return this.GetValue(time, out);
  }

  /**
   * Samples with the existing JavaScript parser, context and quaternion conversion.
   * Native float-time rounding, parser and error policies remain adapted.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination.
   * @returns {Float32Array} The destination.
   */
  @meta.blue.method
  @meta.adapted
  GetValue(time, out)
  {
    this.Compile();
    const context = this.GetContext(time);
    return fromYawPitchRoll(out, Tr2CurveEulerRotationExpression._evaluate(this._programs[0], context), Tr2CurveEulerRotationExpression._evaluate(this._programs[1], context), Tr2CurveEulerRotationExpression._evaluate(this._programs[2], context));
  }

  /**
   * Retains the native no-op first derivative.
   * @param {number} _time Unused time.
   * @param {Float32Array} out Destination.
   * @returns {Float32Array} Unchanged destination.
   */
  @meta.blue.method
  @meta.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * Retains the native no-op second derivative.
   * @param {number} _time Unused time.
   * @param {Float32Array} out Destination.
   * @returns {Float32Array} Unchanged destination.
   */
  @meta.blue.method
  @meta.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /** Reads one stored component expression. @param {number} index Component index. @returns {string} Source. */
  @meta.blue.method
  @meta.implemented
  GetExpression(index)
  {
    return this["_expression" + ["Yaw", "Pitch", "Roll"][index]];
  }

  /**
   * Compiles nonempty source before committing it; invalid source preserves the old
   * source/program and empty source retains the old program. Uses the existing JS parser.
   * @param {number} index Component index.
   * @param {string} expression Source text.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetExpression(index, expression)
  {
    const field = "_expression" + ["Yaw", "Pitch", "Roll"][index];
    if (expression === "")
    {
      this[field] = expression;
      return;
    }
    const program = CjsControllerExpressionProgram.Compile(expression, { emptyValue: 0 });
    if (!program.IsValid()) return;
    this._programs[index] = program;
    this._sources[index] = expression;
    this[field] = expression;
  }

  /** Gets the stored yaw expression text. @returns {string} Source text. */
  @meta.blue.method
  @meta.implemented
  GetExpressionYaw()
  {
    return this.GetExpression(0);
  }

  /** Gets the stored pitch expression text. @returns {string} Source text. */
  @meta.blue.method
  @meta.implemented
  GetExpressionPitch()
  {
    return this.GetExpression(1);
  }

  /** Gets the stored roll expression text. @returns {string} Source text. */
  @meta.blue.method
  @meta.implemented
  GetExpressionRoll()
  {
    return this.GetExpression(2);
  }

  /**
   * Sets the yaw expression through the adapted parser/commit contract.
   * @param {string} expression Source text.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetExpressionYaw(expression)
  {
    this.SetExpression(0, expression);
  }

  /**
   * Sets the pitch expression through the adapted parser/commit contract.
   * @param {string} expression Source text.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetExpressionPitch(expression)
  {
    this.SetExpression(1, expression);
  }

  /**
   * Sets the roll expression through the adapted parser/commit contract.
   * @param {string} expression Source text.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetExpressionRoll(expression)
  {
    this.SetExpression(2, expression);
  }

  /**
   * Backs the expression `input`/`inputAt` functions by sampling the n-th input
   * curve, defaulting to the time of the most recent GetContext call and
   * returning 0 when no such input exists. JavaScript coerces the index to int32.
   * @param {number} index Input index.
   * @param {number} [time] Sample time, defaulting to the scaled context time.
   * @returns {number} Sample or zero.
   */
  @meta.blue.method
  @meta.adapted
  GetInputValue(index, time = this._currentTime)
  {
    const input = this.inputs[index | 0];
    return input ? input.GetValueAt(time) : 0;
  }

  /**
   * Gets this curve's per-instance random constant, which stays fixed until
   * ResetRandomConstant is called so `randomConstant` expressions are stable
   * over time. Native fake-random override is not implemented.
   * @returns {number} Cached random constant.
   */
  @meta.blue.method
  @meta.adapted
  GetRandomConstant()
  {
    return this.randomConstant;
  }

  /** Draws via Math.random rather than the native RNG. @returns {void} */
  @meta.blue.method
  @meta.adapted
  ResetRandomConstant()
  {
    this.randomConstant = Math.random();
  }

  /**
   * Gets the curve expression terms offered to an editor, including `radians`
   * because this curve's outputs are angles. Uses the shared JavaScript term schema.
   * @returns {Array} Editor term descriptors.
   */
  @meta.blue.method
  @meta.adapted
  GetExpressionTermInfo()
  {
    return CjsControllerExpressionProgram.getCurveTermInfo({
      includeRadians: true
    });
  }

  /**
   * Compiles and evaluates an arbitrary expression against this curve's context
   * at time 0, returning 0 when it does not compile; uses the JavaScript parser.
   * @param {string} expression Source text.
   * @returns {number} Evaluation result or zero.
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
   * Compiles changed nonempty persisted source for hydration without Initialize.
   * Only successful compilation advances the source associated with each program.
   * Retained programs survive empty source and failed initialization.
   * @returns {void}
   */
  @meta.ours
  Compile()
  {
    for (let index = 0; index < 3; index++)
    {
      const expression = this.GetExpression(index);
      if (expression !== "" && (!this._programs[index] || this._sources[index] !== expression)) this.SetExpression(index, expression);
    }
  }

  /**
   * Builds the evaluation context for a sample, dividing the caller time by
   * timeScale, recording it as the current input time, and exposing it alongside
   * input1..input4 as expression variables.
   * @param {number} time Time in seconds.
   * @returns {object} JavaScript evaluation context.
   */
  @meta.ours
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
   * Evaluates one angle program, substituting 0 for a missing or invalid program
   * and for NaN/zero results; Infinity retains the existing evaluator behavior.
   * @param {CjsControllerExpressionProgram|null} program Cached program.
   * @param {object} context Evaluation context.
   * @returns {number} Angle value.
   */
  @meta.ours
  static _evaluate(program, context)
  {
    return program && program.IsValid() ? Number(program.Evaluate(context)) || 0 : 0;
  }
}

// Exact native exposure table; no inherited exposure chain.
meta.blue.interfaceTable({ interfaces: [Tr2CurveEulerRotationExpression, ITriQuaternionFunction, ITriFunction, IInitialize], chainTo: null })(Tr2CurveEulerRotationExpression);
