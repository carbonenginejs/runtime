// Source: trinity/trinity/Include/IEveBallpark.h
import { blue } from "#schema";
import { IEveReferencePoint } from "./IEveReferencePoint.js";


/** Required host ballpark contract used by EVE scene updates. */
@blue.define("IEveBallpark")
export class IEveBallpark extends IEveReferencePoint
{

  /** Writes the current and smoothed reference-point deltas for a time. */
  @blue.abstract
  Delta(_time, _referencePoint, _smoothedReferencePoint) {}

  /** Writes the reference-point velocity delta for a time. */
  @blue.abstract
  DeltaVel(_time, _velocity) {}

  /** Returns the ballpark unit scale. */
  @blue.abstract
  GetUnitBase() {}

  /** Sets the ballpark unit scale. */
  @blue.abstract
  SetUnitBase(_unit) {}

}
