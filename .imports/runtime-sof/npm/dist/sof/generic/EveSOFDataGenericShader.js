import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_parameters, _init_extra_parameters, _init_defaultParameters, _init_extra_defaultParameters, _init_defaultTextures, _init_extra_defaultTextures, _init_transparencyTextureName, _init_extra_transparencyTextureName, _init_doGenerateDepthArea, _init_extra_doGenerateDepthArea, _init_shader, _init_extra_shader;

/** EveSOFDataGenericShader (eve) - generated from schema shapeHash 54379592.... */
let _EveSOFDataGenericSha;
new class extends _identity {
  static [class EveSOFDataGenericShader extends CjsModel {
    static {
      ({
        e: [_init_parameters, _init_extra_parameters, _init_defaultParameters, _init_extra_defaultParameters, _init_defaultTextures, _init_extra_defaultTextures, _init_transparencyTextureName, _init_extra_transparencyTextureName, _init_doGenerateDepthArea, _init_extra_doGenerateDepthArea, _init_shader, _init_extra_shader],
        c: [_EveSOFDataGenericSha, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataGenericShader",
        family: "eve"
      })], [[[io, io.persist, void 0, type.list("EveSOFDataGenericString")], 16, "parameters"], [[io, io.persist, void 0, type.list("EveSOFDataParameter")], 16, "defaultParameters"], [[io, io.persist, void 0, type.list("EveSOFDataTexture")], 16, "defaultTextures"], [[io, io.persist, type, type.string], 16, "transparencyTextureName"], [[io, io.persist, type, type.boolean], 16, "doGenerateDepthArea"], [[io, io.persist, type, type.string], 16, "shader"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_shader(this);
    }
    /** m_parameters (PEveSOFDataGenericStringVector) [READ, PERSIST] */
    parameters = _init_parameters(this, []);

    /** m_defaultParameters (PEveSOFDataParameterVector) [READ, PERSIST] */
    defaultParameters = (_init_extra_parameters(this), _init_defaultParameters(this, []));

    /** m_defaultTextures (PEveSOFDataTextureVector) [READ, PERSIST] */
    defaultTextures = (_init_extra_defaultParameters(this), _init_defaultTextures(this, []));

    /** m_transparencyTextureName (BlueSharedString) [READWRITE, PERSIST] */
    transparencyTextureName = (_init_extra_defaultTextures(this), _init_transparencyTextureName(this, ""));

    /** m_doGenerateDepthArea (bool) [READWRITE, PERSIST] */
    doGenerateDepthArea = (_init_extra_transparencyTextureName(this), _init_doGenerateDepthArea(this, true));

    /** m_shader (BlueSharedString) [READWRITE, PERSIST] */
    shader = (_init_extra_doGenerateDepthArea(this), _init_shader(this, ""));
    HasUsage(key) {
      if (!key) return false;
      return this.transparencyTextureName === key || this.defaultParameters.some(value => value?.name === key) || this.parameters.some(value => value?.str === key) || this.defaultTextures.some(value => value?.name === key);
    }
    get hasPatternMaskMaps() {
      return _EveSOFDataGenericSha.PatternMaskMaps.some(name => this.defaultTextures.some(value => value?.name === name));
    }
    Assign(config = {}, provided = {}) {
      config = config || {};
      provided = provided || {};
      config.parameters = this.AssignParameters(config.parameters, provided.parameters);
      config.textures = this.AssignTextures(config.textures, provided.textures);
      return config;
    }
    AssignParameters(out = {}, provided = null) {
      out = out || {};
      for (const value of this.defaultParameters) {
        value?.Assign?.(out);
      }
      for (const value of this.parameters) {
        const name = value?.str;
        if (!name) continue;
        if (provided && Object.hasOwn(provided, name)) {
          const parameter = provided[name];
          out[name] = Array.isArray(parameter) || ArrayBuffer.isView(parameter) ? Array.from(parameter) : parameter;
        } else if (!Object.hasOwn(out, name)) {
          out[name] = [0, 0, 0, 1];
        }
      }
      return out;
    }
    AssignTextures(out = {}, provided = null) {
      out = out || {};
      for (const value of this.defaultTextures) {
        value?.Assign?.(out);
      }
      if (provided && typeof provided === "object") Object.assign(out, provided);
      return out;
    }
  }];
  PatternMaskMaps = Object.freeze(["PatternMask1Map", "PatternMask2Map"]);
  constructor() {
    super(_EveSOFDataGenericSha), _initClass();
  }
}();

export { _EveSOFDataGenericSha as EveSOFDataGenericShader };
//# sourceMappingURL=EveSOFDataGenericShader.js.map
