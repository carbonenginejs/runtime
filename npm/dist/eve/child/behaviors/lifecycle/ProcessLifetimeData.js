import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_hasUsedEntryTunnel, _init_extra_hasUsedEntryTunnel, _init_hasUsedExitTunnel, _init_extra_hasUsedExitTunnel, _init_assignedLifeTimeTunnel, _init_extra_assignedLifeTimeTunnel, _init_tunnelPoint, _init_extra_tunnelPoint, _init_hasSpawned, _init_extra_hasSpawned;
let _ProcessLifetimeData;
class ProcessLifetimeData extends CjsModel {
  static {
    ({
      e: [_init_hasUsedEntryTunnel, _init_extra_hasUsedEntryTunnel, _init_hasUsedExitTunnel, _init_extra_hasUsedExitTunnel, _init_assignedLifeTimeTunnel, _init_extra_assignedLifeTimeTunnel, _init_tunnelPoint, _init_extra_tunnelPoint, _init_hasSpawned, _init_extra_hasSpawned],
      c: [_ProcessLifetimeData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "ProcessLifetimeData",
      family: "eve"
    })], [[[type, type.boolean], 16, "hasUsedEntryTunnel"], [[type, type.boolean], 16, "hasUsedExitTunnel"], [[type, type.int32], 16, "assignedLifeTimeTunnel"], [[type, type.int32], 16, "tunnelPoint"], [[type, type.boolean], 16, "hasSpawned"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_hasSpawned(this);
  }
  hasUsedEntryTunnel = _init_hasUsedEntryTunnel(this, false);
  hasUsedExitTunnel = (_init_extra_hasUsedEntryTunnel(this), _init_hasUsedExitTunnel(this, false));
  assignedLifeTimeTunnel = (_init_extra_hasUsedExitTunnel(this), _init_assignedLifeTimeTunnel(this, 0));
  tunnelPoint = (_init_extra_assignedLifeTimeTunnel(this), _init_tunnelPoint(this, 0));
  hasSpawned = (_init_extra_tunnelPoint(this), _init_hasSpawned(this, false));
  static {
    _initClass();
  }
}

export { _ProcessLifetimeData as ProcessLifetimeData };
//# sourceMappingURL=ProcessLifetimeData.js.map
