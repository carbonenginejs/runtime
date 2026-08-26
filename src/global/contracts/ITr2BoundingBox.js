import { CjsSchema, impl } from "../schema/index.js";


const ITR2_BOUNDING_BOX = Symbol.for("carbonenginejs.contract.ITr2BoundingBox");


/**
 * Dependency-free contract for objects that publish a ready world-space axis-aligned bounding box.
 */
export class ITr2BoundingBox
{
    static [Symbol.hasInstance](value)
    {
        return value !== null && value !== undefined && value[ITR2_BOUNDING_BOX] === true;
    }

    /** Writes the current world-space minimum and maximum bounds. */
    GetWorldBoundingBox(_minBounds, _maxBounds)
    {
        throw new Error("ITr2BoundingBox.GetWorldBoundingBox must be implemented by a bounding-box provider.");
    }

    /** Reports whether the provider can currently answer a bounds query. */
    IsBoundingBoxReady()
    {
        throw new Error("ITr2BoundingBox.IsBoundingBoxReady must be implemented by a bounding-box provider.");
    }
}

Object.defineProperty(ITr2BoundingBox.prototype, ITR2_BOUNDING_BOX, { value: true });

CjsSchema.decorateMethod(ITr2BoundingBox, "GetWorldBoundingBox", impl.abstract);
CjsSchema.decorateMethod(ITr2BoundingBox, "IsBoundingBoxReady", impl.abstract);
CjsSchema.define(ITr2BoundingBox, { className: "ITr2BoundingBox" });


/**
 * Adds the dependency-free ITr2BoundingBox contract to an existing model base
 * without replacing that base's JavaScript inheritance chain.
 */
export function withITr2BoundingBox(Base)
{
    const Provider = class extends Base
    {
        /** Delegates to the required world-bounds implementation. */
        GetWorldBoundingBox(minBounds, maxBounds)
        {
            return ITr2BoundingBox.prototype.GetWorldBoundingBox.call(this, minBounds, maxBounds);
        }

        /** Delegates to the required bounds-readiness implementation. */
        IsBoundingBoxReady()
        {
            return ITr2BoundingBox.prototype.IsBoundingBoxReady.call(this);
        }
    }

    Object.defineProperty(Provider.prototype, ITR2_BOUNDING_BOX, { value: true });
    CjsSchema.decorateMethod(Provider, "GetWorldBoundingBox", impl.abstract);
    CjsSchema.decorateMethod(Provider, "IsBoundingBoxReady", impl.abstract);
    return Provider;
}
