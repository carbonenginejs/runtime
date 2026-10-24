// Source: trinity/trinity/Interior/Tr2InteriorLightSet.h
import { CjsSchema, meta, blue } from "#schema";
import { Tr2InteriorPerObjectLightData } from "../../generated/interior/Tr2InteriorPerObjectLightData.js";
import { Tr2InteriorLightSource } from "./Tr2InteriorLightSource.js";

/** Transient collection of active interior light sources and packed records. */
@meta.carbon("Tr2InteriorLightSet")
export class Tr2InteriorLightSet
{

  _lightInstances = [];

  /** Adds one native light identity to the transient active-light set. */
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
  @meta.implemented
  Clear()
  {
    this._lightInstances.length = 0;
  }

  /** Returns the source-backed active-light count. */
  @meta.implemented
  GetNumOfActiveLights()
  {
    return this._lightInstances.length;
  }

  /**
   * Carbon PopulateLightData (Interior/Tr2InteriorLightSet.cpp:61-88).
   * Adapted: writes directly into the leased RawData PS buffer instead of a
   * stack struct copied afterwards. Cached records retain native field order.
   * Native lightCount is the full list size even when only ten records fit.
   * The first four viewProjection matrices are already packed: copy raw.
   */
  @blue.method
  @meta.adapted
  PopulateLightData(perObjectPSData)
  {
    perObjectPSData.Set("lightCount", this.GetNumOfActiveLights());
    const lights = perObjectPSData.Get("pointLights");
    const count = Math.min(10, this._lightInstances.length);
    for (let i = 0; i < count; i++)
    {
      const instance = this._lightInstances[i];
      if (i < 4)
      {
        const source = CjsSchema.cast(instance.lightSource, Tr2InteriorLightSource);
        perObjectPSData.SetWithoutTransposingIndex("spotLights", i, source.viewProjection);
      }
      if (!instance.lightDataValid)
      {
        instance.lightSource.PopulateLightData(instance.lightData);
        instance.lightDataValid = true;
      }
      const data = instance.lightData;
      const offset = i * 24;
      lights.set(data.position, offset);
      lights[offset + 3] = data.radius;
      lights.set(data.color, offset + 4);
      lights[offset + 7] = data.pointLightFalloff;
      lights[offset + 8] = data.shadow0Influence;
      lights[offset + 9] = data.shadow1Influence;
      lights[offset + 10] = data.coneCosAlphaOuter;
      lights[offset + 11] = data.coneCosAlphaInner;
      lights.set(data.spotDirection, offset + 12);
      lights[offset + 15] = data.unused2;
      lights.set(data.boxTransformRow3, offset + 16);
      lights.set(data.boxTransformRow4, offset + 20);
    }
  }

}
