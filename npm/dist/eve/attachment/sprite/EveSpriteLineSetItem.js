import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_boneIndex, _init_extra_boneIndex, _init_name, _init_extra_name, _init_isCircle, _init_extra_isCircle, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_spacing, _init_extra_spacing, _init_blinkRate, _init_extra_blinkRate, _init_blinkPhase, _init_extra_blinkPhase, _init_blinkPhaseShift, _init_extra_blinkPhaseShift, _init_minScale, _init_extra_minScale, _init_maxScale, _init_extra_maxScale, _init_falloff, _init_extra_falloff, _init_color, _init_extra_color;
let _EveSpriteLineSetItem;
new class extends _identity {
  static [class EveSpriteLineSetItem extends CjsModel {
    static {
      ({
        e: [_init_boneIndex, _init_extra_boneIndex, _init_name, _init_extra_name, _init_isCircle, _init_extra_isCircle, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_spacing, _init_extra_spacing, _init_blinkRate, _init_extra_blinkRate, _init_blinkPhase, _init_extra_blinkPhase, _init_blinkPhaseShift, _init_extra_blinkPhaseShift, _init_minScale, _init_extra_minScale, _init_maxScale, _init_extra_maxScale, _init_falloff, _init_extra_falloff, _init_color, _init_extra_color, _initProto],
        c: [_EveSpriteLineSetItem, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSpriteLineSetItem",
        family: "eve/attachment/sprites"
      })], [[[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.int32], 16, "boneIndex"], [[io, io.persist, type, type.string], 16, "name"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.boolean], 16, "isCircle"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.vec3], 16, "position"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.quat], 16, "rotation"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.vec3], 16, "scaling"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.float32], 16, "spacing"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.float32], 16, "blinkRate"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.float32], 16, "blinkPhase"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.float32], 16, "blinkPhaseShift"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.float32], 16, "minScale"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.float32], 16, "maxScale"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.float32], 16, "falloff"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.color], 16, "color"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBounds"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoneIndex"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetPositions"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_color(this);
    }
    boneIndex = (_initProto(this), _init_boneIndex(this, 0));
    name = (_init_extra_boneIndex(this), _init_name(this, ""));
    isCircle = (_init_extra_name(this), _init_isCircle(this, false));
    position = (_init_extra_isCircle(this), _init_position(this, vec3.create()));
    rotation = (_init_extra_position(this), _init_rotation(this, quat.create()));
    scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));
    spacing = (_init_extra_scaling(this), _init_spacing(this, 1));
    blinkRate = (_init_extra_spacing(this), _init_blinkRate(this, 0.1));
    blinkPhase = (_init_extra_blinkRate(this), _init_blinkPhase(this, 0));
    blinkPhaseShift = (_init_extra_blinkPhase(this), _init_blinkPhaseShift(this, 0));
    minScale = (_init_extra_blinkPhaseShift(this), _init_minScale(this, 1));
    maxScale = (_init_extra_minScale(this), _init_maxScale(this, 10));
    falloff = (_init_extra_maxScale(this), _init_falloff(this, 0));
    color = (_init_extra_falloff(this), _init_color(this, vec4.fromValues(1, 1, 1, 1)));
    static GetSpriteCount(value) {
      const count = Math.trunc(Number(value));
      return Number.isFinite(count) && count > 0 ? count : 0;
    }
    GetBounds(out = vec4.create()) {
      if (this.isCircle) {
        return vec4.set(out, this.position[0], this.position[1], this.position[2], Math.max(this.scaling[0], this.scaling[1]));
      }
      const count = _EveSpriteLineSetItem.GetSpriteCount(this.scaling[0]);
      const direction = vec3.transformQuat(vec3.create(), _EveSpriteLineSetItem.#unitX, this.rotation);
      const distance = count * this.spacing;
      const center = vec3.scaleAndAdd(vec3.create(), this.position, direction, distance * 0.5);
      return vec4.set(out, center[0], center[1], center[2], distance * 0.5);
    }
    GetBoneIndex() {
      return this.boneIndex;
    }
    GetPositions() {
      const positions = [];
      if (this.isCircle) {
        const count = _EveSpriteLineSetItem.GetSpriteCount(this.spacing);
        const step = Math.PI * 2 / this.spacing;
        for (let index = 0; index < count; index++) {
          const alpha = step * index;
          const position = vec3.fromValues(this.scaling[0] * Math.sin(alpha), 0, this.scaling[1] * Math.cos(alpha));
          vec3.transformQuat(position, position, this.rotation);
          vec3.add(position, position, this.position);
          positions.push(position);
        }
        return positions;
      }
      const count = _EveSpriteLineSetItem.GetSpriteCount(this.scaling[0]);
      const direction = vec3.transformQuat(vec3.create(), _EveSpriteLineSetItem.#unitX, this.rotation);
      for (let index = 0; index < count; index++) {
        positions.push(vec3.scaleAndAdd(vec3.create(), this.position, direction, this.spacing * index));
      }
      return positions;
    }
  }];
  #unitX = vec3.fromValues(1, 0, 0);
  constructor() {
    super(_EveSpriteLineSetItem), _initClass();
  }
}();

export { _EveSpriteLineSetItem as EveSpriteLineSetItem };
//# sourceMappingURL=EveSpriteLineSetItem.js.map
