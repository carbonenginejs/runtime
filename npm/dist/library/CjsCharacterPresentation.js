import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_backgrounds, _init_extra_backgrounds, _init_cameras, _init_extra_cameras, _init_characters, _init_extra_characters, _init_lights, _init_extra_lights, _init_positions, _init_extra_positions, _init_posts, _init_extra_posts;
let _CjsCharacterPresenta;
class CjsCharacterPresentation extends _CjsCharacterNode {
  static {
    ({
      e: [_init_backgrounds, _init_extra_backgrounds, _init_cameras, _init_extra_cameras, _init_characters, _init_extra_characters, _init_lights, _init_extra_lights, _init_positions, _init_extra_positions, _init_posts, _init_extra_posts],
      c: [_CjsCharacterPresenta, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterPresentation",
      family: "character"
    })], [[[void 0, type.map("unknown"), io, io.persist], 16, "backgrounds"], [[void 0, type.map("unknown"), io, io.persist], 16, "cameras"], [[void 0, type.map("unknown"), io, io.persist], 16, "characters"], [[void 0, type.map("unknown"), io, io.persist], 16, "lights"], [[void 0, type.map("unknown"), io, io.persist], 16, "positions"], [[void 0, type.map("unknown"), io, io.persist], 16, "posts"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_posts(this);
  }
  backgrounds = _init_backgrounds(this, new Map());
  cameras = (_init_extra_backgrounds(this), _init_cameras(this, new Map()));
  characters = (_init_extra_cameras(this), _init_characters(this, new Map()));
  lights = (_init_extra_characters(this), _init_lights(this, new Map()));
  positions = (_init_extra_lights(this), _init_positions(this, new Map()));
  posts = (_init_extra_positions(this), _init_posts(this, new Map()));
  static {
    _initClass();
  }
}

export { _CjsCharacterPresenta as CjsCharacterPresentation };
//# sourceMappingURL=CjsCharacterPresentation.js.map
