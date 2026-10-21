import { exposure as be } from "#be";
import { ITr2DebugRenderable } from "../../../global/interfaces/ITr2DebugRenderable.js";
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCamera.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCamera.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type, blue } from "#schema";


const SCRUB_INCREMENT_DT = 1 / 60;
const SCRUB_MAX_ITERATIONS = 20;

/**
 * Cinematic camera defined by a position, a point of interest, a field of view
 * and a roll, each rebuilt every update from its own list of behaviours over a
 * local timeline.
 */
@be.define("EveVirtualCamera")
@blue.inherit(ITr2DebugRenderable)
export class EveVirtualCamera
{
  @be.mapAttribute(be.READ)
  @type.vec3
  position = vec3.create();

  @be.mapAttribute(be.READ)
  @type.vec3
  pointOfInterestAnchorCenter = vec3.create();

  @be.mapAttribute(be.READ)
  @type.vec3
  positionAnchorCenter = vec3.create();

  @be.mapAttribute(be.READ)
  @type.list("IEveSpaceObject2")
  pointOfInterestAnchors = [];

  @be.mapAttribute(be.READ)
  @type.list("IEveSpaceObject2")
  positionAnchors = [];

  @be.mapAttribute(be.READ)
  @type.float32
  localElapsedTime = 0;

  @be.mapAttribute(be.READ)
  @type.vec3
  pointOfInterest = vec3.create();

  @be.mapAttribute(be.READ)
  @type.float32
  pointOfInterestAnchorRadius = 0;

  @be.mapAttribute(be.READ)
  @type.float32
  positionAnchorRadius = 0;

  @be.mapAttribute(be.READ)
  @type.vec3
  positionAnchorForwardDirection = vec3.create();

  @be.mapAttribute(be.READ)
  @type.vec3
  pointOfInterestAnchorForwardDirection = vec3.create();

  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveVirtualCameraBehaviourFloatBase")
  fovBehaviours = [];

  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveVirtualCameraBehaviourVector3Base")
  pointOfInterestBehaviours = [];

  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveVirtualCameraBehaviourVector3Base")
  positionBehaviours = [];

  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveVirtualCameraBehaviourFloatBase")
  rollBehaviours = [];

  @be.mapAttribute(be.READ)
  @type.float32
  roll = 0;

  @be.mapAttribute(be.READ)
  @type.float32
  fov = 1;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  animationTimelineLength = 10;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "Virtual Camera";

  @be.mapAttribute(be.READ)
  @type.boolean
  running = false;

  /**
   * Carbon MAP_PROPERTY_READONLY "forward" over GetViewDirection
   * (EveVirtualCamera_Blue.cpp:29): the unit direction towards the point of
   * interest.
   */
  @be.mapPropertyReadOnly()
  @type.vec3
  @meta.implemented
  get forward()
  {
    return this.GetViewDirection();
  }

  /**
   * Carbon MAP_PROPERTY_READONLY "right" over GetRightDirection
   * (EveVirtualCamera_Blue.cpp:30): the unit right direction.
   */
  @be.mapPropertyReadOnly()
  @type.vec3
  @meta.implemented
  get right()
  {
    return this.GetRightDirection();
  }

  /**
   * Carbon MAP_PROPERTY_READONLY "up" over GetUpDirection
   * (EveVirtualCamera_Blue.cpp:31): the roll-adjusted unit up direction.
   */
  @be.mapPropertyReadOnly()
  @type.vec3
  @meta.implemented
  get up()
  {
    return this.GetUpDirection();
  }

  /**
   * Builds a D3D-handed look-at view matrix from the current position, point of
   * interest and roll-adjusted up direction.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
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
  @be.mapMethodAndWrap()
  @meta.adapted
  GetProjectionMatrix(aspectRatio, frontClip, backClip, out = mat4.create())
  {
    return mat4.perspectiveZO(out, this.fov, aspectRatio, frontClip, backClip);
  }

  /**
   * Returns the normalized direction from the camera position towards its point
   * of interest.
   */
  @blue.method
  @meta.adapted
  GetViewDirection(out = vec3.create())
  {
    return vec3.normalize(out, vec3.subtract(out, this.pointOfInterest, this.position));
  }

  /**
   * Returns the view direction, as a virtual camera always faces its point of
   * interest.
   */
  @blue.method
  @meta.adapted
  GetForwardDirection(out = vec3.create())
  {
    return this.GetViewDirection(out);
  }

  /**
   * Returns the up vector obtained by orthogonalizing world up against the view
   * direction and then rotating it about the view axis by the roll angle, which
   * is authored in degrees.
   */
  @blue.method
  @meta.adapted
  GetUpDirection(out = vec3.create())
  {
    const view = this.GetForwardDirection(vec3.create());
    const right = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), view, vec3.fromValues(0, 1, 0)));
    vec3.normalize(out, vec3.cross(out, right, view));
    const rotation = quat.setAxisAngle(quat.create(), view, -this.roll * Math.PI / 180);
    return vec3.normalize(out, vec3.transformQuat(out, out, rotation));
  }

  /** Returns the normalized cross product of the forward and up directions. */
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.adapted
  Update(deltaTime)
  {
    const dt = this.running ? deltaTime : 0;
    this.localElapsedTime += dt;
    EveVirtualCamera._updateAnchorState(this, "position");
    EveVirtualCamera._updateAnchorState(this, "pointOfInterest");
    const position = vec3.clone(this.positionAnchorCenter);
    const pointOfInterest = vec3.clone(this.pointOfInterestAnchorCenter);
    let fov = 1;
    let roll = 0;
    EveVirtualCamera._applyVectorBehaviours(this.positionBehaviours, this, position, dt, this.localElapsedTime, this.positionAnchorCenter, this.positionAnchorRadius, this.positionAnchorForwardDirection);
    EveVirtualCamera._applyVectorBehaviours(this.pointOfInterestBehaviours, this, pointOfInterest, dt, this.localElapsedTime, this.pointOfInterestAnchorCenter, this.pointOfInterestAnchorRadius, this.pointOfInterestAnchorForwardDirection);
    fov = EveVirtualCamera._applyFloatBehaviours(this.fovBehaviours, this, fov, dt, this.localElapsedTime, this.positionAnchorCenter, this.positionAnchorRadius, this.positionAnchorForwardDirection);
    roll = EveVirtualCamera._applyFloatBehaviours(this.rollBehaviours, this, roll, dt, this.localElapsedTime, this.positionAnchorCenter, this.positionAnchorRadius, this.positionAnchorForwardDirection);
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
  @be.mapMethodAndWrap()
  @meta.implemented
  Play()
  {
    this.running = true;
  }

  /**
   * Freezes the local timeline without resetting it, so updates leave the
   * evaluated transform where it is.
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  Pause()
  {
    this.running = false;
  }

  /** Rewinds the local timeline to zero and stops it advancing. */
  @be.mapMethodAndWrap()
  @meta.implemented
  Stop()
  {
    this.Reset();
    this.running = false;
  }

  /** Rewinds the local timeline to zero, leaving the running state alone. */
  @blue.method
  @meta.implemented
  Reset()
  {
    this.localElapsedTime = 0;
  }

  /**
   * Scrubs the camera to an absolute local time by replaying Update in fixed 1/60s steps so that stateful behaviours see a plausible history; the step count is capped at 20 and the step size grows to cover longer jumps. The camera is forced running for the scrub and its previous running state is restored afterwards.
   * @param {Number} time Target local elapsed time in seconds; may be negative
   */
  @be.mapMethodAndWrap()
  @meta.adapted
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
  @blue.method
  @meta.implemented
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
  @be.mapMethodAndWrap()
  @meta.adapted
  UpdateExternal(position, pointOfInterest, fov, roll)
  {
    vec3.copy(this.position, position);
    vec3.copy(this.pointOfInterest, pointOfInterest);
    this.fov = fov;
    this.roll = roll;
  }

  /** Returns the camera name used to look it up in the camera system. */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the camera name, coercing the argument to a string. */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Returns the timeline length in seconds that behaviours divide local elapsed
   * time by to get their normalized curve time.
   */
  @blue.method
  @meta.implemented
  GetAnimationTimelineLength()
  {
    return this.animationTimelineLength;
  }

  /**
   * Sets the timeline length in seconds; a length of zero makes behaviours treat
   * their normalized time as zero.
   */
  @blue.method
  @meta.implemented
  SetAnimationTimelineLength(value)
  {
    this.animationTimelineLength = value;
  }

  /** Returns the vertical field of view in radians. */
  @blue.method
  @meta.implemented
  GetFov()
  {
    return this.fov;
  }

  /**
   * Sets the vertical field of view in radians; field-of-view behaviours
   * overwrite it on the next update.
   */
  @blue.method
  @meta.implemented
  SetFov(value)
  {
    this.fov = value;
  }

  /** Returns the roll about the view axis in degrees. */
  @blue.method
  @meta.implemented
  GetRoll()
  {
    return this.roll;
  }

  /**
   * Sets the roll about the view axis in degrees; roll behaviours overwrite it
   * on the next update.
   */
  @blue.method
  @meta.implemented
  SetRoll(value)
  {
    this.roll = value;
  }

  /** Copies the world-space camera position into out. */
  @blue.method
  @meta.adapted
  GetPosition(out = vec3.create())
  {
    return vec3.copy(out, this.position);
  }

  /**
   * Copies a world-space position into the camera, preserving the identity of
   * the backing vector.
   */
  @blue.method
  @meta.adapted
  SetPosition(value)
  {
    vec3.copy(this.position, value);
  }

  /** Copies the world-space point the camera looks at into out. */
  @blue.method
  @meta.adapted
  GetPointOfInterest(out = vec3.create())
  {
    return vec3.copy(out, this.pointOfInterest);
  }

  /**
   * Copies a world-space look-at point into the camera, preserving the identity
   * of the backing vector.
   */
  @blue.method
  @meta.adapted
  SetPointOfInterest(value)
  {
    vec3.copy(this.pointOfInterest, value);
  }

  /**
   * Appends a vector3 behaviour whose returned offset is accumulated into the
   * camera position, starting from the position anchor centre.
   */
  @blue.method
  @meta.implemented
  AddPositionBehaviour(behaviour)
  {
    this.positionBehaviours.push(behaviour);
  }

  /**
   * Appends a vector3 behaviour whose returned offset is accumulated into the
   * point of interest, starting from the point-of-interest anchor centre.
   */
  @blue.method
  @meta.implemented
  AddPointOfInterestBehaviour(behaviour)
  {
    this.pointOfInterestBehaviours.push(behaviour);
  }

  /**
   * Appends a float behaviour whose returned delta is accumulated into the field
   * of view, which restarts from 1 radian each update.
   */
  @blue.method
  @meta.implemented
  AddFOVBehaviour(behaviour)
  {
    this.fovBehaviours.push(behaviour);
  }

  /**
   * Appends a float behaviour whose returned delta is accumulated into the roll,
   * which restarts from 0 degrees each update.
   */
  @blue.method
  @meta.implemented
  AddRollBehaviour(behaviour)
  {
    this.rollBehaviours.push(behaviour);
  }

  /**
   * Adds each active behaviour's returned offset into value in list order, so
   * later behaviours see the running result of the earlier ones together with
   * the anchor centre, radius and forward direction.
   */
  static _applyVectorBehaviours(behaviours, camera, value, deltaTime, localTime, anchorCenter, anchorRadius, anchorForward)
  {
    for (const behaviour of behaviours)
    {
      if (behaviour.IsActive())
      {
        vec3.add(value, value, behaviour.Update(camera, value, deltaTime, localTime, anchorCenter, anchorRadius, anchorForward));
      }
    }
  }

  /**
   * Returns value with each active behaviour's returned delta added in list
   * order; a non-numeric result counts as zero.
   */
  static _applyFloatBehaviours(behaviours, camera, value, deltaTime, localTime, anchorCenter, anchorRadius, anchorForward)
  {
    for (const behaviour of behaviours)
    {
      if (behaviour.IsActive())
      {
        value += behaviour.Update(camera, value, deltaTime, localTime, anchorCenter, anchorRadius, anchorForward);
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
  static _updateAnchorState(camera, prefix)
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
    // GetCenterOfAnchors: the mean model centre, summed in double precision.
    // vec3_0: one anchor's model centre; vec4_0: its bounding sphere.
    const { vec3_0, vec4_0 } = EveVirtualCamera.scratch;
    let x = 0, y = 0, z = 0;
    for (const anchor of anchors)
    {
      anchor.GetModelCenterWorldPosition(vec3_0);
      x += vec3_0[0];
      y += vec3_0[1];
      z += vec3_0[2];
    }
    vec3.set(center, x / anchors.length, y / anchors.length, z / anchors.length);
    vec3.set(forward, 0, 0, 1);
    // GetAnchorsBoundingSphereRadius: only anchors with a valid sphere count; none gives 1000.
    let radius = 0;
    for (const anchor of anchors)
    {
      if (anchor.GetBoundingSphere(vec4_0))
      {
        anchor.GetModelCenterWorldPosition(vec3_0);
        radius = Math.max(radius, vec3.distance(vec3_0, center) + vec4_0[3]);
      }
    }
    camera[`${prefix}AnchorRadius`] = radius === 0 ? 1000 : radius;
  }

  static scratch = { vec3_0: vec3.create(), vec4_0: vec4.create() };
}
