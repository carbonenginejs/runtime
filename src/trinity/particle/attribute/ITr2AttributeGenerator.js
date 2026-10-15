// Source: trinity/trinity/ITr2AttributeGenerator.h
import { meta, blue } from "#schema";


/** Required particle-attribute generation contract. */
@blue.define("ITr2AttributeGenerator")
export class ITr2AttributeGenerator
{

  /** Binds this generator to a particle-system declaration. */
  @blue.method
  @meta.abstract
  Bind(_particleSystem, _boundElements)
  {
    throw new Error("ITr2AttributeGenerator.Bind must be implemented by a concrete generator.");
  }

  /** Writes this generator's attribute values for one particle. */
  @blue.method
  @meta.abstract
  Generate(_position, _velocity, _index)
  {
    throw new Error("ITr2AttributeGenerator.Generate must be implemented by a concrete generator.");
  }

}
