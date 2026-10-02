// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraSystem.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraSystem.cpp
import { meta } from "#schema";
import { EveVirtualCamera } from "./EveVirtualCamera.js";
import { EveVirtualCameraTransitionCut } from "./transition/EveVirtualCameraTransitionCut.js";
import { EveVirtualCameraTransitionLerp } from "./transition/EveVirtualCameraTransitionLerp.js";


/**
 * Owns the registered virtual cameras plus the externally driven camera, and
 * runs the transition that hands control from one to another.
 */
@meta.define({
  className: "EveVirtualCameraSystem",
  family: "eve/virtualCamera"
})
export class EveVirtualCameraSystem
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveVirtualCamera")
  externalCamera = null;

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveVirtualCamera")
  cameras = [];

  @meta.blue.read
  @meta.blue.persist
  @meta.type.objectRef("EveVirtualCamera")
  mainCamera = null;

  @meta.blue.read
  @meta.type.objectRef("EveVirtualCameraTransitionBase")
  transition = null;

  _lastUpdate = 0;

  /**
   * Creates the external camera, names it "externalCamera", gives it a
   * zero-length timeline and makes it the initial main camera.
   */
  constructor()
  {
    this.externalCamera = new EveVirtualCamera();
    this.externalCamera.SetName("externalCamera");
    this.externalCamera.SetAnimationTimelineLength(0);
    this.mainCamera = this.externalCamera;
  }

  /**
   * Reports the system ready; the port has no device state to acquire, so this
   * always succeeds.
   */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    return true;
  }

  /**
   * Returns the camera the scene should render from: the transition's camera
   * while a transition is running, otherwise the main camera.
   */
  @meta.blue.method
  @meta.implemented
  GetCurrentCamera()
  {
    return this.transition ? this.transition.GetCamera() : this.GetMainCamera();
  }

  /**
   * Registers a camera for updating and name lookup, refusing the external
   * camera and duplicates; returns whether it was added.
   */
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
  GetMainCamera()
  {
    return this.mainCamera;
  }

  /**
   * Finds a registered camera by name, also matching the external camera, and
   * returns null when nothing matches.
   */
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
  CutToCamera(camera)
  {
    if (camera && camera !== this.GetMainCamera())
    {
      this.SetMainCamera(camera, new EveVirtualCameraTransitionCut());
    }
  }

  /**
   * Hands control to a camera through a lerp transition lasting transitionTime
   * seconds; does nothing when the camera is null or already the main camera.
   */
  @meta.blue.method
  @meta.implemented
  LerpToCamera(camera, transitionTime = 1)
  {
    if (camera && camera !== this.GetMainCamera())
    {
      const transition = new EveVirtualCameraTransitionLerp();
      transition.SetTransitionTime(transitionTime);
      this.SetMainCamera(camera, transition);
    }
  }

  /**
   * Reports whether the currently rendering camera is the external one, meaning
   * the host application is driving the view rather than an authored camera.
   */
  @meta.blue.method
  @meta.implemented
  IsExternallyControlled()
  {
    return this.GetCurrentCamera() === this.externalCamera;
  }

  /**
   * Advances every registered camera, the external camera and any running transition, clearing the transition once it completes.
   * @param {Number} simTime Absolute simulation time; the delta is derived from the previous call, and the first call produces a zero delta
   */
  @meta.blue.method
  @meta.adapted
  Update(simTime)
  {
    const time = Number(simTime) || 0;
    if (this._lastUpdate === 0)
    {
      this._lastUpdate = time;
    }
    const deltaTime = time - this._lastUpdate;
    this._lastUpdate = time;
    for (const camera of this.cameras)
    {
      camera?.Update(deltaTime);
    }
    this.externalCamera?.Update(deltaTime);
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
   * Carbon SetMainCamera, both overloads as one method with an optional
   * transition (EveVirtualCameraSystem.cpp:87-92 and :94-105): drop any
   * running transition, make the camera the main one and register it; with a
   * transition, wire it from the previous main camera to the new one and
   * play it. Carbon's 2-arg form assigns m_transition even when the supplied
   * transition is null, which collapses to the same end state as the 1-arg
   * form here.
   */
  @meta.blue.method
  @meta.implemented
  SetMainCamera(camera, transition = null)
  {
    const current = this.GetMainCamera();
    this.transition = null;
    this.mainCamera = camera;
    this.AddCamera(camera);

    if (transition)
    {
      transition.SetSource(current);
      transition.SetTarget(this.GetMainCamera());
      transition.Play();
      this.transition = transition;
    }
  }
}
