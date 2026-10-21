import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:532-543
import { type, blue } from "#schema";

/** Declares the parameters and textures accepted by a decal shader and builds its configuration record.
 * Native IRoot-only data with a self-only Blue table. Independently initialized
 * lists retain native parent-owned data; none is a loaded resource. Native
 * construction needs no additional lifecycle, and the destructor is empty.
 * Existing JavaScript configuration helpers remain custom conveniences.
 */
@be.define("EveSOFDataGenericDecalShader")
@blue.inherit(IRoot)

export class EveSOFDataGenericDecalShader
{

  /**
   * Shader filename identifying this decal shader definition; native m_shader (BlueSharedString).
   * @type {string}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  shader = "";

  /**
   * Owned declarations naming accepted decal shader parameters; each record's str is the binding
   * name. Native m_parameters vector.
   * @type {Array<EveSOFDataGenericString>}
   */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataGenericString")
  parameters = [];

  /**
   * Owned named texture defaults used to seed decal shader resources; native m_defaultTextures
   * vector.
   * @type {Array<EveSOFDataTexture>}
   */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataTexture")
  defaultTextures = [];

  /**
   * Owned texture binding names to inherit from the parent hull mesh when building decals; native
   * m_parentTextures vector.
   * @type {Array<EveSOFDataGenericString>}
   */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataGenericString")
  parentTextures = [];

  /**
   * Native policy selecting the additive pass so these decals render above other decals;
   * preserved as authored m_additive (bool).
   * @type {boolean}
   */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.boolean
  additive = false;

  /**
   * Checks whether a name is declared as a parameter, a default texture, or a
   * parent texture.
   * Custom: retained SOF configuration helper; native shader records are data only.
   * @param {string} key Authored usage name.
   * @returns {boolean} Whether this shader references the name.
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
   * Custom: retained SOF configuration helper; native shader records are data only.
   * @param {object|null} [config={}] Destination configuration.
   * @param {object|null} [provided={}] Caller-supplied parameter and texture maps.
   * @returns {object} The populated configuration.
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
   * Custom: retained SOF configuration helper; native shader records are data only.
   * @param {object|null} [out={}] Destination parameter map.
   * @param {object|null} [provided=null] Caller-supplied parameter values.
   * @returns {object} The populated parameter map.
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
   * Custom: retained SOF configuration helper; native shader records are data only.
   * @param {object|null} [out={}] Destination texture map.
   * @param {object|null} [provided=null] Caller-supplied texture values.
   * @returns {object} The populated texture map.
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

