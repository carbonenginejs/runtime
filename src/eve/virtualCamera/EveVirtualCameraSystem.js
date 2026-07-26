// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraSystem.h
// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraSystem.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveVirtualCamera } from "./EveVirtualCamera.js";
import { EveVirtualCameraTransitionCut } from "./transition/EveVirtualCameraTransitionCut.js";
import { EveVirtualCameraTransitionLerp } from "./transition/EveVirtualCameraTransitionLerp.js";


/**
 * Owns the registered virtual cameras plus the externally driven camera, and
 * runs the transition that hands control from one to another.
 */
@type.define({
  className: "EveVirtualCameraSystem",
  family: "eve/virtualCamera"
})
export class EveVirtualCameraSystem extends CjsModel
{
  @io.persist
  @type.objectRef("EveVirtualCamera")
  externalCamera = null;

  @io.persist
  @type.list("EveVirtualCamera")
  cameras = [];

  @io.persist
  @type.objectRef("EveVirtualCamera")
  mainCamera = null;

  @io.read
  @type.objectRef("EveVirtualCameraTransitionBase")
  transition = null;

  #lastUpdate = 0;

  /**
   * Creates the external camera, names it "externalCamera", gives it a
   * zero-length timeline and makes it the initial main camera.
   */
  constructor()
  {
    super();
    this.externalCamera = new EveVirtualCamera();
    this.externalCamera.SetName("externalCamera");
    this.externalCamera.SetAnimationTimelineLength(0);
    this.mainCamera = this.externalCamera;
  }

  /**
   * Reports the system ready; the port has no device state to acquire, so this
   * always succeeds.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    return true;
  }

  /**
   * Returns the camera the scene should render from: the transition's camera
   * while a transition is running, otherwise the main camera.
   */
  @carbon.method
  @impl.implemented
  GetCurrentCamera()
  {
    return this.transition ? this.transition.GetCamera() : this.GetMainCamera();
  }

  /**
   * Registers a camera for updating and name lookup, refusing the external
   * camera and duplicates; returns whether it was added.
   */
  @carbon.method
  @impl.implemented
  AddCamera(camera)
  {
    if (camera === this.externalCamera || this.cameras.includes(camera))
    {
      return false;
    }
    this.cameras.push(camera);
    return true;
  }

  /**
   * Returns the camera control has been handed to, ignoring any transition
   * currently blending towards it.
   */
  @carbon.method
  @impl.implemented
  GetMainCamera()
  {
    return this.mainCamera;
  }

  /**
   * Finds a registered camera by name, also matching the external camera, and
   * returns null when nothing matches.
   */
  @carbon.method
  @impl.implemented
  GetCameraByName(name)
  {
    if (name === this.externalCamera?.GetName())
    {
      return this.externalCamera;
    }
    return this.cameras.find(camera => camera?.GetName?.() === name) ?? null;
  }

  /**
   * Hands control to a camera immediately through a cut transition; does nothing
   * when the camera is null or already the main camera.
   */
  @carbon.method
  @impl.implemented
  CutToCamera(camera)
  {
    if (camera && camera !== this.GetMainCamera())
    {
      this.#setMainCameraWithTransition(camera, new EveVirtualCameraTransitionCut());
    }
  }

  /**
   * Hands control to a camera through a lerp transition lasting transitionTime
   * seconds; does nothing when the camera is null or already the main camera.
   */
  @carbon.method
  @impl.implemented
  LerpToCamera(camera, transitionTime = 1)
  {
    if (camera && camera !== this.GetMainCamera())
    {
      const transition = new EveVirtualCameraTransitionLerp();
      transition.SetTransitionTime(transitionTime);
      this.#setMainCameraWithTransition(camera, transition);
    }
  }

  /**
   * Reports whether the currently rendering camera is the external one, meaning
   * the host application is driving the view rather than an authored camera.
   */
  @carbon.method
  @impl.implemented
  IsExternallyControlled()
  {
    return this.GetCurrentCamera() === this.externalCamera;
  }

  /**
   * Advances every registered camera, the external camera and any running transition, clearing the transition once it completes.
   * @param {Number} simTime Absolute simulation time; the delta is derived from the previous call, and the first call produces a zero delta
   */
  @carbon.method
  @impl.adapted
  Update(simTime)
  {
    const time = Number(simTime) || 0;
    if (this.#lastUpdate === 0)
    {
      this.#lastUpdate = time;
    }
    const deltaTime = time - this.#lastUpdate;
    this.#lastUpdate = time;
    for (const camera of this.cameras)
    {
      camera?.Update?.(deltaTime);
    }
    this.externalCamera?.Update?.(deltaTime);
    if (this.transition)
    {
      this.transition.Update(deltaTime);
      if (this.transition.IsComplete())
      {
        this.transition = null;
      }
    }
  }

  /**
   * Drops any running transition, makes the camera the main one and registers it
   * if it was not already known.
   */
  #setMainCamera(camera)
  {
    this.transition = null;
    this.mainCamera = camera;
    this.AddCamera(camera);
  }

  /**
   * Switches the main camera and starts the supplied transition from the
   * previous main camera to the new one.
   */
  #setMainCameraWithTransition(camera, transition)
  {
    const current = this.GetMainCamera();
    this.#setMainCamera(camera);
    transition.SetSource(current);
    transition.SetTarget(this.GetMainCamera());
    transition.Play();
    this.transition = transition;
  }
}
