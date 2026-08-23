// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { EveSOFDataHullBanner } from "./EveSOFDataHullBanner.js";

/** EveSOFDataHullBannerSetItem (eve) - generated from schema shapeHash 5b7ae35e.... */
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
  @io.persist
  @type.int32
  @type.enum("Usage")
  usage = 3;

  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  boneIndex = -1;

  /** m_scaling (Vector3) [PERSISTONLY] */
  @io.persistOnly
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_angleX (float) [PERSISTONLY] */
  @io.persistOnly
  @type.float32
  angleX = 0;

  /** m_angleY (float) [PERSISTONLY] */
  @io.persistOnly
  @type.float32
  angleY = 0;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  position = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_light (EveSOFDataPointLightAttachmentPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataPointLightAttachment")
  light = null;

  /** m_maintainAspectRatio (bool) [READWRITE] */
  @io.readwrite
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
