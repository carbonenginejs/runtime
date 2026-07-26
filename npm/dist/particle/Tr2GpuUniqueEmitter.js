import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2GpuSharedEmitter as _Tr2GpuSharedEmitter } from './Tr2GpuSharedEmitter.js';

let _initClass, _init_scaledByParent, _init_extra_scaledByParent, _init_attractorPosition, _init_extra_attractorPosition, _init_attractorStrength, _init_extra_attractorStrength;

/**
 * GPU emitter owned by a single instance, adding parent scaling and a
 * per-instance attractor on top of the shared emitter parameters.
 */
let _Tr2GpuUniqueEmitter;
class Tr2GpuUniqueEmitter extends _Tr2GpuSharedEmitter {
  static {
    ({
      e: [_init_scaledByParent, _init_extra_scaledByParent, _init_attractorPosition, _init_extra_attractorPosition, _init_attractorStrength, _init_extra_attractorStrength],
      c: [_Tr2GpuUniqueEmitter, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2GpuUniqueEmitter",
      family: "particle"
    })], [[[io, io.persist, type, type.boolean], 16, "scaledByParent"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "attractorPosition"], [[io, io.notify, io, io.persist, type, type.float32], 16, "attractorStrength"]], 0, void 0, _Tr2GpuSharedEmitter));
  }
  constructor(...args) {
    super(...args);
    _init_extra_attractorStrength(this);
  }
  scaledByParent = _init_scaledByParent(this, false);
  attractorPosition = (_init_extra_scaledByParent(this), _init_attractorPosition(this, vec3.create()));
  attractorStrength = (_init_extra_attractorPosition(this), _init_attractorStrength(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2GpuUniqueEmitter as Tr2GpuUniqueEmitter };
//# sourceMappingURL=Tr2GpuUniqueEmitter.js.map
