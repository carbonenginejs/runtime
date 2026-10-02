// Source: trinity/trinity/Include/IEveReferencePoint.h
import { meta } from "#schema";


/** Required time-varying world reference-point contract. */
@meta.define({ className: "IEveReferencePoint", family: "eve" })
export class IEveReferencePoint
{

  /** Writes the world reference point for the requested time. */
  @meta.blue.method
  @meta.abstract
  GetReferencePoint(_time, _out)
  {
    throw new Error("IEveReferencePoint.GetReferencePoint must be implemented by a concrete reference point.");
  }

}
