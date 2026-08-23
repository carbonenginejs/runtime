// Source: trinity/trinity/RenderJob/TriStepSetRenderState.cpp
// Source: trinity/trinity/RenderJob/TriStepSetRenderState_Blue.cpp
import { carbon, impl, io, type } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";
import { RenderState } from "#consts/render-context";


/**
 * Step that sets a single render state to a single value for the steps that
 * follow.
 */
@type.define({ className: "TriStepSetRenderState", family: "renderJob" })
export class TriStepSetRenderState extends TriRenderStep
{
  @io.persist
  @type.int32
  @type.enum("RenderState")
  state = 0;

  @io.persist
  @type.uint32
  value = 0;

  /**
   * Accepts either no arguments or both a state and a value; supplying only one
   * of the pair throws.
   */
  @carbon.method
  @impl.adapted
  __init__(state, value)
  {
    const hasState = arguments.length > 0 && state !== undefined;
    const hasValue = arguments.length > 1 && value !== undefined;
    if (hasState !== hasValue)
    {
      throw new Error("You must set both the state and the value.");
    }
    if (hasState)
    {
      this.SetStateAndValue(state, value);
    }
  }

  /**
   * Sets the state selector and its value together, both coerced to unsigned
   * 32-bit.
   */
  SetStateAndValue(state, value)
  {
    this.state = Number(state) >>> 0;
    this.value = Number(value) >>> 0;
  }

  /**
   * Forwards the state/value pair to the executor, which owns the mapping onto
   * real pipeline state.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, executor)
  {
    executor?.SetRenderState?.(this.state, this.value);
    return TriRenderJob.StepResult.RS_OK;
  }

  static RenderState = RenderState;

}
