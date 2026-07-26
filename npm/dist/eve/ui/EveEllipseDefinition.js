import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_center, _init_extra_center, _init_planeNormal, _init_extra_planeNormal, _init_rotationDegrees, _init_extra_rotationDegrees, _init_semiMajor, _init_extra_semiMajor, _init_semiMinor, _init_extra_semiMinor;

/**
 * One authored ellipse of an ellipse set - centre, plane normal, in-plane
 * rotation in degrees and the two semi-axis lengths.
 */
let _EveEllipseDefinition;
class EveEllipseDefinition extends CjsModel {
  static {
    ({
      e: [_init_center, _init_extra_center, _init_planeNormal, _init_extra_planeNormal, _init_rotationDegrees, _init_extra_rotationDegrees, _init_semiMajor, _init_extra_semiMajor, _init_semiMinor, _init_extra_semiMinor],
      c: [_EveEllipseDefinition, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveEllipseDefinition",
      family: "eve/ui"
    })], [[[io, io.notify, io, io.persist, type, type.vec3], 16, "center"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "planeNormal"], [[io, io.notify, io, io.persist, type, type.float32], 16, "rotationDegrees"], [[io, io.notify, io, io.persist, type, type.float32], 16, "semiMajor"], [[io, io.notify, io, io.persist, type, type.float32], 16, "semiMinor"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_semiMinor(this);
  }
  #dirtyFlag = null;
  center = _init_center(this, vec3.create());
  planeNormal = (_init_extra_center(this), _init_planeNormal(this, vec3.fromValues(0, 1, 0)));
  rotationDegrees = (_init_extra_planeNormal(this), _init_rotationDegrees(this, 0));
  semiMajor = (_init_extra_rotationDegrees(this), _init_semiMajor(this, 1));
  semiMinor = (_init_extra_semiMajor(this), _init_semiMinor(this, 1));

  /**
   * Invokes the bound dirty callback so the owning set regenerates its geometry
   * after any authored field changes.
   */
  OnModified(_value = null) {
    this.#dirtyFlag?.();
    return true;
  }

  /**
   * Installs the callback invoked whenever this definition is modified; pass
   * null to unbind, and anything that is neither a function nor null throws.
   */
  SetDirtyFlag(dirtyFlag) {
    if (dirtyFlag !== null && typeof dirtyFlag !== "function") {
      throw new TypeError("EveEllipseDefinition dirty flag must be a function or null");
    }
    this.#dirtyFlag = dirtyFlag;
  }
  static {
    _initClass();
  }
}

export { _EveEllipseDefinition as EveEllipseDefinition };
//# sourceMappingURL=EveEllipseDefinition.js.map
