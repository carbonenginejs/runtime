import { CjsSchema, meta } from "#schema";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { CjsInputMan } from "#input";
import { Tr2PrimitiveScene } from "../../trinity/core/scene/Tr2PrimitiveScene.js";
import { Tr2TranslationTool } from "../../trinity/core/tool/Tr2TranslationTool.js";
import { Tr2RotationTool } from "../../trinity/core/tool/Tr2RotationTool.js";
import { Tr2ScalingTool } from "../../trinity/core/tool/Tr2ScalingTool.js";

const TOOL_TYPES = { translation: Tr2TranslationTool, rotation: Tr2RotationTool, scaling: Tr2ScalingTool };
const DEFAULT_KEY_BINDINGS = { translation: "KeyW", rotation: "KeyE", scaling: "KeyR" };

/** Thin composition of Carbon tools, GPU handle picking and explicit matrix targets. */
export class CjsTransformGizmo
{
  scene = new Tr2PrimitiveScene();
  target = null;
  _input = null;
  _consumer = null;
  _drag = null;
  _generation = 0;
  _frame = mat4.create();
  _keyBindings = null;

  /** No DOM listeners or scene installation occurs during construction. */
  constructor({ mode = "translation", space = "local", getView, onChange = null, onSelect = null, pickObject = null, keyBindings = {} } = {})
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
   * Applies KeyboardEvent.code overrides to W/E/R defaults. Null unbinds a
   * mode; an empty record restores defaults. Escape remains cancellation.
   * Duplicate or invalid bindings leave the previous mapping unchanged.
   */
  SetKeyBindings(bindings = {})
  {
    const next = { ...DEFAULT_KEY_BINDINGS, ...bindings }, used = new Set();
    for (const [mode, code] of Object.entries(next))
    {
      if (!Object.hasOwn(TOOL_TYPES, mode)) throw new TypeError("Unknown gizmo binding mode.");
      if (code === null) continue;
      if (typeof code !== "string" || !code.trim() || code === "Escape") throw new TypeError("Gizmo bindings require a key code other than Escape, or null.");
      if (used.has(code)) throw new RangeError("Gizmo mode bindings must be distinct.");
      used.add(code);
    }
    this._keyBindings = next;
    return this;
  }

  /** Returns a detached mapping for the host's rebinding UI and persistence. */
  GetKeyBindings()
  {
    return { ...this._keyBindings };
  }

  /** Switches native tools, cancelling any unfinished edit first. */
  SetMode(mode)
  {
    const Type = TOOL_TYPES[mode];
    if (!Type) throw new TypeError("Unknown transform mode.");
    this.Cancel();
    if (this.tool) this.tool.Destroy();
    this.mode = mode;
    this.tool = new Type();
    this.tool.SetMoveCallback((current, next) => this.#Apply(current, next));
    this.scene.manipulator = this.target ? this.tool : null;
    this.Sync();
    return this;
  }

  /**
   * Object and locator targets share this explicit record:
   * readLocal(out), writeLocal(matrix), readParentWorld(out). Writes must retain
   * the complete affine matrix; an SRT-only target cannot preserve shear.
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

  /** Installs only an input consumer; the host draws scene after its world scene. */
  Install(input, priority = 100)
  {
    this.Uninstall();
    this._input = input;
    this._consumer = input.Register({ priority, handle: event => this.HandleInput(event),
      preview: event => this.#KeyMode(event) !== null, cancel: () => this.Cancel() });
    return this;
  }

  /** Removes shared routing and rolls back an incomplete edit. */
  Uninstall()
  {
    if (this._input) this._input.Unregister(this._consumer);
    this._input = this._consumer = null;
    this.Cancel();
  }

  /**
   * Builds an orthonormal display frame only. The target matrix is never
   * decomposed or rebuilt: its shear and parent scaling survive every edit.
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
      if (!this.target || this._drag) return;
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

  /** Draws the native handle scene inside the host's current render context. */
  Render(context)
  {
    this.Sync();
    this.scene.Render(context);
  }

  /** Queued input, with request cancellation checked after every GPU await. */
  async HandleInput(event)
  {
    const result = CjsInputMan.Result;
    const keyMode = this.#KeyMode(event);
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
      const generation = this._generation;
      const view = this.getView();
      this.Sync();
      const handle = this.target ? await this.scene.PickObject(event.x, event.y, view.projection, view.view, view.viewport) : null;
      if (generation !== this._generation) return result.CONSUME;
      if (handle && this.tool.primitives.includes(handle))
      {
        const initial = mat4.create(); // alloc: drag snapshot retained through commit or cancellation.
        this.target.readLocal(initial);
        this._drag = { initial, target: this.target };
        this.tool.SelectAxis(handle.name);
        this.tool.captured = true;
        return result.CAPTURE;
      }
      if (this.pickObject)
      {
        const object = await this.pickObject(event.x, event.y, view);
        if (generation !== this._generation) return result.CONSUME;
        if (object && this.onSelect)
        {
          this.onSelect(object);
          return result.CONSUME;
        }
      }
      return result.PASS;
    }
    if (event.type === "pointermove" && this._drag)
    {
      const view = this.getView();
      this.tool.Move(event.x, event.y, event.dx, event.dy, view.viewport,
        view.view.GetTransform(), view.projection.GetMatrixWithoutViewAdjustment());
      this.tool.Update(view.context);
      return result.CONSUME;
    }
    if (event.type === "pointerup" && this._drag)
    {
      this._drag = null;
      this.tool.captured = false;
      this.Sync();
      return result.RELEASE;
    }
    return result.PASS;
  }

  /** Matches unmodified mode shortcuts without mutating during browser dispatch. */
  #KeyMode(event)
  {
    if ((event.type !== "keydown" && event.type !== "keyup")
      || event.shift || event.ctrl || event.alt || event.meta || event.isComposing) return null;
    return Object.keys(this._keyBindings).find(mode => this._keyBindings[mode] === event.code) ?? null;
  }

  /** Restores the exact initial local matrix and invalidates outstanding handle picks. */
  Cancel()
  {
    this._generation++;
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

  /** Releases owned tools/scenes and borrowed target references. */
  Destroy()
  {
    this.Uninstall();
    this.tool.Destroy();
    this.scene.Destroy();
    this.target = null;
  }

  /** Converts a native tool delta through its frame and the current parent matrix. */
  #Apply(current, next)
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
}

CjsSchema.define(CjsTransformGizmo, { className: "CjsTransformGizmo",
  methods: Object.fromEntries(["SetKeyBindings", "GetKeyBindings", "SetMode", "SetTarget", "Install", "Uninstall", "Sync", "Render", "HandleInput", "Cancel", "Destroy"].map(name => [name, [meta.ours]])) });
