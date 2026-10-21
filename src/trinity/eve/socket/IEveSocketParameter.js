import { IRoot } from "../../../global/blue/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/IEveSocketParameter.h
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { meta, blue } from "#schema";


/** Carbon socket-parameter contract with its interface defaults. */
@be.interface("IEveSocketParameter")
@blue.inherit(IInitialize)
export class IEveSocketParameter extends IRoot
{

  /** Returns Carbon's default empty socket-parameter name. */

  @meta.implemented
  GetName()
  {
    return "";
  }

  /** Applies an optional socket-parameter name. */

  @meta.noop
  SetName(_name)
  {
  }

  /** Initializes the socket parameter and reports success. */

  @meta.implemented
  Initialize()
  {
    return true;
  }

  /** Clears any bindings owned by the socket parameter. */

  @meta.noop
  ClearBindings()
  {
  }

  /** Binds an external parameter and reports success. */

  @meta.implemented
  BindToExternalParameter(_externalParameter)
  {
    return true;
  }

  /** Resets the socket parameter. */

  @meta.noop
  Reset()
  {
  }

  /** Restores the socket parameter's default value. */

  @meta.noop
  SetValueToDefault()
  {
  }

  /** Reports whether Carbon considers the socket parameter used. */

  @meta.implemented
  Used()
  {
    return true;
  }

  /** Propagates the current value to owned bindings. */

  @meta.noop
  Propagate()
  {
  }

}
