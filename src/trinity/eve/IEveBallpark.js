import { exposure as be } from "#be";
// Source: trinity/trinity/Include/IEveBallpark.h
import { IEveReferencePoint } from "./IEveReferencePoint.js";


/** Required host ballpark contract used by EVE scene updates. */
@be.interface("IEveBallpark")
export class IEveBallpark extends IEveReferencePoint
{

  /**
   * Writes the current and smoothed reference-point deltas for a time.
   *
   * @abstract
   */
  @be.abstract
  Delta(_time, _referencePoint, _smoothedReferencePoint) {}

  /**
   * Writes the reference-point velocity delta for a time.
   *
   * @abstract
   */
  @be.abstract
  DeltaVel(_time, _velocity) {}

  /**
   * Returns the ballpark unit scale.
   *
   * @abstract
   */
  @be.abstract
  GetUnitBase() {}

  /**
   * Sets the ballpark unit scale.
   *
   * @abstract
   */
  @be.abstract
  SetUnitBase(_unit) {}

}
