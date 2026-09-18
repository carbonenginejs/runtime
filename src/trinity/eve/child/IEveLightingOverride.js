// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildLightingOverride.h
import { CjsSchema, impl } from "#schema";


/** Contract for an EVE entity that contributes a weighted lighting override. */
export class IEveLightingOverride
{

  /** Returns the priority, blend intensity, and lighting values to contribute. */
  GetOverrides()
  {
    throw new Error("IEveLightingOverride.GetOverrides must be implemented by a lighting-override provider.");
  }
}

CjsSchema.decorateMethod(IEveLightingOverride, "GetOverrides", impl.abstract);
CjsSchema.define(IEveLightingOverride, { className: "IEveLightingOverride" });
