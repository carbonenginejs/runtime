import { exposure as be } from "#be";
import { ITr2DebugRenderable } from "../../../global/interfaces/ITr2DebugRenderable.js";
import { IInitialize } from "../../../blue/exposure/IInitialize.js";
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraSystem.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraSystem.cpp
import { type } from "#schema";
import { assertFiniteNumber } from "#utils/validation";
import { EveVirtualCamera } from "./EveVirtualCamera.js";
import { EveVirtualCameraTransitionCut } from "./transition/EveVirtualCameraTransitionCut.js";
import { EveVirtualCameraTransitionLerp } from "./transition/EveVirtualCameraTransitionLerp.js";
import { BlueList } from "#blue";


/**
 * Owns the registered virtual cameras plus the externally driven camera, and
 * runs the transition that hands control from one to another.
 */
@be.define({
  name: "EveVirtualCameraSystem",
  inherit: [ IInitialize, ITr2DebugRenderable ],
  // EveVirtualCameraSystem_Blue.cpp:11-37, in Carbon's order.
  members: [
    [ be.ATTR, "cameras", be.READ | be.PERSIST ],
    [ be.ATTR, "transition", be.READ ],
    [ be.ATTR, "mainCamera", be.READ | be.PERSIST ],
    [ be.ATTR, "externalCamera", be.READWRITE | be.PERSIST ],
    [ be.METHOD, "GetCurrentCamera", be.WRAP ],
    [ be.METHOD, "GetMainCamera", be.WRAP ],
    [ be.METHOD, "CutToCamera", be.WRAP ],
    [ be.METHOD, "LerpToCamera", be.WRAP ],
    [ be.METHOD, "IsExternallyControlled", be.WRAP ],
    [ be.METHOD, "GetCameraByName", be.WRAP ]
  ]
})
export class EveVirtualCameraSystem
{
  @type.object.ref("EveVirtualCamera")
  externalCamera = null;

  @type.list("EveVirtualCamera")
  cameras = new BlueList(EveVirtualCamera, { className: "EveVirtualCamera" });

  @type.object.ref("EveVirtualCamera")
  mainCamera = null;

  @type.object.ref("EveVirtualCameraTransitionBase")
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
   *
   * @implemented
   */

  Initialize()
  {
    return true;
  }

  /**
   * Returns the camera the scene should render from: the transition's camera
   * while a transition is running, otherwise the main camera.
   *
   * @implemented
   */
  GetCurrentCamera()
  {
    return this.transition ? this.transition.GetCamera() : this.GetMainCamera();
  }

  /**
   * Registers a camera for updating and name lookup, refusing the external
   * camera and duplicates; returns whether it was added.
   *
   * @implemented
   */

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
   *
   * @implemented
   */
  GetMainCamera()
  {
    return this.mainCamera;
  }

  /**
   * Finds a registered camera by name, also matching the external camera, and
   * returns null when nothing matches.
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraSystem.cpp:68-85
   *
   * @implemented
   */
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
   *
   * @implemented
   */
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
   *
   * @implemented
   */
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
   *
   * @implemented
   */
  IsExternallyControlled()
  {
    return this.GetCurrentCamera() === this.externalCamera;
  }

  /**
   * Advances every registered camera, the external camera and any running transition, clearing the transition once it completes.
   *
   * @adapted simulation time remains JavaScript seconds. Reject nonfinite or non-number
   *   timestamps before mutation: native Be::Time cannot carry NaN or infinity.
   * @param {Number} simTime Absolute simulation time; the delta is derived from the previous call, and the first call produces a zero delta
   * Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraSystem.cpp:133-160
   * @throws {TypeError} If simTime is not a finite number.
   */

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
   *
   * @implemented
   * @param {EveVirtualCamera} camera
   */

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
   *
   * @implemented
   * @param {EveVirtualCamera} camera
   * @param {EveVirtualCameraTransitionBase} transition
   */

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

  /**
   * Carbon: EveVirtualCameraSystem::GetDebugOptions (trinity/trinity/Eve/VirtualCamera/EveVirtualCameraSystem.h:45), `void GetDebugOptions( Tr2DebugRendererOptions& options ) override`.
   *
   * @notImplemented
   * @param {Tr2DebugRendererOptions} options Debug options to fill.
   * @throws {Error} Always.
   */
  GetDebugOptions(options)
  {
    throw new Error("EveVirtualCameraSystem.GetDebugOptions is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon: EveVirtualCameraSystem::RenderDebugInfo (trinity/trinity/Eve/VirtualCamera/EveVirtualCameraSystem.h:46), `void RenderDebugInfo( ITr2DebugRenderer2& renderer ) override`.
   *
   * @notImplemented
   * @param {ITr2DebugRenderer2} renderer Debug renderer to draw into.
   * @throws {Error} Always.
   */
  RenderDebugInfo(renderer)
  {
    throw new Error("EveVirtualCameraSystem.RenderDebugInfo is not implemented in CarbonEngineJS.");
  }
}
