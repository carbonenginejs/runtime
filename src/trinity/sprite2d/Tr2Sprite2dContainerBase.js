// Source: trinity/trinity/Sprite2d/Tr2Sprite2dContainer.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dContainer.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dContainer_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; portable child ownership is maintained here.
import { meta, type, blue } from "#schema";
import { BlueList, IListNotify } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";
import { ITr2SpriteObject } from "./ITr2SpriteObject.js";
import { Tr2SpriteObjectBase } from "./Tr2SpriteObjectBase.js";

/** Shared Sprite2D container state and child-parent propagation. */
@blue.define("Tr2Sprite2dContainerBase")
@blue.inherit(IListNotify)
@blue.interface(ITr2SpriteObject, IListNotify)
@blue.chainTo(Tr2SpriteObjectBase)
export class Tr2Sprite2dContainerBase extends Tr2SpriteObjectBase
{

  /** Wires native constructor-owned notifications for direct list edits. */
  constructor()
  {
    super();
    this.children.SetNotify(this);
    this.background.SetNotify(this);
  }

  /**
   * Carbon SetChildDirty (Tr2Sprite2dContainer.cpp:35-42): marks this
   * container dirty and passes the change up to its parent.
   *
   * @param {ITr2SpriteObject} _child The child that changed.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  SetChildDirty(_child)
  {
    this.isDirty = true;
    if (this._parent)
    {
      this._parent.SetChildDirty(this);
    }
  }

  /**
   * Carbon ~Tr2Sprite2dContainerBase (Tr2Sprite2dContainer.cpp:18-34): detaches
   * every background item, then every child, by setting its parent to null.
   *
   * Adapted: JS has no destructors and Carbon has no other teardown path for
   * this class, so the destructor body runs from an explicit Destroy, the
   * name this package uses for destructor stand-ins. A subclass Destroy must
   * call this one, as a C++ derived destructor runs its base destructor.
   *
   * @returns {void}
   */
  @meta.adapted
  Destroy()
  {
    for (const item of this.background)
    {
      if (item) item.SetParent(null);
    }

    for (const child of this.children)
    {
      if (child) child.SetParent(null);
    }
  }

  /** Carbon IList notification callback. */
  @blue.method
  @meta.implemented
  OnListModified(event, _key, _key2, value, list)
  {
    switch (event)
    {
      case BLUELISTEVENT.BELIST_INSERTED:
        if (value)
        {
          value.SetParent(this);
          this.SetChildDirty(value);
        }
        break;

      case BLUELISTEVENT.BELIST_REMOVED:
        if (value)
        {
          value.SetParent(null);
          this.SetChildDirty(value);
        }
        break;

      case BLUELISTEVENT.BELIST_UNLOADSTART:
        for (const child of list)
        {
          if (child)
          {
            child.SetParent(null);
          }
        }
        break;
    }
  }

  /** m_background (PITr2SpriteObjectVector) [READ] */
  @blue.read
  @type.list("ITr2SpriteObject")
  background = new BlueList(ITr2SpriteObject, { className: null, listOps: 0 });

  /** m_children (PITr2SpriteObjectVector) [READ] */
  @blue.read
  @type.list("ITr2SpriteObject")
  children = new BlueList(ITr2SpriteObject, { className: null, listOps: 0 });

  /** m_opacity (float) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.float32
  opacity = 1;

}
