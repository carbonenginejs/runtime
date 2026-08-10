import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_materialSource, _init_extra_materialSource, _init_projectionTypeU, _init_extra_projectionTypeU, _init_projectionTypeV, _init_extra_projectionTypeV, _init_textureName, _init_extra_textureName, _init_textureResFilePath, _init_extra_textureResFilePath, _init_isTargetMtl, _init_extra_isTargetMtl, _init_isTargetMtl2, _init_extra_isTargetMtl2, _init_isTargetMtl3, _init_extra_isTargetMtl3, _init_isTargetMtl4, _init_extra_isTargetMtl4;

/** EveSOFDataPatternLayer (eve) - generated from schema shapeHash ea568a07.... */
let _EveSOFDataPatternLay;
new class extends _identity {
  static [class EveSOFDataPatternLayer extends CjsModel {
    static {
      ({
        e: [_init_materialSource, _init_extra_materialSource, _init_projectionTypeU, _init_extra_projectionTypeU, _init_projectionTypeV, _init_extra_projectionTypeV, _init_textureName, _init_extra_textureName, _init_textureResFilePath, _init_extra_textureResFilePath, _init_isTargetMtl, _init_extra_isTargetMtl, _init_isTargetMtl2, _init_extra_isTargetMtl2, _init_isTargetMtl3, _init_extra_isTargetMtl3, _init_isTargetMtl4, _init_extra_isTargetMtl4],
        c: [_EveSOFDataPatternLay, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataPatternLayer",
        family: "eve"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("MaterialSource")], 16, "materialSource"], [[io, io.persist, type, type.int32, void 0, type.enum("ProjectionType")], 16, "projectionTypeU"], [[io, io.persist, type, type.int32, void 0, type.enum("ProjectionType")], 16, "projectionTypeV"], [[io, io.persist, type, type.string], 16, "textureName"], [[io, io.persist, type, type.string], 16, "textureResFilePath"], [[io, io.persist, type, type.boolean], 16, "isTargetMtl1"], [[io, io.persist, type, type.boolean], 16, "isTargetMtl2"], [[io, io.persist, type, type.boolean], 16, "isTargetMtl3"], [[io, io.persist, type, type.boolean], 16, "isTargetMtl4"]], 0, void 0, CjsModel));
    }
    /** m_materialSource (MaterialSource - enum MaterialSource) [READWRITE, PERSIST, ENUM] */
    materialSource = _init_materialSource(this, 0);

    /** m_projectionTypeU (ProjectionType - enum ProjectionType) [READWRITE, PERSIST, ENUM] */
    projectionTypeU = (_init_extra_materialSource(this), _init_projectionTypeU(this, 0));

    /** m_projectionTypeV (ProjectionType - enum ProjectionType) [READWRITE, PERSIST, ENUM] */
    projectionTypeV = (_init_extra_projectionTypeU(this), _init_projectionTypeV(this, 0));

    /** m_textureName (BlueSharedString) [READWRITE, PERSIST] */
    textureName = (_init_extra_projectionTypeV(this), _init_textureName(this, ""));

    /** m_textureResFilePath (std::string) [READWRITE, PERSIST] */
    textureResFilePath = (_init_extra_textureName(this), _init_textureResFilePath(this, ""));

    /** m_isTargetMtl1 (bool) [READWRITE, PERSIST] */
    isTargetMtl1 = (_init_extra_textureResFilePath(this), _init_isTargetMtl(this, true));

    /** m_isTargetMtl2 (bool) [READWRITE, PERSIST] */
    isTargetMtl2 = (_init_extra_isTargetMtl(this), _init_isTargetMtl2(this, true));

    /** m_isTargetMtl3 (bool) [READWRITE, PERSIST] */
    isTargetMtl3 = (_init_extra_isTargetMtl2(this), _init_isTargetMtl3(this, true));

    /** m_isTargetMtl4 (bool) [READWRITE, PERSIST] */
    isTargetMtl4 = (_init_extra_isTargetMtl3(this), _init_isTargetMtl4(this, true));
    constructor(textureName = "") {
      super(), _init_extra_isTargetMtl4(this);
      this.textureName = textureName;
    }
    Empty() {
      this.isTargetMtl1 = false;
      this.isTargetMtl2 = false;
      this.isTargetMtl3 = false;
      this.isTargetMtl4 = false;
      this.materialSource = this.constructor.MaterialSource.SOURCE_MATERIAL1;
      this.projectionTypeU = this.constructor.ProjectionType.PROJECTION_REPEAT;
      this.projectionTypeV = this.constructor.ProjectionType.PROJECTION_REPEAT;
      this.textureResFilePath = this.constructor.EMPTY_TEXTURE_RES_FILE_PATH;
      return this;
    }
    SetFromTexture(textureParameter, samplerOverride = null) {
      if (!textureParameter) throw new TypeError("EveSOFDataPatternLayer.SetFromTexture requires a texture parameter");
      this.projectionTypeU = this.constructor.ProjectionType.PROJECTION_REPEAT;
      this.projectionTypeV = this.constructor.ProjectionType.PROJECTION_REPEAT;
      const value = typeof textureParameter.GetValue === "function" ? textureParameter.GetValue() : textureParameter.value ?? textureParameter.resourcePath;
      this.textureResFilePath = value || this.constructor.EMPTY_TEXTURE_RES_FILE_PATH;
      if (!samplerOverride && textureParameter.useAllOverrides) {
        samplerOverride = textureParameter.overrides;
      }
      if (samplerOverride) {
        this.projectionTypeU = this.constructor.FromAddressMode(samplerOverride.addressUMode);
        this.projectionTypeV = this.constructor.FromAddressMode(samplerOverride.addressVMode);
      }
      return this;
    }
    SetFromCustomMask(customMask) {
      if (!customMask) return this.Empty();
      const targets = customMask.targetMaterials ?? [];
      this.isTargetMtl1 = Boolean(targets[0]);
      this.isTargetMtl2 = Boolean(targets[1]);
      this.isTargetMtl3 = Boolean(targets[2]);
      this.isTargetMtl4 = Boolean(targets[3]);
      this.materialSource = Number(customMask.materialIndex ?? 0);
      return this.SetFromTexture(customMask.parameters?.PatternMaskMap);
    }
    static ToAddressMode(projectionType) {
      switch (projectionType) {
        case this.ProjectionType.PROJECTION_BORDER:
          return 4;
        case this.ProjectionType.PROJECTION_CLAMP:
          return 3;
        default:
          return 1;
      }
    }
    static FromAddressMode(addressMode) {
      switch (addressMode) {
        case 4:
          return this.ProjectionType.PROJECTION_BORDER;
        case 3:
          return this.ProjectionType.PROJECTION_CLAMP;
        default:
          return this.ProjectionType.PROJECTION_REPEAT;
      }
    }
  }];
  ProjectionType = Object.freeze({
    PROJECTION_REPEAT: 0,
    PROJECTION_CLAMP: 1,
    PROJECTION_BORDER: 2
  });
  MaterialSource = Object.freeze({
    SOURCE_MATERIAL1: 0,
    SOURCE_MATERIAL2: 1,
    SOURCE_MATERIAL3: 2,
    SOURCE_MATERIAL4: 3,
    SOURCE_PATTERN1: 4,
    SOURCE_PATTERN2: 5
  });
  EMPTY_TEXTURE_RES_FILE_PATH = "";
  constructor() {
    super(_EveSOFDataPatternLay), _initClass();
  }
}();

export { _EveSOFDataPatternLay as EveSOFDataPatternLayer };
//# sourceMappingURL=EveSOFDataPatternLayer.js.map
