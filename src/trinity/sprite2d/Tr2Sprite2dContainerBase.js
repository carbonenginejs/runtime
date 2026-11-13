// Source: trinity/trinity/Sprite2d/Tr2Sprite2dContainer.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dContainer.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dContainer_Blue.cpp
import { exposure as be } from "#be";
// Promoted to hand-maintained source 2026-08-22; portable child ownership is maintained here.
import { type } from "#schema";
import { BlueList, IListNotify } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";
import { ITr2SpriteObject } from "./ITr2SpriteObject.js";
import { Tr2SpriteObjectBase } from "./Tr2SpriteObjectBase.js";

/**
 * Shared Sprite2D container state and child-parent propagation.
 *
 * @abstract
 */
@be.define({
  name: "Tr2Sprite2dContainerBase",
  inherit: [ IListNotify ],
  // Tr2Sprite2dContainer_Blue.cpp:11-35, in Carbon's order.
  interfaces: [ ITr2SpriteObject, IListNotify ],
  members: [
    [ be.ATTR, "children", be.READ ],
    [ be.ATTR, "background", be.READ ],
    [ be.ATTR, "opacity", be.READWRITE | be.NOTIFY ]
  ],
  chainTo: Tr2SpriteObjectBase
})
@be.abstract
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
   * @implemented
   * @param {ITr2SpriteObject} _child The child that changed.
   * @returns {void}
   */

  SetChildDirty(_child)
  {
    this.isDirty = true;
    if (this._parent)
    {
      this._parent.SetChildDirty(this);
    }
  }

  /**
   * Detaches background items and children by setting their parent to null.
   * Carbon: ~Tr2Sprite2dContainerBase (trinity/trinity/Sprite2d/Tr2Sprite2dContainer.cpp:18-34).
   * @adapted Explicit observer detach replaces implicit BlueList destruction (blueexposure/include/BlueListUtil.h:198-204); authored lists remain retained.
   * @returns {void}
   */
  _Destructor()
  {
    for (const item of this.background)
    {
      if (item) item.SetParent(null);
    }

    for (const child of this.children)
    {
      if (child) child.SetParent(null);
    }
    this.background.SetNotify(null);
    this.children.SetNotify(null);
  }

  /**
   * Carbon IList notification callback.
   * Carbon declaration: Tr2Sprite2dContainerBase::OnListModified (trinity/trinity/Sprite2d/Tr2Sprite2dContainer.h:28).
   *
   * @implemented
   */
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
  @type.list("ITr2SpriteObject")
  background = new BlueList(ITr2SpriteObject, { className: null, listOps: 0 });

  /** m_children (PITr2SpriteObjectVector) [READ] */
  @type.list("ITr2SpriteObject")
  children = new BlueList(ITr2SpriteObject, { className: null, listOps: 0 });

  /** m_opacity (float) [READWRITE, NOTIFY] */

  @type.float32
  opacity = 1;

}
