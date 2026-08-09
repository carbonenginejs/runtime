import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, schema } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';
import { Quality } from '../../generated/postProcess/enums.js';

let _initClass, _init_quality, _init_extra_quality, _init_effect, _init_extra_effect;

/**
 * Post-process slot wrapping an arbitrary authored Tr2Effect together with the
 * quality level it needs before a frame will run it.
 */
let _Tr2PPGenericEffect;
new class extends _identity {
  static [class Tr2PPGenericEffect extends _Tr2PPEffect {
    static {
      ({
        e: [_init_quality, _init_extra_quality, _init_effect, _init_extra_effect],
        c: [_Tr2PPGenericEffect, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2PPGenericEffect",
        family: "postProcess"
      })], [[[io, io.persist, type, type.int32, void 0, schema.enum("Quality")], 16, "quality"], [[io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "effect"]], 0, void 0, _Tr2PPEffect));
    }
    constructor(...args) {
      super(...args);
      _init_extra_effect(this);
    }
    quality = _init_quality(this, 1);
    effect = (_init_extra_quality(this), _init_effect(this, null));

    /** Returns the wrapped effect, which may be null when none was authored. */
    GetEffect() {
      return this.effect;
    }
  }];
  Quality = Quality;
  constructor() {
    super(_Tr2PPGenericEffect), _initClass();
  }
}();

export { _Tr2PPGenericEffect as Tr2PPGenericEffect };
//# sourceMappingURL=Tr2PPGenericEffect.js.map
