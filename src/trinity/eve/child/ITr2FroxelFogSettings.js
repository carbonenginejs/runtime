// Source: trinity/trinity/Tr2VolumetricsRenderer.h
import { meta } from "#schema";
import { EveChildTransform } from "./EveChildTransform.js";


/**
 * Nominal Carbon froxel-fog component contract.
 *
 * Carbon combines this interface with Eve child classes through multiple
 * inheritance. JavaScript flattens that single live implementation path onto
 * EveChildTransform so registry composition can validate the owned identity
 * once and hot paths can call it directly.
 */
@meta.define({ className: "ITr2FroxelFogSettings", family: "trinityCore" })
export class ITr2FroxelFogSettings extends EveChildTransform
{

  /** Returns the provider's stable FroxelFogSettings value record. */
  @meta.blue.method
  @meta.abstract
  GetFroxelFogSettings()
  {
    throw new Error("ITr2FroxelFogSettings.GetFroxelFogSettings must be implemented by a froxel-fog component.");
  }

}
