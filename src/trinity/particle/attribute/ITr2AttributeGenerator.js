// Source: trinity/trinity/ITr2AttributeGenerator.h
import { meta } from "#schema";


/** Required particle-attribute generation contract. */
@meta.define({ className: "ITr2AttributeGenerator", family: "particle" })
export class ITr2AttributeGenerator
{

  /** Binds this generator to a particle-system declaration. */
  @meta.blue.method
  @meta.abstract
  Bind(_particleSystem, _boundElements)
  {
    throw new Error("ITr2AttributeGenerator.Bind must be implemented by a concrete generator.");
  }

  /** Writes this generator's attribute values for one particle. */
  @meta.blue.method
  @meta.abstract
  Generate(_position, _velocity, _index)
  {
    throw new Error("ITr2AttributeGenerator.Generate must be implemented by a concrete generator.");
  }

}
