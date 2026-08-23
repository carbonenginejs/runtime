// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFUtils.h

/** Parses and remaps Carbon SOF material parameter prefixes. */
export class EveSOFUtilsParameterName
{

  /**
   * Parses a parameter name against case-insensitive material prefixes,
   * retaining its full name, unprefixed suffix, and matched index.
   */
  constructor(prefixes = [], parameterName = "")
  {
    this.fullname = parameterName;
    this.shortname = parameterName;
    this.materialIdx = -1;

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
  IsMaterialIdxValid()
  {
    return this.materialIdx !== -1;
  }

  /** Returns the zero-based matched prefix position, or -1 when none matched. */
  GetMaterialIdx()
  {
    return this.materialIdx;
  }

  /** Returns the currently qualified material parameter name. */
  GetFullName()
  {
    return this.fullname;
  }

  /** Returns the parameter suffix remaining after its recognized material prefix. */
  GetShortName()
  {
    return this.shortname;
  }

  /**
   * When a prefix is recognized, rebuilds the qualified name with the requested
   * generic material prefix and updates the stored index.
   */
  ChangeMaterialIdx(genericData, index)
  {
    if (this.IsMaterialIdxValid())
    {
      this.fullname = genericData.materialPrefixes[index] + this.shortname;
      this.materialIdx = index;
    }
  }

}
