// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, type } from "#schema";
import { IEveSocketParameter } from "./IEveSocketParameter.js";

/** Provides named typed socket parameters with external-value binding, default capture, and propagation hooks. */
@type.define({ className: "EveSocketParameterBindingBase", family: "eve/socket" })
export class EveSocketParameterBindingBase extends IEveSocketParameter
{

  /** name (m_name =) */
  @type.string
  name = "";

  /** m_bindings (PITr2ValueBindingVector) */
  @type.list("ITr2ValueBinding")
  bindings = [];

  /** Returns the name an external parameter has to match before it can bind here. */
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the name external parameters must match to bind, coercing null to an
   * empty string.
   */
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Drops every value binding, leaving the current value in place. */
  @carbon.method
  @impl.implemented
  ClearBindings()
  {
    this.bindings.length = 0;
  }

  /**
   * Creates a binding that reads this parameter's `value` field and writes it to the external parameter, keeping it only when the names match, the binding initializes and a default could be captured.
   *
   * @returns {boolean} True when the binding was created and stored.
   */
  @carbon.method
  @impl.adapted
  BindToExternalParameter(externalParameter)
  {
    if (!externalParameter || !externalParameter.IsValid() || externalParameter.GetName() !== this.name) return false;
    const binding = externalParameter.CreateBinding();
    if (!binding) return false;
    binding.SetSource("value", this);
    binding.Initialize();
    if (!binding.IsValid() || !this.ExtractDefault(externalParameter)) return false;
    this.bindings.push(binding);
    return true;
  }

  /** Required hook where a typed subclass records the external parameter's current value as a restore default. */
  @carbon.method
  @impl.abstract
  ExtractDefault(_externalParameter)
  {
    throw new Error("EveSocketParameterBindingBase.ExtractDefault must be implemented by a typed socket parameter.");
  }

  /** Reports whether anything is bound to this parameter. */
  @carbon.method
  @impl.implemented
  Used()
  {
    return this.bindings.length !== 0;
  }

  /** Pushes the current value out through every binding. */
  @carbon.method
  @impl.implemented
  Propagate()
  {
    for (const binding of this.bindings) binding.CopyValue();
  }

}
