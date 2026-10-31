import { exposure as be } from "#be";
import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Curves/Tr2ScalarExprKeyCurve.h
// Source: trinity/trinity/Curves/Tr2ScalarExprKeyCurve.cpp
// Source: trinity/trinity/Curves/Tr2ScalarExprKeyCurve_Blue.cpp
import { finiteNumberOr } from "#utils/validation";
import { type, blue } from "#schema";
import { IInitialize, INotify } from "#blue";
import { noise } from "#math/noise";
import { CjsControllerExpressionProgram } from "../../controllers/expression/CjsControllerExpressionProgram.js";
import { Tr2CurveInterpolation } from "../enums.js";
import "../../generated/include/enums.js";


/**
 * One key of a Tr2ScalarExprKeyCurve whose time, value and tangents can each be
 * produced by an expression over the key's inputs, its random constant and the
 * previous key.
 */
@be.define("Tr2ScalarExprKey")
@be.inherit(INotify)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
export class Tr2ScalarExprKey extends IInitialize
{
  /** Key time in seconds. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  time = 0;

  /** Scalar sample value. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  value = 0;

  /** Incoming tangent value. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  left = 0;

  /** Outgoing tangent value. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  right = 0;

  /** Authored expression source for time. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.expression
  timeExpression = "";

  /** Authored expression source for value. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.expression
  valueExpression = "";

  /** Authored expression source for leftTangent. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.expression
  leftTangentExpression = "";

  /** Authored expression source for rightTangent. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.expression
  rightTangentExpression = "";

  /** Authored expression input 1. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  input1 = 0;

  /** Authored expression input 2. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  input2 = 0;

  /** Authored expression input 3. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  input3 = 0;

  /** Authored expression input 4. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  input4 = 0;

  /** Runtime random constant; readable without persistence. */
  @be.mapAttribute(be.READ)
  @type.float32
  randomConstant = 0;

  /** Minimum authored random range. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  randomMin = 0;

  /** Maximum authored random range. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  randomMax = 0;

  /** Runtime previous-key time; zero for the first key. */
  @be.mapAttribute(be.READ)
  @type.float32
  prevKeyTime = 0;

  /** Runtime previous-key value; zero for the first key. */
  @be.mapAttribute(be.READ)
  @type.float32
  prevKeyValue = 0;

  /**
   * Native signed Interpolation storage from Tr2Key<float>.
   * Adapted: the existing Tr2CurveInterpolation vocabulary has the same three
   * CONSTANT/LINEAR/HERMITE choices as ScalarInterpolationChooser.
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Curves/Tr2ScalarExprKeyCurve_Blue.cpp:50); chooser ScalarInterpolationChooser (trinity/trinity/Curves/Tr2ScalarExprKeyCurve_Blue.cpp:9).
   */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.ENUM, "trinity.ScalarInterpolationChooser")
  @type.int32
  @type.enum("trinity.ScalarInterpolationChooser")
  interpolation = Tr2CurveInterpolation.LINEAR;

  /**
   * Regenerates the key's random constant without evaluating its expressions.
   *
   * @adapted Carbon first compiles and retains four expression programs
   *   (Tr2ScalarExprKeyCurve.cpp:109-116). JavaScript defers compilation until
   *   evaluation and does not report compilation failures during initialization.
   * @returns {boolean} True.
   */

  Initialize()
  {
    this.RegenRandomConstant();
    return true;
  }

  /**
   * Re-evaluates all four expressions against one snapshot of the key's inputs.
   *
   * Carbon OnModified (Tr2ScalarExprKeyCurve.cpp:129-179).
   *
   * @adapted Carbon recompiles only the changed expression and evaluates the
   *   retained programs; ours compiles each expression on every evaluation, so
   *   the changed property is not needed. The values are the same.
   * @param {string} propertyName Modified property name; unused.
   * @returns {boolean} True after evaluation completes.
   */

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
   * Uses Carbon's CRT rand()/RAND_MAX quotient, including its inclusive endpoint.
   * Range arithmetic remains JavaScript Number arithmetic.
   *
   * @adapted
   * @returns {void}
   */
  @be.mapMethodAndWrap()
  RegenRandomConstant()
  {
    this.randomConstant = this.randomMin + carbonRandom.triFloatRandom01() * (this.randomMax - this.randomMin);
  }

  /**
   * Updates previous-key context and evaluates the four expressions from one snapshot.
   *
   * @adapted Programs are compiled on evaluation instead of retained; a
   *   compile failure keeps the field's previous value, as Carbon's skipped
   *   invalid program does. Missing previous-key
   *   context supplies zero time and value, as in Carbon.
   * @param {Tr2ScalarExprKey|null} previousKey Previous key, or null for the first key.
   * @returns {void}
   */

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
   * Empty source or a compilation failure returns the fallback; any result,
   * NaN and infinities included, is returned as Carbon stores it. Evaluation
   * exceptions propagate.
   * Custom: the existing JS parser helper substitutes for native retained programs;
   * this class-removal pass does not change expression evaluation semantics.
   *
   * @param {string} expression Expression source.
   * @param {number} fallback Value kept when the expression is empty or does not compile.
   * @param {object} [variables] Input snapshot; defaults to the current key's values.
   * @returns {number} Evaluated value or fallback.
   */
  Evaluate(expression, fallback, variables = this._expressionVariables())
  {
    if (!expression)
    {
      return fallback;
    }
    const program = this.SetExpression(null, expression);
    if (!program)
    {
      return fallback;
    }
    const value = Number(program.Evaluate({
      self: this,
      key: this,
      variables
    }));
    // Carbon stores Eval's result as it is, NaN included (Tr2ScalarExprKeyCurve.cpp:161-176).
    return value;
  }

  /**
   * Compiles an expression against the key's variables, functions and constants.
   *
   * Carbon: Tr2ScalarExprKey::SetExpression (trinity/trinity/Curves/Tr2ScalarExprKeyCurve.cpp:188-232). An empty
   * expression clears the program; a failed parse leaves the program as it was (ccpparser.cpp:51-54 returns before
   * BuildCode touches it).
   *
   * @adapted Carbon's CcpParser::Program& parser output is the return value, with the caller passing the current
   *   program (parser) back in so a failed parse can hand it back unchanged. Carbon retains one program per
   *   expression member (m_timeParser and its siblings) and compiles when an expression changes (Initialize,
   *   OnModified); this class compiles per Evaluate call, so every caller passes null. The variable table is
   *   _expressionVariables, the functions are SCALAR_EXPR_KEY_FUNCTIONS, and the constants come from the expression
   *   runtime. Not ported: the CCP_LOGERR for a failed parse (cpp:220), which per-call compilation would repeat on
   *   every frame, and the shared temp-arena resize (cpp:223-231), which the AST walker has no use for.
   * @param {CjsControllerExpressionProgram|null} parser The current program, handed back when the parse fails.
   * @param {string} expression Expression source.
   * @returns {CjsControllerExpressionProgram|null} The compiled program, null for an empty expression, or the passed program when the parse fails.
   */
  SetExpression(parser, expression)
  {
    if (!expression)
    {
      return null;
    }

    const program = CjsControllerExpressionProgram.Compile(expression, {
      functions: SCALAR_EXPR_KEY_FUNCTIONS,
      pureFunctions: SCALAR_EXPR_KEY_PURE_FUNCTIONS
    });
    if (!program.IsValid())
    {
      return parser;
    }

    return program;
  }

  /**
   * Snapshots the key's time, value, tangents, four inputs, random constant and
   * previous-key context. All four expression evaluations share this snapshot.
   * Custom: represents the native local VariableBuffer as a JavaScript record.
   *
   * @returns {object} Named expression inputs.
   */
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
  perlin_simple: (_ctx, x = 0) => (noise.perlin1DCarbon(finiteNumberOr(x, 0), 1.1, 2, 3) + 1) * 0.5,
  perlin: (_ctx, x = 0, a = 1, b = 1, n = 1) => (noise.perlin1DCarbon(finiteNumberOr(x, 0), finiteNumberOr(a, 0), finiteNumberOr(b, 0), Math.trunc(finiteNumberOr(n, 0))) + 1) * 0.5
};
const SCALAR_EXPR_KEY_PURE_FUNCTIONS = ["perlin_simple", "perlin"];


// Native own query table; no inherited exposure chain.
