// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataTexture (eve) - generated from schema shapeHash b8067c29.... */
@type.define({ className: "EveSOFDataTexture", family: "eve" })
export class EveSOFDataTexture extends CjsModel
{

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_resFilePath (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  resFilePath = "";

  /** Writes this resource path into a map under its authored texture name. */
  Assign(out = {})
  {
    out[this.name] = this.resFilePath;
    return out;
  }

  /**
   * Synchronizes a reusable list to base texture names and selects each matching
   * override path when truthy.
   */
  static combineArrays(base = [], overrides = null, out = [])
  {
    const validNames = new Set(base.map(value => value.name));
    for (let index = out.length - 1; index >= 0; index--)
    {
      if (!validNames.has(out[index].name)) out.splice(index, 1);
    }
    for (const value of base)
    {
      let result = out.find(candidate => candidate.name === value.name);
      if (!result)
      {
        result = new this();
        result.name = value.name;
        out.push(result);
      }
      const override = overrides?.find(candidate => candidate.name === value.name);
      result.resFilePath = override?.resFilePath || value.resFilePath;
    }
    return out;
  }

}
