// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataPatternLayer (eve) - generated from schema shapeHash ea568a07.... */
@type.define({ className: "EveSOFDataPatternLayer", family: "eve" })
export class EveSOFDataPatternLayer extends CjsModel
{

  static ProjectionType = Object.freeze({
    PROJECTION_REPEAT: 0,
    PROJECTION_CLAMP: 1,
    PROJECTION_BORDER: 2
  });

  static MaterialSource = Object.freeze({
    SOURCE_MATERIAL1: 0,
    SOURCE_MATERIAL2: 1,
    SOURCE_MATERIAL3: 2,
    SOURCE_MATERIAL4: 3,
    SOURCE_PATTERN1: 4,
    SOURCE_PATTERN2: 5
  });

  static EMPTY_TEXTURE_RES_FILE_PATH = "";

  /** m_materialSource (MaterialSource - enum MaterialSource) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("MaterialSource")
  materialSource = 0;

  /** m_projectionTypeU (ProjectionType - enum ProjectionType) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("ProjectionType")
  projectionTypeU = 0;

  /** m_projectionTypeV (ProjectionType - enum ProjectionType) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("ProjectionType")
  projectionTypeV = 0;

  /** m_textureName (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  textureName = "";

  /** m_textureResFilePath (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  textureResFilePath = "";

  /** m_isTargetMtl1 (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isTargetMtl1 = true;

  /** m_isTargetMtl2 (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isTargetMtl2 = true;

  /** m_isTargetMtl3 (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isTargetMtl3 = true;

  /** m_isTargetMtl4 (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isTargetMtl4 = true;

  /** Creates a pattern layer associated with the supplied texture parameter name. */
  constructor(textureName = "")
  {
    super();
    this.textureName = textureName;
  }

  /**
   * Disables every material target and restores repeat projection, primary
   * material source, and a blank texture path.
   */
  Empty()
  {
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

  /**
   * Copies a texture parameter's resource path and translates its sampler
   * override into U and V projection modes.
   */
  SetFromTexture(textureParameter, samplerOverride = null)
  {
    if (!textureParameter) throw new TypeError("EveSOFDataPatternLayer.SetFromTexture requires a texture parameter");
    this.projectionTypeU = this.constructor.ProjectionType.PROJECTION_REPEAT;
    this.projectionTypeV = this.constructor.ProjectionType.PROJECTION_REPEAT;
    const value = textureParameter.resourcePath;
    this.textureResFilePath = value || this.constructor.EMPTY_TEXTURE_RES_FILE_PATH;

    if (!samplerOverride && textureParameter.useAllOverrides)
    {
      samplerOverride = textureParameter.overrides;
    }
    if (samplerOverride)
    {
      this.projectionTypeU = this.constructor.FromAddressMode(samplerOverride.addressUMode);
      this.projectionTypeV = this.constructor.FromAddressMode(samplerOverride.addressVMode);
    }
    return this;
  }

  /**
   * Maps a custom mask's material targets, source index, texture path, and
   * sampler policy onto this layer, or clears it for null.
   */
  SetFromCustomMask(customMask)
  {
    if (!customMask) return this.Empty();
    const targets = customMask.targetMaterials ?? [];
    this.isTargetMtl1 = Boolean(targets[0]);
    this.isTargetMtl2 = Boolean(targets[1]);
    this.isTargetMtl3 = Boolean(targets[2]);
    this.isTargetMtl4 = Boolean(targets[3]);
    this.materialSource = Number(customMask.materialIndex ?? 0);
    return this.SetFromTexture(customMask.parameters?.PatternMaskMap);
  }

  /**
   * Translates a SOF projection enum to sampler address-mode constants 1, 3, or
   * 4.
   */
  static ToAddressMode(projectionType)
  {
    switch (projectionType)
    {
      case this.ProjectionType.PROJECTION_BORDER:
        return 4;
      case this.ProjectionType.PROJECTION_CLAMP:
        return 3;
      default:
        return 1;
    }
  }

  /**
   * Translates sampler constants 3 and 4 to clamp and border projection, using
   * repeat otherwise.
   */
  static FromAddressMode(addressMode)
  {
    switch (addressMode)
    {
      case 4:
        return this.ProjectionType.PROJECTION_BORDER;
      case 3:
        return this.ProjectionType.PROJECTION_CLAMP;
      default:
        return this.ProjectionType.PROJECTION_REPEAT;
    }
  }

}
