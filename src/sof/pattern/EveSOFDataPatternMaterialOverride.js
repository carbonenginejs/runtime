// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataPatternMaterialOverride (eve) - generated from schema shapeHash ce565030.... */
@type.define({ className: "EveSOFDataPatternMaterialOverride", family: "eve" })
export class EveSOFDataPatternMaterialOverride extends CjsModel
{

  /** m_isTargetMtl1 (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isTargetMtl1 = true;

  /** m_isTargetMtl2 (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isTargetMtl2 = true;

  /** m_isTargetMtl3 (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isTargetMtl3 = true;

  /** m_isTargetMtl4 (bool) [READWRITE, PERSIST] */
  @io.persist
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
