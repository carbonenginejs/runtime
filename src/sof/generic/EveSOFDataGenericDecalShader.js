// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataGenericDecalShader (eve) - generated from schema shapeHash ce334d46.... */
@type.define({ className: "EveSOFDataGenericDecalShader", family: "eve" })
export class EveSOFDataGenericDecalShader extends CjsModel
{

  /** m_parameters (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataGenericString")
  parameters = [];

  /** m_defaultTextures (PEveSOFDataTextureVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataTexture")
  defaultTextures = [];

  /** m_parentTextures (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataGenericString")
  parentTextures = [];

  /** m_additive (bool) [READ, PERSIST] */
  @io.persist
  @type.boolean
  additive = false;

  /** m_shader (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  shader = "";

  /**
   * Checks whether a name is declared as a parameter, a default texture, or a
   * parent texture.
   */
  HasUsage(key)
  {
    if (!key) return false;
    return this.parameters.some(value => value?.str === key)
      || this.defaultTextures.some(value => value?.name === key)
      || this.parentTextures.some(value => value?.str === key);
  }

  /**
   * Populates a decal shader configuration's parameter and texture maps from
   * declarations, defaults, and provided values.
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
   * Copies provided declared parameters and assigns [0,0,0,1] where neither
   * caller nor output supplied a value.
   */
  AssignParameters(out = {}, provided = null)
  {
    out = out || {};
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
   * Applies authored defaults, then fills each declared parent texture from
   * provided values or an empty-path fallback.
   */
  AssignTextures(out = {}, provided = null)
  {
    out = out || {};
    for (const value of this.defaultTextures)
    {
      if (value) value.Assign(out);
    }
    for (const value of this.parentTextures)
    {
      const name = value?.str;
      if (!name) continue;
      if (provided && Object.hasOwn(provided, name))
      {
        out[name] = provided[name];
      }
      else if (!Object.hasOwn(out, name))
      {
        out[name] = "";
      }
    }
    return out;
  }

}
