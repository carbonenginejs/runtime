import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2Sprite2dContainerBase as _Tr2Sprite2dContainer$1 } from '../../sprite2d/Tr2Sprite2dContainerBase.js';

let _initClass, _init_clip, _init_extra_clip, _init_isCachingContents, _init_extra_isCachingContents, _init_depthMax, _init_extra_depthMax, _init_depthMin, _init_extra_depthMin, _init_pickRadius, _init_extra_pickRadius, _init_cacheContents, _init_extra_cacheContents, _init_absoluteCoordinates, _init_extra_absoluteCoordinates;

/** Tr2Sprite2dContainer (sprite2d) - generated from schema shapeHash ec0e9eb1.... */
let _Tr2Sprite2dContainer;
class Tr2Sprite2dContainer extends _Tr2Sprite2dContainer$1 {
  static {
    ({
      e: [_init_clip, _init_extra_clip, _init_isCachingContents, _init_extra_isCachingContents, _init_depthMax, _init_extra_depthMax, _init_depthMin, _init_extra_depthMin, _init_pickRadius, _init_extra_pickRadius, _init_cacheContents, _init_extra_cacheContents, _init_absoluteCoordinates, _init_extra_absoluteCoordinates],
      c: [_Tr2Sprite2dContainer, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dContainer",
      family: "sprite2d"
    })], [[[io, io.notify, io, io.readwrite, type, type.boolean], 16, "clip"], [[io, io.read, type, type.boolean], 16, "isCachingContents"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "depthMax"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "depthMin"], [[io, io.readwrite, type, type.float32], 16, "pickRadius"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "cacheContents"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "absoluteCoordinates"]], 0, void 0, _Tr2Sprite2dContainer$1));
  }
  constructor(...args) {
    super(...args);
    _init_extra_absoluteCoordinates(this);
  }
  /** m_clip (bool) [READWRITE, NOTIFY] */
  clip = _init_clip(this, false);

  /** m_cacheContents (bool) [READ] */
  isCachingContents = (_init_extra_clip(this), _init_isCachingContents(this, true));

  /** m_depthMax (float) [READWRITE, NOTIFY] */
  depthMax = (_init_extra_isCachingContents(this), _init_depthMax(this, 1));

  /** m_depthMin (float) [READWRITE, NOTIFY] */
  depthMin = (_init_extra_depthMax(this), _init_depthMin(this, -1));

  /** m_pickRadius (float) [READWRITE] */
  pickRadius = (_init_extra_depthMin(this), _init_pickRadius(this, 0));

  /** m_cacheContentsHint (bool) [READWRITE, NOTIFY] */
  cacheContents = (_init_extra_pickRadius(this), _init_cacheContents(this, false));

  /** m_absoluteCoordinates (bool) [READWRITE, NOTIFY] */
  absoluteCoordinates = (_init_extra_cacheContents(this), _init_absoluteCoordinates(this, false));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dContainer as Tr2Sprite2dContainer };
//# sourceMappingURL=Tr2Sprite2dContainer.js.map
