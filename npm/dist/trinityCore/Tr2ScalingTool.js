import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2ManipulationTool as _Tr2ManipulationTool } from './Tr2ManipulationTool.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_scale, _init_extra_scale;

/** An interactive scaling manipulator that turns pointer drags along a selected axis into a scale. */
let _Tr2ScalingTool;
class Tr2ScalingTool extends _Tr2ManipulationTool {
  static {
    ({
      e: [_init_scale, _init_extra_scale, _initProto],
      c: [_Tr2ScalingTool, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ScalingTool",
      family: "trinityCore"
    })], [[[io, io.read, type, type.vec3], 16, "scale"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Copies the authored transform into portable primitive models; renderer-owned guide-line rebuilding remains optional.")], 18, "ResetPrimitives"]], 0, void 0, _Tr2ManipulationTool));
  }
  constructor(...args) {
    super(...args);
    _init_extra_scale(this);
  }
  /** m_scale (Vector3) [READ] */
  scale = (_initProto(this), _init_scale(this, vec3.fromValues(1, 1, 1)));

  /** Carbon method ResetPrimitives (MAP_METHOD_AND_WRAP). */
  ResetPrimitives() {
    for (const primitive of this.primitives) {
      if (primitive?.localTransform?.length >= 16) {
        mat4.copy(primitive.localTransform, this.localTransform);
      } else if (primitive) {
        primitive.localTransform = mat4.clone(this.localTransform);
      }
      primitive?.UpdateTransform?.();
    }
    for (const line of [this.xLine, this.yLine, this.zLine]) {
      if (line?.localTransform?.length >= 16) {
        mat4.identity(line.localTransform);
      }
    }
    this.UpdateLines?.();
  }
  static {
    _initClass();
  }
}

export { _Tr2ScalingTool as Tr2ScalingTool };
//# sourceMappingURL=Tr2ScalingTool.js.map
