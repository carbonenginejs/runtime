import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/ITr2AttributeGenerator.h
import { blue } from "#schema";


/** Required particle-attribute generation contract. */
@blue.inherit(IRoot)
@blue.define("ITr2AttributeGenerator")
export class ITr2AttributeGenerator
{

  /** Binds this generator to a particle-system declaration. */
  @blue.abstract
  Bind(_particleSystem, _boundElements) {}

  /** Writes this generator's attribute values for one particle. */
  @blue.abstract
  Generate(_position, _velocity, _index) {}

}
