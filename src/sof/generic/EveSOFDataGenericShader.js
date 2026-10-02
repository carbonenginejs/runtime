// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:517-529
import { meta } from "#schema";

/** Defines a generic shader's parameters, textures, defaults, transparency and depth policy, and generated configuration.
 * Native IRoot-only data with a self-only Blue table. Independently initialized
 * lists retain native parent-owned data; none is a loaded resource. Native
 * construction needs no additional lifecycle, and the destructor is empty.
 * Existing JavaScript configuration helpers remain custom conveniences.
 */
@meta.define({ className: "EveSOFDataGenericShader", family: "eve" })
export class EveSOFDataGenericShader
{

  /**
   * Shader filename identifying this generic shader definition; native m_shader
   * (BlueSharedString).
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  shader = "";

  /**
   * Texture binding name used to obtain the transparency mask for generated depth effects; native
   * m_transparencyTextureName (BlueSharedString).
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  transparencyTextureName = "";

  /**
   * Whether mesh areas using this shader request a generated depth area; native
   * m_doGenerateDepthArea (bool).
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  doGenerateDepthArea = true;

  /**
   * Owned declarations naming accepted shader parameters; each record's str is the binding name.
   * Native m_parameters vector.
   * @type {Array<EveSOFDataGenericString>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataGenericString")
  parameters = [];

  /**
   * Owned named texture defaults applied before supplied texture values; native m_defaultTextures
   * vector.
   * @type {Array<EveSOFDataTexture>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataTexture")
  defaultTextures = [];

  /**
   * Owned named parameter defaults used to seed shader configuration values; native
   * m_defaultParameters vector.
   * @type {Array<EveSOFDataParameter>}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataParameter")
  defaultParameters = [];

  /**
   * Checks whether a name is referenced by transparency, declared or default
   * parameters, or default textures.
   * Custom: retained SOF configuration helper; native shader records are data only.
   * @param {string} key Authored usage name.
   * @returns {boolean} Whether this shader references the name.
   */
  @meta.ours
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
   * Custom: retained SOF configuration helper; native shader records are data only.
   * Kept outside schema declarations: this computed convenience is not an
   * authored property and must not enter dictionary copy or values output.
   * @returns {boolean} Whether a canonical pattern-mask default is present.
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
   * Custom: retained SOF configuration helper; native shader records are data only.
   * @param {object|null} [config={}] Destination configuration.
   * @param {object|null} [provided={}] Caller-supplied parameter and texture maps.
   * @returns {object} The populated configuration.
   */
  @meta.ours
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
   * Custom: retained SOF configuration helper; native shader records are data only.
   * @param {object|null} [out={}] Destination parameter map.
   * @param {object|null} [provided=null] Caller-supplied parameter values.
   * @returns {object} The populated parameter map.
   */
  @meta.ours
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
   * Custom: retained SOF configuration helper; native shader records are data only.
   * @param {object|null} [out={}] Destination texture map.
   * @param {object|null} [provided=null] Caller-supplied texture values.
   * @returns {object} The populated texture map.
   */
  @meta.ours
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

  /**
   * Canonical pattern-mask texture binding names used by the custom hasPatternMaskMaps
   * convenience lookup.
   * @type {Array<string>}
   */
  static PatternMaskMaps = [
    "PatternMask1Map",
    "PatternMask2Map"
  ];

}

meta.blue.interfaceTable({
  interfaces: [ EveSOFDataGenericShader ],
  chainTo: null
})(EveSOFDataGenericShader);
