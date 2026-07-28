import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../EveEntity.js';
import { EveChildUpdateParams as _EveChildUpdateParams } from '../EveChildUpdateParams.js';
import { EveChildInheritProperties as _EveChildInheritPrope } from '../child/EveChildInheritProperties.js';
import { box3 } from '@carbonenginejs/runtime-utils/box3';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { sph3 } from '@carbonenginejs/runtime-utils/sph3';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { ReflectionMode } from '../../generated/eve/enums.js';
import { EveComponentType, ShouldReflect } from '../EveComponentTypes.js';
import { ImpactConfiguration } from '../../generated/include/enums.js';
import { EveLODHelper } from '../EveLODHelper.js';
import { TriBatchType } from '@carbonenginejs/runtime-utils/graphics';
import { MatrixCopyFrom3x4 } from '../lights/lightConversion.js';
import { getBoneList } from '../../trinityCore/Tr2GrannyAnimation.js';
import { Tr2PerObjectData } from '../../trinityCore/Tr2PerObjectData.js';
import { TriRenderBatchAreaBlock, Tr2RenderBatch } from '../../trinityCore/Tr2RenderBatch.js';
import { Tr2Lod } from '@carbonenginejs/runtime-utils/const/trinity';

let _initProto, _initClass, _init_reflectionMode, _init_extra_reflectionMode, _init_effectChildren, _init_extra_effectChildren, _init_children, _init_extra_children, _init_name, _init_extra_name, _init_mute, _init_extra_mute, _init_inheritProperties, _init_extra_inheritProperties, _init_customMasks, _init_extra_customMasks, _init_overlayEffects, _init_extra_overlayEffects, _init_positionDelta, _init_extra_positionDelta, _init_lodLevel, _init_extra_lodLevel, _init_curveSets, _init_extra_curveSets, _init_isPickable, _init_extra_isPickable, _init_estimatedPixelDiameter, _init_extra_estimatedPixelDiameter, _init_estimatedPixelDiameterWithChildren, _init_extra_estimatedPixelDiameterWithChildren, _init_generatedShapeEllipsoidCenter, _init_extra_generatedShapeEllipsoidCenter, _init_generatedShapeEllipsoidRadius, _init_extra_generatedShapeEllipsoidRadius, _init_animationUpdater, _init_extra_animationUpdater, _init_dna, _init_extra_dna, _init_castShadow, _init_extra_castShadow, _init_isAnimated, _init_extra_isAnimated, _init_dynamicBoundingSphereEnabled, _init_extra_dynamicBoundingSphereEnabled, _init_attachments, _init_extra_attachments, _init_decals, _init_extra_decals, _init_lights, _init_extra_lights, _init_externalParameters, _init_extra_externalParameters, _init_controllers, _init_extra_controllers, _init_locators, _init_extra_locators, _init_mesh, _init_extra_mesh, _init_impactOverlay, _init_extra_impactOverlay, _init_clipSphereCenter, _init_extra_clipSphereCenter, _init_clipSphereFactor, _init_extra_clipSphereFactor, _init_clipSphereFactor2, _init_extra_clipSphereFactor2, _init_observers, _init_extra_observers, _init_worldPosition, _init_extra_worldPosition, _init_rotationCurve, _init_extra_rotationCurve, _init_worldRotation, _init_extra_worldRotation, _init_modelScale, _init_extra_modelScale, _init_locatorSets, _init_extra_locatorSets, _init_activationStrength, _init_extra_activationStrength, _init_albedoColor, _init_extra_albedoColor, _init_display, _init_extra_display, _init_update, _init_extra_update, _init_secondaryLightingSphereRadius, _init_extra_secondaryLightingSphereRadius, _init_boundingSphereCenter, _init_extra_boundingSphereCenter, _init_dirtLevel, _init_extra_dirtLevel, _init_customShaderData, _init_extra_customShaderData, _init_lastDamageLocatorHit, _init_extra_lastDamageLocatorHit, _init_boundingSphereRadius, _init_extra_boundingSphereRadius, _init_modelWorldPosition, _init_extra_modelWorldPosition, _init_modelTranslationCurve, _init_extra_modelTranslationCurve, _init_modelRotationCurve, _init_extra_modelRotationCurve, _init_shapeEllipsoidCenter, _init_extra_shapeEllipsoidCenter, _init_shapeEllipsoidRadius, _init_extra_shapeEllipsoidRadius, _init_translationCurve, _init_extra_translationCurve, _init_worldTransform, _init_extra_worldTransform, _init_inverseWorldTransform, _init_extra_inverseWorldTransform, _init_lastWorldTransform, _init_extra_lastWorldTransform, _init_worldVelocity, _init_extra_worldVelocity, _init_audioGeometry, _init_extra_audioGeometry, _init_isVisible, _init_extra_isVisible;

// Static scratch for the sorted-transparent area pass (allocation rules: hot
// per-frame path, copy-into, never allocate per call).
const TRANSPARENT_AABB_MIN = vec3.create();
const TRANSPARENT_AABB_MAX = vec3.create();
const TRANSPARENT_CENTER = vec3.create();

// Carbon EveMeshOverlayEffect::OverlayType (EveMeshOverlayEffect.h:35-41).
const OVERLAY_TYPE_OPAQUEONLY = 0;
const OVERLAY_TYPE_ALL = 1;

/**
 * The hull of an EVE space object - its mesh, locators, locator sets, decals,
 * attachments, lights, effect children, overlay effects, impact overlay and
 * controllers - together with the curve-driven world transform, visibility, LOD
 * and batch submission that drive them each frame.
 */
let _EveSpaceObject;
new class extends _identity {
  static [class EveSpaceObject2 extends _EveEntity {
    static {
      ({
        e: [_init_reflectionMode, _init_extra_reflectionMode, _init_effectChildren, _init_extra_effectChildren, _init_children, _init_extra_children, _init_name, _init_extra_name, _init_mute, _init_extra_mute, _init_inheritProperties, _init_extra_inheritProperties, _init_customMasks, _init_extra_customMasks, _init_overlayEffects, _init_extra_overlayEffects, _init_positionDelta, _init_extra_positionDelta, _init_lodLevel, _init_extra_lodLevel, _init_curveSets, _init_extra_curveSets, _init_isPickable, _init_extra_isPickable, _init_estimatedPixelDiameter, _init_extra_estimatedPixelDiameter, _init_estimatedPixelDiameterWithChildren, _init_extra_estimatedPixelDiameterWithChildren, _init_generatedShapeEllipsoidCenter, _init_extra_generatedShapeEllipsoidCenter, _init_generatedShapeEllipsoidRadius, _init_extra_generatedShapeEllipsoidRadius, _init_animationUpdater, _init_extra_animationUpdater, _init_dna, _init_extra_dna, _init_castShadow, _init_extra_castShadow, _init_isAnimated, _init_extra_isAnimated, _init_dynamicBoundingSphereEnabled, _init_extra_dynamicBoundingSphereEnabled, _init_attachments, _init_extra_attachments, _init_decals, _init_extra_decals, _init_lights, _init_extra_lights, _init_externalParameters, _init_extra_externalParameters, _init_controllers, _init_extra_controllers, _init_locators, _init_extra_locators, _init_mesh, _init_extra_mesh, _init_impactOverlay, _init_extra_impactOverlay, _init_clipSphereCenter, _init_extra_clipSphereCenter, _init_clipSphereFactor, _init_extra_clipSphereFactor, _init_clipSphereFactor2, _init_extra_clipSphereFactor2, _init_observers, _init_extra_observers, _init_worldPosition, _init_extra_worldPosition, _init_rotationCurve, _init_extra_rotationCurve, _init_worldRotation, _init_extra_worldRotation, _init_modelScale, _init_extra_modelScale, _init_locatorSets, _init_extra_locatorSets, _init_activationStrength, _init_extra_activationStrength, _init_albedoColor, _init_extra_albedoColor, _init_display, _init_extra_display, _init_update, _init_extra_update, _init_secondaryLightingSphereRadius, _init_extra_secondaryLightingSphereRadius, _init_boundingSphereCenter, _init_extra_boundingSphereCenter, _init_dirtLevel, _init_extra_dirtLevel, _init_customShaderData, _init_extra_customShaderData, _init_lastDamageLocatorHit, _init_extra_lastDamageLocatorHit, _init_boundingSphereRadius, _init_extra_boundingSphereRadius, _init_modelWorldPosition, _init_extra_modelWorldPosition, _init_modelTranslationCurve, _init_extra_modelTranslationCurve, _init_modelRotationCurve, _init_extra_modelRotationCurve, _init_shapeEllipsoidCenter, _init_extra_shapeEllipsoidCenter, _init_shapeEllipsoidRadius, _init_extra_shapeEllipsoidRadius, _init_translationCurve, _init_extra_translationCurve, _init_worldTransform, _init_extra_worldTransform, _init_inverseWorldTransform, _init_extra_inverseWorldTransform, _init_lastWorldTransform, _init_extra_lastWorldTransform, _init_worldVelocity, _init_extra_worldVelocity, _init_audioGeometry, _init_extra_audioGeometry, _init_isVisible, _init_extra_isVisible, _initProto],
        c: [_EveSpaceObject, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSpaceObject2",
        family: "eve/spaceObject"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, schema.enum("ReflectionMode")], 16, "reflectionMode"], [[io, io.persist, void 0, type.list("IEveSpaceObjectChild")], 16, "effectChildren"], [[io, io.persist, void 0, type.list("IEveTransform")], 16, "children"], [[io, io.notify, io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "mute"], [[io, io.readwrite, void 0, type.objectRef("EveChildInheritProperties")], 16, "inheritProperties"], [[io, io.persist, void 0, type.list("EveCustomMask")], 16, "customMasks"], [[io, io.persist, void 0, type.list("EveMeshOverlayEffect")], 16, "overlayEffects"], [[io, io.read, void 0, type.objectRef("Tr2BindingVector3")], 16, "positionDelta"], [[io, io.read, type, type.int32, void 0, schema.enum("Tr2Lod")], 16, "lodLevel"], [[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.readwrite, type, type.boolean], 16, "isPickable"], [[io, io.read, type, type.float32], 16, "estimatedPixelDiameter"], [[io, io.read, type, type.float32], 16, "estimatedPixelDiameterWithChildren"], [[io, io.read, type, type.vec3], 16, "generatedShapeEllipsoidCenter"], [[io, io.read, type, type.vec3], 16, "generatedShapeEllipsoidRadius"], [[io, io.read, void 0, type.objectRef("Tr2GrannyAnimation")], 16, "animationUpdater"], [[io, io.persist, type, type.string], 16, "dna"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "castShadow"], [[io, io.persist, type, type.boolean], 16, "isAnimated"], [[io, io.persist, type, type.boolean], 16, "dynamicBoundingSphereEnabled"], [[io, io.persist, void 0, type.list("IEveSpaceObjectAttachment")], 16, "attachments"], [[io, io.persist, void 0, type.list("EveSpaceObjectDecal")], 16, "decals"], [[io, io.notify, io, io.persist, void 0, type.list("Tr2Light")], 16, "lights"], [[io, io.persist, void 0, type.list("Tr2ExternalParameter")], 16, "externalParameters"], [[io, io.persist, void 0, type.list("ITr2Controller")], 16, "controllers"], [[io, io.persist, void 0, type.list("EveLocator2")], 16, "locators"], [[io, io.persist, void 0, type.objectRef("Tr2MeshBase")], 16, "mesh"], [[io, io.persist, void 0, type.objectRef("EveImpactOverlay")], 16, "impactOverlay"], [[io, io.persist, type, type.vec3], 16, "clipSphereCenter"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "clipSphereFactor2"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "clipSphereFactor"], [[io, io.persist, void 0, type.list("TriObserverLocal")], 16, "observers"], [[io, io.read, type, type.vec3], 16, "worldPosition"], [[io, io.persist, void 0, type.objectRef("ITriQuaternionFunction")], 16, "rotationCurve"], [[io, io.read, type, type.quat], 16, "worldRotation"], [[io, io.persist, type, type.float32], 16, "modelScale"], [[io, io.persist, void 0, type.list("EveLocatorSets")], 16, "locatorSets"], [[io, io.readwrite, type, type.float32], 16, "activationStrength"], [[io, io.readwrite, type, type.color], 16, "albedoColor"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.boolean], 16, "update"], [[io, io.read, type, type.float32], 16, "secondaryLightingSphereRadius"], [[io, io.persist, type, type.vec3], 16, "boundingSphereCenter"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "dirtLevel"], [[io, io.readwrite, type, type.vec4], 16, "customShaderData"], [[io, io.read, type, type.int32], 16, "lastDamageLocatorHit"], [[io, io.persist, type, type.float32], 16, "boundingSphereRadius"], [[io, io.read, type, type.vec3], 16, "modelWorldPosition"], [[io, io.persist, void 0, type.objectRef("ITriVectorFunction")], 16, "modelTranslationCurve"], [[io, io.persist, void 0, type.objectRef("ITriQuaternionFunction")], 16, "modelRotationCurve"], [[io, io.persist, type, type.vec3], 16, "shapeEllipsoidCenter"], [[io, io.persist, type, type.vec3], 16, "shapeEllipsoidRadius"], [[io, io.persist, void 0, type.objectRef("ITriVectorFunction")], 16, "translationCurve"], [[io, io.read, type, type.mat4], 16, "worldTransform"], [[io, io.read, type, type.mat4], 16, "inverseWorldTransform"], [[io, io.read, type, type.mat4], 16, "lastWorldTransform"], [[io, io.read, type, type.vec3], 16, "worldVelocity"], [[io, io.readwrite, void 0, type.objectRef("ITr2AudGeometry")], 16, "audioGeometry"], [[type, type.boolean], 16, "isVisible"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMesh"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetMesh"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddController"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddObserver"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetInheritProperties"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEffectChildByName"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddToEffectChildrenList"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddLight"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearLights"], [[carbon, carbon.method, impl, impl.implemented], 18, "RemoveFromEffectChildrenList"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetModelRotationCurve"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetModelRotationCurve"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetModelTranslationCurve"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetModelTranslationCurve"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateWorldTransform"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The browser runtime refreshes the cache with world-transform updates instead of Carbon's renderer-side PrepareShaderData pass.")], 18, "UpdateWorldBounds"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Native impostor, raytracing, and audio-emitter realization remain engine-owned; graph visibility and LOD state are preserved.")], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Impostor submission and decal mesh caches are engine-owned; Trinity returns the backend-neutral renderable graph.")], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Overlay area-block batches are deferred; the view position arrives via the appended render-context argument instead of Carbon's renderer global.")], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon rebuilds from the geometry-resource notify callback; the GPU-free port rebuilds lazily on first batch use from the mesh areas alone.")], 18, "RebuildCachedData"], [[carbon, carbon.method, impl, impl.implemented], 18, "ReleaseCachedData"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Realized-LOD draw args are engine-resolved from the geometry source descriptor; primitive-count gating happens at realization.")], 18, "GetShadowBatches"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Overlay selection is fully represented in the CPU graph; realized-LOD draw arguments remain engine-owned.")], 18, "GetBatchesFromOverlayVector"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Portable mesh area access replaces Carbon's native mesh-area vectors.")], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reads the Tr2Renderer view-position global; the relocated camera state arrives via the threaded render context.")], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Persistent VS/PS device buffers are engine-owned; the record carries the object reference the engine serializer consumes.")], 18, "GetPerObjectData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetShadowPerObjectData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLights"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "IsCastingShadow"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "DisplayChildren"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetObserverTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocalToWorldTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetModelCenterWorldPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetWorldPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetWorldRotation"], [[carbon, carbon.method, impl, impl.implemented], 18, "FindSoundEmitter"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetMute"], [[carbon, carbon.method, impl, impl.adapted], 18, "PlayAnimationEx"], [[carbon, carbon.method, impl, impl.adapted], 18, "CalculateSkinnedBoundingBoxFromTransform"], [[carbon, carbon.method, impl, impl.adapted], 18, "CalculateSkinnedBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearImpactDamage"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearAnimations"], [[carbon, carbon.method, impl, impl.implemented], 18, "CreateImpactFromPosition"], [[carbon, carbon.method, impl, impl.adapted], 18, "CreateImpact"], [[carbon, carbon.method, impl, impl.implemented], 18, "EndAnimation"], [[carbon, carbon.method, impl, impl.implemented], 18, "FreezeHighDetailMesh"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDamageLocatorCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocatorCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocatorsForSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCloseLocatorIndex"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetGoodLocatorIndex"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDamageLocatorDirection"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS keeps output parameters last and returns a validity flag for targetable callers.")], 18, "GetDamageLocatorPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetClosestDamageLocatorIndex"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("TriRand is represented by Math.random; all locator scoring remains source-faithful.")], 18, "GetGoodDamageLocatorIndex"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRadius"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMissPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetImpactConfiguration"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasImpactConfigurationShield"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS uses an out-last signature; the ellipsoid intersection is otherwise source-faithful CPU math.")], 18, "GetImpactPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateImpact"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDamageLocator"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTransformedDamageLocator"], [[carbon, carbon.method, impl, impl.adapted], 18, "IsImpostor"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocatorPositionFromSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocatorRotationFromSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "HandleControllerEvent"], [[carbon, carbon.method, impl, impl.adapted], 18, "PlayAnimation"], [[carbon, carbon.method, impl, impl.implemented], 18, "ChainAnimation"], [[carbon, carbon.method, impl, impl.implemented], 18, "ChainAnimationEx"], [[carbon, carbon.method, impl, impl.adapted], 18, "RebuildBoundingSphereInformation"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's CcpMath::Sphere is represented by core-math sph3; object-shaped center/radius input is accepted at adapter boundaries.")], 18, "SetBoundingSphereInformation"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetControllerVariables"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Geometry resources without multi-LOD support expose their sole browser LOD as index zero.")], 18, "GetLastUsedMeshLod"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetLocatorTransform"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetLocalBoundingBox"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetWorldBoundingBox"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsBoundingBoxReady"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("TriFrustum is supplied structurally by the active engine; both exact and estimated browser frustum methods are supported.")], 18, "EstimatePixelDiameter"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsInFrustum"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphereCenter"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphereRadius"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBoneCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetImpactDamageState"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetImpactAnimation"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetProceduralContainerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartControllers"], [[carbon, carbon.method, impl, impl.adapted], 18, "TransformLocators"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetShapeEllipsoid"]], 0, void 0, _EveEntity));
    }
    /** m_reflectionMode (EntityComponents::ReflectionMode - enum ReflectionMode) [READWRITE, PERSIST, NOTIFY, ENUM] */
    reflectionMode = (_initProto(this), _init_reflectionMode(this, 3));

    /** m_effectChildren (PIEveSpaceObjectChildVector) [READ, PERSIST] */
    effectChildren = (_init_extra_reflectionMode(this), _init_effectChildren(this, []));

    /** m_children (PIEveTransformVector) [READ, PERSIST] */
    children = (_init_extra_effectChildren(this), _init_children(this, []));

    /** m_name (std::string) [READWRITE, NOTIFY, PERSIST] */
    name = (_init_extra_children(this), _init_name(this, ""));

    /** m_mute (bool) [READWRITE, NOTIFY] */
    mute = (_init_extra_name(this), _init_mute(this, false));

    /** m_inheritProperties (EveChildInheritPropertiesPtr) [READWRITE] */
    inheritProperties = (_init_extra_mute(this), _init_inheritProperties(this, null));

    /** m_customMasks (PEveCustomMaskVector) [READ, PERSIST] */
    customMasks = (_init_extra_inheritProperties(this), _init_customMasks(this, []));

    /** m_overlayEffects (PEveMeshOverlayEffectVector) [READ, PERSIST] */
    overlayEffects = (_init_extra_customMasks(this), _init_overlayEffects(this, []));

    /** m_positionDelta (Tr2BindingVector3Ptr) [READ] */
    positionDelta = (_init_extra_overlayEffects(this), _init_positionDelta(this, null));

    /** m_lodLevel (Tr2Lod - enum Tr2Lod) [READ] */
    lodLevel = (_init_extra_positionDelta(this), _init_lodLevel(this, -1));

    /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
    curveSets = (_init_extra_lodLevel(this), _init_curveSets(this, []));

    /** m_isPickable (bool) [READWRITE] */
    isPickable = (_init_extra_curveSets(this), _init_isPickable(this, true));

    /** m_estimatedPixelDiameter (float) [READ] */
    estimatedPixelDiameter = (_init_extra_isPickable(this), _init_estimatedPixelDiameter(this, 0));

    /** m_estimatedPixelDiameterWithChildren (float) [READ] */
    estimatedPixelDiameterWithChildren = (_init_extra_estimatedPixelDiameter(this), _init_estimatedPixelDiameterWithChildren(this, 0));

    /** m_generatedShapeEllipsoidCenter (Vector3) [READ] */
    generatedShapeEllipsoidCenter = (_init_extra_estimatedPixelDiameterWithChildren(this), _init_generatedShapeEllipsoidCenter(this, vec3.create()));

    /** m_generatedShapeEllipsoidRadius (Vector3) [READ] */
    generatedShapeEllipsoidRadius = (_init_extra_generatedShapeEllipsoidCenter(this), _init_generatedShapeEllipsoidRadius(this, vec3.fromValues(-1, -1, -1)));

    /** m_animationUpdater (Tr2GrannyAnimationPtr) [READ] */
    animationUpdater = (_init_extra_generatedShapeEllipsoidRadius(this), _init_animationUpdater(this, null));

    /** m_dna (std::string) [READ, PERSIST] */
    dna = (_init_extra_animationUpdater(this), _init_dna(this, ""));

    /** m_castShadow (bool) [READWRITE, NOTIFY, PERSIST] */
    castShadow = (_init_extra_dna(this), _init_castShadow(this, false));

    /** m_isAnimated (bool) [READWRITE, PERSIST] */
    isAnimated = (_init_extra_castShadow(this), _init_isAnimated(this, false));

    /** m_dynamicBoundingSphereEnabled (bool) [READ, PERSIST] */
    dynamicBoundingSphereEnabled = (_init_extra_isAnimated(this), _init_dynamicBoundingSphereEnabled(this, false));

    /** m_attachments (PIEveSpaceObjectAttachmentVector) [READ, PERSIST] */
    attachments = (_init_extra_dynamicBoundingSphereEnabled(this), _init_attachments(this, []));

    /** m_decals (PEveSpaceObjectDecalVector) [READ, PERSIST] */
    decals = (_init_extra_attachments(this), _init_decals(this, []));

    /** m_lights (PTr2LightVector) [READ, PERSIST, NOTIFY] */
    lights = (_init_extra_decals(this), _init_lights(this, []));

    /** m_externalParameters (PTr2ExternalParameterVector) [READ, PERSIST] */
    externalParameters = (_init_extra_lights(this), _init_externalParameters(this, []));

    /** m_controllers (PITr2ControllerVector) [READ, PERSIST] */
    controllers = (_init_extra_externalParameters(this), _init_controllers(this, []));

    /** m_locators (PEveLocator2Vector) [READ, PERSIST] */
    locators = (_init_extra_controllers(this), _init_locators(this, []));

    /** m_mesh (Tr2MeshBasePtr) [READWRITE, PERSIST] */
    mesh = (_init_extra_locators(this), _init_mesh(this, null));

    /** m_impactOverlay (EveImpactOverlayPtr) [READWRITE, PERSIST] */
    impactOverlay = (_init_extra_mesh(this), _init_impactOverlay(this, null));

    /** m_clipSphereCenter (Vector3) [READWRITE, PERSIST] */
    clipSphereCenter = (_init_extra_impactOverlay(this), _init_clipSphereCenter(this, vec3.create()));

    /** m_clipSphereFactor2 (float) [READWRITE, NOTIFY] */
    clipSphereFactor2 = (_init_extra_clipSphereCenter(this), _init_clipSphereFactor(this, 0));

    /** m_clipSphereFactor (float) [READWRITE, NOTIFY] */
    clipSphereFactor = (_init_extra_clipSphereFactor(this), _init_clipSphereFactor2(this, 0));

    /** m_observers (PTriObserverLocalVector) [READ, PERSIST] */
    observers = (_init_extra_clipSphereFactor2(this), _init_observers(this, []));

    /** m_worldPosition (Vector3) [READ] */
    worldPosition = (_init_extra_observers(this), _init_worldPosition(this, vec3.create()));

    /** m_ballRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
    rotationCurve = (_init_extra_worldPosition(this), _init_rotationCurve(this, null));

    /** m_worldRotation (Quaternion) [READ] */
    worldRotation = (_init_extra_rotationCurve(this), _init_worldRotation(this, quat.create()));

    /** m_modelScale (float) [READWRITE, PERSIST] */
    modelScale = (_init_extra_worldRotation(this), _init_modelScale(this, 1));

    /** m_locatorSets (PEveLocatorSetsVector) [READ, PERSIST] */
    locatorSets = (_init_extra_modelScale(this), _init_locatorSets(this, []));

    /** m_activationStrength (float) [READWRITE] */
    activationStrength = (_init_extra_locatorSets(this), _init_activationStrength(this, 1));

    /** m_albedoColor (Color) [READWRITE] */
    albedoColor = (_init_extra_activationStrength(this), _init_albedoColor(this, vec4.createLinear()));

    /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
    display = (_init_extra_albedoColor(this), _init_display(this, true));

    /** m_update (bool) [READWRITE, PERSIST] */
    update = (_init_extra_display(this), _init_update(this, true));

    /** m_secondaryLightingSphereRadius (float) [READ] */
    secondaryLightingSphereRadius = (_init_extra_update(this), _init_secondaryLightingSphereRadius(this, 0));

    /** m_boundingSphereCenter (Vector3) [READWRITE, PERSIST] */
    boundingSphereCenter = (_init_extra_secondaryLightingSphereRadius(this), _init_boundingSphereCenter(this, vec3.create()));

    /** m_dirtLevel (float) [READWRITE, NOTIFY] */
    dirtLevel = (_init_extra_boundingSphereCenter(this), _init_dirtLevel(this, 0));

    /** m_psData.customData (Vector4) [READWRITE] - script/SOF-driven custom shader data. */
    customShaderData = (_init_extra_dirtLevel(this), _init_customShaderData(this, vec4.create()));

    /** m_lastDamageLocatorHit (int) [READ] */
    lastDamageLocatorHit = (_init_extra_customShaderData(this), _init_lastDamageLocatorHit(this, -1));

    /** m_boundingSphereRadius (float) [READWRITE, PERSIST] */
    boundingSphereRadius = (_init_extra_lastDamageLocatorHit(this), _init_boundingSphereRadius(this, -1));

    /** m_boundingSphereWorldCenter (Vector3) [READ] */
    modelWorldPosition = (_init_extra_boundingSphereRadius(this), _init_modelWorldPosition(this, vec3.create()));

    /** m_modelTranslation (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
    modelTranslationCurve = (_init_extra_modelWorldPosition(this), _init_modelTranslationCurve(this, null));

    /** m_modelRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
    modelRotationCurve = (_init_extra_modelTranslationCurve(this), _init_modelRotationCurve(this, null));

    /** m_shapeEllipsoidCenter (Vector3) [READWRITE, PERSIST] */
    shapeEllipsoidCenter = (_init_extra_modelRotationCurve(this), _init_shapeEllipsoidCenter(this, vec3.create()));

    /** m_shapeEllipsoidRadius (Vector3) [READWRITE, PERSIST] */
    shapeEllipsoidRadius = (_init_extra_shapeEllipsoidCenter(this), _init_shapeEllipsoidRadius(this, vec3.fromValues(-1, -1, -1)));

    /** m_ballPosition (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
    translationCurve = (_init_extra_shapeEllipsoidRadius(this), _init_translationCurve(this, null));
    worldTransform = (_init_extra_translationCurve(this), _init_worldTransform(this, mat4.create()));
    inverseWorldTransform = (_init_extra_worldTransform(this), _init_inverseWorldTransform(this, mat4.create()));
    lastWorldTransform = (_init_extra_inverseWorldTransform(this), _init_lastWorldTransform(this, mat4.create()));
    worldVelocity = (_init_extra_lastWorldTransform(this), _init_worldVelocity(this, vec3.create()));
    audioGeometry = (_init_extra_worldVelocity(this), _init_audioGeometry(this, null));
    isVisible = (_init_extra_audioGeometry(this), _init_isVisible(this, false));
    #controllerVariables = (_init_extra_isVisible(this), new Map([["DirtLevel", 0], ["ActivationStrength", 1], ["ShieldDamage", 1], ["ArmorDamage", 1], ["HullDamage", 1], ["ClipSphereFactor", 0], ["ClipSphereFactor2", 0]]));
    #lastUpdateTransformTime = null;

    // Carbon m_lastCurveUpdateTime: stamped by the sync-side LOD gate; the async
    // side updates curve sets only when it matches the frame time.
    #lastCurveUpdateTime = 0;

    // Carbon m_dynamicBoundingSphere: disabled while w is -1; a future animation
    // updater port publishes skinned bounds here.
    #dynamicBoundingSphere = sph3.set(sph3.create(), 0, 0, 0, -1);

    // Carbon keeps the realized world sphere separate from the authored local
    // sphere. It is refreshed by UpdateWorldBounds after transform changes.
    #boundingSphereWorldRadius = -1;

    // Carbon visibility and mesh LOD state are runtime-only renderer results.
    #isInFrustum = false;
    #isMeshVisible = false;
    #lodLevelWithChildren = Tr2Lod.TR2_LOD_UNSPECIFIED;
    #meshScreenSize = 0;
    #overlayMeshAreaBlocks = [[], []];
    #shadowMeshOpaqueAreas = [];
    #cachedAreaBlocksBuilt = false;

    // Carbon m_localAabbMin/Max: cached so GetLocalBoundingBox can answer before
    // LOD selection assigns a mesh (at worst it lags one frame).
    #localAabbMin = vec3.create();
    #localAabbMax = vec3.create();

    // Carbon m_allowLodSelection: cleared by FreezeHighDetailMesh.
    #allowLodSelection = true;

    // Carbon m_impostorMode: the impostor system that raises it is unported.
    #impostorMode = false;

    /** Alias for the mesh property; reads and writes go straight to mesh. */
    get meshLod() {
      return this.mesh;
    }

    /** Alias for the mesh property; reads and writes go straight to mesh. */
    set meshLod(mesh) {
      this.mesh = mesh ?? null;
    }

    /**
     * Links the authored controllers, pushes authored inherit properties down to
     * the effect children and lights, and derives the impact overlay's damage
     * locator count from the "damage" locator set - which Carbon does at build
     * time - so a field-populated graph reaches the same live state as the
     * authoring path.
     */
    Initialize() {
      for (const controller of this.controllers) {
        if (!controller?.IsLinked?.()) {
          controller?.Link?.(this);
        }
      }
      // Authored inherit properties propagate as part of the lifecycle so a
      // field-populated graph (values import, document hydration) matches the
      // SetInheritProperties authoring path.
      if (this.inheritProperties) {
        this.#PropagateInheritProperties();
      }
      // Carbon derives the impact overlay's damage locator count from the
      // "damage" locator set at build time; deriving it here keeps it out of
      // the authored values while reproducing the same live state.
      if (this.impactOverlay) {
        let damageLocatorCount = 0;
        for (const set of this.locatorSets) {
          if (set?.HasName?.("damage")) damageLocatorCount += set.locators.length;
        }
        this.impactOverlay.SetDamageLocatorCount(damageLocatorCount);
      }
      return true;
    }

    /** Returns the hull mesh, or null when none is attached. */
    GetMesh() {
      return this.mesh;
    }

    /**
     * Replaces the hull mesh; the cached area blocks are only rebuilt on the next
     * batch call.
     */
    SetMesh(mesh) {
      this.mesh = mesh ?? null;
    }

    /**
     * Appends a controller, links it to this object when it is not already linked,
     * and replays the current controller variables onto it.
     */
    AddController(controller) {
      this.controllers.push(controller);
      if (!controller?.IsLinked?.()) {
        controller?.Link?.(this);
      }
      _EveSpaceObject.#ApplyControllerVariables(controller, this.#controllerVariables, "SetVariable");
      return controller;
    }

    /**
     * Appends a placement observer, which is repositioned from the observer
     * transform on every synchronous update; the observer is returned for
     * chaining.
     */
    AddObserver(observer) {
      this.observers.push(observer);
      return observer;
    }

    /**
     * Sets the colour set that effect children and lights inherit, creating the
     * inherit-properties holder on first use, and pushes it to the existing
     * children and lights.
     */
    SetInheritProperties(colorSet) {
      if (!this.inheritProperties) {
        this.inheritProperties = new _EveChildInheritPrope();
      }
      this.inheritProperties.SetProperties(colorSet);
      this.#PropagateInheritProperties();
    }

    /** Pushes the current inherited properties to every effect child and light. */
    #PropagateInheritProperties() {
      const properties = this.inheritProperties.GetProperties();
      for (const child of this.effectChildren) {
        child?.SetInheritProperties?.(properties);
      }
      for (const light of this.lights) {
        light?.SetInheritProperties?.(properties);
      }
    }

    /**
     * Returns the first effect child with the given name, or null when none
     * matches.
     */
    GetEffectChildByName(name) {
      const target = String(name ?? "");
      for (const child of this.effectChildren) {
        if ((child?.GetName?.() ?? child?.name ?? "") === target) {
          return child;
        }
      }
      return null;
    }

    /**
     * Appends an effect child, first giving it the hull's inherited properties and
     * then replaying the current controller variables onto it, so a late addition
     * starts in the same state as the rest.
     */
    AddToEffectChildrenList(child) {
      if (this.inheritProperties) {
        child?.SetInheritProperties?.(this.inheritProperties.GetProperties());
      }
      this.effectChildren.push(child);
      _EveSpaceObject.#ApplyControllerVariables(child, this.#controllerVariables, "SetControllerVariable");
      return child;
    }

    /** Appends a light, first giving it the hull's inherited properties. */
    AddLight(light) {
      if (this.inheritProperties) {
        light?.SetInheritProperties?.(this.inheritProperties.GetProperties());
      }
      this.lights.push(light);
    }

    /**
     * Drops every light from the hull; component registration is not revisited
     * here.
     */
    ClearLights() {
      this.lights.length = 0;
    }

    /**
     * Removes an effect child, returning false when it is not attached to this
     * hull.
     */
    RemoveFromEffectChildrenList(child) {
      const index = this.effectChildren.indexOf(child);
      if (index === -1) {
        return false;
      }
      this.effectChildren.splice(index, 1);
      return true;
    }

    /**
     * Sets the curve that rotates the model within the hull's ball rotation, or
     * clears it when passed nothing.
     */
    SetModelRotationCurve(curve) {
      this.modelRotationCurve = curve ?? null;
    }

    /** Returns the model rotation curve, or null when none is set. */
    GetModelRotationCurve() {
      return this.modelRotationCurve;
    }

    /**
     * Sets the curve that offsets the model within the hull's ball position, or
     * clears it when passed nothing.
     */
    SetModelTranslationCurve(curve) {
      this.modelTranslationCurve = curve ?? null;
    }

    /** Returns the model translation curve, or null when none is set. */
    GetModelTranslationCurve() {
      return this.modelTranslationCurve;
    }

    /**
     * Rebuilds the hull world transform for a frame from the ball position and rotation curves plus the optional model translation and rotation curves, applies modelScale as a uniform scale, then refreshes the inverse transform and the world bounds; the previous world transform is kept for motion vectors and the world velocity comes from the position curve's derivative.
     * @param {number} time Frame time; repeating the previous call's time is a no-op.
     * @returns {boolean} False when the transform had already been built for this time.
     */
    UpdateWorldTransform(time) {
      const nextTime = Number(time) || 0;
      if (this.#lastUpdateTransformTime === nextTime) {
        return false;
      }
      this.#lastUpdateTransformTime = nextTime;
      mat4.copy(this.lastWorldTransform, this.worldTransform);
      _EveSpaceObject.#UpdateCurve(this.translationCurve, nextTime, this.worldPosition, _EveSpaceObject.#zero);
      if (this.translationCurve?.GetValueDotAt) {
        this.translationCurve.GetValueDotAt(nextTime, this.worldVelocity);
      } else {
        vec3.set(this.worldVelocity, 0, 0, 0);
      }
      _EveSpaceObject.#UpdateCurve(this.rotationCurve, nextTime, this.worldRotation, _EveSpaceObject.#identityRotation);
      const rotation = quat.clone(this.worldRotation);
      if (this.modelRotationCurve) {
        const modelRotation = quat.create();
        _EveSpaceObject.#UpdateCurve(this.modelRotationCurve, nextTime, modelRotation, _EveSpaceObject.#identityRotation);
        // Carbon (row-vector): rotation = modelRotation * m_worldRotation - model first.
        quat.multiply(rotation, rotation, modelRotation);
      }
      mat4.fromQuat(this.worldTransform, rotation);
      if (this.modelScale !== 1) {
        // Carbon (row-vector): m_worldTransform * scaleMatrix - scale LAST
        // (cpp:2711-2716). gl mat4.scale builds W*S = scale FIRST; equivalent
        // ONLY because modelScale is strictly uniform (a uniform scale commutes
        // with the pure rotation here). If modelScale ever becomes a vec3 this
        // must become mat4.multiply(w, S, w) per the swap rule.
        mat4.scale(this.worldTransform, this.worldTransform, [this.modelScale, this.modelScale, this.modelScale]);
      }
      if (this.modelTranslationCurve) {
        const modelTranslation = vec3.create();
        _EveSpaceObject.#UpdateCurve(this.modelTranslationCurve, nextTime, modelTranslation, _EveSpaceObject.#zero);
        vec3.transformMat4(modelTranslation, modelTranslation, this.worldTransform);
        this.worldTransform[12] = this.worldPosition[0] + modelTranslation[0];
        this.worldTransform[13] = this.worldPosition[1] + modelTranslation[1];
        this.worldTransform[14] = this.worldPosition[2] + modelTranslation[2];
      } else {
        this.worldTransform[12] = this.worldPosition[0];
        this.worldTransform[13] = this.worldPosition[1];
        this.worldTransform[14] = this.worldPosition[2];
      }
      if (!mat4.invert(this.inverseWorldTransform, this.worldTransform)) {
        mat4.identity(this.inverseWorldTransform);
      }
      this.UpdateWorldBounds();
      return true;
    }

    /**
     * Refreshes Carbon's realized world-space sphere from the dynamic skinned
     * sphere when available, otherwise from the authored local sphere.
     */
    UpdateWorldBounds() {
      const updater = this.animationUpdater;
      if (this.dynamicBoundingSphereEnabled && updater?.IsInitialized?.()) {
        updater.GetDynamicBounds?.(this.#dynamicBoundingSphere, this.#localAabbMin, this.#localAabbMax);
        if (this.#dynamicBoundingSphere[3] > 0) {
          vec3.transformMat4(this.modelWorldPosition, this.#dynamicBoundingSphere, this.worldTransform);
          this.#boundingSphereWorldRadius = this.modelScale * this.#dynamicBoundingSphere[3];
          return true;
        }
      }
      if (this.boundingSphereRadius > 0) {
        vec3.transformMat4(this.modelWorldPosition, this.boundingSphereCenter, this.worldTransform);
        this.#boundingSphereWorldRadius = this.modelScale * this.boundingSphereRadius;
        return true;
      }
      return false;
    }

    /**
     * Refreshes the world transform, then - when the update flag is on - places the observers, stamps the LOD-gated curve clock while advancing the overlay effects, runs the effect children's synchronous pass with the current placement, and updates the impact overlay; the overlay effects receive the context time as both clocks, as Carbon does.
     * @returns {boolean} False when the update flag is off; the world transform is refreshed either way.
     */
    UpdateSyncronous(updateContext = null) {
      const time = _EveSpaceObject.#GetContextValue(updateContext, "GetTime", "currentTime", "time");
      this.UpdateWorldTransform(time);
      if (!this.update) {
        return false;
      }
      const observerTransform = this.GetObserverTransform();
      for (const observer of this.observers) {
        observer?.Update?.(observerTransform);
      }

      // LOD-gated curve/overlay stamp (Carbon EveSpaceObject2::UpdateSyncronous:
      // ShouldUpdate(m_lodLevelWithChildren, time - m_lastCurveUpdateTime) -
      // adapted to lodLevel, m_lodLevelWithChildren is unported). Overlay effects
      // receive the context time as BOTH clocks, as Carbon does; the async pass
      // updates curve sets only on frames stamped here.
      if (EveLODHelper.ShouldUpdate(this.lodLevel, time - this.#lastCurveUpdateTime)) {
        this.#lastCurveUpdateTime = time;
        for (const overlay of this.overlayEffects) {
          overlay?.Update?.(time, time);
        }
      }
      if (this.effectChildren.length) {
        const params = new _EveChildUpdateParams();
        params.spaceObjectParent = this;
        params.ownerMaxSpeed = Number(this.maxSpeed) || 0;
        params.activationStrength = this.activationStrength;
        mat4.copy(params.localToWorldTransform, this.GetLocalToWorldTransform());
        for (const child of this.effectChildren) {
          params.isVisible = this.display && (this.DisplayChildren() || !!child?.IsAlwaysOn?.());
          child?.UpdateSyncronous?.(updateContext, params);
        }
      }
      this.impactOverlay?.UpdateSyncronous?.(updateContext, this);
      return true;
    }

    /**
     * Runs the controllers at a frequency derived from the hull's estimated pixel diameter against the context's high-detail threshold, advances the object curve sets only on frames the synchronous LOD gate stamped, then updates the transform children, the effect children and the impact overlay.
     * @returns {number} The controller update frequency in 0..1, which is also handed to the effect children; 0 when the hull is not visible or the update flag is off.
     */
    UpdateAsyncronous(updateContext = null) {
      if (!this.update) {
        return 0;
      }
      const threshold = _EveSpaceObject.#GetContextValue(updateContext, "GetHighDetailThreshold", "highDetailThreshold");
      const frequency = this.isVisible && threshold > 0 ? Math.min(1, this.estimatedPixelDiameter / threshold) : 0;
      for (const controller of this.controllers) {
        controller?.Update?.(frequency);
      }

      // Object-level curve sets update only on frames the sync-side LOD gate
      // stamped, receiving the context time as BOTH realTime and simTime
      // (Carbon EveSpaceObject2::UpdateAsyncronous: if (m_lastCurveUpdateTime ==
      // time) (*it)->Update(time, time)).
      const time = _EveSpaceObject.#GetContextValue(updateContext, "GetTime", "currentTime", "time");
      if (this.#lastCurveUpdateTime === time) {
        for (const curveSet of this.curveSets) {
          curveSet?.Update?.(time, time);
        }
      }
      for (const child of this.children) {
        child?.Update?.(updateContext);
      }
      if (this.effectChildren.length) {
        const params = new _EveChildUpdateParams();
        params.spaceObjectParent = this;
        params.ownerMaxSpeed = Number(this.maxSpeed) || 0;
        params.activationStrength = this.activationStrength;
        params.controllerUpdateFrequency = frequency;
        mat4.copy(params.localToWorldTransform, this.GetLocalToWorldTransform());
        for (const child of this.effectChildren) {
          params.isVisible = this.display && (this.DisplayChildren() || !!child?.IsAlwaysOn?.());
          child?.UpdateAsyncronous?.(updateContext, params);
        }
      }
      this.impactOverlay?.UpdateAsyncronous?.(updateContext, this);
      return frequency;
    }

    /**
     * Updates Carbon's visibility, pixel-size, and mesh-LOD state, then forwards
     * visibility to the explicitly owned visual branches.
     */
    UpdateVisibility(updateContext = null, _parentTransform = _EveSpaceObject.#identityTransform) {
      this.isVisible = false;
      this.#isMeshVisible = false;
      this.#isInFrustum = false;
      if (!this.display) {
        return false;
      }
      this.UpdateWorldBounds();
      this.lodLevel = Tr2Lod.TR2_LOD_LOW;
      this.#lodLevelWithChildren = Tr2Lod.TR2_LOD_LOW;
      this.#impostorMode = false;
      const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
      const lowThreshold = _EveSpaceObject.#GetContextValue(updateContext, "GetLowDetailThreshold", "lowDetailThreshold");
      const mediumThreshold = _EveSpaceObject.#GetContextValue(updateContext, "GetMediumDetailThreshold", "mediumDetailThreshold");
      const visibilityThreshold = _EveSpaceObject.#GetContextValue(updateContext, "GetVisibilityThreshold", "visibilityThreshold");
      const lodFactor = _EveSpaceObject.#GetContextValue(updateContext, "GetLodFactor", "lodFactor") || 1;
      if (this.boundingSphereRadius > 0 && this.#boundingSphereWorldRadius > 0) {
        _EveSpaceObject.#SetSphere(_EveSpaceObject.#worldSphere, this.modelWorldPosition, this.#boundingSphereWorldRadius);
        if (frustum?.IsSphereVisible?.(_EveSpaceObject.#worldSphere) !== false) {
          this.EstimatePixelDiameter(frustum);
          this.#isMeshVisible = true;
        }
      }

      // Bones so a bone-parented attachment's bounds follow its bone, which is
      // what drives the per-bone AABB union (Carbon BoundingBox.cpp:815-833).
      const {
        bones,
        boneCount
      } = getBoneList(this.animationUpdater);
      for (const attachment of this.attachments) {
        if (attachment?.UpdateVisibility?.(updateContext, this.worldTransform, bones, boneCount)) {
          this.#isMeshVisible = true;
          this.isVisible = true;
        }
      }
      if (this.DisplayChildren()) {
        for (const child of this.children) {
          child?.UpdateVisibility?.(updateContext, this.worldTransform);
        }
      }
      if (this.GetBoundingSphere(_EveSpaceObject.#worldSphere, 1)) {
        this.#isInFrustum = frustum?.IsSphereVisible?.(_EveSpaceObject.#worldSphere) !== false;
        this.estimatedPixelDiameterWithChildren = _EveSpaceObject.#GetPixelSize(frustum, _EveSpaceObject.#worldSphere);
        if (this.#isInFrustum && this.estimatedPixelDiameterWithChildren >= visibilityThreshold) {
          this.isVisible = true;
        }
      }
      if (this.isVisible) {
        if (this.estimatedPixelDiameter > mediumThreshold) this.lodLevel = Tr2Lod.TR2_LOD_HIGH;else if (this.estimatedPixelDiameter > lowThreshold) this.lodLevel = Tr2Lod.TR2_LOD_MEDIUM;
        if (this.estimatedPixelDiameterWithChildren > mediumThreshold) this.#lodLevelWithChildren = Tr2Lod.TR2_LOD_HIGH;else if (this.estimatedPixelDiameterWithChildren > lowThreshold) this.#lodLevelWithChildren = Tr2Lod.TR2_LOD_MEDIUM;else this.#lodLevelWithChildren = Tr2Lod.TR2_LOD_LOW;
      }
      for (const observer of this.observers) {
        const target = observer?.GetObserver?.() ?? observer?.observer;
        target?.SetVisibility?.(this.isVisible);
      }
      for (const child of this.effectChildren) {
        child?.UpdateVisibility?.(updateContext, this.worldTransform, this.#lodLevelWithChildren);
      }
      if (this.mesh && this.#boundingSphereWorldRadius > 0) {
        _EveSpaceObject.#SetSphere(_EveSpaceObject.#worldSphere, this.modelWorldPosition, this.#boundingSphereWorldRadius);
        this.#meshScreenSize = _EveSpaceObject.#GetEstimatedPixelSize(frustum, _EveSpaceObject.#worldSphere) * lodFactor;
        if (!this.#allowLodSelection) this.#meshScreenSize = Infinity;
        this.mesh.UseWithScreenSize?.(this.#meshScreenSize, this.#boundingSphereWorldRadius);
      }
      return this.isVisible;
    }

    /** Collects the hull and explicitly owned Carbon child/decal renderables. */
    GetRenderables(out = []) {
      if (!this.display || !this.isVisible) return out;
      if (this.#allowLodSelection && this.#isMeshVisible) {
        this.mesh?.GetBoundingBox?.(this.#localAabbMin, this.#localAabbMax);
      }
      if (this.mesh && this.#isMeshVisible && this.mesh.IsLoading?.() !== true) {
        out.push(this);
      }
      if (this.DisplayChildren()) {
        for (const child of this.children) child?.GetRenderables?.(out);
      }
      for (const child of this.effectChildren) {
        if (this.DisplayChildren() || child?.IsAlwaysOn?.()) child?.GetRenderables?.(out);
      }
      if (this.mesh && this.#isMeshVisible) {
        const geometryResource = this.mesh.GetGeometryResource?.();
        if (geometryResource) {
          for (const decal of this.decals) {
            decal?.GetRenderables?.(out, null, geometryResource, this.#meshScreenSize);
          }
        }
      }
      return out;
    }

    /** Carbon ITr2Renderable contract (EveSpaceObject2.cpp:1097-1140): activated
     * attachments recurse, the impact overlay contributes, the hull mesh delegates
     * per batch type, and TRANSPARENT routes through the distance-sorted area
     * path. GetBatchesFromOverlayVector (precomputed overlay area blocks) is
     * deferred with the overlay realization work. */
    GetBatches(batches, batchType, perObjectData, reason, renderContext = null) {
      if (!this.mesh) return false;
      if (this.mesh.display === false) return false;

      // Returns whether any batch was committed (JS addition; Carbon returns
      // void). The O(1) accumulator count makes the delta check free.
      const committedBefore = batches.GetBatchCount?.() ?? 0;
      if (this.activationStrength !== 0) {
        for (const attachment of this.attachments) {
          attachment?.GetBatches?.(batches, batchType, perObjectData, reason);
        }
      }
      this.impactOverlay?.GetBatches?.(batches, batchType, perObjectData, this.#meshScreenSize);
      const areas = this.mesh.GetAreas?.(batchType);
      if (areas) {
        if (batchType !== TriBatchType.TRIBATCHTYPE_TRANSPARENT) {
          this.mesh.GetBatches(batches, areas, perObjectData);
        } else {
          this.#GetSortedTransparentBatches(areas, batches, perObjectData, renderContext);
        }
      }

      // add overlay effect batches (Carbon calls this for every batch type)
      this.GetBatchesFromOverlayVector(batches, perObjectData, batchType, this.mesh);
      return (batches.GetBatchCount?.() ?? 0) > committedBefore;
    }

    // Carbon GetSortedBatchesFromMeshAreaVector (EveSpaceObject2.cpp:57-121):
    // object-space area bounding-box centers -> world space -> squared distance to
    // the view position, sorted back-to-front (descending), committed in that
    // order into the order-preserving TRANSPARENT accumulator. Bounding boxes come
    // from the geometry resource when it exposes them; a failed lookup keeps
    // Carbon's origin-center fallback.

    /**
     * Commits the mesh's transparent areas back-to-front, ordering them by the
     * squared distance from the view position to each area's world-space
     * bounding-box center and falling back to the object origin when the geometry
     * resource cannot supply a box.
     */
    #GetSortedTransparentBatches(areas, batches, perObjectData, renderContext) {
      const geometry = this.mesh.GetGeometryResource?.() ?? null;
      const viewPosition = renderContext?.GetViewPosition?.();
      const meshIndex = this.mesh.meshIndex ?? 0;
      const sorted = [];
      for (const area of areas) {
        if (!area || area.GetDisplay?.() === false) continue;
        vec3.set(TRANSPARENT_CENTER, 0, 0, 0);
        if (geometry?.GetAreaBoundingBox?.(meshIndex, area.GetIndex(), TRANSPARENT_AABB_MIN, TRANSPARENT_AABB_MAX)) {
          vec3.add(TRANSPARENT_CENTER, TRANSPARENT_AABB_MIN, TRANSPARENT_AABB_MAX);
          vec3.scale(TRANSPARENT_CENTER, TRANSPARENT_CENTER, 0.5);
        }
        vec3.transformMat4(TRANSPARENT_CENTER, TRANSPARENT_CENTER, this.worldTransform);
        const dx = (viewPosition?.[0] ?? 0) - TRANSPARENT_CENTER[0];
        const dy = (viewPosition?.[1] ?? 0) - TRANSPARENT_CENTER[1];
        const dz = (viewPosition?.[2] ?? 0) - TRANSPARENT_CENTER[2];
        sorted.push({
          area,
          distance: dx * dx + dy * dy + dz * dz
        });
      }
      sorted.sort((a, b) => b.distance - a.distance);
      for (const entry of sorted) {
        const area = entry.area;
        if (!area.GetMaterialInterface?.()) continue;
        const batch = this.mesh.CreateGeometryBatch(geometry, area, perObjectData);
        if (batch) batches.Commit(batch);
      }
    }

    /** Rebuilds the cached overlay/shadow area-block lists from the current mesh
     * (Carbon RebuildCachedData, EveSpaceObject2.cpp:2077-2097, triggered there by
     * the geometry-resource load callback). TYPE_ALL = shadow-casting OPAQUE +
     * TRANSPARENT + DECAL areas; TYPE_OPAQUEONLY = shadow-casting OPAQUE; the
     * shadow list groups OPAQUE areas by shared material. All coalesced. */
    RebuildCachedData() {
      this.ReleaseCachedData();
      if (!this.mesh) return;
      const all = this.#overlayMeshAreaBlocks[OVERLAY_TYPE_ALL];
      this.mesh.CollectAreaBlocks(all, TriBatchType.TRIBATCHTYPE_OPAQUE);
      this.mesh.CollectAreaBlocks(all, TriBatchType.TRIBATCHTYPE_TRANSPARENT);
      this.mesh.CollectAreaBlocks(all, TriBatchType.TRIBATCHTYPE_DECAL);
      this.mesh.CollectAreaBlocks(this.#overlayMeshAreaBlocks[OVERLAY_TYPE_OPAQUEONLY], TriBatchType.TRIBATCHTYPE_OPAQUE);
      for (const blocks of this.#overlayMeshAreaBlocks) {
        TriRenderBatchAreaBlock.Optimize(blocks);
      }
      this.mesh.CollectAreaBlocksWithSharedMaterials(this.#shadowMeshOpaqueAreas, TriBatchType.TRIBATCHTYPE_OPAQUE);
      for (const collector of this.#shadowMeshOpaqueAreas) {
        collector.Optimize();
      }
      this.#cachedAreaBlocksBuilt = true;
    }

    /**
     * Drops the cached overlay and shadow area-block lists so the next batch call
     * rebuilds them from the current mesh.
     */
    ReleaseCachedData() {
      for (const blocks of this.#overlayMeshAreaBlocks) {
        blocks.length = 0;
      }
      this.#shadowMeshOpaqueAreas.length = 0;
      this.#cachedAreaBlocksBuilt = false;
    }

    /**
     * Rebuilds the cached area blocks on first use when a mesh is attached; Carbon
     * instead rebuilds them from the geometry-resource load callback.
     */
    #EnsureCachedAreaBlocks() {
      if (!this.#cachedAreaBlocksBuilt && this.mesh) this.RebuildCachedData();
    }

    /** Carbon GetShadowBatches (EveSpaceObject2.cpp:1143-1184): one batch per
     * cached shared-material OPAQUE area block, using the area's own material.
     * Carbon bakes realized-LOD draw args; the GPU-free port defers them to the
     * engine via the geometry source descriptor, so shadowPixelSize travels unused
     * until engine LOD selection consumes it. */
    GetShadowBatches(batches, perObjectData, _shadowPixelSize) {
      if (!this.mesh || this.mesh.display === false) return false;
      this.#EnsureCachedAreaBlocks();
      const geometry = this.mesh.GetGeometryResource?.() ?? null;
      const meshIndex = this.mesh.meshIndex ?? 0;
      let committed = false;
      for (const collector of this.#shadowMeshOpaqueAreas) {
        const material = collector.shaderMaterial;
        if (!material) continue;
        for (const block of collector.areaBlockVector) {
          const batch = new Tr2RenderBatch();
          batch.SetMaterial(material);
          if (!batch.IsValid()) continue;
          batch.SetGeometrySource(geometry, meshIndex, block.startIndex, block.count, false);
          batch.SetPerObjectData(perObjectData ?? null);
          committed = batches.Commit(batch) || committed;
        }
      }
      return committed;
    }

    /** Carbon GetBatchesFromOverlayVector (EveSpaceObject2.cpp:1199-1285): the
     * impact overlay's armor-damage shader draws over the TYPE_ALL blocks at
     * maximum priority; each displayed overlay effect draws its per-batch-type
     * effects over its overlay-type blocks (OPAQUE -> TYPE_OPAQUEONLY, everything
     * else -> TYPE_ALL). */
    GetBatchesFromOverlayVector(batches, perObjectData, batchType, mesh) {
      const impactEffect = this.impactOverlay?.GetArmorDamageShader?.(batchType) ?? null;
      if (!impactEffect && !this.overlayEffects.length) return false;
      if (!mesh) return false;
      this.#EnsureCachedAreaBlocks();
      const committedBefore = batches.GetBatchCount?.() ?? 0;
      const geometry = mesh.GetGeometryResource?.() ?? null;
      const meshIndex = mesh.meshIndex ?? 0;
      if (impactEffect) {
        for (const block of this.#overlayMeshAreaBlocks[OVERLAY_TYPE_ALL]) {
          this.#CommitBlockBatch(batches, impactEffect, geometry, meshIndex, block, perObjectData, 0xFFFFFFFF);
        }
      }
      for (const overlay of this.overlayEffects) {
        const effects = this.#OverlayEffectsFor(overlay, batchType);
        if (!effects) continue;
        const overlayType = overlay.GetType(batchType);
        const blocks = this.#overlayMeshAreaBlocks[overlayType];
        for (const effect of effects) {
          for (const block of blocks) {
            this.#CommitBlockBatch(batches, effect, geometry, meshIndex, block, perObjectData, 0);
          }
        }
      }
      return (batches.GetBatchCount?.() ?? 0) > committedBefore;
    }

    /**
     * Builds and commits one render batch drawing a single cached area block with
     * the given material and optional priority, skipping the block when the
     * material yields no valid batch.
     */
    #CommitBlockBatch(batches, material, geometry, meshIndex, block, perObjectData, priority) {
      const batch = new Tr2RenderBatch();
      batch.SetMaterial(material);
      if (!batch.IsValid()) return;
      if (priority !== 0) batch.SetPriority(priority);
      batch.SetGeometrySource(geometry, meshIndex, block.startIndex, block.count, false);
      batch.SetPerObjectData(perObjectData ?? null);
      batches.Commit(batch);
    }

    // EveMeshOverlayEffect::GetEffects (display-gated, per batch type).

    /**
     * Returns an overlay effect's display-gated effect list for a batch type, or
     * null when it contributes none.
     */
    #OverlayEffectsFor(overlay, batchType) {
      return overlay?.GetEffects?.(batchType) ?? null;
    }

    /**
     * Reports whether the hull mesh has transparent areas or any overlay effect
     * does, which tells the renderer to route this object through the sorted
     * transparent pass.
     */
    HasTransparentBatches() {
      if (!this.mesh) return false;
      if ((this.mesh.GetAreas?.(TriBatchType.TRIBATCHTYPE_TRANSPARENT)?.length ?? 0) > 0) return true;
      for (const overlay of this.overlayEffects) {
        if (overlay?.HasTransparentArea?.()) return true;
      }
      return false;
    }

    /**
     * Returns the distance from the render context's view position to the hull
     * world translation, used to order transparent renderables back-to-front.
     */
    GetSortValue(renderContext = null) {
      const viewPosition = renderContext?.GetViewPosition?.();
      const x = (viewPosition?.[0] ?? 0) - this.worldTransform[12];
      const y = (viewPosition?.[1] ?? 0) - this.worldTransform[13];
      const z = (viewPosition?.[2] ?? 0) - this.worldTransform[14];
      return Math.hypot(x, y, z);
    }

    /** Carbon allocates Tr2PerObjectDataWithPersistentBuffers<EveSpaceObject2>,
     * which calls back into the object at upload time; the GPU-free record carries
     * the same live object reference for the engine serializer (the space-object
     * Main profile) to pull current values at realization. */
    GetPerObjectData(accumulator = null) {
      const data = typeof accumulator?.Allocate === "function" ? accumulator.Allocate(Tr2PerObjectData) : new Tr2PerObjectData();
      data.object = this;
      return data;
    }

    /** Carbon forwards the shadow pass to the same per-object record. */
    GetShadowPerObjectData(accumulator = null) {
      return this.GetPerObjectData(accumulator);
    }

    /** Carbon EveSpaceObject2::GetLights (cpp:3536-3555): display gate only
     * (no lights-empty early-out, unlike EveChildMesh), then per light
     * AddLight(manager, worldTransform, 1, bones, boneCount) FOLLOWED by
     * SetBrightnessMultiplier(m_activationStrength) - the order is contract:
     * the submission uses the multiplier stamped on the PREVIOUS pass (first
     * pass uses the Tr2Light default 1) - one frame of activation-strength
     * lag, preserved verbatim. cpp:3554's dead `DisplayChildren()` local is
     * not ported. */
    GetLights(lightManager) {
      if (!this.display) {
        return;
      }

      // cpp:3545-3547 - Tr2GrannyAnimationUtils::GetBoneList, so a bone-parented
      // light is placed by its bone rather than by the object transform alone.
      const {
        bones,
        boneCount
      } = getBoneList(this.animationUpdater);
      for (const light of this.lights) {
        light?.AddLight?.(lightManager, this.worldTransform, 1, bones, boneCount);
        light?.SetBrightnessMultiplier?.(this.activationStrength);
      }
    }

    /** Carbon EveSpaceObject2::IsCastingShadow (cpp:1940-1990) culls against the
     * camera/shadow frustums; awaits the TriFrustum port (visibility pass).
     * Presence satisfies the "ShadowCaster" duck contract. */
    IsCastingShadow(..._args) {
      throw new Error("EveSpaceObject2.IsCastingShadow is not implemented in CarbonEngineJS.");
    }

    /** Carbon EveSpaceObject2::RegisterComponents (cpp:3568-3609): registers its
     * own components and its children with the scene registration container "so
     * we don't have to traverse the tree every frame". RegisterAudioGeometry
     * (cpp:3572-3575) is audio-engine-owned and unported. Gate m_display. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.display) {
        if (this.lights.length) {
          registry.RegisterComponent(EveComponentType.LightOwner, this);
        }
        if (ShouldReflect(this.reflectionMode)) {
          registry.RegisterComponent(EveComponentType.ReflectionRenderable, this);
        }
        if (this.castShadow) {
          registry.RegisterComponent(EveComponentType.ShadowCaster, this);
        }
        for (const child of this.effectChildren) {
          child?.Register?.(registry);
        }
        for (const attachment of this.attachments) {
          attachment?.Register?.(registry);
        }
      }
    }

    /** Carbon EveSpaceObject2::UnRegisterComponents (cpp:3615-3638): forwards
     * the un-registration to the children only - EveEntity::UnRegister already
     * called UnRegisterAllComponents(this) first (EveEntity.cpp:90) - and does
     * not re-check display. UnregisterAudioGeometry (cpp:3617) is
     * audio-engine-owned and unported. */
    UnRegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        for (const child of this.effectChildren) {
          child?.UnRegister?.(registry);
        }
        for (const attachment of this.attachments) {
          attachment?.UnRegister?.(registry);
        }
      }
    }

    /**
     * Reports whether children and effect children should be shown; always true on
     * the base hull, subclasses gate it on activation state.
     */
    DisplayChildren() {
      return true;
    }

    /**
     * Returns the transform placement observers are attached to - the live hull
     * world transform.
     */
    GetObserverTransform() {
      return this.worldTransform;
    }

    /**
     * Returns the transform effect children are placed against - the live hull
     * world transform, not a copy.
     */
    GetLocalToWorldTransform() {
      return this.worldTransform;
    }

    /** Carbon's non-updating model-center query. */
    GetModelCenterWorldPosition(out) {
      vec3.transformMat4(out, this.boundingSphereCenter, this.worldTransform);
    }

    /**
     * Returns the live curve-sampled ball position; the array is the object's own
     * field and is rewritten by the next transform update.
     */
    GetWorldPosition() {
      return this.worldPosition;
    }

    /**
     * Returns the live curve-sampled ball rotation, which excludes the model
     * rotation curve; the quaternion is the object's own field and is rewritten by
     * the next transform update.
     */
    GetWorldRotation() {
      return this.worldRotation;
    }

    /**
     * Finds a sound emitter by observer name on this hull and then recursively in
     * the effect children, returning null when no emitter carries the name.
     */
    FindSoundEmitter(name) {
      const target = String(name ?? "");
      for (const observer of this.observers) {
        if (observer?.name === target) {
          return typeof observer.GetObserver === "function" ? observer.GetObserver() : observer.observer ?? null;
        }
      }
      for (const child of this.effectChildren) {
        const emitter = child?.FindSoundEmitter?.(target);
        if (emitter) {
          return emitter;
        }
      }
      return null;
    }

    /**
     * Sets the mute flag and pushes it to every effect child and placement
     * observer.
     */
    SetMute(mute) {
      this.mute = !!mute;
      for (const child of this.effectChildren) {
        child?.SetMute?.(this.mute);
      }
      for (const observer of this.observers) {
        observer?.SetMute?.(this.mute);
      }
    }

    /**
     * Plays an animation with explicit loop, start, and speed settings
     * (Carbon PlayAnimationEx, MAP_METHOD_AND_WRAP_OPTIONAL_ARGS).
     */
    PlayAnimationEx(animName, loopCount, start, speed, clearWhenDone = true) {
      this.#PlayAnimation(animName, true, loopCount, start, speed, clearWhenDone);
    }

    /**
     * Calculates the skinned bounding box under a transform (CMF path: the
     * local box corners transformed with perspective divide). The granny path
     * is unported. Returns an inverted-empty { min, max } box when dynamic
     * bounds are disabled, as Carbon's BoundingBoxInitialize does.
     */
    CalculateSkinnedBoundingBoxFromTransform(transform) {
      const min = vec3.fromValues(Infinity, Infinity, Infinity);
      const max = vec3.fromValues(-Infinity, -Infinity, -Infinity);
      if (this.dynamicBoundingSphereEnabled && this.mesh?.GetGeometryResource?.()?.IsUsingCMF?.()) {
        const {
          min: localMin,
          max: localMax
        } = this.GetLocalBoundingBox();
        const corner = vec3.create();
        for (let index = 0; index < 8; index++) {
          vec3.set(corner, index & 1 ? localMax[0] : localMin[0], index & 2 ? localMax[1] : localMin[1], index & 4 ? localMax[2] : localMin[2]);
          vec3.transformMat4(corner, corner, transform);
          vec3.min(min, min, corner);
          vec3.max(max, max, corner);
        }
      }
      return {
        min,
        max
      };
    }

    /**
     * Calculates the skinned bounding sphere (CMF path: the current bounding
     * sphere; granny path unported). Returns (0,0,0,-1) when dynamic bounds
     * are disabled.
     */
    CalculateSkinnedBoundingSphere(out = vec4.create()) {
      if (this.dynamicBoundingSphereEnabled && this.mesh?.GetGeometryResource?.()?.IsUsingCMF?.()) {
        const center = this.GetBoundingSphereCenter();
        return vec4.set(out, center[0], center[1], center[2], this.GetBoundingSphereRadius());
      }
      return vec4.set(out, 0, 0, 0, -1);
    }

    /**
     * Clears all impact and damage effects on the impact overlay.
     */
    ClearImpactDamage() {
      this.impactOverlay?.Clear?.();
    }

    /**
     * Clears all animations on the animation updater.
     */
    ClearAnimations() {
      this.animationUpdater?.ClearAnimations?.();
    }

    /**
     * Creates an impact facing a position on the closest facing damage locator.
     */
    CreateImpactFromPosition(position, direction, lifeTime, size) {
      const closestDamageLocator = this.#GetClosestLocatorIndex(position, _EveSpaceObject.#damageLocatorSetName);
      return this.CreateImpact(closestDamageLocator, direction, lifeTime, size);
    }

    /**
     * Creates an impact effect on a damage locator through the impact overlay.
     */
    CreateImpact(damageLocatorIndex, direction, lifeTime, size) {
      if (this.impactOverlay) {
        return this.impactOverlay.CreateImpact?.(damageLocatorIndex, direction, lifeTime, size, 1, this.lodLevel, this) ?? -1;
      }
      return -1;
    }

    /**
     * Ends the current animation on the animation updater.
     */
    EndAnimation() {
      this.animationUpdater?.EndAnimation?.();
    }

    /**
     * Freezes LOD selection at the current mesh and marks decal geometry
     * frozen.
     */
    FreezeHighDetailMesh() {
      this.#allowLodSelection = false;
      for (const decal of this.decals) {
        decal?.SetHighDetailDecalState?.(true);
      }
    }

    /**
     * Gets the number of damage locators on this object.
     */
    GetDamageLocatorCount() {
      return this.GetLocatorCount(_EveSpaceObject.#damageLocatorSetName);
    }

    /**
     * Gets the number of locators in a named locator set.
     */
    GetLocatorCount(locatorSetName) {
      return this.#GetLocatorsForSet(locatorSetName)?.length ?? 0;
    }

    /**
     * Gets the first locator list whose set has the requested Carbon name.
     * The returned list remains owned by the locator set.
     */
    GetLocatorsForSet(locatorSetName) {
      return this.#GetLocatorsForSet(locatorSetName);
    }

    /**
     * Gets the closest locator in a set to a world position, ignoring locator
     * facing. Returns -1 when the set is missing or empty.
     */
    GetCloseLocatorIndex(position, locatorSetName) {
      const locators = this.#GetLocatorsForSet(locatorSetName);
      if (!locators) {
        return -1;
      }
      const posInObjectSpace = vec3.transformMat4(vec3.create(), position, this.inverseWorldTransform);
      const locatorPosition = vec3.create();
      const locatorDirection = vec3.create();
      let closestLength = Infinity;
      let closestIndex = -1;
      for (let index = 0; index < locators.length; index++) {
        this.#GetLocatorInObjectSpace(locatorPosition, locatorDirection, locators[index]);
        const distance = vec3.squaredDistance(locatorPosition, posInObjectSpace);
        if (distance < closestLength) {
          closestIndex = index;
          closestLength = distance;
        }
      }
      return closestIndex;
    }

    /**
     * Carbon's script surface maps GetGoodLocatorIndex to GetCloseLocatorIndex
     * (EveSpaceObject2_Blue.cpp); the internal randomized fit heuristic is not
     * script-exposed.
     */
    GetGoodLocatorIndex(position, locatorSetName) {
      return this.GetCloseLocatorIndex(position, locatorSetName);
    }

    /**
     * Gets the local direction of an indexed damage locator, (0,0,0) for
     * indices out of range (Carbon script GetDamageLocatorDirection maps to
     * GetDamageLocatorDirectionLocal).
     */
    GetDamageLocatorDirection(index, inWorldSpaceOrOut = vec3.create(), out = vec3.create()) {
      const targetableCall = typeof inWorldSpaceOrOut === "boolean";
      const inWorldSpace = targetableCall && inWorldSpaceOrOut;
      if (!targetableCall) out = inWorldSpaceOrOut;
      const locators = this.#GetLocatorsForSet(_EveSpaceObject.#damageLocatorSetName);
      if (!locators || !(index >= 0 && index < locators.length)) {
        vec3.set(out, 0, targetableCall ? 1 : 0, 0);
        return targetableCall ? false : out;
      }
      const position = vec3.create();
      this.#GetLocatorInObjectSpace(position, out, locators[index]);
      if (inWorldSpace) _EveSpaceObject.#TransformNormal(out, out, this.worldTransform);
      return targetableCall ? true : out;
    }

    /** Internal ITriTargetable locator query, using the org-standard out-last convention. */
    GetDamageLocatorPosition(index, inWorldSpace, out = vec3.create()) {
      const locators = this.#GetLocatorsForSet(_EveSpaceObject.#damageLocatorSetName);
      if (!locators || !(index >= 0 && index < locators.length)) {
        if (inWorldSpace) vec3.set(out, this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);else vec3.set(out, 0, 0, 0);
        return false;
      }
      this.#GetLocatorInObjectSpace(out, _EveSpaceObject.#locatorDirection, locators[index]);
      if (inWorldSpace) vec3.transformMat4(out, out, this.worldTransform);
      return true;
    }

    /** Gets the closest facing damage locator for ITriTargetable consumers. */
    GetClosestDamageLocatorIndex(position) {
      return this.#GetClosestLocatorIndex(position, _EveSpaceObject.#damageLocatorSetName);
    }

    /** Ports Carbon's randomized distance/direction fit for impact variation. */
    GetGoodDamageLocatorIndex(position) {
      const locators = this.#GetLocatorsForSet(_EveSpaceObject.#damageLocatorSetName);
      if (!locators) return 0;
      const objectPosition = vec3.transformMat4(_EveSpaceObject.#objectPosition, position, this.inverseWorldTransform);
      let minDistance = Infinity;
      let maxDistance = Number.MIN_VALUE;
      let bestDirectionFit = 0;
      for (const locator of locators) {
        this.#GetLocatorInObjectSpace(_EveSpaceObject.#locatorPosition, _EveSpaceObject.#locatorDirection, locator);
        if (!_EveSpaceObject.#IsLocatorFacingPosition(_EveSpaceObject.#locatorDirection, objectPosition)) continue;
        vec3.subtract(_EveSpaceObject.#locatorOffset, _EveSpaceObject.#locatorPosition, objectPosition);
        const distance = vec3.length(_EveSpaceObject.#locatorOffset);
        minDistance = Math.min(minDistance, distance);
        maxDistance = Math.max(maxDistance, distance);
        if (distance) vec3.scale(_EveSpaceObject.#locatorOffset, _EveSpaceObject.#locatorOffset, 1 / distance);
        bestDirectionFit = Math.max(bestDirectionFit, _EveSpaceObject.#GetDirectionFit(_EveSpaceObject.#locatorDirection, _EveSpaceObject.#locatorOffset));
      }
      const desiredFit = Math.random() * (0.25 - (1 - bestDirectionFit)) + 0.75;
      let bestFit = 1;
      let bestLocator = -1;
      for (let index = 0; index < locators.length; index++) {
        this.#GetLocatorInObjectSpace(_EveSpaceObject.#locatorPosition, _EveSpaceObject.#locatorDirection, locators[index]);
        if (!_EveSpaceObject.#IsLocatorFacingPosition(_EveSpaceObject.#locatorDirection, objectPosition)) continue;
        vec3.subtract(_EveSpaceObject.#locatorOffset, _EveSpaceObject.#locatorPosition, objectPosition);
        const distance = vec3.length(_EveSpaceObject.#locatorOffset);
        const range = maxDistance - minDistance;
        let scale = range > 0 ? 1 - (distance - minDistance) / range : 1;
        let value = 2 * scale - 1;
        value = value < 0 ? 1 - Math.sqrt(Math.abs(value)) : Math.sqrt(Math.abs(value)) + 1;
        value *= 0.5;
        if (distance) vec3.scale(_EveSpaceObject.#locatorOffset, _EveSpaceObject.#locatorOffset, 1 / distance);
        value *= _EveSpaceObject.#GetDirectionFit(_EveSpaceObject.#locatorDirection, _EveSpaceObject.#locatorOffset);
        const fit = Math.abs(value - desiredFit);
        if (fit < bestFit) {
          bestFit = fit;
          bestLocator = index;
        }
      }
      return bestLocator < 0 ? this.#GetClosestLocatorIndex(position, _EveSpaceObject.#damageLocatorSetName) : bestLocator;
    }

    /** Gets the model-scaled target radius. */
    GetRadius() {
      return this.GetBoundingSphereRadius();
    }

    /** Computes a miss point just outside the model silhouette. */
    GetMissPosition(hit, source, out = vec3.create()) {
      if (this.boundingSphereRadius > 0) {
        vec3.copy(out, this.modelWorldPosition);
        if (hit && source) {
          vec3.subtract(_EveSpaceObject.#missOffset, hit, out);
          vec3.subtract(_EveSpaceObject.#missDirection, hit, source);
          const directionLength = vec3.length(_EveSpaceObject.#missDirection);
          if (directionLength) vec3.scale(_EveSpaceObject.#missDirection, _EveSpaceObject.#missDirection, 1 / directionLength);
          vec3.scaleAndAdd(_EveSpaceObject.#missOffset, _EveSpaceObject.#missOffset, _EveSpaceObject.#missDirection, -vec3.dot(_EveSpaceObject.#missDirection, _EveSpaceObject.#missOffset));
          const offsetLength = vec3.length(_EveSpaceObject.#missOffset);
          if (offsetLength) vec3.scale(_EveSpaceObject.#missOffset, _EveSpaceObject.#missOffset, 1 / offsetLength);
          vec3.scaleAndAdd(out, out, _EveSpaceObject.#missOffset, this.GetBoundingSphereRadius() * 1.125);
        }
      } else {
        this.GetDamageLocatorPosition(-1, true, out);
      }
      return out;
    }

    /** Gets the current target impact material. */
    GetImpactConfiguration() {
      return this.impactOverlay?.GetImpactConfiguration?.() ?? ImpactConfiguration.IMPACT_INVALID;
    }

    /** Reports whether impacts currently use the authored shield ellipsoid. */
    HasImpactConfigurationShield() {
      return !!this.impactOverlay?.HasShieldEllipsoid?.() && this.GetImpactConfiguration() === ImpactConfiguration.IMPACT_SHIELD;
    }

    /** Resolves a shield-ray or damage-locator collision point. */
    GetImpactPosition(locator, posPrev, posNow, epsilon, out = vec3.create()) {
      if (!this.HasImpactConfigurationShield()) {
        this.GetDamageLocatorPosition(locator, true, out);
        return vec3.squaredDistance(posNow, out) < Number(epsilon);
      }
      vec3.transformMat4(_EveSpaceObject.#rayOrigin, posPrev, this.inverseWorldTransform);
      vec3.transformMat4(_EveSpaceObject.#rayEnd, posNow, this.inverseWorldTransform);
      vec3.subtract(_EveSpaceObject.#rayDirection, _EveSpaceObject.#rayEnd, _EveSpaceObject.#rayOrigin);
      this.GetShapeEllipsoid(_EveSpaceObject.#ellipsoidCenter, _EveSpaceObject.#ellipsoidRadii);
      const t = _EveSpaceObject.#IntersectEllipsoidRay(out, _EveSpaceObject.#ellipsoidCenter, _EveSpaceObject.#ellipsoidRadii, _EveSpaceObject.#rayOrigin, _EveSpaceObject.#rayDirection);
      if (t !== null && t >= -1 && t <= 1) {
        vec3.transformMat4(out, out, this.worldTransform);
        return true;
      }
      if (_EveSpaceObject.#IsPointInsideEllipsoid(_EveSpaceObject.#ellipsoidCenter, _EveSpaceObject.#ellipsoidRadii, _EveSpaceObject.#rayEnd)) {
        vec3.copy(out, posNow);
        return true;
      }
      return false;
    }

    /** Updates an existing impact overlay entry. */
    UpdateImpact(out, direction, impactIndex) {
      return this.impactOverlay?.UpdateImpact?.(out, direction, impactIndex) ?? false;
    }

    /**
     * Gets the local position of an indexed damage locator, (0,0,0) for
     * indices out of range.
     */
    GetDamageLocator(index, out = vec3.create()) {
      const locators = this.#GetLocatorsForSet(_EveSpaceObject.#damageLocatorSetName);
      if (!locators || !(index >= 0 && index < locators.length)) {
        return vec3.set(out, 0, 0, 0);
      }
      const direction = vec3.create();
      this.#GetLocatorInObjectSpace(out, direction, locators[index]);
      return out;
    }

    /**
     * Gets the world-space position of an indexed damage locator, (0,0,0) for
     * indices out of range (returned untransformed, as Carbon does).
     */
    GetTransformedDamageLocator(index, out = vec3.create()) {
      const locators = this.#GetLocatorsForSet(_EveSpaceObject.#damageLocatorSetName);
      if (!locators || !(index >= 0 && index < locators.length)) {
        return vec3.set(out, 0, 0, 0);
      }
      const direction = vec3.create();
      this.#GetLocatorInObjectSpace(out, direction, locators[index]);
      return vec3.transformMat4(out, out, this.worldTransform);
    }

    /**
     * Checks whether this object is in impostor mode. The impostor system that
     * raises the flag is unported, so this reports the default until then.
     */
    IsImpostor() {
      return this.#impostorMode;
    }

    /**
     * Gets a locator position from a named set. Out-of-range or missing-set
     * queries return the world translation in world space and (0,0,0) in
     * object space, as Carbon does.
     */
    GetLocatorPositionFromSet(index, inWorldSpace, locatorSetName, out = vec3.create()) {
      const locators = this.#GetLocatorsForSet(locatorSetName);
      if (index < 0 || !locators || index >= locators.length) {
        if (inWorldSpace) {
          return vec3.set(out, this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);
        }
        return vec3.set(out, 0, 0, 0);
      }
      const direction = vec3.create();
      this.#GetLocatorInObjectSpace(out, direction, locators[index]);
      if (inWorldSpace) {
        vec3.transformMat4(out, out, this.worldTransform);
      }
      return out;
    }

    /**
     * Gets a locator direction from a named set. Out-of-range or missing-set
     * queries return (0,1,0), as Carbon does.
     */
    GetLocatorRotationFromSet(index, inWorldSpace, locatorSetName, out = vec3.create()) {
      const locators = this.#GetLocatorsForSet(locatorSetName);
      if (index < 0 || !locators || index >= locators.length) {
        return vec3.set(out, 0, 1, 0);
      }
      const position = vec3.create();
      this.#GetLocatorInObjectSpace(position, out, locators[index]);
      if (inWorldSpace) {
        _EveSpaceObject.#TransformNormal(out, out, this.worldTransform);
      }
      return out;
    }

    /**
     * Raises a named controller event on this hull's controllers and forwards it
     * to the effect children and overlay effects.
     */
    HandleControllerEvent(name) {
      const eventName = String(name ?? "");
      for (const controller of this.controllers) {
        controller?.HandleEvent?.(eventName);
      }
      for (const child of this.effectChildren) {
        child?.HandleControllerEvent?.(eventName);
      }
      for (const overlay of this.overlayEffects) {
        overlay?.HandleControllerEvent?.(eventName);
      }
    }

    /**
     * Plays an animation once, replacing the current one
     * (Carbon script PlayAnimation maps to PlayAnimationOnce).
     */
    PlayAnimation(animName) {
      this.#PlayAnimation(animName, true, 1, 0, 1, true);
    }

    /**
     * Chains an animation once after the current one (Carbon ChainAnimation).
     */
    ChainAnimation(animName) {
      this.#PlayAnimation(animName, false, 1, 0, 1, true);
    }

    /**
     * Chains an animation with explicit loop, start, and speed settings
     * (Carbon ChainAnimationEx).
     */
    ChainAnimationEx(animName, loopCount, start, speed) {
      this.#PlayAnimation(animName, false, loopCount, start, speed, true);
    }

    // Carbon EveSpaceObject2::PlayAnimation: every playback wrapper funnels
    // into the animation updater, which owns playback state; a missing updater
    // is a Carbon-faithful no-op.

    /**
     * Forwards a playback request to the animation updater, which owns all
     * animation state; a hull without an updater does nothing, as in Carbon.
     */
    #PlayAnimation(animName, replace, loopCount, delay, speed, clearWhenDone) {
      this.animationUpdater?.PlayAnimation?.(String(animName ?? ""), replace, loopCount, delay, speed, clearWhenDone);
    }

    /**
     * Recalculates the authored bounding sphere from the mesh geometry
     * resource. Fails when no mesh or ready geometry resource is attached.
     */
    RebuildBoundingSphereInformation() {
      const mesh = this.mesh;
      if (!mesh) {
        return false;
      }
      const geometryRes = mesh.GetGeometryResource?.();
      if (!geometryRes || !geometryRes.IsGood?.()) {
        return false;
      }
      geometryRes.RecalculateBoundingSphere?.();
      const sphere = vec4.create();
      geometryRes.GetBoundingSphere?.(mesh.GetMeshIndex?.() ?? 0, sphere);
      vec3.set(this.boundingSphereCenter, sphere[0], sphere[1], sphere[2]);
      this.boundingSphereRadius = sphere[3];
      return true;
    }

    /** Sets Carbon's authored local bounding sphere from a sph3-compatible value. */
    SetBoundingSphereInformation(sphere) {
      if (sphere?.center) {
        vec3.copy(this.boundingSphereCenter, sphere.center);
        this.boundingSphereRadius = Number(sphere.radius);
      } else {
        this.boundingSphereRadius = sph3.extract(sphere, this.boundingSphereCenter);
      }
      this.UpdateWorldBounds();
      return this;
    }

    /**
     * Returns a plain-object snapshot of the controller variables currently
     * stamped on this hull.
     */
    GetControllerVariables() {
      return Object.fromEntries(this.#controllerVariables);
    }

    /** Gets Carbon's most recently selected geometry LOD. */
    GetLastUsedMeshLod() {
      const geometryResource = this.mesh?.GetGeometryResource?.();
      if (!geometryResource) return -1;
      if (!this.#allowLodSelection) return 0;
      return geometryResource.GetLodIndexForScreenSize?.(this.mesh?.GetMeshIndex?.() ?? 0, this.#meshScreenSize) ?? 0;
    }

    /**
     * Gets a named locator's transform (Carbon script GetLocatorTransform maps
     * to GetEveLocatorTransform): the identity for unknown names, the animated
     * bone world transform when the animation updater resolves the name, else
     * the authored locator transform.
     */
    GetLocatorTransform(name, out = mat4.create()) {
      const target = String(name ?? "");
      let locator = null;
      for (const candidate of this.locators) {
        if (candidate?.GetName?.() === target) {
          locator = candidate;
          break;
        }
      }
      if (!locator) {
        return mat4.identity(out);
      }
      if (this.animationUpdater?.GetBoneWorldTransform?.(target, out)) {
        return out;
      }
      return mat4.copy(out, locator.GetTransform());
    }

    /**
     * Gets the local axis-aligned bounding box: dynamic skinned bounds when
     * enabled, else the mesh box, else the cached box (at worst it lags one
     * frame). With out arguments it fills them and returns true; without, it
     * returns { min, max }.
     */
    GetLocalBoundingBox(minBounds, maxBounds) {
      const min = vec3.create();
      const max = vec3.create();
      const updater = this.animationUpdater;
      if (this.dynamicBoundingSphereEnabled && updater?.IsInitialized?.()) {
        const sphere = vec4.create();
        updater.GetDynamicBounds?.(sphere, min, max);
        vec3.copy(this.#localAabbMin, min);
        vec3.copy(this.#localAabbMax, max);
      } else if (this.mesh?.GetBoundingBox?.(min, max)) {
        vec3.copy(this.#localAabbMin, min);
        vec3.copy(this.#localAabbMax, max);
      } else {
        vec3.copy(min, this.#localAabbMin);
        vec3.copy(max, this.#localAabbMax);
      }
      if (minBounds && maxBounds) {
        vec3.copy(minBounds, min);
        vec3.copy(maxBounds, max);
        return true;
      }
      return {
        min,
        max
      };
    }

    /** Gets Carbon's cached local box transformed into a world-axis-aligned box. */
    GetWorldBoundingBox(minBounds, maxBounds) {
      box3.fromBounds(_EveSpaceObject.#localBox, this.#localAabbMin, this.#localAabbMax);
      box3.transformMat4(_EveSpaceObject.#worldBox, _EveSpaceObject.#localBox, this.worldTransform);
      const min = minBounds ?? vec3.create();
      const max = maxBounds ?? vec3.create();
      vec3.set(min, _EveSpaceObject.#worldBox[0], _EveSpaceObject.#worldBox[1], _EveSpaceObject.#worldBox[2]);
      vec3.set(max, _EveSpaceObject.#worldBox[3], _EveSpaceObject.#worldBox[4], _EveSpaceObject.#worldBox[5]);
      return minBounds && maxBounds ? true : {
        min,
        max
      };
    }

    /** Reports whether the attached mesh has a ready geometry resource. */
    IsBoundingBoxReady() {
      const geometryResource = this.mesh?.GetGeometryResource?.();
      return !!geometryResource?.IsGood?.();
    }

    /**
     * Gets Carbon's realized world sphere, optionally accumulated with transform
     * and effect children when query is EVE_BOUNDS_WITH_CHILDREN.
     */
    GetBoundingSphere(out = sph3.create(), query = 0) {
      if (!this.UpdateWorldBounds()) return false;
      _EveSpaceObject.#SetSphere(out, this.modelWorldPosition, this.#boundingSphereWorldRadius);
      if (!query || !this.DisplayChildren()) return true;
      for (const child of this.children) {
        if (child?.GetBoundingSphere?.(_EveSpaceObject.#childSphere, query)) {
          sph3.union(out, out, _EveSpaceObject.#childSphere);
        }
      }
      for (const child of this.effectChildren) {
        if (child?.GetBoundingSphere?.(_EveSpaceObject.#childSphere, query)) {
          sph3.union(out, out, _EveSpaceObject.#childSphere);
        }
      }
      return true;
    }

    /** Updates Carbon's geometry-derived on-screen pixel diameter. */
    EstimatePixelDiameter(frustum) {
      if (this.mesh?.GetBoundingBox?.(_EveSpaceObject.#boundsMin, _EveSpaceObject.#boundsMax)) {
        vec3.copy(this.#localAabbMin, _EveSpaceObject.#boundsMin);
        vec3.copy(this.#localAabbMax, _EveSpaceObject.#boundsMax);
      }
      sph3.fromBounds(_EveSpaceObject.#localSphere, this.#localAabbMin, this.#localAabbMax);
      sph3.transformMat4(_EveSpaceObject.#worldSphere, _EveSpaceObject.#localSphere, this.worldTransform);
      this.estimatedPixelDiameter = _EveSpaceObject.#GetPixelSize(frustum, _EveSpaceObject.#worldSphere);
      return this.estimatedPixelDiameter;
    }

    /** Reports the result of the latest Carbon visibility update. */
    IsInFrustum() {
      return this.#isInFrustum;
    }

    /**
     * Gets the bounding sphere center, preferring the dynamic skinned sphere
     * when one is published.
     */
    GetBoundingSphereCenter(out = vec3.create()) {
      if (this.#dynamicBoundingSphere[3] !== -1) {
        return vec3.set(out, this.#dynamicBoundingSphere[0], this.#dynamicBoundingSphere[1], this.#dynamicBoundingSphere[2]);
      }
      return vec3.copy(out, this.boundingSphereCenter);
    }

    /**
     * Gets the model-scaled bounding sphere radius, preferring the dynamic
     * skinned sphere when one is published.
     */
    GetBoundingSphereRadius() {
      if (this.#dynamicBoundingSphere[3] !== -1) {
        return this.modelScale * this.#dynamicBoundingSphere[3];
      }
      return this.modelScale * this.boundingSphereRadius;
    }

    /**
     * Gets the number of mesh-bound bones. Carbon dereferences the animation
     * updater unchecked; CarbonEngineJS reports 0 when none is attached.
     */
    GetBoneCount() {
      const updater = this.animationUpdater;
      if (!updater) {
        return 0;
      }
      if (updater.IsUsingCMF?.()) {
        if (!updater.HasMeshBinding?.()) {
          return 0;
        }
        return updater.GetSkeletonBoneIndices?.().length ?? 0;
      }
      return updater.GetMeshBindingBoneCount?.() ?? 0;
    }

    /**
     * Pushes shield, armor and hull damage levels to the impact overlay and
     * mirrors them into the ShieldDamage, ArmorDamage and HullDamage controller
     * variables so bound effects follow.
     */
    SetImpactDamageState(shield, armor, hull, doCreateArmorImpacts = true) {
      this.impactOverlay?.SetDamageState?.(shield, armor, hull, doCreateArmorImpacts);
      this.SetControllerVariable("ShieldDamage", shield);
      this.SetControllerVariable("ArmorDamage", armor);
      this.SetControllerVariable("HullDamage", hull);
    }

    /**
     * Toggles a named impact-overlay animation (boosters, hardeners, ...).
     */
    SetImpactAnimation(name, enable, duration) {
      this.impactOverlay?.ToggleEffect?.(name, enable, duration);
    }

    /**
     * Stores a controller variable on the hull and pushes it to the controllers,
     * effect children and overlay effects; the stored value is replayed onto
     * controllers and children added later.
     */
    SetControllerVariable(name, value) {
      const key = String(name ?? "");
      const next = Number(value);
      this.#controllerVariables.set(key, next);
      for (const controller of this.controllers) {
        controller?.SetVariable?.(key, next);
      }
      for (const child of this.effectChildren) {
        child?.SetControllerVariable?.(key, next);
      }
      for (const overlay of this.overlayEffects) {
        overlay?.SetControllerVariable?.(key, next);
      }
    }

    /**
     * Forwards a procedural-container variable to every effect child; the hull
     * itself keeps no copy.
     */
    SetProceduralContainerVariable(name, value) {
      for (const child of this.effectChildren) {
        child?.SetProceduralContainerVariable?.(name, value);
      }
    }

    /**
     * Starts this hull's controllers and those of its effect children and overlay
     * effects.
     */
    StartControllers() {
      for (const controller of this.controllers) {
        controller?.Start?.();
      }
      for (const child of this.effectChildren) {
        child?.StartControllers?.();
      }
      for (const overlay of this.overlayEffects) {
        overlay?.StartControllers?.();
      }
    }

    /**
     * Applies bone and model transforms to locators and returns
     * [position, rotation, boneIndex] tuples, as the Carbon script surface
     * does (TransformLocators maps to PyTransformLocators). Accepts either
     * locator records ({ position, direction, boneIndex }, Carbon's
     * LocatorStructureList shape) or the same [position, rotation, boneIndex]
     * tuple shape it returns.
     */
    TransformLocators(locators = []) {
      const result = [];
      for (const locator of locators ?? []) {
        const record = Array.isArray(locator) ? {
          position: locator[0],
          rotation: locator[1],
          boneIndex: locator[2]
        } : {
          position: locator?.position,
          rotation: locator?.direction ?? locator?.rotation,
          boneIndex: locator?.boneIndex
        };
        const position = vec3.clone(record.position ?? _EveSpaceObject.#zero);
        const rotation = quat.clone(record.rotation ?? _EveSpaceObject.#identityRotation);
        const boneIndex = Number(record.boneIndex ?? 0);
        this.#TransformLocator(position, rotation, boneIndex);
        if (this.modelTranslationCurve || this.modelRotationCurve) {
          this.#ApplyModelTransform(position, rotation);
        }
        result.push([position, rotation, boneIndex]);
      }
      return result;
    }

    // Carbon Blue TransformLocator: bone-attached records pick up the mesh
    // bone matrix; without bone data the authored values pass through.

    /**
     * Applies the mesh bone matrix to a locator position and rotation for
     * bone-attached locators; the authored values pass through unchanged when
     * there is no usable bone data.
     */
    #TransformLocator(position, rotation, boneIndex) {
      const updater = this.animationUpdater;
      if (boneIndex <= 0 || !updater?.IsInitialized?.()) {
        return;
      }
      const bone = _EveSpaceObject.#GetBoneMatrix(updater, boneIndex);
      if (!bone) {
        return;
      }
      vec3.transformMat4(position, position, bone);
      const boneRotation = mat4.getRotation(quat.create(), bone);
      quat.multiply(rotation, boneRotation, rotation);
    }

    // Carbon Blue ApplyModelTransform samples both curves at the Be::Time()
    // origin (pure GetValueAt, no playback advance): translation adds, model
    // rotation rotates the position and pre-multiplies.

    /**
     * Applies the model translation and rotation curves sampled at time 0 to a
     * locator position and rotation, matching Carbon's Blue locator surface, which
     * reads the curves without advancing playback.
     */
    #ApplyModelTransform(position, rotation) {
      if (this.modelTranslationCurve) {
        const translation = vec3.create();
        this.modelTranslationCurve.GetValueAt?.(0, translation);
        vec3.add(position, position, translation);
      }
      if (this.modelRotationCurve) {
        const modelRotation = quat.create();
        this.modelRotationCurve.GetValueAt?.(0, modelRotation);
        vec3.transformQuat(position, position, modelRotation);
        quat.multiply(rotation, modelRotation, rotation);
      }
    }

    // Carbon GetLocatorsForSet: first set matching the name wins.

    /**
     * Returns the locator list of the first locator set carrying the name, or null
     * when no set matches; the list stays owned by the locator set.
     */
    #GetLocatorsForSet(locatorSetName) {
      const target = String(locatorSetName ?? "");
      for (const set of this.locatorSets) {
        if (set?.HasName?.(target)) {
          return set.GetLocators();
        }
      }
      return null;
    }

    // Carbon GetLocatorInObjectSpace: the direction is +Y rotated by the
    // authored quaternion; bone-attached locators additionally apply the mesh
    // bone matrix. Carbon leaves the outputs untouched (caller-uninitialized)
    // when bone data is missing; CarbonEngineJS keeps the unskinned values.

    /**
     * Writes a locator's object-space position and its direction, which is +Y
     * rotated by the authored quaternion, applying the mesh bone matrix for
     * bone-attached locators; where Carbon leaves the outputs untouched when bone
     * data is missing, this keeps the unskinned values.
     */
    #GetLocatorInObjectSpace(outPosition, outDirection, locator) {
      vec3.transformQuat(outDirection, _EveSpaceObject.#unitY, locator.direction);
      vec3.copy(outPosition, locator.position);
      const updater = this.animationUpdater;
      if (locator.boneIndex > 0 && updater?.IsInitialized?.()) {
        const boneCount = Number(updater.GetMeshBoneCount?.() ?? 0);
        if (locator.boneIndex < boneCount) {
          const bone = _EveSpaceObject.#GetBoneMatrix(updater, locator.boneIndex);
          if (bone) {
            vec3.transformMat4(outPosition, locator.position, bone);
            _EveSpaceObject.#TransformNormal(outDirection, outDirection, bone);
          }
        }
      }
    }

    // Carbon GetClosestLocatorIndex: facing-gated closest search; 0 when the
    // set is missing, -1 when no locator faces the position.

    /**
     * Returns the index of the nearest locator in a named set that faces the given
     * world position - 0 when the set is missing, -1 when no locator faces the
     * position.
     */
    #GetClosestLocatorIndex(position, locatorSetName) {
      const locators = this.#GetLocatorsForSet(locatorSetName);
      if (!locators) {
        return 0;
      }
      const posInObjectSpace = vec3.transformMat4(vec3.create(), position, this.inverseWorldTransform);
      const locatorPosition = vec3.create();
      const locatorDirection = vec3.create();
      let closestLength = Infinity;
      let closestIndex = -1;
      for (let index = 0; index < locators.length; index++) {
        this.#GetLocatorInObjectSpace(locatorPosition, locatorDirection, locators[index]);
        if (!_EveSpaceObject.#IsLocatorFacingPosition(locatorDirection, posInObjectSpace)) {
          continue;
        }
        const distance = vec3.squaredDistance(locatorPosition, posInObjectSpace);
        if (distance < closestLength) {
          closestIndex = index;
          closestLength = distance;
        }
      }
      return closestIndex;
    }

    /**
     * Reports whether a locator faces a position, by testing that stepping the
     * object-space position back along the locator direction shortens it.
     */

    /** Rotates a direction by a matrix's rotation basis, ignoring its translation. */

    /** Carbon's authored-or-derived local shape ellipsoid query. */
    GetShapeEllipsoid(outCenter, outRadii) {
      if (this.shapeEllipsoidRadius[0] > 0) {
        vec3.copy(outCenter, this.shapeEllipsoidCenter);
        vec3.copy(outRadii, this.shapeEllipsoidRadius);
      } else {
        const bounds = this.GetLocalBoundingBox(_EveSpaceObject.#boundsMin, _EveSpaceObject.#boundsMax);
        if (bounds === false) {
          vec3.set(_EveSpaceObject.#boundsMin, -1, -1, -1);
          vec3.set(_EveSpaceObject.#boundsMax, 1, 1, 1);
        }
        vec3.subtract(outRadii, _EveSpaceObject.#boundsMax, _EveSpaceObject.#boundsMin);
        vec3.scale(outRadii, outRadii, Math.sqrt(3) * 0.5);
        vec3.lerp(outCenter, _EveSpaceObject.#boundsMin, _EveSpaceObject.#boundsMax, 0.5);
      }
      vec3.copy(this.generatedShapeEllipsoidCenter, outCenter);
      vec3.copy(this.generatedShapeEllipsoidRadius, outRadii);
    }

    /**
     * Maps the negated dot product of a locator direction and an offset direction
     * onto Carbon's square-root fit score, the ranking used to pick a varied
     * damage locator.
     */

    /**
     * Intersects a ray with an axis-aligned ellipsoid in the ellipsoid's own space and writes the hit point into out.
     * @returns {number|null} The ray parameter at the hit, or null when the ray is degenerate or misses.
     */

    /** Reports whether a point lies inside an axis-aligned ellipsoid. */

    // Mesh bone matrices come from the animation updater; only mat4-shaped
    // entries are usable.

    /**
     * Unpacks one bone from the updater's palette into a mat4, or null when the
     * index is out of range.
     *
     * The palette is Carbon's storage - one contiguous Float4x3 buffer, stride
     * 12 - so a bone is expanded rather than borrowed. Carbon does the same at
     * every read site with TriMatrixCopyFrom3x4.
     */

    /**
     * Replays every stored controller variable onto a newly added controller or
     * effect child through the named setter, so late additions start with the same
     * state.
     */

    /**
     * Samples a curve into out through whichever of Update or GetValueAt it
     * exposes, writing the fallback when there is no curve and copying back curves
     * that return a new array instead of filling out.
     */

    /**
     * Reads a numeric value from the update context, preferring a getter method
     * and falling back to the named properties, and yields 0 when nothing supplies
     * it.
     */

    /**
     * Returns a world sphere's on-screen diameter in pixels from the frustum's
     * exact query, or 0 when the frustum does not expose it.
     */

    /**
     * Returns a world sphere's on-screen diameter in pixels, preferring the
     * frustum's cheaper estimated query and falling back to the exact one, or 0
     * when the frustum exposes neither.
     */

    /** Writes a center and radius into a caller-owned sph3. */
  }];
  #IsLocatorFacingPosition(locatorDirection, posInObjectSpace) {
    const moved = vec3.subtract(vec3.create(), posInObjectSpace, locatorDirection);
    return vec3.squaredLength(moved) < vec3.squaredLength(posInObjectSpace);
  }
  #TransformNormal(out, direction, matrix) {
    const x = direction[0];
    const y = direction[1];
    const z = direction[2];
    out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
    out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
    out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
    return out;
  }
  #GetDirectionFit(v0, v1) {
    const direction = -vec3.dot(v0, v1);
    return direction < 0 ? (1 - Math.sqrt(Math.abs(direction))) * 0.5 : (Math.sqrt(Math.abs(direction)) + 1) * 0.5;
  }
  #IntersectEllipsoidRay(out, center, radii, origin, direction) {
    const vx = direction[0] / radii[0];
    const vy = direction[1] / radii[1];
    const vz = direction[2] / radii[2];
    const sx = (origin[0] - center[0]) / radii[0];
    const sy = (origin[1] - center[1]) / radii[1];
    const sz = (origin[2] - center[2]) / radii[2];
    const vv = vx * vx + vy * vy + vz * vz;
    if (!(vv > 0)) return null;
    const vs = vx * sx + vy * sy + vz * sz;
    const ss = sx * sx + sy * sy + sz * sz;
    let discriminant = (vs / vv) ** 2 - ss / vv + 1 / vv;
    if (discriminant < 0) return null;
    discriminant = Math.sqrt(discriminant);
    let t = -discriminant - vs / vv;
    if (t < 0) t = discriminant - vs / vv;
    vec3.scaleAndAdd(out, origin, direction, t);
    return t;
  }
  #IsPointInsideEllipsoid(center, radii, point) {
    const x = (point[0] - center[0]) / radii[0];
    const y = (point[1] - center[1]) / radii[1];
    const z = (point[2] - center[2]) / radii[2];
    return x * x + y * y + z * z <= 1;
  }
  #GetBoneMatrix(updater, boneIndex) {
    const bones = updater.GetMeshBoneMatrixList?.();
    if (!bones || boneIndex < 0 || (boneIndex + 1) * 12 > bones.length) {
      return null;
    }
    return MatrixCopyFrom3x4(mat4.create(), bones, boneIndex);
  }
  #ApplyControllerVariables(target, variables, methodName) {
    const setter = target?.[methodName];
    if (typeof setter !== "function") {
      return;
    }
    for (const [name, value] of variables) {
      setter.call(target, name, value);
    }
  }
  #UpdateCurve(curve, time, out, fallback) {
    if (!curve) {
      for (let index = 0; index < out.length; index++) {
        out[index] = fallback[index];
      }
      return out;
    }
    let result;
    if (typeof curve.Update === "function") {
      result = curve.Update(time, out);
    } else if (typeof curve.GetValueAt === "function") {
      result = curve.GetValueAt(time, out);
    }
    if ((Array.isArray(result) || ArrayBuffer.isView(result)) && result !== out) {
      for (let index = 0; index < out.length; index++) {
        out[index] = result[index];
      }
    }
    return out;
  }
  #GetContextValue(context, methodName, ...propertyNames) {
    const method = context?.[methodName];
    if (typeof method === "function") {
      return Number(method.call(context)) || 0;
    }
    for (const propertyName of propertyNames) {
      if (context?.[propertyName] !== undefined && context?.[propertyName] !== null) {
        return Number(context[propertyName]) || 0;
      }
    }
    return 0;
  }
  #GetPixelSize(frustum, sphere) {
    const method = frustum?.GetPixelSizeAccross;
    return Number(typeof method === "function" ? method.call(frustum, sphere) : 0) || 0;
  }
  #GetEstimatedPixelSize(frustum, sphere) {
    const method = frustum?.GetPixelSizeAccrossEst ?? frustum?.GetPixelSizeAccross;
    return Number(typeof method === "function" ? method.call(frustum, sphere) : 0) || 0;
  }
  #SetSphere(out, center, radius) {
    return sph3.set(out, center[0], center[1], center[2], radius);
  }
  #zero = Object.freeze([0, 0, 0]);
  #unitY = Object.freeze([0, 1, 0]);
  #locatorDirection = vec3.create();
  #locatorPosition = vec3.create();
  #locatorOffset = vec3.create();
  #objectPosition = vec3.create();
  #missOffset = vec3.create();
  #missDirection = vec3.create();
  #rayOrigin = vec3.create();
  #rayEnd = vec3.create();
  #rayDirection = vec3.create();
  #ellipsoidCenter = vec3.create();
  #ellipsoidRadii = vec3.create();
  #boundsMin = vec3.create();
  #boundsMax = vec3.create();
  #childSphere = sph3.create();
  #localSphere = sph3.create();
  #worldSphere = sph3.create();
  #localBox = box3.create();
  #worldBox = box3.create();
  #identityRotation = Object.freeze([0, 0, 0, 1]);
  #identityTransform = mat4.create();
  #damageLocatorSetName = "damage";
  ReflectionMode = ReflectionMode;
  Tr2Lod = Tr2Lod;
  ImpactConfiguration = ImpactConfiguration;
  constructor() {
    super(_EveSpaceObject), _initClass();
  }
}();

export { _EveSpaceObject as EveSpaceObject2 };
//# sourceMappingURL=EveSpaceObject2.js.map
