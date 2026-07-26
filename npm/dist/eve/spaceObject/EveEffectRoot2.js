import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { sph3 } from '@carbonenginejs/runtime-utils/sph3';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, impl, carbon, schema } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../EveEntity.js';
import { EveChildUpdateParams as _EveChildUpdateParams } from '../EveChildUpdateParams.js';
import { Tr2Lod } from '../EveLODHelper.js';
import { EveSpaceObjectPSData as _EveSpaceObjectPSData } from '../perObjectData/EveSpaceObjectPSData.js';
import { EveSpaceObjectVSData as _EveSpaceObjectVSData } from '../perObjectData/EveSpaceObjectVSData.js';
import { EveComponentType } from '../EveComponentTypes.js';

let _initProto, _initClass, _init_effectChildren, _init_extra_effectChildren, _init_estimatedSize, _init_extra_estimatedSize, _init_lodLevel, _init_extra_lodLevel, _init_mute, _init_extra_mute, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_dynamicLOD, _init_extra_dynamicLOD, _init_scaling, _init_extra_scaling, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_duration, _init_extra_duration, _init_secondaryLightingEmissiveColor, _init_extra_secondaryLightingEmissiveColor, _init_curveSets, _init_extra_curveSets, _init_lights, _init_extra_lights, _init_externalParameters, _init_extra_externalParameters, _init_controllers, _init_extra_controllers, _init_observers, _init_extra_observers, _init_rotationCurve, _init_extra_rotationCurve, _init_secondaryLightingSphereRadius, _init_extra_secondaryLightingSphereRadius, _init_boundingSphereCenter, _init_extra_boundingSphereCenter, _init_boundingSphereRadius, _init_extra_boundingSphereRadius, _init_modelTranslationCurve, _init_extra_modelTranslationCurve, _init_modelRotationCurve, _init_extra_modelRotationCurve, _init_translationCurve, _init_extra_translationCurve;

/**
 * A standalone effect root: curve-driven placement plus the effect children,
 * lights, controllers, curve sets and observers that make up an effect not
 * attached to a hull.
 */
let _EveEffectRoot;
new class extends _identity {
  static [class EveEffectRoot2 extends _EveEntity {
    static {
      ({
        e: [_init_effectChildren, _init_extra_effectChildren, _init_estimatedSize, _init_extra_estimatedSize, _init_lodLevel, _init_extra_lodLevel, _init_mute, _init_extra_mute, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_dynamicLOD, _init_extra_dynamicLOD, _init_scaling, _init_extra_scaling, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_duration, _init_extra_duration, _init_secondaryLightingEmissiveColor, _init_extra_secondaryLightingEmissiveColor, _init_curveSets, _init_extra_curveSets, _init_lights, _init_extra_lights, _init_externalParameters, _init_extra_externalParameters, _init_controllers, _init_extra_controllers, _init_observers, _init_extra_observers, _init_rotationCurve, _init_extra_rotationCurve, _init_secondaryLightingSphereRadius, _init_extra_secondaryLightingSphereRadius, _init_boundingSphereCenter, _init_extra_boundingSphereCenter, _init_boundingSphereRadius, _init_extra_boundingSphereRadius, _init_modelTranslationCurve, _init_extra_modelTranslationCurve, _init_modelRotationCurve, _init_extra_modelRotationCurve, _init_translationCurve, _init_extra_translationCurve, _initProto],
        c: [_EveEffectRoot, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveEffectRoot2",
        family: "eve/spaceObject"
      })], [[[io, io.persist, void 0, type.list("IEveSpaceObjectChild")], 16, "effectChildren"], [[io, io.read, type, type.float32], 16, "estimatedSize"], [[io, io.read, type, type.int32, void 0, schema.enum("Tr2Lod")], 16, "lodLevel"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "mute"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "dynamicLOD"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.persist, type, type.float32], 16, "duration"], [[io, io.persist, type, type.color], 16, "secondaryLightingEmissiveColor"], [[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.persist, void 0, type.list("Tr2Light")], 16, "lights"], [[io, io.persist, void 0, type.list("Tr2ExternalParameter")], 16, "externalParameters"], [[io, io.persist, void 0, type.list("ITr2Controller")], 16, "controllers"], [[io, io.persist, void 0, type.list("TriObserverLocal")], 16, "observers"], [[io, io.persist, void 0, type.model("ITriQuaternionFunction")], 16, "rotationCurve"], [[io, io.persist, type, type.float32], 16, "secondaryLightingSphereRadius"], [[impl, impl.adapted, void 0, impl.reason("The schema scanner omits MAPFLOATARRAYSIZE; Carbon exposes the three persisted center components separately from radius."), io, io.persist, type, type.vec3], 16, "boundingSphereCenter"], [[io, io.persist, type, type.float32], 16, "boundingSphereRadius"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "modelTranslationCurve"], [[io, io.persist, void 0, type.model("ITriQuaternionFunction")], 16, "modelRotationCurve"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "translationCurve"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Blue root locking is represented by the hydrated JavaScript object identity.")], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Plain JavaScript arrays have no Blue IList notifications, so insertion behavior is explicit.")], 18, "AddController"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Plain JavaScript arrays have no Blue IList notifications, so removal behavior is explicit.")], 18, "RemoveController"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon task and lock ownership is omitted; child update parameters retain the source graph contract.")], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Controller and child work is forwarded synchronously through the GPU-free graph instead of Carbon task groups.")], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Frustum and threshold state is supplied by the explicit update context rather than renderer globals.")], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateControllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphereRadius"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Curve outputs use CarbonEngineJS's time-first, output-second convention.")], 18, "UpdateWorldTransform"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS uses an out-last signature for output parameters.")], 18, "UpdateModelCenterWorldPosition"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS uses an out-last signature for output parameters.")], 18, "GetModelCenterWorldPosition"], [[carbon, carbon.method, impl, impl.noop], 18, "GetLocalBoundingBox"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS returns the caller-owned output matrix.")], 18, "GetLocalToWorldTransform"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's protected member access becomes a copying accessor; JS has no protected fields and the live buffer stays private.")], 18, "GetWorldTransform"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The quad renderer is an injected engine-owned capability.")], 18, "RegisterWithQuadRenderer"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The quad renderer is an injected engine-owned capability.")], 18, "AddQuadsToQuadRenderer"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The light manager is an injected engine-owned capability.")], 18, "GetLights"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddLight"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearLights"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Native constant-buffer structs are represented by GPU-free value records.")], 18, "GetPerObjectStructs"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The SH lighting manager is injected; Trinity owns only the authored source values.")], 18, "RegisterSecondaryLightSource"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The SH lighting manager is injected; Trinity owns only the authored source values.")], 18, "UnregisterSecondaryLightSource"], [[carbon, carbon.method, impl, impl.implemented], 18, "Start"], [[carbon, carbon.method, impl, impl.implemented], 18, "Stop"], [[carbon, carbon.method, impl, impl.noop], 18, "GetDamageLocatorCount"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS uses output parameters last and returns the targetable validity flag.")], 18, "GetDamageLocatorPosition"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS uses output parameters last and returns the targetable validity flag.")], 18, "GetDamageLocatorDirection"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS uses an out-last signature for output parameters.")], 18, "GetImpactPosition"], [[carbon, carbon.method, impl, impl.noop], 18, "HasImpactConfigurationShield"], [[carbon, carbon.method, impl, impl.noop], 18, "GetClosestDamageLocatorIndex"], [[carbon, carbon.method, impl, impl.noop], 18, "GetGoodDamageLocatorIndex"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRadius"], [[carbon, carbon.method, impl, impl.noop], 18, "CreateImpact"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateImpact"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS returns the caller-owned output vector.")], 18, "GetWorldPosition"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS returns the caller-owned output quaternion.")], 18, "GetWorldRotation"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMissPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetChildren"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "PlayCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurveSetDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRangeDuration"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The debug renderer/options collection is an injected engine-owned capability.")], 18, "GetDebugOptions"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The debug renderer is an injected engine-owned capability.")], 18, "RenderDebugInfo"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "HandleControllerEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartControllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEffectChildByName"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Plain JavaScript arrays have no Blue IList notifications, so insertion behavior is explicit.")], 18, "AddToEffectChildrenList"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Plain JavaScript arrays have no Blue IList notifications, so removal behavior is explicit.")], 18, "RemoveFromEffectChildrenList"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.implemented], 18, "FindSoundEmitter"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddObserver"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The explicit setter replaces Carbon's Blue field-notify callback.")], 18, "SetMute"], [[carbon, carbon.method, impl, impl.implemented], 18, "FreezeHighDetailMesh"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetProceduralContainerVariable"]], 0, void 0, _EveEntity));
    }
    /** m_effectChildren (PIEveSpaceObjectChildVector) [READ, PERSIST] */
    effectChildren = (_initProto(this), _init_effectChildren(this, []));

    /** m_estimatedSize (float) [READ] */
    estimatedSize = (_init_extra_effectChildren(this), _init_estimatedSize(this, 0));

    /** m_lodLevel (Tr2Lod - enum Tr2Lod) [READ] */
    lodLevel = (_init_extra_estimatedSize(this), _init_lodLevel(this, Tr2Lod.TR2_LOD_HIGH));

    /** m_mute (bool) [READWRITE, NOTIFY] */
    mute = (_init_extra_lodLevel(this), _init_mute(this, false));

    /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
    display = (_init_extra_mute(this), _init_display(this, true));

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_display(this), _init_name(this, ""));

    /** m_dynamicLODSelection (bool) [READWRITE, PERSIST] */
    dynamicLOD = (_init_extra_name(this), _init_dynamicLOD(this, false));

    /** m_scaling (Vector3) [READWRITE, PERSIST] */
    scaling = (_init_extra_dynamicLOD(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

    /** m_rotation (Quaternion) [READWRITE, PERSIST] */
    rotation = (_init_extra_scaling(this), _init_rotation(this, quat.create()));

    /** m_translation (Vector3) [READWRITE, PERSIST] */
    translation = (_init_extra_rotation(this), _init_translation(this, vec3.create()));

    /** m_effectDuration (float) [READWRITE, PERSIST] */
    duration = (_init_extra_translation(this), _init_duration(this, -1));

    /** m_secondaryLightingEmissiveColor (Color) [READWRITE, PERSIST] */
    secondaryLightingEmissiveColor = (_init_extra_duration(this), _init_secondaryLightingEmissiveColor(this, vec4.create()));

    /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
    curveSets = (_init_extra_secondaryLightingEmissiveColor(this), _init_curveSets(this, []));

    /** m_lights (PTr2LightVector) [READ, PERSIST] */
    lights = (_init_extra_curveSets(this), _init_lights(this, []));

    /** m_externalParameters (PTr2ExternalParameterVector) [READ, PERSIST] */
    externalParameters = (_init_extra_lights(this), _init_externalParameters(this, []));

    /** m_controllers (PITr2ControllerVector) [READ, PERSIST] */
    controllers = (_init_extra_externalParameters(this), _init_controllers(this, []));

    /** m_observers (PTriObserverLocalVector) [READ, PERSIST] */
    observers = (_init_extra_controllers(this), _init_observers(this, []));

    /** m_ballRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
    rotationCurve = (_init_extra_observers(this), _init_rotationCurve(this, null));

    /** m_secondaryLightingSphereRadiusLocal (float) [READWRITE, PERSIST] */
    secondaryLightingSphereRadius = (_init_extra_rotationCurve(this), _init_secondaryLightingSphereRadius(this, 0.5));

    /** m_boundingSphere.xyz, exposed by Carbon's MAPFLOATARRAYSIZE Blue mapping. */
    boundingSphereCenter = (_init_extra_secondaryLightingSphereRadius(this), _init_boundingSphereCenter(this, vec3.create()));

    /** m_boundingSphere.w (float) [READWRITE, PERSIST] */
    boundingSphereRadius = (_init_extra_boundingSphereCenter(this), _init_boundingSphereRadius(this, 0));

    /** m_modelTranslation (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
    modelTranslationCurve = (_init_extra_boundingSphereRadius(this), _init_modelTranslationCurve(this, null));

    /** m_modelRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
    modelRotationCurve = (_init_extra_modelTranslationCurve(this), _init_modelRotationCurve(this, null));

    /** m_ballPosition (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
    translationCurve = (_init_extra_modelRotationCurve(this), _init_translationCurve(this, null));
    #changeLOD = (_init_extra_translationCurve(this), true);
    #controllerVariables = new Map();
    #lastUpdateMatrix = mat4.create();
    #localTransform = mat4.create();
    #secondaryLightingSphereRadiusWorld = 0.5;
    #worldTransform = mat4.create();

    /** Links authored controllers after graph hydration. */
    Initialize() {
      for (const controller of this.controllers) {
        if (!controller?.IsLinked?.()) controller?.Link?.(this);
        _EveEffectRoot.#ApplyControllerVariables(controller, this.#controllerVariables, "SetVariable");
      }
      return true;
    }

    /** Adds and initializes a controller through Carbon's list-notify behavior. */
    AddController(controller) {
      this.controllers.push(controller);
      if (!controller?.IsLinked?.()) controller?.Link?.(this);
      _EveEffectRoot.#ApplyControllerVariables(controller, this.#controllerVariables, "SetVariable");
      return controller;
    }

    /** Removes and unlinks a controller through Carbon's list-notify behavior. */
    RemoveController(controller) {
      const index = this.controllers.indexOf(controller);
      if (index === -1) return false;
      this.controllers.splice(index, 1);
      controller?.Unlink?.();
      return true;
    }

    /** Evaluates root curves and updates children that require synchronous placement. */
    UpdateSyncronous(updateContext = null) {
      const time = _EveEffectRoot.#GetContextValue(updateContext, "GetTime", "currentTime", "time");
      this.UpdateWorldTransform(time);
      mat4.fromRotationTranslationScale(this.#localTransform, this.rotation, this.translation, this.scaling);
      // Carbon (row-vector): m_localTransform * m_worldTransform - local first.
      mat4.multiply(this.#lastUpdateMatrix, this.#worldTransform, this.#localTransform);
      this.#secondaryLightingSphereRadiusWorld = this.secondaryLightingSphereRadius * (this.scaling[0] + this.scaling[1] + this.scaling[2]) / 3;
      for (const observer of this.observers) observer?.Update?.(this.#lastUpdateMatrix);
      if (this.effectChildren.length) {
        const params = this.#CreateChildUpdateParams();
        for (const child of this.effectChildren) child?.UpdateSyncronous?.(updateContext, params);
      }
      return true;
    }

    /** Advances controllers, root curve sets, and effect children. */
    UpdateAsyncronous(updateContext = null) {
      let frequency = 0;
      if (this.display) {
        if (this.dynamicLOD) {
          const threshold = _EveEffectRoot.#GetContextValue(updateContext, "GetHighDetailThreshold", "highDetailThreshold");
          if (threshold > 0) frequency = Math.min(1, this.estimatedSize / threshold);
        } else {
          frequency = 0.5;
        }
      }
      this.UpdateControllers(frequency);
      const time = _EveEffectRoot.#GetContextValue(updateContext, "GetTime", "currentTime", "time");
      for (const curveSet of this.curveSets) curveSet?.Update?.(time, time);
      if (this.effectChildren.length) {
        const params = this.#CreateChildUpdateParams();
        params.controllerUpdateFrequency = frequency;
        for (const child of this.effectChildren) child?.UpdateAsyncronous?.(updateContext, params);
      }
      return frequency;
    }

    /** Updates dynamic LOD and forwards visibility to the effect children. */
    UpdateVisibility(updateContext = null, parentTransform = _EveEffectRoot.#identity) {
      if (!this.display) return false;
      if (this.dynamicLOD) {
        this.GetBoundingSphere(_EveEffectRoot.#localSphere);
        sph3.transformMat4(_EveEffectRoot.#worldSphere, _EveEffectRoot.#localSphere, this.#worldTransform);
        const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
        if (frustum?.IsSphereVisible?.(_EveEffectRoot.#worldSphere) !== false) {
          this.estimatedSize = Number(frustum?.GetPixelSizeAccross?.(_EveEffectRoot.#worldSphere) ?? this.estimatedSize) || 0;
        }
        const oldLod = this.lodLevel;
        this.lodLevel = Tr2Lod.TR2_LOD_LOW;
        const medium = _EveEffectRoot.#GetContextValue(updateContext, "GetMediumDetailThreshold", "mediumDetailThreshold");
        const low = _EveEffectRoot.#GetContextValue(updateContext, "GetLowDetailThreshold", "lowDetailThreshold");
        if (this.estimatedSize >= medium) this.lodLevel = Tr2Lod.TR2_LOD_HIGH;else if (this.estimatedSize >= low) this.lodLevel = Tr2Lod.TR2_LOD_MEDIUM;
        this.#changeLOD ||= oldLod !== this.lodLevel;
      }
      for (const child of this.effectChildren) {
        child?.UpdateVisibility?.(updateContext, parentTransform, this.lodLevel);
      }
      return true;
    }

    /** Collects child renderables after applying a pending LOD change. */
    GetRenderables(out = []) {
      if (!this.display) return out;
      if (this.#changeLOD) {
        this.#changeLOD = false;
        for (const child of this.effectChildren) child?.ChangeLOD?.(this.lodLevel);
      }
      for (const child of this.effectChildren) child?.GetRenderables?.(out);
      return out;
    }

    /** Advances every controller at the selected detail frequency. */
    UpdateControllers(updateFrequency) {
      for (const controller of this.controllers) controller?.Update?.(updateFrequency);
    }

    /** Returns the authored local bounding sphere. */
    GetBoundingSphere(out = vec4.create()) {
      vec4.set(out, this.boundingSphereCenter[0], this.boundingSphereCenter[1], this.boundingSphereCenter[2], this.boundingSphereRadius);
      return true;
    }

    /** Returns the authored bounding-sphere radius. */
    GetBoundingSphereRadius() {
      return this.boundingSphereRadius;
    }

    /** Evaluates the ball/model curves into the detached root transform. */
    UpdateWorldTransform(time) {
      _EveEffectRoot.#UpdateCurve(this.translationCurve, time, _EveEffectRoot.#translation, _EveEffectRoot.#zero);
      _EveEffectRoot.#UpdateCurve(this.rotationCurve, time, _EveEffectRoot.#rotation, _EveEffectRoot.#identityRotation);
      if (this.modelRotationCurve) {
        _EveEffectRoot.#UpdateCurve(this.modelRotationCurve, time, _EveEffectRoot.#modelRotation, _EveEffectRoot.#identityRotation);
        // Carbon (row-vector): rotation = modelRotation * rotation - model first.
        quat.multiply(_EveEffectRoot.#rotation, _EveEffectRoot.#rotation, _EveEffectRoot.#modelRotation);
      }
      mat4.fromRotationTranslation(this.#worldTransform, _EveEffectRoot.#rotation, _EveEffectRoot.#translation);
      if (this.modelTranslationCurve) {
        _EveEffectRoot.#UpdateCurve(this.modelTranslationCurve, time, _EveEffectRoot.#modelTranslation, _EveEffectRoot.#zero);
        vec3.transformMat4(_EveEffectRoot.#modelTranslation, _EveEffectRoot.#modelTranslation, this.#worldTransform);
        this.#worldTransform[12] = _EveEffectRoot.#modelTranslation[0];
        this.#worldTransform[13] = _EveEffectRoot.#modelTranslation[1];
        this.#worldTransform[14] = _EveEffectRoot.#modelTranslation[2];
      }
      return this.#worldTransform;
    }

    /** Updates and returns the model-center world position. */
    UpdateModelCenterWorldPosition(time, out = vec3.create()) {
      this.UpdateWorldTransform(time);
      mat4.fromRotationTranslationScale(this.#localTransform, this.rotation, this.translation, this.scaling);
      // Carbon (row-vector): currentTransform * m_worldTransform - local first.
      mat4.multiply(_EveEffectRoot.#centerTransform, this.#worldTransform, this.#localTransform);
      return vec3.transformMat4(out, this.boundingSphereCenter, _EveEffectRoot.#centerTransform);
    }

    /** Returns the last model-center world position without advancing curves. */
    GetModelCenterWorldPosition(out = vec3.create()) {
      return vec3.transformMat4(out, this.boundingSphereCenter, this.#lastUpdateMatrix);
    }

    /** Effect roots do not expose a local AABB in Carbon. */
    GetLocalBoundingBox(_min, _max) {
      return false;
    }

    /** Returns the last composed local-to-world transform. */
    GetLocalToWorldTransform(out = mat4.create()) {
      return mat4.copy(out, this.#lastUpdateMatrix);
    }

    /** Protected-equivalent read of Carbon's m_worldTransform
     * (EveEffectRoot2.h:219, protected) - the detached root transform
     * UpdateWorldTransform evaluates, WITHOUT the local SRT composition that
     * GetLocalToWorldTransform's #lastUpdateMatrix carries. EvePlanet reads the
     * member directly for the z-only depth-prepass drive (EvePlanet.cpp:137). */
    GetWorldTransform(out = mat4.create()) {
      return mat4.copy(out, this.#worldTransform);
    }

    /** Registers every child with an injected quad renderer. */
    RegisterWithQuadRenderer(quadRenderer) {
      for (const child of this.effectChildren) child?.RegisterWithQuadRenderer?.(quadRenderer);
    }

    /** Adds visible child quads to an injected renderer. */
    AddQuadsToQuadRenderer(frustum, quadRenderer) {
      if (!this.display) return;
      for (const child of this.effectChildren) child?.AddQuadsToQuadRenderer?.(frustum, quadRenderer);
    }

    /** Carbon EveEffectRoot2::RegisterComponents (cpp:496-513): LightOwner when
     * lights are authored, then forwards the effect children. Gate m_display. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.display) {
        if (this.lights.length) {
          registry.RegisterComponent(EveComponentType.LightOwner, this);
        }
        for (const child of this.effectChildren) {
          child?.Register?.(registry);
        }
      }
    }

    /** Carbon EveEffectRoot2::UnRegisterComponents (cpp:515-528): forwards the
     * effect children only (own components were already removed by
     * EveEntity::UnRegister, EveEntity.cpp:90); no display re-check. */
    UnRegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        for (const child of this.effectChildren) {
          child?.UnRegister?.(registry);
        }
      }
    }

    /** Adds authored lights using the effect's composed placement and average scale. */
    GetLights(lightManager) {
      if (!this.display) return;
      const transform = this.#lastUpdateMatrix;
      const scale = (Math.hypot(transform[0], transform[1], transform[2]) + Math.hypot(transform[4], transform[5], transform[6]) + Math.hypot(transform[8], transform[9], transform[10])) / 3;
      for (const light of this.lights) light?.AddLight?.(lightManager, transform, scale);
    }

    /** Adds an authored light. */
    AddLight(light) {
      this.lights.push(light);
      return light;
    }

    /** Removes all authored lights. */
    ClearLights() {
      this.lights.length = 0;
    }

    /** Initializes the portable child-facing space-object records. */
    GetPerObjectStructs(vsData = new _EveSpaceObjectVSData(), psData = new _EveSpaceObjectPSData()) {
      _EveEffectRoot.#ZeroNumericRecord(vsData);
      _EveEffectRoot.#ZeroNumericRecord(psData);
      vsData.shipData[1] = 1;
      vsData.shipData[3] = 1;
      psData.shipData[1] = 1;
      psData.shipData[3] = 1;
      return {
        vsData,
        psData
      };
    }

    /** Registers this root as a secondary light source with an injected manager. */
    RegisterSecondaryLightSource(manager) {
      return manager?.RegisterSecondaryLightSource?.(this.#worldTransform.subarray(12, 15), this.#secondaryLightingSphereRadiusWorld, _EveEffectRoot.#noAlbedo, this.secondaryLightingEmissiveColor);
    }

    /** Unregisters this root from an injected secondary-light manager. */
    UnregisterSecondaryLightSource(manager) {
      return manager?.UnregisterSecondaryLightSource?.(this.#worldTransform.subarray(12, 15));
    }

    /** Plays root and child-owned curve sets. */
    Start() {
      for (const curveSet of this.curveSets) curveSet?.Play?.();
      for (const child of this.effectChildren) {
        if (child?.PlayAllCurveSets) child.PlayAllCurveSets();else child?.PlayCurveSets?.();
      }
    }

    /** Stops root and child-owned curve sets. */
    Stop() {
      for (const curveSet of this.curveSets) curveSet?.Stop?.();
      for (const child of this.effectChildren) {
        if (child?.StopAllCurveSets) child.StopAllCurveSets();else child?.StopCurveSets?.();
      }
    }

    /** Effect roots have no damage locators. */
    GetDamageLocatorCount() {
      return 0;
    }

    /** Returns the detached root translation as the sole target point. */
    GetDamageLocatorPosition(_index, _inWorldSpace, out = vec3.create()) {
      vec3.set(out, this.#worldTransform[12], this.#worldTransform[13], this.#worldTransform[14]);
      return true;
    }

    /** Returns Carbon's constant +Y target direction. */
    GetDamageLocatorDirection(_index, _inWorldSpace, out = vec3.create()) {
      vec3.set(out, 0, 1, 0);
      return true;
    }

    /** Tests whether a projectile has reached the root target point. */
    GetImpactPosition(locator, _posPrev, posNow, epsilon, out = vec3.create()) {
      this.GetDamageLocatorPosition(locator, true, out);
      return vec3.squaredDistance(posNow, out) < Number(epsilon);
    }

    /** Effect roots never use shield impact geometry. */
    HasImpactConfigurationShield() {
      return false;
    }

    /** Effect roots use their only target point. */
    GetClosestDamageLocatorIndex(_position) {
      return 0;
    }

    /** Effect roots use their only target point. */
    GetGoodDamageLocatorIndex(_position) {
      return 0;
    }

    /** Returns the authored target radius. */
    GetRadius() {
      return this.boundingSphereRadius;
    }

    /** Effect roots do not create attached impact overlays. */
    CreateImpact(_damageLocatorIndex, _direction, _lifeTime, _size) {
      return -1;
    }

    /** Effect roots do not update attached impact overlays. */
    UpdateImpact(_out, _direction, _impactIndex) {
      return false;
    }

    /** Returns the detached root world position. */
    GetWorldPosition(out = vec3.create()) {
      return vec3.set(out, this.#worldTransform[12], this.#worldTransform[13], this.#worldTransform[14]);
    }

    /** Returns the authored local rotation composed with the detached root rotation. */
    GetWorldRotation(out = quat.create()) {
      mat4.getRotation(_EveEffectRoot.#worldRotation, this.#worldTransform);
      // Carbon (row-vector): m_rotation * RotationQuaternion(world) - local first.
      quat.multiply(out, _EveEffectRoot.#worldRotation, this.rotation);
      return quat.normalize(out, out);
    }

    /** Computes a miss point just outside the root's spherical silhouette. */
    GetMissPosition(hit, source, out = vec3.create()) {
      this.GetDamageLocatorPosition(-1, true, out);
      if (!hit || !source) return out;
      vec3.subtract(_EveEffectRoot.#missOffset, hit, out);
      vec3.subtract(_EveEffectRoot.#missDirection, hit, source);
      const directionLength = vec3.length(_EveEffectRoot.#missDirection);
      if (directionLength) vec3.scale(_EveEffectRoot.#missDirection, _EveEffectRoot.#missDirection, 1 / directionLength);
      vec3.scaleAndAdd(_EveEffectRoot.#missOffset, _EveEffectRoot.#missOffset, _EveEffectRoot.#missDirection, -vec3.dot(_EveEffectRoot.#missDirection, _EveEffectRoot.#missOffset));
      const offsetLength = vec3.length(_EveEffectRoot.#missOffset);
      if (offsetLength) vec3.scale(_EveEffectRoot.#missOffset, _EveEffectRoot.#missOffset, 1 / offsetLength);
      return vec3.scaleAndAdd(out, out, _EveEffectRoot.#missOffset, this.boundingSphereRadius * 1.125);
    }

    /** Returns the owned effect-child list. */
    GetChildren() {
      return this.effectChildren;
    }

    /** Decomposes a matrix into the authored local SRT fields. */
    SetTransform(transform) {
      mat4.getScaling(this.scaling, transform);
      mat4.getRotation(this.rotation, transform);
      mat4.getTranslation(this.translation, transform);
    }

    /** Plays matching root and child curve sets. */
    PlayCurveSet(name, rangeName = "") {
      const target = String(name ?? "");
      for (const curveSet of this.curveSets) {
        if ((curveSet?.GetName?.() ?? curveSet?.name) !== target) continue;
        if (rangeName) curveSet?.PlayTimeRange?.(rangeName);else {
          curveSet?.ResetTimeRange?.();
          curveSet?.Play?.();
        }
      }
      for (const child of this.effectChildren) child?.PlayCurveSet?.(target, rangeName);
    }

    /** Stops matching root and child curve sets. */
    StopCurveSet(name) {
      const target = String(name ?? "");
      for (const curveSet of this.curveSets) {
        if ((curveSet?.GetName?.() ?? curveSet?.name) === target) curveSet?.Stop?.();
      }
      for (const child of this.effectChildren) child?.StopCurveSet?.(target);
    }

    /** Samples matching root and child curve sets at an explicit time. */
    UpdateCurveSet(name, time) {
      const target = String(name ?? "");
      for (const curveSet of this.curveSets) {
        if ((curveSet?.GetName?.() ?? curveSet?.name) === target) curveSet?.Update?.(time, time);
      }
      for (const child of this.effectChildren) child?.UpdateCurveSet?.(target, time);
    }

    /** Returns the maximum duration of matching root and child curve sets. */
    GetCurveSetDuration(name) {
      const target = String(name ?? "");
      let duration = 0;
      for (const curveSet of this.curveSets) {
        if ((curveSet?.GetName?.() ?? curveSet?.name) === target) {
          duration = Math.max(duration, Number(curveSet?.GetMaxCurveDuration?.() ?? 0));
        }
      }
      for (const child of this.effectChildren) {
        duration = Math.max(duration, Number(child?.GetCurveSetDuration?.(target) ?? 0));
      }
      return duration;
    }

    /** Returns the maximum named range duration in matching root and child sets. */
    GetRangeDuration(name, rangeName) {
      const target = String(name ?? "");
      let duration = 0;
      for (const curveSet of this.curveSets) {
        if ((curveSet?.GetName?.() ?? curveSet?.name) === target) {
          duration = Math.max(duration, Number(curveSet?.GetRangeDuration?.(rangeName) ?? 0));
        }
      }
      for (const child of this.effectChildren) {
        duration = Math.max(duration, Number(child?.GetRangeDuration?.(target, rangeName) ?? 0));
      }
      return duration;
    }

    /** Collects the Carbon debug-option names and child options. */
    GetDebugOptions(options = new Set()) {
      options.add?.("Bounding Sphere");
      options.add?.("Lights");
      for (const observer of this.observers) observer?.GetDebugOptions?.(options);
      for (const child of this.effectChildren) child?.GetDebugOptions?.(options);
      return options;
    }

    /** Forwards root debug geometry to an injected debug renderer. */
    RenderDebugInfo(renderer) {
      if (renderer?.HasOption?.(this, "Bounding Sphere")) {
        renderer?.DrawSphere?.(this, this.boundingSphereCenter, this.boundingSphereRadius, 8, "wireframe", 0xffff00ff);
      }
      for (const child of this.effectChildren) child?.RenderDebugInfo?.(renderer);
      if (renderer?.HasOption?.(this, "Lights")) {
        for (const light of this.lights) light?.RenderDebugInfo?.(renderer, this.#worldTransform);
      }
      for (const observer of this.observers) observer?.RenderDebugInfo?.(renderer);
    }

    /** Stores and propagates a controller variable to current and future members. */
    SetControllerVariable(name, value) {
      const key = String(name ?? "");
      const next = Number(value);
      this.#controllerVariables.set(key, next);
      for (const controller of this.controllers) controller?.SetVariable?.(key, next);
      for (const child of this.effectChildren) child?.SetControllerVariable?.(key, next);
    }

    /** Propagates an event to controllers and effect children. */
    HandleControllerEvent(name) {
      const eventName = String(name ?? "");
      for (const controller of this.controllers) controller?.HandleEvent?.(eventName);
      for (const child of this.effectChildren) child?.HandleControllerEvent?.(eventName);
    }

    /** Starts controllers on the root and its effect children. */
    StartControllers() {
      for (const controller of this.controllers) controller?.Start?.();
      for (const child of this.effectChildren) child?.StartControllers?.();
    }

    /** Finds a named direct effect child. */
    GetEffectChildByName(name) {
      const target = String(name ?? "");
      for (const child of this.effectChildren) {
        if ((child?.GetName?.() ?? child?.name ?? "") === target) return child;
      }
      return null;
    }

    /** Adds and initializes an effect child through Carbon's list-notify behavior. */
    AddToEffectChildrenList(child) {
      this.effectChildren.push(child);
      _EveEffectRoot.#ApplyControllerVariables(child, this.#controllerVariables, "SetControllerVariable");
      child?.StartControllers?.();
      return child;
    }

    /** Removes an effect child. */
    RemoveFromEffectChildrenList(child) {
      const index = this.effectChildren.indexOf(child);
      if (index === -1) return false;
      this.effectChildren.splice(index, 1);
      return true;
    }

    /** Applies a shader option to every effect child. */
    SetShaderOption(name, value) {
      for (const child of this.effectChildren) child?.SetShaderOption?.(name, value);
    }

    /** Finds a named observer or child-owned sound emitter. */
    FindSoundEmitter(name) {
      const target = String(name ?? "");
      for (const observer of this.observers) {
        if ((observer?.name ?? "") === target) {
          return typeof observer.GetObserver === "function" ? observer.GetObserver() : observer.observer ?? null;
        }
      }
      for (const child of this.effectChildren) {
        const emitter = child?.FindSoundEmitter?.(target);
        if (emitter) return emitter;
      }
      return null;
    }

    /** Adds a placement observer. */
    AddObserver(observer) {
      this.observers.push(observer);
      return observer;
    }

    /** Applies the mute state to effect children and placement observers. */
    SetMute(isMute) {
      this.mute = !!isMute;
      for (const child of this.effectChildren) child?.SetMute?.(this.mute);
      for (const observer of this.observers) observer?.SetMute?.(this.mute);
    }

    /** Freezes every child at Carbon's high-detail LOD. */
    FreezeHighDetailMesh() {
      this.lodLevel = Tr2Lod.TR2_LOD_HIGH;
      this.#changeLOD = false;
      for (const child of this.effectChildren) child?.ChangeLOD?.(this.lodLevel);
    }

    /** Propagates a procedural-container variable to every effect child. */
    SetProceduralContainerVariable(name, value) {
      for (const child of this.effectChildren) child?.SetProceduralContainerVariable?.(name, value);
    }

    /**
     * Builds the per-frame child update parameters naming this root as the
     * space-object parent, carrying its display state and a copy of the current
     * root matrix.
     */
    #CreateChildUpdateParams() {
      const params = new _EveChildUpdateParams();
      params.spaceObjectParent = this;
      params.isVisible = this.display;
      mat4.copy(params.localToWorldTransform, this.#lastUpdateMatrix);
      return params;
    }

    /**
     * Replays every stored controller variable onto a newly added controller or
     * effect child through the named setter, so late additions start with the same
     * state.
     */

    /**
     * Reads a numeric value from the update context, preferring a getter method
     * and falling back to the named properties, and yields 0 when nothing supplies
     * it.
     */

    /**
     * Samples a curve into out through whichever of Update or GetValueAt it
     * exposes, writing the fallback when there is no curve and copying back curves
     * that return a new array instead of filling out.
     */

    /**
     * Zeroes every numeric, typed-array and array field of a per-object record in
     * place, so the record can be refilled from a known-clean state.
     */
  }];
  #ApplyControllerVariables(target, variables, methodName) {
    const setter = target?.[methodName];
    if (typeof setter !== "function") return;
    for (const [name, value] of variables) setter.call(target, name, value);
  }
  #GetContextValue(context, methodName, ...propertyNames) {
    const method = context?.[methodName];
    if (typeof method === "function") return Number(method.call(context)) || 0;
    for (const propertyName of propertyNames) {
      if (context?.[propertyName] !== undefined && context?.[propertyName] !== null) {
        return Number(context[propertyName]) || 0;
      }
    }
    return 0;
  }
  #UpdateCurve(curve, time, out, fallback) {
    if (!curve) {
      for (let index = 0; index < out.length; index++) out[index] = fallback[index];
      return out;
    }
    let result;
    if (typeof curve.Update === "function") result = curve.Update(time, out);else if (typeof curve.GetValueAt === "function") result = curve.GetValueAt(time, out);
    if ((Array.isArray(result) || ArrayBuffer.isView(result)) && result !== out) {
      for (let index = 0; index < out.length; index++) out[index] = result[index];
    }
    return out;
  }
  #ZeroNumericRecord(record) {
    for (const [name, value] of Object.entries(record)) {
      if (typeof value === "number") record[name] = 0;else if (ArrayBuffer.isView(value)) value.fill(0);else if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index++) {
          if (typeof value[index] === "number") value[index] = 0;else if (ArrayBuffer.isView(value[index])) value[index].fill(0);
        }
      }
    }
  }
  #identity = mat4.create();
  #centerTransform = mat4.create();
  #localSphere = vec4.create();
  #worldSphere = vec4.create();
  #zero = vec3.create();
  #translation = vec3.create();
  #modelTranslation = vec3.create();
  #missOffset = vec3.create();
  #missDirection = vec3.create();
  #identityRotation = quat.create();
  #rotation = quat.create();
  #modelRotation = quat.create();
  #worldRotation = quat.create();
  #noAlbedo = vec4.create();
  Tr2Lod = Tr2Lod;
  constructor() {
    super(_EveEffectRoot), _initClass();
  }
}();

export { _EveEffectRoot as EveEffectRoot2 };
//# sourceMappingURL=EveEffectRoot2.js.map
