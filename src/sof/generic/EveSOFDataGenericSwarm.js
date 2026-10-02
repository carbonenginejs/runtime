// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Defaults: trinity/trinity/Eve/SpaceObject/EveSwarm.h:137-164
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:485-514
import { meta, types } from "#schema";

/** Stores swarm anchor, speed, cohesion, alignment, separation, formation, wander, and deceleration settings.
 * Native IRoot-only data with a self-only Blue table. Field initializers
 * preserve native defaults; no initialization, update or resource lifecycle
 * is required, and the native destructor is empty.
 * Native behavior members retain the existing flat authored-field representation.
 */
@meta.define({ className: "EveSOFDataGenericSwarm", family: "eve" })
export class EveSOFDataGenericSwarm
{

  /** m_behavior.m_speedMultiplier (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  speedMultiplier = 1.1;

  /** m_behavior.m_speedMinimum (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  speedMinimum = 10;

  /** m_behavior.m_maxDistance0 (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  maxDistance0 = 500;

  /** m_behavior.m_maxDistance1 (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  maxDistance1 = 125;

  /** m_behavior.m_maxTime (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  maxTime = 0.2;

  /** m_behavior.m_speed0 (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  speed0 = 700;

  /** m_behavior.m_speed1 (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  speed1 = 1000;

  /** m_behavior.m_weightFormation (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  weightFormation = 1;

  /** m_behavior.m_weightCohesion (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  weightCohesion = 0.1;

  /** m_behavior.m_weightSeparation (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  weightSeparation = 0.1;

  /** m_behavior.m_weightAlign (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  weightAlign = 50;

  /** m_behavior.m_weightWander (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  weightWander = 0.33;

  /** m_behavior.m_weightAnchor (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  weightAnchor = 0.5;

  /** m_behavior.m_anchorRadius0 (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  anchorRadius0 = 75;

  /** m_behavior.m_anchorRadius1 (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  anchorRadius1 = 250;

  /** m_behavior.m_weightDecelerate (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  weightDeceleration = 0.1;

  /** m_behavior.m_maxDeceleration (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  maxDeceleration = 200;

  /** m_behavior.m_separationDistance (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  separationDistance = 250;

  /** m_behavior.m_formationDistance (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  formationDistance = 50;

  /** m_behavior.m_wanderFluctuation (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  wanderFluctuation = 0.05;

  /** m_behavior.m_wanderDistance (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  wanderDistance = 100;

  /** m_behavior.m_wanderRadius (EveSwarm::BehaviorProperties) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  wanderRadius = 80;

}

meta.carbon.interfaceTable({
  interfaces: [ EveSOFDataGenericSwarm ],
  chainTo: null
})(EveSOFDataGenericSwarm);
