// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:80-91
import { meta } from "#schema";
import { EveSOFDataFactionColorSet } from "../faction/EveSOFDataFactionColorSet.js";

/** Chooses a faction color and four material names for an area and supports assignment and override composition.
 * Native IRoot-only data with a self-only Blue table. Defaults retain native
 * construction; the empty destructor needs no resource or update lifecycle.
 */
@meta.define({ className: "EveSOFDataAreaMaterial", family: "eve" })
export class EveSOFDataAreaMaterial
{
  /**
   * JavaScript alias of the native faction-color chooser constants used by colorType.
   * @type {Object<string, number>}
   */
  static ColorType = EveSOFDataFactionColorSet.ColorType;


  /**
   * Native material-slot indices exposed as JavaScript constants; MATERIAL_MAX is the slot count,
   * not an assignable slot.
   * @type {Object<string, number>}
   */
  static MaterialType = Object.freeze({
    MATERIAL1: 0,
    MATERIAL2: 1,
    MATERIAL3: 2,
    MATERIAL4: 3,
    MATERIAL_MAX: 4
  });

  /**
   * Catalog material name for the area's first material slot; native m_material[MATERIAL1]
   * (std::string).
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  material1 = "";

  /**
   * Catalog material name for the area's second material slot; native m_material[MATERIAL2]
   * (std::string).
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  material2 = "";

  /**
   * Catalog material name for the area's third material slot; native m_material[MATERIAL3]
   * (std::string).
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  material3 = "";

  /**
   * Catalog material name for the area's fourth material slot; native m_material[MATERIAL4]
   * (std::string).
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  material4 = "";

  /**
   * Faction-color selector for the area's GeneralGlowColor parameter; native m_glowColorType
   * (SOFDataFactionColorChooser.ColorType), defaulting to TYPE_HULL.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.SOFDataFactionColorChooser.ColorType")
  colorType = 12;

  /**
   * Writes the color selector and each nonempty material name into the supplied
   * area descriptor.
   * Custom: existing JavaScript SOF map-assignment convenience.
   * @param {object} [out={}] Destination area descriptor.
   * @returns {object} The destination descriptor.
   */
  @meta.ours
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
   * Custom: existing JavaScript SOF composition helper.
   * @param {EveSOFDataAreaMaterial|null} base Base values.
   * @param {EveSOFDataAreaMaterial|null} overrides Optional field overrides.
   * @param {EveSOFDataAreaMaterial|null} [out=null] Reused destination.
   * @returns {EveSOFDataAreaMaterial|null} The combined record or null.
   */
  @meta.ours
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

/** Selects an existing nonempty override while preserving zero-valued selectors. */
function selectValue(base, overrides, name)
{
    const value = overrides?.[name];
    return value !== null && value !== undefined && value !== "" ? value : base[name];
}

meta.blue.interfaceTable({
  interfaces: [ EveSOFDataAreaMaterial ],
  chainTo: null
})(EveSOFDataAreaMaterial);
