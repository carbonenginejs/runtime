import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { box3 } from '@carbonenginejs/runtime-utils/box3';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_name, _init_extra_name, _init_boneIndex, _init_extra_boneIndex, _init_coneColor, _init_extra_coneColor, _init_flareColor, _init_extra_flareColor, _init_spriteColor, _init_extra_spriteColor, _init_transform, _init_extra_transform, _init_spriteScale, _init_extra_spriteScale, _init_boosterGainInfluence, _init_extra_boosterGainInfluence;

/**
 * One authored spotlight: its bone attachment, placement matrix, the separate
 * cone, flare and sprite colours drawn for it, and whether booster gain
 * modulates it.
 */
let _EveSpotlightSetItem;
new class extends _identity {
  static [class EveSpotlightSetItem extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_boneIndex, _init_extra_boneIndex, _init_coneColor, _init_extra_coneColor, _init_flareColor, _init_extra_flareColor, _init_spriteColor, _init_extra_spriteColor, _init_transform, _init_extra_transform, _init_spriteScale, _init_extra_spriteScale, _init_boosterGainInfluence, _init_extra_boosterGainInfluence, _initProto],
        c: [_EveSpotlightSetItem, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSpotlightSetItem",
        family: "eve/attachment/spotlights"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.int32], 16, "boneIndex"], [[io, io.persist, type, type.color], 16, "coneColor"], [[io, io.persist, type, type.color], 16, "flareColor"], [[io, io.persist, type, type.color], 16, "spriteColor"], [[io, io.persist, type, type.mat4], 16, "transform"], [[io, io.persist, type, type.vec3], 16, "spriteScale"], [[io, io.persist, type, type.boolean], 16, "boosterGainInfluence"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns AxisAlignedBox by value; JavaScript fills a caller-supplied box3.")], 18, "GetBounds"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoneIndex"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_boosterGainInfluence(this);
    }
    name = (_initProto(this), _init_name(this, ""));
    boneIndex = (_init_extra_name(this), _init_boneIndex(this, 0));
    coneColor = (_init_extra_boneIndex(this), _init_coneColor(this, vec4.fromValues(1, 1, 1, 1)));
    flareColor = (_init_extra_coneColor(this), _init_flareColor(this, vec4.fromValues(1, 1, 1, 1)));
    spriteColor = (_init_extra_flareColor(this), _init_spriteColor(this, vec4.fromValues(1, 1, 1, 1)));
    transform = (_init_extra_spriteColor(this), _init_transform(this, mat4.create()));
    spriteScale = (_init_extra_transform(this), _init_spriteScale(this, vec3.fromValues(1, 1, 1)));
    boosterGainInfluence = (_init_extra_spriteScale(this), _init_boosterGainInfluence(this, false));

    /**
     * Fills the caller-owned out box with the spotlight's unit box transformed by
     * its authored placement matrix.
     */
    GetBounds(out) {
      return box3.transformMat4(out, _EveSpotlightSetItem.#bounds, this.transform);
    }

    /** The parent bone this spotlight rides. */
    GetBoneIndex() {
      return this.boneIndex;
    }
  }];
  #bounds = box3.fromValues(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5);
  constructor() {
    super(_EveSpotlightSetItem), _initClass();
  }
}();

export { _EveSpotlightSetItem as EveSpotlightSetItem };
//# sourceMappingURL=EveSpotlightSetItem.js.map
