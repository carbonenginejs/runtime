// Source: trinity/trinity/ITr2AttributeGenerator.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Required particle-attribute generation contract. */
@type.define({ className: "ITr2AttributeGenerator", family: "particle" })
export class ITr2AttributeGenerator extends CjsModel
{

  /** Binds this generator to a particle-system declaration. */
  @carbon.method
  @impl.abstract
  Bind(_particleSystem, _boundElements)
  {
    throw new Error("ITr2AttributeGenerator.Bind must be implemented by a concrete generator.");
  }

  /** Writes this generator's attribute values for one particle. */
  @carbon.method
  @impl.abstract
  Generate(_position, _velocity, _index)
  {
    throw new Error("ITr2AttributeGenerator.Generate must be implemented by a concrete generator.");
  }

}
