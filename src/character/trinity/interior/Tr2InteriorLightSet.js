// Source: trinity/trinity/Interior/Tr2InteriorLightSet.h
import { meta } from "#schema";
import { Tr2InteriorPerObjectLightData } from "../../generated/interior/Tr2InteriorPerObjectLightData.js";

/** Transient collection of active interior light sources and packed records. */
@meta.define({ className: "Tr2InteriorLightSet", family: "interior" })
export class Tr2InteriorLightSet
{

  _lightInstances = [];

  /** Adds one native light identity to the transient active-light set. */
  @meta.blue.method
  @meta.implemented
  AddLight(lightSource, _viewPosition)
  {
    this._lightInstances.push({
      lightSource,
      lightDataValid: false,
      lightData: new Tr2InteriorPerObjectLightData()
    });
  }

  /** Clears every transient light instance. */
  @meta.blue.method
  @meta.implemented
  Clear()
  {
    this._lightInstances.length = 0;
  }

  /** Returns the source-backed active-light count. */
  @meta.blue.method
  @meta.implemented
  GetNumOfActiveLights()
  {
    return this._lightInstances.length;
  }

  /** Requires the maintained light-data population contract before it can run. */
  @meta.blue.method
  @meta.notImplemented
  PopulateLightData(_perObjectPSData)
  {
    throw new Error("Tr2InteriorLightSet.PopulateLightData is not implemented in CarbonEngineJS.");
  }

}
