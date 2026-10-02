// Source: trinity/trinity/Include/ITr2Interior.h
import { CjsSchema, meta } from "#schema";

/** Tests interior visibility and provides the object's world transform. */
export class ITr2InteriorCullable
{
  /** Tests the frustum and writes the object-to-world matrix. */
  IsInFrustum(_frustum, _objectToWorld) {}
}
CjsSchema.decorateMethod(ITr2InteriorCullable, "IsInFrustum", meta.compose.abstract, meta.impl.abstract);
CjsSchema.define(ITr2InteriorCullable, {
  className: "ITr2InteriorCullable", carbon: "ITr2InteriorCullable", family: "interior", fields: {}
});
