import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_position, _init_extra_position, _init_pointOfInterestAnchorCenter, _init_extra_pointOfInterestAnchorCenter, _init_positionAnchorCenter, _init_extra_positionAnchorCenter, _init_pointOfInterestAnchors, _init_extra_pointOfInterestAnchors, _init_positionAnchors, _init_extra_positionAnchors, _init_localElapsedTime, _init_extra_localElapsedTime, _init_pointOfInterest, _init_extra_pointOfInterest, _init_pointOfInterestAnchorRadius, _init_extra_pointOfInterestAnchorRadius, _init_positionAnchorRadius, _init_extra_positionAnchorRadius, _init_positionAnchorForwardDirection, _init_extra_positionAnchorForwardDirection, _init_pointOfInterestAnchorForwardDirection, _init_extra_pointOfInterestAnchorForwardDirection, _init_fovBehaviours, _init_extra_fovBehaviours, _init_pointOfInterestBehaviours, _init_extra_pointOfInterestBehaviours, _init_positionBehaviours, _init_extra_positionBehaviours, _init_rollBehaviours, _init_extra_rollBehaviours, _init_roll, _init_extra_roll, _init_fov, _init_extra_fov, _init_animationTimelineLength, _init_extra_animationTimelineLength, _init_name, _init_extra_name, _init_running, _init_extra_running;
const SCRUB_INCREMENT_DT = 1 / 60;
const SCRUB_MAX_ITERATIONS = 20;

/**
 * Cinematic camera defined by a position, a point of interest, a field of view
 * and a roll, each rebuilt every update from its own list of behaviours over a
 * local timeline.
 */
let _EveVirtualCamera;
new class extends _identity {
  static [class EveVirtualCamera extends CjsModel {
    static {
      ({
        e: [_init_position, _init_extra_position, _init_pointOfInterestAnchorCenter, _init_extra_pointOfInterestAnchorCenter, _init_positionAnchorCenter, _init_extra_positionAnchorCenter, _init_pointOfInterestAnchors, _init_extra_pointOfInterestAnchors, _init_positionAnchors, _init_extra_positionAnchors, _init_localElapsedTime, _init_extra_localElapsedTime, _init_pointOfInterest, _init_extra_pointOfInterest, _init_pointOfInterestAnchorRadius, _init_extra_pointOfInterestAnchorRadius, _init_positionAnchorRadius, _init_extra_positionAnchorRadius, _init_positionAnchorForwardDirection, _init_extra_positionAnchorForwardDirection, _init_pointOfInterestAnchorForwardDirection, _init_extra_pointOfInterestAnchorForwardDirection, _init_fovBehaviours, _init_extra_fovBehaviours, _init_pointOfInterestBehaviours, _init_extra_pointOfInterestBehaviours, _init_positionBehaviours, _init_extra_positionBehaviours, _init_rollBehaviours, _init_extra_rollBehaviours, _init_roll, _init_extra_roll, _init_fov, _init_extra_fov, _init_animationTimelineLength, _init_extra_animationTimelineLength, _init_name, _init_extra_name, _init_running, _init_extra_running, _initProto],
        c: [_EveVirtualCamera, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveVirtualCamera",
        family: "eve/virtualCamera"
      })], [[[io, io.read, type, type.vec3], 16, "position"], [[io, io.read, type, type.vec3], 16, "pointOfInterestAnchorCenter"], [[io, io.read, type, type.vec3], 16, "positionAnchorCenter"], [[io, io.read, void 0, type.list("IEveSpaceObject2")], 16, "pointOfInterestAnchors"], [[io, io.read, void 0, type.list("IEveSpaceObject2")], 16, "positionAnchors"], [[io, io.read, type, type.float32], 16, "localElapsedTime"], [[io, io.read, type, type.vec3], 16, "pointOfInterest"], [[io, io.read, type, type.float32], 16, "pointOfInterestAnchorRadius"], [[io, io.read, type, type.float32], 16, "positionAnchorRadius"], [[io, io.read, type, type.vec3], 16, "positionAnchorForwardDirection"], [[io, io.read, type, type.vec3], 16, "pointOfInterestAnchorForwardDirection"], [[io, io.persist, void 0, type.list("EveVirtualCameraBehaviourFloatBase")], 16, "fovBehaviours"], [[io, io.persist, void 0, type.list("EveVirtualCameraBehaviourVector3Base")], 16, "pointOfInterestBehaviours"], [[io, io.persist, void 0, type.list("EveVirtualCameraBehaviourVector3Base")], 16, "positionBehaviours"], [[io, io.persist, void 0, type.list("EveVirtualCameraBehaviourFloatBase")], 16, "rollBehaviours"], [[io, io.read, type, type.float32], 16, "roll"], [[io, io.read, type, type.float32], 16, "fov"], [[io, io.persist, type, type.float32], 16, "animationTimelineLength"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.boolean], 16, "running"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetViewMatrix"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetProjectionMatrix"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetViewDirection"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetForwardDirection"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetUpDirection"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetRightDirection"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "Play"], [[carbon, carbon.method, impl, impl.implemented], 18, "Pause"], [[carbon, carbon.method, impl, impl.implemented], 18, "Stop"], [[carbon, carbon.method, impl, impl.implemented], 18, "Reset"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateToLocalTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "CopyTransform"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateExternal"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAnimationTimelineLength"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetAnimationTimelineLength"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFov"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetFov"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRoll"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetRoll"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetPosition"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetPosition"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetPointOfInterest"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetPointOfInterest"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddPositionBehaviour"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddPointOfInterestBehaviour"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddFOVBehaviour"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddRollBehaviour"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_running(this);
    }
    position = (_initProto(this), _init_position(this, vec3.create()));
    pointOfInterestAnchorCenter = (_init_extra_position(this), _init_pointOfInterestAnchorCenter(this, vec3.create()));
    positionAnchorCenter = (_init_extra_pointOfInterestAnchorCenter(this), _init_positionAnchorCenter(this, vec3.create()));
    pointOfInterestAnchors = (_init_extra_positionAnchorCenter(this), _init_pointOfInterestAnchors(this, []));
    positionAnchors = (_init_extra_pointOfInterestAnchors(this), _init_positionAnchors(this, []));
    localElapsedTime = (_init_extra_positionAnchors(this), _init_localElapsedTime(this, 0));
    pointOfInterest = (_init_extra_localElapsedTime(this), _init_pointOfInterest(this, vec3.create()));
    pointOfInterestAnchorRadius = (_init_extra_pointOfInterest(this), _init_pointOfInterestAnchorRadius(this, 0));
    positionAnchorRadius = (_init_extra_pointOfInterestAnchorRadius(this), _init_positionAnchorRadius(this, 0));
    positionAnchorForwardDirection = (_init_extra_positionAnchorRadius(this), _init_positionAnchorForwardDirection(this, vec3.create()));
    pointOfInterestAnchorForwardDirection = (_init_extra_positionAnchorForwardDirection(this), _init_pointOfInterestAnchorForwardDirection(this, vec3.create()));
    fovBehaviours = (_init_extra_pointOfInterestAnchorForwardDirection(this), _init_fovBehaviours(this, []));
    pointOfInterestBehaviours = (_init_extra_fovBehaviours(this), _init_pointOfInterestBehaviours(this, []));
    positionBehaviours = (_init_extra_pointOfInterestBehaviours(this), _init_positionBehaviours(this, []));
    rollBehaviours = (_init_extra_positionBehaviours(this), _init_rollBehaviours(this, []));
    roll = (_init_extra_rollBehaviours(this), _init_roll(this, 0));
    fov = (_init_extra_roll(this), _init_fov(this, 1));
    animationTimelineLength = (_init_extra_fov(this), _init_animationTimelineLength(this, 10));
    name = (_init_extra_animationTimelineLength(this), _init_name(this, "Virtual Camera"));
    running = (_init_extra_name(this), _init_running(this, false));

    /**
     * Builds a D3D-handed look-at view matrix from the current position, point of
     * interest and roll-adjusted up direction.
     */
    GetViewMatrix(out = mat4.create()) {
      return mat4.lookAtD3D(out, this.position, this.pointOfInterest, this.GetUpDirection());
    }

    /**
     * Builds a zero-to-one depth perspective projection from the camera's field of view and the supplied framing values.
     * @param {Number} aspectRatio
     * @param {Number} frontClip Near plane distance
     * @param {Number} backClip Far plane distance
     * @param {mat4} [out]
     * @returns {mat4}
     */
    GetProjectionMatrix(aspectRatio, frontClip, backClip, out = mat4.create()) {
      return mat4.perspectiveZO(out, this.fov, aspectRatio, frontClip, backClip);
    }

    /**
     * Returns the normalized direction from the camera position towards its point
     * of interest.
     */
    GetViewDirection(out = vec3.create()) {
      return vec3.normalize(out, vec3.subtract(out, this.pointOfInterest, this.position));
    }

    /**
     * Returns the view direction, as a virtual camera always faces its point of
     * interest.
     */
    GetForwardDirection(out = vec3.create()) {
      return this.GetViewDirection(out);
    }

    /**
     * Returns the up vector obtained by orthogonalizing world up against the view
     * direction and then rotating it about the view axis by the roll angle, which
     * is authored in degrees.
     */
    GetUpDirection(out = vec3.create()) {
      const view = this.GetForwardDirection(vec3.create());
      const right = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), view, vec3.fromValues(0, 1, 0)));
      vec3.normalize(out, vec3.cross(out, right, view));
      const rotation = quat.setAxisAngle(quat.create(), view, -this.roll * Math.PI / 180);
      return vec3.normalize(out, vec3.transformQuat(out, out, rotation));
    }

    /** Returns the normalized cross product of the forward and up directions. */
    GetRightDirection(out = vec3.create()) {
      return vec3.normalize(out, vec3.cross(out, this.GetForwardDirection(vec3.create()), this.GetUpDirection(vec3.create())));
    }

    /**
     * Advances the local timeline (only while running), refreshes the anchor
     * centre, radius and forward state, and re-evaluates position, point of
     * interest, field of view and roll from their behaviour lists; each value is
     * written back only when its behaviour list is non-empty, so an unauthored
     * channel keeps whatever was set externally.
     */
    Update(deltaTime) {
      const dt = this.running ? deltaTime : 0;
      this.localElapsedTime += dt;
      _EveVirtualCamera.#updateAnchorState(this, "position");
      _EveVirtualCamera.#updateAnchorState(this, "pointOfInterest");
      const position = vec3.clone(this.positionAnchorCenter);
      const pointOfInterest = vec3.clone(this.pointOfInterestAnchorCenter);
      let fov = 1;
      let roll = 0;
      _EveVirtualCamera.#applyVectorBehaviours(this.positionBehaviours, this, position, dt, this.localElapsedTime, this.positionAnchorCenter, this.positionAnchorRadius, this.positionAnchorForwardDirection);
      _EveVirtualCamera.#applyVectorBehaviours(this.pointOfInterestBehaviours, this, pointOfInterest, dt, this.localElapsedTime, this.pointOfInterestAnchorCenter, this.pointOfInterestAnchorRadius, this.pointOfInterestAnchorForwardDirection);
      fov = _EveVirtualCamera.#applyFloatBehaviours(this.fovBehaviours, this, fov, dt, this.localElapsedTime, this.positionAnchorCenter, this.positionAnchorRadius, this.positionAnchorForwardDirection);
      roll = _EveVirtualCamera.#applyFloatBehaviours(this.rollBehaviours, this, roll, dt, this.localElapsedTime, this.positionAnchorCenter, this.positionAnchorRadius, this.positionAnchorForwardDirection);
      if (this.positionBehaviours.length) {
        vec3.copy(this.position, position);
      }
      if (this.pointOfInterestBehaviours.length) {
        vec3.copy(this.pointOfInterest, pointOfInterest);
      }
      if (this.fovBehaviours.length) {
        this.fov = fov;
      }
      if (this.rollBehaviours.length) {
        this.roll = roll;
      }
    }

    /** Starts the local timeline advancing on subsequent updates. */
    Play() {
      this.running = true;
    }

    /**
     * Freezes the local timeline without resetting it, so updates leave the
     * evaluated transform where it is.
     */
    Pause() {
      this.running = false;
    }

    /** Rewinds the local timeline to zero and stops it advancing. */
    Stop() {
      this.Reset();
      this.running = false;
    }

    /** Rewinds the local timeline to zero, leaving the running state alone. */
    Reset() {
      this.localElapsedTime = 0;
    }

    /**
     * Scrubs the camera to an absolute local time by replaying Update in fixed 1/60s steps so that stateful behaviours see a plausible history; the step count is capped at 20 and the step size grows to cover longer jumps. The camera is forced running for the scrub and its previous running state is restored afterwards.
     * @param {Number} time Target local elapsed time in seconds; may be negative
     */
    UpdateToLocalTime(time) {
      const diff = time - this.localElapsedTime;
      let dt = SCRUB_INCREMENT_DT;
      let iterations = Math.floor(Math.abs(diff / dt));
      if (iterations > SCRUB_MAX_ITERATIONS) {
        iterations = SCRUB_MAX_ITERATIONS;
        dt = diff / SCRUB_MAX_ITERATIONS;
      }
      iterations -= 1;
      const wasRunning = this.running;
      this.Play();
      for (let i = 0; i < iterations; i++) {
        this.Update(dt);
      }
      this.Update(time - this.localElapsedTime);
      if (!wasRunning) {
        this.Pause();
      }
    }

    /**
     * Copies field of view, roll, position and point of interest from another
     * camera, leaving behaviours, name and timeline untouched.
     */
    CopyTransform(source) {
      this.fov = source.fov;
      this.roll = source.roll;
      vec3.copy(this.position, source.position);
      vec3.copy(this.pointOfInterest, source.pointOfInterest);
    }

    /**
     * Writes a transform supplied from outside directly onto the camera, used to
     * drive it from a host application or a transition instead of from behaviours.
     */
    UpdateExternal(position, pointOfInterest, fov, roll) {
      vec3.copy(this.position, position);
      vec3.copy(this.pointOfInterest, pointOfInterest);
      this.fov = fov;
      this.roll = roll;
    }

    /** Returns the camera name used to look it up in the camera system. */
    GetName() {
      return this.name;
    }

    /** Sets the camera name, coercing the argument to a string. */
    SetName(name) {
      this.name = String(name);
    }

    /**
     * Returns the timeline length in seconds that behaviours divide local elapsed
     * time by to get their normalized curve time.
     */
    GetAnimationTimelineLength() {
      return this.animationTimelineLength;
    }

    /**
     * Sets the timeline length in seconds; a length of zero makes behaviours treat
     * their normalized time as zero.
     */
    SetAnimationTimelineLength(value) {
      this.animationTimelineLength = value;
    }

    /** Returns the vertical field of view in radians. */
    GetFov() {
      return this.fov;
    }

    /**
     * Sets the vertical field of view in radians; field-of-view behaviours
     * overwrite it on the next update.
     */
    SetFov(value) {
      this.fov = value;
    }

    /** Returns the roll about the view axis in degrees. */
    GetRoll() {
      return this.roll;
    }

    /**
     * Sets the roll about the view axis in degrees; roll behaviours overwrite it
     * on the next update.
     */
    SetRoll(value) {
      this.roll = value;
    }

    /** Copies the world-space camera position into out. */
    GetPosition(out = vec3.create()) {
      return vec3.copy(out, this.position);
    }

    /**
     * Copies a world-space position into the camera, preserving the identity of
     * the backing vector.
     */
    SetPosition(value) {
      vec3.copy(this.position, value);
    }

    /** Copies the world-space point the camera looks at into out. */
    GetPointOfInterest(out = vec3.create()) {
      return vec3.copy(out, this.pointOfInterest);
    }

    /**
     * Copies a world-space look-at point into the camera, preserving the identity
     * of the backing vector.
     */
    SetPointOfInterest(value) {
      vec3.copy(this.pointOfInterest, value);
    }

    /**
     * Appends a vector3 behaviour whose returned offset is accumulated into the
     * camera position, starting from the position anchor centre.
     */
    AddPositionBehaviour(behaviour) {
      this.positionBehaviours.push(behaviour);
    }

    /**
     * Appends a vector3 behaviour whose returned offset is accumulated into the
     * point of interest, starting from the point-of-interest anchor centre.
     */
    AddPointOfInterestBehaviour(behaviour) {
      this.pointOfInterestBehaviours.push(behaviour);
    }

    /**
     * Appends a float behaviour whose returned delta is accumulated into the field
     * of view, which restarts from 1 radian each update.
     */
    AddFOVBehaviour(behaviour) {
      this.fovBehaviours.push(behaviour);
    }

    /**
     * Appends a float behaviour whose returned delta is accumulated into the roll,
     * which restarts from 0 degrees each update.
     */
    AddRollBehaviour(behaviour) {
      this.rollBehaviours.push(behaviour);
    }

    /**
     * Adds each active behaviour's returned offset into value in list order, so
     * later behaviours see the running result of the earlier ones together with
     * the anchor centre, radius and forward direction.
     */

    /**
     * Returns value with each active behaviour's returned delta added in list
     * order; a non-numeric result counts as zero.
     */

    /**
     * Recomputes the averaged centre, forward direction and enclosing radius of one anchor list, which behaviours use to scale and orient themselves relative to the anchored objects.
     * @param {EveVirtualCamera} camera
     * @param {String} prefix Field prefix, either "position" or "pointOfInterest"
     * @returns {void} Writes the AnchorCenter, AnchorForwardDirection and AnchorRadius fields; with no anchors the forward direction becomes +Z and the radius 1000
     */
  }];
  #applyVectorBehaviours(behaviours, camera, value, deltaTime, localTime, anchorCenter, anchorRadius, anchorForward) {
    for (const behaviour of behaviours) {
      if ((behaviour?.IsActive?.() ?? behaviour?.active !== false) && typeof behaviour?.Update === "function") {
        const offset = behaviour.Update(camera, value, deltaTime, localTime, anchorCenter, anchorRadius, anchorForward);
        if (offset) {
          vec3.add(value, value, offset);
        }
      }
    }
  }
  #applyFloatBehaviours(behaviours, camera, value, deltaTime, localTime, anchorCenter, anchorRadius, anchorForward) {
    for (const behaviour of behaviours) {
      if ((behaviour?.IsActive?.() ?? behaviour?.active !== false) && typeof behaviour?.Update === "function") {
        value += Number(behaviour.Update(camera, value, deltaTime, localTime, anchorCenter, anchorRadius, anchorForward)) || 0;
      }
    }
    return value;
  }
  #updateAnchorState(camera, prefix) {
    const anchors = camera[`${prefix}Anchors`];
    const center = camera[`${prefix}AnchorCenter`];
    const forward = camera[`${prefix}AnchorForwardDirection`];
    vec3.zero(center);
    if (!anchors.length) {
      vec3.set(forward, 0, 0, 1);
      camera[`${prefix}AnchorRadius`] = 1000;
      return;
    }
    for (const anchor of anchors) {
      const value = vec3.create();
      const result = anchor?.GetModelCenterWorldPosition?.(value);
      vec3.add(center, center, result?.length >= 3 ? result : value);
    }
    vec3.scale(center, center, 1 / anchors.length);
    vec3.set(forward, 0, 0, 1);
    let radius = 0;
    for (const anchor of anchors) {
      const sphere = vec4.create();
      const result = anchor?.GetBoundingSphere?.(sphere);
      const centerValue = vec3.create();
      const centerResult = anchor?.GetModelCenterWorldPosition?.(centerValue);
      const anchorCenter = centerResult?.length >= 3 ? centerResult : centerValue;
      const sphereRadius = result?.radius ?? result?.[3] ?? sphere[3] ?? 0;
      radius = Math.max(radius, vec3.distance(anchorCenter, center) + sphereRadius);
    }
    camera[`${prefix}AnchorRadius`] = radius || 1000;
  }
  constructor() {
    super(_EveVirtualCamera), _initClass();
  }
}();

export { _EveVirtualCamera as EveVirtualCamera };
//# sourceMappingURL=EveVirtualCamera.js.map
