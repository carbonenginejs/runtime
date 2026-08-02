import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_sourcePath, _init_extra_sourcePath, _init_label, _init_extra_label, _init_mode, _init_extra_mode, _init_angleRotation, _init_extra_angleRotation, _init_aspectRatio, _init_extra_aspectRatio, _init_azimuth, _init_extra_azimuth, _init_texturePath, _init_extra_texturePath, _init_maskPath, _init_extra_maskPath, _init_headEnabled, _init_extra_headEnabled, _init_bodyEnabled, _init_extra_bodyEnabled, _init_flipX, _init_extra_flipX, _init_flipY, _init_extra_flipY, _init_height, _init_extra_height, _init_incline, _init_extra_incline, _init_layer, _init_extra_layer, _init_maskPathEnabled, _init_extra_maskPathEnabled, _init_offset, _init_extra_offset, _init_pitch, _init_extra_pitch, _init_planarBeta, _init_extra_planarBeta, _init_planarScale, _init_extra_planarScale, _init_position, _init_extra_position, _init_radius, _init_extra_radius, _init_roll, _init_extra_roll, _init_scale, _init_extra_scale, _init_yaw, _init_extra_yaw;

/** Authored character projection profile with external texture references. */
let _CjsCharacterProjecti;
class CjsCharacterProjectionProfile extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_sourcePath, _init_extra_sourcePath, _init_label, _init_extra_label, _init_mode, _init_extra_mode, _init_angleRotation, _init_extra_angleRotation, _init_aspectRatio, _init_extra_aspectRatio, _init_azimuth, _init_extra_azimuth, _init_texturePath, _init_extra_texturePath, _init_maskPath, _init_extra_maskPath, _init_headEnabled, _init_extra_headEnabled, _init_bodyEnabled, _init_extra_bodyEnabled, _init_flipX, _init_extra_flipX, _init_flipY, _init_extra_flipY, _init_height, _init_extra_height, _init_incline, _init_extra_incline, _init_layer, _init_extra_layer, _init_maskPathEnabled, _init_extra_maskPathEnabled, _init_offset, _init_extra_offset, _init_pitch, _init_extra_pitch, _init_planarBeta, _init_extra_planarBeta, _init_planarScale, _init_extra_planarScale, _init_position, _init_extra_position, _init_radius, _init_extra_radius, _init_roll, _init_extra_roll, _init_scale, _init_extra_scale, _init_yaw, _init_extra_yaw],
      c: [_CjsCharacterProjecti, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterProjectionProfile",
      family: "character"
    })], [[[io, io.readwrite, type, type.path], 16, "sourcePath"], [[io, io.readwrite, type, type.string], 16, "label"], [[io, io.readwrite, type, type.int32], 16, "mode"], [[io, io.readwrite, type, type.float64], 16, "angleRotation"], [[io, io.readwrite, type, type.float64], 16, "aspectRatio"], [[io, io.readwrite, type, type.float64], 16, "azimuth"], [[io, io.readwrite, type, type.path], 16, "texturePath"], [[io, io.readwrite, type, type.path], 16, "maskPath"], [[io, io.readwrite, type, type.boolean], 16, "headEnabled"], [[io, io.readwrite, type, type.boolean], 16, "bodyEnabled"], [[io, io.readwrite, type, type.boolean], 16, "flipX"], [[io, io.readwrite, type, type.boolean], 16, "flipY"], [[io, io.readwrite, type, type.float64], 16, "height"], [[io, io.readwrite, type, type.float64], 16, "incline"], [[io, io.readwrite, type, type.int32], 16, "layer"], [[io, io.readwrite, type, type.boolean], 16, "maskPathEnabled"], [[io, io.readwrite, type, type.vec2], 16, "offset"], [[io, io.readwrite, type, type.float64], 16, "pitch"], [[io, io.readwrite, type, type.float64], 16, "planarBeta"], [[io, io.readwrite, type, type.float64], 16, "planarScale"], [[io, io.readwrite, type, type.vec3], 16, "position"], [[io, io.readwrite, type, type.float64], 16, "radius"], [[io, io.readwrite, type, type.float64], 16, "roll"], [[io, io.readwrite, type, type.float64], 16, "scale"], [[io, io.readwrite, type, type.float64], 16, "yaw"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_yaw(this);
  }
  sourcePath = _init_sourcePath(this, "");
  label = (_init_extra_sourcePath(this), _init_label(this, null));
  mode = (_init_extra_label(this), _init_mode(this, 0));
  angleRotation = (_init_extra_mode(this), _init_angleRotation(this, 0));
  aspectRatio = (_init_extra_angleRotation(this), _init_aspectRatio(this, 1));
  azimuth = (_init_extra_aspectRatio(this), _init_azimuth(this, 0));
  texturePath = (_init_extra_azimuth(this), _init_texturePath(this, null));
  maskPath = (_init_extra_texturePath(this), _init_maskPath(this, null));
  headEnabled = (_init_extra_maskPath(this), _init_headEnabled(this, false));
  bodyEnabled = (_init_extra_headEnabled(this), _init_bodyEnabled(this, false));
  flipX = (_init_extra_bodyEnabled(this), _init_flipX(this, false));
  flipY = (_init_extra_flipX(this), _init_flipY(this, false));
  height = (_init_extra_flipY(this), _init_height(this, 0));
  incline = (_init_extra_height(this), _init_incline(this, 0));
  layer = (_init_extra_incline(this), _init_layer(this, 0));
  maskPathEnabled = (_init_extra_layer(this), _init_maskPathEnabled(this, false));
  offset = (_init_extra_maskPathEnabled(this), _init_offset(this, [0, 0]));
  pitch = (_init_extra_offset(this), _init_pitch(this, 0));
  planarBeta = (_init_extra_pitch(this), _init_planarBeta(this, 0));
  planarScale = (_init_extra_planarBeta(this), _init_planarScale(this, 0));
  position = (_init_extra_planarScale(this), _init_position(this, [0, 0, 0]));
  radius = (_init_extra_position(this), _init_radius(this, 0));
  roll = (_init_extra_radius(this), _init_roll(this, 0));
  scale = (_init_extra_roll(this), _init_scale(this, 0));
  yaw = (_init_extra_scale(this), _init_yaw(this, 0));
  static {
    _initClass();
  }
}

export { _CjsCharacterProjecti as CjsCharacterProjectionProfile };
//# sourceMappingURL=CjsCharacterProjectionProfile.js.map
