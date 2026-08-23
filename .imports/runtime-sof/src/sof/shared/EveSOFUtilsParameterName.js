// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObjectFactory/EveSOFUtils.h

/** Parses and remaps Carbon SOF material parameter prefixes. */
export class EveSOFUtilsParameterName
{

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

  IsMaterialIdxValid()
  {
    return this.materialIdx !== -1;
  }

  GetMaterialIdx()
  {
    return this.materialIdx;
  }

  GetFullName()
  {
    return this.fullname;
  }

  GetShortName()
  {
    return this.shortname;
  }

  ChangeMaterialIdx(genericData, index)
  {
    if (this.IsMaterialIdxValid())
    {
      this.fullname = genericData.materialPrefixes[index] + this.shortname;
      this.materialIdx = index;
    }
  }

}
