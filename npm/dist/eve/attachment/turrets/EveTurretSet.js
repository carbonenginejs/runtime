import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { EveComponentType } from '../../EveComponentTypes.js';
import { EveTurretTarget as _EveTurretTarget } from './EveTurretTarget.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { Tr2RenderReason } from '../../../generated/trinityCore/enums.js';
import { Tr2PerObjectData } from '../../../trinityCore/Tr2PerObjectData.js';
import { Tr2RenderBatch } from '../../../trinityCore/Tr2RenderBatch.js';

let _initProto, _initClass, _init_impactBehaviour, _init_extra_impactBehaviour, _init_firingEffect, _init_extra_firingEffect, _init_ambientEffect, _init_extra_ambientEffect, _init_name, _init_extra_name, _init_firingEffectResPath, _init_extra_firingEffectResPath, _init_chooseRandomLocator, _init_extra_chooseRandomLocator, _init_boundingSphere, _init_extra_boundingSphere, _init_randomizeExplosionRotation, _init_extra_randomizeExplosionRotation, _init_lodLevel, _init_extra_lodLevel, _init_currentCyclingFiresPos, _init_extra_currentCyclingFiresPos, _init_useRandomFiringDelay, _init_extra_useRandomFiringDelay, _init_bottomClipHeight, _init_extra_bottomClipHeight, _init_geometryResource, _init_extra_geometryResource, _init_maxTrackingTime, _init_extra_maxTrackingTime, _init_visibleCount, _init_extra_visibleCount, _init_trackingInfluence, _init_extra_trackingInfluence, _init_swarmID, _init_extra_swarmID, _init_maxCyclingFirePos, _init_extra_maxCyclingFirePos, _init_playMovementSound, _init_extra_playMovementSound, _init_isOnline, _init_extra_isOnline, _init_target, _init_extra_target, _init_locatorName, _init_extra_locatorName, _init_sysBonePitchFactor, _init_extra_sysBonePitchFactor, _init_sysBonePitchMax, _init_extra_sysBonePitchMax, _init_sysBonePitchMin, _init_extra_sysBonePitchMin, _init_sysBonePitchOffset, _init_extra_sysBonePitchOffset, _init_sysBonePitch01Factor, _init_extra_sysBonePitch01Factor, _init_sysBonePitch01Offset, _init_extra_sysBonePitch01Offset, _init_sysBonePitch02Factor, _init_extra_sysBonePitch02Factor, _init_sysBonePitch02Offset, _init_extra_sysBonePitch02Offset, _init_sysBonePitch03Factor, _init_extra_sysBonePitch03Factor, _init_sysBonePitch03Offset, _init_extra_sysBonePitch03Offset, _init_updatePitchPose, _init_extra_updatePitchPose, _init_geometryResPath, _init_extra_geometryResPath, _init_impactSize, _init_extra_impactSize, _init_state, _init_extra_state, _init_sysBoneHeight, _init_extra_sysBoneHeight, _init_randomFiringDelay, _init_extra_randomFiringDelay, _init_turretEffect, _init_extra_turretEffect, _init_idleToTargetingMovementAudioEvent, _init_extra_idleToTargetingMovementAudioEvent, _init_targetingToIdleMovementAudioEvent, _init_extra_targetingToIdleMovementAudioEvent, _init_generatedDistributedAmbientEffect, _init_extra_generatedDistributedAmbientEffect, _init_cyclingFireGroupCount, _init_extra_cyclingFireGroupCount, _init_turretMovementObserver, _init_extra_turretMovementObserver, _init_slotNumber, _init_extra_slotNumber, _init_ambientEffectEditingMode, _init_extra_ambientEffectEditingMode, _init_displayEffects, _init_extra_displayEffects, _init_display, _init_extra_display, _init_useDynamicBounds, _init_extra_useDynamicBounds, _init_estimatedPixelDiameter, _init_extra_estimatedPixelDiameter, _init_lowLodFiringEffectScale, _init_extra_lowLodFiringEffectScale, _init_lowLodFiringEffectTranslation, _init_extra_lowLodFiringEffectTranslation, _init_lowLodFiringEffectRotation, _init_extra_lowLodFiringEffectRotation, _init_useLowLodFiringTransform, _init_extra_useLowLodFiringTransform, _init_laserMissBehaviour, _init_extra_laserMissBehaviour, _init_projectileMissBehaviour, _init_extra_projectileMissBehaviour;

/** Carbon BoundingSphereTransform (Utilities/BoundingSphere.cpp:70-81):
 * center = TransformCoord(center, tf); radius *= max of the basis row lengths
 * (|GetX/Y/Z| = gl flat [0..2]/[4..6]/[8..10]). Single-matrix application -
 * NO composition, NO operand swap. Mutates the packed (x, y, z, radius)
 * sphere in place. */
function BoundingSphereTransform(transform, sphere) {
  vec3.transformMat4(sphere, sphere, transform);
  sphere[3] *= Math.max(Math.hypot(transform[0], transform[1], transform[2]), Math.hypot(transform[4], transform[5], transform[6]), Math.hypot(transform[8], transform[9], transform[10]));
  return sphere;
}

/** EveTurretSet (eve/attachment/turrets) - generated from schema shapeHash 51c12edb.... */
let _EveTurretSet;
new class extends _identity {
  static [class EveTurretSet extends _EveEntity {
    static {
      ({
        e: [_init_impactBehaviour, _init_extra_impactBehaviour, _init_firingEffect, _init_extra_firingEffect, _init_ambientEffect, _init_extra_ambientEffect, _init_name, _init_extra_name, _init_firingEffectResPath, _init_extra_firingEffectResPath, _init_chooseRandomLocator, _init_extra_chooseRandomLocator, _init_boundingSphere, _init_extra_boundingSphere, _init_randomizeExplosionRotation, _init_extra_randomizeExplosionRotation, _init_lodLevel, _init_extra_lodLevel, _init_currentCyclingFiresPos, _init_extra_currentCyclingFiresPos, _init_useRandomFiringDelay, _init_extra_useRandomFiringDelay, _init_bottomClipHeight, _init_extra_bottomClipHeight, _init_geometryResource, _init_extra_geometryResource, _init_maxTrackingTime, _init_extra_maxTrackingTime, _init_visibleCount, _init_extra_visibleCount, _init_trackingInfluence, _init_extra_trackingInfluence, _init_swarmID, _init_extra_swarmID, _init_maxCyclingFirePos, _init_extra_maxCyclingFirePos, _init_playMovementSound, _init_extra_playMovementSound, _init_isOnline, _init_extra_isOnline, _init_target, _init_extra_target, _init_locatorName, _init_extra_locatorName, _init_sysBonePitchFactor, _init_extra_sysBonePitchFactor, _init_sysBonePitchMax, _init_extra_sysBonePitchMax, _init_sysBonePitchMin, _init_extra_sysBonePitchMin, _init_sysBonePitchOffset, _init_extra_sysBonePitchOffset, _init_sysBonePitch01Factor, _init_extra_sysBonePitch01Factor, _init_sysBonePitch01Offset, _init_extra_sysBonePitch01Offset, _init_sysBonePitch02Factor, _init_extra_sysBonePitch02Factor, _init_sysBonePitch02Offset, _init_extra_sysBonePitch02Offset, _init_sysBonePitch03Factor, _init_extra_sysBonePitch03Factor, _init_sysBonePitch03Offset, _init_extra_sysBonePitch03Offset, _init_updatePitchPose, _init_extra_updatePitchPose, _init_geometryResPath, _init_extra_geometryResPath, _init_impactSize, _init_extra_impactSize, _init_state, _init_extra_state, _init_sysBoneHeight, _init_extra_sysBoneHeight, _init_randomFiringDelay, _init_extra_randomFiringDelay, _init_turretEffect, _init_extra_turretEffect, _init_idleToTargetingMovementAudioEvent, _init_extra_idleToTargetingMovementAudioEvent, _init_targetingToIdleMovementAudioEvent, _init_extra_targetingToIdleMovementAudioEvent, _init_generatedDistributedAmbientEffect, _init_extra_generatedDistributedAmbientEffect, _init_cyclingFireGroupCount, _init_extra_cyclingFireGroupCount, _init_turretMovementObserver, _init_extra_turretMovementObserver, _init_slotNumber, _init_extra_slotNumber, _init_ambientEffectEditingMode, _init_extra_ambientEffectEditingMode, _init_displayEffects, _init_extra_displayEffects, _init_display, _init_extra_display, _init_useDynamicBounds, _init_extra_useDynamicBounds, _init_estimatedPixelDiameter, _init_extra_estimatedPixelDiameter, _init_lowLodFiringEffectScale, _init_extra_lowLodFiringEffectScale, _init_lowLodFiringEffectTranslation, _init_extra_lowLodFiringEffectTranslation, _init_lowLodFiringEffectRotation, _init_extra_lowLodFiringEffectRotation, _init_useLowLodFiringTransform, _init_extra_useLowLodFiringTransform, _init_laserMissBehaviour, _init_extra_laserMissBehaviour, _init_projectileMissBehaviour, _init_extra_projectileMissBehaviour, _initProto],
        c: [_EveTurretSet, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveTurretSet",
        family: "eve/attachment/turrets"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, schema.enum("ImpactBehaviour")], 16, "impactBehaviour"], [type.objectRef("EveTurretFiringFX"), 0, "firingEffect"], [[io, io.persistOnly, void 0, type.model("IEveSpaceObjectChild")], 16, "ambientEffect"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.string], 16, "firingEffectResPath"], [[io, io.persist, type, type.boolean], 16, "chooseRandomLocator"], [[io, io.persist, type, type.vec4], 16, "boundingSphere"], [[io, io.persist, type, type.boolean], 16, "randomizeExplosionRotation"], [[io, io.read, type, type.int32, void 0, schema.enum("LOD")], 16, "lodLevel"], [[io, io.read, type, type.uint32], 16, "currentCyclingFiresPos"], [[io, io.persist, type, type.boolean], 16, "useRandomFiringDelay"], [[io, io.persist, type, type.float32], 16, "bottomClipHeight"], [[io, io.read, void 0, type.objectRef("TriGeometryRes")], 16, "geometryResource"], [[io, io.persist, type, type.float32], 16, "maxTrackingTime"], [[io, io.read, type, type.uint32], 16, "visibleCount"], [[io, io.read, type, type.float32], 16, "trackingInfluence"], [[io, io.readwrite, type, type.uint32], 16, "swarmID"], [[io, io.persist, type, type.uint32], 16, "maxCyclingFirePos"], [[io, io.persist, type, type.boolean], 16, "playMovementSound"], [[io, io.readwrite, type, type.boolean], 16, "isOnline"], [[io, io.read, void 0, type.objectRef("EveTurretTarget")], 16, "target"], [[io, io.persist, type, type.string], 16, "locatorName"], [[io, io.persist, type, type.float32], 16, "sysBonePitchFactor"], [[io, io.persist, type, type.float32], 16, "sysBonePitchMax"], [[io, io.persist, type, type.float32], 16, "sysBonePitchMin"], [[io, io.persist, type, type.float32], 16, "sysBonePitchOffset"], [[io, io.persist, type, type.float32], 16, "sysBonePitch01Factor"], [[io, io.persist, type, type.float32], 16, "sysBonePitch01Offset"], [[io, io.persist, type, type.float32], 16, "sysBonePitch02Factor"], [[io, io.persist, type, type.float32], 16, "sysBonePitch02Offset"], [[io, io.persist, type, type.float32], 16, "sysBonePitch03Factor"], [[io, io.persist, type, type.float32], 16, "sysBonePitch03Offset"], [[io, io.persist, type, type.boolean], 16, "updatePitchPose"], [[io, io.notify, io, io.persist, type, type.string], 16, "geometryResPath"], [[io, io.persist, type, type.float32], 16, "impactSize"], [[io, io.persist, type, type.int32, void 0, schema.enum("State")], 16, "state"], [[io, io.persist, type, type.float32], 16, "sysBoneHeight"], [[io, io.read, type, type.float32], 16, "randomFiringDelay"], [[io, io.persist, void 0, type.model("Tr2Effect")], 16, "turretEffect"], [[io, io.persist, type, type.string], 16, "idleToTargetingMovementAudioEvent"], [[io, io.persist, type, type.string], 16, "targetingToIdleMovementAudioEvent"], [[io, io.read, void 0, type.objectRef("EveChildInstanceContainer")], 16, "generatedDistributedAmbientEffect"], [[io, io.persist, type, type.uint32], 16, "cyclingFireGroupCount"], [[io, io.persist, void 0, type.model("TriObserverLocal")], 16, "turretMovementObserver"], [[io, io.readwrite, type, type.int32], 16, "slotNumber"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "ambientEffectEditingMode"], [[io, io.readwrite, type, type.boolean], 16, "displayEffects"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "useDynamicBounds"], [[io, io.read, type, type.float32], 16, "estimatedPixelDiameter"], [[io, io.persist, type, type.vec3], 16, "lowLodFiringEffectScale"], [[io, io.persist, type, type.vec3], 16, "lowLodFiringEffectTranslation"], [[io, io.persist, type, type.quat], 16, "lowLodFiringEffectRotation"], [[io, io.persist, type, type.boolean], 16, "useLowLodFiringTransform"], [[io, io.persist, type, type.boolean], 16, "laserMissBehaviour"], [[io, io.persist, type, type.boolean], 16, "projectileMissBehaviour"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Geometry resources are duck-typed; runtime-trinity stores their computed sphere without realizing render buffers.")], 18, "RebuildBoundingSphere"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Animation calls are forwarded to hydrated turret/controller objects without Carbon's Granny controller.")], 18, "ForceStateDeactive"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Animation calls are forwarded to hydrated turret/controller objects without Carbon's Granny controller.")], 18, "ForceStateTargeting"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The graph freezes its LOD state; geometry realization remains a runtime-engine responsibility.")], 18, "FreezeHighDetailLOD"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetShotTimeVariance"], [[carbon, carbon.method, impl, impl.implemented], 18, "MissQueueSize"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLastShotTime"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Animation calls are forwarded to hydrated turret/controller objects without Carbon's Granny controller.")], 18, "EnterStateDeactive"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's geometry/animation selection is represented by portable turret records and controller forwarding.")], 18, "EnterStateFiring"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Animation calls are forwarded to hydrated turret/controller objects without Carbon's Granny controller.")], 18, "EnterStateIdle"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Animation calls are forwarded to hydrated turret/controller objects without Carbon's Granny controller.")], 18, "EnterStateReloading"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Animation calls are forwarded to hydrated turret/controller objects without Carbon's Granny controller.")], 18, "EnterStateTargeting"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Controller ownership is represented by direct firing/ambient child forwarding.")], 18, "HandleControllerEvent"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Portable turret records and duck-typed geometry bone transforms replace Carbon's CMF/Granny split.")], 18, "GetFiringBoneWorldTransform"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Controller ownership is represented by direct firing/ambient child forwarding.")], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetShotMissed"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Controller ownership is represented by direct firing/ambient child forwarding.")], 18, "StartControllers"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Resource loading and GPU preparation are engine responsibilities; Trinity initializes the target and owned behavior graph.")], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetFiringEffect"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon QueryInterface target attachment is delegated to EveTurretTarget's browser-compatible target validation.")], 18, "SetTargetObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTargetObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetTargetScale"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon builds hidden SingleTurret records from geometry locators; browser hosts may provide equivalent portable records directly.")], 18, "SetTurrets"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon builds hidden SingleTurret records from geometry locators; browser hosts may provide equivalent portable records directly.")], 18, "AddTurret"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTurrets"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Portable records replace Carbon's CMF/Granny SingleTurretData allocation while retaining its fixed 24-turret limit and scale removal.")], 18, "SetLocalTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetParentTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateTurretTransforms"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The closest portable turret is selected from its world up-axis and the target tracking position.")], 18, "GetClosestTurret"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("This combined browser convenience update runs Carbon's explicit synchronous and asynchronous phases in order.")], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Animation cleanup and task dispatch are forwarded through portable records; target and firing timing remain source-faithful.")], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Skeleton realization is engine-owned; portable turret records may consume the same local-target tracking hook.")], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Renderable collection is backend-neutral; geometry and batch realization remain runtime-engine work.")], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Visibility is forwarded through backend-neutral firing and ambient graph contracts.")], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The length-1 out array replaces the float& out-param; the shadow math is ported, including exactly which paths write the out value.")], 18, "IsCastingShadow"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Instance stream, vertex declaration and realized LOD allocations (cpp:2227-2250) are engine-owned; the batch records the geometry source, turret effect, per-object data and the CPU-known instance count for the engine to realize.")], 18, "GetShadowBatches"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The EveTurretSetPerObjectData constant-block fill and bone-palette ring upload are engine-owned; the record carries the object reference the engine serializer consumes. IsGood/GetMeshCount realization gates are engine-side - the CPU gate is geometry presence.")], 18, "GetPerObjectData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetShadowPerObjectData"]], 0, void 0, _EveEntity));
    }
    /** m_impactBehaviour (ImpactBehaviour::Type - enum ImpactBehaviour) [READWRITE, NOTIFY, PERSIST, ENUM] */
    impactBehaviour = (_initProto(this), _init_impactBehaviour(this, 0));

    /** m_firingEffect (EveTurretFiringFXPtr) [HIDDEN] */
    firingEffect = (_init_extra_impactBehaviour(this), _init_firingEffect(this, null));

    /** m_ambientEffect (IEveSpaceObjectChildPtr) [PERSISTONLY] */
    ambientEffect = (_init_extra_firingEffect(this), _init_ambientEffect(this, null));

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_ambientEffect(this), _init_name(this, ""));

    /** m_firingEffectResPath (std::string) [READWRITE, PERSIST] */
    firingEffectResPath = (_init_extra_name(this), _init_firingEffectResPath(this, ""));

    /** m_chooseRandomLocator (bool) [READWRITE, PERSIST] */
    chooseRandomLocator = (_init_extra_firingEffectResPath(this), _init_chooseRandomLocator(this, true));

    /** m_boundingSphere (Vector4) [READWRITE, PERSIST] */
    boundingSphere = (_init_extra_chooseRandomLocator(this), _init_boundingSphere(this, vec4.create()));

    /** m_randomizeExplosionRotation (bool) [READWRITE, PERSIST] */
    randomizeExplosionRotation = (_init_extra_boundingSphere(this), _init_randomizeExplosionRotation(this, true));

    /** m_lodLevel (LOD - enum LOD) [READ] */
    lodLevel = (_init_extra_randomizeExplosionRotation(this), _init_lodLevel(this, 0));

    /** m_currentCyclingFiresPos (uint32_t) [READ] */
    currentCyclingFiresPos = (_init_extra_lodLevel(this), _init_currentCyclingFiresPos(this, 0));

    /** m_useRandomFiringDelay (bool) [READWRITE, PERSIST] */
    useRandomFiringDelay = (_init_extra_currentCyclingFiresPos(this), _init_useRandomFiringDelay(this, true));

    /** m_bottomClipHeight (float) [READWRITE, PERSIST] */
    bottomClipHeight = (_init_extra_useRandomFiringDelay(this), _init_bottomClipHeight(this, 0));

    /** m_geometryResource (TriGeometryResPtr) [READ] */
    geometryResource = (_init_extra_bottomClipHeight(this), _init_geometryResource(this, null));

    /** m_maxTrackingTime (float) [READWRITE, PERSIST] */
    maxTrackingTime = (_init_extra_geometryResource(this), _init_maxTrackingTime(this, 1));

    /** m_visibleCount (unsigned int) [READ] */
    visibleCount = (_init_extra_maxTrackingTime(this), _init_visibleCount(this, 0));

    /** m_trackingInfluence (float) [READ] */
    trackingInfluence = (_init_extra_visibleCount(this), _init_trackingInfluence(this, 0));

    /** m_swarmID (unsigned int) [READWRITE] */
    swarmID = (_init_extra_trackingInfluence(this), _init_swarmID(this, 0));

    /** m_maxCyclingFirePos (uint32_t) [READWRITE, PERSIST] */
    maxCyclingFirePos = (_init_extra_swarmID(this), _init_maxCyclingFirePos(this, 1));

    /** m_playMovementSound (bool) [READWRITE, PERSIST] */
    playMovementSound = (_init_extra_maxCyclingFirePos(this), _init_playMovementSound(this, true));

    /** m_isOnline (bool) [READWRITE] */
    isOnline = (_init_extra_playMovementSound(this), _init_isOnline(this, true));

    /** m_target (EveTurretTargetPtr) [READ] */
    target = (_init_extra_isOnline(this), _init_target(this, new _EveTurretTarget()));

    /** m_locatorName (std::string) [READWRITE, PERSIST] */
    locatorName = (_init_extra_target(this), _init_locatorName(this, ""));

    /** m_sysBonePitchFactor (float) [READWRITE, PERSIST] */
    sysBonePitchFactor = (_init_extra_locatorName(this), _init_sysBonePitchFactor(this, 1));

    /** m_sysBonePitchMax (float) [READWRITE, PERSIST] */
    sysBonePitchMax = (_init_extra_sysBonePitchFactor(this), _init_sysBonePitchMax(this, 90));

    /** m_sysBonePitchMin (float) [READWRITE, PERSIST] */
    sysBonePitchMin = (_init_extra_sysBonePitchMax(this), _init_sysBonePitchMin(this, 0));

    /** m_sysBonePitchOffset (float) [READWRITE, PERSIST] */
    sysBonePitchOffset = (_init_extra_sysBonePitchMin(this), _init_sysBonePitchOffset(this, 0));

    /** m_sysBonePitch01Factor (float) [READWRITE, PERSIST] */
    sysBonePitch01Factor = (_init_extra_sysBonePitchOffset(this), _init_sysBonePitch01Factor(this, 1));

    /** m_sysBonePitch01Offset (float) [READWRITE, PERSIST] */
    sysBonePitch01Offset = (_init_extra_sysBonePitch01Factor(this), _init_sysBonePitch01Offset(this, 0));

    /** m_sysBonePitch02Factor (float) [READWRITE, PERSIST] */
    sysBonePitch02Factor = (_init_extra_sysBonePitch01Offset(this), _init_sysBonePitch02Factor(this, 1));

    /** m_sysBonePitch02Offset (float) [READWRITE, PERSIST] */
    sysBonePitch02Offset = (_init_extra_sysBonePitch02Factor(this), _init_sysBonePitch02Offset(this, 0));

    /** m_sysBonePitch03Factor (float) [READWRITE, PERSIST] */
    sysBonePitch03Factor = (_init_extra_sysBonePitch02Offset(this), _init_sysBonePitch03Factor(this, 1));

    /** m_sysBonePitch03Offset (float) [READWRITE, PERSIST] */
    sysBonePitch03Offset = (_init_extra_sysBonePitch03Factor(this), _init_sysBonePitch03Offset(this, 0));

    /** m_updatePitchPose (bool) [READWRITE, PERSIST] */
    updatePitchPose = (_init_extra_sysBonePitch03Offset(this), _init_updatePitchPose(this, false));

    /** m_geomResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
    geometryResPath = (_init_extra_updatePitchPose(this), _init_geometryResPath(this, ""));

    /** m_impactSize (float) [READWRITE, PERSIST] */
    impactSize = (_init_extra_geometryResPath(this), _init_impactSize(this, 0));

    /** m_state (State - enum State) [READ, PERSIST] */
    state = (_init_extra_impactSize(this), _init_state(this, 2));

    /** m_sysBoneHeight (float) [READWRITE, PERSIST] */
    sysBoneHeight = (_init_extra_state(this), _init_sysBoneHeight(this, 1));

    /** m_randomFiringDelay (float) [READ] */
    randomFiringDelay = (_init_extra_sysBoneHeight(this), _init_randomFiringDelay(this, 0));

    /** m_turretEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
    turretEffect = (_init_extra_randomFiringDelay(this), _init_turretEffect(this, null));

    /** m_idleToTargetingMovementAudioEvent (std::wstring) [READWRITE, PERSIST] */
    idleToTargetingMovementAudioEvent = (_init_extra_turretEffect(this), _init_idleToTargetingMovementAudioEvent(this, ""));

    /** m_targetingToIdleMovementAudioEvent (std::wstring) [READWRITE, PERSIST] */
    targetingToIdleMovementAudioEvent = (_init_extra_idleToTargetingMovementAudioEvent(this), _init_targetingToIdleMovementAudioEvent(this, ""));

    /** m_generatedDistributedAmbientEffect (EveChildInstanceContainerPtr) [READ] */
    generatedDistributedAmbientEffect = (_init_extra_targetingToIdleMovementAudioEvent(this), _init_generatedDistributedAmbientEffect(this, null));

    /** m_cyclingFireGroupCount (uint32_t) [READWRITE, PERSIST] */
    cyclingFireGroupCount = (_init_extra_generatedDistributedAmbientEffect(this), _init_cyclingFireGroupCount(this, 1));

    /** m_turretMovementObserver (TriObserverLocalPtr) [READWRITE, PERSIST] */
    turretMovementObserver = (_init_extra_cyclingFireGroupCount(this), _init_turretMovementObserver(this, null));

    /** m_slotNumber (int) [READWRITE] */
    slotNumber = (_init_extra_turretMovementObserver(this), _init_slotNumber(this, -1));

    /** m_ambientEffectEditingMode (bool) [READWRITE, NOTIFY] */
    ambientEffectEditingMode = (_init_extra_slotNumber(this), _init_ambientEffectEditingMode(this, false));

    /** m_displayEffects (bool) [READWRITE] */
    displayEffects = (_init_extra_ambientEffectEditingMode(this), _init_displayEffects(this, true));

    /** m_display (bool) [READWRITE] */
    display = (_init_extra_displayEffects(this), _init_display(this, true));

    /** m_useDynamicBounds (bool) [READWRITE, PERSIST, NOTIFY] */
    useDynamicBounds = (_init_extra_display(this), _init_useDynamicBounds(this, false));

    /** m_estimatedPixelDiameter (float) [READ] */
    estimatedPixelDiameter = (_init_extra_useDynamicBounds(this), _init_estimatedPixelDiameter(this, -1));

    /** m_lowLodFiringEffectScale (Vector3) [READWRITE, PERSIST] */
    lowLodFiringEffectScale = (_init_extra_estimatedPixelDiameter(this), _init_lowLodFiringEffectScale(this, vec3.fromValues(1, 1, 1)));

    /** m_lowLodFiringEffectTranslation (Vector3) [READWRITE, PERSIST] */
    lowLodFiringEffectTranslation = (_init_extra_lowLodFiringEffectScale(this), _init_lowLodFiringEffectTranslation(this, vec3.create()));

    /** m_lowLodFiringEffectRotation (Quaternion) [READWRITE, PERSIST] */
    lowLodFiringEffectRotation = (_init_extra_lowLodFiringEffectTranslation(this), _init_lowLodFiringEffectRotation(this, quat.create()));

    /** m_useLowLodFiringTransform (bool) [READWRITE, PERSIST] */
    useLowLodFiringTransform = (_init_extra_lowLodFiringEffectRotation(this), _init_useLowLodFiringTransform(this, false));

    /** m_laserMissBehaviour (bool) [READWRITE, PERSIST] */
    laserMissBehaviour = (_init_extra_useLowLodFiringTransform(this), _init_laserMissBehaviour(this, false));

    /** m_projectileMissBehaviour (bool) [READWRITE, PERSIST] */
    projectileMissBehaviour = (_init_extra_laserMissBehaviour(this), _init_projectileMissBehaviour(this, false));
    #turrets = (_init_extra_projectileMissBehaviour(this), []);
    #parentTransform = mat4.create();
    #activeTurret = _EveTurretSet.INVALID_INDEX;
    #highDetailFrozen = false;
    #trackingInfluenceDelta = 0;
    #delayToFadeOutTracking = 0;
    #delayToFadeInTracking = 0;
    #recheckTimeLeft = 2;

    /** Carbon method RebuildBoundingSphere (MAP_METHOD_AND_WRAP). */
    RebuildBoundingSphere() {
      const resource = this.geometryResource;
      if (!resource) return false;
      resource.RecalculateBoundingSphere?.();
      const value = resource.GetBoundingSphere?.(0, this.boundingSphere);
      if (value?.length >= 4 && value !== this.boundingSphere) vec4.copy(this.boundingSphere, value);
      return value !== false;
    }

    /** Carbon method ForceStateDeactive (MAP_METHOD_AND_WRAP). */
    ForceStateDeactive() {
      this.trackingInfluence = 0;
      this.#delayToFadeOutTracking = 0;
      this.#activeTurret = _EveTurretSet.INVALID_INDEX;
      this.target?.StopFireAtLocator?.();
      this.firingEffect?.StopFiring?.();
      this.state = _EveTurretSet.State.STATE_DEACTIVE;
      this.#playAll("", "Inactive", 0);
      this.#setAmbientState();
    }

    /** Carbon method ForceStateTargeting (MAP_METHOD_AND_WRAP). */
    ForceStateTargeting() {
      this.trackingInfluence = this.maxTrackingTime;
      this.#trackingInfluenceDelta = 0;
      this.#activeTurret = this.GetClosestTurret();
      this.state = _EveTurretSet.State.STATE_TARGETING;
      this.#playTurret(this.#activeTurret, "", "Active", 0);
      this.#setAmbientState();
    }

    /** Carbon method FreezeHighDetailLOD (MAP_METHOD_AND_WRAP). */
    FreezeHighDetailLOD() {
      this.lodLevel = _EveTurretSet.LOD.LOD_DISABLED;
      this.#highDetailFrozen = true;
      this.geometryResource?.Prepare?.();
    }

    /** Carbon method GetShotTimeVariance (MAP_METHOD_AND_WRAP). */
    GetShotTimeVariance() {
      return 0.6;
    }

    /** Carbon method MissQueueSize (MAP_METHOD_AND_WRAP). */
    MissQueueSize() {
      return this.target?.MissQueueSize?.() ?? 0;
    }

    /** Carbon method GetLastShotTime (MAP_METHOD_AND_WRAP). */
    GetLastShotTime() {
      return this.target?.GetLastShotTime?.() ?? 0;
    }

    /** Carbon method EnterStateDeactive (MAP_METHOD_AND_WRAP). */
    EnterStateDeactive() {
      if (this.state === _EveTurretSet.State.STATE_DEACTIVE) return;
      if (this.state === _EveTurretSet.State.STATE_FIRING) this.firingEffect?.StopFiring?.();
      if (this.state === _EveTurretSet.State.STATE_TARGETING || this.state === _EveTurretSet.State.STATE_FIRING) {
        this.#delayToFadeOutTracking = 0.0001;
        this.#activeTurret = _EveTurretSet.INVALID_INDEX;
        this.target?.StopFireAtLocator?.();
        this.#playAll("Pack", "Inactive", 1);
      } else {
        this.trackingInfluence = 0;
        this.#delayToFadeOutTracking = 0;
        this.#playAll("Pack", "Inactive", 0);
      }
      this.state = _EveTurretSet.State.STATE_DEACTIVE;
      this.#setAmbientState();
    }

    /** Carbon method EnterStateFiring (MAP_METHOD_AND_WRAP). */
    EnterStateFiring() {
      if (!this.#setupFiringState()) return false;
      if (this.firingEffect && this.state === _EveTurretSet.State.STATE_FIRING) {
        if (this.firingEffect.IsLooping?.()) {
          this.firingEffect.PrepareFiringEffectMoveObjects?.();
          return true;
        }
        this.firingEffect.StopFiring?.();
      }
      if (this.firingEffect) {
        if (this.maxCyclingFirePos > 1) this.firingEffect.PrepareFiring?.(this.randomFiringDelay, this.currentCyclingFiresPos, this.cyclingFireGroupCount);else this.firingEffect.PrepareFiring?.(this.randomFiringDelay);
        this.firingEffect.SetImpactConfiguration?.(this.target?.GetImpactConfiguration?.());
      }
      this.state = _EveTurretSet.State.STATE_FIRING;
      this.#setAmbientState();
      return true;
    }

    /** Carbon method EnterStateIdle (MAP_METHOD_AND_WRAP). */
    EnterStateIdle() {
      if (!this.isOnline) return;
      if (this.state === _EveTurretSet.State.STATE_DEACTIVE) {
        this.#playAll("Deploy", "Active", 0);
        this.trackingInfluence = 0;
      } else if (this.state === _EveTurretSet.State.STATE_TARGETING || this.state === _EveTurretSet.State.STATE_FIRING) {
        this.#delayToFadeOutTracking = 0.0001;
        this.#activeTurret = _EveTurretSet.INVALID_INDEX;
        this.target?.StopFireAtLocator?.();
        this.firingEffect?.StopFiring?.();
        this.#playAll("", "Active", 1);
        this.turretMovementObserver?.GetObserver?.()?.SendEvent?.(this.targetingToIdleMovementAudioEvent);
      } else this.#playAll("", "Active", 0);
      this.state = _EveTurretSet.State.STATE_IDLE;
      this.#setAmbientState();
    }

    /** Carbon method EnterStateReloading (MAP_METHOD_AND_WRAP). */
    EnterStateReloading() {
      const wasDeactive = this.state === _EveTurretSet.State.STATE_DEACTIVE;
      if (this.state === _EveTurretSet.State.STATE_TARGETING || this.state === _EveTurretSet.State.STATE_FIRING) {
        this.#delayToFadeOutTracking = 0.0001;
        this.#activeTurret = _EveTurretSet.INVALID_INDEX;
        this.target?.StopFireAtLocator?.();
        this.firingEffect?.StopFiring?.();
        this.#playAll("Reload", "Active", 1);
      } else if (!wasDeactive) this.#playAll("Reload", "Active", 0);
      this.state = _EveTurretSet.State.STATE_RELOADING;
      this.#setAmbientState();
    }

    /** Carbon method EnterStateTargeting (MAP_METHOD_AND_WRAP). */
    EnterStateTargeting() {
      if (!this.isOnline) return;
      if (this.state === _EveTurretSet.State.STATE_DEACTIVE) {
        this.#delayToFadeInTracking = this.#playAll("Deploy", "Active", 1) + 0.0001;
      } else if (this.state === _EveTurretSet.State.STATE_IDLE || this.state === _EveTurretSet.State.STATE_RELOADING) {
        this.#delayToFadeInTracking = 0.0001;
        this.#playAll("", "Active", 1);
      } else if (this.state === _EveTurretSet.State.STATE_FIRING) {
        this.#activeTurret = _EveTurretSet.INVALID_INDEX;
        this.target?.StopFireAtLocator?.();
        this.firingEffect?.StopFiring?.();
        this.#playAll("", "Active", 0);
      }
      this.state = _EveTurretSet.State.STATE_TARGETING;
      this.#setAmbientState();
    }

    /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
    HandleControllerEvent(name) {
      this.firingEffect?.HandleControllerEvent?.(name);
      this.#ambientEffect()?.HandleControllerEvent?.(name);
    }

    /** Carbon method GetFiringBoneWorldTransform (MAP_METHOD_AND_WRAP). */
    GetFiringBoneWorldTransform(muzzle = 0, out = mat4.create()) {
      let turretIndex = this.#activeTurret;
      if (turretIndex === _EveTurretSet.INVALID_INDEX) turretIndex = this.GetClosestTurret();
      if (turretIndex === _EveTurretSet.INVALID_INDEX) return mat4.copy(out, this.#parentTransform);
      const turret = this.#turrets[turretIndex];
      const world = turret?.worldMatrix ?? turret?.transform ?? turret;
      if (world?.length === 16) mat4.copy(out, world);else mat4.copy(out, this.#parentTransform);
      if (!this.firingEffect) return out;
      const boneID = this.firingEffect?.GetPerMuzzleBoneID?.(muzzle) ?? _EveTurretSet.INVALID_INDEX;
      if (boneID === _EveTurretSet.INVALID_INDEX) {
        if (this.useLowLodFiringTransform) {
          mat4.fromRotationTranslationScale(_EveTurretSet.#lowLodTransform, this.lowLodFiringEffectRotation, this.lowLodFiringEffectTranslation, this.lowLodFiringEffectScale);
          mat4.multiply(out, out, _EveTurretSet.#lowLodTransform);
        }
        return out;
      }
      const boneTransform = turret?.GetBoneTransform?.(boneID, _EveTurretSet.#boneTransform) ?? this.geometryResource?.GetBoneTransform?.(turretIndex, boneID, _EveTurretSet.#boneTransform);
      if (boneTransform?.length === 16) {
        if (boneTransform !== _EveTurretSet.#boneTransform) mat4.copy(_EveTurretSet.#boneTransform, boneTransform);
        return mat4.multiply(out, out, _EveTurretSet.#boneTransform);
      }
      if (this.useLowLodFiringTransform) {
        mat4.fromRotationTranslationScale(_EveTurretSet.#lowLodTransform, this.lowLodFiringEffectRotation, this.lowLodFiringEffectTranslation, this.lowLodFiringEffectScale);
        mat4.multiply(out, out, _EveTurretSet.#lowLodTransform);
        return out;
      }
      if (this.sysBonePitchMin < 45) {
        vec3.set(_EveTurretSet.#turretPosition, out[12], out[13], out[14]);
        const target = this.target?.GetTrackingPosition?.() ?? this.target?.position ?? _EveTurretSet.#zero;
        vec3.subtract(_EveTurretSet.#targetDirection, target, _EveTurretSet.#turretPosition);
        if (vec3.squaredLength(_EveTurretSet.#targetDirection)) {
          quat.rotationTo(_EveTurretSet.#directRotation, _EveTurretSet.#unitZ, _EveTurretSet.#targetDirection);
          mat4.fromRotationTranslation(out, _EveTurretSet.#directRotation, _EveTurretSet.#turretPosition);
        }
      } else {
        mat4.fromXRotation(_EveTurretSet.#launcherRotation, -Math.PI * 0.5);
        mat4.multiply(out, out, _EveTurretSet.#launcherRotation);
      }
      return out;
    }

    /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
    SetControllerVariable(name, value) {
      this.firingEffect?.SetControllerVariable?.(name, value);
      this.#ambientEffect()?.SetControllerVariable?.(name, value);
    }

    /** Carbon method SetShotMissed (MAP_METHOD_AND_WRAP). */
    SetShotMissed(missed) {
      this.target?.SetShotMissed?.(missed);
    }

    /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
    StartControllers() {
      this.firingEffect?.StartControllers?.();
      this.#ambientEffect()?.StartControllers?.();
    }
    Initialize() {
      this.target ??= new _EveTurretTarget();
      this.target.SetBehaviour?.(this.laserMissBehaviour, this.projectileMissBehaviour, this.impactSize, this.impactBehaviour);
      this.firingEffect?.Initialize?.();
      this.#ambientEffect()?.Initialize?.();
      return true;
    }
    SetFiringEffect(effect) {
      this.firingEffect = effect ?? null;
      this.firingEffect?.Initialize?.();
    }
    SetTargetObject(object) {
      this.target ??= new _EveTurretTarget();
      const previous = this.target.GetTargetable?.();
      const accepted = this.target.SetTargetable(object);
      if (accepted) {
        if ((this.state === _EveTurretSet.State.STATE_IDLE || previous !== object) && this.playMovementSound && this.idleToTargetingMovementAudioEvent) {
          this.turretMovementObserver?.GetObserver?.()?.SendEvent?.(this.idleToTargetingMovementAudioEvent);
        }
        this.SetTargetScale();
      }
      return accepted;
    }
    GetTargetObject() {
      return this.target?.GetTargetable?.() ?? null;
    }
    SetTargetScale() {
      this.firingEffect?.SetScaleByRadius?.(this.target?.GetRadius?.() ?? -1);
    }
    SetTurrets(turrets = []) {
      this.#turrets = Array.from(turrets).slice(0, _EveTurretSet.MAX_TURRETS_PER_SET).map(turret => this.#normalizeTurret(turret));
      this.visibleCount = this.#turrets.length;
      return this.#turrets;
    }
    AddTurret(turret) {
      if (this.#turrets.length >= _EveTurretSet.MAX_TURRETS_PER_SET) return null;
      const value = this.#normalizeTurret(turret);
      this.#turrets.push(value);
      this.visibleCount = this.#turrets.length;
      return value;
    }
    GetTurrets() {
      return this.#turrets;
    }

    /** Carbon method SetLocalTransform. */
    SetLocalTransform(turretIndex, localMatrix) {
      const index = Number(turretIndex) >>> 0;
      if (index >= _EveTurretSet.MAX_TURRETS_PER_SET || localMatrix?.length !== 16) return false;
      while (this.#turrets.length <= index) {
        const turret = this.#normalizeTurret(null);
        turret.valid = false;
        turret.display = false;
        this.#turrets.push(turret);
      }
      const turret = this.#turrets[index];
      mat4.getRotation(_EveTurretSet.#localRotation, localMatrix);
      mat4.getTranslation(_EveTurretSet.#localTranslation, localMatrix);
      mat4.fromRotationTranslation(turret.localMatrix, _EveTurretSet.#localRotation, _EveTurretSet.#localTranslation);
      quat.copy(turret.localQuaternion, _EveTurretSet.#localRotation);
      vec4.set(turret.localPosition, _EveTurretSet.#localTranslation[0], _EveTurretSet.#localTranslation[1], _EveTurretSet.#localTranslation[2], 1);
      turret.valid = false;
      turret.display = false;
      this.generatedDistributedAmbientEffect?.UpdateInstance?.(index, _EveTurretSet.#unitScale, turret.localQuaternion, _EveTurretSet.#localTranslation);
      this.visibleCount = this.#turrets.length;
      return true;
    }
    SetParentTransform(transform) {
      mat4.copy(this.#parentTransform, transform);
      this.UpdateTurretTransforms(transform);
    }
    UpdateTurretTransforms(parentTransform = this.#parentTransform) {
      mat4.copy(this.#parentTransform, parentTransform);
      for (const turret of this.#turrets) {
        mat4.multiply(turret.worldMatrix, parentTransform, turret.localMatrix);
        turret.valid = true;
      }
    }
    GetClosestTurret() {
      return this.#getClosestTurretAndLocator().turret;
    }
    Update(context) {
      this.UpdateSyncronous(context);
      this.UpdateAsyncronous(context, this.#parentTransform);
      return true;
    }
    UpdateSyncronous(context, parentTransform = this.#parentTransform) {
      const deltaTime = Number(context?.GetDeltaT?.() ?? context?.deltaTime ?? context?.deltaT ?? 0);
      if (parentTransform?.length === 16) mat4.copy(this.#parentTransform, parentTransform);
      if (this.firingEffect) {
        if (this.#activeTurret !== _EveTurretSet.INVALID_INDEX && this.firingEffect.IsLooping?.() && this.state === _EveTurretSet.State.STATE_FIRING) {
          this.#recheckTimeLeft -= deltaTime;
          if (this.#recheckTimeLeft < 0) {
            const pair = this.#getClosestTurretAndLocator();
            if (pair.turret !== this.#activeTurret || pair.locator !== this.target?.GetLocator?.()) this.#setupFiringState();
            this.#recheckTimeLeft = 2;
          }
        }
        this.firingEffect.UpdateSynchronous?.(context);
      }
      vec3.set(_EveTurretSet.#sourcePosition, this.#parentTransform[12], this.#parentTransform[13], this.#parentTransform[14]);
      this.firingEffect?.GetStartPosition?.(_EveTurretSet.#sourcePosition);
      this.target?.Update?.(deltaTime, _EveTurretSet.#sourcePosition);
      this.#ambientEffect()?.UpdateSyncronous?.(context, {
        isVisible: this.display,
        localToWorldTransform: this.#parentTransform
      });
      if (this.#turrets.length) this.turretMovementObserver?.Update?.(this.#turrets[0].worldMatrix);
      return true;
    }
    UpdateAsyncronous(context, parentData = this.#parentTransform) {
      const deltaTime = Number(context?.GetDeltaT?.() ?? context?.deltaTime ?? context?.deltaT ?? 0);
      const parentTransform = parentData?.transform?.length === 16 ? parentData.transform : parentData;
      if (parentTransform?.length === 16) this.UpdateTurretTransforms(parentTransform);
      if (this.#trackingInfluenceDelta !== 0) {
        this.trackingInfluence += this.#trackingInfluenceDelta * deltaTime;
        if (this.trackingInfluence > this.maxTrackingTime) {
          this.trackingInfluence = this.maxTrackingTime;
          this.#trackingInfluenceDelta = 0;
        } else if (this.trackingInfluence < 0) {
          this.trackingInfluence = 0;
          this.#trackingInfluenceDelta = 0;
        }
      }
      if (this.#delayToFadeOutTracking > 0) {
        this.#delayToFadeOutTracking -= deltaTime;
        if (this.#delayToFadeOutTracking <= 0) {
          this.#delayToFadeOutTracking = 0;
          this.#trackingInfluenceDelta = -1;
        }
      }
      if (this.#delayToFadeInTracking > 0) {
        this.#delayToFadeInTracking -= deltaTime;
        if (this.#delayToFadeInTracking <= 0) {
          this.#delayToFadeInTracking = 0;
          this.#trackingInfluenceDelta = 1;
        }
      }
      if (this.trackingInfluence !== 0) {
        const trackingPosition = this.target?.GetTrackingPosition?.() ?? this.target?.position;
        if (trackingPosition) {
          for (const turret of this.#turrets) {
            if (!turret.valid || !mat4.invert(_EveTurretSet.#inverseTurret, turret.worldMatrix)) continue;
            vec3.transformMat4(_EveTurretSet.#localTarget, trackingPosition, _EveTurretSet.#inverseTurret);
            const hook = turret.UpdateTrackingPose ?? turret.source?.UpdateTrackingPose;
            hook?.call(turret.source ?? turret, _EveTurretSet.#localTarget, this.trackingInfluence, this);
          }
        }
      }
      if (this.firingEffect) {
        this.firingEffect.SetEndPosition?.(this.target?.GetTargetPosition?.() ?? this.target?.targetPosition ?? _EveTurretSet.#zero);
        for (let muzzle = 0; muzzle < this.firingEffect.GetPerMuzzleEffectCount?.(); muzzle++) {
          this.firingEffect.SetMuzzleTransform?.(muzzle, this.GetFiringBoneWorldTransform(muzzle, _EveTurretSet.#muzzleTransform));
        }
        this.firingEffect.SetDisplayDestObject?.(this.target?.ShowDestObject?.() ?? true);
        this.firingEffect.UpdateAsynchronous?.(context);
      }
      this.#ambientEffect()?.UpdateAsyncronous?.(context, {
        isVisible: this.display,
        localToWorldTransform: this.#parentTransform
      });
      return true;
    }
    GetRenderables(out = []) {
      if (!this.display) return out;
      if (this.displayEffects) this.firingEffect?.GetRenderables?.(out);
      if (this.#ambientEffect() && this.displayEffects) this.#ambientEffect().GetRenderables?.(out);
      return out;
    }
    UpdateVisibility(context) {
      if (!this.display) return false;
      if (this.displayEffects) this.firingEffect?.UpdateVisibility?.(context);
      if (this.displayEffects) this.#ambientEffect()?.UpdateVisibility?.(context, this.#parentTransform);
      return true;
    }

    /** Carbon EveTurretSet::RegisterComponents (cpp:238-256): ShadowCaster leaf
     * self-registration, then forwards the firing effect and the ambient effect
     * (GetAmbientEffectOrGeneratedEffect, mirrored by #ambientEffect). Gate
     * m_display. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.display) {
        registry.RegisterComponent(EveComponentType.ShadowCaster, this);
        this.firingEffect?.Register?.(registry);
        this.#ambientEffect()?.Register?.(registry);
      }
    }

    /** Carbon EveTurretSet::UnRegisterComponents (cpp:258-274): forwards the
     * firing and ambient effects only (own components were already removed by
     * EveEntity::UnRegister, EveEntity.cpp:90); no display re-check. */
    UnRegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        this.firingEffect?.UnRegister?.(registry);
        this.#ambientEffect()?.UnRegister?.(registry);
      }
    }

    /** Carbon EveTurretSet::IsCastingShadow (cpp:2022-2051): after the
     * display/geometry (cpp:2024) and reflection-reason (cpp:2029) early-outs -
     * which do NOT write the out-param, so a stale previous-caster value
     * survives at the scene call sites (EveSpaceScene.cpp:2391/2517) - the
     * SET-level bounding sphere is transformed by EVERY turret's world matrix
     * (including invisible ones - no per-turret visibility gate, unlike
     * UpdateVisibility cpp:2070-2088), gated on transformed radius > 0, culled
     * with shadowFrustum.IsVisible, and the MAX GetSizeInShadow accumulates.
     * Returns sizeInShadow > 5 (the swarm uses 15). Carbon's float& out-param
     * becomes the optional trailing length-1 array (out-params last). */
    IsCastingShadow(cameraFrustum, shadowFrustum, renderReason, sizeInShadowOut = null) {
      if (!this.display || !this.geometryResource) {
        return false;
      }
      if (Number(renderReason ?? Tr2RenderReason.TR2RENDERREASON_NORMAL) === Tr2RenderReason.TR2RENDERREASON_REFLECTION) {
        return false;
      }
      let sizeInShadow = 0;
      if (sizeInShadowOut) {
        sizeInShadowOut[0] = 0;
      }
      for (const turret of this.GetTurrets()) {
        const sphere = _EveTurretSet.#shadowSphereScratch;
        vec4.copy(sphere, this.boundingSphere);
        BoundingSphereTransform(turret.worldMatrix, sphere);
        if (sphere[3] > 0 && shadowFrustum?.IsVisible?.(cameraFrustum, sphere)) {
          sizeInShadow = Math.max(sizeInShadow, shadowFrustum.GetSizeInShadow(sphere));
          if (sizeInShadowOut) {
            sizeInShadowOut[0] = sizeInShadow;
          }
        }
      }
      return sizeInShadow > 5;
    }

    /** Carbon EveTurretSet::GetShadowBatches (cpp:2221-2254): one instanced
     * batch for the whole turret geometry - material m_turretEffect, instance
     * count m_visibleCount, mesh 0 at the lowest LOD. QUIRK: shadowPixelSize is
     * completely IGNORED (always GetMeshLod(0, 0), cpp:2235) - the swarm uses
     * it for LOD, the turret does not. The shadow path commits without the
     * normal path's validity check (cpp:2253 vs 2211) - equivalent here because
     * Commit drops invalid batches. Returns whether the batch was committed
     * (JS addition; Carbon returns void). NOTE: JS visibleCount is currently
     * the total turret count (the adapted UpdateVisibility does no per-turret
     * frustum cull), a pre-existing adaptation. */
    GetShadowBatches(batches, perObjectData, _shadowPixelSize) {
      if (!this.display || !this.visibleCount) {
        return false;
      }
      if (!this.geometryResource) {
        return false;
      }
      const batch = new Tr2RenderBatch();
      batch.SetMaterial(this.turretEffect);
      if (!batch.IsValid()) {
        return false;
      }
      batch.SetGeometrySource(this.geometryResource, 0, -1, -1, false);
      batch.SetPerObjectData(perObjectData ?? null);
      batch.instanceCount = this.visibleCount >>> 0;
      return batches?.Commit?.(batch) === true;
    }

    /** Carbon EveTurretSet::GetPerObjectData (cpp:2275-2518): early-outs on a
     * missing/bad geometry resource RETURN NULL - and the cascade path stores
     * that null and still calls GetShadowBatches with it (EveSpaceScene.cpp:
     * 717/727), so a null per-object record on a batch is legal. The
     * EveTurretSetPerObjectData fill (ship matrices, compacted per-visible
     * turret SRT arrays, the bone palette - whose invBind * world composition
     * swaps operands in gl-matrix - and the SH/clip PS block, cpp:2300-2511)
     * is GPU ring-buffer work; the GPU-free record carries the live object
     * reference for the engine serializer (EveChildMesh precedent). */
    GetPerObjectData(accumulator = null) {
      if (!this.geometryResource) {
        return null;
      }
      const data = typeof accumulator?.Allocate === "function" ? accumulator.Allocate(Tr2PerObjectData) : new Tr2PerObjectData();
      data.object = this;
      return data;
    }

    /** Carbon EveTurretSet::GetShadowPerObjectData (cpp:2520-2523): pure
     * forward to GetPerObjectData. */
    GetShadowPerObjectData(accumulator = null) {
      return this.GetPerObjectData(accumulator);
    }
    #setupFiringState() {
      if (this.state === _EveTurretSet.State.STATE_DEACTIVE || !this.target) return false;
      const pair = this.#getClosestTurretAndLocator();
      this.#activeTurret = pair.turret;
      if (this.maxCyclingFirePos > 1) {
        this.currentCyclingFiresPos += this.cyclingFireGroupCount;
        if (this.currentCyclingFiresPos >= this.maxCyclingFirePos * this.cyclingFireGroupCount) this.currentCyclingFiresPos = 0;
      }
      this.randomFiringDelay = this.useRandomFiringDelay ? this.GetShotTimeVariance() * Math.random() : 0;
      const effectTotalTime = Number(this.firingEffect?.GetFiringDuration?.() ?? 0);
      const effectPeakTime = Number(this.firingEffect?.GetFiringPeakTime?.() ?? 0);
      const source = this.#parentTransform.subarray(12, 15);
      const locator = pair.locator;
      if (this.state === _EveTurretSet.State.STATE_IDLE || this.state === _EveTurretSet.State.STATE_RELOADING) {
        this.randomFiringDelay += this.maxTrackingTime;
        this.#delayToFadeInTracking = 0.0001;
      }
      const fireName = this.currentCyclingFiresPos > 0 ? `Fire0${Math.floor(this.currentCyclingFiresPos / this.cyclingFireGroupCount)}` : "Fire";
      this.#turrets.forEach((_turret, index) => this.#playTurret(index, index === this.#activeTurret ? fireName : "", "Active", this.randomFiringDelay));
      this.target.StartFireAtLocator?.(locator ?? -1, this.randomFiringDelay + effectPeakTime, effectTotalTime - effectPeakTime, source);
      const ambient = this.#ambientEffect();
      if (ambient) {
        ambient.SetControllerVariable?.("TurretState", this.state === _EveTurretSet.State.STATE_FIRING ? _EveTurretSet.State.STATE_TARGETING : this.state);
        ambient.SetControllerVariableOnInstance?.(this.#activeTurret, "TurretState", _EveTurretSet.State.STATE_FIRING);
        ambient.SetControllerVariableOnInstance?.(this.#activeTurret, "FiringDelay", this.randomFiringDelay);
      }
      return true;
    }
    #getClosestTurretAndLocator() {
      const pair = _EveTurretSet.#closestPair;
      pair.turret = _EveTurretSet.INVALID_INDEX;
      pair.locator = -1;
      if (!this.#turrets.length) return pair;
      let closestAngle = -1;
      for (let index = 0; index < this.#turrets.length; index++) {
        const turret = this.#turrets[index];
        if (!turret.valid) continue;
        const transform = turret.worldMatrix;
        vec3.set(_EveTurretSet.#turretPosition, transform[12], transform[13], transform[14]);
        const locator = this.target?.FindClosestLocator?.(_EveTurretSet.#turretPosition, _EveTurretSet.#locatorPosition) ?? -1;
        vec3.subtract(_EveTurretSet.#targetDirection, _EveTurretSet.#locatorPosition, _EveTurretSet.#turretPosition);
        if (vec3.squaredLength(_EveTurretSet.#targetDirection)) vec3.normalize(_EveTurretSet.#targetDirection, _EveTurretSet.#targetDirection);
        vec3.normalize(_EveTurretSet.#turretUp, vec3.set(_EveTurretSet.#turretUp, transform[4], transform[5], transform[6]));
        const angle = vec3.dot(_EveTurretSet.#turretUp, _EveTurretSet.#targetDirection);
        if (angle > closestAngle) {
          closestAngle = angle;
          pair.turret = index;
          pair.locator = locator;
        }
      }
      if (pair.turret !== _EveTurretSet.INVALID_INDEX && this.chooseRandomLocator) {
        const transform = this.#turrets[pair.turret].worldMatrix;
        vec3.set(_EveTurretSet.#turretPosition, transform[12], transform[13], transform[14]);
        const randomLocator = this.target?.FindRandomValidLocator?.(_EveTurretSet.#turretPosition, _EveTurretSet.#locatorPosition) ?? -1;
        if (randomLocator !== pair.locator && randomLocator !== -1) {
          pair.locator = randomLocator;
          closestAngle = -1;
          for (let index = 0; index < this.#turrets.length; index++) {
            const turret = this.#turrets[index];
            if (!turret.valid) continue;
            const turretTransform = turret.worldMatrix;
            vec3.set(_EveTurretSet.#turretPosition, turretTransform[12], turretTransform[13], turretTransform[14]);
            vec3.subtract(_EveTurretSet.#targetDirection, _EveTurretSet.#locatorPosition, _EveTurretSet.#turretPosition);
            if (vec3.squaredLength(_EveTurretSet.#targetDirection)) vec3.normalize(_EveTurretSet.#targetDirection, _EveTurretSet.#targetDirection);
            vec3.normalize(_EveTurretSet.#turretUp, vec3.set(_EveTurretSet.#turretUp, turretTransform[4], turretTransform[5], turretTransform[6]));
            const angle = vec3.dot(_EveTurretSet.#turretUp, _EveTurretSet.#targetDirection);
            if (angle > closestAngle) {
              closestAngle = angle;
              pair.turret = index;
            }
          }
        }
      }
      if (pair.turret === _EveTurretSet.INVALID_INDEX) pair.turret = 0;
      return pair;
    }
    #playAll(animation, loop, delay) {
      let duration = 0;
      for (let index = 0; index < this.#turrets.length; index++) duration = Math.max(duration, this.#playTurret(index, animation, loop, delay));
      return duration;
    }
    #playTurret(index, animation, loop, delay) {
      const turret = this.#turrets[index];
      if (!turret) return 0;
      return Number(turret.PlayAnimation?.(animation, loop, delay) ?? turret.controller?.PlayAnimation?.(animation, {
        loop,
        delay
      }) ?? 0);
    }
    #ambientEffect() {
      return this.ambientEffectEditingMode ? this.ambientEffect : this.generatedDistributedAmbientEffect ?? this.ambientEffect;
    }
    #setAmbientState() {
      this.#ambientEffect()?.SetControllerVariable?.("TurretState", this.state);
    }
    #normalizeTurret(turret) {
      if (turret?.localMatrix?.length === 16) {
        turret.worldMatrix ??= mat4.create();
        turret.localQuaternion ??= quat.create();
        turret.localPosition ??= vec4.create();
        turret.valid ??= true;
        return turret;
      }
      const localMatrix = mat4.create();
      if (turret?.length === 16) mat4.copy(localMatrix, turret);else if (turret?.transform?.length === 16) mat4.copy(localMatrix, turret.transform);
      return {
        source: turret,
        localMatrix,
        worldMatrix: mat4.clone(localMatrix),
        localQuaternion: quat.create(),
        localPosition: vec4.create(),
        valid: turret !== null,
        display: turret?.display ?? true,
        canFireWhenHidden: !!turret?.canFireWhenHidden
      };
    }
  }];
  ImpactBehaviour = Object.freeze({
    DAMAGE_LOCATOR: 0,
    SHIELD_ELLIPSOID: 1,
    CENTER: 2
  });
  LOD = Object.freeze({
    LOD_INVALID: 0,
    LOD_EMPTY: 1,
    LOD_HIGHEST: 2,
    LOD_DISABLED: 3
  });
  SystemBones = Object.freeze({
    SYSBONE_INVALID: 0,
    SYSBONE_ROTATION: 1,
    SYSBONE_ROTATION01: 2,
    SYSBONE_ROTATION02: 3,
    SYSBONE_COUNTER_ROTATION: 4,
    SYSBONE_PITCH: 5,
    SYSBONE_PITCH1: 6,
    SYSBONE_PITCH2: 7,
    SYSBONE_SCALED_HEIGHT: 8,
    SYSBONE_SCALED_PITCH01: 9,
    SYSBONE_SCALED_PITCH02: 10,
    SYSBONE_SCALED_PITCH03: 11,
    SYSBONE_SCALED_PITCH04: 12,
    SYSBONE_SCALED_PITCH05: 13,
    SYSBONE_SCALED_PITCH06: 14,
    SYSBONE_MAX: 15
  });
  State = Object.freeze({
    STATE_INVALID: 0,
    STATE_DEACTIVE: 1,
    STATE_IDLE: 2,
    STATE_TARGETING: 3,
    STATE_FIRING: 4,
    STATE_RELOADING: 5
  });
  INVALID_INDEX = 0xffffffff;
  MAX_TURRETS_PER_SET = 24;
  #boneTransform = mat4.create();
  #lowLodTransform = mat4.create();
  #muzzleTransform = mat4.create();
  #turretPosition = vec3.create();
  #targetDirection = vec3.create();
  #turretUp = vec3.create();
  #locatorPosition = vec3.create();
  #zero = vec3.create();
  #sourcePosition = vec3.create();
  #localTranslation = vec3.create();
  #localRotation = quat.create();
  #unitScale = vec3.fromValues(1, 1, 1);
  #inverseTurret = mat4.create();
  #shadowSphereScratch = vec4.create();
  #localTarget = vec3.create();
  #directRotation = quat.create();
  #launcherRotation = mat4.create();
  #unitZ = vec3.fromValues(0, 0, 1);
  #closestPair = {
    turret: _EveTurretSet.INVALID_INDEX,
    locator: -1
  };
  constructor() {
    super(_EveTurretSet), _initClass();
  }
}();

export { _EveTurretSet as EveTurretSet };
//# sourceMappingURL=EveTurretSet.js.map
