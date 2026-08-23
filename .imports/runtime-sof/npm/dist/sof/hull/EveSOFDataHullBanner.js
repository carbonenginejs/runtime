import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { EveSOFDataHullBannerLight as _EveSOFDataHullBanner$1 } from './EveSOFDataHullBannerLight.js';

let _initClass, _init_usage, _init_extra_usage, _init_boneIndex, _init_extra_boneIndex, _init_scaling, _init_extra_scaling, _init_angleX, _init_extra_angleX, _init_angleY, _init_extra_angleY, _init_lightOverride, _init_extra_lightOverride, _init_name, _init_extra_name, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_maintainAspectRatio, _init_extra_maintainAspectRatio, _init_visibilityGroup, _init_extra_visibilityGroup;

/** EveSOFDataHullBanner (eve) - generated from schema shapeHash bea85335.... */
let _EveSOFDataHullBanner;
new class extends _identity {
  static [class EveSOFDataHullBanner extends CjsModel {
    static {
      ({
        e: [_init_usage, _init_extra_usage, _init_boneIndex, _init_extra_boneIndex, _init_scaling, _init_extra_scaling, _init_angleX, _init_extra_angleX, _init_angleY, _init_extra_angleY, _init_lightOverride, _init_extra_lightOverride, _init_name, _init_extra_name, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_maintainAspectRatio, _init_extra_maintainAspectRatio, _init_visibilityGroup, _init_extra_visibilityGroup],
        c: [_EveSOFDataHullBanner, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataHullBanner",
        family: "eve"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("Usage")], 16, "usage"], [[io, io.persist, type, type.int32], 16, "boneIndex"], [[io, io.persistOnly, type, type.vec3], 16, "scaling"], [[io, io.persistOnly, type, type.float32], 16, "angleX"], [[io, io.persistOnly, type, type.float32], 16, "angleY"], [[io, io.persist, void 0, type.objectRef("EveSOFDataHullBannerLight")], 16, "lightOverride"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.readwrite, type, type.boolean], 16, "maintainAspectRatio"], [[io, io.persist, type, type.string], 16, "visibilityGroup"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_visibilityGroup(this);
    }
    /** m_usage (Usage - enum Usage) [READWRITE, PERSIST, ENUM] */
    usage = _init_usage(this, 3);

    /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
    boneIndex = (_init_extra_usage(this), _init_boneIndex(this, -1));

    /** m_scaling (Vector3) [PERSISTONLY] */
    scaling = (_init_extra_boneIndex(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

    /** m_angleX (float) [PERSISTONLY] */
    angleX = (_init_extra_scaling(this), _init_angleX(this, 0));

    /** m_angleY (float) [PERSISTONLY] */
    angleY = (_init_extra_angleX(this), _init_angleY(this, 0));

    /** m_lightOverride (EveSOFDataHullBannerLightPtr) [READ, PERSIST] */
    lightOverride = (_init_extra_angleY(this), _init_lightOverride(this, new _EveSOFDataHullBanner$1()));

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_lightOverride(this), _init_name(this, ""));

    /** m_position (Vector3) [READWRITE, PERSIST] */
    position = (_init_extra_name(this), _init_position(this, vec3.create()));

    /** m_rotation (Quaternion) [READWRITE, PERSIST] */
    rotation = (_init_extra_position(this), _init_rotation(this, quat.create()));

    /** m_maintainAspectRatio (bool) [READWRITE] */
    maintainAspectRatio = (_init_extra_rotation(this), _init_maintainAspectRatio(this, true));

    /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
    visibilityGroup = (_init_extra_maintainAspectRatio(this), _init_visibilityGroup(this, "primary"));
    GetTargetAspectRatio() {
      const {
        Usage
      } = _EveSOFDataHullBanner;
      switch (this.usage) {
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
    GetAspectRatio() {
      return _EveSOFDataHullBanner.GetBannerAspectRatio({
        position: vec3.create(),
        rotation: quat.create(),
        scaling: this.scaling,
        angleX: this.angleX,
        angleY: this.angleY
      });
    }
    GetAngleX() {
      return this.angleX;
    }
    SetAngleX(angle) {
      this.angleX = angle;
      if (this.maintainAspectRatio) {
        this.scaling[1] *= this.GetAspectRatio() / this.GetTargetAspectRatio();
      }
    }
    GetAngleY() {
      return this.angleY;
    }
    SetAngleY(angle) {
      this.angleY = angle;
      if (this.maintainAspectRatio) {
        const ratio = this.GetAspectRatio();
        if (ratio !== 0) {
          this.scaling[0] *= this.GetTargetAspectRatio() / ratio;
        }
      }
    }
    GetScaling() {
      return vec3.clone(this.scaling);
    }
    SetScaling(scaling) {
      vec3.copy(this.scaling, scaling);
      if (this.maintainAspectRatio) {
        const ratio = this.GetAspectRatio();
        if (this.GetTargetAspectRatio() < 1) {
          if (ratio !== 0) {
            this.scaling[0] *= this.GetTargetAspectRatio() / ratio;
          }
        } else {
          this.scaling[1] *= ratio / this.GetTargetAspectRatio();
        }
      }
    }

    /**
     * Ported from EveBannerSet::GetBannerAspectRatio
     * (trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveBannerSet.cpp).
     * `banner` carries EveBannerItem's position/rotation/scaling/angleX/angleY.
     */
    static GetBannerAspectRatio(banner) {
      const flatX = banner.angleX <= 0;
      const flatY = banner.angleY <= 0;
      if (flatX && flatY) {
        return banner.scaling[0] / banner.scaling[1];
      } else if (flatX) {
        return _EveSOFDataHullBanner.#GetVerticalCurvedBannerAspectRatio(banner);
      } else if (flatY) {
        return _EveSOFDataHullBanner.#GetHorizontalCurvedBannerAspectRatio(banner);
      }
      return _EveSOFDataHullBanner.#GetCurvedBannerAspectRatio(banner);
    }
  }];
  Usage = Object.freeze({
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
  #GetBannerTransform(banner) {
    return mat4.fromRotationTranslationScale(mat4.create(), banner.rotation, banner.position, banner.scaling);
  }
  #GetVerticalCurvedBannerAspectRatio(banner) {
    const transform = _EveSOFDataHullBanner.#GetBannerTransform(banner);
    const clampedAngleY = Math.max(0, Math.min(banner.angleY, 180));
    const segmentsY = 1 + Math.floor(clampedAngleY / 5);
    const halfAngleY = clampedAngleY / 180 * Math.PI / 2;
    const scaleY = 0.5 / Math.sin(halfAngleY);
    const pos = vec3.create();
    const prevPos = vec3.create();
    const uLength = banner.scaling[0];
    let vLength = 0;
    for (let j = 0; j <= segmentsY; ++j) {
      const y = j / segmentsY;
      const angleY = -halfAngleY + y * 2 * halfAngleY;
      const sinAngleY = Math.sin(angleY + Math.PI / 2);
      const cosAngleY = Math.cos(angleY + Math.PI / 2);
      vec3.set(pos, 0, cosAngleY * scaleY, (sinAngleY - 1) * scaleY);
      vec3.transformMat4(pos, pos, transform);
      if (j) {
        vLength += vec3.distance(pos, prevPos);
      }
      vec3.copy(prevPos, pos);
    }
    return uLength / vLength;
  }
  #GetHorizontalCurvedBannerAspectRatio(banner) {
    const transform = _EveSOFDataHullBanner.#GetBannerTransform(banner);
    const clampedAngleX = Math.max(0, Math.min(banner.angleX, 180));
    const segmentsX = 1 + Math.floor(clampedAngleX / 5);
    const halfAngleX = clampedAngleX / 180 * Math.PI / 2;
    const scaleX = 0.5 / Math.sin(halfAngleX);
    const pos = vec3.create();
    const prevPos = vec3.create();
    let uLength = 0;
    const vLength = banner.scaling[1];
    for (let i = 0; i <= segmentsX; ++i) {
      const x = i / segmentsX;
      const angleX = -halfAngleX + x * 2 * halfAngleX;
      const sinAngleX = Math.sin(angleX);
      const cosAngleX = Math.cos(angleX);
      vec3.set(pos, sinAngleX * scaleX, 0, (cosAngleX - 1) * scaleX);
      vec3.transformMat4(pos, pos, transform);
      if (i) {
        uLength += vec3.distance(pos, prevPos);
      }
      vec3.copy(prevPos, pos);
    }
    return uLength / vLength;
  }
  #GetCurvedBannerAspectRatio(banner) {
    const transform = _EveSOFDataHullBanner.#GetBannerTransform(banner);
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
    for (let i = 0; i <= segmentsX; ++i) {
      const x = i / segmentsX;
      const angleX = -halfAngleX + x * 2 * halfAngleX;
      const sinAngleX = Math.sin(angleX);
      const cosAngleX = Math.cos(angleX);
      vec3.set(pos, sinAngleX * scaleX, 0, (cosAngleX - 1) * scaleZ);
      vec3.transformMat4(pos, pos, transform);
      if (i) {
        uLength += vec3.distance(prevPos, pos);
      }
      vec3.copy(prevPos, pos);
    }
    for (let j = 0; j <= segmentsY; ++j) {
      const y = j / segmentsY;
      const angleY = -halfAngleY + y * 2 * halfAngleY;
      const sinAngleY = Math.sin(angleY + Math.PI / 2);
      const cosAngleY = Math.cos(angleY + Math.PI / 2);
      vec3.set(pos, 0, cosAngleY * scaleY, (sinAngleY - 1) * scaleZ);
      vec3.transformMat4(pos, pos, transform);
      if (j) {
        vLength += vec3.distance(prevPos, pos);
      }
      vec3.copy(prevPos, pos);
    }
    return uLength / vLength;
  }
  constructor() {
    super(_EveSOFDataHullBanner), _initClass();
  }
}();

export { _EveSOFDataHullBanner as EveSOFDataHullBanner };
//# sourceMappingURL=EveSOFDataHullBanner.js.map
