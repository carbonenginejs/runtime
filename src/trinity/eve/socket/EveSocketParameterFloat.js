// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Hand-authored following the eve/socket generated pattern (SOCKET_PARAM_DECLARE macro family).
import { carbon, impl, io, type } from "#schema";
import { EveSocketParameterBindingBase } from "./EveSocketParameterBindingBase.js";

/** EveSocketParameterFloat (eve/socket) - SOCKET_PARAMETER_DEFINE(float, 0.0f). */
@type.define({ className: "EveSocketParameterFloat", family: "eve/socket" })
export class EveSocketParameterFloat extends EveSocketParameterBindingBase
{

  /** m_value (float) */
  @io.persist
  @type.float32
  value = 0;

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
   * Captures the external parameter's current value as a numeric default,
   * substituting 0 when the read throws or is not finite; always succeeds, so a
   * bind is never refused on its account.
   */
  ExtractDefault(externalParameter)
  {
    let value = 0;
    try
    {
      value = Number(externalParameter.GetValue());
    }
    catch
    {
      value = 0;
    }
    this.#defaults.push(Number.isFinite(value) ? value : 0);
    return true;
  }

  /**
   * Restores the first captured default, falling back to 0 when nothing was
   * captured.
   */
  @carbon.method
  @impl.implemented
  SetValueToDefault()
  {
    this.value = this.#defaults.length ? this.#defaults[0] : 0;
  }

}
