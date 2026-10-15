// Source: trinity/trinity/Include/IEveBallpark.h
import { meta, blue } from "#schema";
import { IEveReferencePoint } from "./IEveReferencePoint.js";


/** Required host ballpark contract used by EVE scene updates. */
@blue.define("IEveBallpark")
export class IEveBallpark extends IEveReferencePoint
{

  /** Writes the current and smoothed reference-point deltas for a time. */
  @blue.method
  @meta.abstract
  Delta(_time, _referencePoint, _smoothedReferencePoint)
  {
    throw new Error("IEveBallpark.Delta must be implemented by a concrete ballpark.");
  }

  /** Writes the reference-point velocity delta for a time. */
  @blue.method
  @meta.abstract
  DeltaVel(_time, _velocity)
  {
    throw new Error("IEveBallpark.DeltaVel must be implemented by a concrete ballpark.");
  }

  /** Returns the ballpark unit scale. */
  @blue.method
  @meta.abstract
  GetUnitBase()
  {
    throw new Error("IEveBallpark.GetUnitBase must be implemented by a concrete ballpark.");
  }

  /** Sets the ballpark unit scale. */
  @blue.method
  @meta.abstract
  SetUnitBase(_unit)
  {
    throw new Error("IEveBallpark.SetUnitBase must be implemented by a concrete ballpark.");
  }

}
