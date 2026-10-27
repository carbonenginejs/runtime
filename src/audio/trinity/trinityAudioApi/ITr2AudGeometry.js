import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
// Source: trinityaudioapi/include/ITr2AudGeometry.h:23-40
import { meta } from "#schema";
/** Transfers Trinity geometry and placement to the audio implementation. */
@be.interface("ITr2AudGeometry")
@be.inherit(IRoot)
export class ITr2AudGeometry extends IRoot
{
  /** Registers a mesh instance using its shared geometry and world transform. */
  @meta.abstract
  SetGeometry(_geometrySetId, _instanceId, _geometryData, _worldTransform) {}

  /** Updates the world transform of an existing geometry instance. */
  @meta.abstract
  SetGeometryTransform(_geometrySetId, _instanceId, _worldTransform) {}

  /** Releases a geometry instance and its reference to the shared mesh. */
  @meta.abstract
  RemoveGeometry(_geometrySetId, _instanceId) {}
}
