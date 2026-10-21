// Source: trinity/trinity/Sprite2d/Tr2SpriteObject.h
// Source: trinity/trinity/Sprite2d/Tr2SpriteObject.cpp
// Source: trinity/trinity/Sprite2d/Tr2SpriteObject_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; portable sprite state is maintained here.
import { meta, type, blue } from "#schema";
import { ITr2SpriteObject } from "./ITr2SpriteObject.js";
import { Tr2SpriteObjectPickState } from "../generated/sprite2d/enums.js";
import { blue as be, INotify } from "#blue";

/**
 * Shared portable state and dirty propagation for Sprite2D objects.
 * Native Python-only associatedObject weak-reference accessors are not exposed
 * by this JavaScript port. Required rendering/picking remain abstract.
 * Parent and auxiliary links are non-owning in declaration traversal but remain
 * ordinary JavaScript references; native destructor detach assertions have no
 * deterministic destruction counterpart here.
 */
@blue.define({ className: "Tr2SpriteObjectBase", abstract: true })
@blue.inherit(INotify)
@blue.interface(ITr2SpriteObject, INotify)
export class Tr2SpriteObjectBase extends ITr2SpriteObject
{

  /**
   * Required ITr2SpriteObject traversal contract, Carbon's pure virtual
   * `GatherSprites( Tr2Sprite2dScene* renderer )` (ITr2SpriteObject.h:13).
   *
   * @param {Tr2Sprite2dScene} _renderer The scene gathering sprites.
   */
  @blue.abstract
  GatherSprites(_renderer) {}

  /**
   * Required ITr2SpriteObject picking contract, Carbon's pure virtual
   * `PickPoint( float x, float y, Tr2Sprite2dScene* renderer )`
   * (ITr2SpriteObject.h:14).
   *
   * @param {number} _x Point x.
   * @param {number} _y Point y.
   * @param {Tr2Sprite2dScene} _renderer The scene being picked.
   * @returns {ITr2SpriteObject|null} The picked object.
   */
  @blue.abstract
  PickPoint(_x, _y, _renderer) {}

  /** Carbon method GetDisplay.
   * @returns {boolean} Whether the sprite is displayed.
   */

  @meta.implemented
  GetDisplay()
  {
    return this._display;
  }

  /**
   * Carbon method SetDisplay.
   *
   * Adapted: Retains JavaScript boolean coercion before native change detection and dirty
   * propagation.
   *
   * @param {boolean} value Display state.
   * @returns {void}
   */

  @meta.adapted
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

  @meta.implemented
  GetDisplayX()
  {
    return this.displayX;
  }

  /**
   * Carbon method SetDisplayX.
   *
   * Adapted: Retains Number coercion through the shared scalar helper before native change
   * detection.
   *
   * @param {number} value Display x.
   * @returns {void}
   */

  @meta.adapted
  SetDisplayX(value)
  {
    this._SetDisplayValue("displayX", value);
  }

  /** Carbon method GetDisplayY.
   * @returns {number} Display y.
   */

  @meta.implemented
  GetDisplayY()
  {
    return this.displayY;
  }

  /**
   * Carbon method SetDisplayY.
   *
   * Adapted: Retains Number coercion through the shared scalar helper before native change
   * detection.
   *
   * @param {number} value Display y.
   * @returns {void}
   */

  @meta.adapted
  SetDisplayY(value)
  {
    this._SetDisplayValue("displayY", value);
  }

  /** Carbon method GetDisplayWidth.
   * @returns {number} Display width.
   */

  @meta.implemented
  GetDisplayWidth()
  {
    return this.displayWidth;
  }

  /**
   * Carbon method SetDisplayWidth.
   *
   * Adapted: Retains Number coercion through the shared scalar helper before native change
   * detection.
   *
   * @param {number} value Display width.
   * @returns {void}
   */

  @meta.adapted
  SetDisplayWidth(value)
  {
    this._SetDisplayValue("displayWidth", value);
  }

  /** Carbon method GetDisplayHeight.
   * @returns {number} Display height.
   */

  @meta.implemented
  GetDisplayHeight()
  {
    return this.displayHeight;
  }

  /**
   * Carbon method SetDisplayHeight.
   *
   * Adapted: Retains Number coercion through the shared scalar helper before native change
   * detection.
   *
   * @param {number} value Display height.
   * @returns {void}
   */

  @meta.adapted
  SetDisplayHeight(value)
  {
    this._SetDisplayValue("displayHeight", value);
  }

  /** Carbon method SetParent.
   * @param {ITr2SpriteObject|null} parent New parent.
   * @returns {void}
   */

  @meta.implemented
  SetParent(parent)
  {
    this._parent = parent;
    this.SetDirty();
  }

  /** Carbon method SetDirty (MAP_METHOD_AND_WRAP).
   * @returns {void}
   */
  @blue.method
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

  @meta.adapted
  SetChildDirty(_child)
  {
  }

  /** Carbon's base object is never an auxiliary mouse-over result.
   * @returns {boolean} Always false for the base object.
   */

  @meta.implemented
  IsAuxMouseover()
  {
    return false;
  }

  /** Carbon INotify callback.
   * @param {string|null} _value Changed declaration name.
   * @returns {boolean} Always true.
   */

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
  @blue.readwrite
  @type.wstring
  name = "";

  /** Native non-owning auxiliary mouseover object; READ only. @type {ITr2SpriteObject|null} */
  @blue.read
  @type.rootWeak("ITr2SpriteObject")
  auxMouseover = null;

  /** Native READWRITE display property. @returns {boolean} */
  @blue.property()
  @type.boolean
  get display()
  {
    return this.GetDisplay();
  }

  /** Delegates external display writes to native dirty propagation. @param {boolean} value Display state. */
  set display(value)
  {
    this.SetDisplay(value);
  }

  /** Whether sprite state has changed since the last render. @type {boolean} */
  @blue.readwrite
  @type.boolean
  isDirty = true;

  /** Horizontal translation component, stored separately from native Vector2. @type {number} */
  @blue.notify
  @blue.readwrite
  @type.float32
  displayX = 0;

  /** Vertical translation component, stored separately from native Vector2. @type {number} */
  @blue.notify
  @blue.readwrite
  @type.float32
  displayY = 0;

  /** Displayed sprite width in pixels; external writes notify. @type {number} */
  @blue.notify
  @blue.readwrite
  @type.float32
  displayWidth = 0;

  /** Displayed sprite height in pixels; external writes notify. @type {number} */
  @blue.notify
  @blue.readwrite
  @type.float32
  displayHeight = 0;

  /** Persistent native pick-state chooser controlling self/child hit testing. @type {number} */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.Tr2SpriteObjectPickState")
  pickState = Tr2SpriteObjectPickState.TR2_SPS_ON;

  /** Optional owned mask consulted by concrete sprite picking. @type {Tr2Sprite2dPickingMask|null} */
  @blue.readwrite
  @type.rootRef("Tr2Sprite2dPickingMask")
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


// Native exposure maps both contracts, without concrete self or parent chaining.
