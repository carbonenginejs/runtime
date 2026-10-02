// Source: trinity/trinity/Controllers/Tr2StateMachineTransition.h
// Source: trinity/trinity/Controllers/Tr2StateMachineTransition.cpp
// Source: trinity/trinity/Controllers/Tr2StateMachineTransition_Blue.cpp
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { INotify } from "#blue";
import { meta } from "#schema";
import { CjsControllerExpressionProgram } from "../expression/CjsControllerExpressionProgram.js";


/**
 * One outgoing edge of a state machine state: evaluates a boolean condition
 * expression and, when it passes, names the destination state to switch to.
 */
@meta.define({
  className: "Tr2StateMachineTransition",
  family: "controllers"
})
@meta.blue.inherit(INotify)
export class Tr2StateMachineTransition
{
  /**
   * Destination state name resolved within the source state's machine.
   * Changing it refreshes the linked transition's destination reference.
   * @type {string}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /**
   * Controller expression tested to enable this transition; a successful
   * evaluation with a nonzero result permits activation.
   * @type {string}
   */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  condition = "";

  /**
   * Reads condition validity through the native read-only property.
   * Adapted: delegates to the existing lazy JavaScript validity check; reading
   * this property does not introduce native eager evaluator binding.
   * @returns {boolean} Whether the current condition compiles successfully.
   */
  @meta.property()
  @meta.blue.read
  @meta.type.boolean
  @meta.adapted
  get isConditionValid()
  {
    return this.IsConditionValid();
  }

  _source = null;

  _destination = null;

  _program = null;

  _programSource = null;

  _variableNames = [];

  _functionNames = [];

  _isConditionValid = false;

  /**
   * Links this transition to its source state.
   * @param {Tr2StateMachineState} state Source state whose machine owns the transition.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  Link(state)
  {
    this.Unlink();
    this._source = state;
    if (this._source.GetStateMachine())
    {
      this._updateDestination();
    }
  }

  /**
   * Unlinks this transition from its source state.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  Unlink()
  {
    this._source = null;
    this._destination = null;
    this._program = null;
    this._programSource = null;
    this._variableNames = [];
    this._functionNames = [];
  }

  /**
   * Refreshes the condition or cached destination after an authored edit.
   *
   * Adapted: Dispatches by the exposed property name; Carbon's destinationName
   * member is exposed as name. Conditions use the runtime AST evaluator.
   * @param {string} propertyName Exposed authored member name.
   * @returns {boolean} True after the notification is handled.
   */
  @meta.blue.method
  @meta.adapted
  OnModified(propertyName)
  {
    if (!this._source) return true;
    if (propertyName === "condition")
    {
      this._program = null;
      this._programSource = null;
      this._variableNames = [];
      this._functionNames = [];
      this.Compile();
      this._source.UpdateVariableMask();
    }
    else if (propertyName === "name") this._updateDestination();
    return true;
  }

  /**
   * Compiles and caches the transition condition.
   * Custom: the JavaScript AST cache recompiles after direct condition edits.
   * @returns {CjsControllerExpressionProgram} Cached condition program.
   */
  @meta.ours
  Compile()
  {
    if (!this._program || this._programSource !== this.condition)
    {
      this._program = CjsControllerExpressionProgram.Compile(this.condition, {
        allowEmpty: false
      });
      this._programSource = this.condition;
      this._variableNames = this._program.GetVariableNames();
      this._functionNames = this._program.GetFunctionNames();
      this._isConditionValid = this._program.IsValid();
    }
    return this._program;
  }

  /**
   * Evaluates a linked transition when its referenced variables may have changed.
   *
   * Adapted: Uses the runtime AST evaluator and BigInt dirty masks in place of
   * Carbon's bytecode evaluator and uint64 mask.
   * @param {bigint|number} [variableDirtyMask=0] Changed controller variable bits.
   * @returns {boolean} Whether the current linked condition activates.
   */
  @meta.blue.method
  @meta.adapted
  CanActivate(variableDirtyMask = 0)
  {
    if (!this._source)
    {
      return false;
    }
    const stateMachine = this._source?.GetStateMachine() ?? null;
    const controller = stateMachine?.GetController() ?? null;
    const owner = controller?.GetOwner() ?? null;
    const program = this.Compile();
    if (!program.IsValid())
    {
      return false;
    }
    if (!Tr2StateMachineTransition._dirtyMaskMatches(this.GetVariableMask(), variableDirtyMask))
    {
      return false;
    }
    const context = this._getExpressionContext(controller, owner, stateMachine);
    return program.EvaluateBoolean(context);
  }

  /**
   * Gets the cached destination last resolved by Link or a name notification.
   * @returns {Tr2StateMachineState|null} Cached destination, or null when unresolved.
   */
  @meta.blue.method
  @meta.adapted
  GetDestination()
  {
    return this._destination;
  }

  /**
   * Gets the source state.
   * @returns {Tr2StateMachineState|null} Source state, or null while unlinked.
   */
  @meta.blue.method
  @meta.adapted
  GetSource()
  {
    return this._source;
  }

  /**
   * Gets the source state.
   * Adapted: native Blue exposes GetSource under this wrapper name.
   * @returns {Tr2StateMachineState|null} Source state, or null while unlinked.
   */
  @meta.blue.method
  @meta.adapted
  GetState()
  {
    return this.GetSource();
  }

  /**
   * Gets the bitmask of controller variables this condition reads, so the owning
   * state can skip evaluation when none of them changed; returns 0 (never skip)
   * when the condition calls an impure function or references a variable that is
   * missing or beyond the 64-bit mask.
   * @returns {bigint} Relevant variable bits, or zero when evaluation cannot be skipped.
   */
  @meta.blue.method
  @meta.adapted
  GetVariableMask()
  {
    const program = this.Compile();
    if (program.HasNonPureFunctions())
    {
      return 0n;
    }
    const stateMachine = this._source?.GetStateMachine() ?? null;
    const controller = stateMachine?.GetController() ?? null;
    const variableView = controller?.GetVariableView();
    if (!Array.isArray(variableView))
    {
      return 0n;
    }
    let mask = 0n;
    for (const name of this._variableNames)
    {
      const index = variableView.find(variable => variable && typeof variable === "object" && "name" in variable && String(variable.name) === name)?.index;
      if (typeof index !== "number" || index < 0 || index >= 64)
      {
        return 0n;
      }
      mask |= 1n << BigInt(index);
    }
    return mask;
  }

  /**
   * Checks whether the condition is valid.
   * Adapted: retains the lazy JavaScript compilation check, including unlinked
   * inspection, rather than introducing native eager evaluator lifetime here.
   * @returns {boolean} Whether the authored condition compiles successfully.
   */
  @meta.blue.method
  @meta.adapted
  IsConditionValid()
  {
    return this.Compile().IsValid();
  }

  /**
   * Checks whether the condition expression is valid.
   * @param {string} [_attributeName] Ignored native attribute-name argument.
   * @returns {boolean} Current condition validity.
   */
  @meta.blue.method
  @meta.adapted
  IsExpressionValid(_attributeName)
  {
    return this.IsConditionValid();
  }

  /**
   * Evaluates an arbitrary expression against this transition's current context.
   * @param {string} expression Expression to evaluate in the current JS context.
   * @returns {number} Evaluated number, or the retained zero result for invalid compilation.
   */
  @meta.blue.method
  @meta.adapted
  EvaluateExpression(expression)
  {
    const stateMachine = this._source?.GetStateMachine() ?? null;
    const controller = stateMachine?.GetController() ?? null;
    const owner = controller?.GetOwner() ?? null;
    const program = CjsControllerExpressionProgram.Compile(expression, {
      emptyValue: 0
    });
    if (!program.IsValid())
    {
      return 0;
    }
    return Number(program.Evaluate(this._getExpressionContext(controller, owner, stateMachine)));
  }

  /**
   * Gets expression term metadata known by the linked controller.
   * @returns {Array<object>} New collection of supported functions and linked variables.
   */
  @meta.blue.method
  @meta.adapted
  GetExpressionTermInfo()
  {
    const result = [];
    CjsControllerExpressionProgram.addControllerTermInfo(result);
    const controller = this._source?.GetStateMachine()?.GetController();
    controller?.GetExpressionTermInfo(result);
    return result;
  }

  /**
   * Gets variable names referenced by the compiled condition.
   * @returns {Array<string>} Copy of the condition's referenced variable names.
   */
  @meta.ours
  GetVariableNames()
  {
    this.Compile();
    return this._variableNames.slice();
  }

  /**
   * Gets function names referenced by the compiled condition.
   * @returns {Array<string>} Copy of the condition's referenced function names.
   */
  @meta.ours
  GetFunctionNames()
  {
    this.Compile();
    return this._functionNames.slice();
  }

  /**
   * Builds the condition evaluation context, delegating to the controller's own
   * GetExpressionContext when it has one and otherwise assembling controller,
   * owner and state machine directly.
   * @param {Tr2Controller|null|undefined} controller Linked expression controller.
   * @param {object|null|undefined} owner Controller owner available to expressions.
   * @param {Tr2StateMachine|null|undefined} stateMachine Linked state-machine context.
   * @returns {object} Context for the JavaScript evaluator.
   */
  @meta.ours
  _getExpressionContext(controller, owner, stateMachine)
  {
    const runtime = controller;
    if (runtime?.GetExpressionContext)
    {
      return runtime.GetExpressionContext(owner, stateMachine);
    }
    return {
      controller: runtime ?? undefined,
      owner: owner ?? undefined,
      stateMachine: stateMachine
    };
  }

  /**
   * Carbon's private UpdateDestination (`Tr2StateMachineTransition.cpp:63-70`):
   * looks up the destination state by this transition's `name` on the source
   * state's machine and logs when none matches. The authored name is the
   * destination state name, not a label for the edge; an empty name is looked
   * up like any other, as in the donor.
   * Adapted: native UpdateDestination retains its private JavaScript name.
   * @returns {void}
   */
  @meta.blue.method
  @meta.blue.renamed("UpdateDestination")
  @meta.adapted
  _updateDestination()
  {
    this._destination = this._source.GetStateMachine().GetStateByName(this.name);
    if (!this._destination)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Invalid destination state name ${this.name} for state machine transition`);
    }
  }

  /**
   * Checks whether any variable this condition reads is dirty; an empty variable
   * mask means the condition must always be evaluated.
   * @param {bigint} variableMask Variables referenced by the condition.
   * @param {bigint|number} dirtyVariables Changed controller variable bits.
   * @returns {boolean} Whether the condition must be evaluated.
   */
  @meta.ours
  static _dirtyMaskMatches(variableMask, dirtyVariables)
  {
    if (variableMask === 0n)
    {
      return true;
    }
    const dirtyMask = typeof dirtyVariables === "bigint" ? dirtyVariables : BigInt(dirtyVariables);
    return (variableMask & dirtyMask) !== 0n;
  }
}

// Native exposure ends at this concrete table (Tr2StateMachineTransition_Blue.cpp).
meta.blue.interfaceTable({
  interfaces: [Tr2StateMachineTransition, INotify],
  chainTo: null
})(Tr2StateMachineTransition);
