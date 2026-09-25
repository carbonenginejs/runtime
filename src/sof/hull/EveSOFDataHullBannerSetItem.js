// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { blue, EnumRegistrationType } from "#blue";
import { CjsModel } from "#model";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { EveSOFDataHullBanner } from "./EveSOFDataHullBanner.js";

/** Places one banner by usage, bone, and transform, with optional point-light, aspect-scale, and curvature settings. */
@type.define({ className: "EveSOFDataHullBannerSetItem", family: "eve" })
export class EveSOFDataHullBannerSetItem extends CjsModel
{

  static Usage = Object.freeze({
    ALLIANCE_LOGO: 0,
    CORP_LOGO: 1,
    CEO_PORTRAIT: 2,
    VERTICAL_BANNER: 3,
    HORIZONTAL_BANNER: 4,
    TARGET_SYSTEM_ALLIANCE_LOGO: 5,
    TARGET_SYSTEM_VERTICAL_BANNER: 6,
    TARGET_SYSTEM_HORIZONTAL_BANNER: 7,
    TARGET_SYSTEM_INFO_0: 8,
    TARGET_SYSTEM_INFO_1: 9,
    TARGET_SYSTEM_INFO_2: 10,
    TARGET_SYSTEM_INFO_3: 11,
    TARGET_SYSTEM_INFO_4: 12,
    TARGET_SYSTEM_STATUS: 13,
    CURRENT_SYSTEM_ALLIANCE_LOGO: 14,
    CURRENT_SYSTEM_VERTICAL_BANNER: 15,
    CURRENT_SYSTEM_HORIZONTAL_BANNER: 16,
    PUBLICITY_POSTER: 17,
    PUBLICITY_PORTRAIT: 18,
    RECRUITMENT_INFORMATION_0: 19,
    RECRUITMENT_INFORMATION_1: 20,
    RECRUITMENT_INFORMATION_2: 21,
    RECRUITMENT_INFORMATION_3: 22,
    RECRUITMENT_INFORMATION_4: 23,
    _USAGE_COUNT: 24
  });

  /** m_usage (Usage - enum Usage) [READWRITE, PERSIST, ENUM] */
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.EveSOFDataHullBannerSetItem.Usage")
  usage = 3;

  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.int32
  boneIndex = -1;

  /** m_scaling (Vector3) [PERSISTONLY] */
  @edit.readwrite
  @edit.persistOnly
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_angleX (float) [PERSISTONLY] */
  @edit.readwrite
  @edit.persistOnly
  @type.float32
  angleX = 0;

  /** m_angleY (float) [PERSISTONLY] */
  @edit.readwrite
  @edit.persistOnly
  @type.float32
  angleY = 0;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.vec3
  position = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.quat
  rotation = quat.create();

  /** m_light (EveSOFDataPointLightAttachmentPtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.objectRef("EveSOFDataPointLightAttachment")
  light = null;

  /** m_maintainAspectRatio (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  maintainAspectRatio = true;

  /** Maps this banner usage to Carbon's canonical target width-to-height ratio. */
  GetTargetAspectRatio()
  {
    const { Usage } = EveSOFDataHullBannerSetItem;
    switch (this.usage)
    {
      case Usage.VERTICAL_BANNER:
      case Usage.TARGET_SYSTEM_VERTICAL_BANNER:
      case Usage.CURRENT_SYSTEM_VERTICAL_BANNER:
        return 0.25;
      case Usage.PUBLICITY_POSTER:
        return 3 / 4;
      case Usage.HORIZONTAL_BANNER:
      case Usage.TARGET_SYSTEM_HORIZONTAL_BANNER:
      case Usage.CURRENT_SYSTEM_HORIZONTAL_BANNER:
      case Usage.TARGET_SYSTEM_STATUS:
        return 4;
      default:
        return 1;
    }
  }

  /**
   * Computes the curved banner's current width-to-height ratio from its scale
   * and bend angles.
   */
  GetAspectRatio()
  {
    return EveSOFDataHullBanner.GetBannerAspectRatio({
      position: vec3.create(),
      rotation: quat.create(),
      scaling: this.scaling,
      angleX: this.angleX,
      angleY: this.angleY
    });
  }

  /** Reads the horizontal bend angle stored for this banner placement. */
  GetAngleX()
  {
    return this.angleX;
  }

  /**
   * Updates the horizontal bend and rescales the vertical axis when ratio
   * preservation is enabled.
   */
  SetAngleX(angle)
  {
    this.angleX = angle;
    if (this.maintainAspectRatio)
    {
      this.scaling[1] *= this.GetAspectRatio() / this.GetTargetAspectRatio();
    }
  }

  /** Reads the vertical bend angle stored for this banner placement. */
  GetAngleY()
  {
    return this.angleY;
  }

  /**
   * Updates the vertical bend and rescales the horizontal axis when ratio
   * preservation is enabled.
   */
  SetAngleY(angle)
  {
    this.angleY = angle;
    if (this.maintainAspectRatio)
    {
      const ratio = this.GetAspectRatio();
      if (ratio !== 0)
      {
        this.scaling[0] *= this.GetTargetAspectRatio() / ratio;
      }
    }
  }

  /** Returns a detached copy of this banner placement's three-axis scale. */
  GetScaling()
  {
    return vec3.clone(this.scaling);
  }

  /**
   * Copies a three-axis scale into this placement and corrects one axis to
   * preserve its target ratio.
   */
  SetScaling(scaling)
  {
    vec3.copy(this.scaling, scaling);
    if (this.maintainAspectRatio)
    {
      const ratio = this.GetAspectRatio();
      if (this.GetTargetAspectRatio() < 1)
      {
        if (ratio !== 0)
        {
          this.scaling[0] *= this.GetTargetAspectRatio() / ratio;
        }
      }
      else
      {
        this.scaling[1] *= ratio / this.GetTargetAspectRatio();
      }
    }
  }

}

// Native chooser labels and selection; the enum object retains all C++ members.
// Native chooser quirk: HorizontalBanner's description says "Vertical banner".
blue.enums.RegisterEnum("trinity.EveSOFDataHullBannerSetItem.Usage", EveSOFDataHullBannerSetItem.Usage, {
  source: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h", family: "eve", line: 905,
  exposedName: "HullBannerSetItemUsage", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:585",
  chooser: [
    { name: "AllianceLogo", value: EveSOFDataHullBannerSetItem.Usage.ALLIANCE_LOGO, description: "Alliance logo" },
    { name: "CorpLogo", value: EveSOFDataHullBannerSetItem.Usage.CORP_LOGO, description: "Corporation logo" },
    { name: "CeoPortrait", value: EveSOFDataHullBannerSetItem.Usage.CEO_PORTRAIT, description: "Ceo portrait" },
    { name: "VerticalBanner", value: EveSOFDataHullBannerSetItem.Usage.VERTICAL_BANNER, description: "Vertical banner" },
    { name: "HorizontalBanner", value: EveSOFDataHullBannerSetItem.Usage.HORIZONTAL_BANNER, description: "Vertical banner" },
    { name: "TargetSystemAllianceLogo", value: EveSOFDataHullBannerSetItem.Usage.TARGET_SYSTEM_ALLIANCE_LOGO, description: "Target system alliance logo (gates)" },
    { name: "TargetSystemVerticalBanner", value: EveSOFDataHullBannerSetItem.Usage.TARGET_SYSTEM_VERTICAL_BANNER, description: "Target system vertical banner (gates)" },
    { name: "TargetSystemHorizontalBanner", value: EveSOFDataHullBannerSetItem.Usage.TARGET_SYSTEM_HORIZONTAL_BANNER, description: "Target system horizontal banner (gates)" },
    { name: "TargetSystemInfo0", value: EveSOFDataHullBannerSetItem.Usage.TARGET_SYSTEM_INFO_0, description: "Target system information (gates)" },
    { name: "TargetSystemInfo1", value: EveSOFDataHullBannerSetItem.Usage.TARGET_SYSTEM_INFO_1, description: "Target system information (gates)" },
    { name: "TargetSystemInfo2", value: EveSOFDataHullBannerSetItem.Usage.TARGET_SYSTEM_INFO_2, description: "Target system information (gates)" },
    { name: "TargetSystemInfo3", value: EveSOFDataHullBannerSetItem.Usage.TARGET_SYSTEM_INFO_3, description: "Target system information (gates)" },
    { name: "TargetSystemInfo4", value: EveSOFDataHullBannerSetItem.Usage.TARGET_SYSTEM_INFO_4, description: "Target system information (gates)" },
    { name: "TargetSystemStatus", value: EveSOFDataHullBannerSetItem.Usage.TARGET_SYSTEM_STATUS, description: "Target system status (gates)" },
    { name: "CurrentSystemAllianceLogo", value: EveSOFDataHullBannerSetItem.Usage.CURRENT_SYSTEM_ALLIANCE_LOGO, description: "Current system alliance logo (gates)" },
    { name: "CurrentSystemVerticalBanner", value: EveSOFDataHullBannerSetItem.Usage.CURRENT_SYSTEM_VERTICAL_BANNER, description: "Current system vertical banner (gates)" },
    { name: "CurrentSystemHorizontalBanner", value: EveSOFDataHullBannerSetItem.Usage.CURRENT_SYSTEM_HORIZONTAL_BANNER, description: "Current system horizontal banner (gates)" },
    { name: "PublicityPoster", value: EveSOFDataHullBannerSetItem.Usage.PUBLICITY_POSTER, description: "Publicity structure poster" },
    { name: "PublicityPortrait", value: EveSOFDataHullBannerSetItem.Usage.PUBLICITY_PORTRAIT, description: "Publicity structure portrait" },
    { name: "RecruitmentInformation0", value: EveSOFDataHullBannerSetItem.Usage.RECRUITMENT_INFORMATION_0, description: "Publicity structure recruitment information" },
    { name: "RecruitmentInformation1", value: EveSOFDataHullBannerSetItem.Usage.RECRUITMENT_INFORMATION_1, description: "Publicity structure recruitment information" },
    { name: "RecruitmentInformation2", value: EveSOFDataHullBannerSetItem.Usage.RECRUITMENT_INFORMATION_2, description: "Publicity structure recruitment information" },
    { name: "RecruitmentInformation3", value: EveSOFDataHullBannerSetItem.Usage.RECRUITMENT_INFORMATION_3, description: "Publicity structure recruitment information" },
    { name: "RecruitmentInformation4", value: EveSOFDataHullBannerSetItem.Usage.RECRUITMENT_INFORMATION_4, description: "Publicity structure recruitment information" }
  ]
});
