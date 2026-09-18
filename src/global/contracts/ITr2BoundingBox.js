import { CjsSchema, impl } from "../schema/index.js";


/**
 * Dependency-free contract for objects that publish a ready world-space axis-aligned bounding box.
 */
export class ITr2BoundingBox
{

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

CjsSchema.decorateMethod(ITr2BoundingBox, "GetWorldBoundingBox", impl.abstract);
CjsSchema.decorateMethod(ITr2BoundingBox, "IsBoundingBoxReady", impl.abstract);
CjsSchema.define(ITr2BoundingBox, { className: "ITr2BoundingBox" });
