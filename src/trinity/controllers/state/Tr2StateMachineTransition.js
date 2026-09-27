// Source: trinity/trinity/Controllers/Tr2StateMachineTransition.h
// Source: trinity/trinity/Controllers/Tr2StateMachineTransition.cpp
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";
import { CjsControllerExpressionProgram } from "../expression/CjsControllerExpressionProgram.js";


/**
 * One outgoing edge of a state machine state: evaluates a boolean condition
 * expression and, when it passes, names the destination state to switch to.
 */
@type.define({
  className: "Tr2StateMachineTransition",
  family: "controllers"
})
export class Tr2StateMachineTransition extends CjsModel
{
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  condition = "";

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  _source = null;

  _destination = null;

  _program = null;

  _programSource = null;

  _variableNames = [];

  _functionNames = [];

  _isConditionValid = false;

  /**
   * Links this transition to its source state.
   */
  @carbon.method
  @impl.adapted
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
   */
  @carbon.method
  @impl.adapted
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
   */
  @carbon.method
  @impl.adapted
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
   */
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
   */
  @carbon.method
  @impl.adapted
  CanActivate(variableDirtyMask = 0)
  {
    if (!this._source)
    {
      return false;
    }
    const stateMachine = this._source?.GetStateMachine?.() ?? null;
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
   * Gets this transition's destination state by name.
   */
  @carbon.method
  @impl.adapted
  GetDestination()
  {
    return this._destination;
  }

  /**
   * Gets the source state.
   */
  @carbon.method
  @impl.adapted
  GetSource()
  {
    return this._source;
  }

  /**
   * Gets the source state.
   */
  @carbon.method
  @impl.adapted
  GetState()
  {
    return this.GetSource();
  }

  /**
   * Gets the bitmask of controller variables this condition reads, so the owning
   * state can skip evaluation when none of them changed; returns 0 (never skip)
   * when the condition calls an impure function or references a variable that is
   * missing or beyond the 64-bit mask.
   */
  @carbon.method
  @impl.adapted
  GetVariableMask()
  {
    const program = this.Compile();
    if (program.HasNonPureFunctions())
    {
      return 0n;
    }
    const stateMachine = this._source?.GetStateMachine?.() ?? null;
    const controller = stateMachine?.GetController() ?? null;
    const variableView = controller?.GetVariableView?.();
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
   */
  @carbon.method
  @impl.adapted
  IsConditionValid()
  {
    return this.Compile().IsValid();
  }

  /**
   * Checks whether the condition expression is valid.
   */
  @carbon.method
  @impl.adapted
  IsExpressionValid()
  {
    return this.IsConditionValid();
  }

  /**
   * Evaluates an arbitrary expression against this transition's current context.
   */
  @carbon.method
  @impl.adapted
  EvaluateExpression(expression)
  {
    const stateMachine = this._source?.GetStateMachine?.() ?? null;
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
   */
  @carbon.method
  @impl.adapted
  GetExpressionTermInfo()
  {
    const result = [];
    CjsControllerExpressionProgram.addControllerTermInfo(result);
    const controller = this._source?.GetStateMachine?.()?.GetController();
    controller?.GetExpressionTermInfo?.(result);
    return result;
  }

  /**
   * Gets variable names referenced by the compiled condition.
   */
  GetVariableNames()
  {
    this.Compile();
    return this._variableNames.slice();
  }

  /**
   * Gets function names referenced by the compiled condition.
   */
  GetFunctionNames()
  {
    this.Compile();
    return this._functionNames.slice();
  }

  /**
   * Builds the condition evaluation context, delegating to the controller's own
   * GetExpressionContext when it has one and otherwise assembling controller,
   * owner and state machine directly.
   */
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
   */
  _updateDestination()
  {
    this._destination = this._source.GetStateMachine().GetStateByName(this.name);
    if (!this._destination)
    {
      console.error(`Invalid destination state name ${this.name} for state machine transition`); // CCP_LOGERR Tr2StateMachineTransition.cpp:66-69
    }
  }

  /**
   * Checks whether any variable this condition reads is dirty; an empty variable
   * mask means the condition must always be evaluated.
   */
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
