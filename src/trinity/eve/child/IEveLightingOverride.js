import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildLightingOverride.h
import { CjsSchema, blue } from "#schema";


/** Contract for an EVE entity that contributes a weighted lighting override. */
export class IEveLightingOverride
{

  /** Returns the priority, blend intensity, and lighting values to contribute. */
  GetOverrides() {}
}

CjsSchema.decorateMethod(IEveLightingOverride, "GetOverrides", blue.abstract);
CjsSchema.blue.inherit(IRoot)(IEveLightingOverride);
CjsSchema.exposure.interface("IEveLightingOverride")(IEveLightingOverride);
