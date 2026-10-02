// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraTransition.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraTransition.cpp
import { meta } from "#schema";
import { EveVirtualCameraTransitionBase } from "./EveVirtualCameraTransitionBase.js";


/**
 * Transition that hands control to the target camera on the frame it starts,
 * with no blend.
 */
@meta.define({
  className: "EveVirtualCameraTransitionCut",
  family: "eve/virtualCamera/transition"
})
export class EveVirtualCameraTransitionCut extends EveVirtualCameraTransitionBase
{
  /** Always reports complete, which is what makes the hand-over a cut. */
  @meta.blue.method
  @meta.implemented
  IsComplete()
  {
    return true;
  }

  /**
   * Defers to the base update, which immediately stops the transition because a
   * cut is already complete.
   */
  @meta.blue.method
  @meta.implemented
  Update(deltaTime)
  {
    super.Update(deltaTime);
  }
}
