import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { EveSOFDataHullBanner as _EveSOFDataHullBanner$1 } from './EveSOFDataHullBanner.js';

let _initClass, _init_usage, _init_extra_usage, _init_boneIndex, _init_extra_boneIndex, _init_scaling, _init_extra_scaling, _init_angleX, _init_extra_angleX, _init_angleY, _init_extra_angleY, _init_name, _init_extra_name, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_light, _init_extra_light, _init_maintainAspectRatio, _init_extra_maintainAspectRatio;

/** EveSOFDataHullBannerSetItem (eve) - generated from schema shapeHash 5b7ae35e.... */
let _EveSOFDataHullBanner;
new class extends _identity {
  static [class EveSOFDataHullBannerSetItem extends CjsModel {
    static {
      ({
        e: [_init_usage, _init_extra_usage, _init_boneIndex, _init_extra_boneIndex, _init_scaling, _init_extra_scaling, _init_angleX, _init_extra_angleX, _init_angleY, _init_extra_angleY, _init_name, _init_extra_name, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_light, _init_extra_light, _init_maintainAspectRatio, _init_extra_maintainAspectRatio],
        c: [_EveSOFDataHullBanner, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataHullBannerSetItem",
        family: "eve"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("Usage")], 16, "usage"], [[io, io.persist, type, type.int32], 16, "boneIndex"], [[io, io.persistOnly, type, type.vec3], 16, "scaling"], [[io, io.persistOnly, type, type.float32], 16, "angleX"], [[io, io.persistOnly, type, type.float32], 16, "angleY"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, void 0, type.objectRef("EveSOFDataPointLightAttachment")], 16, "light"], [[io, io.readwrite, type, type.boolean], 16, "maintainAspectRatio"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_maintainAspectRatio(this);
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

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_angleY(this), _init_name(this, ""));

    /** m_position (Vector3) [READWRITE, PERSIST] */
    position = (_init_extra_name(this), _init_position(this, vec3.create()));

    /** m_rotation (Quaternion) [READWRITE, PERSIST] */
    rotation = (_init_extra_position(this), _init_rotation(this, quat.create()));

    /** m_light (EveSOFDataPointLightAttachmentPtr) [READWRITE, PERSIST] */
    light = (_init_extra_rotation(this), _init_light(this, null));

    /** m_maintainAspectRatio (bool) [READWRITE] */
    maintainAspectRatio = (_init_extra_light(this), _init_maintainAspectRatio(this, true));
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
      return _EveSOFDataHullBanner$1.GetBannerAspectRatio({
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
  constructor() {
    super(_EveSOFDataHullBanner), _initClass();
  }
}();

export { _EveSOFDataHullBanner as EveSOFDataHullBannerSetItem };
//# sourceMappingURL=EveSOFDataHullBannerSetItem.js.map
