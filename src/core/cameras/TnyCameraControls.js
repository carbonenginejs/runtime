import { CjsSchema, meta } from "#schema";
import { mat4 } from "#math/mat4";
import { TnyInputMan } from "#input";
import { EveCamera } from "../../trinity/eve/camera/EveCamera.js";

const DEFAULT_KEYS = {
  orbitLeft: "ArrowLeft", orbitRight: "ArrowRight", orbitUp: "ArrowUp", orbitDown: "ArrowDown",
  panLeft: "Shift+ArrowLeft", panRight: "Shift+ArrowRight", panUp: "Shift+ArrowUp", panDown: "Shift+ArrowDown",
  dollyIn: "Equal", dollyOut: "Minus", fovDown: "BracketLeft", fovUp: "BracketRight",
  frame: "KeyF", reset: "Home"
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
  _held = new Map();
  _keyBindings = null;
  _projection = mat4.create();
  _listeners = new Set();
  _initial = null;
  _framedOnce = false;
  _pendingFrame = false;
  _viewportWidth = 0;
  _viewportHeight = 0;

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
      ...preferences
    };
    this.SetKeyBindings(keyBindings);
    this._initial = this.GetPose();
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
        if (action === "frame" || action === "reset")
        {
          if (this._input) this._input.Cancel("camera-pose-changed");
          else this.Cancel();
          if (action === "frame") this.Frame();
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
      return result.CAPTURE;
    }
    if (event.type === "pointermove" && this._gesture)
    {
      if (this._gesture === "pan") this.Pan(event.dx, event.dy);
      else this.Orbit(event.dx, event.dy);
      return result.CONSUME;
    }
    if (event.type === "pointerup" && this._gesture)
    {
      this._gesture = null;
      return result.RELEASE;
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
    const settings = this.preferences;
    this.camera.OrbitParent(dx * settings.orbitSensitivity * (settings.invertX ? -1 : 1),
      dy * settings.orbitSensitivity * (settings.invertY ? 1 : -1));
  }

  /** Moves the point of interest in the native camera's right/up basis at the current projection scale. */
  Pan(dx, dy)
  {
    const view = this.#Project(), camera = this.camera;
    if (!view || !Number.isFinite(dx) || !Number.isFinite(dy)) return false;
    const x = -dx * this.preferences.panSensitivity * 2 * camera.translationFromParent / (this._projection[0] * view.width);
    const y = dy * this.preferences.panSensitivity * 2 * camera.translationFromParent / (this._projection[5] * view.height);
    camera.useExtraTranslation = true;
    for (let axis = 0; axis < 3; axis++) camera.extraTranslation[axis] += camera.rightVec[axis] * x + camera.upVec[axis] * y;
    this.#Changed();
    return true;
  }

  /** Exponential wheel zoom with bounds-aware limits, applied through native Dolly. */
  Dolly(delta)
  {
    if (!Number.isFinite(delta)) return;
    const camera = this.camera, radius = Math.max(0.001, this.getBounds ? this.getBounds().radius : 0);
    const minimum = Math.max(0.001, radius * 0.01), maximum = Math.max(minimum, camera.backClip - radius);
    const distance = Math.min(maximum, Math.max(minimum,
      camera.translationFromParent * Math.exp(Math.max(-20, Math.min(20, delta * this.preferences.dollySensitivity)))));
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

  /** Fits the provider's world sphere against all four native projection extents. */
  Frame()
  {
    if (!this.getBounds) return false;
    const view = this.#Project();
    if (!view) { this._pendingFrame = true; return false; }
    const bounds = this.getBounds(), projection = this._projection, camera = this.camera;
    if (!(bounds.radius >= 0) || !Number.isFinite(bounds.radius) || bounds.centre.length !== 3
      || !Array.from(bounds.centre).every(Number.isFinite)) throw new RangeError("Cannot frame invalid bounds.");
    const tangent = Math.min((1 - projection[8]) / projection[0], (1 + projection[8]) / projection[0],
      (1 - projection[9]) / projection[5], (1 + projection[9]) / projection[5]);
    if (!(tangent > 0) || !Number.isFinite(tangent)) throw new RangeError("Projection does not contain the camera axis.");
    const radius = Math.max(0.001, bounds.radius) * Math.max(1, this.preferences.frameMargin);
    const distance = Math.max(radius / Math.sin(Math.atan(tangent)), camera.frontClip + radius);
    camera.zoomCurve = null;
    camera.backClip = Math.max(camera.backClip, (distance + radius) * 1.05);
    camera.translationFromParent = distance;
    camera.useExtraTranslation = true;
    camera.extraTranslation.set(bounds.centre);
    this.Cancel();
    this._viewportWidth = view.width;
    this._viewportHeight = view.height;
    this._pendingFrame = false;
    if (!this._framedOnce) { this._initial = this.GetPose(); this._framedOnce = true; }
    this.#Changed();
    return true;
  }

  /** Reframes when the host explicitly reports a viewport resize, including deferred zero-size fits. */
  Resize()
  {
    if (!this.getViewport) return false;
    const view = this.getViewport();
    return this._pendingFrame || view.width !== this._viewportWidth || view.height !== this._viewportHeight ? this.Frame() : false;
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
