// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraTransition.h
// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraTransition.cpp
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { EveVirtualCameraTransitionBase } from "./EveVirtualCameraTransitionBase.js";


/**
 * Transition that hands control to the target camera on the frame it starts,
 * with no blend.
 */
@type.define({
  className: "EveVirtualCameraTransitionCut",
  family: "eve/virtualCamera/transition"
})
export class EveVirtualCameraTransitionCut extends EveVirtualCameraTransitionBase
{
  /** Always reports complete, which is what makes the hand-over a cut. */
  @carbon.method
  @impl.implemented
  IsComplete()
  {
    return true;
  }

  /**
   * Defers to the base update, which immediately stops the transition because a
   * cut is already complete.
   */
  @carbon.method
  @impl.implemented
  Update(deltaTime)
  {
    super.Update(deltaTime);
  }
}
