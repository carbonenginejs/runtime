// Source: trinity/trinity/Include/IEveReferencePoint.h
import { meta, blue } from "#schema";


/** Required time-varying world reference-point contract. */
@blue.define("IEveReferencePoint")
export class IEveReferencePoint
{

  /** Writes the world reference point for the requested time. */
  @blue.method
  @meta.abstract
  GetReferencePoint(_time, _out)
  {
    throw new Error("IEveReferencePoint.GetReferencePoint must be implemented by a concrete reference point.");
  }

}
