// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";

/** Defines faction visibility-group membership and object-visibility policy. */
@meta.define({ className: "EveSOFDataFactionVisibilityGroupSet", family: "eve" })
export class EveSOFDataFactionVisibilityGroupSet
{

  /** m_visibilityGroups (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataGenericString")
  visibilityGroups = [];

  /**
   * Accepts a SOF object record and tests its visibilityGroup through this set's
   * normalization rules.
   */
  IsObjectVisible(value)
  {
    if (!value || typeof value !== "object") return false;
    return this.Has(value.visibilityGroup);
  }

  /**
   * Normalizes an empty group to PRIMARY and matches case-insensitively against
   * string or wrapped-string entries.
   */
  Has(visibilityGroup)
  {
    if (typeof visibilityGroup !== "string") return false;
    const normalized = visibilityGroup ? visibilityGroup.toUpperCase() : "PRIMARY";
    return this.visibilityGroups.some(value =>
    {
      const group = typeof value === "string" ? value : value?.str;
      return typeof group === "string" && group.toUpperCase() === normalized;
    });
  }

}
