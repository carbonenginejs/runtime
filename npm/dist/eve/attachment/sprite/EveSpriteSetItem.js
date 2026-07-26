import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { box3 } from '@carbonenginejs/runtime-utils/box3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_name, _init_extra_name, _init_blinkRate, _init_extra_blinkRate, _init_blinkPhase, _init_extra_blinkPhase, _init_minScale, _init_extra_minScale, _init_maxScale, _init_extra_maxScale, _init_falloff, _init_extra_falloff, _init_position, _init_extra_position, _init_color, _init_extra_color, _init_warpColor, _init_extra_warpColor, _init_boneIndex, _init_extra_boneIndex;

/**
 * One authored sprite: its bone attachment, position, blink timing, scale range,
 * falloff and normal and warp colours.
 */
let _EveSpriteSetItem;
class EveSpriteSetItem extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_blinkRate, _init_extra_blinkRate, _init_blinkPhase, _init_extra_blinkPhase, _init_minScale, _init_extra_minScale, _init_maxScale, _init_extra_maxScale, _init_falloff, _init_extra_falloff, _init_position, _init_extra_position, _init_color, _init_extra_color, _init_warpColor, _init_extra_warpColor, _init_boneIndex, _init_extra_boneIndex, _initProto],
      c: [_EveSpriteSetItem, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSpriteSetItem",
      family: "eve/attachment/sprites"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.float32], 16, "blinkRate"], [[io, io.persist, type, type.float32], 16, "blinkPhase"], [[io, io.persist, type, type.float32], 16, "minScale"], [[io, io.persist, type, type.float32], 16, "maxScale"], [[io, io.persist, type, type.float32], 16, "falloff"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "position"], [[io, io.notify, io, io.persist, type, type.color], 16, "color"], [[io, io.notify, io, io.persist, type, type.color], 16, "warpColor"], [[io, io.persist, type, type.int32], 16, "boneIndex"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns Sphere by value; JavaScript follows the runtime sphere out-parameter convention.")], 18, "GetBounds"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoneIndex"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_boneIndex(this);
  }
  name = (_initProto(this), _init_name(this, ""));
  blinkRate = (_init_extra_name(this), _init_blinkRate(this, 0.1));
  blinkPhase = (_init_extra_blinkRate(this), _init_blinkPhase(this, 0));
  minScale = (_init_extra_blinkPhase(this), _init_minScale(this, 1));
  maxScale = (_init_extra_minScale(this), _init_maxScale(this, 10));
  falloff = (_init_extra_maxScale(this), _init_falloff(this, 0));
  position = (_init_extra_falloff(this), _init_position(this, vec3.create()));
  color = (_init_extra_position(this), _init_color(this, vec4.fromValues(1, 1, 1, 1)));
  warpColor = (_init_extra_color(this), _init_warpColor(this, vec4.fromValues(1, 1, 1, 1)));
  boneIndex = (_init_extra_warpColor(this), _init_boneIndex(this, 0));

  /** Carbon EveSpriteSetItem::GetBounds (cpp:35-38): Sphere(position, maxScale)
   * - the sprite at its largest blink scale. `out` is required; the item-set
   * bounds builder supplies its own scratch. */
  GetBounds(out) {
    return box3.fromPositionRadius(out, this.position, this.maxScale);
  }

  /** The parent bone this sprite rides. */
  GetBoneIndex() {
    return this.boneIndex;
  }
  static {
    _initClass();
  }
}

export { _EveSpriteSetItem as EveSpriteSetItem };
//# sourceMappingURL=EveSpriteSetItem.js.map
