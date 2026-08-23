import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_anchorRadius, _init_extra_anchorRadius, _init_anchorRadius2, _init_extra_anchorRadius2, _init_weightCohesion, _init_extra_weightCohesion, _init_wanderFluctuation, _init_extra_wanderFluctuation, _init_separationDistance, _init_extra_separationDistance, _init_formationDistance, _init_extra_formationDistance, _init_wanderDistance, _init_extra_wanderDistance, _init_speed, _init_extra_speed, _init_maxDistance, _init_extra_maxDistance, _init_maxDistance2, _init_extra_maxDistance2, _init_speedMultiplier, _init_extra_speedMultiplier, _init_speedMinimum, _init_extra_speedMinimum, _init_maxDeceleration, _init_extra_maxDeceleration, _init_maxTime, _init_extra_maxTime, _init_wanderRadius, _init_extra_wanderRadius, _init_weightAlign, _init_extra_weightAlign, _init_speed2, _init_extra_speed2, _init_weightDeceleration, _init_extra_weightDeceleration, _init_weightSeparation, _init_extra_weightSeparation, _init_weightAnchor, _init_extra_weightAnchor, _init_weightFormation, _init_extra_weightFormation, _init_weightWander, _init_extra_weightWander;

/** EveSOFDataGenericSwarm (eve) - generated from schema shapeHash 8b492eb6.... */
let _EveSOFDataGenericSwa;
class EveSOFDataGenericSwarm extends CjsModel {
  static {
    ({
      e: [_init_anchorRadius, _init_extra_anchorRadius, _init_anchorRadius2, _init_extra_anchorRadius2, _init_weightCohesion, _init_extra_weightCohesion, _init_wanderFluctuation, _init_extra_wanderFluctuation, _init_separationDistance, _init_extra_separationDistance, _init_formationDistance, _init_extra_formationDistance, _init_wanderDistance, _init_extra_wanderDistance, _init_speed, _init_extra_speed, _init_maxDistance, _init_extra_maxDistance, _init_maxDistance2, _init_extra_maxDistance2, _init_speedMultiplier, _init_extra_speedMultiplier, _init_speedMinimum, _init_extra_speedMinimum, _init_maxDeceleration, _init_extra_maxDeceleration, _init_maxTime, _init_extra_maxTime, _init_wanderRadius, _init_extra_wanderRadius, _init_weightAlign, _init_extra_weightAlign, _init_speed2, _init_extra_speed2, _init_weightDeceleration, _init_extra_weightDeceleration, _init_weightSeparation, _init_extra_weightSeparation, _init_weightAnchor, _init_extra_weightAnchor, _init_weightFormation, _init_extra_weightFormation, _init_weightWander, _init_extra_weightWander],
      c: [_EveSOFDataGenericSwa, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataGenericSwarm",
      family: "eve"
    })], [[[io, io.persist, type, type.float32], 16, "anchorRadius1"], [[io, io.persist, type, type.float32], 16, "anchorRadius0"], [[io, io.persist, type, type.float32], 16, "weightCohesion"], [[io, io.persist, type, type.float32], 16, "wanderFluctuation"], [[io, io.persist, type, type.float32], 16, "separationDistance"], [[io, io.persist, type, type.float32], 16, "formationDistance"], [[io, io.persist, type, type.float32], 16, "wanderDistance"], [[io, io.persist, type, type.float32], 16, "speed0"], [[io, io.persist, type, type.float32], 16, "maxDistance0"], [[io, io.persist, type, type.float32], 16, "maxDistance1"], [[io, io.persist, type, type.float32], 16, "speedMultiplier"], [[io, io.persist, type, type.float32], 16, "speedMinimum"], [[io, io.persist, type, type.float32], 16, "maxDeceleration"], [[io, io.persist, type, type.float32], 16, "maxTime"], [[io, io.persist, type, type.float32], 16, "wanderRadius"], [[io, io.persist, type, type.float32], 16, "weightAlign"], [[io, io.persist, type, type.float32], 16, "speed1"], [[io, io.persist, type, type.float32], 16, "weightDeceleration"], [[io, io.persist, type, type.float32], 16, "weightSeparation"], [[io, io.persist, type, type.float32], 16, "weightAnchor"], [[io, io.persist, type, type.float32], 16, "weightFormation"], [[io, io.persist, type, type.float32], 16, "weightWander"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_weightWander(this);
  }
  /** m_behavior.m_anchorRadius1 (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  anchorRadius1 = _init_anchorRadius(this, 250);

  /** m_behavior.m_anchorRadius0 (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  anchorRadius0 = (_init_extra_anchorRadius(this), _init_anchorRadius2(this, 75));

  /** m_behavior.m_weightCohesion (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  weightCohesion = (_init_extra_anchorRadius2(this), _init_weightCohesion(this, 0.1));

  /** m_behavior.m_wanderFluctuation (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  wanderFluctuation = (_init_extra_weightCohesion(this), _init_wanderFluctuation(this, 0.05));

  /** m_behavior.m_separationDistance (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  separationDistance = (_init_extra_wanderFluctuation(this), _init_separationDistance(this, 250));

  /** m_behavior.m_formationDistance (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  formationDistance = (_init_extra_separationDistance(this), _init_formationDistance(this, 50));

  /** m_behavior.m_wanderDistance (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  wanderDistance = (_init_extra_formationDistance(this), _init_wanderDistance(this, 100));

  /** m_behavior.m_speed0 (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  speed0 = (_init_extra_wanderDistance(this), _init_speed(this, 700));

  /** m_behavior.m_maxDistance0 (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  maxDistance0 = (_init_extra_speed(this), _init_maxDistance(this, 500));

  /** m_behavior.m_maxDistance1 (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  maxDistance1 = (_init_extra_maxDistance(this), _init_maxDistance2(this, 125));

  /** m_behavior.m_speedMultiplier (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  speedMultiplier = (_init_extra_maxDistance2(this), _init_speedMultiplier(this, 1.1));

  /** m_behavior.m_speedMinimum (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  speedMinimum = (_init_extra_speedMultiplier(this), _init_speedMinimum(this, 10));

  /** m_behavior.m_maxDeceleration (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  maxDeceleration = (_init_extra_speedMinimum(this), _init_maxDeceleration(this, 200));

  /** m_behavior.m_maxTime (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  maxTime = (_init_extra_maxDeceleration(this), _init_maxTime(this, 0.2));

  /** m_behavior.m_wanderRadius (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  wanderRadius = (_init_extra_maxTime(this), _init_wanderRadius(this, 80));

  /** m_behavior.m_weightAlign (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  weightAlign = (_init_extra_wanderRadius(this), _init_weightAlign(this, 50));

  /** m_behavior.m_speed1 (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  speed1 = (_init_extra_weightAlign(this), _init_speed2(this, 1000));

  /** m_behavior.m_weightDecelerate (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  weightDeceleration = (_init_extra_speed2(this), _init_weightDeceleration(this, 0.1));

  /** m_behavior.m_weightSeparation (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  weightSeparation = (_init_extra_weightDeceleration(this), _init_weightSeparation(this, 0.1));

  /** m_behavior.m_weightAnchor (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  weightAnchor = (_init_extra_weightSeparation(this), _init_weightAnchor(this, 0.5));

  /** m_behavior.m_weightFormation (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  weightFormation = (_init_extra_weightAnchor(this), _init_weightFormation(this, 1));

  /** m_behavior.m_weightWander (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  weightWander = (_init_extra_weightFormation(this), _init_weightWander(this, 0.33));
  static {
    _initClass();
  }
}

export { _EveSOFDataGenericSwa as EveSOFDataGenericSwarm };
//# sourceMappingURL=EveSOFDataGenericSwarm.js.map
