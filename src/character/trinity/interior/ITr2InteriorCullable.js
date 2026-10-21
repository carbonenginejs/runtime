import { IRoot } from "#blue/IRoot";
// Source: trinity/trinity/Include/ITr2Interior.h
import { CjsSchema, blue } from "#schema";

/** Tests interior visibility and provides the object's world transform. */
export class ITr2InteriorCullable
{
  /** Tests the frustum and writes the object-to-world matrix. */
  IsInFrustum(_frustum, _objectToWorld) {}
}
CjsSchema.decorateMethod(ITr2InteriorCullable, "IsInFrustum", blue.abstract);
CjsSchema.exposure.interface("ITr2InteriorCullable")(ITr2InteriorCullable);

blue.inherit(IRoot)(ITr2InteriorCullable);
