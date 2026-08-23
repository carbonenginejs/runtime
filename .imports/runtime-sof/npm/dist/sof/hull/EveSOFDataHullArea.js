import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_areaType, _init_extra_areaType, _init_textures, _init_extra_textures, _init_parameters, _init_extra_parameters, _init_index, _init_extra_index, _init_count, _init_extra_count, _init_name, _init_extra_name, _init_shader, _init_extra_shader, _init_blockedMaterials, _init_extra_blockedMaterials;

/** Carbon-authored hull mesh-area record. */
let _EveSOFDataHullArea;
class EveSOFDataHullArea extends CjsModel {
  static {
    ({
      e: [_init_areaType, _init_extra_areaType, _init_textures, _init_extra_textures, _init_parameters, _init_extra_parameters, _init_index, _init_extra_index, _init_count, _init_extra_count, _init_name, _init_extra_name, _init_shader, _init_extra_shader, _init_blockedMaterials, _init_extra_blockedMaterials],
      c: [_EveSOFDataHullArea, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullArea",
      family: "eve"
    })], [[[io, io.persist, type, type.int32, void 0, type.enum("AreaType")], 16, "areaType"], [[io, io.persist, void 0, type.list("EveSOFDataTexture")], 16, "textures"], [[io, io.persist, void 0, type.list("EveSOFDataParameter")], 16, "parameters"], [[io, io.persist, type, type.uint32], 16, "index"], [[io, io.persist, type, type.uint32], 16, "count"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.string], 16, "shader"], [[io, io.persist, type, type.uint32], 16, "blockedMaterials"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_blockedMaterials(this);
  }
  /** m_areaType (EveSOFDataArea::AreaType - enum AreaType) [READWRITE, PERSIST, ENUM] */
  areaType = _init_areaType(this, 0);

  /** m_textures (PEveSOFDataTextureVector) [READ, PERSIST] */
  textures = (_init_extra_areaType(this), _init_textures(this, []));

  /** m_parameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  parameters = (_init_extra_textures(this), _init_parameters(this, []));

  /** m_index (uint32_t) [READWRITE, PERSIST] */
  index = (_init_extra_parameters(this), _init_index(this, 0));

  /** m_count (uint32_t) [READWRITE, PERSIST] */
  count = (_init_extra_index(this), _init_count(this, 1));

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_count(this), _init_name(this, ""));

  /** m_shader (BlueSharedString) [READWRITE, PERSIST] */
  shader = (_init_extra_name(this), _init_shader(this, ""));

  /** m_blockedMaterials (uint32_t) [READWRITE, PERSIST] */
  blockedMaterials = (_init_extra_shader(this), _init_blockedMaterials(this, 0));
  Assign(config = {}) {
    config.textures = this.AssignTextures(config.textures);
    config.parameters = this.AssignParameters(config.parameters);
    return config;
  }
  AssignParameters(out = {}) {
    for (const parameter of this.parameters) parameter.Assign(out);
    return out;
  }
  AssignTextures(out = {}) {
    for (const texture of this.textures) texture.Assign(out);
    return out;
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataHullArea as EveSOFDataHullArea };
//# sourceMappingURL=EveSOFDataHullArea.js.map
