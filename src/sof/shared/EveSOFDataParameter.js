// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { vec4 } from "#math/vec4";

/** EveSOFDataParameter (eve) - generated from schema shapeHash 148eba9e.... */
@type.define({ className: "EveSOFDataParameter", family: "eve" })
export class EveSOFDataParameter extends CjsModel
{

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_value (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  value = vec4.create();

  /**
   * Copies this value into a map under its authored name with an optional
   * prefix.
   */
  Assign(out = {}, prefix = "")
  {
    out[prefix ? prefix + this.name : this.name] = Array.from(this.value);
    return out;
  }

  /**
   * Synchronizes a reusable list to base parameter names and copies matching
   * override vectors where present.
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
      vec4.copy(result.value, override?.value ?? value.value);
    }
    return out;
  }

}
