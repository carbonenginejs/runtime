// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Hand-authored following the eve/socket generated pattern (SOCKET_PARAM_DECLARE macro family).
import { vec2 } from "#math/vec2";
import { meta } from "#schema";
import { EveSocketParameterBindingBase } from "./EveSocketParameterBindingBase.js";

/** Binds a named two-component vector socket value to external parameters, preserving defaults by copy for restoration. */
@meta.define({ className: "EveSocketParameterVector2", family: "eve/socket" })
export class EveSocketParameterVector2 extends EveSocketParameterBindingBase
{

  /** m_value (Vector2) */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec2
  value = vec2.create();

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
      vec2.copy(this.value, this._defaults[index]);
      this.bindings[index].CopyValue();
    }
    this.ClearBindings();
  }

  /**
   * Captures a copy of the external parameter's current value as a default,
   * keeping it at zero unless the source has at least two components; always
   * succeeds, so a bind is never refused on its account.
   */
  ExtractDefault(externalParameter)
  {
    const value = vec2.create();
    try
    {
      const source = externalParameter.GetValue();
      if (source && typeof source.length === "number" && source.length >= 2)
      {
        vec2.copy(value, source);
      }
    }
    catch
    {
      vec2.set(value, 0, 0);
    }
    this._defaults.push(value);
    return true;
  }

  /**
   * Restores the first captured default into the existing value vector, or
   * zeroes it when nothing was captured.
   */
  @meta.blue.method
  @meta.implemented
  SetValueToDefault()
  {
    if (this._defaults.length)
    {
      vec2.copy(this.value, this._defaults[0]);
    }
    else
    {
      vec2.set(this.value, 0, 0);
    }
  }

}
