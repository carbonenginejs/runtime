import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_seed, _init_extra_seed, _init_minFlashIntensity, _init_extra_minFlashIntensity, _init_maxDist, _init_extra_maxDist, _init_minDist, _init_extra_minDist, _init_minFlashRate, _init_extra_minFlashRate, _init_maxFlashRate, _init_extra_maxFlashRate, _init_display, _init_extra_display, _init_effect, _init_extra_effect, _init_numStars, _init_extra_numStars;

/** EveStarfield (eve/effect) - generated from schema shapeHash f4ffb492.... */
let _EveStarfield;
class EveStarfield extends CjsModel {
  static {
    ({
      e: [_init_seed, _init_extra_seed, _init_minFlashIntensity, _init_extra_minFlashIntensity, _init_maxDist, _init_extra_maxDist, _init_minDist, _init_extra_minDist, _init_minFlashRate, _init_extra_minFlashRate, _init_maxFlashRate, _init_extra_maxFlashRate, _init_display, _init_extra_display, _init_effect, _init_extra_effect, _init_numStars, _init_extra_numStars],
      c: [_EveStarfield, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveStarfield",
      family: "eve/effect"
    })], [[[io, io.notify, io, io.persist, type, type.int32], 16, "seed"], [[io, io.notify, io, io.persist, type, type.float32], 16, "minFlashIntensity"], [[io, io.notify, io, io.persist, type, type.float32], 16, "maxDist"], [[io, io.notify, io, io.persist, type, type.float32], 16, "minDist"], [[io, io.notify, io, io.persist, type, type.float32], 16, "minFlashRate"], [[io, io.notify, io, io.persist, type, type.float32], 16, "maxFlashRate"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, void 0, type.model("Tr2Effect")], 16, "effect"], [[io, io.notify, io, io.persist, type, type.int32], 16, "numStars"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_numStars(this);
  }
  /** m_seed (int32_t) [READWRITE, NOTIFY, PERSIST] */
  seed = _init_seed(this, 0);

  /** m_minFlashIntensity (float) [READWRITE, NOTIFY, PERSIST] */
  minFlashIntensity = (_init_extra_seed(this), _init_minFlashIntensity(this, 0));

  /** m_maxDistance (float) [READWRITE, NOTIFY, PERSIST] */
  maxDist = (_init_extra_minFlashIntensity(this), _init_maxDist(this, 300));

  /** m_minDistance (float) [READWRITE, NOTIFY, PERSIST] */
  minDist = (_init_extra_maxDist(this), _init_minDist(this, 100));

  /** m_minFlashRate (float) [READWRITE, NOTIFY, PERSIST] */
  minFlashRate = (_init_extra_minDist(this), _init_minFlashRate(this, 0.5));

  /** m_maxFlashRate (float) [READWRITE, NOTIFY, PERSIST] */
  maxFlashRate = (_init_extra_minFlashRate(this), _init_maxFlashRate(this, 1));

  /** m_display (bool) [READWRITE, PERSIST] */
  display = (_init_extra_maxFlashRate(this), _init_display(this, true));

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  effect = (_init_extra_display(this), _init_effect(this, null));

  /** m_starCount (int32_t) [READWRITE, NOTIFY, PERSIST] */
  numStars = (_init_extra_effect(this), _init_numStars(this, 500));
  static {
    _initClass();
  }
}

export { _EveStarfield as EveStarfield };
//# sourceMappingURL=EveStarfield.js.map
