import { IRoot } from "../../../global/blue/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/IEveSocketParameter.h
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { meta } from "#schema";


/** Carbon socket-parameter contract with its interface defaults. */
@be.interface("IEveSocketParameter")
@be.inherit(IInitialize)
export class IEveSocketParameter extends IRoot
{

  /**
   * Returns Carbon's default empty socket-parameter name.
   *
   * @implemented
   */

  @meta.implemented
  GetName()
  {
    return "";
  }

  /**
   * Applies an optional socket-parameter name.
   *
   * @adapted
   */

  @meta.adapted
  SetName(_name)
  {
  }

  /**
   * Initializes the socket parameter and reports success.
   *
   * @implemented
   */

  @meta.implemented
  Initialize()
  {
    return true;
  }

  /**
   * Clears any bindings owned by the socket parameter.
   *
   * @adapted
   */

  @meta.adapted
  ClearBindings()
  {
  }

  /**
   * Binds an external parameter and reports success.
   *
   * @implemented
   */

  @meta.implemented
  BindToExternalParameter(_externalParameter)
  {
    return true;
  }

  /**
   * Resets the socket parameter.
   *
   * @adapted
   */

  @meta.adapted
  Reset()
  {
  }

  /**
   * Restores the socket parameter's default value.
   *
   * @adapted
   */

  @meta.adapted
  SetValueToDefault()
  {
  }

  /**
   * Reports whether Carbon considers the socket parameter used.
   *
   * @implemented
   */

  @meta.implemented
  Used()
  {
    return true;
  }

  /**
   * Propagates the current value to owned bindings.
   *
   * @adapted
   */

  @meta.adapted
  Propagate()
  {
  }

}
