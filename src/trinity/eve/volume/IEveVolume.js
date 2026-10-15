// Source: trinity/trinity/Eve/Volume/IEveVolume.h
import { meta, blue } from "#schema";


/** Required EVE volume contract. */
@blue.define("IEveVolume")
export class IEveVolume
{

  /** Returns the volume intensity at a position. */
  @blue.method
  @meta.abstract
  GetIntensity(_position)
  {
    throw new Error("IEveVolume.GetIntensity must be implemented by a concrete volume.");
  }

  /** Registers a listener for volume changes and returns its identifier. */
  @blue.method
  @meta.abstract
  RegisterForChanges(_listener)
  {
    throw new Error("IEveVolume.RegisterForChanges must be implemented by a concrete volume.");
  }

  /** Removes a previously registered volume-change listener. */
  @blue.method
  @meta.abstract
  UnregisterForChanges(_listener)
  {
    throw new Error("IEveVolume.UnregisterForChanges must be implemented by a concrete volume.");
  }

  /** Generates caller-owned sample points inside the volume. */
  @blue.method
  @meta.abstract
  GeneratePointsInVolume(_count, _out)
  {
    throw new Error("IEveVolume.GeneratePointsInVolume must be implemented by a concrete volume.");
  }

  /** Renders volume debug information through the supplied renderer. */
  @blue.method
  @meta.abstract
  RenderDebugInfo(_debugRenderer)
  {
    throw new Error("IEveVolume.RenderDebugInfo must be implemented by a concrete volume.");
  }

  /** Writes the volume's current bounding sphere. */
  @blue.method
  @meta.abstract
  GetBoundingSphere(_out)
  {
    throw new Error("IEveVolume.GetBoundingSphere must be implemented by a concrete volume.");
  }

}
