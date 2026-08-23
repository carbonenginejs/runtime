// Source: trinity/trinity/Interior/Tr2InteriorLightSet.h
import { carbon, impl, type } from "#schema";
import { CjsModel } from "#model";
import { Tr2InteriorPerObjectLightData } from "../../generated/interior/Tr2InteriorPerObjectLightData.js";

/** Transient collection of active interior light sources and packed records. */
@type.define({ className: "Tr2InteriorLightSet", family: "interior" })
export class Tr2InteriorLightSet extends CjsModel
{

  #lightInstances = [];

  /** Adds one native light identity to the transient active-light set. */
  @carbon.method
  @impl.implemented
  AddLight(lightSource, _viewPosition)
  {
    this.#lightInstances.push({
      lightSource,
      lightDataValid: false,
      lightData: new Tr2InteriorPerObjectLightData()
    });
  }

  /** Clears every transient light instance. */
  @carbon.method
  @impl.implemented
  Clear()
  {
    this.#lightInstances.length = 0;
  }

  /** Returns the source-backed active-light count. */
  @carbon.method
  @impl.implemented
  GetNumOfActiveLights()
  {
    return this.#lightInstances.length;
  }

  /** Requires the maintained light-data population contract before it can run. */
  @carbon.method
  @impl.notImplemented
  PopulateLightData(_perObjectPSData)
  {
    throw new Error("Tr2InteriorLightSet.PopulateLightData is not implemented in CarbonEngineJS.");
  }

}
