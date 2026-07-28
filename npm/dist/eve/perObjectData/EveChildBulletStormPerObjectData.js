import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_worldTransform, _init_extra_worldTransform, _init_effectInfo, _init_extra_effectInfo, _init_targetPositionsWS, _init_extra_targetPositionsWS;

/** EveChildBulletStormPerObjectData (eve/perObjectData) - generated from schema shapeHash 49346bb7.... */
let _EveChildBulletStormP;
new class extends _identity {
  static [class EveChildBulletStormPerObjectData extends CjsModel {
    static {
      ({
        e: [_init_worldTransform, _init_extra_worldTransform, _init_effectInfo, _init_extra_effectInfo, _init_targetPositionsWS, _init_extra_targetPositionsWS],
        c: [_EveChildBulletStormP, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildBulletStormPerObjectData",
        family: "eve/perObjectData"
      })], [[[type, type.mat4], 16, "worldTransform"], [[type, type.vec4], 16, "effectInfo"], [type.array("vec4"), 0, "targetPositionsWS"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_targetPositionsWS(this);
    }
    /** m_worldTransform (Matrix) */
    worldTransform = _init_worldTransform(this, mat4.create());

    /** m_effectInfo (Vector4) */
    effectInfo = (_init_extra_worldTransform(this), _init_effectInfo(this, vec4.create()));

    /** m_targetPositionsWS (Vector4[TARGET_POSITION_COUNT]) */
    targetPositionsWS = (_init_extra_effectInfo(this), _init_targetPositionsWS(this, Array.from({
      length: _EveChildBulletStormP.TARGET_POSITION_COUNT
    }, () => vec4.create())));

    /**
     * EveChildBulletStorm.h:29 - `Vector4 m_targetPositionsWS[10]`. The bound is a
     * bare literal in Carbon, not a named constant.
     */
  }];
  TARGET_POSITION_COUNT = 10;
  constructor() {
    super(_EveChildBulletStormP), _initClass();
  }
}();

export { _EveChildBulletStormP as EveChildBulletStormPerObjectData };
//# sourceMappingURL=EveChildBulletStormPerObjectData.js.map
