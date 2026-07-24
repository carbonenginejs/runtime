// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Hand-authored following the eve/socket generated pattern (SOCKET_PARAM_DECLARE macro family).
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveSocketParameterBindingBase } from "./EveSocketParameterBindingBase.js";

/** EveSocketParameterVector4 (eve/socket) - SOCKET_PARAMETER_DEFINE(Vector4, (0, 0, 0, 0)). */
@type.define({ className: "EveSocketParameterVector4", family: "eve/socket" })
export class EveSocketParameterVector4 extends EveSocketParameterBindingBase
{

  /** m_value (Vector4) */
  @io.persist
  @type.vec4
  value = vec4.create();

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
      vec4.copy(this.value, this.#defaults[index]);
      this.bindings[index]?.CopyValue?.();
    }
    this.ClearBindings();
  }

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
