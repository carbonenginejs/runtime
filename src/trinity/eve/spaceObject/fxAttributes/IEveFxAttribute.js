// Source: trinity/trinity/Eve/SpaceObject/Utils/fxAttributes/IEveFxAttribute.h
import { meta, blue } from "#schema";


/** Required EVE effect-attribute update contract. */
@blue.define("IEveFxAttribute")
export class IEveFxAttribute
{

  /** Updates effect attributes during the asynchronous graph phase. */
  @blue.method
  @meta.abstract
  UpdateAsyncronous(_updateContext)
  {
    throw new Error("IEveFxAttribute.UpdateAsyncronous must be implemented by a concrete attribute set.");
  }

}
