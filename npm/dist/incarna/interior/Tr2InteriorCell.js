import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_isUnbounded, _init_extra_isUnbounded, _init_shProbeResPath, _init_extra_shProbeResPath;

/**
 * Minimal persisted cell record used by historical Incarna interior scenes.
 *
 * This is an evidence-backed hydration shell, not a current Carbon class or a
 * claim of historical runtime behavior.
 */
let _Tr2InteriorCell;
class Tr2InteriorCell extends CjsModel {
  static {
    ({
      e: [_init_isUnbounded, _init_extra_isUnbounded, _init_shProbeResPath, _init_extra_shProbeResPath],
      c: [_Tr2InteriorCell, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2InteriorCell",
      family: "incarna"
    })], [[[io, io.persist, type, type.boolean], 16, "isUnbounded"], [[io, io.persist, type, type.string], 16, "shProbeResPath"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_shProbeResPath(this);
  }
  /** Observed in all four decoded character-creation scene graphs. */
  isUnbounded = _init_isUnbounded(this, false);

  /** Optional spherical-harmonic probe resource path. */
  shProbeResPath = (_init_extra_isUnbounded(this), _init_shProbeResPath(this, ""));
  static {
    _initClass();
  }
}

export { _Tr2InteriorCell as Tr2InteriorCell };
//# sourceMappingURL=Tr2InteriorCell.js.map
