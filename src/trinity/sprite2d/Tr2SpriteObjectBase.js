// Source: trinity/trinity/Sprite2d/Tr2SpriteObject.h
// Source: trinity/trinity/Sprite2d/Tr2SpriteObject.cpp
// Source: trinity/trinity/Sprite2d/Tr2SpriteObject_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; portable sprite state is maintained here.
import { meta } from "#schema";
import { ITr2SpriteObject } from "./ITr2SpriteObject.js";
import { Tr2SpriteObjectPickState } from "../generated/sprite2d/enums.js";
import { blue, INotify } from "#blue";

/**
 * Shared portable state and dirty propagation for Sprite2D objects.
 * Native Python-only associatedObject weak-reference accessors are not exposed
 * by this JavaScript port. Required rendering/picking remain abstract.
 * Parent and auxiliary links are non-owning in declaration traversal but remain
 * ordinary JavaScript references; native destructor detach assertions have no
 * deterministic destruction counterpart here.
 */
@meta.define({ className: "Tr2SpriteObjectBase", family: "sprite2d", abstract: true })
@meta.blue.inherit(INotify)
export class Tr2SpriteObjectBase extends ITr2SpriteObject
{

  /** Required ITr2SpriteObject traversal contract. @param {...*} _args Renderer arguments. @returns {void} */
  @meta.blue.method
  @meta.abstract
  GatherSprites(..._args)
  {
    throw new Error("Tr2SpriteObjectBase.GatherSprites must be implemented by a concrete Sprite2D object.");
  }

  /** Required ITr2SpriteObject picking contract. @param {...*} _args Picking arguments. @returns {ITr2SpriteObject|null} */
  @meta.blue.method
  @meta.abstract
  PickPoint(..._args)
  {
    throw new Error("Tr2SpriteObjectBase.PickPoint must be implemented by a concrete Sprite2D object.");
  }

  /** Carbon method GetDisplay.
   * @returns {boolean} Whether the sprite is displayed.
   */
  @meta.blue.method
  @meta.implemented
  GetDisplay()
  {
    return this._display;
  }

  /** Carbon method SetDisplay.
   * @param {boolean} value Display state.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Retains JavaScript boolean coercion before native change detection and dirty propagation.")
  SetDisplay(value)
  {
    const next = Boolean(value);
    if (next !== this._display)
    {
      this._display = next;
      this.SetDirty();
    }
  }

  /** Carbon method GetDisplayX.
   * @returns {number} Display x.
   */
  @meta.blue.method
  @meta.implemented
  GetDisplayX()
  {
    return this.displayX;
  }

  /** Carbon method SetDisplayX.
   * @param {number} value Display x.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Retains Number coercion through the shared scalar helper before native change detection.")
  SetDisplayX(value)
  {
    this._SetDisplayValue("displayX", value);
  }

  /** Carbon method GetDisplayY.
   * @returns {number} Display y.
   */
  @meta.blue.method
  @meta.implemented
  GetDisplayY()
  {
    return this.displayY;
  }

  /** Carbon method SetDisplayY.
   * @param {number} value Display y.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Retains Number coercion through the shared scalar helper before native change detection.")
  SetDisplayY(value)
  {
    this._SetDisplayValue("displayY", value);
  }

  /** Carbon method GetDisplayWidth.
   * @returns {number} Display width.
   */
  @meta.blue.method
  @meta.implemented
  GetDisplayWidth()
  {
    return this.displayWidth;
  }

  /** Carbon method SetDisplayWidth.
   * @param {number} value Display width.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Retains Number coercion through the shared scalar helper before native change detection.")
  SetDisplayWidth(value)
  {
    this._SetDisplayValue("displayWidth", value);
  }

  /** Carbon method GetDisplayHeight.
   * @returns {number} Display height.
   */
  @meta.blue.method
  @meta.implemented
  GetDisplayHeight()
  {
    return this.displayHeight;
  }

  /** Carbon method SetDisplayHeight.
   * @param {number} value Display height.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Retains Number coercion through the shared scalar helper before native change detection.")
  SetDisplayHeight(value)
  {
    this._SetDisplayValue("displayHeight", value);
  }

  /** Carbon method SetParent.
   * @param {ITr2SpriteObject|null} parent New parent.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  SetParent(parent)
  {
    this._parent = parent;
    this.SetDirty();
  }

  /** Carbon method SetDirty (MAP_METHOD_AND_WRAP).
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  SetDirty()
  {
    this.isDirty = true;
    if (this._parent)
    {
      this._parent.SetChildDirty(this);
    }
  }

  /** Carbon's base container notification is intentionally a no-op.
   * @param {ITr2SpriteObject|null} _child Changed child.
   * @returns {void}
   */
  @meta.blue.method
  @meta.noop
  SetChildDirty(_child)
  {
  }

  /** Carbon's base object is never an auxiliary mouse-over result.
   * @returns {boolean} Always false for the base object.
   */
  @meta.blue.method
  @meta.implemented
  IsAuxMouseover()
  {
    return false;
  }

  /** Carbon INotify callback.
   * @param {string|null} _value Changed declaration name.
   * @returns {boolean} Always true.
   */
  @meta.blue.method
  @meta.implemented
  OnModified(_value)
  {
    this.SetDirty();
    return true;
  }

  /**
   * Updates one display scalar and marks the object dirty on change.
   * @param {string} name Scalar field name.
   * @param {number} value New scalar value.
   * @returns {void}
   */
  @meta.ours
  _SetDisplayValue(name, value)
  {
    const next = Number(value);
    if (next !== this[name])
    {
      this[name] = next;
      this.SetDirty();
    }
  }

  /** Sprite label stored as native std::wstring. @type {string} */
  @meta.blue.readwrite
  @meta.type.wstring
  name = "";

  /** Native non-owning auxiliary mouseover object; READ only. @type {ITr2SpriteObject|null} */
  @meta.blue.read
  @meta.type.weakRef("ITr2SpriteObject")
  auxMouseover = null;

  /** Native READWRITE display property. @returns {boolean} */
  @meta.blue.readwrite
  @meta.type.boolean
  @meta.ours
  get display()
  {
    return this.GetDisplay();
  }

  /** Delegates external display writes to native dirty propagation. @param {boolean} value Display state. */
  @meta.ours
  set display(value)
  {
    this.SetDisplay(value);
  }

  /** Whether sprite state has changed since the last render. @type {boolean} */
  @meta.blue.readwrite
  @meta.type.boolean
  isDirty = true;

  /** Horizontal translation component, stored separately from native Vector2. @type {number} */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  displayX = 0;

  /** Vertical translation component, stored separately from native Vector2. @type {number} */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  displayY = 0;

  /** Displayed sprite width in pixels; external writes notify. @type {number} */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  displayWidth = 0;

  /** Displayed sprite height in pixels; external writes notify. @type {number} */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  displayHeight = 0;

  /** Persistent native pick-state chooser controlling self/child hit testing. @type {number} */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.Tr2SpriteObjectPickState")
  pickState = Tr2SpriteObjectPickState.TR2_SPS_ON;

  /** Optional owned mask consulted by concrete sprite picking. @type {Tr2Sprite2dPickingMask|null} */
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2Sprite2dPickingMask")
  pickingMask = null;

  /** Native display backing state. @type {boolean} */
  _display = true;

  /** Native non-owning parent link; excluded from declared graph traversal. @type {ITr2SpriteObject|null} */
  _parent = null;

  /** Existing class-local view of the native chooser vocabulary. @type {object} */
  static Tr2SpriteObjectPickState = Tr2SpriteObjectPickState;

}

// Carbon gives this a chooser (trinity/trinity/Sprite2d/Tr2SpriteObject_Blue.cpp:10) but never registers it,
// so it takes no exposure.
blue.enums.RegisterEnum("trinity.Tr2SpriteObjectPickState", Tr2SpriteObjectBase.Tr2SpriteObjectPickState, {
  source: "trinity/trinity/Sprite2d/ITr2Sprite2dRenderer.h", family: "sprite2d", line: 8,
  chooserSource: "trinity/trinity/Sprite2d/Tr2SpriteObject_Blue.cpp:10",
  chooser: [
    { name: "TR2_SPS_OFF", value: Tr2SpriteObjectBase.Tr2SpriteObjectPickState.TR2_SPS_OFF, description: "Picking is disabled" },
    { name: "TR2_SPS_ON", value: Tr2SpriteObjectBase.Tr2SpriteObjectPickState.TR2_SPS_ON, description: "Picking is enabled" },
    { name: "TR2_SPS_CHILDREN", value: Tr2SpriteObjectBase.Tr2SpriteObjectPickState.TR2_SPS_CHILDREN, description: "Only children are pickable" }
  ]
});

// Native exposure maps both contracts, without concrete self or parent chaining.
meta.blue.interfaceTable({ interfaces: [ITr2SpriteObject, INotify], chainTo: null })(Tr2SpriteObjectBase);
