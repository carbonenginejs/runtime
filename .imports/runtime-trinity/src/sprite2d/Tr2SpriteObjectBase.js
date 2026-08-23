// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Sprite2d/Tr2SpriteObject.h
// Source: trinity/trinity/Sprite2d/Tr2SpriteObject.cpp
// Source: trinity/trinity/Sprite2d/Tr2SpriteObject_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; portable sprite state is maintained here.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { Tr2SpriteObjectPickState } from "../generated/sprite2d/enums.js";

/** Shared portable state and dirty propagation for Sprite2D objects. */
@type.define({ className: "Tr2SpriteObjectBase", family: "sprite2d" })
export class Tr2SpriteObjectBase extends CjsModel
{

  /** Required ITr2SpriteObject traversal contract. */
  @carbon.method
  @impl.notImplemented
  GatherSprites(..._args)
  {
    throw new Error("Tr2SpriteObjectBase.GatherSprites must be implemented by a concrete Sprite2D object.");
  }

  /** Required ITr2SpriteObject picking contract. */
  @carbon.method
  @impl.notImplemented
  PickPoint(..._args)
  {
    throw new Error("Tr2SpriteObjectBase.PickPoint must be implemented by a concrete Sprite2D object.");
  }

  /** Carbon method GetDisplay. */
  @carbon.method
  @impl.implemented
  GetDisplay()
  {
    return this.display;
  }

  /** Carbon method SetDisplay. */
  @carbon.method
  @impl.implemented
  SetDisplay(value)
  {
    const next = Boolean(value);
    if (next !== this.display)
    {
      this.display = next;
      this.SetDirty();
    }
  }

  /** Carbon method GetDisplayX. */
  @carbon.method
  @impl.implemented
  GetDisplayX()
  {
    return this.displayX;
  }

  /** Carbon method SetDisplayX. */
  @carbon.method
  @impl.implemented
  SetDisplayX(value)
  {
    this.#SetDisplayValue("displayX", value);
  }

  /** Carbon method GetDisplayY. */
  @carbon.method
  @impl.implemented
  GetDisplayY()
  {
    return this.displayY;
  }

  /** Carbon method SetDisplayY. */
  @carbon.method
  @impl.implemented
  SetDisplayY(value)
  {
    this.#SetDisplayValue("displayY", value);
  }

  /** Carbon method GetDisplayWidth. */
  @carbon.method
  @impl.implemented
  GetDisplayWidth()
  {
    return this.displayWidth;
  }

  /** Carbon method SetDisplayWidth. */
  @carbon.method
  @impl.implemented
  SetDisplayWidth(value)
  {
    this.#SetDisplayValue("displayWidth", value);
  }

  /** Carbon method GetDisplayHeight. */
  @carbon.method
  @impl.implemented
  GetDisplayHeight()
  {
    return this.displayHeight;
  }

  /** Carbon method SetDisplayHeight. */
  @carbon.method
  @impl.implemented
  SetDisplayHeight(value)
  {
    this.#SetDisplayValue("displayHeight", value);
  }

  /** Carbon method SetParent. */
  @carbon.method
  @impl.implemented
  SetParent(parent)
  {
    this.#parent = parent;
    this.SetDirty();
  }

  /** Carbon method SetDirty (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetDirty()
  {
    this.isDirty = true;
    if (this.#parent)
    {
      this.#parent.SetChildDirty(this);
    }
  }

  /** Carbon's base container notification is intentionally a no-op. */
  @carbon.method
  @impl.implemented
  SetChildDirty(_child)
  {
  }

  /** Carbon's base object is never an auxiliary mouse-over result. */
  @carbon.method
  @impl.implemented
  IsAuxMouseover()
  {
    return false;
  }

  /** Carbon INotify callback. */
  @carbon.method
  @impl.implemented
  OnModified(_value)
  {
    this.SetDirty();
    return true;
  }

  /** Updates one display scalar and marks the object dirty on change. */
  #SetDisplayValue(name, value)
  {
    const next = Number(value);
    if (next !== this[name])
    {
      this[name] = next;
      this.SetDirty();
    }
  }

  /** m_display (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  display = true;

  /** m_pickState (Tr2SpriteObjectPickState - enum Tr2SpriteObjectPickState) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("Tr2SpriteObjectPickState")
  pickState = Tr2SpriteObjectPickState.TR2_SPS_ON;

  /** m_isDirty (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  isDirty = true;

  /** m_displayHeight (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  displayHeight = 0;

  /** m_pickingMask (Tr2Sprite2dPickingMaskPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2Sprite2dPickingMask")
  pickingMask = null;

  /** m_name (std::wstring) [READWRITE] */
  @io.readwrite
  @type.string
  name = "";

  /** m_auxMouseover (ITr2SpriteObject*) [READ] */
  @io.read
  @type.objectRef("ITr2SpriteObject")
  auxMouseover = null;

  /** m_displayWidth (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  displayWidth = 0;

  /** m_translation.x (Vector2) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  displayX = 0;

  /** m_translation.y (Vector2) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  displayY = 0;

  #parent = null;

  static Tr2SpriteObjectPickState = Tr2SpriteObjectPickState;

}
