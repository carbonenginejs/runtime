// Source: trinity/trinity/Eve/Volume/IEveVolume.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Required EVE volume contract. */
@type.define({ className: "IEveVolume", family: "eve/volume" })
export class IEveVolume extends CjsModel
{

  /** Returns the volume intensity at a position. */
  @carbon.method
  @impl.abstract
  GetIntensity(_position)
  {
    throw new Error("IEveVolume.GetIntensity must be implemented by a concrete volume.");
  }

  /** Registers a listener for volume changes and returns its identifier. */
  @carbon.method
  @impl.abstract
  RegisterForChanges(_listener)
  {
    throw new Error("IEveVolume.RegisterForChanges must be implemented by a concrete volume.");
  }

  /** Removes a previously registered volume-change listener. */
  @carbon.method
  @impl.abstract
  UnregisterForChanges(_listener)
  {
    throw new Error("IEveVolume.UnregisterForChanges must be implemented by a concrete volume.");
  }

  /** Generates caller-owned sample points inside the volume. */
  @carbon.method
  @impl.abstract
  GeneratePointsInVolume(_count, _out)
  {
    throw new Error("IEveVolume.GeneratePointsInVolume must be implemented by a concrete volume.");
  }

  /** Renders volume debug information through the supplied renderer. */
  @carbon.method
  @impl.abstract
  RenderDebugInfo(_debugRenderer)
  {
    throw new Error("IEveVolume.RenderDebugInfo must be implemented by a concrete volume.");
  }

  /** Writes the volume's current bounding sphere. */
  @carbon.method
  @impl.abstract
  GetBoundingSphere(_out)
  {
    throw new Error("IEveVolume.GetBoundingSphere must be implemented by a concrete volume.");
  }

}
