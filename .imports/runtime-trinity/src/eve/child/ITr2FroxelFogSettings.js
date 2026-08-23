// Ported/adapted from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2VolumetricsRenderer.h
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { EveChildTransform } from "./EveChildTransform.js";


/**
 * Nominal Carbon froxel-fog component contract.
 *
 * Carbon combines this interface with Eve child classes through multiple
 * inheritance. JavaScript flattens that single live implementation path onto
 * EveChildTransform so registry composition can validate the owned identity
 * once and hot paths can call it directly.
 */
@type.define({ className: "ITr2FroxelFogSettings", family: "trinityCore" })
export class ITr2FroxelFogSettings extends EveChildTransform
{

  /** Returns the provider's stable FroxelFogSettings value record. */
  @carbon.method
  @impl.notImplemented
  GetFroxelFogSettings()
  {
    throw new Error("ITr2FroxelFogSettings.GetFroxelFogSettings must be implemented by a froxel-fog component.");
  }

}
