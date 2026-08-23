// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Hand-authored following the eve/socket generated pattern (SOCKET_PARAM_DECLARE macro family).
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveSocketParameterBindingBase } from "./EveSocketParameterBindingBase.js";

/** EveSocketParameterBool (eve/socket) - SOCKET_PARAMETER_DEFINE(bool, false). */
@type.define({ className: "EveSocketParameterBool", family: "eve/socket" })
export class EveSocketParameterBool extends EveSocketParameterBindingBase
{

  /** m_value (bool) */
  @io.persist
  @type.boolean
  value = false;

  /** m_defaults - one default captured per bound external parameter. */
  #defaults = [];

  /**
   * Discards the captured defaults along with the bindings, so nothing can be
   * restored afterwards.
   */
  @carbon.method
  @impl.implemented
  ClearBindings()
  {
    this.#defaults.length = 0;
    super.ClearBindings();
  }

  /** Restores every binding's default and copies it out, then clears. */
  @carbon.method
  @impl.implemented
  Reset()
  {
    for (let index = 0; index < this.bindings.length; index++)
    {
      this.value = this.#defaults[index];
      this.bindings[index]?.CopyValue?.();
    }
    this.ClearBindings();
  }

  /**
   * Captures the external parameter's current value as a boolean default, using
   * false when the read throws; always succeeds, so a bind is never refused on
   * its account.
   */
  ExtractDefault(externalParameter)
  {
    let value = false;
    try
    {
      value = !!externalParameter.GetValue();
    }
    catch
    {
      value = false;
    }
    this.#defaults.push(value);
    return true;
  }

  /**
   * Restores the first captured default, falling back to false when nothing was
   * captured.
   */
  @carbon.method
  @impl.implemented
  SetValueToDefault()
  {
    this.value = this.#defaults.length ? this.#defaults[0] : false;
  }

}
