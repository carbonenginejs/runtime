// Source: E:\carbonengine\trinity\trinity\TriRect.h
// Source: E:\carbonengine\trinity\trinity\TriRect.cpp
// Source: E:\carbonengine\trinity\trinity\TriRect_Blue.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


/** An integer screen rectangle given by its left, top, right and bottom edges. */
@type.define({
  className: "TriRect",
  family: "trinityCore"
})
export class TriRect extends CjsModel
{
  @io.persist
  @type.int32
  left = 0;

  @io.persist
  @type.int32
  top = 0;

  @io.persist
  @type.int32
  right = 0;

  @io.persist
  @type.int32
  bottom = 0;

  /**
   * Python-style constructor hook; assigns all four edges, each defaulting to
   * zero.
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
   * current value.
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
