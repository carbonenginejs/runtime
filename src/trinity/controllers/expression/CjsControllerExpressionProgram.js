// Source: parser/include/ccpparser.h (CcpParser::Parse, Program, Observer)
// Behavioral reference: ccpwgl/src/unsupported/state/expression/Tr2ExpressionProgram.js
//
// This IS a port of Carbon's expression program, and the contract is Carbon's:
// parse an expression against a set of externals, evaluate it, and report the
// variables and functions it referenced. Carbon reports those through
// Observer::OnVariable/OnFunction; we expose the same names for dirty tracking.
//
// THE REPRESENTATION DIFFERS, AND THAT IS THE BROWSER CONSTRAINT. Carbon
// compiles to bytecode - Program holds a std::vector<uint8_t> and evaluates it
// with a caller-supplied temp arena (ccpparser.h:26-40). The JavaScript
// shortcut equivalent to that is new Function / eval, which is unavailable
// under a content security policy and is a code-injection surface for
// expressions arriving in asset data. So this compiles to an AST and walks it.
// The file is long because the bytecode VM is absent, not because it is a
// second design.
//
// An earlier version of this comment said Carbon has Tr2ControllerExpression
// and no Tr2ExpressionProgram runtime class. That is true of trinity/ and
// false of Carbon: CcpParser lives in the parser repo. It was read as evidence
// of invention during the 2026-09-04 fidelity audit. Carbon is 32 repositories.
import { CjsControllerExpressionParser } from "./CjsControllerExpressionParser.js";
import { DaysSinceServerTime, EvaluateNode, GetExternalControllerVariable, HasFunction, HasProperty, IsFunctionPure, ToBoolean, ToNumber } from "./expressionRuntime.js";
const CONTROLLER_EXPRESSION_TERMS = [
  ["Controller", "StateTime", "time in seconds the current state is running"],
  ["Controller", "AnimationTime", "geometry animation duration for the given name"],
  ["Controller", "CurveSetTime", "duration in seconds of the named curve set"],
  ["Controller", "GetExternalControllerVariable", "external controller variable lookup"],
  ["Controller", "IsAnimationPlaying", "returns 1 if the named animation layer is playing"],
  ["Controller", "ShipSpeed", "owning ship speed"],
  ["Controller", "ShipMaxSpeed", "owning ship maximum speed"],
  ["Controller", "ShipBoosterIntensity", "owning ship booster intensity"],
  ["Controller", "Random", "random integer from min to max - 1"],
  ["Controller", "KillCount", "owning ship kill count"],
  ["Controller", "BoundingSphereRadius", "owning object's bounding sphere radius"],
  ["GraphicSettings", "ShaderQuality", "user shader quality setting"],
  ["DateTime", "IsWeekend", "returns 1 on Saturday or Sunday"],
  ["DateTime", "ServerYear", "current server year"],
  ["DateTime", "ServerMonth", "current server month"],
  ["DateTime", "ServerDay", "current server day of month"],
  ["DateTime", "ServerDayOfWeek", "current server day of week"],
  ["DateTime", "ServerHour", "current server hour"],
  ["DateTime", "ServerMinute", "current server minute"],
  ["DateTime", "ServerSecond", "current server second"],
  ["DateTime", "ServerTimePhase", "seconds phase in a server-time period"],
  ["DateTime", "ServerTimeGreaterThan", "server-time comparison"],
  ["DateTime", "ServerTimeLessThanOrEqual", "server-time comparison"],
  ["DateTime", "ServerTimeEqual", "server-time equality comparison"],
  ["DateTime", "DaysSinceServerTime", "days since the supplied server date"]
].map(([group, name, description]) => ({ group, name, description, kind: "function" }));
const CURVE_EXPRESSION_TERMS = [
  ["Random", "fractal", "function", "x, alpha, beta, n", "fractal noise"],
  ["Random", "noise", "function", "x", "simple one-octave noise"],
  ["Random", "randomConstant", "function", "a, b", "random per-curve constant in range [a, b)"],
  ["Random", "randconst", "function", "a, b", "random per-curve constant in range [a, b)"],
  ["Random", "random", "function", "a, b", "random value in range [a, b)"],
  ["Random", "randhash", "function", "a, b, x", "random value in range [a, b) based on value x"],
  ["Inputs", "input", "function", "n", "n-th input curve value at current time"],
  ["Inputs", "inputAt", "function", "n, t", "input curve value at time t"],
  ["Math", "clamp", "function", "x, min, max", "value x clamped to [min, max] range"],
  ["Inputs", "input1", "variable", null, "input1 attribute"],
  ["Inputs", "input2", "variable", null, "input2 attribute"],
  ["Inputs", "input3", "variable", null, "input3 attribute"],
  ["Inputs", "input4", "variable", null, "input4 attribute"],
  ["Inputs", "time", "variable", null, "current time"],
  ["Math", "pi", "variable", null, "Pi value"],
  ["Math", "pi2", "variable", null, "Pi x 2 value"]
].map(([group, name, kind, parameters, description]) => ({
  group,
  name,
  kind,
  ...(parameters ? { parameters } : {}),
  description
}));
/**
 * Compiles a Carbon controller or curve expression into an AST and evaluates it
 * without dynamic JavaScript eval, exposing the referenced variable and function
 * names for dirty tracking.
 */
export class CjsControllerExpressionProgram
{
  source = "";

  options = {};

  ast = null;

  error = "";

  variableNames = new Set();

  functionNames = new Set();

  #error = null;

  /**
   * Creates a program and immediately compiles the supplied source; compilation
   * failures are captured in `error` rather than thrown.
   */
  constructor(source = "", options = {})
  {
    this.Compile(source, options);
  }

  /**
   * Compiles a constrained expression into an AST.
   */
  Compile(source = this.source, options = this.options)
  {
    this.source = source || "";
    this.options = options || {};
    this.error = "";
    this.#error = null;
    this.variableNames.clear();
    this.functionNames.clear();
    if (!this.source)
    {
      this.ast = {
        type: "literal",
        value: this.options.emptyValue ?? 1
      };
      return this;
    }
    try
    {
      const parser = new CjsControllerExpressionParser(this.source, this.options);
      this.ast = parser.Parse();
      this.variableNames = parser.variableNames;
      this.functionNames = parser.functionNames;
    }
    catch (err)
    {
      this.ast = null;
      this.#error = err instanceof Error ? err : new Error(String(err));
      this.error = this.#error.message;
    }
    return this;
  }

  /**
   * Evaluates the compiled expression without using dynamic JavaScript eval.
   */
  Evaluate(context = {})
  {
    if (!this.ast)
    {
      if (this.#error)
      {
        throw this.#error;
      }
      return 0;
    }
    return EvaluateNode(this.ast, context, this);
  }

  /**
   * Evaluates the compiled expression as a Carbon-style numeric boolean.
   */
  EvaluateBoolean(context = {})
  {
    return ToBoolean(this.Evaluate(context));
  }

  /**
   * Checks whether the expression compiled successfully.
   */
  IsValid()
  {
    return !!this.ast && !this.error;
  }

  /**
   * Gets variable names referenced by the expression.
   */
  GetVariableNames()
  {
    return Array.from(this.variableNames);
  }

  /**
   * Gets function names referenced by the expression.
   */
  GetFunctionNames()
  {
    return Array.from(this.functionNames);
  }

  /**
   * Checks whether any referenced function can change without variable dirties.
   */
  HasNonPureFunctions()
  {
    for (const name of this.functionNames)
    {
      if (!IsFunctionPure(name, this.options))
      {
        return true;
      }
    }
    return false;
  }

  /**
   * Creates the mutable per-action cache record that compileCached and
   * makeActionContext operate on, holding the last compiled program, its source,
   * and the action's start and last evaluation times.
   */
  static createRuntimeState()
  {
    return {
      controller: null,
      program: null,
      source: "",
      startTime: 0,
      lastTime: 0
    };
  }

  /**
   * Recompiles into the supplied runtime state only when the expression text has
   * changed, so per-frame evaluation does not re-parse.
   */
  static compileCached(state, expression, emptyValue = 0, functions)
  {
    if (!state.program || state.source !== expression)
    {
      state.program = this.Compile(expression, { emptyValue, functions });
      state.source = expression;
    }
    return state.program;
  }

  /**
   * Builds the evaluation context for an action, deriving `stateTime` from the
   * runtime state's start and last times and delegating to the controller's own
   * GetExpressionContext when it has one.
   */
  static makeActionContext(controller, owner, state, extra = {})
  {
    const stateTime = state.lastTime - state.startTime;
    if (controller?.GetExpressionContext)
    {
      return controller.GetExpressionContext(owner, null, { ...extra, stateTime });
    }
    return {
      ...extra,
      controller: controller ?? undefined,
      owner,
      stateTime,
      time: state.lastTime
    };
  }

  /**
   * Samples an arbitrary curve-like object at a time, trying GetValueAt,
   * GetValue and Update in that order before falling back to a currentValue
   * property or a plain numeric coercion.
   */
  static getCurveValue(curve, time)
  {
    if (HasFunction(curve, "GetValueAt"))
    {
      return ToNumber(curve.GetValueAt(time));
    }
    if (HasFunction(curve, "GetValue"))
    {
      return ToNumber(curve.GetValue(time));
    }
    if (HasFunction(curve, "Update"))
    {
      return ToNumber(curve.Update(time));
    }
    return HasProperty(curve, "currentValue") ? ToNumber(curve.currentValue) : ToNumber(curve);
  }

  /**
   * Appends the controller, graphics-setting and server-date expression terms to
   * an editor term list, skipping group/name pairs already present and adding
   * the `Curve` term only when the caller declares a curve.
   */
  static addControllerTermInfo(out, options = {})
  {
    for (const term of CONTROLLER_EXPRESSION_TERMS)
    {
      if (!out.some(item => item.group === term.group && item.name === term.name))
      {
        out.push(term);
      }
    }
    if (options.curve && !out.some(item => item.group === "Controller" && item.name === "Curve"))
    {
      out.push({
        group: "Controller",
        name: "Curve",
        description: "action curve value at time x",
        kind: "function"
      });
    }
  }

  /**
   * Returns a fresh copy of the curve-expression term list for editor
   * autocompletion, optionally including the `radians` function.
   */
  static getCurveTermInfo(options = {})
  {
    const terms = CURVE_EXPRESSION_TERMS.map(term => ({ ...term }));
    if (options.includeRadians)
    {
      terms.splice(9, 0, {
        group: "Math",
        name: "radians",
        kind: "function",
        parameters: "x",
        description: "convert x degrees to radians"
      });
    }
    return terms;
  }

  /**
   * Static factory that compiles expression source into a ready program, the
   * form callers use instead of constructing and compiling in two steps.
   */
  static Compile(source, options = {})
  {
    return new CjsControllerExpressionProgram(source, options);
  }
}

/**
 * Recursive-descent parser turning expression source into the AST evaluated by
 * CjsControllerExpressionProgram, collecting referenced variable and function
 * names and rejecting identifiers that could reach the JavaScript prototype
 * chain.
 */
