import { CjsGraph } from "../../global/model/graph/CjsGraph.js";
import { CjsSchema, meta } from "#schema";
import { mat4 } from "#math/mat4";
import { TnyInputMan } from "../input/TnyInputMan.js";
import { EveCamera } from "../../trinity/eve/camera/EveCamera.js";

const DEFAULT_KEYS = {
  orbitLeft: "ArrowLeft", orbitRight: "ArrowRight", orbitUp: "ArrowUp", orbitDown: "ArrowDown",
  panLeft: "Shift+ArrowLeft", panRight: "Shift+ArrowRight", panUp: "Shift+ArrowUp", panDown: "Shift+ArrowDown",
  dollyIn: "Equal", dollyOut: "Minus", fovDown: "BracketLeft", fovUp: "BracketRight",
  frame: "KeyF", fly: "KeyD", reset: "Home"
};
const MOTION = {
  orbitLeft: [-1, 0], orbitRight: [1, 0], orbitUp: [0, -1], orbitDown: [0, 1],
  panLeft: [-1, 0], panRight: [1, 0], panUp: [0, -1], panDown: [0, 1]
};

/**
 * Shared viewport interaction policy around Carbon's EveCamera motion and projection.
 * @cjs
 */
export class TnyCameraControls
{

  /**
   * The borrowed camera; set by the constructor, which requires one.
   * @type {EveCamera|null}
   * @cjs
   */
  camera = null;

  /**
   * Returns the viewport size for panning and framing, or null.
   * @type {Function|null}
   * @cjs
   */
  getViewport = null;

  /**
   * Returns the world-space bounding sphere for framing, or null.
   * @type {Function|null}
   * @cjs
   */
  getBounds = null;

  /**
   * Interaction preferences: the constructor's defaults merged with the
   * caller's overrides.
   * @type {Object<string, *>}
   * @cjs
   */
  preferences = {};

  /**
   * Borrowed input router while installed.
   * @type {TnyInputMan|null}
   * @cjs
   */
  _input = null;

  /**
   * Registration handle owned by this input consumer.
   * @type {object|null}
   * @cjs
   */
  _consumer = null;

  /**
   * Current pointer gesture, or null while idle.
   * @type {string|null}
   * @cjs
   */
  _gesture = null;

  /**
   * Whether the current gesture has moved far enough to capture the pointer.
   * @type {boolean}
   * @cjs
   */
  _gestureCaptured = false;

  /**
   * Pointer travel, in backing pixels, since the gesture's press.
   * @type {number}
   * @cjs
   */
  _gestureTravel = 0;

  /**
   * Held key codes mapped to motion actions.
   * @type {Map<string, string>}
   * @cjs
   */
  _held = new Map();

  /**
   * Validated key bindings for the current interaction policy.
   * @type {object|null}
   * @cjs
   */
  _keyBindings = null;

  /**
   * Owned projection scratch used by panning and framing.
   * @type {Float32Array}
   * @cjs
   */
  _projection = mat4.create();

  /**
   * Pose observers, in registration order.
   * @type {Set<Function>}
   * @cjs
   */
  _listeners = new Set();

  /**
   * Reset pose captured at construction or the first successful frame.
   * @type {object|null}
   * @cjs
   */
  _initial = null;

  /**
   * Whether the first successful framing pose has replaced the initial pose.
   * @type {boolean}
   * @cjs
   */
  _framedOnce = false;

  /**
   * A zero-size fit remains pending only until newer camera input or cancellation.
   * @type {boolean}
   * @cjs
   */
  _pendingFrame = false;

  /**
   * Last accepted viewport width in backing pixels.
   * @type {number}
   * @cjs
   */
  _viewportWidth = 0;

  /**
   * Last accepted viewport height in backing pixels.
   * @type {number}
   * @cjs
   */
  _viewportHeight = 0;

  /**
   * The far clip a zoom never fits below: the camera's own, or a restored pose's.
   * @type {number}
   * @cjs
   */
  _baseBackClip = 0;

  /**
   * An eased flight to a framing pose, advanced by Update, or null.
   * @type {object|null}
   * @cjs
   */
  _flight = null;

  /**
   * Borrows a camera; viewport and world-space sphere providers enable pan and framing.
   * @param {object} [options] Options for this operation.
   * @param {EveCamera} options.camera Borrowed camera.
   * @param {Function|null} [options.getViewport] Returns backing-pixel width and height.
   * @param {Function|null} [options.getBounds] Returns centre, radius and optional world-box corners.
   * @param {object} [options.preferences] Overrides interaction defaults.
   * @param {object} [options.keyBindings] Overrides keyboard actions.
   * @cjs
   */
  constructor({ camera, getViewport = null, getBounds = null, preferences = {}, keyBindings = {} } = {})
  {
    if (!camera) throw new TypeError("Camera controls require a camera.");
    this.camera = camera;
    this.getViewport = getViewport;
    this.getBounds = getBounds;
    this.preferences = {
      orbitButton: 0, panButton: [ 1, 2 ], invertX: true, invertY: true,
      orbitSensitivity: 0.1, panSensitivity: 1, dollySensitivity: 0.0015, fovSensitivity: 0.001,
      minFieldOfView: 5 * Math.PI / 180, maxFieldOfView: 120 * Math.PI / 180, frameMargin: 1.1,
      // Farthest wheel/key zoom, in metres: past any solar system (~670 AU).
      maxDistance: 1e14,
      // Null retains bounds-aware spacing; zero permits unrestricted close-ups.
      minDistance: null,
      // Seconds a fly-to (KeyD) takes.
      flyDuration: 1.5,
      ...preferences
    };
    if (this.preferences.minDistance !== null && (!Number.isFinite(this.preferences.minDistance) || this.preferences.minDistance < 0)) throw new RangeError("Minimum camera distance must be null or a nonnegative finite number.");
    this.SetKeyBindings(keyBindings);
    this._baseBackClip = camera.backClip;
    this._initial = this.GetPose();
  }

  /**
   * Sets the far clip to cover `reach` metres from the eye, but never below the
   * base far clip (the camera's own, or a pose's). It shrinks again as well as
   * grows: a far clip left at an earlier zoom-out (10^13 m against a 5 m near
   * clip) leaves depth no precision, and SSAO then darkens every hull.
   *
   * @param {number} reach Metres the far clip must reach.
   * @cjs
   */
  _FitBackClip(reach)
  {
    this.camera.backClip = Math.max(this._baseBackClip, reach * 1.05);
  }

  /**
   * Registers below gizmos, sharing one input route and one bounded frame clock.
   * @param {TnyInputMan} input Borrowed shared input router.
   * @param {number} [priority] Dispatch priority; larger values run first.
   * @returns {this}
   * @cjs
   */
  Install(input, priority = 0)
  {
    this.Uninstall();
    this._input = input;
    this._consumer = input.Register({ priority, handle: event => this.HandleInput(event),
      preview: event => this._KeyAction(event) !== null, update: dt => this.Update(dt), cancel: () => this.Cancel() });
    return this;
  }

  /**
   * Stops routing and held motion without destroying the borrowed camera.
   * @cjs
   */
  Uninstall()
  {
    if (this._input) this._input.Unregister(this._consumer);
    this._input = this._consumer = null;
    this.Cancel();
  }

  /**
   * Applies key-code or Shift+key-code overrides; null unbinds, no arguments resets defaults.
   * @param {object} [bindings] Key binding overrides; null values unbind actions.
   * @returns {this}
   * @cjs
   */
  SetKeyBindings(bindings = {})
  {
    const next = { ...DEFAULT_KEYS, ...bindings }, used = new Set();
    for (const [action, chord] of Object.entries(next))
    {
      if (!Object.hasOwn(DEFAULT_KEYS, action)) throw new TypeError("Unknown camera binding action.");
      if (chord === null) continue;
      if (typeof chord !== "string" || !/^(?:Shift\+)?[A-Za-z][A-Za-z0-9]*$/.test(chord) || chord.endsWith("Escape"))
        throw new TypeError("Camera bindings require a key code, optionally prefixed with Shift+, or null.");
      if (used.has(chord)) throw new RangeError("Camera bindings must be distinct.");
      used.add(chord);
    }
    this._keyBindings = next;
    this._held.clear();
    return this;
  }

  /**
   * Returns detached bindings for the host's settings UI and persistence.
   * @returns {object}
   * @cjs
   */
  GetKeyBindings()
  {
    return { ...this._keyBindings };
  }

  /**
   * Applies queued pointer gestures or records focused held-key actions.
   * @param {object} event Normalized input event.
   * @returns {number}
   * @cjs
   */
  HandleInput(event)
  {
    const result = TnyInputMan.Result;
    if (event.type === "keyup" && this._held.delete(event.code)) return result.CONSUME;
    const action = this._KeyAction(event);
    if (action)
    {
      if (event.type === "keydown" && !event.repeat)
      {
        if (action === "frame" || action === "fly" || action === "reset")
        {
          if (this._input) this._input.Cancel("camera-pose-changed");
          else this.Cancel();
          if (action === "frame") this.Frame();
          else if (action === "fly") this.Fly();
          else this.Reset();
        }
        else this._held.set(event.code, action);
      }
      return result.CONSUME;
    }
    if ((event.type === "pointerdown" || event.type === "wheel") && (event.ctrl || event.alt || event.meta)) return result.PASS;
    if (event.type === "pointerdown")
    {
      if ([].concat(this.preferences.panButton).includes(event.button) || event.button === this.preferences.orbitButton && event.shift)
        this._gesture = "pan";
      else if (event.button === this.preferences.orbitButton) this._gesture = "orbit";
      else return result.PASS;
      // Not captured yet: a press that never moves is a click, and the release
      // must reach the other consumers (the gizmo selects on it). The gesture
      // captures once the pointer travels further than clickSlop.
      this._gestureCaptured = false;
      this._gestureTravel = 0;
      return result.HANDLED;
    }
    if (event.type === "pointermove" && this._gesture)
    {
      let starting = false;
      if (!this._gestureCaptured)
      {
        // No button held: the press ended under another consumer's capture.
        if (event.buttons === 0)
        {
          this._gesture = null;
          return result.PASS;
        }
        this._gestureTravel += Math.abs(event.dx ?? 0) + Math.abs(event.dy ?? 0);
        if (this._gestureTravel <= TnyCameraControls.clickSlop) return result.HANDLED;
        this._gestureCaptured = true;
        starting = true;
      }
      if (this._gesture === "pan") this.Pan(event.dx, event.dy);
      else this.Orbit(event.dx, event.dy);
      return starting ? result.CAPTURE : result.CONSUME;
    }
    if (event.type === "pointerup" && this._gesture)
    {
      const captured = this._gestureCaptured;
      this._gesture = null;
      this._gestureCaptured = false;
      return captured ? result.RELEASE : result.PASS;
    }
    if (event.type === "wheel")
    {
      if (event.shift) this.AdjustFieldOfView(event.wheel);
      else this.Dolly(event.wheel);
      return result.CONSUME;
    }
    return result.PASS;
  }

  /**
   * Advances held input only; the host calls EveCamera.Update exactly once per frame.
   * @param {number} dt Elapsed time in seconds.
   * @cjs
   */
  Update(dt)
  {
    dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;
    if (this._flight) this._Fly(dt);
    for (const action of this._held.values())
    {
      const motion = MOTION[action];
      if (motion)
      {
        if (action.startsWith("pan")) this.Pan(motion[0] * 300 * dt, motion[1] * 300 * dt);
        else this.Orbit(motion[0] * 300 * dt, motion[1] * 300 * dt);
      }
      else if (action === "dollyIn" || action === "dollyOut") this.Dolly((action === "dollyIn" ? -500 : 500) * dt);
      else this.AdjustFieldOfView((action === "fovDown" ? -400 : 400) * dt);
    }
  }

  /**
   * Sends pointer motion to Carbon's existing orbit spring, with configurable inversion.
   * @param {number} dx Horizontal movement in backing pixels.
   * @param {number} dy Vertical movement in backing pixels.
   * @cjs
   */
  Orbit(dx, dy)
  {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    this._flight = null;
    this._pendingFrame = false;
    const settings = this.preferences;
    this.camera.OrbitParent(dx * settings.orbitSensitivity * (settings.invertX ? -1 : 1),
      dy * settings.orbitSensitivity * (settings.invertY ? 1 : -1));
  }

  /**
   * Moves the point of interest in the native camera's right/up basis at the current projection scale.
   * @param {number} dx Horizontal movement in backing pixels.
   * @param {number} dy Vertical movement in backing pixels.
   * @returns {boolean}
   * @cjs
   */
  Pan(dx, dy)
  {
    const view = this._Project(), camera = this.camera;
    if (!view || !Number.isFinite(dx) || !Number.isFinite(dy)) return false;
    this._flight = null;
    this._pendingFrame = false;
    const x = -dx * this.preferences.panSensitivity * 2 * camera.translationFromParent / (this._projection[0] * view.width);
    const y = dy * this.preferences.panSensitivity * 2 * camera.translationFromParent / (this._projection[5] * view.height);
    camera.useExtraTranslation = true;
    for (let axis = 0; axis < 3; axis++) camera.extraTranslation[axis] += camera.rightVec[axis] * x + camera.upVec[axis] * y;
    this._Changed();
    return true;
  }

  /**
   * Exponential wheel zoom with bounds-aware limits, applied through native
   * Dolly. Zooming out stops at preferences.maxDistance and pushes the far clip
   * out to keep the bounds in view, as Frame does; it is not capped by the far
   * clip, which left a large selection (whose 1% floor passes the far clip) or
   * a far-away body unreachable. A minDistance override permits close-ups;
   * the camera's own minimumDistance must also allow the requested distance.
   * @param {number} delta Wheel or held-key motion amount.
   * @cjs
   */
  Dolly(delta)
  {
    if (!Number.isFinite(delta)) return;
    this._flight = null;
    this._pendingFrame = false;
    const camera = this.camera, radius = Math.max(0.001, this.getBounds ? this.getBounds().radius : 0);
    const minimum = this.preferences.minDistance ?? Math.max(1, camera.frontClip, radius * 0.01), maximum = Math.max(minimum, this.preferences.maxDistance);
    // Seed multiplicative zoom from a usable distance, including poses edited to zero.
    // A zero policy still needs a positive seed for multiplicative outward motion.
    const start = Math.max(Number.EPSILON, minimum, camera.translationFromParent);
    const distance = Math.min(maximum, Math.max(minimum,
      start * Math.exp(Math.max(-20, Math.min(20, delta * this.preferences.dollySensitivity)))));
    this._FitBackClip(distance + radius);
    camera.Dolly(distance - camera.translationFromParent);
    this._Changed();
  }

  /**
   * Selects manual FOV in radians; disabling the zoom curve prevents the native update overwriting it.
   * @param {number} radians Field of view in radians.
   * @returns {number}
   * @cjs
   */
  SetFieldOfView(radians)
  {
    if (!Number.isFinite(radians)) throw new RangeError("Field of view must be finite radians.");
    this._pendingFrame = false;
    this.camera.zoomCurve = null;
    this.camera.fieldOfView = Math.min(this.preferences.maxFieldOfView, Math.max(this.preferences.minFieldOfView, radians));
    this._Changed();
    return this.camera.fieldOfView;
  }

  /**
   * Converts wheel or key motion to a manual FOV change.
   * @param {number} delta Wheel or held-key motion amount.
   * @returns {number}
   * @cjs
   */
  AdjustFieldOfView(delta)
  {
    return this.SetFieldOfView(this.camera.fieldOfView + delta * this.preferences.fovSensitivity);
  }

  /**
   * Captures a detached pose for reset, host persistence and UI updates. Its
   * far clip is the base one; the far clip a zoom or frame fitted is not kept.
   * @returns {object}
   * @cjs
   */
  GetPose()
  {
    const camera = this.camera;
    return { yaw: camera.yaw, pitch: camera.pitch, distance: camera.translationFromParent,
      center: Array.from(camera.extraTranslation), fieldOfView: camera.fieldOfView,
      frontClip: camera.frontClip, backClip: this._baseBackClip };
  }

  /**
   * Restores an explicit pose through native SetOrbit and complete camera fields.
   * @param {object} pose Detached camera pose with position, orbit and clipping values.
   * @cjs
   */
  SetPose(pose)
  {
    if (pose.center.length !== 3 || ![pose.yaw, pose.pitch, pose.distance, pose.fieldOfView, ...pose.center].every(Number.isFinite)
      || pose.distance <= 0) throw new RangeError("Camera pose must be finite with positive distance.");
    const camera = this.camera;
    camera.SetOrbit(pose.yaw, pose.pitch);
    camera.translationFromParent = pose.distance;
    camera.useExtraTranslation = true;
    camera.extraTranslation.set(pose.center);
    if (pose.frontClip > 0) camera.frontClip = pose.frontClip;
    if (pose.backClip > camera.frontClip) this._baseBackClip = pose.backClip;
    this._FitBackClip(pose.distance);
    this.SetFieldOfView(pose.fieldOfView);
  }

  /**
   * Puts the eye at a world point, looking at a centre, at once. EveCamera
   * places its eye at the centre plus (cos p sin y, -sin p, cos p cos y) times
   * its distance (fromYawPitchRollCarbon with roll 0), so the angles follow
   * from the direction.
   *
   * @param {number[]} eye The eye's world position.
   * @param {number[]} centre The point looked at.
   * @cjs
   */
  LookFrom(eye, centre)
  {
    const d = [ eye[0] - centre[0], eye[1] - centre[1], eye[2] - centre[2] ];
    const distance = Math.hypot(d[0], d[1], d[2]);
    if (!(distance > 0)) throw new RangeError("LookFrom needs an eye away from the centre.");
    this.Cancel();
    this.SetPose({ yaw: Math.atan2(d[0], d[2]), pitch: -Math.asin(d[1] / distance), distance, center: Array.from(centre),
      fieldOfView: this.camera.fieldOfView, frontClip: this.camera.frontClip, backClip: this._baseBackClip });
  }

  /**
   * Fits optional world box corners, otherwise the provider's sphere, to the projection, at once.
   * @returns {boolean}
   * @cjs
   */
  Frame()
  {
    const target = this._FrameTarget();
    if (!target) return false;
    this.Cancel();
    this._ApplyFrame(target);
    return true;
  }

  /**
   * Flies to the pose Frame would set over preferences.flyDuration seconds,
   * with zero velocity, acceleration and jerk at both ends, as skindr's
   * Universe flights ease. The orbit angles stay. The eye's offset from the
   * target eases along an arc, its length in log space (so a thousandfold
   * change reads evenly), and the orbit distance eases in log space too; the
   * point of interest follows from both. The eye's distance from the target so
   * stays between its start and end values, so the flight never passes
   * through the target and the far clip set at the start covers it. Orbit,
   * pan, zoom or Cancel stops it where it is.
   * @returns {boolean}
   * @cjs
   */
  Fly()
  {
    const target = this._FrameTarget();
    if (!target) return false;
    this.Cancel();
    const camera = this.camera, duration = Math.max(0, this.preferences.flyDuration);
    if (!duration)
    {
      this._ApplyFrame(target);
      return true;
    }
    camera.zoomCurve = null;
    // The view's back axis in world space, the eye's direction from the point of interest.
    const matrix = camera.viewMatrix.transform, back = [ matrix[2], matrix[6], matrix[10] ];
    const backLength = Math.hypot(...back);
    if (!(backLength > 0))
    {
      this._ApplyFrame(target);
      return true;
    }
    for (let axis = 0; axis < 3; axis++) back[axis] /= backLength;
    const distance = Math.max(1e-3, camera.translationFromParent);
    const centre = camera.useExtraTranslation ? Array.from(camera.extraTranslation) : [ 0, 0, 0 ];
    const offset = [ 0, 1, 2 ].map(axis => centre[axis] + back[axis] * distance - target.centre[axis]);
    // The eye stays within max(start, end) of the target, so this far clip covers the whole flight.
    this._FitBackClip(Math.max(target.distance, Math.hypot(...offset)) + target.radius);
    this._flight = { target, time: 0, duration, distance, back, offset };
    return true;
  }

  /**
   * The pose Frame fits to the bounds, or null when the bounds or viewport are not ready.
   * @returns {object|null}
   * @cjs
   */
  _FrameTarget()
  {
    if (!this.getBounds) return null;
    const view = this._Project();
    if (!view)
    {
      this._pendingFrame = true;
      return null;
    }
    const bounds = this.getBounds(), projection = this._projection, camera = this.camera;
    if (!(bounds.radius >= 0) || !Number.isFinite(bounds.radius) || bounds.centre.length !== 3
      || !Array.from(bounds.centre).every(Number.isFinite)) throw new RangeError("Cannot frame invalid bounds.");
    const tangent = Math.min((1 - projection[8]) / projection[0], (1 + projection[8]) / projection[0],
      (1 - projection[9]) / projection[5], (1 + projection[9]) / projection[5]);
    if (!(tangent > 0) || !Number.isFinite(tangent)) throw new RangeError("Projection does not contain the camera axis.");
    const radius = Math.max(0.001, bounds.radius) * Math.max(1, this.preferences.frameMargin);
    let distance = Math.max(radius / Math.sin(Math.atan(tangent)), camera.frontClip + radius);
    if (bounds.corners?.length)
    {
      // The editor supplies transformed local-box corners, avoiding both a
      // loose world AABB and the empty space around a long hull's sphere.
      const matrix = camera.viewMatrix.transform, margin = Math.max(1, this.preferences.frameMargin);
      distance = 0.001;
      for (const corner of bounds.corners)
      {
        if (corner.length !== 3 || !Array.from(corner).every(Number.isFinite)) throw new RangeError("Cannot frame invalid corners.");
        const dx = corner[0] - bounds.centre[0], dy = corner[1] - bounds.centre[1], dz = corner[2] - bounds.centre[2];
        const x = matrix[0] * dx + matrix[4] * dy + matrix[8] * dz;
        const y = matrix[1] * dx + matrix[5] * dy + matrix[9] * dz;
        const z = matrix[2] * dx + matrix[6] * dy + matrix[10] * dz;
        distance = Math.max(distance, z + camera.frontClip,
          z + margin * projection[0] * x / (1 + projection[8]),
          z - margin * projection[0] * x / (1 - projection[8]),
          z + margin * projection[5] * y / (1 + projection[9]),
          z - margin * projection[5] * y / (1 - projection[9]));
      }
    }
    return { distance, radius, centre: Array.from(bounds.centre), view };
  }

  /**
   * Sets a framing pose. The near clip is left alone: Carbon's cascaded shadow
   * splits start at the camera's near clip and end at fixed distances
   * (Tr2ShadowMap SplitNr*), so a near clip past the first split leaves a
   * cascade with no depth range.
   * @param {object} options Options for this operation.
   * @cjs
   */
  _ApplyFrame({ distance, radius, centre, view })
  {
    const camera = this.camera;
    camera.zoomCurve = null;
    this._FitBackClip(distance + radius);
    camera.translationFromParent = distance;
    camera.useExtraTranslation = true;
    camera.extraTranslation.set(centre);
    this._flight = null;
    this._viewportWidth = view.width;
    this._viewportHeight = view.height;
    this._pendingFrame = false;
    if (!this._framedOnce)
    {
      this._initial = this.GetPose();
      this._framedOnce = true;
    }
    this._Changed();
  }

  /**
   * Advances a flight by dt seconds, landing exactly on its framing pose.
   * @param {number} dt Elapsed time in seconds.
   * @cjs
   */
  _Fly(dt)
  {
    const flight = this._flight, camera = this.camera;
    flight.time = Math.min(flight.duration, flight.time + dt);
    const t = flight.time / flight.duration;
    if (t >= 1)
    {
      this._ApplyFrame(flight.target);
      return;
    }
    const eased = t * t * t * t * (35 + t * (-84 + t * (70 - 20 * t)));
    const { target, back, offset } = flight;
    const distance = flight.distance * Math.pow(target.distance / flight.distance, eased);

    // The eye's offset from the target: its direction slerps from the start
    // offset to the back axis, its length eases in log space.
    const fromLength = Math.max(1e-3, Math.hypot(...offset));
    const from = offset.map(value => value / fromLength);
    const angle = Math.acos(Math.max(-1, Math.min(1, from[0] * back[0] + from[1] * back[1] + from[2] * back[2])));
    let direction;
    if (angle < 1e-9) direction = from;
    else if (Math.PI - angle < 1e-6)
    {
      // Directly behind: turn about any axis at right angles to it.
      const side = Math.abs(from[1]) < 0.9 ? [ 0, 1, 0 ] : [ 1, 0, 0 ];
      const cross = [ from[1] * side[2] - from[2] * side[1], from[2] * side[0] - from[0] * side[2], from[0] * side[1] - from[1] * side[0] ];
      const crossLength = Math.hypot(...cross);
      direction = from.map((value, axis) => value * Math.cos(angle * eased) + cross[axis] / crossLength * Math.sin(angle * eased));
    }
    else
    {
      const a = Math.sin((1 - eased) * angle) / Math.sin(angle), b = Math.sin(eased * angle) / Math.sin(angle);
      direction = from.map((value, axis) => value * a + back[axis] * b);
    }
    const length = fromLength * Math.pow(target.distance / fromLength, eased);

    camera.translationFromParent = distance;
    camera.useExtraTranslation = true;
    for (let axis = 0; axis < 3; axis++) camera.extraTranslation[axis] = target.centre[axis] + direction[axis] * length - back[axis] * distance;
    this._Changed();
  }

  /**
   * Records viewport size without changing the pose; completes explicitly deferred zero-size fits.
   * @returns {boolean}
   * @cjs
   */
  Resize()
  {
    if (!this.getViewport) return false;
    const view = this.getViewport();
    if (!(view.width > 0 && view.height > 0)) return false;
    if (this._pendingFrame) return this.Frame();
    const changed = view.width !== this._viewportWidth || view.height !== this._viewportHeight;
    this._viewportWidth = view.width;
    this._viewportHeight = view.height;
    return changed;
  }

  /**
   * Restores the initial pose, or the first successful framing pose.
   * @cjs
   */
  Reset()
  {
    this.Cancel();
    this.SetPose(this._initial);
  }

  /**
   * Cancels old motion and optionally frames a newly selected target.
   * @param {boolean} [reframe] Whether to frame the new target after cancellation.
   * @cjs
   */
  TargetChanged(reframe = true)
  {
    this.Cancel();
    if (reframe) this.Frame();
  }

  /**
   * Registers a pose observer and returns its explicit removal callback.
   * @param {Function} listener Pose observer receiving an owned pose snapshot.
   * @returns {Function}
   * @cjs
   */
  Subscribe(listener)
  {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Clears held gestures and resets Carbon's spring target on cancellation.
   * @cjs
   */
  Cancel()
  {
    this._gesture = null;
    this._flight = null;
    this._pendingFrame = false;
    this._gestureCaptured = false;
    this._held.clear();
    this.camera.SetOrbit(this.camera.yaw, this.camera.pitch);
  }

  /**
   * Ends this object, once: its OnDestruct, then its destructors.
   * @cjs Thin public entry; this class does not extend the graph root.
   * @param {*} [options] Handed to OnDestruct unchanged.
   * @returns {boolean} True if it ran; false on a second call.
   */
  Destruct(options)
  {
    return CjsGraph.destruct(this, options);
  }

  /**
   * Releases routing and observers; the borrowed camera remains host-owned.
   *
   * @cjs Preserves this browser/wrapper owner's existing cleanup through graph lifetime dispatch.
   * @cjs
   * @returns {boolean} True: nothing here refuses.
   */
  OnDestruct()
  {
    this.Uninstall();
    this._listeners.clear();
    return true;
  }

  /**
   * Resolves unmodified or Shift-modified keyboard actions without mutating browser dispatch.
   * @param {object} event Normalized input event.
   * @returns {string|null}
   * @cjs
   */
  _KeyAction(event)
  {
    if ((event.type !== "keydown" && event.type !== "keyup") || event.ctrl || event.alt || event.meta || event.isComposing) return null;
    const chord = `${event.shift ? "Shift+" : ""}${event.code}`;
    return Object.keys(this._keyBindings).find(action => this._keyBindings[action] === chord) ?? null;
  }

  /**
   * Derives the native projection; callers provide viewport dimensions in the same units as pointer deltas.
   * @returns {object|null}
   * @cjs
   */
  _Project()
  {
    if (!this.getViewport) return null;
    const view = this.getViewport(), camera = this.camera;
    if (!(view.width > 0 && view.height > 0)) return null;
    EveCamera.CalculateProjectionMatrix(this._projection, view.width / view.height, camera.fieldOfView,
      camera.centerOffset, 0, camera.frontClip, camera.backClip);
    return view;
  }

  /**
   * Publishes pose changes caused by these controls; native camera updates stay host-owned.
   * @cjs
   */
  _Changed()
  {
    const pose = this.GetPose();
    for (const listener of this._listeners) listener(pose);
  }

  /**
   * How far a press may travel and still be a click (TnyTransformGizmo.clickSlop uses the same 4).
   * @type {number}
   * @cjs
   */
  static clickSlop = 4;

  /**
   * Stable identity for diagnostics and registration.
   * @type {string}
   * @cjs
   */
  static className = "TnyCameraControls";

}

CjsSchema.meta.define(TnyCameraControls, {
  className: "TnyCameraControls",
  capabilities: [ "destruct" ],
  methods: Object.fromEntries(["Install", "Uninstall", "SetKeyBindings", "GetKeyBindings", "HandleInput", "Update",
    "Orbit", "Pan", "Dolly", "SetFieldOfView", "AdjustFieldOfView", "GetPose", "SetPose", "Frame", "Resize", "Reset",
    "TargetChanged", "Subscribe", "Cancel", "Destruct"].map(name => [name, []]))
});
