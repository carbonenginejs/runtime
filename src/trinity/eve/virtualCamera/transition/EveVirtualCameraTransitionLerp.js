// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraTransition.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraTransition.cpp
import { vec3 } from "#math/vec3";
import { meta } from "#schema";
import { Tr2CurveScalar } from "../../../curves/curve/Tr2CurveScalar.js";
import { EveVirtualCameraTransitionBase } from "./EveVirtualCameraTransitionBase.js";


/**
 * Transition that blends position, point of interest, field of view and roll
 * from the source camera to the target camera over a fixed duration.
 */
@meta.define({
  className: "EveVirtualCameraTransitionLerp",
  family: "eve/virtualCamera/transition"
})
export class EveVirtualCameraTransitionLerp extends EveVirtualCameraTransitionBase
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  tansitionTime = 1;

  _localTime = 0;

  _transitionCurve = new Tr2CurveScalar();

  /**
   * Builds the private linear 0-to-1 curve that maps normalized transition time
   * to blend amount.
   */
  constructor()
  {
    super();
    this._transitionCurve.AddKey(0, 0);
    this._transitionCurve.AddKey(1, 1);
  }

  /**
   * Reports whether the elapsed blend time has passed the configured transition
   * time.
   */
  @meta.blue.method
  @meta.implemented
  IsComplete()
  {
    return this._localTime > this.tansitionTime;
  }

  /**
   * Starts the blend from zero and scrubs the target camera back to minus the
   * transition time, so its own timeline reaches zero exactly as the blend
   * finishes.
   */
  @meta.blue.method
  @meta.implemented
  Play()
  {
    this._localTime = 0;
    super.Play();
    if (this.targetCamera)
    {
      this.targetCamera.UpdateToLocalTime(-this.tansitionTime);
      this.targetCamera.Play();
    }
  }

  /**
   * Advances the blend clock and drives the transition camera externally with
   * the source and target transforms interpolated by the transition curve,
   * clamped to 0..1; a zero transition time jumps straight to the target.
   */
  @meta.blue.method
  @meta.adapted
  Update(deltaTime)
  {
    this._localTime += deltaTime;
    if (this.transitionCamera && this.sourceCamera && this.targetCamera)
    {
      let amount = 1;
      if (this.tansitionTime > 0)
      {
        amount = Math.max(0, Math.min(1, this._transitionCurve.GetValue(this._localTime / this.tansitionTime)));
      }
      this.transitionCamera.UpdateExternal(
        vec3.lerp(vec3.create(), this.sourceCamera.GetPosition(), this.targetCamera.GetPosition(), amount),
        vec3.lerp(vec3.create(), this.sourceCamera.GetPointOfInterest(), this.targetCamera.GetPointOfInterest(), amount),
        this.sourceCamera.GetFov() + (this.targetCamera.GetFov() - this.sourceCamera.GetFov()) * amount,
        this.sourceCamera.GetRoll() + (this.targetCamera.GetRoll() - this.sourceCamera.GetRoll()) * amount
      );
    }
    super.Update(deltaTime);
  }

  /**
   * Returns the blend duration in seconds; the backing field keeps Carbon's
   * misspelled attribute name "tansitionTime" so persisted data round-trips.
   */
  @meta.blue.method
  @meta.implemented
  GetTransitionTime()
  {
    return this.tansitionTime;
  }

  /**
   * Sets the blend duration in seconds; the camera system calls this before
   * playing the transition.
   */
  @meta.blue.method
  @meta.implemented
  SetTransitionTime(value)
  {
    this.tansitionTime = value;
  }
}
