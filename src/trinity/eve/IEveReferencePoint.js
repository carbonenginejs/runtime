import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Include/IEveReferencePoint.h
import { blue } from "#schema";


/** Required time-varying world reference-point contract. */
@be.interface("IEveReferencePoint")
@blue.inherit(IRoot)

export class IEveReferencePoint
{

  /** Writes the world reference point for the requested time. */
  @blue.abstract
  GetReferencePoint(_time, _out) {}

}
