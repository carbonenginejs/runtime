import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_blinkMode, _init_extra_blinkMode, _init_colorType, _init_extra_colorType, _init_boneIndex, _init_extra_boneIndex, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_color, _init_extra_color, _init_layer1Transform, _init_extra_layer1Transform, _init_layer1Scroll, _init_extra_layer1Scroll, _init_layer2Transform, _init_extra_layer2Transform, _init_layer2Scroll, _init_extra_layer2Scroll, _init_groupIndex, _init_extra_groupIndex, _init_maskMapAtlasIndex, _init_extra_maskMapAtlasIndex, _init_blinkPhase, _init_extra_blinkPhase, _init_blinkRate, _init_extra_blinkRate, _init_lights, _init_extra_lights, _init_intensity, _init_extra_intensity, _init_saturation, _init_extra_saturation;

/** EveSOFDataHullPlaneSetItem (eve) - generated from schema shapeHash 40a65460.... */
let _EveSOFDataHullPlaneS;
class EveSOFDataHullPlaneSetItem extends CjsModel {
  static {
    ({
      e: [_init_blinkMode, _init_extra_blinkMode, _init_colorType, _init_extra_colorType, _init_boneIndex, _init_extra_boneIndex, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_color, _init_extra_color, _init_layer1Transform, _init_extra_layer1Transform, _init_layer1Scroll, _init_extra_layer1Scroll, _init_layer2Transform, _init_extra_layer2Transform, _init_layer2Scroll, _init_extra_layer2Scroll, _init_groupIndex, _init_extra_groupIndex, _init_maskMapAtlasIndex, _init_extra_maskMapAtlasIndex, _init_blinkPhase, _init_extra_blinkPhase, _init_blinkRate, _init_extra_blinkRate, _init_lights, _init_extra_lights, _init_intensity, _init_extra_intensity, _init_saturation, _init_extra_saturation],
      c: [_EveSOFDataHullPlaneS, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullPlaneSetItem",
      family: "eve"
    })], [[[io, io.persist, type, type.int32, void 0, type.enum("BlinkType")], 16, "blinkMode"], [[io, io.persist, type, type.int32, void 0, type.enum("ColorType")], 16, "colorType"], [[io, io.persist, type, type.int32], 16, "boneIndex"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.color], 16, "color"], [[io, io.persist, type, type.vec4], 16, "layer1Transform"], [[io, io.persist, type, type.vec4], 16, "layer1Scroll"], [[io, io.persist, type, type.vec4], 16, "layer2Transform"], [[io, io.persist, type, type.vec4], 16, "layer2Scroll"], [[io, io.persist, type, type.int32], 16, "groupIndex"], [[io, io.persist, type, type.int32], 16, "maskMapAtlasIndex"], [[io, io.persist, type, type.float32], 16, "blinkPhase"], [[io, io.persist, type, type.float32], 16, "blinkRate"], [[io, io.persist, void 0, type.list("EveSOFDataPointLightAttachment")], 16, "lights"], [[io, io.persist, type, type.float32], 16, "intensity"], [[io, io.persist, type, type.float32], 16, "saturation"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_saturation(this);
  }
  /** m_blinkMode (int32_t) [READWRITE, PERSIST, ENUM] */
  blinkMode = _init_blinkMode(this, 0);

  /** m_colorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  colorType = (_init_extra_blinkMode(this), _init_colorType(this, 0));

  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  boneIndex = (_init_extra_colorType(this), _init_boneIndex(this, -1));

  /** m_position (Vector3) [READWRITE, PERSIST] */
  position = (_init_extra_boneIndex(this), _init_position(this, vec3.create()));

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  rotation = (_init_extra_position(this), _init_rotation(this, quat.create()));

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

  /** m_color (Color) [READWRITE, PERSIST] */
  color = (_init_extra_scaling(this), _init_color(this, vec4.fromValues(1, 1, 1, 1)));

  /** m_layer1Transform (Vector4) [READWRITE, PERSIST] */
  layer1Transform = (_init_extra_color(this), _init_layer1Transform(this, vec4.create()));

  /** m_layer1Scroll (Vector4) [READWRITE, PERSIST] */
  layer1Scroll = (_init_extra_layer1Transform(this), _init_layer1Scroll(this, vec4.create()));

  /** m_layer2Transform (Vector4) [READWRITE, PERSIST] */
  layer2Transform = (_init_extra_layer1Scroll(this), _init_layer2Transform(this, vec4.create()));

  /** m_layer2Scroll (Vector4) [READWRITE, PERSIST] */
  layer2Scroll = (_init_extra_layer2Transform(this), _init_layer2Scroll(this, vec4.create()));

  /** m_groupIndex (int32_t) [READWRITE, PERSIST] */
  groupIndex = (_init_extra_layer2Scroll(this), _init_groupIndex(this, -1));

  /** m_maskMapAtlasIndex (int32_t) [READWRITE, PERSIST] */
  maskMapAtlasIndex = (_init_extra_groupIndex(this), _init_maskMapAtlasIndex(this, 0));

  /** m_phase (float) [READWRITE, PERSIST] */
  blinkPhase = (_init_extra_maskMapAtlasIndex(this), _init_blinkPhase(this, 0));

  /** m_rate (float) [READWRITE, PERSIST] */
  blinkRate = (_init_extra_blinkPhase(this), _init_blinkRate(this, 1));

  /** m_dutyCycle (float) - runtime-only Carbon field; not exposed to Blue. */
  dutyCycle = (_init_extra_blinkRate(this), 1);

  /** m_lights (PEveSOFDataPointLightAttachmentVector) [READ, PERSIST] */
  lights = _init_lights(this, []);

  /** m_intensity (float) [READWRITE, PERSIST] */
  intensity = (_init_extra_lights(this), _init_intensity(this, 1));

  /** m_saturation (float) [READWRITE, PERSIST] */
  saturation = (_init_extra_intensity(this), _init_saturation(this, 1));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullPlaneS as EveSOFDataHullPlaneSetItem };
//# sourceMappingURL=EveSOFDataHullPlaneSetItem.js.map
