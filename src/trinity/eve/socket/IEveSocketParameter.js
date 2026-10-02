// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/IEveSocketParameter.h
import { meta } from "#schema";


/** Carbon socket-parameter contract with its interface defaults. */
@meta.define({ className: "IEveSocketParameter", family: "eve/socket" })
export class IEveSocketParameter
{

  /** Returns Carbon's default empty socket-parameter name. */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return "";
  }

  /** Applies an optional socket-parameter name. */
  @meta.blue.method
  @meta.noop
  SetName(_name)
  {
  }

  /** Initializes the socket parameter and reports success. */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    return true;
  }

  /** Clears any bindings owned by the socket parameter. */
  @meta.blue.method
  @meta.noop
  ClearBindings()
  {
  }

  /** Binds an external parameter and reports success. */
  @meta.blue.method
  @meta.implemented
  BindToExternalParameter(_externalParameter)
  {
    return true;
  }

  /** Resets the socket parameter. */
  @meta.blue.method
  @meta.noop
  Reset()
  {
  }

  /** Restores the socket parameter's default value. */
  @meta.blue.method
  @meta.noop
  SetValueToDefault()
  {
  }

  /** Reports whether Carbon considers the socket parameter used. */
  @meta.blue.method
  @meta.implemented
  Used()
  {
    return true;
  }

  /** Propagates the current value to owned bindings. */
  @meta.blue.method
  @meta.noop
  Propagate()
  {
  }

}
