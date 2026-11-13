import { CjsSchema, meta } from "#schema";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { TnyInputMan } from "../input/TnyInputMan.js";
import { Tr2PrimitiveScene } from "../../trinity/core/scene/Tr2PrimitiveScene.js";
import { Tr2TranslationTool } from "../../trinity/core/tool/Tr2TranslationTool.js";
import { Tr2RotationTool } from "../../trinity/core/tool/Tr2RotationTool.js";
import { Tr2ScalingTool } from "../../trinity/core/tool/Tr2ScalingTool.js";

const TOOL_TYPES = { translation: Tr2TranslationTool, rotation: Tr2RotationTool, scaling: Tr2ScalingTool };
const DEFAULT_KEY_BINDINGS = { off: "KeyQ", translation: "KeyW", rotation: "KeyE", scaling: "KeyR" };

/**
 * Thin composition of Carbon tools, GPU handle picking and explicit matrix targets.
 * @cjs
 */
export class TnyTransformGizmo
{

  /**
   * Owned scene containing the active native manipulator.
   * @type {Tr2PrimitiveScene}
   * @cjs
   */
  scene = new Tr2PrimitiveScene();

  /**
   * Borrowed transform target with explicit matrix accessors.
   * @type {object|null}
   * @cjs
   */
  target = null;

  /**
   * The active transform mode: "translation", "rotation", "scaling" or "off".
   * Set through SetMode, which the constructor calls.
   * @type {string}
   * @cjs
   */
  mode = "off";

  /**
   * The native tool for the active mode, or null when the mode is "off".
   * @type {Tr2TranslationTool|Tr2RotationTool|Tr2ScalingTool|null}
   * @cjs
   */
  tool = null;

  /**
   * Edit space, "local" or "world"; set by the constructor.
   * @type {string}
   * @cjs
   */
  space = "local";

  /**
   * Returns the current view for picking and dragging; set by the constructor.
   * @type {Function|null}
   * @cjs
   */
  getView = null;

  /**
   * Called with (target, phase) as an edit progresses, or null.
   * @type {Function|null}
   * @cjs
   */
  onChange = null;

  /**
   * Called when a click selects an object, or null.
   * @type {Function|null}
   * @cjs
   */
  onSelect = null;

  /**
   * Resolves the object under (x, y, view) for click-select, or null.
   * @type {Function|null}
   * @cjs
   */
  pickObject = null;

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
   * Current edit snapshot retained until commit or cancellation.
   * @type {object|null}
   * @cjs
   */
  _drag = null;

  /**
   * A left press that may become a click-select: where it started and how far it has moved.
   * @type {object|null}
   * @cjs
   */
  _press = null;

  /**
   * Cancellation generation used to reject stale asynchronous input.
   * @type {number}
   * @cjs
   */
  _generation = 0;

  /**
   * Owned orthonormal display frame; never the edited target matrix.
   * @type {Float32Array}
   * @cjs
   */
  _frame = mat4.create();

  /**
   * Validated key bindings for the current interaction policy.
   * @type {object|null}
   * @cjs
   */
  _keyBindings = null;

  /**
   * No DOM listeners or scene installation occurs during construction.
   * @param {object} [options] Options for this operation.
   * @param {string} [options.mode="translation"] Initial tool mode.
   * @param {string} [options.space="local"] Local or world edit space.
   * @param {Function|null} [options.getView] Returns view, projection, viewport and render context.
   * @param {Function|null} [options.onChange] Receives the target and edit phase.
   * @param {Function|null} [options.onSelect] Receives the selected object or null after a miss.
   * @param {Function|null} [options.pickObject] Asynchronous object picker.
   * @param {object} [options.keyBindings] Overrides mode shortcuts.
   * @cjs
   */
  constructor({ mode = "translation", space = "local", getView = null, onChange = null, onSelect = null, pickObject = null, keyBindings = {} } = {})
  {
    if (space !== "local" && space !== "world") throw new TypeError("Gizmo space must be local or world.");
    this.space = space;
    this.getView = getView;
    this.onChange = onChange;
    this.onSelect = onSelect;
    this.pickObject = pickObject;
    this.SetKeyBindings(keyBindings);
    this.SetMode(mode);
  }

  /**
   * Applies KeyboardEvent.code overrides to Q/W/E/R defaults. Null unbinds a
   * mode; an empty record restores defaults. Escape remains cancellation.
   * Duplicate or invalid bindings leave the previous mapping unchanged.
   * @param {object} [bindings] Key binding overrides; null values unbind actions.
   * @returns {this}
   * @cjs
   */
  SetKeyBindings(bindings = {})
  {
    const next = { ...DEFAULT_KEY_BINDINGS, ...bindings }, used = new Set();
    for (const [mode, code] of Object.entries(next))
    {
      if (!Object.hasOwn(DEFAULT_KEY_BINDINGS, mode)) throw new TypeError("Unknown gizmo binding mode.");
      if (code === null) continue;
      if (typeof code !== "string" || !code.trim() || code === "Escape") throw new TypeError("Gizmo bindings require a key code other than Escape, or null.");
      if (used.has(code)) throw new RangeError("Gizmo mode bindings must be distinct.");
      used.add(code);
    }
    this._keyBindings = next;
    return this;
  }

  /**
   * Returns a detached mapping for the host's rebinding UI and persistence.
   * @returns {object}
   * @cjs
   */
  GetKeyBindings()
  {
    return { ...this._keyBindings };
  }

  /**
   * Switches native tools, cancelling any unfinished edit first.
   * @param {string} mode Manipulator mode.
   * @returns {this}
   * @cjs
   */
  SetMode(mode)
  {
    const Type = TOOL_TYPES[mode];
    if (!Type && mode !== "off") throw new TypeError("Unknown transform mode.");
    this.Cancel();
    if (this.tool) this.tool.Destruct();
    this.mode = mode;
    this.tool = Type ? new Type() : null;
    if (this.tool) this.tool.SetMoveCallback((current, next) => this._Apply(current, next));
    this.scene.manipulator = this.target ? this.tool : null;
    this.Sync();
    return this;
  }

  /**
   * Object and locator targets share this explicit record:
   * readLocal(out), writeLocal(matrix), readParentWorld(out). Writes must retain
   * the complete affine matrix; an SRT-only target cannot preserve shear.
   * @param {object|null} target Target consumed by the operation; null clears it where supported.
   * @returns {this}
   * @cjs
   */
  SetTarget(target)
  {
    this.Cancel();
    if (target && [target.readLocal, target.writeLocal, target.readParentWorld].some(fn => typeof fn !== "function"))
      throw new TypeError("Targets require explicit local and parent matrix accessors.");
    this.target = target;
    this.scene.manipulator = target ? this.tool : null;
    this.Sync();
    return this;
  }

  /**
   * Installs only an input consumer; the host draws scene after its world scene.
   * @param {TnyInputMan} input Borrowed shared input router.
   * @param {number} [priority] Dispatch priority; larger values run first.
   * @returns {this}
   * @cjs
   */
  Install(input, priority = 100)
  {
    this.Uninstall();
    this._input = input;
    this._consumer = input.Register({ priority, handle: event => this.HandleInput(event),
      preview: event => this._KeyMode(event) !== null, cancel: () => this.Cancel() });
    return this;
  }

  /**
   * Removes shared routing and rolls back an incomplete edit.
   * @cjs
   */
  Uninstall()
  {
    if (this._input) this._input.Unregister(this._consumer);
    this._input = this._consumer = null;
    this.Cancel();
  }

  /**
   * Builds an orthonormal display frame only. The target matrix is never
   * decomposed or rebuilt: its shear and parent scaling survive every edit.
   * @cjs
   */
  Sync()
  {
    const mat4_0 = mat4.alloc();
    const mat4_1 = mat4.alloc();
    const mat4_2 = mat4.alloc();
    const mat4_3 = mat4.alloc();
    const vec3_0 = vec3.alloc();
    const vec3_1 = vec3.alloc();
    const vec3_2 = vec3.alloc();
    try
    {
      if (!this.tool || !this.target || this._drag) return;
      const local = mat4.identity(mat4_0), parent = mat4.identity(mat4_1);
      this.target.readLocal(local);
      this.target.readParentWorld(parent);
      if (!mat4.invert(mat4.identity(mat4_2), parent)) throw new RangeError("Gizmo parent transform is singular.");
      const world = mat4.multiply(mat4.identity(mat4_3), parent, local);
      const frame = mat4.identity(this._frame);
      if (this.space === "local")
      {
        const x = vec3.set(vec3_0, world[0], world[1], world[2]);
        const y = vec3.set(vec3_1, world[4], world[5], world[6]);
        if (vec3.length(x) < 1e-8) throw new RangeError("Gizmo target has a singular basis.");
        vec3.normalize(x, x);
        vec3.scaleAndAdd(y, y, x, -vec3.dot(y, x));
        if (vec3.length(y) < 1e-8) throw new RangeError("Gizmo target has a singular basis.");
        vec3.normalize(y, y);
        const z = vec3.cross(vec3.zero(vec3_2), x, y);
        frame.set(x, 0); frame.set(y, 4); frame.set(z, 8);
      }
      frame[12] = world[12]; frame[13] = world[13]; frame[14] = world[14];
      this.tool.Init(frame);
    }
    finally
    {
      mat4.unalloc(mat4_0);
      mat4.unalloc(mat4_1);
      mat4.unalloc(mat4_2);
      mat4.unalloc(mat4_3);
      vec3.unalloc(vec3_0);
      vec3.unalloc(vec3_1);
      vec3.unalloc(vec3_2);
    }
  }

  /**
   * Draws the native handle scene inside the host's current render context.
   * @param {object} context Active render context.
   * @cjs
   */
  Render(context)
  {
    this.Sync();
    this.scene.Render(context);
  }

  /**
   * Queued input, with request cancellation checked after every GPU await.
   * @param {object} event Normalized input event.
   * @returns {Promise<number>}
   * @cjs
   */
  async HandleInput(event)
  {
    const result = TnyInputMan.Result;
    const keyMode = this._KeyMode(event);
    if (keyMode)
    {
      if (event.type === "keydown" && !event.repeat && keyMode !== this.mode)
      {
        const wasDragging = this._drag !== null;
        this.SetMode(keyMode);
        return wasDragging ? result.RELEASE : result.CONSUME;
      }
      return result.CONSUME;
    }
    if (event.type === "pointerdown" && event.button === 0)
    {
      // Shift-left drag belongs to camera pan, even over a handle. Other
      // modified presses remain available to the host rather than picking.
      if (event.shift || event.ctrl || event.alt || event.meta)
      {
        this._press = null;
        return result.PASS;
      }
      const generation = this._generation;
      const view = this.getView();
      this.Sync();
      const handle = this.target && this.tool ? await this.scene.PickObject(event.x, event.y, view.projection, view.view, view.viewport) : null;
      if (generation !== this._generation) return result.CONSUME;
      if (handle && this.tool.primitives.includes(handle))
      {
        const initial = mat4.create(); // alloc: drag snapshot retained through commit or cancellation.
        this.target.readLocal(initial);
        this._drag = { initial, target: this.target };
        // Native scale guide lines are pickable, but Move accepts x/y/z/w,
        // not the guides' _x/_y/_z names. Route them to their matching box axis.
        const axis = this.mode === "scaling" && /^_[xyz]$/.test(handle.name) ? handle.name.slice(1) : handle.name;
        this.tool.SelectAxis(axis);
        this.tool.captured = true;
        return result.CAPTURE;
      }
      // Not a handle: the press belongs to the camera. Selection waits for the
      // release, so a drag that starts on an object still orbits (as CCP's
      // editors do: click selects, drag moves the camera).
      this._press = { x: event.x, y: event.y, moved: 0 };
      return result.PASS;
    }
    if (event.type === "pointermove" && this._press && !this._drag)
    {
      this._press.moved += Math.abs(event.dx ?? 0) + Math.abs(event.dy ?? 0);
      return result.PASS;
    }
    if (event.type === "pointerup" && this._press && !this._drag)
    {
      const press = this._press;
      this._press = null;
      if (press.moved <= TnyTransformGizmo.clickSlop && this.pickObject)
      {
        const generation = this._generation;
        const object = await this.pickObject(press.x, press.y, this.getView());
        // A completed miss clears the host selection just as a hit replaces it.
        if (generation === this._generation && this.onSelect) this.onSelect(object ?? null);
      }
      // The camera still needs the release to end its drag.
      return result.PASS;
    }
    if (event.type === "pointermove" && this._drag)
    {
      const drag = this._drag;
      const view = this.getView();
      this._Move(event.x, event.y, event.dx, event.dy, view);
      // Change callbacks may cancel the drag, replace its target or switch tools.
      if (this._drag !== drag) return result.RELEASE;
      drag.moved ||= !!(event.dx || event.dy);
      this.tool.Update(view.context);
      return result.CONSUME;
    }
    if (event.type === "pointerup" && this._drag)
    {
      const drag = this._drag;
      if (this.mode === "scaling" && drag.moved)
      {
        // Carbon computes scale before advancing its handle. A zero-delta
        // final sample commits the last movement, including a coalesced drag.
        const view = this.getView();
        this._Move(event.x, event.y, 0, 0, view);
        if (this._drag !== drag) return result.RELEASE;
      }
      this._drag = null;
      this.tool.captured = false;
      this.Sync();
      return result.RELEASE;
    }
    return result.PASS;
  }

  /**
   * Supplies temporary matrices to the native tool's synchronous Move call.
   * The tool consumes them during the call; they are returned to the pool even
   * if Move throws. Pool ownership also permits reentrant host callbacks.
   * @param {number} x Pointer X in backing pixels.
   * @param {number} y Pointer Y in backing pixels.
   * @param {number} dx Horizontal movement in backing pixels.
   * @param {number} dy Vertical movement in backing pixels.
   * @param {object} view Host view, projection and viewport providers.
   * @cjs
   */
  _Move(x, y, dx, dy, view)
  {
    const mat4_0 = mat4.alloc();
    const mat4_1 = mat4.alloc();
    try
    {
      this.tool.Move(x, y, dx, dy, view.viewport,
        view.view.GetTransform(mat4.identity(mat4_0)),
        view.projection.GetMatrixWithoutViewAdjustment(mat4.identity(mat4_1)));
    }
    finally
    {
      mat4.unalloc(mat4_0);
      mat4.unalloc(mat4_1);
    }
  }

  /**
   * Matches unmodified mode shortcuts without mutating during browser dispatch.
   * @param {object} event Normalized input event.
   * @returns {string|null}
   * @cjs
   */
  _KeyMode(event)
  {
    if ((event.type !== "keydown" && event.type !== "keyup")
      || event.shift || event.ctrl || event.alt || event.meta || event.isComposing) return null;
    return Object.keys(this._keyBindings).find(mode => this._keyBindings[mode] === event.code) ?? null;
  }

  /**
   * Restores the exact initial local matrix and invalidates outstanding handle picks.
   * @cjs
   */
  Cancel()
  {
    this._generation++;
    this._press = null;
    const drag = this._drag;
    this._drag = null;
    if (drag) drag.target.writeLocal(drag.initial);
    if (this.tool)
    {
      this.tool.captured = false;
      this.tool._moved = false;
      vec3.zero(this.tool._movement);
    }
    if (drag && this.onChange) this.onChange(drag.target, "cancel");
  }

  /**
   * Releases owned tools/scenes and borrowed target references.
   *
   * @cjs Preserves this browser/wrapper owner's existing cleanup through graph lifetime dispatch.
   * @cjs
   * @returns {boolean} True: nothing here refuses.
   */
  OnDestruct()
  {
    this.Uninstall();
    if (this.tool) this.tool.Destruct();
    this.tool = null;
    this.scene.Destruct();
    this.target = null;
    return true;
  }

  /**
   * Converts a native tool delta through its frame and the current parent matrix.
   * @param {Float32Array} current Current native tool matrix.
   * @param {Float32Array} next Proposed native tool matrix.
   * @returns {boolean}
   * @cjs
   */
  _Apply(current, next)
  {
    const mat4_0 = mat4.alloc();
    const mat4_1 = mat4.alloc();
    const mat4_2 = mat4.alloc();
    const mat4_3 = mat4.alloc();
    const mat4_4 = mat4.alloc();
    const mat4_5 = mat4.alloc();
    const mat4_6 = mat4.alloc();
    try
    {
      if (!this.target || !this._drag) return false;
      const inverse = mat4.invert(mat4.identity(mat4_0), current);
      if (!inverse) return false;
      const delta = mat4.multiply(mat4.identity(mat4_1), next, inverse);
      if (this.mode === "scaling")
      {
        const inverseFrame = mat4.invert(mat4.identity(mat4_2), this._frame);
        mat4.multiply(delta, this._frame, delta);
        mat4.multiply(delta, delta, inverseFrame);
      }
      const local = mat4.identity(mat4_3), parent = mat4.identity(mat4_4);
      this.target.readLocal(local);
      this.target.readParentWorld(parent);
      const inverseParent = mat4.invert(mat4.identity(mat4_5), parent);
      if (!inverseParent) return false;
      const world = mat4.multiply(mat4.identity(mat4_6), parent, local);
      mat4.multiply(world, delta, world);
      const updated = mat4.multiply(mat4.create(), inverseParent, world); // alloc: complete matrix transferred to the target accessor.
      if (!updated.every(Number.isFinite)) return false;
      if (this.target.writeLocal(updated) === false) return false;
      if (this.onChange) this.onChange(this.target, "move");
      return true;
    }
    finally
    {
      mat4.unalloc(mat4_0);
      mat4.unalloc(mat4_1);
      mat4.unalloc(mat4_2);
      mat4.unalloc(mat4_3);
      mat4.unalloc(mat4_4);
      mat4.unalloc(mat4_5);
      mat4.unalloc(mat4_6);
    }
  }

  /**
   * How far, in backing pixels, a press may travel and still count as a click.
   * @type {number}
   * @cjs
   */
  static clickSlop = 4;

  /**
   * Stable identity for diagnostics and registration.
   * @type {string}
   * @cjs
   */
  static className = "TnyTransformGizmo";

}

CjsSchema.meta.define(TnyTransformGizmo, {
  className: "TnyTransformGizmo",
  methods: Object.fromEntries(["SetKeyBindings", "GetKeyBindings", "SetMode", "SetTarget", "Install", "Uninstall", "Sync", "Render", "HandleInput", "Cancel", "Destruct"].map(name => [name, []]))
});
