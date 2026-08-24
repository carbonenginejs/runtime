// Source: trinity/trinity/Include/IEveReferencePoint.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Required time-varying world reference-point contract. */
@type.define({ className: "IEveReferencePoint", family: "eve" })
export class IEveReferencePoint extends CjsModel
{

  /** Writes the world reference point for the requested time. */
  @carbon.method
  @impl.abstract
  GetReferencePoint(_time, _out)
  {
    throw new Error("IEveReferencePoint.GetReferencePoint must be implemented by a concrete reference point.");
  }

}
