// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Hand-authored following the eve/socket generated pattern (SOCKET_PARAM_DECLARE macro family).
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveSocketParameterBindingBase } from "./EveSocketParameterBindingBase.js";

/** EveSocketParameterVector3 (eve/socket) - SOCKET_PARAMETER_DEFINE(Vector3, (0, 0, 0)). */
@type.define({ className: "EveSocketParameterVector3", family: "eve/socket" })
export class EveSocketParameterVector3 extends EveSocketParameterBindingBase
{

  /** m_value (Vector3) */
  @io.persist
  @type.vec3
  value = vec3.create();

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
      vec3.copy(this.value, this.#defaults[index]);
      this.bindings[index]?.CopyValue?.();
    }
    this.ClearBindings();
  }

  ExtractDefault(externalParameter)
  {
    const value = vec3.create();
    try
    {
      const source = externalParameter.GetValue();
      if (source && typeof source.length === "number" && source.length >= 3)
      {
        vec3.copy(value, source);
      }
    }
    catch
    {
      vec3.set(value, 0, 0, 0);
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
      vec3.copy(this.value, this.#defaults[0]);
    }
    else
    {
      vec3.set(this.value, 0, 0, 0);
    }
  }

}
