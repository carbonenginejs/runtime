import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_killEvent, _init_extra_killEvent, _init_lifetimeDuration, _init_extra_lifetimeDuration;

/** EveDistributionModifierProcessLifetime (eve/distribution/attributeModifiers) - generated from schema shapeHash d0a7425c.... */
let _EveDistributionModif;
new class extends _identity {
  static [class EveDistributionModifierProcessLifetime extends CjsModel {
    static {
      ({
        e: [_init_killEvent, _init_extra_killEvent, _init_lifetimeDuration, _init_extra_lifetimeDuration, _initProto],
        c: [_EveDistributionModif, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveDistributionModifierProcessLifetime",
        family: "eve/distribution/attributeModifiers"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("DistributionEntityLifeTimeEvent")], 16, "killEvent"], [[io, io.persist, type, type.float32], 16, "lifetimeDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "AffectsTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "ProcessDistributionModifier"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_lifetimeDuration(this);
    }
    /** m_killEvent (DistributionEntityLifeTimeEvent - enum DistributionEntityLifeTimeEvent) [READWRITE, PERSIST, ENUM] */
    killEvent = (_initProto(this), _init_killEvent(this, 1));

    /** m_lifetimeDuration (float) [READWRITE, PERSIST] */
    lifetimeDuration = (_init_extra_killEvent(this), _init_lifetimeDuration(this, -1));

    /**
     * Reports no transform effect, so this modifier alone never forces the
     * distribution into its per-frame transform reset.
     */
    AffectsTransform() {
      return false;
    }

    /**
     * Returns the authored kill event once a placement's accumulated lifetime
     * passes lifetimeDuration, and DO_NOTHING otherwise or when no positive
     * duration is authored.
     */
    ProcessDistributionModifier(placement, _deltaTime, _params) {
      return placement.lifeTime > this.lifetimeDuration && this.lifetimeDuration > 0 ? this.killEvent : _EveDistributionModif.DistributionEntityLifeTimeEvent.DO_NOTHING;
    }
  }];
  DistributionEntityLifeTimeEvent = Object.freeze({
    DO_NOTHING: 0,
    KILL_ENTITY: 1,
    KILL_AND_SPAWN_NEW_FROM_DISTRIBUTION: 2,
    KILL_AND_SPAWN_NEW_FROM_INITIAL_POSITION: 3,
    KILL_AND_SPAWN_NEW_FROM_CURRENT_POSITION: 4
  });
  constructor() {
    super(_EveDistributionModif), _initClass();
  }
}();

export { _EveDistributionModif as EveDistributionModifierProcessLifetime };
//# sourceMappingURL=EveDistributionModifierProcessLifetime.js.map
