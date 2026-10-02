// Source: trinity/trinity/Controllers/Actions/Tr2ActionBindRTPC.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionBindRTPC.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionBindRTPC_Blue.cpp
import { meta } from "#schema";
import { IsMatch, blue, INotify } from "#blue";
import { CjsControllerExpressionProgram } from "../expression/CjsControllerExpressionProgram.js";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { ITr2Updateable } from "../../core/ITr2Updateable.js";


/**
 * Controller action that registers for per-frame updates and pushes an
 * expression-driven value into a named Wwise real-time parameter on a sound
 * emitter.
 */
@meta.define({
  className: "Tr2ActionBindRTPC",
  family: "controllers"
})
@meta.blue.inherit(ITr2Updateable, INotify)
export class Tr2ActionBindRTPC extends ITr2ControllerAction
{
  /**
   * Expression evaluated each update to produce the RTPC value.
   * @type {string}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  value = "";

  /**
   * Name of the sound emitter receiving the RTPC updates.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  emitter = "";

  /**
   * Wwise real-time parameter name; native storage is std::wstring.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.wstring
  rtpcName = "";

  /**
   * Optional scalar curve sampled by the expression Curve(time) helper.
   * @type {ITriScalarFunction|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("ITriScalarFunction")
  curve = null;

  /**
   * Live readonly validity of the retained AST evaluator, without recompilation.
   * @returns {boolean} Whether a valid compiled expression is retained.
   */
  @meta.property()
  @meta.blue.read
  @meta.type.boolean
  @meta.adapted
  get isExpressionValid()
  {
    return this._runtime.program !== null && this._runtime.program.IsValid();
  }

  /** AST evaluator and clock record replace native evaluator/buffer storage. */
  _runtime = CjsControllerExpressionProgram.createRuntimeState();

  /** Native m_emitter: the RTPC target retained by Start. */
  _emitter = null;

  /**
   * Links and compiles the RTPC value expression.
   * Adapted: a CSP-safe AST program replaces native parser bytecode.
   */
  @meta.blue.method
  @meta.adapted
  Link(controller)
  {
    this._runtime.controller = controller;
    this.CompileExpression();
  }

  /**
   * Clears runtime expression state.
   * Adapted: the existing JS cache reset also resets timestamps; native clears
   * only its controller and evaluator. The emitter remains retained in both.
   */
  @meta.blue.method
  @meta.adapted
  Unlink()
  {
    this._runtime = CjsControllerExpressionProgram.createRuntimeState();
  }

  /**
   * Starts RTPC updates.
   * Adapted: retains optional-controller and owner lookup helpers, updates the
   * JS controller/last time, and resolves or clears the target before registering.
   * Native registers first and retains an old target if lookup finds none.
   */
  @meta.blue.method
  @meta.adapted
  Start(controller = this._runtime.controller)
  {
    if (!controller)
    {
      return;
    }
    this._runtime.controller = controller;
    this._runtime.startTime = blue.os.GetCurrentFrameTime();
    this._runtime.lastTime = this._runtime.startTime;
    this._emitter = ITr2ControllerAction.findSoundEmitter(ITr2ControllerAction.getOwner(controller), this.emitter);
    controller.RegisterUpdateable(this);
  }

  /**
   * Starts manually with an explicit controller.
   * Adapted: JavaScript TypeError represents native Python null-argument errors.
   */
  @meta.blue.method
  @meta.adapted
  StartWithController(controller)
  {
    this.Start(ITr2ControllerAction.requireController(controller, "StartWithController"));
  }

  /**
   * Stops RTPC updates.
   * Adapted: the omitted-controller JS convenience uses the current link, if any.
   */
  @meta.blue.method
  @meta.adapted
  Stop(controller = this._runtime.controller)
  {
    if (controller) controller.UnRegisterUpdateable(this);
  }

  /**
   * Stops manually with an explicit controller.
   * Adapted: JavaScript TypeError represents native Python null-argument errors.
   */
  @meta.blue.method
  @meta.adapted
  StopWithController(controller)
  {
    this.Stop(ITr2ControllerAction.requireController(controller, "StopWithController"));
  }

  /**
   * Evaluates the retained program each tick and updates the target RTPC.
   * Adapted: the CSP-safe AST context replaces native ExtraBuffer/bytecode.
   * Evaluation failures skip the target; successful NaN/Infinity are preserved.
   * Required target errors remain visible outside the evaluator failure boundary.
   */
  @meta.blue.method
  @meta.adapted
  Update(_realTime, simTime)
  {
    this._runtime.lastTime = simTime;
    const controller = this._runtime.controller;
    const program = this._runtime.program;
    if (!program || !program.IsValid()) return;
    let value;
    try
    {
      value = Number(program.Evaluate(CjsControllerExpressionProgram.makeActionContext(controller, ITr2ControllerAction.getOwner(controller), this._runtime, {
        action: this
      })));
    }
    catch
    {
      // Native Eval returns a success flag separately from its numeric result.
      return;
    }
    if (this._emitter) this._emitter.SetRTPC(this.rtpcName, value);
  }

  /**
   * Recompiles when the authored value receives its notification.
   * Adapted: the exposed member name replaces native member-address matching.
   */
  @meta.blue.method
  @meta.adapted
  OnModified(propertyName)
  {
    if (this._runtime.controller && IsMatch(propertyName, "value"))
    {
      this._runtime.program = null;
      this.CompileExpression();
    }
    return true;
  }

  /**
   * Checks whether the expression compiles.
   * Adapted: retains the JS explicit lazy-compilation helper. The live property
   * observes the retained program without compiling.
   */
  @meta.blue.method
  @meta.adapted
  IsExpressionValid()
  {
    return this.CompileExpression().IsValid();
  }

  /**
   * Carbon's Blue arity adapter (Tr2ActionBindRTPC.cpp:134, the same
   * property/method name-collision forward all four action classes carry):
   * takes and discards the attribute name. Same forward here for nominal
   * parity.
   */
  @meta.blue.method
  @meta.implemented
  IsAttrExpressionValid(_attributeName)
  {
    return this.IsExpressionValid();
  }

  /**
   * Gets a curve value for expression helpers.
   * Returns zero for no curve; a present ITriScalarFunction supplies GetValueAt.
   */
  @meta.blue.method
  @meta.implemented
  GetCurveValue(time)
  {
    return this.curve ? this.curve.GetValueAt(time) : 0;
  }

  /**
   * Gets expression term metadata from the linked controller.
   * Adapted: shared AST term records replace native Tr2ExpressionTermInfo objects.
   */
  @meta.blue.method
  @meta.adapted
  GetExpressionTermInfo()
  {
    const result = [];
    CjsControllerExpressionProgram.addControllerTermInfo(result, {
      curve: true
    });
    if (this._runtime.controller) this._runtime.controller.GetExpressionTermInfo(result);
    return result;
  }

  /**
   * Evaluates an expression against this action's controller context.
   * Adapted: retains JS unlinked evaluation and zero fallback for invalid syntax
   * rather than native BlueStdResult error returns.
   */
  @meta.blue.method
  @meta.adapted
  EvaluateExpression(expression)
  {
    const state = {
      program: null,
      source: ""
    };
    const program = CjsControllerExpressionProgram.compileCached(state, expression, 0, {
      Curve: (_ctx, time) => this.GetCurveValue(Number(time))
    });
    if (!program.IsValid())
    {
      return 0;
    }
    const controller = this._runtime.controller;
    return Number(program.Evaluate(CjsControllerExpressionProgram.makeActionContext(controller, ITr2ControllerAction.getOwner(controller), this._runtime, {
      action: this
    }))) || 0;
  }

  /**
   * Compiles the authored value expression with the `Curve` function bound to
   * this action's curve, reusing the cached program while the text is unchanged.
   * This JS-only helper owns the CSP-safe AST cache.
   */
  @meta.ours
  CompileExpression()
  {
    return CjsControllerExpressionProgram.compileCached(this._runtime, this.value, 0, {
      Curve: (_ctx, time) => this.GetCurveValue(Number(time))
    });
  }
}

// Native exposure ends at this concrete table (Tr2ActionBindRTPC_Blue.cpp:14-17,52).
meta.blue.interfaceTable({
  interfaces: [Tr2ActionBindRTPC, ITr2ControllerAction, ITr2Updateable, INotify],
  chainTo: null
})(Tr2ActionBindRTPC);
