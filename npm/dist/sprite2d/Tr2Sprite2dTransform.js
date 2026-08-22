import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2Sprite2dContainerBase as _Tr2Sprite2dContainer } from './Tr2Sprite2dContainerBase.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';

let _initProto, _initClass, _init_rotationCenter, _init_extra_rotationCenter, _init_scalingCenter, _init_extra_scalingCenter, _init_rotation, _init_extra_rotation, _init_scale, _init_extra_scale, _init_scalingRotation, _init_extra_scalingRotation;

/** Applies authored Sprite2D rotation and scaling around configurable centers. */
let _Tr2Sprite2dTransform;
new class extends _identity {
  static [class Tr2Sprite2dTransform extends _Tr2Sprite2dContainer {
    static {
      ({
        e: [_init_rotationCenter, _init_extra_rotationCenter, _init_scalingCenter, _init_extra_scalingCenter, _init_rotation, _init_extra_rotation, _init_scale, _init_extra_scale, _init_scalingRotation, _init_extra_scalingRotation, _initProto],
        c: [_Tr2Sprite2dTransform, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2Sprite2dTransform",
        family: "sprite2d"
      })], [[[io, io.notify, io, io.readwrite, type, type.vec2], 16, "rotationCenter"], [[io, io.notify, io, io.readwrite, type, type.vec2], 16, "scalingCenter"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "rotation"], [[io, io.notify, io, io.readwrite, type, type.vec2], 16, "scale"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "scalingRotation"], [[carbon, carbon.method, impl, impl.adapted], 18, "TransformPoint"]], 0, void 0, _Tr2Sprite2dContainer));
    }
    constructor(...args) {
      super(...args);
      _init_extra_scalingRotation(this);
    }
    /** m_rotationCenter (Vector2) [READWRITE, NOTIFY] */
    rotationCenter = (_initProto(this), _init_rotationCenter(this, vec2.create()));

    /** m_scalingCenter (Vector2) [READWRITE, NOTIFY] */
    scalingCenter = (_init_extra_rotationCenter(this), _init_scalingCenter(this, vec2.create()));

    /** m_rotation (float) [READWRITE, NOTIFY] */
    rotation = (_init_extra_scalingCenter(this), _init_rotation(this, 0));

    /** m_scale (Vector2) [READWRITE, NOTIFY] */
    scale = (_init_extra_rotation(this), _init_scale(this, vec2.fromValues(1, 1)));

    /** m_scalingRotation (float) [READWRITE, NOTIFY] */
    scalingRotation = (_init_extra_scale(this), _init_scalingRotation(this, 0));

    /** Carbon method TransformPoint (MAP_METHOD_AND_WRAP). */
    TransformPoint(x, y) {
      const scalingCenterX = Math.floor(this.scalingCenter[0] * this.displayWidth + 0.5);
      const scalingCenterY = Math.floor(this.scalingCenter[1] * this.displayHeight + 0.5);
      const rotationCenterX = Math.floor(this.rotationCenter[0] * this.displayWidth + 0.5);
      const rotationCenterY = Math.floor(this.rotationCenter[1] * this.displayHeight + 0.5);
      let px = Number(x) - scalingCenterX;
      let py = Number(y) - scalingCenterY;
      [px, py] = _Tr2Sprite2dTransform.#Rotate(px, py, -this.scalingRotation);
      px *= this.scale[0];
      py *= this.scale[1];
      [px, py] = _Tr2Sprite2dTransform.#Rotate(px, py, this.scalingRotation);
      px += scalingCenterX - rotationCenterX;
      py += scalingCenterY - rotationCenterY;
      [px, py] = _Tr2Sprite2dTransform.#Rotate(px, py, this.rotation);
      return vec2.fromValues(px + rotationCenterX, py + rotationCenterY);
    }

    /** Rotates one 2D coordinate pair by an angle in radians. */
  }];
  #Rotate(x, y, angle) {
    const sine = Math.sin(angle);
    const cosine = Math.cos(angle);
    return [x * cosine - y * sine, x * sine + y * cosine];
  }
  constructor() {
    super(_Tr2Sprite2dTransform), _initClass();
  }
}();

export { _Tr2Sprite2dTransform as Tr2Sprite2dTransform };
//# sourceMappingURL=Tr2Sprite2dTransform.js.map
