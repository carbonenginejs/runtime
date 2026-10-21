import { exposure as be } from "#be";
import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/attributeModifiers/EveSmartLightAttributeModifierExpressionBucket.h
import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import * as CcpLog from "../../../../global/logging/ccpLog.js";
import { meta, type, blue } from "#schema";
import { EveSmartLightBaseAttributeModifier } from "./EveSmartLightBaseAttributeModifier.js";
import { IEveSmartLightGroupAttributeModifier } from "./IEveSmartLightGroupAttributeModifier.js";
import { EveSmartLightAttributeModifierBucket } from "./EveSmartLightAttributeModifierBucket.js";
import { CjsControllerExpressionProgram } from "../../../controllers/expression/CjsControllerExpressionProgram.js";
import { vec3 } from "#math/vec3";
import { EveSmartLightAttributeModifierExpressionBucketArguments } from "./EveSmartLightAttributeModifierExpressionBucketArguments.js";

/** EveSmartLightAttributeModifierExpressionBucket (eve/smartLights/attributeModifiers) - generated from schema shapeHash 02cc58c3.... */
@be.define("EveSmartLightAttributeModifierExpressionBucket")
@blue.inherit(IInitialize)
@be.mapInterface(EveSmartLightAttributeModifierBucket)
@be.mapInterface(IEveSmartLightGroupAttributeModifier)
@be.mapInterface(EveSmartLightBaseAttributeModifier)
@be.mapInterface(IInitialize)
export class EveSmartLightAttributeModifierExpressionBucket extends EveSmartLightAttributeModifierBucket
{

  /**
   * m_expression (std::string, private, h:41), persisted under its exposed
   * name by MAP_ATTRIBUTE "expression" PERSISTONLY
   * (EveSmartLightAttributeModifierExpressionBucket_Blue.cpp:20). Readers
   * write it directly, bypassing the setter; Initialize compiles it.
   */
  @blue.attribute("expression")
  @blue.persistOnly
  @type.expression
  _expression = "";

  /**
   * Carbon MAP_PROPERTY "expression" over GetExpression/SetExpression
   * (EveSmartLightAttributeModifierExpressionBucket_Blue.cpp:21): the setter
   * compiles the replacement.
   */
  @be.mapProperty()
  @type.expression
  @meta.implemented
  get expression()
  {
    return this.GetExpression();
  }

  /** Stores and compiles the replacement expression. */
  @meta.implemented
  set expression(value)
  {
    this.SetExpression(value);
  }

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "bucket";

  /** m_inputs (PITriScalarFunctionVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("ITriScalarFunction")
  expressionInputs = [];

  /**
   * Value after the last update: Carbon's READ attribute "currentValue" over
   * the inherited m_activationStrength
   * (EveSmartLightAttributeModifierExpressionBucket_Blue.cpp:23), which this
   * port stores as attributeMultiplier.
   */
  @be.mapAttribute(be.READ)
  @type.float32
  get currentValue()
  {
    return this.attributeMultiplier;
  }

  /** Compiled expression program (Carbon m_program, a CcpParser::Program). */
  _program = null;

  /** m_randomConstant (float) - per-instance random constant (h:48). */
  _randomConstant = carbonRandom.triFloatRandom01();

  // m_arguments (h:50-55): the expression variable bindings, embedded by
  // value and refreshed each synchronous update.
  _arguments = new EveSmartLightAttributeModifierExpressionBucketArguments();

  /**
   * Compiles the authored expression after load
   * (EveSmartLightAttributeModifierExpressionBucket.cpp:93-103).
   *
   * Adapted: CcpParser is replaced by the shared CjsControllerExpressionProgram VM, matching
   * the Tr2CurveScalarExpression consumer pattern.
   */
  @blue.method
  @meta.adapted
  Initialize()
  {
    super.Initialize();
    if (this._expression)
    {
      this.SetExpression(this._expression);
    }
    return true;
  }

  /**
   * Carbon's GetInputValue( index ): the n-th input sampled at the current
   * context time; zero for an out-of-range index.
   * @param {number} index Input index.
   * @returns {number}
   */
  @blue.method
  @meta.implemented
  GetInputValue(index)
  {
    return this.GetInputValue__Time(index, this._arguments.time);
  }

  /**
   * Carbon's GetInputValue( index, time ): the n-th input sampled at time.
   * @param {number} index Input index.
   * @param {number} time Sample time.
   * @returns {number}
   */
  @meta.implemented
  @blue.method
  GetInputValue__Time(index, time)
  {
    const i = index | 0;
    if (i < 0 || i >= this.expressionInputs.length)
    {
      return 0;
    }
    const input = this.expressionInputs[i];
    return input ? Number(input.GetValueAt(time)) : 0;
  }

  /** Gets this bucket's random constant (cpp:123-126). */
  @blue.method
  @meta.implemented
  GetRandomConstant()
  {
    return this._randomConstant;
  }

  /** Gets the authored expression (cpp:128-131). */
  @blue.method
  @meta.implemented
  GetExpression()
  {
    return this._expression;
  }

  /**
   * Carbon SetExpression (EveSmartLightAttributeModifierExpressionBucket.cpp:134-164):
   * - an empty expression is stored and returns early, so the previously
   *   compiled program keeps running (cpp:136-140);
   * - a parse error is logged and returns, so both the old expression and the
   *   old program stay (cpp:157-161);
   * - otherwise the new program and expression replace them (cpp:162-163).
   *
   * Adapted: the shared CjsControllerExpressionProgram VM replaces CcpParser,
   * and its temp arena (cpp:162) has no counterpart.
   */
  @blue.method
  @meta.adapted
  SetExpression(expression)
  {
    const text = String(expression ?? "");
    if (text === "")
    {
      this._expression = text;
      return;
    }

    const program = CjsControllerExpressionProgram.Compile(text, { emptyValue: 0 });
    if (!program.IsValid())
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "EveSmartLightAttributeModifierExpressionBucket::SetExpression invalid expression \"%s\": %s", text, program.error);
      return;
    }
    this._program = program;
    this._expression = text;
  }

  /** Regenerates the random constant (Carbon jessica hook, h:34). */
  @blue.method
  @meta.implemented
  ResetRandomConstant()
  {
    this._randomConstant = carbonRandom.triFloatRandom01();
  }

  /**
   * Expression terms exposed for tooling
   * (EveSmartLightAttributeModifierExpressionBucket.cpp:166-184).
   *
   * Adapted: Returns the term list in the CjsControllerExpressionProgram term-info shape
   * instead of Tr2ExpressionTermInfo instances.
   */
  @blue.method
  @meta.adapted
  GetExpressionTermInfo()
  {
    return [
      { group: "Random", name: "fractal", kind: "function", parameters: "x, alpha, beta, n", description: "fractal noise" },
      { group: "Random", name: "noise", kind: "function", parameters: "x", description: "simple one-octave noise" },
      { group: "Random", name: "randomConstant", kind: "function", parameters: "a, b", description: "random per-curve constant in range [a, b)" },
      { group: "Random", name: "randconst", kind: "function", parameters: "a, b", description: "random per-curve constant in range [a, b)" },
      { group: "Random", name: "random", kind: "function", parameters: "a, b", description: "random value in range [a, b)" },
      { group: "Random", name: "randhash", kind: "function", parameters: "a, b, x", description: "random value in range [a, b) based on value x" },
      { group: "Inputs", name: "input", kind: "function", parameters: "n", description: "n-th input curve value at current time" },
      { group: "Inputs", name: "inputAt", kind: "function", parameters: "n, t", description: "input curve value at time t" },
      { group: "Math", name: "clamp", kind: "function", parameters: "x, min, max", description: "value x clamped to [min, max] range" },
      { group: "Inputs", name: "time", kind: "variable", description: "current time" },
      { group: "Inputs", name: "shipSpeed", kind: "variable", description: "current speed of ship" },
      { group: "Inputs", name: "shipMaxSpeed", kind: "variable", description: "default maxSpeed for ship" },
      { group: "Math", name: "pi", kind: "variable", description: "Pi value" },
      { group: "Math", name: "pi2", kind: "variable", description: "Pi x 2 value" }
    ];
  }

  /**
   * Evaluates an arbitrary expression against the current argument bindings
   * (EveSmartLightAttributeModifierExpressionBucket.cpp:186-213).
   *
   * Adapted: Returns the numeric value directly (0 when the expression does not compile)
   * instead of Carbon's BlueStdResult out-parameter pair.
   */
  @blue.method
  @meta.adapted
  EvaluateExpression(expression)
  {
    const program = CjsControllerExpressionProgram.Compile(String(expression ?? ""), { emptyValue: 0 });
    if (!program.IsValid())
    {
      return 0;
    }
    return Number(program.Evaluate(this._MakeEvaluationContext())) || 0;
  }

  /**
   * Fans a controller variable out to the child modifiers; Carbon leaves the
   * expression-variable hookup as a todo
   * (EveSmartLightAttributeModifierExpressionBucket.cpp:215-223).
   */
  @blue.method
  @meta.implemented
  SetControllerVariable(name, value)
  {
    for (const modifier of this.attributeModifiers)
    {
      modifier.SetControllerVariable(name, value);
    }
  }

  /**
   * Expression-driven update
   * (EveSmartLightAttributeModifierExpressionBucket.cpp:225-250): folds the
   * multipliers directly (no crossfade state machine), advances play time,
   * updates the children with the UNSCALED parent multiplier, then evaluates
   * the expression into the attribute multiplier for the next fold.
   */
  @blue.method
  @meta.implemented
  UpdateSyncronous(updateContext, params, activationMultiplier)
  {
    this.finalAttributeMultiplier = activationMultiplier * this.attributeMultiplier * this.activationValue;
    this.playTime += updateContext.GetDeltaT();

    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.UpdateSyncronous(updateContext, params, activationMultiplier);
    }

    if (!this._expression)
    {
      return;
    }

    this._arguments.time = this.playTime;
    // cpp:240-242 reads the params unchecked.
    this._arguments.shipSpeed = EveSmartLightAttributeModifierExpressionBucket._ShipSpeed(params.spaceObjectParent);
    this._arguments.shipMaxSpeed = params.ownerMaxSpeed;

    if (this._program?.IsValid())
    {
      this.attributeMultiplier = Number(this._program.Evaluate(this._MakeEvaluationContext())) || 0;
    }
  }

  /** Shared VM context (curve/self carry GetRandomConstant/GetInputValue, per the Tr2CurveScalarExpression pattern). */
  _MakeEvaluationContext()
  {
    return {
      curve: this,
      self: this,
      time: this._arguments.time,
      variables: {
        time: this._arguments.time,
        shipSpeed: this._arguments.shipSpeed,
        shipMaxSpeed: this._arguments.shipMaxSpeed
      }
    };
  }

  /**
   * Length of the owning space object's world velocity
   * (EveSmartLightAttributeModifierExpressionBucket.cpp:55-65); the space
   * object is duck-typed.
   */
  static _ShipSpeed(spaceObjectParent)
  {
    if (!spaceObjectParent?.GetWorldVelocity)
    {
      return 0;
    }
    const velocity = spaceObjectParent.GetWorldVelocity(EveSmartLightAttributeModifierExpressionBucket._velocity);
    return velocity ? vec3.length(velocity) : 0;
  }

  static _velocity = vec3.create();

  /** Carbon EveSmartLightAttributeModifierExpressionBucket::Arguments (private, EveSmartLightAttributeModifierExpressionBucket.h:50-55). */
  static Arguments = EveSmartLightAttributeModifierExpressionBucketArguments;

}
