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
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraSystem.cpp:68-85
   */
  @meta.blue.method
  @meta.implemented
  GetCameraByName(name)
  {
    if (name === this.externalCamera.GetName())
    {
      return this.externalCamera;
    }
    return this.cameras.find(camera => camera.GetName() === name) ?? null;
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
      this.SetMainCamera_Transition(camera, new EveVirtualCameraTransitionCut());
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
      this.SetMainCamera_Transition(camera, transition);
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
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraSystem.cpp:133-160
   * Adapted: simulation time is supplied as JavaScript seconds; existing numeric coercion is retained.
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
      camera.Update(deltaTime);
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
   * Carbon's SetMainCamera( camera ) (EveVirtualCameraSystem.cpp:87): drops any
   * running transition, makes the camera the main one and registers it.
   * @param {EveVirtualCamera} camera
   */
  @meta.blue.method
  @meta.implemented
  SetMainCamera(camera)
  {
    this.transition = null;
    this.mainCamera = camera;
    this.AddCamera(camera);
  }

  /**
   * Carbon's SetMainCamera( camera, transition ) (EveVirtualCameraSystem.cpp:94):
   * switches the main camera, then wires the transition from the previous main
   * camera to the new one and plays it.
   * @param {EveVirtualCamera} camera
   * @param {EveVirtualCameraTransitionBase} transition
   */
  @meta.blue.renamed("SetMainCamera")
  @meta.implemented
  SetMainCamera_Transition(camera, transition)
  {
    const current = this.GetMainCamera();
    this.SetMainCamera(camera);
    if (transition)
    {
      transition.SetSource(current);
      transition.SetTarget(this.GetMainCamera());
      transition.Play();
    }
    this.transition = transition;
  }
}
