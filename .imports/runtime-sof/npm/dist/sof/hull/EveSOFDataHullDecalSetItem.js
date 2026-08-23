import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_logoType, _init_extra_logoType, _init_usage, _init_extra_usage, _init_glowColorType, _init_extra_glowColorType, _init_boneIndex, _init_extra_boneIndex, _init_parameters, _init_extra_parameters, _init_textures, _init_extra_textures, _init_indexBuffers, _init_extra_indexBuffers, _init_multiHullIndexBuffers, _init_extra_multiHullIndexBuffers, _init_name, _init_extra_name, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_meshIndex, _init_extra_meshIndex;

/** EveSOFDataHullDecalSetItem (eve) - generated from schema shapeHash 246ca107.... */
let _EveSOFDataHullDecalS;
new class extends _identity {
  static [class EveSOFDataHullDecalSetItem extends CjsModel {
    static {
      ({
        e: [_init_logoType, _init_extra_logoType, _init_usage, _init_extra_usage, _init_glowColorType, _init_extra_glowColorType, _init_boneIndex, _init_extra_boneIndex, _init_parameters, _init_extra_parameters, _init_textures, _init_extra_textures, _init_indexBuffers, _init_extra_indexBuffers, _init_multiHullIndexBuffers, _init_extra_multiHullIndexBuffers, _init_name, _init_extra_name, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_meshIndex, _init_extra_meshIndex],
        c: [_EveSOFDataHullDecalS, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataHullDecalSetItem",
        family: "eve"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("LogoType")], 16, "logoType"], [[io, io.persist, type, type.int32, void 0, type.enum("Usage")], 16, "usage"], [[io, io.persist, type, type.int32, void 0, type.enum("ColorType")], 16, "glowColorType"], [[io, io.persist, type, type.int32], 16, "boneIndex"], [[io, io.persist, void 0, type.list("EveSOFDataParameter")], 16, "parameters"], [[io, io.persist, void 0, type.list("EveSOFDataTexture")], 16, "textures"], [[io, io.persist, void 0, type.list("EveSOFDataDecalIndexBuffer")], 16, "indexBuffers"], [[io, io.persist, void 0, type.list("EveSOFDataMultiHullDecalIndexBuffers")], 16, "multiHullIndexBuffers"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.int32], 16, "meshIndex"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_meshIndex(this);
    }
    /** m_logoType (EveSOFDataLogoSet::LogoType - enum LogoType) [READWRITE, PERSIST, ENUM] */
    logoType = _init_logoType(this, 0);

    /** m_usage (Usage - enum Usage) [READWRITE, PERSIST, ENUM] */
    usage = (_init_extra_logoType(this), _init_usage(this, 0));

    /** m_glowColorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
    glowColorType = (_init_extra_usage(this), _init_glowColorType(this, 0));

    /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
    boneIndex = (_init_extra_glowColorType(this), _init_boneIndex(this, -1));

    /** m_parameters (PEveSOFDataParameterVector) [READ, PERSIST] */
    parameters = (_init_extra_boneIndex(this), _init_parameters(this, []));

    /** m_textures (PEveSOFDataTextureVector) [READ, PERSIST] */
    textures = (_init_extra_parameters(this), _init_textures(this, []));

    /** m_indexBuffers (PEveSOFDataDecalIndexBufferVector) [READ, PERSIST] */
    indexBuffers = (_init_extra_textures(this), _init_indexBuffers(this, []));

    /** m_multiHullIndexBuffers (PEveSOFDataMultiHullDecalIndexBuffersVector) [READ, PERSIST] */
    multiHullIndexBuffers = (_init_extra_indexBuffers(this), _init_multiHullIndexBuffers(this, []));

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_multiHullIndexBuffers(this), _init_name(this, ""));

    /** m_position (Vector3) [READWRITE, PERSIST] */
    position = (_init_extra_name(this), _init_position(this, vec3.create()));

    /** m_rotation (Quaternion) [READWRITE, PERSIST] */
    rotation = (_init_extra_position(this), _init_rotation(this, quat.create()));

    /** m_scaling (Vector3) [READWRITE, PERSIST] */
    scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

    /** m_meshIndex (int32_t) [READWRITE, PERSIST] */
    meshIndex = (_init_extra_scaling(this), _init_meshIndex(this, -1));
  }];
  Usage = Object.freeze({
    USAGE_STANDARD: 0,
    USAGE_KILLCOUNTER: 1,
    USAGE_HOLE: 2,
    USAGE_CYLINDRICAL: 3,
    USAGE_GLOWCYLINDRICAL: 4,
    USAGE_GLOWSTANDARD: 5,
    USAGE_LOGO: 6,
    USAGE_MAX: 7
  });
  constructor() {
    super(_EveSOFDataHullDecalS), _initClass();
  }
}();

export { _EveSOFDataHullDecalS as EveSOFDataHullDecalSetItem };
//# sourceMappingURL=EveSOFDataHullDecalSetItem.js.map
