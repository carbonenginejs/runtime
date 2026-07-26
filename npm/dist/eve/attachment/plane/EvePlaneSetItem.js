import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { box3 } from '@carbonenginejs/runtime-utils/box3';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_color, _init_extra_color, _init_layer1Transform, _init_extra_layer1Transform, _init_layer2Transform, _init_extra_layer2Transform, _init_layer1Scroll, _init_extra_layer1Scroll, _init_layer2Scroll, _init_extra_layer2Scroll, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_name, _init_extra_name, _init_maskAtlasID, _init_extra_maskAtlasID, _init_boneIndex, _init_extra_boneIndex, _init_position, _init_extra_position, _init_blinkData, _init_extra_blinkData;
let _EvePlaneSetItem;
new class extends _identity {
  static [class EvePlaneSetItem extends CjsModel {
    static {
      ({
        e: [_init_color, _init_extra_color, _init_layer1Transform, _init_extra_layer1Transform, _init_layer2Transform, _init_extra_layer2Transform, _init_layer1Scroll, _init_extra_layer1Scroll, _init_layer2Scroll, _init_extra_layer2Scroll, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_name, _init_extra_name, _init_maskAtlasID, _init_extra_maskAtlasID, _init_boneIndex, _init_extra_boneIndex, _init_position, _init_extra_position, _init_blinkData, _init_extra_blinkData, _initProto],
        c: [_EvePlaneSetItem, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EvePlaneSetItem",
        family: "eve/attachment/planes"
      })], [[[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.color], 16, "color"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.vec4], 16, "layer1Transform"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.vec4], 16, "layer2Transform"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.vec4], 16, "layer1Scroll"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.vec4], 16, "layer2Scroll"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.quat], 16, "rotation"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.string], 16, "name"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.uint32], 16, "maskAtlasID"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.int32], 16, "boneIndex"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.vec3], 16, "position"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.vec4], 16, "blinkData"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns AxisAlignedBox by value; JavaScript fills a caller-supplied box3.")], 18, "GetBounds"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoneIndex"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_blinkData(this);
    }
    color = (_initProto(this), _init_color(this, vec4.fromValues(1, 1, 1, 1)));
    layer1Transform = (_init_extra_color(this), _init_layer1Transform(this, vec4.fromValues(1, 1, 0, 0)));
    layer2Transform = (_init_extra_layer1Transform(this), _init_layer2Transform(this, vec4.fromValues(1, 1, 0, 0)));
    layer1Scroll = (_init_extra_layer2Transform(this), _init_layer1Scroll(this, vec4.create()));
    layer2Scroll = (_init_extra_layer1Scroll(this), _init_layer2Scroll(this, vec4.create()));
    rotation = (_init_extra_layer2Scroll(this), _init_rotation(this, quat.create()));
    scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));
    name = (_init_extra_scaling(this), _init_name(this, ""));
    maskAtlasID = (_init_extra_name(this), _init_maskAtlasID(this, 0));
    boneIndex = (_init_extra_maskAtlasID(this), _init_boneIndex(this, 0));
    position = (_init_extra_boneIndex(this), _init_position(this, vec3.create()));

    // Carbon omits this SOF-authored value from Blue serialization, but it is
    // part of the editable plane description and must survive values exchange.
    blinkData = (_init_extra_position(this), _init_blinkData(this, vec4.fromValues(1, 0, 1, 0)));
    GetBounds(out) {
      // Carbon TransformationMatrix(scaling, rotation, position).
      const transform = mat4.fromRotationTranslationScale(_EvePlaneSetItem.#transform, this.rotation, this.position, this.scaling);
      return box3.transformMat4(out, _EvePlaneSetItem.#bounds, transform);
    }
    GetBoneIndex() {
      return this.boneIndex;
    }
  }];
  #bounds = box3.fromValues(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5);
  #transform = mat4.create();
  #transformedBounds = box3.create();
  constructor() {
    super(_EvePlaneSetItem), _initClass();
  }
}();

export { _EvePlaneSetItem as EvePlaneSetItem };
//# sourceMappingURL=EvePlaneSetItem.js.map
