// Source: trinity/trinity/Eve/SpaceObject/Utils/fxAttributes/IEveFxAttribute.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Required EVE effect-attribute update contract. */
@type.define({ className: "IEveFxAttribute", family: "eve/spaceObject" })
export class IEveFxAttribute extends CjsModel
{

  /** Updates effect attributes during the asynchronous graph phase. */
  @carbon.method
  @impl.abstract
  UpdateAsyncronous(_updateContext)
  {
    throw new Error("IEveFxAttribute.UpdateAsyncronous must be implemented by a concrete attribute set.");
  }

}
