import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_colorType, _init_extra_colorType, _init_boneIndex, _init_extra_boneIndex, _init_position, _init_extra_position, _init_scaling, _init_extra_scaling, _init_rotation, _init_extra_rotation, _init_hazeBrightness, _init_extra_hazeBrightness, _init_hazeFalloff, _init_extra_hazeFalloff, _init_sourceBrightness, _init_extra_sourceBrightness, _init_sourceSize, _init_extra_sourceSize, _init_boosterGainInfluence, _init_extra_boosterGainInfluence, _init_lights, _init_extra_lights, _init_saturation, _init_extra_saturation;

/** EveSOFDataHullHazeSetItem (eve) - generated from schema shapeHash 87e1b0e0.... */
let _EveSOFDataHullHazeSe;
class EveSOFDataHullHazeSetItem extends CjsModel {
  static {
    ({
      e: [_init_colorType, _init_extra_colorType, _init_boneIndex, _init_extra_boneIndex, _init_position, _init_extra_position, _init_scaling, _init_extra_scaling, _init_rotation, _init_extra_rotation, _init_hazeBrightness, _init_extra_hazeBrightness, _init_hazeFalloff, _init_extra_hazeFalloff, _init_sourceBrightness, _init_extra_sourceBrightness, _init_sourceSize, _init_extra_sourceSize, _init_boosterGainInfluence, _init_extra_boosterGainInfluence, _init_lights, _init_extra_lights, _init_saturation, _init_extra_saturation],
      c: [_EveSOFDataHullHazeSe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullHazeSetItem",
      family: "eve"
    })], [[[io, io.persist, type, type.int32, void 0, type.enum("ColorType")], 16, "colorType"], [[io, io.persist, type, type.int32], 16, "boneIndex"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.float32], 16, "hazeBrightness"], [[io, io.persist, type, type.float32], 16, "hazeFalloff"], [[io, io.persist, type, type.float32], 16, "sourceBrightness"], [[io, io.persist, type, type.float32], 16, "sourceSize"], [[io, io.persist, type, type.boolean], 16, "boosterGainInfluence"], [[io, io.persist, void 0, type.list("EveSOFDataPointLightAttachment")], 16, "lights"], [[io, io.persist, type, type.float32], 16, "saturation"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_saturation(this);
  }
  /** m_colorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  colorType = _init_colorType(this, 0);

  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  boneIndex = (_init_extra_colorType(this), _init_boneIndex(this, -1));

  /** m_position (Vector3) [READWRITE, PERSIST] */
  position = (_init_extra_boneIndex(this), _init_position(this, vec3.create()));

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  scaling = (_init_extra_position(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  rotation = (_init_extra_scaling(this), _init_rotation(this, quat.create()));

  /** m_hazeBrightness (float) [READWRITE, PERSIST] */
  hazeBrightness = (_init_extra_rotation(this), _init_hazeBrightness(this, 1));

  /** m_hazeFalloff (float) [READWRITE, PERSIST] */
  hazeFalloff = (_init_extra_hazeBrightness(this), _init_hazeFalloff(this, 6));

  /** m_sourceBrightness (float) [READWRITE, PERSIST] */
  sourceBrightness = (_init_extra_hazeFalloff(this), _init_sourceBrightness(this, 2));

  /** m_sourceSize (float) [READWRITE, PERSIST] */
  sourceSize = (_init_extra_sourceBrightness(this), _init_sourceSize(this, 0.2));

  /** m_boosterGainInfluence (bool) [READWRITE, PERSIST] */
  boosterGainInfluence = (_init_extra_sourceSize(this), _init_boosterGainInfluence(this, false));

  /** m_lights (PEveSOFDataPointLightAttachmentVector) [READ, PERSIST] */
  lights = (_init_extra_boosterGainInfluence(this), _init_lights(this, []));

  /** m_saturation (float) [READWRITE, PERSIST] */
  saturation = (_init_extra_lights(this), _init_saturation(this, 1));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullHazeSe as EveSOFDataHullHazeSetItem };
//# sourceMappingURL=EveSOFDataHullHazeSetItem.js.map
