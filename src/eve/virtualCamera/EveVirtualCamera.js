// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCamera.h
// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCamera.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


const SCRUB_INCREMENT_DT = 1 / 60;
const SCRUB_MAX_ITERATIONS = 20;
/**
 * Cinematic camera defined by a position, a point of interest, a field of view
 * and a roll, each rebuilt every update from its own list of behaviours over a
 * local timeline.
 */
@type.define({
  className: "EveVirtualCamera",
  family: "eve/virtualCamera"
})
export class EveVirtualCamera extends CjsModel
{
  @io.read
  @type.vec3
  position = vec3.create();

  @io.read
  @type.vec3
  pointOfInterestAnchorCenter = vec3.create();

  @io.read
  @type.vec3
  positionAnchorCenter = vec3.create();

  @io.read
  @type.list("IEveSpaceObject2")
  pointOfInterestAnchors = [];

  @io.read
  @type.list("IEveSpaceObject2")
  positionAnchors = [];

  @io.read
  @type.float32
  localElapsedTime = 0;

  @io.read
  @type.vec3
  pointOfInterest = vec3.create();

  @io.read
  @type.float32
  pointOfInterestAnchorRadius = 0;

  @io.read
  @type.float32
  positionAnchorRadius = 0;

  @io.read
  @type.vec3
  positionAnchorForwardDirection = vec3.create();

  @io.read
  @type.vec3
  pointOfInterestAnchorForwardDirection = vec3.create();

  @io.persist
  @type.list("EveVirtualCameraBehaviourFloatBase")
  fovBehaviours = [];

  @io.persist
  @type.list("EveVirtualCameraBehaviourVector3Base")
  pointOfInterestBehaviours = [];

  @io.persist
  @type.list("EveVirtualCameraBehaviourVector3Base")
  positionBehaviours = [];

  @io.persist
  @type.list("EveVirtualCameraBehaviourFloatBase")
  rollBehaviours = [];

  @io.read
  @type.float32
  roll = 0;

  @io.read
  @type.float32
  fov = 1;

  @io.persist
  @type.float32
  animationTimelineLength = 10;

  @io.persist
  @type.string
  name = "Virtual Camera";

  @io.read
  @type.boolean
  running = false;

  /**
   * Builds a D3D-handed look-at view matrix from the current position, point of
   * interest and roll-adjusted up direction.
   */
  @carbon.method
  @impl.adapted
  GetViewMatrix(out = mat4.create())
  {
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
  @carbon.method
  @impl.adapted
  GetProjectionMatrix(aspectRatio, frontClip, backClip, out = mat4.create())
  {
    return mat4.perspectiveZO(out, this.fov, aspectRatio, frontClip, backClip);
  }

  /**
   * Returns the normalized direction from the camera position towards its point
   * of interest.
   */
  @carbon.method
  @impl.adapted
  GetViewDirection(out = vec3.create())
  {
    return vec3.normalize(out, vec3.subtract(out, this.pointOfInterest, this.position));
  }

  /**
   * Returns the view direction, as a virtual camera always faces its point of
   * interest.
   */
  @carbon.method
  @impl.adapted
  GetForwardDirection(out = vec3.create())
  {
    return this.GetViewDirection(out);
  }

  /**
   * Returns the up vector obtained by orthogonalizing world up against the view
   * direction and then rotating it about the view axis by the roll angle, which
   * is authored in degrees.
   */
  @carbon.method
  @impl.adapted
  GetUpDirection(out = vec3.create())
  {
    const view = this.GetForwardDirection(vec3.create());
    const right = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), view, vec3.fromValues(0, 1, 0)));
    vec3.normalize(out, vec3.cross(out, right, view));
    const rotation = quat.setAxisAngle(quat.create(), view, -this.roll * Math.PI / 180);
    return vec3.normalize(out, vec3.transformQuat(out, out, rotation));
  }

  /** Returns the normalized cross product of the forward and up directions. */
  @carbon.method
  @impl.adapted
  GetRightDirection(out = vec3.create())
  {
    return vec3.normalize(out, vec3.cross(out, this.GetForwardDirection(vec3.create()), this.GetUpDirection(vec3.create())));
  }

  /**
   * Advances the local timeline (only while running), refreshes the anchor
   * centre, radius and forward state, and re-evaluates position, point of
   * interest, field of view and roll from their behaviour lists; each value is
   * written back only when its behaviour list is non-empty, so an unauthored
   * channel keeps whatever was set externally.
   */
  @carbon.method
  @impl.adapted
  Update(deltaTime)
  {
    const dt = this.running ? deltaTime : 0;
    this.localElapsedTime += dt;
    EveVirtualCamera.#updateAnchorState(this, "position");
    EveVirtualCamera.#updateAnchorState(this, "pointOfInterest");
    const position = vec3.clone(this.positionAnchorCenter);
    const pointOfInterest = vec3.clone(this.pointOfInterestAnchorCenter);
    let fov = 1;
    let roll = 0;
    EveVirtualCamera.#applyVectorBehaviours(this.positionBehaviours, this, position, dt, this.localElapsedTime, this.positionAnchorCenter, this.positionAnchorRadius, this.positionAnchorForwardDirection);
    EveVirtualCamera.#applyVectorBehaviours(this.pointOfInterestBehaviours, this, pointOfInterest, dt, this.localElapsedTime, this.pointOfInterestAnchorCenter, this.pointOfInterestAnchorRadius, this.pointOfInterestAnchorForwardDirection);
    fov = EveVirtualCamera.#applyFloatBehaviours(this.fovBehaviours, this, fov, dt, this.localElapsedTime, this.positionAnchorCenter, this.positionAnchorRadius, this.positionAnchorForwardDirection);
    roll = EveVirtualCamera.#applyFloatBehaviours(this.rollBehaviours, this, roll, dt, this.localElapsedTime, this.positionAnchorCenter, this.positionAnchorRadius, this.positionAnchorForwardDirection);
    if (this.positionBehaviours.length)
    {
      vec3.copy(this.position, position);
    }
    if (this.pointOfInterestBehaviours.length)
    {
      vec3.copy(this.pointOfInterest, pointOfInterest);
    }
    if (this.fovBehaviours.length)
    {
      this.fov = fov;
    }
    if (this.rollBehaviours.length)
    {
      this.roll = roll;
    }
  }

  /** Starts the local timeline advancing on subsequent updates. */
  @carbon.method
  @impl.implemented
  Play()
  {
    this.running = true;
  }

  /**
   * Freezes the local timeline without resetting it, so updates leave the
   * evaluated transform where it is.
   */
  @carbon.method
  @impl.implemented
  Pause()
  {
    this.running = false;
  }

  /** Rewinds the local timeline to zero and stops it advancing. */
  @carbon.method
  @impl.implemented
  Stop()
  {
    this.Reset();
    this.running = false;
  }

  /** Rewinds the local timeline to zero, leaving the running state alone. */
  @carbon.method
  @impl.implemented
  Reset()
  {
    this.localElapsedTime = 0;
  }

  /**
   * Scrubs the camera to an absolute local time by replaying Update in fixed 1/60s steps so that stateful behaviours see a plausible history; the step count is capped at 20 and the step size grows to cover longer jumps. The camera is forced running for the scrub and its previous running state is restored afterwards.
   * @param {Number} time Target local elapsed time in seconds; may be negative
   */
  @carbon.method
  @impl.adapted
  UpdateToLocalTime(time)
  {
    const diff = time - this.localElapsedTime;
    let dt = SCRUB_INCREMENT_DT;
    let iterations = Math.floor(Math.abs(diff / dt));
    if (iterations > SCRUB_MAX_ITERATIONS)
    {
      iterations = SCRUB_MAX_ITERATIONS;
      dt = diff / SCRUB_MAX_ITERATIONS;
    }
    iterations -= 1;
    const wasRunning = this.running;
    this.Play();
    for (let i = 0; i < iterations; i++)
    {
      this.Update(dt);
    }
    this.Update(time - this.localElapsedTime);
    if (!wasRunning)
    {
      this.Pause();
    }
  }

  /**
   * Copies field of view, roll, position and point of interest from another
   * camera, leaving behaviours, name and timeline untouched.
   */
  @carbon.method
  @impl.implemented
  CopyTransform(source)
  {
    this.fov = source.fov;
    this.roll = source.roll;
    vec3.copy(this.position, source.position);
    vec3.copy(this.pointOfInterest, source.pointOfInterest);
  }

  /**
   * Writes a transform supplied from outside directly onto the camera, used to
   * drive it from a host application or a transition instead of from behaviours.
   */
  @carbon.method
  @impl.adapted
  UpdateExternal(position, pointOfInterest, fov, roll)
  {
    vec3.copy(this.position, position);
    vec3.copy(this.pointOfInterest, pointOfInterest);
    this.fov = fov;
    this.roll = roll;
  }

  /** Returns the camera name used to look it up in the camera system. */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the camera name, coercing the argument to a string. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Returns the timeline length in seconds that behaviours divide local elapsed
   * time by to get their normalized curve time.
   */
  @carbon.method
  @impl.implemented
  GetAnimationTimelineLength()
  {
    return this.animationTimelineLength;
  }

  /**
   * Sets the timeline length in seconds; a length of zero makes behaviours treat
   * their normalized time as zero.
   */
  @carbon.method
  @impl.implemented
  SetAnimationTimelineLength(value)
  {
    this.animationTimelineLength = value;
  }

  /** Returns the vertical field of view in radians. */
  @carbon.method
  @impl.implemented
  GetFov()
  {
    return this.fov;
  }

  /**
   * Sets the vertical field of view in radians; field-of-view behaviours
   * overwrite it on the next update.
   */
  @carbon.method
  @impl.implemented
  SetFov(value)
  {
    this.fov = value;
  }

  /** Returns the roll about the view axis in degrees. */
  @carbon.method
  @impl.implemented
  GetRoll()
  {
    return this.roll;
  }

  /**
   * Sets the roll about the view axis in degrees; roll behaviours overwrite it
   * on the next update.
   */
  @carbon.method
  @impl.implemented
  SetRoll(value)
  {
    this.roll = value;
  }

  /** Copies the world-space camera position into out. */
  @carbon.method
  @impl.adapted
  GetPosition(out = vec3.create())
  {
    return vec3.copy(out, this.position);
  }

  /**
   * Copies a world-space position into the camera, preserving the identity of
   * the backing vector.
   */
  @carbon.method
  @impl.adapted
  SetPosition(value)
  {
    vec3.copy(this.position, value);
  }

  /** Copies the world-space point the camera looks at into out. */
  @carbon.method
  @impl.adapted
  GetPointOfInterest(out = vec3.create())
  {
    return vec3.copy(out, this.pointOfInterest);
  }

  /**
   * Copies a world-space look-at point into the camera, preserving the identity
   * of the backing vector.
   */
  @carbon.method
  @impl.adapted
  SetPointOfInterest(value)
  {
    vec3.copy(this.pointOfInterest, value);
  }

  /**
   * Appends a vector3 behaviour whose returned offset is accumulated into the
   * camera position, starting from the position anchor centre.
   */
  @carbon.method
  @impl.implemented
  AddPositionBehaviour(behaviour)
  {
    this.positionBehaviours.push(behaviour);
  }

  /**
   * Appends a vector3 behaviour whose returned offset is accumulated into the
   * point of interest, starting from the point-of-interest anchor centre.
   */
  @carbon.method
  @impl.implemented
  AddPointOfInterestBehaviour(behaviour)
  {
    this.pointOfInterestBehaviours.push(behaviour);
  }

  /**
   * Appends a float behaviour whose returned delta is accumulated into the field
   * of view, which restarts from 1 radian each update.
   */
  @carbon.method
  @impl.implemented
  AddFOVBehaviour(behaviour)
  {
    this.fovBehaviours.push(behaviour);
  }

  /**
   * Appends a float behaviour whose returned delta is accumulated into the roll,
   * which restarts from 0 degrees each update.
   */
  @carbon.method
  @impl.implemented
  AddRollBehaviour(behaviour)
  {
    this.rollBehaviours.push(behaviour);
  }

  /**
   * Adds each active behaviour's returned offset into value in list order, so
   * later behaviours see the running result of the earlier ones together with
   * the anchor centre, radius and forward direction.
   */
  static #applyVectorBehaviours(behaviours, camera, value, deltaTime, localTime, anchorCenter, anchorRadius, anchorForward)
  {
    for (const behaviour of behaviours)
    {
      if ((behaviour?.IsActive?.() ?? behaviour?.active !== false) && typeof behaviour?.Update === "function")
      {
        const offset = behaviour.Update(camera, value, deltaTime, localTime, anchorCenter, anchorRadius, anchorForward);
        if (offset)
        {
          vec3.add(value, value, offset);
        }
      }
    }
  }

  /**
   * Returns value with each active behaviour's returned delta added in list
   * order; a non-numeric result counts as zero.
   */
  static #applyFloatBehaviours(behaviours, camera, value, deltaTime, localTime, anchorCenter, anchorRadius, anchorForward)
  {
    for (const behaviour of behaviours)
    {
      if ((behaviour?.IsActive?.() ?? behaviour?.active !== false) && typeof behaviour?.Update === "function")
      {
        value += Number(behaviour.Update(camera, value, deltaTime, localTime, anchorCenter, anchorRadius, anchorForward)) || 0;
      }
    }
    return value;
  }

  /**
   * Recomputes the averaged centre, forward direction and enclosing radius of one anchor list, which behaviours use to scale and orient themselves relative to the anchored objects.
   * @param {EveVirtualCamera} camera
   * @param {String} prefix Field prefix, either "position" or "pointOfInterest"
   * @returns {void} Writes the AnchorCenter, AnchorForwardDirection and AnchorRadius fields; with no anchors the forward direction becomes +Z and the radius 1000
   */
  static #updateAnchorState(camera, prefix)
  {
    const anchors = camera[`${prefix}Anchors`];
    const center = camera[`${prefix}AnchorCenter`];
    const forward = camera[`${prefix}AnchorForwardDirection`];
    vec3.zero(center);
    if (!anchors.length)
    {
      vec3.set(forward, 0, 0, 1);
      camera[`${prefix}AnchorRadius`] = 1000;
      return;
    }
    for (const anchor of anchors)
    {
      const value = vec3.create();
      const result = anchor?.GetModelCenterWorldPosition?.(value);
      vec3.add(center, center, result?.length >= 3 ? result : value);
    }
    vec3.scale(center, center, 1 / anchors.length);
    vec3.set(forward, 0, 0, 1);
    let radius = 0;
    for (const anchor of anchors)
    {
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
}
