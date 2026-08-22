// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dContainer.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dContainer.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dContainer_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; portable child ownership is maintained here.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2SpriteObjectBase } from "./Tr2SpriteObjectBase.js";

const BELIST_UNLOADSTART = 0x07;
const BELIST_INSERTED = 0x08;
const BELIST_REMOVED = 0x09;

/** Shared Sprite2D container state and child-parent propagation. */
@type.define({ className: "Tr2Sprite2dContainerBase", family: "sprite2d" })
export class Tr2Sprite2dContainerBase extends Tr2SpriteObjectBase
{

  /** Carbon method SetChildDirty. */
  @carbon.method
  @impl.implemented
  SetChildDirty(_child)
  {
    super.SetDirty();
  }

  /** Carbon IList notification callback. */
  @carbon.method
  @impl.implemented
  OnListModified(event, _key, _key2, value, list)
  {
    switch (event)
    {
      case BELIST_INSERTED:
        if (value)
        {
          value.SetParent(this);
          this.SetChildDirty(value);
        }
        break;

      case BELIST_REMOVED:
        if (value)
        {
          value.SetParent(null);
          this.SetChildDirty(value);
        }
        break;

      case BELIST_UNLOADSTART:
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
  @io.read
  @type.list("ITr2SpriteObject")
  background = [];

  /** m_children (PITr2SpriteObjectVector) [READ] */
  @io.read
  @type.list("ITr2SpriteObject")
  children = [];

  /** m_opacity (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  opacity = 1;

}
