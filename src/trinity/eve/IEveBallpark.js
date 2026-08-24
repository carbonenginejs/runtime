// Source: trinity/trinity/Include/IEveBallpark.h
import { carbon, impl, type } from "#schema";
import { IEveReferencePoint } from "./IEveReferencePoint.js";


/** Required host ballpark contract used by EVE scene updates. */
@type.define({ className: "IEveBallpark", family: "eve" })
export class IEveBallpark extends IEveReferencePoint
{

  /** Writes the current and smoothed reference-point deltas for a time. */
  @carbon.method
  @impl.abstract
  Delta(_time, _referencePoint, _smoothedReferencePoint)
  {
    throw new Error("IEveBallpark.Delta must be implemented by a concrete ballpark.");
  }

  /** Writes the reference-point velocity delta for a time. */
  @carbon.method
  @impl.abstract
  DeltaVel(_time, _velocity)
  {
    throw new Error("IEveBallpark.DeltaVel must be implemented by a concrete ballpark.");
  }

  /** Returns the ballpark unit scale. */
  @carbon.method
  @impl.abstract
  GetUnitBase()
  {
    throw new Error("IEveBallpark.GetUnitBase must be implemented by a concrete ballpark.");
  }

  /** Sets the ballpark unit scale. */
  @carbon.method
  @impl.abstract
  SetUnitBase(_unit)
  {
    throw new Error("IEveBallpark.SetUnitBase must be implemented by a concrete ballpark.");
  }

}
