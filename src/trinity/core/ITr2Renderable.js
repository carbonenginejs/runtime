// Source: trinity/trinity/ITr2Renderable.h
import { CjsSchema, impl } from "#schema";


const ITR2_RENDERABLE = Symbol.for("carbonenginejs.contract.ITr2Renderable");


/**
 * Trinity-owned contract for objects collected through the renderable path.
 */
export class ITr2Renderable
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITR2_RENDERABLE] === true;
  }

  /** Carbon's default visibility answer for a renderable. */
  IsVisible(_updateContext)
  {
    return true;
  }

  /** Emits batches of the requested type. */
  GetBatches(_accumulator, _batchType, _perObjectData, _reason, _renderContext)
  {
    throw new Error("ITr2Renderable.GetBatches must be implemented by a renderable.");
  }

  /** Reports whether a transparent pass is required. */
  HasTransparentBatches()
  {
    throw new Error("ITr2Renderable.HasTransparentBatches must be implemented by a renderable.");
  }

  /** Returns the current transparent-sort value. */
  GetSortValue(_renderContext)
  {
    throw new Error("ITr2Renderable.GetSortValue must be implemented by a renderable.");
  }

  /** Returns or allocates the renderable's per-object data. */
  GetPerObjectData(_accumulator)
  {
    throw new Error("ITr2Renderable.GetPerObjectData must be implemented by a renderable.");
  }
}

Object.defineProperty(ITr2Renderable.prototype, ITR2_RENDERABLE, { value: true });

for (const method of [
  "GetBatches",
  "HasTransparentBatches",
  "GetSortValue",
  "GetPerObjectData"
])
{
  CjsSchema.decorateMethod(ITr2Renderable, method, impl.abstract);
}
CjsSchema.define(ITr2Renderable, { className: "ITr2Renderable" });


/**
 * Adds the nominal ITr2Renderable contract to an existing model base without
 * replacing that base's JavaScript inheritance chain.
 */
export function withITr2Renderable(Base)
{
  const Provider = class extends Base
  {
    /** Uses Carbon's default visibility result. */
    IsVisible(updateContext)
    {
      return ITr2Renderable.prototype.IsVisible.call(this, updateContext);
    }

    /** Delegates to the required batch implementation. */
    GetBatches(accumulator, batchType, perObjectData, reason, renderContext)
    {
      return ITr2Renderable.prototype.GetBatches.call(
        this, accumulator, batchType, perObjectData, reason, renderContext);
    }

    /** Delegates to the required transparent-batch implementation. */
    HasTransparentBatches()
    {
      return ITr2Renderable.prototype.HasTransparentBatches.call(this);
    }

    /** Delegates to the required sort implementation. */
    GetSortValue(renderContext)
    {
      return ITr2Renderable.prototype.GetSortValue.call(this, renderContext);
    }

    /** Delegates to the required per-object-data implementation. */
    GetPerObjectData(accumulator)
    {
      return ITr2Renderable.prototype.GetPerObjectData.call(this, accumulator);
    }
  };

  Object.defineProperty(Provider.prototype, ITR2_RENDERABLE, { value: true });
  for (const method of [
    "GetBatches",
    "HasTransparentBatches",
    "GetSortValue",
    "GetPerObjectData"
  ])
  {
    CjsSchema.decorateMethod(Provider, method, impl.abstract);
  }
  return Provider;
}
