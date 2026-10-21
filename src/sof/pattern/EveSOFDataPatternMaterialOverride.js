import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Defines a four-slot target mask for overriding pattern materials. */
@be.define("EveSOFDataPatternMaterialOverride")

@blue.inherit(IRoot)
export class EveSOFDataPatternMaterialOverride
{

  /** m_isTargetMtl1 (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  isTargetMtl1 = true;

  /** m_isTargetMtl2 (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  isTargetMtl2 = true;

  /** m_isTargetMtl3 (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  isTargetMtl3 = true;

  /** m_isTargetMtl4 (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  isTargetMtl4 = true;

  /**
   * Writes the four material-target flags into the caller's array and returns
   * that array.
   */
  GetTargets(out = [])
  {
    out[0] = this.isTargetMtl1;
    out[1] = this.isTargetMtl2;
    out[2] = this.isTargetMtl3;
    out[3] = this.isTargetMtl4;
    return out;
  }

}
