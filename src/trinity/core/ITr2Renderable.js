import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/ITr2Renderable.h

/**
 * Trinity-owned contract for objects collected through the renderable path.
 *
 * `IsVisible` keeps Carbon's concrete default; the four batch, transparency,
 * sort-value and per-object-data methods throw on this root. Carbon's direct
 * providers take the interface through `@carbon.inherit(ITr2Renderable)`, so
 * their model ancestry is unchanged. The batch map, `CjsBatchManager` and the
 * `ReflectionRenderable` component registration call or validate this
 * interface directly rather than probing for methods.
 */
@be.interface("ITr2Renderable")
export class ITr2Renderable extends IRoot
{

  /** Carbon's default visibility answer for a renderable. */
  IsVisible(_updateContext)
  {
    return true;
  }

  /** Emits batches of the requested type. */
  @be.abstract
  GetBatches(batches, batchType, perObjectData, reason) {}

  /** Reports whether a transparent pass is required. */
  @be.abstract
  HasTransparentBatches() {}

  /** Returns the current transparent-sort value. */
  @be.abstract
  GetSortValue() {}

  /** Returns or allocates the renderable's per-object data. */
  @be.abstract
  GetPerObjectData(accumulator) {}
}
