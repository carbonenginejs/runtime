// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildLightingOverride.h
import { CjsSchema, impl } from "#schema";


const IEVE_LIGHTING_OVERRIDE = Symbol.for("carbonenginejs.contract.IEveLightingOverride");


/** Contract for an EVE entity that contributes a weighted lighting override. */
export class IEveLightingOverride
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[IEVE_LIGHTING_OVERRIDE] === true;
  }

  /** Returns the priority, blend intensity, and lighting values to contribute. */
  GetOverrides()
  {
    throw new Error("IEveLightingOverride.GetOverrides must be implemented by a lighting-override provider.");
  }
}

Object.defineProperty(IEveLightingOverride.prototype, IEVE_LIGHTING_OVERRIDE, { value: true });
CjsSchema.decorateMethod(IEveLightingOverride, "GetOverrides", impl.abstract);
CjsSchema.define(IEveLightingOverride, { className: "IEveLightingOverride" });


/** Adds the IEveLightingOverride contract without replacing an existing base. */
export function withIEveLightingOverride(Base)
{
  const Provider = class extends Base
  {
    GetOverrides()
    {
      return IEveLightingOverride.prototype.GetOverrides.call(this);
    }
  };

  Object.defineProperty(Provider.prototype, IEVE_LIGHTING_OVERRIDE, { value: true });
  CjsSchema.decorateMethod(Provider, "GetOverrides", impl.abstract);
  return Provider;
}
