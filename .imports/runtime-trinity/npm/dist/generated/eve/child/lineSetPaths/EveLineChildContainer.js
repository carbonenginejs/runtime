import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from '../../../../eve/child/EveChildTransform.js';

let _initClass, _init_isVisible, _init_extra_isVisible, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_lines, _init_extra_lines;

/** EveLineChildContainer (eve/child/lineSetPaths) - generated from schema shapeHash 4739e982.... */
let _EveLineChildContaine;
class EveLineChildContainer extends _EveChildTransform {
  static {
    ({
      e: [_init_isVisible, _init_extra_isVisible, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_lines, _init_extra_lines],
      c: [_EveLineChildContaine, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveLineChildContainer",
      family: "eve/child/lineSetPaths"
    })], [[[io, io.read, type, type.boolean], 16, "isVisible"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, void 0, type.list("IEveLineSetPath")], 16, "lines"]], 0, void 0, _EveChildTransform));
  }
  constructor(...args) {
    super(...args);
    _init_extra_lines(this);
  }
  /** m_isVisible (bool) [READ] */
  isVisible = _init_isVisible(this, true);

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_isVisible(this), _init_name(this, ""));

  /** m_display (bool) [READWRITE, PERSIST] */
  display = (_init_extra_name(this), _init_display(this, true));

  /** m_lines (PIEveLineSetPathVector) [READ, PERSIST] */
  lines = (_init_extra_display(this), _init_lines(this, []));
  static {
    _initClass();
  }
}

export { _EveLineChildContaine as EveLineChildContainer };
//# sourceMappingURL=EveLineChildContainer.js.map
