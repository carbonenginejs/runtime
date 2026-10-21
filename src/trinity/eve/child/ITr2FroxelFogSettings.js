import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2VolumetricsRenderer.h
import { blue } from "#schema";
import { EveChildTransform } from "./EveChildTransform.js";


/**
 * Nominal Carbon froxel-fog component contract.
 *
 * Carbon combines this interface with Eve child classes through multiple
 * inheritance. JavaScript flattens that single live implementation path onto
 * EveChildTransform so registry composition can validate the owned identity
 * once and hot paths can call it directly.
 */
@be.interface("ITr2FroxelFogSettings")
export class ITr2FroxelFogSettings extends EveChildTransform
{

  /** Returns the provider's stable FroxelFogSettings value record. */
  @blue.abstract
  GetFroxelFogSettings() {}

}
