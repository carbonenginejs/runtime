// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { EveSOFDataHullBannerLight } from "./EveSOFDataHullBannerLight.js";

/** EveSOFDataHullBanner (eve) - generated from schema shapeHash bea85335.... */
@type.define({ className: "EveSOFDataHullBanner", family: "eve" })
export class EveSOFDataHullBanner extends CjsModel
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

  /** m_lightOverride (EveSOFDataHullBannerLightPtr) [READ, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataHullBannerLight")
  lightOverride = new EveSOFDataHullBannerLight();

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

  /** m_maintainAspectRatio (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  maintainAspectRatio = true;

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  visibilityGroup = "primary";

  /**
   * Maps the banner usage to its authored width-to-height target, defaulting
   * unknown usages to square.
   */
  GetTargetAspectRatio()
  {
    const { Usage } = EveSOFDataHullBanner;
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
   * Measures the current width-to-height ratio after scaling and horizontal or
   * vertical curvature are applied.
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

  /** Reads the authored horizontal curvature angle in degrees. */
  GetAngleX()
  {
    return this.angleX;
  }

  /**
   * Stores the horizontal curvature angle and adjusts vertical scale when
   * target-ratio preservation is enabled.
   */
  SetAngleX(angle)
  {
    this.angleX = angle;
    if (this.maintainAspectRatio)
    {
      this.scaling[1] *= this.GetAspectRatio() / this.GetTargetAspectRatio();
    }
  }

  /** Reads the authored vertical curvature angle in degrees. */
  GetAngleY()
  {
    return this.angleY;
  }

  /**
   * Stores the vertical curvature angle and adjusts horizontal scale when
   * target-ratio preservation is enabled.
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

  /** Returns a detached copy of the banner's three-axis scale. */
  GetScaling()
  {
    return vec3.clone(this.scaling);
  }

  /**
   * Copies a new three-axis scale and corrects one axis to preserve the
   * usage-specific target ratio.
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

  /**
   * Ported from EveBannerSet::GetBannerAspectRatio
   * (trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveBannerSet.cpp).
   * `banner` carries EveBannerItem's position/rotation/scaling/angleX/angleY.
   */
  static GetBannerAspectRatio(banner)
  {
    const flatX = banner.angleX <= 0;
    const flatY = banner.angleY <= 0;
    if (flatX && flatY)
    {
      return banner.scaling[0] / banner.scaling[1];
    }
    else if (flatX)
    {
      return EveSOFDataHullBanner.#GetVerticalCurvedBannerAspectRatio(banner);
    }
    else if (flatY)
    {
      return EveSOFDataHullBanner.#GetHorizontalCurvedBannerAspectRatio(banner);
    }
    return EveSOFDataHullBanner.#GetCurvedBannerAspectRatio(banner);
  }

  /**
   * Composes the banner rotation, position, and scaling into the matrix used for
   * curved-length sampling.
   */
  static #GetBannerTransform(banner)
  {
    return mat4.fromRotationTranslationScale(mat4.create(), banner.rotation, banner.position, banner.scaling);
  }

  /**
   * Samples the vertically curved centerline after world scaling to derive width
   * divided by arc length.
   */
  static #GetVerticalCurvedBannerAspectRatio(banner)
  {
    const transform = EveSOFDataHullBanner.#GetBannerTransform(banner);

    const clampedAngleY = Math.max(0, Math.min(banner.angleY, 180));
    const segmentsY = 1 + Math.floor(clampedAngleY / 5);
    const halfAngleY = clampedAngleY / 180 * Math.PI / 2;
    const scaleY = 0.5 / Math.sin(halfAngleY);

    const pos = vec3.create();
    const prevPos = vec3.create();
    const uLength = banner.scaling[0];
    let vLength = 0;

    for (let j = 0; j <= segmentsY; ++j)
    {
      const y = j / segmentsY;
      const angleY = -halfAngleY + y * 2 * halfAngleY;
      const sinAngleY = Math.sin(angleY + Math.PI / 2);
      const cosAngleY = Math.cos(angleY + Math.PI / 2);

      vec3.set(pos, 0, cosAngleY * scaleY, (sinAngleY - 1) * scaleY);
      vec3.transformMat4(pos, pos, transform);
      if (j)
      {
        vLength += vec3.distance(pos, prevPos);
      }
      vec3.copy(prevPos, pos);
    }

    return uLength / vLength;
  }

  /**
   * Samples the horizontally curved centerline after world scaling to derive arc
   * length divided by height.
   */
  static #GetHorizontalCurvedBannerAspectRatio(banner)
  {
    const transform = EveSOFDataHullBanner.#GetBannerTransform(banner);

    const clampedAngleX = Math.max(0, Math.min(banner.angleX, 180));
    const segmentsX = 1 + Math.floor(clampedAngleX / 5);
    const halfAngleX = clampedAngleX / 180 * Math.PI / 2;
    const scaleX = 0.5 / Math.sin(halfAngleX);

    const pos = vec3.create();
    const prevPos = vec3.create();
    let uLength = 0;
    const vLength = banner.scaling[1];

    for (let i = 0; i <= segmentsX; ++i)
    {
      const x = i / segmentsX;
      const angleX = -halfAngleX + x * 2 * halfAngleX;
      const sinAngleX = Math.sin(angleX);
      const cosAngleX = Math.cos(angleX);

      vec3.set(pos, sinAngleX * scaleX, 0, (cosAngleX - 1) * scaleX);
      vec3.transformMat4(pos, pos, transform);
      if (i)
      {
        uLength += vec3.distance(pos, prevPos);
      }
      vec3.copy(prevPos, pos);
    }

    return uLength / vLength;
  }

  /**
   * Samples both curved centerlines with a shared depth radius and returns their
   * arc-length ratio.
   */
  static #GetCurvedBannerAspectRatio(banner)
  {
    const transform = EveSOFDataHullBanner.#GetBannerTransform(banner);

    const clampedAngleX = Math.max(0, Math.min(banner.angleX, 180));
    const clampedAngleY = Math.max(0, Math.min(banner.angleY, 180));
    const segmentsX = 1 + Math.floor(clampedAngleX / 5);
    const segmentsY = 1 + Math.floor(clampedAngleY / 5);
    const halfAngleX = clampedAngleX / 180 * Math.PI / 2;
    const halfAngleY = clampedAngleY / 180 * Math.PI / 2;
    const scaleX = 0.5 / Math.sin(halfAngleX);
    const scaleY = 0.5 / Math.sin(halfAngleY);
    const scaleZ = Math.min(scaleX, scaleY);

    const pos = vec3.create();
    const prevPos = vec3.create();
    let uLength = 0;
    let vLength = 0;

    for (let i = 0; i <= segmentsX; ++i)
    {
      const x = i / segmentsX;
      const angleX = -halfAngleX + x * 2 * halfAngleX;
      const sinAngleX = Math.sin(angleX);
      const cosAngleX = Math.cos(angleX);

      vec3.set(pos, sinAngleX * scaleX, 0, (cosAngleX - 1) * scaleZ);
      vec3.transformMat4(pos, pos, transform);
      if (i)
      {
        uLength += vec3.distance(prevPos, pos);
      }
      vec3.copy(prevPos, pos);
    }

    for (let j = 0; j <= segmentsY; ++j)
    {
      const y = j / segmentsY;
      const angleY = -halfAngleY + y * 2 * halfAngleY;
      const sinAngleY = Math.sin(angleY + Math.PI / 2);
      const cosAngleY = Math.cos(angleY + Math.PI / 2);

      vec3.set(pos, 0, cosAngleY * scaleY, (sinAngleY - 1) * scaleZ);
      vec3.transformMat4(pos, pos, transform);
      if (j)
      {
        vLength += vec3.distance(prevPos, pos);
      }
      vec3.copy(prevPos, pos);
    }

    return uLength / vLength;
  }

}
