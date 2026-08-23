import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_sprites, _init_extra_sprites, _init_name, _init_extra_name, _init_display, _init_extra_display;

/** EveOccluder (eve/effect) - generated from schema shapeHash fe89b1c5.... */
let _EveOccluder;
class EveOccluder extends CjsModel {
  static {
    ({
      e: [_init_sprites, _init_extra_sprites, _init_name, _init_extra_name, _init_display, _init_extra_display],
      c: [_EveOccluder, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveOccluder",
      family: "eve/effect"
    })], [[[io, io.persist, void 0, type.list("EveTransform")], 16, "sprites"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "display"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_display(this);
  }
  /** m_sprites (PEveTransformVector) [READ, PERSIST] */
  sprites = _init_sprites(this, []);

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_sprites(this), _init_name(this, ""));

  /** m_display (bool) [READWRITE, PERSIST] */
  display = (_init_extra_name(this), _init_display(this, true));
  static {
    _initClass();
  }
}

export { _EveOccluder as EveOccluder };
//# sourceMappingURL=EveOccluder.js.map
