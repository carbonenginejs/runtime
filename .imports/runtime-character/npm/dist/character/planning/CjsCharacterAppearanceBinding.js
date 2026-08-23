import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_consumerID, _init_extra_consumerID, _init_sampler, _init_extra_sampler, _init_source, _init_extra_source, _init_sampleBounds, _init_extra_sampleBounds, _init_alpha, _init_extra_alpha, _init_origin, _init_extra_origin;

/** Final consumer/sampler binding to a resolved texture or composition target. */
let _CjsCharacterAppearan;
class CjsCharacterAppearanceBinding extends CjsModel {
  static {
    ({
      e: [_init_consumerID, _init_extra_consumerID, _init_sampler, _init_extra_sampler, _init_source, _init_extra_source, _init_sampleBounds, _init_extra_sampleBounds, _init_alpha, _init_extra_alpha, _init_origin, _init_extra_origin],
      c: [_CjsCharacterAppearan, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterAppearanceBinding",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "consumerID"], [[io, io.readwrite, type, type.string], 16, "sampler"], [[io, io.readwrite, type, type.unknown], 16, "source"], [[io, io.readwrite, type, type.vec4], 16, "sampleBounds"], [[io, io.readwrite, void 0, type.model("CjsCharacterBindingAlpha")], 16, "alpha"], [[io, io.readwrite, void 0, type.model("CjsCharacterOrigin")], 16, "origin"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_origin(this);
  }
  consumerID = _init_consumerID(this, "");
  sampler = (_init_extra_consumerID(this), _init_sampler(this, ""));
  source = (_init_extra_sampler(this), _init_source(this, null));
  sampleBounds = (_init_extra_source(this), _init_sampleBounds(this, null));
  alpha = (_init_extra_sampleBounds(this), _init_alpha(this, null));
  origin = (_init_extra_alpha(this), _init_origin(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterAppearan as CjsCharacterAppearanceBinding };
//# sourceMappingURL=CjsCharacterAppearanceBinding.js.map
