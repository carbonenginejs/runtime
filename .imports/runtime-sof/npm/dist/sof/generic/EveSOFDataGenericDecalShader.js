import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_parameters, _init_extra_parameters, _init_defaultTextures, _init_extra_defaultTextures, _init_parentTextures, _init_extra_parentTextures, _init_additive, _init_extra_additive, _init_shader, _init_extra_shader;

/** EveSOFDataGenericDecalShader (eve) - generated from schema shapeHash ce334d46.... */
let _EveSOFDataGenericDec;
class EveSOFDataGenericDecalShader extends CjsModel {
  static {
    ({
      e: [_init_parameters, _init_extra_parameters, _init_defaultTextures, _init_extra_defaultTextures, _init_parentTextures, _init_extra_parentTextures, _init_additive, _init_extra_additive, _init_shader, _init_extra_shader],
      c: [_EveSOFDataGenericDec, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataGenericDecalShader",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("EveSOFDataGenericString")], 16, "parameters"], [[io, io.persist, void 0, type.list("EveSOFDataTexture")], 16, "defaultTextures"], [[io, io.persist, void 0, type.list("EveSOFDataGenericString")], 16, "parentTextures"], [[io, io.persist, type, type.boolean], 16, "additive"], [[io, io.persist, type, type.string], 16, "shader"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_shader(this);
  }
  /** m_parameters (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  parameters = _init_parameters(this, []);

  /** m_defaultTextures (PEveSOFDataTextureVector) [READ, PERSIST] */
  defaultTextures = (_init_extra_parameters(this), _init_defaultTextures(this, []));

  /** m_parentTextures (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  parentTextures = (_init_extra_defaultTextures(this), _init_parentTextures(this, []));

  /** m_additive (bool) [READ, PERSIST] */
  additive = (_init_extra_parentTextures(this), _init_additive(this, false));

  /** m_shader (BlueSharedString) [READWRITE, PERSIST] */
  shader = (_init_extra_additive(this), _init_shader(this, ""));
  HasUsage(key) {
    if (!key) return false;
    return this.parameters.some(value => value?.str === key) || this.defaultTextures.some(value => value?.name === key) || this.parentTextures.some(value => value?.str === key);
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
    for (const value of this.parentTextures) {
      const name = value?.str;
      if (!name) continue;
      if (provided && Object.hasOwn(provided, name)) {
        out[name] = provided[name];
      } else if (!Object.hasOwn(out, name)) {
        out[name] = "";
      }
    }
    return out;
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataGenericDec as EveSOFDataGenericDecalShader };
//# sourceMappingURL=EveSOFDataGenericDecalShader.js.map
