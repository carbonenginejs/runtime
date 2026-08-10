import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_displayModifier, _init_extra_displayModifier, _init_instances, _init_extra_instances, _init_textures, _init_extra_textures, _init_name, _init_extra_name, _init_lowestLodVisible, _init_extra_lowestLodVisible, _init_geometryResPath, _init_extra_geometryResPath, _init_shader, _init_extra_shader;

/** EveSOFDataInstancedMesh (eve) - generated from schema shapeHash 24b147a0.... */
let _EveSOFDataInstancedM;
new class extends _identity {
  static [class EveSOFDataInstancedMesh extends CjsModel {
    static {
      ({
        e: [_init_displayModifier, _init_extra_displayModifier, _init_instances, _init_extra_instances, _init_textures, _init_extra_textures, _init_name, _init_extra_name, _init_lowestLodVisible, _init_extra_lowestLodVisible, _init_geometryResPath, _init_extra_geometryResPath, _init_shader, _init_extra_shader],
        c: [_EveSOFDataInstancedM, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataInstancedMesh",
        family: "eve"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("DisplayQualityModifier")], 16, "displayModifier"], [[io, io.persist, void 0, type.list("EveSofDataMeshInstance")], 16, "instances"], [[io, io.persist, void 0, type.list("EveSOFDataTexture")], 16, "textures"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.int32, void 0, type.enum("Tr2Lod")], 16, "lowestLodVisible"], [[io, io.persist, type, type.string], 16, "geometryResPath"], [[io, io.persist, type, type.string], 16, "shader"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_shader(this);
    }
    /** m_displayModifier (DisplayQualityModifier - enum DisplayQualityModifier) [READWRITE, PERSIST, ENUM] */
    displayModifier = _init_displayModifier(this, 5);

    /** m_instances (PEveSofDataMeshInstanceStructureList) [READ, PERSIST] */
    instances = (_init_extra_displayModifier(this), _init_instances(this, []));

    /** m_textures (PEveSOFDataTextureVector) [READ, PERSIST] */
    textures = (_init_extra_instances(this), _init_textures(this, []));

    /** m_name (BlueSharedString) [READWRITE, PERSIST] */
    name = (_init_extra_textures(this), _init_name(this, ""));

    /** m_lowestLodVisible (Tr2Lod - enum Tr2Lod) [READWRITE, PERSIST, ENUM] */
    lowestLodVisible = (_init_extra_name(this), _init_lowestLodVisible(this, 0));

    /** m_geometryResPath (std::string) [READWRITE, PERSIST] */
    geometryResPath = (_init_extra_lowestLodVisible(this), _init_geometryResPath(this, ""));

    /** m_shader (BlueSharedString) [READWRITE, PERSIST] */
    shader = (_init_extra_geometryResPath(this), _init_shader(this, ""));
  }];
  DisplayQualityModifier = Object.freeze({
    SHADER_LOW: 0,
    SHADER_LOWMID: 1,
    SHADER_MED: 2,
    SHADER_HIGHMID: 3,
    SHADER_HIGH: 4,
    SHADER_ALL: 5
  });
  constructor() {
    super(_EveSOFDataInstancedM), _initClass();
  }
}();

export { _EveSOFDataInstancedM as EveSOFDataInstancedMesh };
//# sourceMappingURL=EveSOFDataInstancedMesh.js.map
