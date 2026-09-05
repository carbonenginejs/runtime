// Source: trinity/trinity/Controllers/Tr2StateMachineTransition.h
// Source: trinity/trinity/Controllers/Tr2StateMachineTransition.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
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
  @io.notify
  @io.persist
  @type.string
  condition = "";

  @io.notify
  @io.persist
  @type.string
  name = "";

  #source = null;

  #destination = null;

  #program = null;

  #programSource = null;

  #variableNames = [];

  #functionNames = [];

  #isConditionValid = false;

  /**
   * Links this transition to its source state.
   */
  @carbon.method
  @impl.adapted
  Link(state)
  {
    this.Unlink();
    this.#source = state;
    this.#destination = this.#resolveDestination();
  }

  /**
   * Unlinks this transition from its source state.
   */
  @carbon.method
  @impl.adapted
  Unlink()
  {
    this.#source = null;
    this.#destination = null;
    this.#program = null;
    this.#programSource = null;
    this.#variableNames = [];
    this.#functionNames = [];
  }

  /**
   * Refreshes cached destination/expression state after modification.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    this.#destination = this.#resolveDestination();
    this.#program = null;
    this.#programSource = null;
    this.#variableNames = [];
    this.#functionNames = [];
    this.#source?.UpdateVariableMask?.();
    return true;
  }

  /**
   * Compiles and caches the transition condition.
   */
  Compile()
  {
    if (!this.#program || this.#programSource !== this.condition)
    {
      this.#program = CjsControllerExpressionProgram.Compile(this.condition, {
        emptyValue: 1
      });
      this.#programSource = this.condition;
      this.#variableNames = this.#program.GetVariableNames();
      this.#functionNames = this.#program.GetFunctionNames();
      this.#isConditionValid = this.#program.IsValid();
    }
    return this.#program;
  }

  /**
   * Carbon-compatible alias for transition activation.
   */
  @carbon.method
  @impl.adapted
  CanActivate(variableDirtyMask = 0)
  {
    const stateMachine = this.#source?.GetStateMachine?.() ?? null;
    const controller = stateMachine?.GetController?.() ?? null;
    const owner = controller?.GetOwner() ?? null;
    const program = this.Compile();
    if (!program.IsValid())
    {
      return false;
    }
    if (!Tr2StateMachineTransition.#dirtyMaskMatches(this.GetVariableMask(), variableDirtyMask))
    {
      return false;
    }
    const context = this.#getExpressionContext(controller, owner, stateMachine);
    return program.EvaluateBoolean(context);
  }

  /**
   * Gets this transition's destination state by name.
   */
  @carbon.method
  @impl.adapted
  GetDestination()
  {
    return this.#destination ?? this.#resolveDestination();
  }

  /**
   * Gets the source state.
   */
  @carbon.method
  @impl.adapted
  GetSource()
  {
    return this.#source;
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
    const stateMachine = this.#source?.GetStateMachine?.() ?? null;
    const controller = stateMachine?.GetController?.() ?? null;
    const variableView = controller?.GetVariableView?.();
    if (!Array.isArray(variableView))
    {
      return 0n;
    }
    let mask = 0n;
    for (const name of this.#variableNames)
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
    const stateMachine = this.#source?.GetStateMachine?.() ?? null;
    const controller = stateMachine?.GetController?.() ?? null;
    const owner = controller?.GetOwner() ?? null;
    const program = CjsControllerExpressionProgram.Compile(expression, {
      emptyValue: 0
    });
    if (!program.IsValid())
    {
      return 0;
    }
    return Number(program.Evaluate(this.#getExpressionContext(controller, owner, stateMachine)));
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
    const controller = this.#source?.GetStateMachine?.()?.GetController?.();
    controller?.GetExpressionTermInfo?.(result);
    return result;
  }

  /**
   * Gets variable names referenced by the compiled condition.
   */
  GetVariableNames()
  {
    this.Compile();
    return this.#variableNames.slice();
  }

  /**
   * Gets function names referenced by the compiled condition.
   */
  GetFunctionNames()
  {
    this.Compile();
    return this.#functionNames.slice();
  }

  /**
   * Builds the condition evaluation context, delegating to the controller's own
   * GetExpressionContext when it has one and otherwise assembling controller,
   * owner and state machine directly.
   */
  #getExpressionContext(controller, owner, stateMachine)
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
   * Looks up the destination state by this transition's `name` on the source
   * state's machine; the authored name is the destination state name, not a
   * label for the edge.
   */
  #resolveDestination()
  {
    const stateMachine = this.#source?.GetStateMachine?.() ?? null;
    if (!stateMachine || !this.name)
    {
      return null;
    }
    return stateMachine.GetStateByName?.(this.name) ?? null;
  }

  /**
   * Checks whether any variable this condition reads is dirty; an empty variable
   * mask means the condition must always be evaluated.
   */
  static #dirtyMaskMatches(variableMask, dirtyVariables)
  {
    if (variableMask === 0n)
    {
      return true;
    }
    const dirtyMask = typeof dirtyVariables === "bigint" ? dirtyVariables : BigInt(dirtyVariables);
    return (variableMask & dirtyMask) !== 0n;
  }
}
