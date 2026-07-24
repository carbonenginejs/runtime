import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/runtime-utils/schema';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_id, _init_extra_id, _init_label, _init_extra_label, _init_mode, _init_extra_mode, _init_angleRotation, _init_extra_angleRotation, _init_aspectRatio, _init_extra_aspectRatio, _init_azimuth, _init_extra_azimuth, _init_texturePath, _init_extra_texturePath, _init_maskPath, _init_extra_maskPath, _init_headEnabled, _init_extra_headEnabled, _init_bodyEnabled, _init_extra_bodyEnabled, _init_flipX, _init_extra_flipX, _init_flipY, _init_extra_flipY, _init_height, _init_extra_height, _init_incline, _init_extra_incline, _init_layer, _init_extra_layer, _init_maskPathEnabled, _init_extra_maskPathEnabled, _init_offset, _init_extra_offset, _init_pitch, _init_extra_pitch, _init_planarBeta, _init_extra_planarBeta, _init_planarScale, _init_extra_planarScale, _init_position, _init_extra_position, _init_radius, _init_extra_radius, _init_roll, _init_extra_roll, _init_scale, _init_extra_scale, _init_yaw, _init_extra_yaw;
let _CjsCharacterProjecti;
class CjsCharacterProjection extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_label, _init_extra_label, _init_mode, _init_extra_mode, _init_angleRotation, _init_extra_angleRotation, _init_aspectRatio, _init_extra_aspectRatio, _init_azimuth, _init_extra_azimuth, _init_texturePath, _init_extra_texturePath, _init_maskPath, _init_extra_maskPath, _init_headEnabled, _init_extra_headEnabled, _init_bodyEnabled, _init_extra_bodyEnabled, _init_flipX, _init_extra_flipX, _init_flipY, _init_extra_flipY, _init_height, _init_extra_height, _init_incline, _init_extra_incline, _init_layer, _init_extra_layer, _init_maskPathEnabled, _init_extra_maskPathEnabled, _init_offset, _init_extra_offset, _init_pitch, _init_extra_pitch, _init_planarBeta, _init_extra_planarBeta, _init_planarScale, _init_extra_planarScale, _init_position, _init_extra_position, _init_radius, _init_extra_radius, _init_roll, _init_extra_roll, _init_scale, _init_extra_scale, _init_yaw, _init_extra_yaw],
      c: [_CjsCharacterProjecti, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterProjection",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.string, io, io.persist], 16, "label"], [[type, type.float32, io, io.persist], 16, "mode"], [[type, type.float32, io, io.persist], 16, "angleRotation"], [[type, type.float32, io, io.persist], 16, "aspectRatio"], [[type, type.float32, io, io.persist], 16, "azimuth"], [[type, type.path, io, io.persist], 16, "texturePath"], [[type, type.path, io, io.persist], 16, "maskPath"], [[type, type.boolean, io, io.persist], 16, "headEnabled"], [[type, type.boolean, io, io.persist], 16, "bodyEnabled"], [[type, type.boolean, io, io.persist], 16, "flipX"], [[type, type.boolean, io, io.persist], 16, "flipY"], [[type, type.float32, io, io.persist], 16, "height"], [[type, type.float32, io, io.persist], 16, "incline"], [[type, type.int32, io, io.persist], 16, "layer"], [[type, type.boolean, io, io.persist], 16, "maskPathEnabled"], [[type, type.vec2, io, io.persist], 16, "offset"], [[type, type.float32, io, io.persist], 16, "pitch"], [[type, type.float32, io, io.persist], 16, "planarBeta"], [[type, type.float32, io, io.persist], 16, "planarScale"], [[type, type.vec3, io, io.persist], 16, "position"], [[type, type.float32, io, io.persist], 16, "radius"], [[type, type.float32, io, io.persist], 16, "roll"], [[type, type.float32, io, io.persist], 16, "scale"], [[type, type.float32, io, io.persist], 16, "yaw"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_yaw(this);
  }
  id = _init_id(this, "");
  label = (_init_extra_id(this), _init_label(this, null));
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
  offset = (_init_extra_maskPathEnabled(this), _init_offset(this, vec2.create()));
  pitch = (_init_extra_offset(this), _init_pitch(this, 0));
  planarBeta = (_init_extra_pitch(this), _init_planarBeta(this, 0));
  planarScale = (_init_extra_planarBeta(this), _init_planarScale(this, 0));
  position = (_init_extra_planarScale(this), _init_position(this, vec3.create()));
  radius = (_init_extra_position(this), _init_radius(this, 0));
  roll = (_init_extra_radius(this), _init_roll(this, 0));
  scale = (_init_extra_roll(this), _init_scale(this, 0));
  yaw = (_init_extra_scale(this), _init_yaw(this, 0));
  static {
    _initClass();
  }
}

export { _CjsCharacterProjecti as CjsCharacterProjection };
//# sourceMappingURL=CjsCharacterProjection.js.map
