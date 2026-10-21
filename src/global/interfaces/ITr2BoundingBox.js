import { IRoot } from "../blue/IRoot.js";
// Source: trinity/trinity/Include/ITr2BoundingBox.h
import { CjsSchema, blue, meta } from "../schema/index.js";


/**
 * Dependency-free contract for objects that publish a ready world-space axis-aligned bounding box.
 */
export class ITr2BoundingBox extends IRoot
{

    /** Writes the current world-space minimum and maximum bounds. */
    GetWorldBoundingBox(_minBounds, _maxBounds) {}

    /** Reports whether the provider can currently answer a bounds query. */
    IsBoundingBoxReady() {}
}

CjsSchema.decorateMethod(ITr2BoundingBox, "GetWorldBoundingBox", blue.abstract);
CjsSchema.decorateMethod(ITr2BoundingBox, "IsBoundingBoxReady", blue.abstract);
CjsSchema.exposure.interface("ITr2BoundingBox")(ITr2BoundingBox);
