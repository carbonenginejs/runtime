import { exposure as be } from "#be";
import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/fxAttributes/IEveFxAttribute.h
import { blue } from "#schema";


/** Required EVE effect-attribute update contract. */
@be.interface("IEveFxAttribute")
@blue.inherit(IRoot)
export class IEveFxAttribute
{

  /** Updates effect attributes during the asynchronous graph phase. */
  @blue.abstract
  UpdateAsyncronous(_updateContext) {}

}
