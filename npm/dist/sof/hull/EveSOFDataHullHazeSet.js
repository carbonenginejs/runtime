import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_hazeType, _init_extra_hazeType, _init_name, _init_extra_name, _init_skinned, _init_extra_skinned, _init_visibilityGroup, _init_extra_visibilityGroup, _init_items, _init_extra_items;

/** EveSOFDataHullHazeSet (eve) - generated from schema shapeHash 3da83fe6.... */
let _EveSOFDataHullHazeSe;
new class extends _identity {
  static [class EveSOFDataHullHazeSet extends CjsModel {
    static {
      ({
        e: [_init_hazeType, _init_extra_hazeType, _init_name, _init_extra_name, _init_skinned, _init_extra_skinned, _init_visibilityGroup, _init_extra_visibilityGroup, _init_items, _init_extra_items],
        c: [_EveSOFDataHullHazeSe, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataHullHazeSet",
        family: "eve"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("HazeType")], 16, "hazeType"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "skinned"], [[io, io.persist, type, type.string], 16, "visibilityGroup"], [[io, io.persist, void 0, type.list("EveSOFDataHullHazeSetItem")], 16, "items"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_items(this);
    }
    /** m_hazeType (HazeType - enum HazeType) [READWRITE, PERSIST, ENUM] */
    hazeType = _init_hazeType(this, 0);

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_hazeType(this), _init_name(this, ""));

    /** m_skinned (bool) [READWRITE, PERSIST] */
    skinned = (_init_extra_name(this), _init_skinned(this, false));

    /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
    visibilityGroup = (_init_extra_skinned(this), _init_visibilityGroup(this, "primary"));

    /** m_items (PEveSOFDataHullHazeSetItemVector) [READ, PERSIST] */
    items = (_init_extra_visibilityGroup(this), _init_items(this, []));
  }];
  HazeType = Object.freeze({
    TYPE_SPHERICAL: 0,
    TYPE_HALFSPHERICAL: 1
  });
  constructor() {
    super(_EveSOFDataHullHazeSe), _initClass();
  }
}();

export { _EveSOFDataHullHazeSe as EveSOFDataHullHazeSet };
//# sourceMappingURL=EveSOFDataHullHazeSet.js.map
