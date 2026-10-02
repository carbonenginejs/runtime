// Source: trinity/trinity/Eve/SpaceObject/Utils/fxAttributes/IEveFxAttribute.h
import { meta } from "#schema";


/** Required EVE effect-attribute update contract. */
@meta.define({ className: "IEveFxAttribute", family: "eve/spaceObject" })
export class IEveFxAttribute
{

  /** Updates effect attributes during the asynchronous graph phase. */
  @meta.blue.method
  @meta.abstract
  UpdateAsyncronous(_updateContext)
  {
    throw new Error("IEveFxAttribute.UpdateAsyncronous must be implemented by a concrete attribute set.");
  }

}
