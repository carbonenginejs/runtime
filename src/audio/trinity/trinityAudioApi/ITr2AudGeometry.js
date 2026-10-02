// Source: trinityaudioapi/include/ITr2AudGeometry.h:23-40
import { CjsSchema, meta } from "#schema";

/** Transfers Trinity geometry and placement to the audio implementation. */
export class ITr2AudGeometry
{
  /** Registers a mesh instance using its shared geometry and world transform. */
  SetGeometry(_geometrySetId, _instanceId, _geometryData, _worldTransform)
  {
    throw new Error("ITr2AudGeometry.SetGeometry must be implemented.");
  }

  /** Updates the world transform of an existing geometry instance. */
  SetGeometryTransform(_geometrySetId, _instanceId, _worldTransform)
  {
    throw new Error("ITr2AudGeometry.SetGeometryTransform must be implemented.");
  }

  /** Releases a geometry instance and its reference to the shared mesh. */
  RemoveGeometry(_geometrySetId, _instanceId)
  {
    throw new Error("ITr2AudGeometry.RemoveGeometry must be implemented.");
  }
}

for (const method of [ "SetGeometry", "SetGeometryTransform", "RemoveGeometry" ])
{
  CjsSchema.decorateMethod(ITr2AudGeometry, method, meta.abstract);
}
CjsSchema.define(ITr2AudGeometry, { className: "ITr2AudGeometry", family: "trinityAudioApi" });
