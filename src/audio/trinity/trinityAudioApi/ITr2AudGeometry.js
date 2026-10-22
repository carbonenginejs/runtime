import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
// Source: trinityaudioapi/include/ITr2AudGeometry.h:23-40
import { CjsSchema, meta } from "#schema";

/** Transfers Trinity geometry and placement to the audio implementation. */
export class ITr2AudGeometry extends IRoot
{
  /** Registers a mesh instance using its shared geometry and world transform. */
  SetGeometry(_geometrySetId, _instanceId, _geometryData, _worldTransform) {}

  /** Updates the world transform of an existing geometry instance. */
  SetGeometryTransform(_geometrySetId, _instanceId, _worldTransform) {}

  /** Releases a geometry instance and its reference to the shared mesh. */
  RemoveGeometry(_geometrySetId, _instanceId) {}
}

for (const method of [ "SetGeometry", "SetGeometryTransform", "RemoveGeometry" ])
{
  CjsSchema.decorateMethod(ITr2AudGeometry, method, meta.abstract);
}
be.inherit(IRoot)(ITr2AudGeometry);
CjsSchema.exposure.interface("ITr2AudGeometry")(ITr2AudGeometry);
