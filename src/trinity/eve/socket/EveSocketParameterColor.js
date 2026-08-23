// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Hand-authored following the eve/socket generated pattern (SOCKET_PARAM_DECLARE macro family).
import { vec4 } from "#math/vec4";
import { carbon, impl, io, type } from "#schema";
import { EveSocketParameterBindingBase } from "./EveSocketParameterBindingBase.js";

/**
 * Binds a named four-component color socket value to external parameters,
 * preserving defaults by copy for restoration. Carbon's Color is four floats;
 * the JavaScript runtime carries it as a vec4 like its other color values.
 */
@type.define({ className: "EveSocketParameterColor", family: "eve/socket" })
export class EveSocketParameterColor extends EveSocketParameterBindingBase
{

  /** m_value (Color) */
  @io.persist
  @type.vec4
  value = vec4.create();

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
      vec4.copy(this.value, this.#defaults[index]);
      this.bindings[index]?.CopyValue?.();
    }
    this.ClearBindings();
  }

  /**
   * Captures a copy of the external parameter's current value as a default,
   * keeping it at zero unless the source is a four-component value; always
   * succeeds, so a bind is never refused on its account.
   */
  ExtractDefault(externalParameter)
  {
    const value = vec4.create();
    try
    {
      const source = externalParameter.GetValue();
      if (source && typeof source.length === "number" && source.length >= 4)
      {
        vec4.copy(value, source);
      }
    }
    catch
    {
      vec4.set(value, 0, 0, 0, 0);
    }
    this.#defaults.push(value);
    return true;
  }

  /**
   * Restores the first captured default into the existing value vector, or
   * zeroes it when nothing was captured.
   */
  @carbon.method
  @impl.implemented
  SetValueToDefault()
  {
    if (this.#defaults.length)
    {
      vec4.copy(this.value, this.#defaults[0]);
    }
    else
    {
      vec4.set(this.value, 0, 0, 0, 0);
    }
  }

}
