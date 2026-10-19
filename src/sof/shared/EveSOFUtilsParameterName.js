import { blue } from "#schema";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFUtils.h

/** Parses and remaps Carbon SOF material parameter prefixes. */
@blue.define("EveSOFUtilsParameterName")
export class EveSOFUtilsParameterName
{

  /**
   * Direct copy of the original name (Carbon m_fullname, EveSOFUtils.h:32).
   * @type {string}
   */
  fullname = "";

  /**
   * Name without the material prefix (Carbon m_shortname, EveSOFUtils.h:34).
   * @type {string}
   */
  shortname = "";

  /**
   * Original material index, -1 when no prefix matched (Carbon m_materialIdx,
   * EveSOFUtils.h:36; initialised to -1 in the ctor init list, EveSOFUtils.cpp:13).
   * @type {number}
   */
  materialIdx = -1;

  /**
   * Parses a parameter name against case-insensitive material prefixes,
   * retaining its full name, unprefixed suffix, and matched index.
   */
  constructor(prefixes = [], parameterName = "")
  {
    this.fullname = parameterName;
    this.shortname = parameterName;

    for (let index = 0; index < prefixes.length; index++)
    {
      const prefix = prefixes[index];
      if (parameterName.slice(0, prefix.length).toLowerCase() === prefix.toLowerCase())
      {
        this.materialIdx = index;
        this.shortname = parameterName.slice(prefix.length);
        return;
      }
    }
  }

  /** Reports whether construction matched one of the supplied material prefixes. */
  @blue.method
  IsMaterialIdxValid()
  {
    return this.materialIdx !== -1;
  }

  /** Returns the zero-based matched prefix position, or -1 when none matched. */
  @blue.method
  GetMaterialIdx()
  {
    return this.materialIdx;
  }

  /** Returns the currently qualified material parameter name. */
  @blue.method
  GetFullName()
  {
    return this.fullname;
  }

  /** Returns the parameter suffix remaining after its recognized material prefix. */
  @blue.method
  GetShortName()
  {
    return this.shortname;
  }

  /**
   * When a prefix is recognized, rebuilds the qualified name with the requested
   * generic material prefix and updates the stored index.
   */
  @blue.method
  ChangeMaterialIdx(genericData, index)
  {
    if (this.IsMaterialIdxValid())
    {
      this.fullname = genericData.materialPrefixes[index] + this.shortname;
      this.materialIdx = index;
    }
  }

}
