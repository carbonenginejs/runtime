// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/IEveSocketParameter.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Carbon socket-parameter contract with its interface defaults. */
@type.define({ className: "IEveSocketParameter", family: "eve/socket" })
export class IEveSocketParameter extends CjsModel
{

  /** Returns Carbon's default empty socket-parameter name. */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return "";
  }

  /** Applies an optional socket-parameter name. */
  @carbon.method
  @impl.noop
  SetName(_name)
  {
  }

  /** Initializes the socket parameter and reports success. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    return true;
  }

  /** Clears any bindings owned by the socket parameter. */
  @carbon.method
  @impl.noop
  ClearBindings()
  {
  }

  /** Binds an external parameter and reports success. */
  @carbon.method
  @impl.implemented
  BindToExternalParameter(_externalParameter)
  {
    return true;
  }

  /** Resets the socket parameter. */
  @carbon.method
  @impl.noop
  Reset()
  {
  }

  /** Restores the socket parameter's default value. */
  @carbon.method
  @impl.noop
  SetValueToDefault()
  {
  }

  /** Reports whether Carbon considers the socket parameter used. */
  @carbon.method
  @impl.implemented
  Used()
  {
    return true;
  }

  /** Propagates the current value to owned bindings. */
  @carbon.method
  @impl.noop
  Propagate()
  {
  }

}
