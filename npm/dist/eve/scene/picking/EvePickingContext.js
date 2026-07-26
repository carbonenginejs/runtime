import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_readbacks, _init_extra_readbacks, _init_lastPickedX, _init_extra_lastPickedX, _init_lastPickedY, _init_extra_lastPickedY, _init_lastPickedObject, _init_extra_lastPickedObject, _init_lastPickedArea, _init_extra_lastPickedArea;

/**
 * Holds the outstanding picking readbacks and the most recent pick result -
 * screen coordinates, hit object and hit area - for a scene.
 */
let _EvePickingContext;
class EvePickingContext extends CjsModel {
  static {
    ({
      e: [_init_readbacks, _init_extra_readbacks, _init_lastPickedX, _init_extra_lastPickedX, _init_lastPickedY, _init_extra_lastPickedY, _init_lastPickedObject, _init_extra_lastPickedObject, _init_lastPickedArea, _init_extra_lastPickedArea, _initProto],
      c: [_EvePickingContext, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EvePickingContext",
      family: "eve/scene"
    })], [[type.list("EvePendingPickingReadback"), 0, "readbacks"], [[type, type.uint32], 16, "lastPickedX"], [[type, type.uint32], 16, "lastPickedY"], [type.objectRef("IRoot"), 0, "lastPickedObject"], [[type, type.uint32], 16, "lastPickedArea"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateResult"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetArea"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_lastPickedArea(this);
  }
  readbacks = (_initProto(this), _init_readbacks(this, []));
  lastPickedX = (_init_extra_readbacks(this), _init_lastPickedX(this, 0));
  lastPickedY = (_init_extra_lastPickedX(this), _init_lastPickedY(this, 0));
  lastPickedObject = (_init_extra_lastPickedY(this), _init_lastPickedObject(this, null));
  lastPickedArea = (_init_extra_lastPickedObject(this), _init_lastPickedArea(this, 0));

  /**
   * Records the outcome of a resolved pick: the sampled screen coordinates, the
   * object hit (null for none) and its area index.
   */
  UpdateResult(x, y, object, area) {
    this.lastPickedX = Number(x) >>> 0;
    this.lastPickedY = Number(y) >>> 0;
    this.lastPickedObject = object ?? null;
    this.lastPickedArea = Number(area) >>> 0;
  }

  /**
   * Returns the object from the last resolved pick, or null if nothing was hit;
   * the reference is borrowed and replaced by the next pick.
   */
  GetObject() {
    return this.lastPickedObject;
  }

  /** Returns the area index from the last resolved pick. */
  GetArea() {
    return this.lastPickedArea;
  }
  static {
    _initClass();
  }
}

export { _EvePickingContext as EvePickingContext };
//# sourceMappingURL=EvePickingContext.js.map
