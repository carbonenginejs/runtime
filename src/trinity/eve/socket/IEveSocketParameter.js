// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/IEveSocketParameter.h
import { meta, blue } from "#schema";


/** Carbon socket-parameter contract with its interface defaults. */
@blue.define("IEveSocketParameter")
export class IEveSocketParameter
{

  /** Returns Carbon's default empty socket-parameter name. */
  @blue.method
  @meta.implemented
  GetName()
  {
    return "";
  }

  /** Applies an optional socket-parameter name. */
  @blue.method
  @meta.noop
  SetName(_name)
  {
  }

  /** Initializes the socket parameter and reports success. */
  @blue.method
  @meta.implemented
  Initialize()
  {
    return true;
  }

  /** Clears any bindings owned by the socket parameter. */
  @blue.method
  @meta.noop
  ClearBindings()
  {
  }

  /** Binds an external parameter and reports success. */
  @blue.method
  @meta.implemented
  BindToExternalParameter(_externalParameter)
  {
    return true;
  }

  /** Resets the socket parameter. */
  @blue.method
  @meta.noop
  Reset()
  {
  }

  /** Restores the socket parameter's default value. */
  @blue.method
  @meta.noop
  SetValueToDefault()
  {
  }

  /** Reports whether Carbon considers the socket parameter used. */
  @blue.method
  @meta.implemented
  Used()
  {
    return true;
  }

  /** Propagates the current value to owned bindings. */
  @blue.method
  @meta.noop
  Propagate()
  {
  }

}
