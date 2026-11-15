// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
import { exposure as be } from "#be";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";
import { Tr2ExternalParameter } from "../../core/binding/Tr2ExternalParameter.js";
import { IEveSocketParameter } from "./IEveSocketParameter.js";
import { BlueList } from "#blue";

/** Binds a named string socket value to external parameters while capturing defaults for restoration. */
@be.define({
  name: "EveSocketParameterString",
  // EveSocketParameter_Blue.cpp:40-40, in Carbon's order.
  interfaces: [ IEveSocketParameter ],
  members: [
    [ be.ATTR, "name", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "value", be.READWRITE | be.PERSIST ],
    [ be.METHOD, "Used", be.WRAP ],
    [ be.METHOD, "SetValueToDefault", be.WRAP ]
  ]
})
export class EveSocketParameterString extends IEveSocketParameter
{

  /** m_name (std::string) */

  @type.string
  name = "";

  /** m_value (std::string) */

  @type.string
  value = "";

  /** m_valueExposure (Tr2ExternalParameterPtr) */
  @type.object.ref("Tr2ExternalParameter")
  valueExposure = null;

  /** m_externalParameters (PTr2ExternalParameterVector) */
  @type.list("Tr2ExternalParameter")
  externalParameters = new BlueList(Tr2ExternalParameter, { className: "Tr2ExternalParameter" });

  /** m_defaults (std::vector<std::string>) */
  @type.string.array()
  defaults = [];

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
   * Creates the `valueExposure` external parameter pointing at this object's
   * `value` attribute on first call; later calls leave the existing one alone.
   *
   * @adapted
   */

  Initialize()
  {
    if (!this.valueExposure)
    {
      this.valueExposure = new Tr2ExternalParameter();
      this.valueExposure.SetName("valueExposure");
      this.valueExposure.SetDestinationObject(this);
      this.valueExposure.SetDestinationAttribute("value");
      this.valueExposure.Initialize();
    }
    return true;
  }

  /**
   * Drops the bound external parameters; unlike the typed socket parameters, the
   * captured defaults are kept.
   *
   * @implemented
   */

  ClearBindings()
  {
    this.externalParameters.Clear();
  }

  /**
   * Records a matching external parameter after capturing its current value as a default; strings are held directly instead of through a value binding, and propagation writes to them.
   *
   * @adapted
   * @returns {boolean} True when the external parameter was valid, name-matched and stored.
   */

  BindToExternalParameter(externalParameter)
  {
    this.Initialize();
    if (!externalParameter || !externalParameter.IsValid() || externalParameter.GetName() !== this.name) return false;
    if (!this.ExtractDefault(externalParameter)) return false;
    this.externalParameters.push(externalParameter);
    return true;
  }

  /**
   * Captures the external parameter's current value as a string default,
   * substituting an empty string when the read throws; always succeeds.
   */

  ExtractDefault(externalParameter)
  {
    let value = "";
    try
    {
      value = String(externalParameter.GetValue());
    }
    catch
    {
      value = "";
    }
    this.defaults.push(value);
    return true;
  }

  /**
   * Restores the default captured for the first bound external parameter,
   * leaving the value untouched when none was captured.
   *
   * @implemented
   */
  SetValueToDefault()
  {
    if (this.defaults.length) this.value = this.defaults[0];
  }

  /**
   * Reports whether any external parameter is bound to this one.
   *
   * @implemented
   */
  Used()
  {
    return this.externalParameters.length !== 0;
  }

  /**
   * Reads the current value through `valueExposure` and writes it into every
   * bound external parameter.
   *
   * @adapted
   */

  Propagate()
  {
    this.Initialize();
    if (!this.valueExposure.IsValid()) return;
    const value = this.valueExposure.GetValue();
    for (const externalParameter of this.externalParameters) externalParameter.SetValue(value);
  }

}
