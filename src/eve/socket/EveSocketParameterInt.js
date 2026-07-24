// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Hand-authored following the eve/socket generated pattern (SOCKET_PARAM_DECLARE macro family).
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveSocketParameterBindingBase } from "./EveSocketParameterBindingBase.js";

/** EveSocketParameterInt (eve/socket) - SOCKET_PARAMETER_DEFINE(int, 0). */
@type.define({ className: "EveSocketParameterInt", family: "eve/socket" })
export class EveSocketParameterInt extends EveSocketParameterBindingBase
{

  /** m_value (int32_t) */
  @io.persist
  @type.int32
  value = 0;

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
      this.value = this.#defaults[index];
      this.bindings[index]?.CopyValue?.();
    }
    this.ClearBindings();
  }

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
    this.#defaults.push(Number.isFinite(value) ? value : 0);
    return true;
  }

  @carbon.method
  @impl.implemented
  SetValueToDefault()
  {
    this.value = this.#defaults.length ? this.#defaults[0] : 0;
  }

}
