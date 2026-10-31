// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { exposure as be } from "#be";
import { meta, type, blue } from "#schema";
import { IEveSocketParameter } from "./IEveSocketParameter.js";

/**
 * Provides named typed socket parameters with external-value binding, default capture, and propagation hooks.
 *
 * @abstract
 */
@be.define("EveSocketParameterBindingBase")
@be.abstract
export class EveSocketParameterBindingBase extends IEveSocketParameter
{

  /** name (m_name =) */
  @blue.readwrite
  @blue.persist
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

  /**
   * Drops every value binding, leaving the current value in place.
   *
   * @implemented
   */

  ClearBindings()
  {
    this.bindings.length = 0;
  }

  /**
   * Creates a binding that reads this parameter's `value` field and writes it to the external parameter, keeping it only when the names match, the binding initializes and a default could be captured.
   *
   * Carbon takes the parameter by reference and uses the created binding
   * unchecked (EveSocketParameter.cpp:29-52).
   *
   * @implemented
   * @returns {boolean} True when the binding was created and stored.
   */

  BindToExternalParameter(externalParameter)
  {
    if (!externalParameter.IsValid() || externalParameter.GetName() !== this.name) return false;
    const binding = externalParameter.CreateBinding();
    binding.SetSource("value", this);
    binding.Initialize();
    if (!binding.IsValid() || !this.ExtractDefault(externalParameter)) return false;
    this.bindings.push(binding);
    return true;
  }

  /**
   * Required hook where a typed subclass records the external parameter's current value as a restore default.
   *
   * @abstract
   */
  @meta.abstract
  ExtractDefault(_externalParameter) {}

  /**
   * Reports whether anything is bound to this parameter.
   *
   * @implemented
   */

  Used()
  {
    return this.bindings.length !== 0;
  }

  /**
   * Pushes the current value out through every binding.
   *
   * @implemented
   */

  Propagate()
  {
    for (const binding of this.bindings) binding.CopyValue();
  }

}
