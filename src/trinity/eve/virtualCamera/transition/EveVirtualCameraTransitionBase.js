// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraTransition.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraTransition.cpp
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";
import { EveVirtualCamera } from "../EveVirtualCamera.js";


/**
 * Base for camera hand-overs, owning the source and target cameras plus the
 * temporary camera that is rendered while the hand-over runs.
 */
@type.define({
  className: "EveVirtualCameraTransitionBase",
  family: "eve/virtualCamera/transition"
})
export class EveVirtualCameraTransitionBase extends CjsModel
{
  @type.objectRef("EveVirtualCamera")
  sourceCamera = null;

  @type.objectRef("EveVirtualCamera")
  targetCamera = null;

  @type.objectRef("EveVirtualCamera")
  transitionCamera = null;

  /**
   * Returns the camera to render from: the target once the transition has
   * completed, otherwise the temporary transition camera.
   */
  @carbon.method
  @impl.implemented
  GetCamera()
  {
    return this.IsComplete() ? this.targetCamera : this.transitionCamera;
  }

  /**
   * Sets the camera the transition starts from; it is paused when the transition
   * stops.
   */
  @carbon.method
  @impl.implemented
  SetSource(camera)
  {
    this.sourceCamera = camera;
  }

  /**
   * Sets the camera the transition hands control to; its timeline is reset on
   * Play and it is resumed on Stop.
   */
  @carbon.method
  @impl.implemented
  SetTarget(camera)
  {
    this.targetCamera = camera;
  }

  /**
   * Starts the transition: creates the temporary transition camera seeded with
   * the source camera's transform, rewinds the target camera's timeline, and
   * starts the transition camera running.
   */
  @carbon.method
  @impl.implemented
  Play()
  {
    this.transitionCamera = new EveVirtualCamera();
    this.transitionCamera.SetName("transitionCamera");
    if (this.sourceCamera)
    {
      this.transitionCamera.CopyTransform(this.sourceCamera);
    }
    this.targetCamera?.Reset();
    this.transitionCamera.Play();
  }

  /**
   * Ends the transition by resuming the target camera and pausing the source and
   * transition cameras.
   */
  @carbon.method
  @impl.implemented
  Stop()
  {
    this.targetCamera?.Play();
    this.sourceCamera?.Pause();
    this.transitionCamera?.Pause();
  }

  /**
   * Advances the transition camera and stops the transition as soon as the
   * subclass reports it complete.
   */
  @carbon.method
  @impl.implemented
  Update(deltaTime)
  {
    this.transitionCamera?.Update(deltaTime);
    if (this.IsComplete())
    {
      this.Stop();
    }
  }
}
