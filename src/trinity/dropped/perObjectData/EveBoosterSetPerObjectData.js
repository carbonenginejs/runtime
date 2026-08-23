// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveBoosterSet2.h:48
import { type } from "#schema";
import { CjsModel } from "#model";
import { EveBoosterSetPSData } from "./EveBoosterSetPSData.js";
import { EveBoosterSetVSData } from "./EveBoosterSetVSData.js";

/**
 * Carbon `EveBoosterSetPerObjectData` - a pure composite of the two stage
 * structs, exactly as Carbon declares it (`VertexShaderData m_vsData;
 * PixelShaderData m_psData;`, EveBoosterSet2.h:73-74).
 *
 * This class previously FLATTENED both stages into one record, which lost the
 * two trail arrays' `[EVE_MAX_CONTROL_POINT_COUNT]` bound, dropped the pixel
 * stage's `boosterIntensity` to a name collision with the vertex stage's, and
 * left the record at 124 bytes - not a multiple of Vector4, which Carbon
 * static_asserts (Tr2PerObjectData.h:57).
 */
@type.define({ className: "EveBoosterSetPerObjectData", family: "eve/perObjectData" })
export class EveBoosterSetPerObjectData extends CjsModel
{

  /** m_vsData (VertexShaderData) */
  @type.rawStruct("EveBoosterSetVSData")
  vsData = new EveBoosterSetVSData();

  /** m_psData (PixelShaderData) */
  @type.rawStruct("EveBoosterSetPSData")
  psData = new EveBoosterSetPSData();

}
