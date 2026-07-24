// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Hand-authored following the eve/socket generated pattern (SOCKET_PARAM_DECLARE macro family).
import { vec2 } from "@carbonenginejs/runtime-utils/vec2";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveSocketParameterBindingBase } from "./EveSocketParameterBindingBase.js";

/** EveSocketParameterVector2 (eve/socket) - SOCKET_PARAMETER_DEFINE(Vector2, (0, 0)). */
@type.define({ className: "EveSocketParameterVector2", family: "eve/socket" })
export class EveSocketParameterVector2 extends EveSocketParameterBindingBase
{

  /** m_value (Vector2) */
  @io.persist
  @type.vec2
  value = vec2.create();

  /** m_defaults - one default captured per bound external parameter. */
  #defaults = [];

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
      vec2.copy(this.value, this.#defaults[index]);
      this.bindings[index]?.CopyValue?.();
    }
    this.ClearBindings();
  }

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
    this.#defaults.push(value);
    return true;
  }

  @carbon.method
  @impl.implemented
  SetValueToDefault()
  {
    if (this.#defaults.length)
    {
      vec2.copy(this.value, this.#defaults[0]);
    }
    else
    {
      vec2.set(this.value, 0, 0);
    }
  }

}
