// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:752-760
import { meta, types } from "#schema";

/**
 * Stores a named texture binding and supports assignment and composition.
 * Native IRoot-only data with a self-only Blue table. The authored path is a
 * string, not a held resource; empty constructor/destructor need no lifecycle.
 */
@meta.define({ className: "EveSOFDataTexture", family: "eve" })
export class EveSOFDataTexture
{

  /** m_resFilePath (std::string) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  resFilePath = "";

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  name = "";

  /**
   * Writes this resource path into a map under its authored texture name.
   * Custom: existing SOF map-assignment helper; native texture records are data only.
   * @param {object} [out={}] Destination texture map.
   * @returns {object} The supplied map.
   */
  @meta.impl.custom
  Assign(out = {})
  {
    out[this.name] = this.resFilePath;
    return out;
  }

  /**
   * Synchronizes a reusable list to base texture names and selects each matching
   * override path when truthy.
   * Custom: existing JavaScript SOF composition helper, not a native record method.
   * @param {EveSOFDataTexture[]} [base=[]] Base texture records.
   * @param {EveSOFDataTexture[]|null} [overrides=null] Named overrides.
   * @param {EveSOFDataTexture[]} [out=[]] Reused output records.
   * @returns {EveSOFDataTexture[]} The output list.
   */
  @meta.impl.custom
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

meta.carbon.interfaceTable({
  interfaces: [ EveSOFDataTexture ],
  chainTo: null
})(EveSOFDataTexture);
