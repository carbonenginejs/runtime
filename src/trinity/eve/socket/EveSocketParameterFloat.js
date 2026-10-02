// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Hand-authored following the eve/socket generated pattern (SOCKET_PARAM_DECLARE macro family).
import { meta } from "#schema";
import { EveSocketParameterBindingBase } from "./EveSocketParameterBindingBase.js";

/** Binds a named float socket value to external parameters, capturing and restoring each binding's previous value. */
@meta.define({ className: "EveSocketParameterFloat", family: "eve/socket" })
export class EveSocketParameterFloat extends EveSocketParameterBindingBase
{

  /** m_value (float) */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  value = 0;

  /** m_defaults - one default captured per bound external parameter. */
  _defaults = [];

  /**
   * Discards the captured defaults along with the bindings, so nothing can be
   * restored afterwards.
   */
  @meta.blue.method
  @meta.implemented
  ClearBindings()
  {
    this._defaults.length = 0;
    super.ClearBindings();
  }

  /** Restores every binding's default and copies it out, then clears. */
  @meta.blue.method
  @meta.implemented
  Reset()
  {
    for (let index = 0; index < this.bindings.length; index++)
    {
      this.value = this._defaults[index];
      this.bindings[index].CopyValue();
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
    this._defaults.push(Number.isFinite(value) ? value : 0);
    return true;
  }

  /**
   * Restores the first captured default, falling back to 0 when nothing was
   * captured.
   */
  @meta.blue.method
  @meta.implemented
  SetValueToDefault()
  {
    this.value = this._defaults.length ? this._defaults[0] : 0;
  }

}
