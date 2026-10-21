import { exposure as be } from "#be";
import { ITr2DebugRenderable } from "../../../global/interfaces/ITr2DebugRenderable.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraSystem.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraSystem.cpp
import { meta, type, blue } from "#schema";
import { assertFiniteNumber } from "#utils/validation";
import { EveVirtualCamera } from "./EveVirtualCamera.js";
import { EveVirtualCameraTransitionCut } from "./transition/EveVirtualCameraTransitionCut.js";
import { EveVirtualCameraTransitionLerp } from "./transition/EveVirtualCameraTransitionLerp.js";


/**
 * Owns the registered virtual cameras plus the externally driven camera, and
 * runs the transition that hands control from one to another.
 */
@be.define("EveVirtualCameraSystem")
@blue.inherit(IInitialize, ITr2DebugRenderable)
export class EveVirtualCameraSystem
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("EveVirtualCamera")
  externalCamera = null;

  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveVirtualCamera")
  cameras = [];

  @be.mapAttribute(be.READ | be.PERSIST)

  @type.rootRef("EveVirtualCamera")
  mainCamera = null;

  @be.mapAttribute(be.READ)
  @type.rootRef("EveVirtualCameraTransitionBase")
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

  @meta.implemented
  Initialize()
  {
    return true;
  }

  /**
   * Returns the camera the scene should render from: the transition's camera
   * while a transition is running, otherwise the main camera.
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  GetCurrentCamera()
  {
    return this.transition ? this.transition.GetCamera() : this.GetMainCamera();
  }

  /**
   * Registers a camera for updating and name lookup, refusing the external
   * camera and duplicates; returns whether it was added.
   */

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
  @be.mapMethodAndWrap()
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
  @be.mapMethodAndWrap()
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
  @be.mapMethodAndWrap()
  @meta.implemented
  CutToCamera(camera)
  {
    if (camera && camera !== this.GetMainCamera())
    {
      this.SetMainCamera__Transition(camera, new EveVirtualCameraTransitionCut());
    }
  }

  /**
   * Hands control to a camera through a lerp transition lasting transitionTime
   * seconds; does nothing when the camera is null or already the main camera.
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  LerpToCamera(camera, transitionTime = 1)
  {
    if (camera && camera !== this.GetMainCamera())
    {
      const transition = new EveVirtualCameraTransitionLerp();
      transition.SetTransitionTime(transitionTime);
      this.SetMainCamera__Transition(camera, transition);
    }
  }

  /**
   * Reports whether the currently rendering camera is the external one, meaning
   * the host application is driving the view rather than an authored camera.
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  IsExternallyControlled()
  {
    return this.GetCurrentCamera() === this.externalCamera;
  }

  /**
   * Advances every registered camera, the external camera and any running transition, clearing the transition once it completes.
   * @param {Number} simTime Absolute simulation time; the delta is derived from the previous call, and the first call produces a zero delta
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraSystem.cpp:133-160
   * Adapted: simulation time remains JavaScript seconds. Reject nonfinite or non-number
   * timestamps before mutation: native Be::Time cannot carry NaN or infinity.
   * @throws {TypeError} If simTime is not a finite number.
   */

  @meta.adapted
  Update(simTime)
  {
    const time = assertFiniteNumber(simTime, "EveVirtualCameraSystem.Update simTime");
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
  @meta.implemented

  SetMainCamera__Transition(camera, transition)
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
