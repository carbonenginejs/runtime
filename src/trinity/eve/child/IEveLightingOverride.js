import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildLightingOverride.h
import { CjsSchema, meta } from "#schema";


/** Contract for an EVE entity that contributes a weighted lighting override. */
export class IEveLightingOverride extends IRoot
{

  /** Returns the priority, blend intensity, and lighting values to contribute. */
  GetOverrides() {}
}

CjsSchema.decorateMethod(IEveLightingOverride, "GetOverrides", meta.abstract);
CjsSchema.exposure.inherit(IRoot)(IEveLightingOverride);
CjsSchema.exposure.interface("IEveLightingOverride")(IEveLightingOverride);
