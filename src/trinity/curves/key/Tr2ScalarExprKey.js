import { finiteNumberOr } from "#utils/validation";
// Source: trinity/trinity/Curves/Tr2ScalarExprKeyCurve.h
// Source: trinity/trinity/Curves/Tr2ScalarExprKeyCurve.cpp
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";
import { noise } from "#math/noise";
import { CjsControllerExpressionProgram } from "../../controllers/expression/CjsControllerExpressionProgram.js";
import { Tr2CurveInterpolation } from "../enums.js";


/**
 * One key of a Tr2ScalarExprKeyCurve whose time, value and tangents can each be
 * produced by an expression over the key's inputs, its random constant and the
 * previous key.
 */
@type.define({
  className: "Tr2ScalarExprKey",
  family: "curves"
})
export class Tr2ScalarExprKey extends CjsModel
{
  @edit.readwrite
  @edit.persist
  @type.uint32
  @type.enum("trinity.Tr2CurveInterpolation")
  interpolation = Tr2CurveInterpolation.LINEAR;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  input1 = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  input2 = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  input3 = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  input4 = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  time = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  value = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  left = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.expression
  leftTangentExpression = "";

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.expression
  rightTangentExpression = "";

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.expression
  timeExpression = "";

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.expression
  valueExpression = "";

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  randomMax = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  randomMin = 0;

  @edit.read
  @type.float32
  randomConstant = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  right = 0;

  @edit.read
  @type.float32
  prevKeyTime = 0;

  @edit.read
  @type.float32
  prevKeyValue = 0;

  /**
   * Regenerates the key's random constant without evaluating its expressions.
   *
   * Adapted: Carbon first compiles and retains four expression programs
   * (Tr2ScalarExprKeyCurve.cpp:109-116). JavaScript defers compilation until
   * evaluation and does not report compilation failures during initialization.
   *
   * @returns {boolean} True.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.RegenRandomConstant();
    return true;
  }

  /**
   * Re-evaluates all four expressions against one snapshot of the key's inputs.
   *
   * Adapted: Carbon recompiles only a changed expression and evaluates retained
   * programs. JavaScript compiles each expression on every evaluation, retains
   * previous-key context, and keeps the prior field value on compile failure or
   * NaN. The changed property is not used to select compilation.
   *
   * @param {string} propertyName Modified property name; unused.
   * @returns {boolean} True after evaluation completes.
   */
  @carbon.method
  @impl.adapted
  OnModified(propertyName)
  {
    const variables = this.#expressionVariables();
    this.time = this.Evaluate(this.timeExpression, Number(this.time), variables);
    this.value = this.Evaluate(this.valueExpression, Number(this.value), variables);
    this.left = this.Evaluate(this.leftTangentExpression, this.left, variables);
    this.right = this.Evaluate(this.rightTangentExpression, this.right, variables);
    return true;
  }

  /**
   * Regenerates the key's random constant from its authored range.
   *
   * Adapted: Uses the host Math.random stream and Number arithmetic instead of
   * Carbon's rand()/RAND_MAX and float arithmetic (Tr2ScalarExprKeyCurve.cpp:238-241).
   * The host unit sample is below one; the native quotient can equal one.
   * Native random sequences are not reproduced.
   *
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  RegenRandomConstant()
  {
    this.randomConstant = this.randomMin + Math.random() * (this.randomMax - this.randomMin);
  }

  /**
   * Updates previous-key context and evaluates the four expressions from one snapshot.
   *
   * Adapted: Represents Carbon's UpdateValues under a name that avoids the model
   * value-update lifecycle. Programs are compiled on evaluation instead of retained;
   * compile failures and NaN retain each field's previous value. Missing previous-key
   * context supplies zero time and value, as in Carbon.
   *
   * @param {Tr2ScalarExprKey|null} previousKey Previous key, or null for the first key.
   * @returns {void}
   */
  @carbon.renamed("UpdateValues")
  @impl.adapted
  @impl.note("Renamed to avoid collision with the CjsModel value-update lifecycle")
  ReEvaluate(previousKey)
  {
    this.prevKeyTime = Number(previousKey?.time ?? 0);
    this.prevKeyValue = Number(previousKey?.value ?? 0);
    const variables = this.#expressionVariables();
    this.time = this.Evaluate(this.timeExpression, Number(this.time), variables);
    this.value = this.Evaluate(this.valueExpression, Number(this.value), variables);
    this.left = this.Evaluate(this.leftTangentExpression, this.left, variables);
    this.right = this.Evaluate(this.rightTangentExpression, this.right, variables);
  }

  /**
   * Compiles and evaluates one expression using key variables and Perlin helpers.
   * Empty source, compilation failure or a NaN result returns the fallback.
   * Evaluation exceptions propagate, and infinite numeric results are retained.
   *
   * @param {string} expression Expression source.
   * @param {number} fallback Value retained when no usable result is produced.
   * @param {object} [variables] Input snapshot; defaults to the current key's values.
   * @returns {number} Evaluated value or fallback.
   */
  Evaluate(expression, fallback, variables = this.#expressionVariables())
  {
    if (!expression)
    {
      return fallback;
    }
    const program = CjsControllerExpressionProgram.Compile(expression, {
      emptyValue: fallback,
      functions: SCALAR_EXPR_KEY_FUNCTIONS,
      pureFunctions: SCALAR_EXPR_KEY_PURE_FUNCTIONS
    });
    if (!program.IsValid())
    {
      return fallback;
    }
    const value = Number(program.Evaluate({
      self: this,
      key: this,
      variables
    }));
    return Number.isNaN(value) ? fallback : value;
  }

  /**
   * Snapshots the key's time, value, tangents, four inputs, random constant and
   * previous-key context. All four expression evaluations share this snapshot.
   *
   * @returns {object} Named expression inputs.
   */
  #expressionVariables()
  {
    return {
      value: Number(this.value),
      time: Number(this.time),
      input1: this.input1,
      input2: this.input2,
      input3: this.input3,
      input4: this.input4,
      randomConstant: this.randomConstant,
      leftTangent: this.left,
      rightTangent: this.right,
      prevKeyTime: this.prevKeyTime,
      prevKeyValue: this.prevKeyValue
    };
  }

  static Tr2CurveInterpolation = Tr2CurveInterpolation;
}
const SCALAR_EXPR_KEY_FUNCTIONS = {
  perlin_simple: (_ctx, x = 0) => (noise.carbonPerlin1D(finiteNumberOr(x, 0), 1.1, 2, 3) + 1) * 0.5,
  perlin: (_ctx, x = 0, a = 1, b = 1, n = 1) => (noise.carbonPerlin1D(finiteNumberOr(x, 0), finiteNumberOr(a, 0), finiteNumberOr(b, 0), Math.trunc(finiteNumberOr(n, 0))) + 1) * 0.5
};
const SCALAR_EXPR_KEY_PURE_FUNCTIONS = ["perlin_simple", "perlin"];

