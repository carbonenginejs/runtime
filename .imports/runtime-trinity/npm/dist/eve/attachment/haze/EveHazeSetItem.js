import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { box3 } from '@carbonenginejs/runtime-utils/box3';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_color, _init_extra_color, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_name, _init_extra_name, _init_boneIndex, _init_extra_boneIndex, _init_position, _init_extra_position, _init_hazeData, _init_extra_hazeData;

/**
 * One authored haze volume: its bone attachment, placement, colour and the
 * four-component haze shaping data.
 */
let _EveHazeSetItem;
new class extends _identity {
  static [class EveHazeSetItem extends CjsModel {
    static {
      ({
        e: [_init_color, _init_extra_color, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_name, _init_extra_name, _init_boneIndex, _init_extra_boneIndex, _init_position, _init_extra_position, _init_hazeData, _init_extra_hazeData, _initProto],
        c: [_EveHazeSetItem, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveHazeSetItem",
        family: "eve/attachment/haze"
      })], [[[io, io.persist, type, type.color], 16, "color"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.int32], 16, "boneIndex"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.vec4], 16, "hazeData"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns AxisAlignedBox by value; JavaScript fills a caller-supplied box3.")], 18, "GetBounds"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoneIndex"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_hazeData(this);
    }
    color = (_initProto(this), _init_color(this, vec4.fromValues(1, 1, 1, 1)));
    rotation = (_init_extra_color(this), _init_rotation(this, quat.create()));
    scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));
    name = (_init_extra_scaling(this), _init_name(this, ""));
    boneIndex = (_init_extra_name(this), _init_boneIndex(this, 0));
    position = (_init_extra_boneIndex(this), _init_position(this, vec3.create()));
    hazeData = (_init_extra_position(this), _init_hazeData(this, vec4.fromValues(4, 0.2, 2, 0)));

    /**
     * Fills the caller-owned out box with the haze's authored source box - which
     * reaches to z 5 rather than 0.5, because a haze extends well beyond its
     * placement - transformed by its rotation, position and scaling.
     */
    GetBounds(out) {
      // Carbon (row-vector): TransformationMatrix(scaling, rotation, position).
      const transform = mat4.fromRotationTranslationScale(_EveHazeSetItem.#transform, this.rotation, this.position, this.scaling);
      return box3.transformMat4(out, _EveHazeSetItem.#bounds, transform);
    }

    /** The parent bone this haze volume rides. */
    GetBoneIndex() {
      return this.boneIndex;
    }
  }];
  #bounds = box3.fromValues(-0.5, -0.5, -0.5, 0.5, 0.5, 5);
  #transform = mat4.create();
  constructor() {
    super(_EveHazeSetItem), _initClass();
  }
}();

export { _EveHazeSetItem as EveHazeSetItem };
//# sourceMappingURL=EveHazeSetItem.js.map
