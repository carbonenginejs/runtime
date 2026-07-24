import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsResource as _CjsResource } from '../CjsResource.js';
import { AssertResourcePayloadObject, AssertResourcePayloadArray } from './resourceBoundary.js';

let _initProto, _initClass;

/**
 * Tr2EffectRes resource record.
 *
 * This stores effect/shader payload facts. Engine-gpu decides shader module,
 * pipeline, bind group, and sampler realization.
 */
let _Tr2EffectRes;
new class extends _identity {
  static [class Tr2EffectRes extends _CjsResource {
    static {
      ({
        e: [_initProto],
        c: [_Tr2EffectRes, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2EffectRes",
        family: "resources"
      })], [[[carbon, carbon.method, impl, impl.adapted], 18, "GetPermutationDescription"]], 0, void 0, _CjsResource));
    }
    constructor(values = null) {
      _initProto(super());
      this.SetValues(values || {}, {
        markDirty: false,
        skipUpdate: true,
        skipEvents: true
      });
    }

    /**
     * Attach a plain shader/effect payload.
     *
     * @param {object|null} payload
     * @param {object|null} options
     * @returns {Tr2EffectRes}
     */
    SetPayload(payload = null, options = null) {
      if (payload === null) {
        super.SetPayload(null);
        return this;
      }
      AssertResourcePayloadObject("Tr2EffectRes", payload);
      AssertResourcePayloadArray("Tr2EffectRes", payload, "permutations");
      super.SetPayload(payload);
      this.SetValues(options || {});
      return this;
    }

    /**
     * Return a small JSON-friendly permutation description.
     *
     * @returns {Array<*>}
     */
    GetPermutationDescription() {
      const permutations = this.GetPayload()?.permutations;
      return Array.isArray(permutations) ? permutations : [];
    }
  }];
  payload = "shader";
  constructor() {
    super(_Tr2EffectRes), _initClass();
  }
}();

export { _Tr2EffectRes as Tr2EffectRes };
//# sourceMappingURL=Tr2EffectRes.js.map
