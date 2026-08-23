// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataGenericShader (eve) - generated from schema shapeHash 54379592.... */
@type.define({ className: "EveSOFDataGenericShader", family: "eve" })
export class EveSOFDataGenericShader extends CjsModel
{

  /** m_parameters (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataGenericString")
  parameters = [];

  /** m_defaultParameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataParameter")
  defaultParameters = [];

  /** m_defaultTextures (PEveSOFDataTextureVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataTexture")
  defaultTextures = [];

  /** m_transparencyTextureName (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  transparencyTextureName = "";

  /** m_doGenerateDepthArea (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  doGenerateDepthArea = true;

  /** m_shader (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  shader = "";

  /**
   * Checks whether a name is referenced by transparency, declared or default
   * parameters, or default textures.
   */
  HasUsage(key)
  {
    if (!key) return false;
    return this.transparencyTextureName === key
      || this.defaultParameters.some(value => value?.name === key)
      || this.parameters.some(value => value?.str === key)
      || this.defaultTextures.some(value => value?.name === key);
  }

  /**
   * Reports whether either canonical pattern-mask texture appears among the
   * shader defaults.
   */
  get hasPatternMaskMaps()
  {
    return EveSOFDataGenericShader.PatternMaskMaps.some(name =>
      this.defaultTextures.some(value => value?.name === name)
    );
  }

  /**
   * Populates a shader configuration's parameter and texture maps from defaults
   * plus caller-provided values.
   */
  Assign(config = {}, provided = {})
  {
    config = config || {};
    provided = provided || {};
    config.parameters = this.AssignParameters(config.parameters, provided.parameters);
    config.textures = this.AssignTextures(config.textures, provided.textures);
    return config;
  }

  /**
   * Applies default values, copies provided declared values, and supplies the
   * canonical [0,0,0,1] fallback for missing declarations.
   */
  AssignParameters(out = {}, provided = null)
  {
    out = out || {};
    for (const value of this.defaultParameters)
    {
      if (value) value.Assign(out);
    }
    for (const value of this.parameters)
    {
      const name = value?.str;
      if (!name) continue;
      if (provided && Object.hasOwn(provided, name))
      {
        const parameter = provided[name];
        out[name] = Array.isArray(parameter) || ArrayBuffer.isView(parameter)
          ? Array.from(parameter)
          : parameter;
      }
      else if (!Object.hasOwn(out, name))
      {
        out[name] = [0, 0, 0, 1];
      }
    }
    return out;
  }

  /**
   * Applies authored texture defaults before overlaying caller-provided texture
   * entries.
   */
  AssignTextures(out = {}, provided = null)
  {
    out = out || {};
    for (const value of this.defaultTextures)
    {
      if (value) value.Assign(out);
    }
    if (provided && typeof provided === "object") Object.assign(out, provided);
    return out;
  }

  static PatternMaskMaps = Object.freeze([
    "PatternMask1Map",
    "PatternMask2Map"
  ]);

}
