import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { EveVirtualCamera as _EveVirtualCamera } from './EveVirtualCamera.js';
import { EveVirtualCameraTransitionCut as _EveVirtualCameraTran } from './transition/EveVirtualCameraTransitionCut.js';
import { EveVirtualCameraTransitionLerp as _EveVirtualCameraTran$1 } from './transition/EveVirtualCameraTransitionLerp.js';

let _initProto, _initClass, _init_externalCamera, _init_extra_externalCamera, _init_cameras, _init_extra_cameras, _init_mainCamera, _init_extra_mainCamera, _init_transition, _init_extra_transition;

/**
 * Owns the registered virtual cameras plus the externally driven camera, and
 * runs the transition that hands control from one to another.
 */
let _EveVirtualCameraSyst;
class EveVirtualCameraSystem extends CjsModel {
  static {
    ({
      e: [_init_externalCamera, _init_extra_externalCamera, _init_cameras, _init_extra_cameras, _init_mainCamera, _init_extra_mainCamera, _init_transition, _init_extra_transition, _initProto],
      c: [_EveVirtualCameraSyst, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveVirtualCameraSystem",
      family: "eve/virtualCamera"
    })], [[[io, io.persist, void 0, type.objectRef("EveVirtualCamera")], 16, "externalCamera"], [[io, io.persist, void 0, type.list("EveVirtualCamera")], 16, "cameras"], [[io, io.persist, void 0, type.objectRef("EveVirtualCamera")], 16, "mainCamera"], [[io, io.read, void 0, type.objectRef("EveVirtualCameraTransitionBase")], 16, "transition"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurrentCamera"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddCamera"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMainCamera"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCameraByName"], [[carbon, carbon.method, impl, impl.implemented], 18, "CutToCamera"], [[carbon, carbon.method, impl, impl.implemented], 18, "LerpToCamera"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsExternallyControlled"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"]], 0, void 0, CjsModel));
  }
  externalCamera = (_initProto(this), _init_externalCamera(this, null));
  cameras = (_init_extra_externalCamera(this), _init_cameras(this, []));
  mainCamera = (_init_extra_cameras(this), _init_mainCamera(this, null));
  transition = (_init_extra_mainCamera(this), _init_transition(this, null));
  #lastUpdate = (_init_extra_transition(this), 0);

  /**
   * Creates the external camera, names it "externalCamera", gives it a
   * zero-length timeline and makes it the initial main camera.
   */
  constructor() {
    super();
    this.externalCamera = new _EveVirtualCamera();
    this.externalCamera.SetName("externalCamera");
    this.externalCamera.SetAnimationTimelineLength(0);
    this.mainCamera = this.externalCamera;
  }

  /**
   * Reports the system ready; the port has no device state to acquire, so this
   * always succeeds.
   */
  Initialize() {
    return true;
  }

  /**
   * Returns the camera the scene should render from: the transition's camera
   * while a transition is running, otherwise the main camera.
   */
  GetCurrentCamera() {
    return this.transition ? this.transition.GetCamera() : this.GetMainCamera();
  }

  /**
   * Registers a camera for updating and name lookup, refusing the external
   * camera and duplicates; returns whether it was added.
   */
  AddCamera(camera) {
    if (camera === this.externalCamera || this.cameras.includes(camera)) {
      return false;
    }
    this.cameras.push(camera);
    return true;
  }

  /**
   * Returns the camera control has been handed to, ignoring any transition
   * currently blending towards it.
   */
  GetMainCamera() {
    return this.mainCamera;
  }

  /**
   * Finds a registered camera by name, also matching the external camera, and
   * returns null when nothing matches.
   */
  GetCameraByName(name) {
    if (name === this.externalCamera?.GetName()) {
      return this.externalCamera;
    }
    return this.cameras.find(camera => camera?.GetName?.() === name) ?? null;
  }

  /**
   * Hands control to a camera immediately through a cut transition; does nothing
   * when the camera is null or already the main camera.
   */
  CutToCamera(camera) {
    if (camera && camera !== this.GetMainCamera()) {
      this.#setMainCameraWithTransition(camera, new _EveVirtualCameraTran());
    }
  }

  /**
   * Hands control to a camera through a lerp transition lasting transitionTime
   * seconds; does nothing when the camera is null or already the main camera.
   */
  LerpToCamera(camera, transitionTime = 1) {
    if (camera && camera !== this.GetMainCamera()) {
      const transition = new _EveVirtualCameraTran$1();
      transition.SetTransitionTime(transitionTime);
      this.#setMainCameraWithTransition(camera, transition);
    }
  }

  /**
   * Reports whether the currently rendering camera is the external one, meaning
   * the host application is driving the view rather than an authored camera.
   */
  IsExternallyControlled() {
    return this.GetCurrentCamera() === this.externalCamera;
  }

  /**
   * Advances every registered camera, the external camera and any running transition, clearing the transition once it completes.
   * @param {Number} simTime Absolute simulation time; the delta is derived from the previous call, and the first call produces a zero delta
   */
  Update(simTime) {
    const time = Number(simTime) || 0;
    if (this.#lastUpdate === 0) {
      this.#lastUpdate = time;
    }
    const deltaTime = time - this.#lastUpdate;
    this.#lastUpdate = time;
    for (const camera of this.cameras) {
      camera?.Update?.(deltaTime);
    }
    this.externalCamera?.Update?.(deltaTime);
    if (this.transition) {
      this.transition.Update(deltaTime);
      if (this.transition.IsComplete()) {
        this.transition = null;
      }
    }
  }

  /**
   * Drops any running transition, makes the camera the main one and registers it
   * if it was not already known.
   */
  #setMainCamera(camera) {
    this.transition = null;
    this.mainCamera = camera;
    this.AddCamera(camera);
  }

  /**
   * Switches the main camera and starts the supplied transition from the
   * previous main camera to the new one.
   */
  #setMainCameraWithTransition(camera, transition) {
    const current = this.GetMainCamera();
    this.#setMainCamera(camera);
    transition.SetSource(current);
    transition.SetTarget(this.GetMainCamera());
    transition.Play();
    this.transition = transition;
  }
  static {
    _initClass();
  }
}

export { _EveVirtualCameraSyst as EveVirtualCameraSystem };
//# sourceMappingURL=EveVirtualCameraSystem.js.map
