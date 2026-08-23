// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataAreaMaterial (eve) - generated from schema shapeHash 19be099b.... */
@type.define({ className: "EveSOFDataAreaMaterial", family: "eve" })
export class EveSOFDataAreaMaterial extends CjsModel
{

  static MaterialType = Object.freeze({
    MATERIAL1: 0,
    MATERIAL2: 1,
    MATERIAL3: 2,
    MATERIAL4: 3,
    MATERIAL_MAX: 4
  });

  /** m_glowColorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("ColorType")
  colorType = 12;

  /** m_material[MATERIAL1] (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  material1 = "";

  /** m_material[MATERIAL2] (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  material2 = "";

  /** m_material[MATERIAL3] (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  material3 = "";

  /** m_material[MATERIAL4] (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  material4 = "";

  /**
   * Writes the color selector and each nonempty material name into the supplied
   * area descriptor.
   */
  Assign(out = {})
  {
    out.colorType = this.colorType;
    if (this.material1) out.material1 = this.material1;
    if (this.material2) out.material2 = this.material2;
    if (this.material3) out.material3 = this.material3;
    if (this.material4) out.material4 = this.material4;
    return out;
  }

  /**
   * Returns null without a base; otherwise merges nonempty per-field overrides
   * into a reusable area-material record.
   */
  static combine(base, overrides, out = null)
  {
    if (!base) return null;
    out ??= new this();
    out.colorType = selectValue(base, overrides, "colorType");
    out.material1 = selectValue(base, overrides, "material1");
    out.material2 = selectValue(base, overrides, "material2");
    out.material3 = selectValue(base, overrides, "material3");
    out.material4 = selectValue(base, overrides, "material4");
    return out;
  }

}

function selectValue(base, overrides, name)
{
    const value = overrides?.[name];
    return value !== null && value !== undefined && value !== "" ? value : base[name];
}
