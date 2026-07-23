import { applyDecs2311 as _applyDecs2311 } from './_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from './CjsCharacterNode.js';

let _initClass, _init_id, _init_extra_id, _init_path, _init_extra_path, _init_kind, _init_extra_kind, _init_required, _init_extra_required, _init_role, _init_extra_role, _init_source, _init_extra_source;
let _CjsCharacterDependen;
class CjsCharacterDependency extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_path, _init_extra_path, _init_kind, _init_extra_kind, _init_required, _init_extra_required, _init_role, _init_extra_role, _init_source, _init_extra_source],
      c: [_CjsCharacterDependen, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterDependency",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.path, io, io.persist], 16, "path"], [[type, type.string, io, io.persist], 16, "kind"], [[type, type.boolean, io, io.persist], 16, "required"], [[type, type.string, io, io.persist], 16, "role"], [[type, type.unknown, io, io.persist], 16, "source"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_source(this);
  }
  id = _init_id(this, "");
  path = (_init_extra_id(this), _init_path(this, ""));
  kind = (_init_extra_path(this), _init_kind(this, "unknown"));
  required = (_init_extra_kind(this), _init_required(this, true));
  role = (_init_extra_required(this), _init_role(this, ""));
  source = (_init_extra_role(this), _init_source(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterDependen as CjsCharacterDependency };
//# sourceMappingURL=CjsCharacterDependency.js.map
