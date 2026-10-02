// Source: trinity/trinity/TriRect.h
// Source: trinity/trinity/TriRect.cpp
// Source: trinity/trinity/TriRect_Blue.cpp
import { carbon, impl, edit, type } from "#schema";


/**
 * An integer screen rectangle given by its left, top, right and bottom edges.
 * Native storage comes from a plain four-int Tr2Rect struct, represented here
 * by direct fields. The native query table contains only IPythonMethods, whose
 * Python host bridge is unavailable in JavaScript. The supported query table
 * is therefore empty, not a claim of complete native interface parity. Neither
 * the native concrete self query nor a model-service base is exposed.
 */
@type.define({
  className: "TriRect",
  family: "trinityCore"
})
export class TriRect
{
  /** Stored signed left edge. */
  @edit.readwrite
  @edit.persist
  @type.int32
  left = 0;

  /** Stored signed top edge. */
  @edit.readwrite
  @edit.persist
  @type.int32
  top = 0;

  /** Stored signed right edge. */
  @edit.readwrite
  @edit.persist
  @type.int32
  right = 0;

  /** Stored signed bottom edge. */
  @edit.readwrite
  @edit.persist
  @type.int32
  bottom = 0;

  /**
   * Python-style constructor hook; assigns all four edges, each defaulting to
   * zero. JavaScript defaults adapt the exposed native SetDimentions wrapper;
   * direct assignments retain the existing JavaScript number representation.
   */
  @carbon.method
  @impl.adapted
  __init__(left = 0, top = 0, right = 0, bottom = 0)
  {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
  }

  /**
   * Assigns the supplied edges, leaving any edge passed as undefined at its
   * current value. This is the exposed native PySetRect optional-argument
   * wrapper, using undefined instead of Be::Optional assignment state; it is
   * not the unexposed native SetRect(Tr2Rect*) overload.
   */
  @carbon.method
  @impl.adapted
  SetRect(left, top, right, bottom)
  {
    if (left !== undefined)
    {
      this.left = left;
    }
    if (top !== undefined)
    {
      this.top = top;
    }
    if (right !== undefined)
    {
      this.right = right;
    }
    if (bottom !== undefined)
    {
      this.bottom = bottom;
    }
  }
}

// Native maps IPythonMethods only; that host-specific bridge is unavailable.
carbon.interfaceTable({ interfaces: [], chainTo: null })(TriRect);
