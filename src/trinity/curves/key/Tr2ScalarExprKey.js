// Source: trinity/trinity/Curves/Tr2ScalarExprKeyCurve.h
// Source: trinity/trinity/Curves/Tr2ScalarExprKeyCurve.cpp
// Source: trinity/trinity/Curves/Tr2ScalarExprKeyCurve_Blue.cpp
import { finiteNumberOr } from "#utils/validation";
import { meta, types } from "#schema";
import { IInitialize, INotify } from "#blue";
import { noise } from "#math/noise";
import { CjsControllerExpressionProgram } from "../../controllers/expression/CjsControllerExpressionProgram.js";
import { Tr2CurveInterpolation } from "../enums.js";


/**
 * One key of a Tr2ScalarExprKeyCurve whose time, value and tangents can each be
 * produced by an expression over the key's inputs, its random constant and the
 * previous key.
 */
@meta.define({
  className: "Tr2ScalarExprKey",
  family: "curves"
})
@meta.carbon.inherit(INotify)
export class Tr2ScalarExprKey extends IInitialize
{
  /** Key time in seconds. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  time = 0;

  /** Scalar sample value. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  value = 0;

  /** Incoming tangent value. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  left = 0;

  /** Outgoing tangent value. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  right = 0;

  /** Authored expression source for time. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.expression
  timeExpression = "";

  /** Authored expression source for value. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.expression
  valueExpression = "";

  /** Authored expression source for leftTangent. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.expression
  leftTangentExpression = "";

  /** Authored expression source for rightTangent. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.expression
  rightTangentExpression = "";

  /** Authored expression input 1. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  input1 = 0;

  /** Authored expression input 2. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  input2 = 0;

  /** Authored expression input 3. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  input3 = 0;

  /** Authored expression input 4. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  input4 = 0;

  /** Runtime random constant; readable without persistence. */
  @meta.edit.read
  @types.float32
  randomConstant = 0;

  /** Minimum authored random range. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  randomMin = 0;

  /** Maximum authored random range. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  randomMax = 0;

  /** Runtime previous-key time; zero for the first key. */
  @meta.edit.read
  @types.float32
  prevKeyTime = 0;

  /** Runtime previous-key value; zero for the first key. */
  @meta.edit.read
  @types.float32
  prevKeyValue = 0;

  /**
   * Native signed Interpolation storage from Tr2Key<float>.
   * Adapted: the existing Tr2CurveInterpolation vocabulary has the same three
   * CONSTANT/LINEAR/HERMITE choices as ScalarInterpolationChooser.
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.int32
  @types.enum("trinity.Tr2CurveInterpolation")
  interpolation = Tr2CurveInterpolation.LINEAR;

  /**
   * Regenerates the key's random constant without evaluating its expressions.
   *
   * Adapted: Carbon first compiles and retains four expression programs
   * (Tr2ScalarExprKeyCurve.cpp:109-116). JavaScript defers compilation until
   * evaluation and does not report compilation failures during initialization.
   *
   * @returns {boolean} True.
   */
  @meta.carbon.method
  @meta.impl.adapted
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
  @meta.carbon.method
  @meta.impl.adapted
  OnModified(propertyName)
  {
    const variables = this._expressionVariables();
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
  @meta.carbon.method
  @meta.impl.adapted
  RegenRandomConstant()
  {
    this.randomConstant = this.randomMin + Math.random() * (this.randomMax - this.randomMin);
  }

  /**
   * Updates previous-key context and evaluates the four expressions from one snapshot.
   *
   * Adapted: Programs are compiled on evaluation instead of retained;
   * compile failures and NaN retain each field's previous value. Missing previous-key
   * context supplies zero time and value, as in Carbon.
   *
   * @param {Tr2ScalarExprKey|null} previousKey Previous key, or null for the first key.
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.adapted
  UpdateValues(previousKey)
  {
    this.prevKeyTime = Number(previousKey?.time ?? 0);
    this.prevKeyValue = Number(previousKey?.value ?? 0);
    const variables = this._expressionVariables();
    this.time = this.Evaluate(this.timeExpression, Number(this.time), variables);
    this.value = this.Evaluate(this.valueExpression, Number(this.value), variables);
    this.left = this.Evaluate(this.leftTangentExpression, this.left, variables);
    this.right = this.Evaluate(this.rightTangentExpression, this.right, variables);
  }

  /**
   * Compiles and evaluates one expression using key variables and Perlin helpers.
   * Empty source, compilation failure or a NaN result returns the fallback.
   * Evaluation exceptions propagate, and infinite numeric results are retained.
   * Custom: the existing JS parser helper substitutes for native retained programs;
   * this class-removal pass does not change expression evaluation semantics.
   *
   * @param {string} expression Expression source.
   * @param {number} fallback Value retained when no usable result is produced.
   * @param {object} [variables] Input snapshot; defaults to the current key's values.
   * @returns {number} Evaluated value or fallback.
   */
  @meta.impl.custom
  Evaluate(expression, fallback, variables = this._expressionVariables())
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
   * Custom: represents the native local VariableBuffer as a JavaScript record.
   *
   * @returns {object} Named expression inputs.
   */
  @meta.impl.custom
  _expressionVariables()
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

  /** Existing enum convenience; does not create a second enum registry. */
  static Tr2CurveInterpolation = Tr2CurveInterpolation;
}
const SCALAR_EXPR_KEY_FUNCTIONS = {
  perlin_simple: (_ctx, x = 0) => (noise.carbonPerlin1D(finiteNumberOr(x, 0), 1.1, 2, 3) + 1) * 0.5,
  perlin: (_ctx, x = 0, a = 1, b = 1, n = 1) => (noise.carbonPerlin1D(finiteNumberOr(x, 0), finiteNumberOr(a, 0), finiteNumberOr(b, 0), Math.trunc(finiteNumberOr(n, 0))) + 1) * 0.5
};
const SCALAR_EXPR_KEY_PURE_FUNCTIONS = ["perlin_simple", "perlin"];


// Native own query table; no inherited exposure chain.
meta.carbon.interfaceTable({ interfaces: [ Tr2ScalarExprKey, IInitialize, INotify ], chainTo: null })(Tr2ScalarExprKey);
