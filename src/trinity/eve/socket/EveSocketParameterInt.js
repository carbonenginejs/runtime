// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Hand-authored following the eve/socket generated pattern (SOCKET_PARAM_DECLARE macro family).
import { IEveSocketParameter } from "./IEveSocketParameter.js";
import { meta, type, blue } from "#schema";
import { EveSocketParameterBindingBase } from "./EveSocketParameterBindingBase.js";

/** Binds a named 32-bit integer socket value to external parameters, capturing and restoring each binding's previous value. */
@blue.define("EveSocketParameterInt")
@blue.interface(IEveSocketParameter)
export class EveSocketParameterInt extends EveSocketParameterBindingBase
{

  /** m_value (int32_t) */
  @blue.readwrite
  @blue.persist
  @type.int32
  value = 0;

  /** m_defaults - one default captured per bound external parameter. */
  _defaults = [];

  /**
   * Discards the captured defaults along with the bindings, so nothing can be
   * restored afterwards.
   */
  @blue.method
  @meta.implemented
  ClearBindings()
  {
    this._defaults.length = 0;
    super.ClearBindings();
  }

  /** Restores every binding's default and copies it out, then clears. */
  @blue.method
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
   * Captures the external parameter's current value as an integer default,
   * truncating to 32 bits and substituting 0 when the read throws; always
   * succeeds, so a bind is never refused on its account.
   */
  @blue.method
  ExtractDefault(externalParameter)
  {
    let value = 0;
    try
    {
      value = Number(externalParameter.GetValue()) | 0;
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
  @blue.method
  @meta.implemented
  SetValueToDefault()
  {
    this.value = this._defaults.length ? this._defaults[0] : 0;
  }

}
