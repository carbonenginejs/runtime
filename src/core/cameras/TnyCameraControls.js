import { CjsSchema, meta } from "#schema";
import { mat4 } from "#math/mat4";
import { TnyInputMan } from "#input";
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

/** Shared viewport interaction policy around Carbon's EveCamera motion and projection. */
export class TnyCameraControls
{
  _input = null;
  _consumer = null;
  _gesture = null;

  /** Whether the current gesture has moved far enough to capture the pointer. */
  _gestureCaptured = false;

  /** Pointer travel, in backing pixels, since the gesture's press. */
  _gestureTravel = 0;

  /** How far a press may travel and still be a click (TnyTransformGizmo.CLICK_SLOP uses the same 4). */
  static CLICK_SLOP = 4;
  _held = new Map();
  _keyBindings = null;
  _projection = mat4.create();
  _listeners = new Set();
  _initial = null;
  _framedOnce = false;
  _pendingFrame = false;
  _viewportWidth = 0;
  _viewportHeight = 0;

  /** The camera's near clip when the controls were made: framing never lowers it below this. */
  _baseFrontClip = 1;

  /** An eased flight to a framing pose, advanced by Update, or null. */
  _flight = null;

  /** Borrows a camera; viewport and world-space sphere providers enable pan and framing. */
  constructor({ camera, getViewport = null, getBounds = null, preferences = {}, keyBindings = {} } = {})
  {
    if (!camera) throw new TypeError("Camera controls require a camera.");
    this.camera = camera;
    this.getViewport = getViewport;
    this.getBounds = getBounds;
    this.preferences = {
      orbitButton: 0, panButton: 1, invertX: true, invertY: true,
      orbitSensitivity: 0.1, panSensitivity: 1, dollySensitivity: 0.0015, fovSensitivity: 0.001,
      minFieldOfView: 5 * Math.PI / 180, maxFieldOfView: 120 * Math.PI / 180, frameMargin: 1.1,
      // Farthest wheel/key zoom, in metres: past any solar system (~670 AU).
      maxDistance: 1e14,
      // Seconds a fly-to (KeyD) takes.
      flyDuration: 1.5,
      ...preferences
    };
    this.SetKeyBindings(keyBindings);
    this._initial = this.GetPose();
    this._baseFrontClip = camera.frontClip;
  }

  /** Registers below gizmos, sharing one input route and one bounded frame clock. */
  Install(input, priority = 0)
  {
    this.Uninstall();
    this._input = input;
    this._consumer = input.Register({ priority, handle: event => this.HandleInput(event),
      preview: event => this.#KeyAction(event) !== null, update: dt => this.Update(dt), cancel: () => this.Cancel() });
    return this;
  }

  /** Stops routing and held motion without destroying the borrowed camera. */
  Uninstall()
  {
    if (this._input) this._input.Unregister(this._consumer);
    this._input = this._consumer = null;
    this.Cancel();
  }

  /** Applies key-code or Shift+key-code overrides; null unbinds, no arguments resets defaults. */
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

  /** Returns detached bindings for the host's settings UI and persistence. */
  GetKeyBindings()
  {
    return { ...this._keyBindings };
  }

  /** Applies queued pointer gestures or records focused held-key actions. */
  HandleInput(event)
  {
    const result = TnyInputMan.Result;
    if (event.type === "keyup" && this._held.delete(event.code)) return result.CONSUME;
    const action = this.#KeyAction(event);
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
      if (event.button === this.preferences.panButton || event.button === this.preferences.orbitButton && event.shift)
        this._gesture = "pan";
      else if (event.button === this.preferences.orbitButton) this._gesture = "orbit";
      else return result.PASS;
      // Not captured yet: a press that never moves is a click, and the release
      // must reach the other consumers (the gizmo selects on it). The gesture
      // captures once the pointer travels further than CLICK_SLOP.
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
        if (this._gestureTravel <= TnyCameraControls.CLICK_SLOP) return result.HANDLED;
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

  /** Advances held input only; the host calls EveCamera.Update exactly once per frame. */
  Update(dt)
  {
    dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;
    if (this._flight) this.#Fly(dt);
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

  /** Sends pointer motion to Carbon's existing orbit spring, with configurable inversion. */
  Orbit(dx, dy)
  {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    this._flight = null;
    const settings = this.preferences;
    this.camera.OrbitParent(dx * settings.orbitSensitivity * (settings.invertX ? -1 : 1),
      dy * settings.orbitSensitivity * (settings.invertY ? 1 : -1));
  }

  /** Moves the point of interest in the native camera's right/up basis at the current projection scale. */
  Pan(dx, dy)
  {
    const view = this.#Project(), camera = this.camera;
    if (!view || !Number.isFinite(dx) || !Number.isFinite(dy)) return false;
    this._flight = null;
    const x = -dx * this.preferences.panSensitivity * 2 * camera.translationFromParent / (this._projection[0] * view.width);
    const y = dy * this.preferences.panSensitivity * 2 * camera.translationFromParent / (this._projection[5] * view.height);
    camera.useExtraTranslation = true;
    for (let axis = 0; axis < 3; axis++) camera.extraTranslation[axis] += camera.rightVec[axis] * x + camera.upVec[axis] * y;
    this.#Changed();
    return true;
  }

  /**
   * Exponential wheel zoom with bounds-aware limits, applied through native
   * Dolly. Zooming out stops at preferences.maxDistance and pushes the far clip
   * out to keep the bounds in view, as Frame does; it is not capped by the far
   * clip, which left a large selection (whose 1% floor passes the far clip) or
   * a far-away body unreachable.
   */
  Dolly(delta)
  {
    if (!Number.isFinite(delta)) return;
    this._flight = null;
    const camera = this.camera, radius = Math.max(0.001, this.getBounds ? this.getBounds().radius : 0);
    const minimum = Math.max(1, camera.frontClip, radius * 0.01), maximum = Math.max(minimum, this.preferences.maxDistance);
    // Seed multiplicative zoom from a usable distance, including poses edited to zero.
    // Match EveCamera.Update's floor so the next frame cannot erase outward motion.
    const start = Math.max(minimum, camera.translationFromParent);
    const distance = Math.min(maximum, Math.max(minimum,
      start * Math.exp(Math.max(-20, Math.min(20, delta * this.preferences.dollySensitivity)))));
    camera.backClip = Math.max(camera.backClip, (distance + radius) * 1.05);
    camera.Dolly(distance - camera.translationFromParent);
    this.#Changed();
  }

  /** Selects manual FOV in radians; disabling the zoom curve prevents the native update overwriting it. */
  SetFieldOfView(radians)
  {
    if (!Number.isFinite(radians)) throw new RangeError("Field of view must be finite radians.");
    this.camera.zoomCurve = null;
    this.camera.fieldOfView = Math.min(this.preferences.maxFieldOfView, Math.max(this.preferences.minFieldOfView, radians));
    this.#Changed();
    return this.camera.fieldOfView;
  }

  /** Converts wheel or key motion to a manual FOV change. */
  AdjustFieldOfView(delta)
  {
    return this.SetFieldOfView(this.camera.fieldOfView + delta * this.preferences.fovSensitivity);
  }

  /** Captures a detached pose for reset, host persistence and UI updates. */
  GetPose()
  {
    const camera = this.camera;
    return { yaw: camera.yaw, pitch: camera.pitch, distance: camera.translationFromParent,
      center: Array.from(camera.extraTranslation), fieldOfView: camera.fieldOfView,
      frontClip: camera.frontClip, backClip: camera.backClip };
  }

  /** Restores an explicit pose through native SetOrbit and complete camera fields. */
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
    if (pose.backClip > camera.frontClip) camera.backClip = pose.backClip;
    this.SetFieldOfView(pose.fieldOfView);
  }

  /** Fits optional world box corners, otherwise the provider's sphere, to the projection, at once. */
  Frame()
  {
    const target = this.#FrameTarget();
    if (!target) return false;
    this.Cancel();
    this.#ApplyFrame(target);
    return true;
  }

  /**
   * Flies to the pose Frame would set: the orbit angles stay, and the point of
   * interest and distance ease there over preferences.flyDuration seconds
   * (distance in log space, so a thousandfold change reads evenly), with zero
   * velocity, acceleration and jerk at both ends, as skindr's Universe flights
   * ease. Orbit, pan, zoom or Cancel stops it where it is.
   */
  Fly()
  {
    const target = this.#FrameTarget();
    if (!target) return false;
    this.Cancel();
    const camera = this.camera, duration = Math.max(0, this.preferences.flyDuration);
    if (!duration) { this.#ApplyFrame(target); return true; }
    camera.zoomCurve = null;
    // The far clip covers the whole flight from the start.
    camera.backClip = Math.max(camera.backClip, (Math.max(target.distance, camera.translationFromParent) + target.radius) * 1.05);
    this._flight = { target, time: 0, duration, distance: Math.max(1e-3, camera.translationFromParent),
      centre: camera.useExtraTranslation ? Array.from(camera.extraTranslation) : [ 0, 0, 0 ] };
    return true;
  }

  /** The pose Frame fits to the bounds, or null when the bounds or viewport are not ready. */
  #FrameTarget()
  {
    if (!this.getBounds) return null;
    const view = this.#Project();
    if (!view) { this._pendingFrame = true; return null; }
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
   * Sets a framing pose. The near clip follows the target's size, a
   * thousandth of its radius but never below the camera's starting near clip,
   * as skindr sizes it per body, so a planet keeps depth precision when the
   * far clip reaches past it.
   */
  #ApplyFrame({ distance, radius, centre, view })
  {
    const camera = this.camera;
    camera.zoomCurve = null;
    camera.frontClip = Math.max(this._baseFrontClip, radius / 1000);
    camera.backClip = Math.max(camera.backClip, (distance + radius) * 1.05);
    camera.translationFromParent = distance;
    camera.useExtraTranslation = true;
    camera.extraTranslation.set(centre);
    this._flight = null;
    this._viewportWidth = view.width;
    this._viewportHeight = view.height;
    this._pendingFrame = false;
    if (!this._framedOnce) { this._initial = this.GetPose(); this._framedOnce = true; }
    this.#Changed();
  }

  /** Advances a flight by dt seconds, landing exactly on its framing pose. */
  #Fly(dt)
  {
    const flight = this._flight, camera = this.camera;
    flight.time = Math.min(flight.duration, flight.time + dt);
    const t = flight.time / flight.duration;
    if (t >= 1) { this.#ApplyFrame(flight.target); return; }
    const eased = t * t * t * t * (35 + t * (-84 + t * (70 - 20 * t)));
    camera.translationFromParent = flight.distance * Math.pow(flight.target.distance / flight.distance, eased);
    camera.useExtraTranslation = true;
    for (let axis = 0; axis < 3; axis++) camera.extraTranslation[axis] = flight.centre[axis] + (flight.target.centre[axis] - flight.centre[axis]) * eased;
    this.#Changed();
  }

  /** Records viewport size without changing the pose; completes explicitly deferred zero-size fits. */
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

  /** Restores the initial pose, or the first successful framing pose. */
  Reset()
  {
    this.Cancel();
    this.SetPose(this._initial);
  }

  /** Cancels old motion and optionally frames a newly selected target. */
  TargetChanged(reframe = true)
  {
    this.Cancel();
    if (reframe) this.Frame();
  }

  /** Registers a pose observer and returns its explicit removal callback. */
  Subscribe(listener)
  {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /** Clears held gestures and resets Carbon's spring target on cancellation. */
  Cancel()
  {
    this._gesture = null;
    this._flight = null;
    this._gestureCaptured = false;
    this._held.clear();
    this.camera.SetOrbit(this.camera.yaw, this.camera.pitch);
  }

  /** Releases routing and observers; the borrowed camera remains host-owned. */
  Destroy()
  {
    this.Uninstall();
    this._listeners.clear();
  }

  /** Resolves unmodified or Shift-modified keyboard actions without mutating browser dispatch. */
  #KeyAction(event)
  {
    if ((event.type !== "keydown" && event.type !== "keyup") || event.ctrl || event.alt || event.meta || event.isComposing) return null;
    const chord = `${event.shift ? "Shift+" : ""}${event.code}`;
    return Object.keys(this._keyBindings).find(action => this._keyBindings[action] === chord) ?? null;
  }

  /** Derives the native projection; callers provide viewport dimensions in the same units as pointer deltas. */
  #Project()
  {
    if (!this.getViewport) return null;
    const view = this.getViewport(), camera = this.camera;
    if (!(view.width > 0 && view.height > 0)) return null;
    EveCamera.CalculateProjectionMatrix(this._projection, view.width / view.height, camera.fieldOfView,
      camera.centerOffset, 0, camera.frontClip, camera.backClip);
    return view;
  }

  /** Publishes pose changes caused by these controls; native camera updates stay host-owned. */
  #Changed()
  {
    const pose = this.GetPose();
    for (const listener of this._listeners) listener(pose);
  }
}

CjsSchema.define(TnyCameraControls, { className: "TnyCameraControls",
  methods: Object.fromEntries(["Install", "Uninstall", "SetKeyBindings", "GetKeyBindings", "HandleInput", "Update",
    "Orbit", "Pan", "Dolly", "SetFieldOfView", "AdjustFieldOfView", "GetPose", "SetPose", "Frame", "Resize", "Reset",
    "TargetChanged", "Subscribe", "Cancel", "Destroy"].map(name => [name, [meta.ours]])) });
