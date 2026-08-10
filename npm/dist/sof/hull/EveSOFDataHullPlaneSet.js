import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';

let _initClass, _init_usage, _init_extra_usage, _init_name, _init_extra_name, _init_layer1MapResPath, _init_extra_layer1MapResPath, _init_layer2MapResPath, _init_extra_layer2MapResPath, _init_maskMapResPath, _init_extra_maskMapResPath, _init_skinned, _init_extra_skinned, _init_atlasAspectRatio, _init_extra_atlasAspectRatio, _init_visibilityGroup, _init_extra_visibilityGroup, _init_atlasSize, _init_extra_atlasSize, _init_items, _init_extra_items;

/** EveSOFDataHullPlaneSet (eve) - generated from schema shapeHash cb49d2d1.... */
let _EveSOFDataHullPlaneS;
new class extends _identity {
  static [class EveSOFDataHullPlaneSet extends CjsModel {
    static {
      ({
        e: [_init_usage, _init_extra_usage, _init_name, _init_extra_name, _init_layer1MapResPath, _init_extra_layer1MapResPath, _init_layer2MapResPath, _init_extra_layer2MapResPath, _init_maskMapResPath, _init_extra_maskMapResPath, _init_skinned, _init_extra_skinned, _init_atlasAspectRatio, _init_extra_atlasAspectRatio, _init_visibilityGroup, _init_extra_visibilityGroup, _init_atlasSize, _init_extra_atlasSize, _init_items, _init_extra_items],
        c: [_EveSOFDataHullPlaneS, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataHullPlaneSet",
        family: "eve"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("Usage")], 16, "usage"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.string], 16, "layer1MapResPath"], [[io, io.persist, type, type.string], 16, "layer2MapResPath"], [[io, io.persist, type, type.string], 16, "maskMapResPath"], [[io, io.persist, type, type.boolean], 16, "skinned"], [[io, io.persist, type, type.vec2], 16, "atlasAspectRatio"], [[io, io.persist, type, type.string], 16, "visibilityGroup"], [[io, io.persist, type, type.uint32], 16, "atlasSize"], [[io, io.persist, void 0, type.list("EveSOFDataHullPlaneSetItem")], 16, "items"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_items(this);
    }
    /** m_usage (Usage - enum Usage) [READWRITE, PERSIST, ENUM] */
    usage = _init_usage(this, 0);

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_usage(this), _init_name(this, ""));

    /** m_layer1MapResPath (std::string) [READWRITE, PERSIST] */
    layer1MapResPath = (_init_extra_name(this), _init_layer1MapResPath(this, ""));

    /** m_layer2MapResPath (std::string) [READWRITE, PERSIST] */
    layer2MapResPath = (_init_extra_layer1MapResPath(this), _init_layer2MapResPath(this, ""));

    /** m_maskMapResPath (std::string) [READWRITE, PERSIST] */
    maskMapResPath = (_init_extra_layer2MapResPath(this), _init_maskMapResPath(this, ""));

    /** m_skinned (bool) [READWRITE, PERSIST] */
    skinned = (_init_extra_maskMapResPath(this), _init_skinned(this, false));

    /** m_atlasAspectRatio (Vector2) [READWRITE, PERSIST] */
    atlasAspectRatio = (_init_extra_skinned(this), _init_atlasAspectRatio(this, vec2.fromValues(1, 1)));

    /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
    visibilityGroup = (_init_extra_atlasAspectRatio(this), _init_visibilityGroup(this, "primary"));

    /** m_atlasSize (uint32_t) [READWRITE, PERSIST] */
    atlasSize = (_init_extra_visibilityGroup(this), _init_atlasSize(this, 1));

    /** m_items (PEveSOFDataHullPlaneSetItemVector) [READ, PERSIST] */
    items = (_init_extra_atlasSize(this), _init_items(this, []));
  }];
  Usage = Object.freeze({
    USAGE_STANDARD: 0,
    USAGE_SPACE_VIDEO: 2,
    USAGE_HANGAR_VIDEO: 3,
    USAGE_HAZE: 5
  });
  constructor() {
    super(_EveSOFDataHullPlaneS), _initClass();
  }
}();

export { _EveSOFDataHullPlaneS as EveSOFDataHullPlaneSet };
//# sourceMappingURL=EveSOFDataHullPlaneSet.js.map
