import { exposure as be } from "#be";
import { IRoot } from "#blueexposure/IRoot";
// Source: trinityaudioapi/include/ITr2AudGeometry.h:23-40

/** Transfers Trinity geometry and placement to the audio implementation. */
@be.interface("ITr2AudGeometry")
@be.inherit(IRoot)
export class ITr2AudGeometry extends IRoot
{
  /**
   * Registers a mesh instance using its shared geometry and world transform.
   *
   * @abstract
   */
  @be.abstract
  SetGeometry(geometrySetId, instanceId, geometryData, worldTransform) {}

  /**
   * Updates the world transform of an existing geometry instance.
   *
   * @abstract
   */
  @be.abstract
  SetGeometryTransform(geometrySetId, instanceId, worldTransform) {}

  /**
   * Releases a geometry instance and its reference to the shared mesh.
   *
   * @abstract
   */
  @be.abstract
  RemoveGeometry(geometrySetId, instanceId) {}
}
