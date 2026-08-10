import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_shadowSplitMode, _init_extra_shadowSplitMode, _init_denoiser, _init_extra_denoiser, _init_cascadeEffect, _init_extra_cascadeEffect, _init_splitCount, _init_extra_splitCount, _init_debugColorSplit, _init_extra_debugColorSplit, _init_SplitNr, _init_extra_SplitNr, _init_SplitNr2, _init_extra_SplitNr2, _init_SplitNr3, _init_extra_SplitNr3, _init_SplitNr4, _init_extra_SplitNr4, _init_SplitNr5, _init_extra_SplitNr5, _init_SplitNr6, _init_extra_SplitNr6, _init_SplitNr7, _init_extra_SplitNr7, _init_SplitNr8, _init_extra_SplitNr8, _init_SplitNr9, _init_extra_SplitNr9, _init_SplitNr0, _init_extra_SplitNr0, _init_SplitNr1, _init_extra_SplitNr1, _init_SplitNr10, _init_extra_SplitNr10, _init_SplitNr11, _init_extra_SplitNr11, _init_SplitNr12, _init_extra_SplitNr12, _init_SplitNr13, _init_extra_SplitNr13, _init_SplitNr14, _init_extra_SplitNr14, _init_disableShimmer, _init_extra_disableShimmer, _init_size, _init_extra_size;

/** Tr2ShadowMap (trinityCore) - generated from schema shapeHash 72829cbc.... */
let _Tr2ShadowMap;
new class extends _identity {
  static [class Tr2ShadowMap extends CjsModel {
    static {
      ({
        e: [_init_shadowSplitMode, _init_extra_shadowSplitMode, _init_denoiser, _init_extra_denoiser, _init_cascadeEffect, _init_extra_cascadeEffect, _init_splitCount, _init_extra_splitCount, _init_debugColorSplit, _init_extra_debugColorSplit, _init_SplitNr, _init_extra_SplitNr, _init_SplitNr2, _init_extra_SplitNr2, _init_SplitNr3, _init_extra_SplitNr3, _init_SplitNr4, _init_extra_SplitNr4, _init_SplitNr5, _init_extra_SplitNr5, _init_SplitNr6, _init_extra_SplitNr6, _init_SplitNr7, _init_extra_SplitNr7, _init_SplitNr8, _init_extra_SplitNr8, _init_SplitNr9, _init_extra_SplitNr9, _init_SplitNr0, _init_extra_SplitNr0, _init_SplitNr1, _init_extra_SplitNr1, _init_SplitNr10, _init_extra_SplitNr10, _init_SplitNr11, _init_extra_SplitNr11, _init_SplitNr12, _init_extra_SplitNr12, _init_SplitNr13, _init_extra_SplitNr13, _init_SplitNr14, _init_extra_SplitNr14, _init_disableShimmer, _init_extra_disableShimmer, _init_size, _init_extra_size],
        c: [_Tr2ShadowMap, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ShadowMap",
        family: "trinityCore"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, type.enum("ShadowSplitMode")], 16, "shadowSplitMode"], [[io, io.readwrite, void 0, type.objectRef("Tr2Denoiser")], 16, "denoiser"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "cascadeEffect"], [[io, io.notify, io, io.read, type, type.uint32], 16, "splitCount"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "debugColorSplit"], [[io, io.readwrite, type, type.float32], 16, "SplitNr15"], [[io, io.readwrite, type, type.float32], 16, "SplitNr8"], [[io, io.readwrite, type, type.float32], 16, "SplitNr6"], [[io, io.readwrite, type, type.float32], 16, "SplitNr5"], [[io, io.readwrite, type, type.float32], 16, "SplitNr14"], [[io, io.readwrite, type, type.float32], 16, "SplitNr10"], [[io, io.readwrite, type, type.float32], 16, "SplitNr13"], [[io, io.readwrite, type, type.float32], 16, "SplitNr4"], [[io, io.readwrite, type, type.float32], 16, "SplitNr3"], [[io, io.readwrite, type, type.float32], 16, "SplitNr7"], [[io, io.readwrite, type, type.float32], 16, "SplitNr1"], [[io, io.readwrite, type, type.float32], 16, "SplitNr9"], [[io, io.readwrite, type, type.float32], 16, "SplitNr0"], [[io, io.readwrite, type, type.float32], 16, "SplitNr11"], [[io, io.readwrite, type, type.float32], 16, "SplitNr12"], [[io, io.readwrite, type, type.float32], 16, "SplitNr2"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "disableShimmer"], [[io, io.readwrite, type, type.uint32], 16, "size"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_size(this);
    }
    /** m_shadowSplitMode (ShadowSplitMode - enum ShadowSplitMode) [READWRITE, PERSIST, ENUM, NOTIFY] */
    shadowSplitMode = _init_shadowSplitMode(this, 0);

    /** m_denoiser (Tr2DenoiserPtr) [READWRITE] */
    denoiser = (_init_extra_shadowSplitMode(this), _init_denoiser(this, null));

    /** m_shadowEffect (Tr2EffectPtr) [READWRITE] */
    cascadeEffect = (_init_extra_denoiser(this), _init_cascadeEffect(this, null));

    /** m_splitCount (unsigned int) [READ, NOTIFY] */
    splitCount = (_init_extra_cascadeEffect(this), _init_splitCount(this, 0));

    /** m_debugColorSplit (bool) [READWRITE, NOTIFY] */
    debugColorSplit = (_init_extra_splitCount(this), _init_debugColorSplit(this, false));

    /** m_splitValues[15] (float) [READWRITE] */
    SplitNr15 = (_init_extra_debugColorSplit(this), _init_SplitNr(this, 0));

    /** m_splitValues[8] (float) [READWRITE] */
    SplitNr8 = (_init_extra_SplitNr(this), _init_SplitNr2(this, 0));

    /** m_splitValues[6] (float) [READWRITE] */
    SplitNr6 = (_init_extra_SplitNr2(this), _init_SplitNr3(this, 0));

    /** m_splitValues[5] (float) [READWRITE] */
    SplitNr5 = (_init_extra_SplitNr3(this), _init_SplitNr4(this, 0));

    /** m_splitValues[14] (float) [READWRITE] */
    SplitNr14 = (_init_extra_SplitNr4(this), _init_SplitNr5(this, 0));

    /** m_splitValues[10] (float) [READWRITE] */
    SplitNr10 = (_init_extra_SplitNr5(this), _init_SplitNr6(this, 0));

    /** m_splitValues[13] (float) [READWRITE] */
    SplitNr13 = (_init_extra_SplitNr6(this), _init_SplitNr7(this, 0));

    /** m_splitValues[4] (float) [READWRITE] */
    SplitNr4 = (_init_extra_SplitNr7(this), _init_SplitNr8(this, 0));

    /** m_splitValues[3] (float) [READWRITE] */
    SplitNr3 = (_init_extra_SplitNr8(this), _init_SplitNr9(this, 0));

    /** m_splitValues[7] (float) [READWRITE] */
    SplitNr7 = (_init_extra_SplitNr9(this), _init_SplitNr0(this, 0));

    /** m_splitValues[1] (float) [READWRITE] */
    SplitNr1 = (_init_extra_SplitNr0(this), _init_SplitNr1(this, 0));

    /** m_splitValues[9] (float) [READWRITE] */
    SplitNr9 = (_init_extra_SplitNr1(this), _init_SplitNr10(this, 0));

    /** m_splitValues[0] (float) [READWRITE] */
    SplitNr0 = (_init_extra_SplitNr10(this), _init_SplitNr11(this, 0));

    /** m_splitValues[11] (float) [READWRITE] */
    SplitNr11 = (_init_extra_SplitNr11(this), _init_SplitNr12(this, 0));

    /** m_splitValues[12] (float) [READWRITE] */
    SplitNr12 = (_init_extra_SplitNr12(this), _init_SplitNr13(this, 0));

    /** m_splitValues[2] (float) [READWRITE] */
    SplitNr2 = (_init_extra_SplitNr13(this), _init_SplitNr14(this, 0));

    /** m_disableShimmer (bool) [READWRITE, NOTIFY] */
    disableShimmer = (_init_extra_SplitNr14(this), _init_disableShimmer(this, true));

    /** m_size (unsigned int) [READWRITE] */
    size = (_init_extra_disableShimmer(this), _init_size(this, 0));
  }];
  ShadowSplitMode = Object.freeze({
    STATIC: 0,
    DYNAMIC: 1,
    MANUAL: 2
  });
  constructor() {
    super(_Tr2ShadowMap), _initClass();
  }
}();

export { _Tr2ShadowMap as Tr2ShadowMap };
//# sourceMappingURL=Tr2ShadowMap.js.map
