import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { sph3 } from '@carbonenginejs/runtime-utils/sph3';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { getBoneList } from '../../core/animation/Tr2GrannyAnimation.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform, applyTransformModifiers } from './EveChildTransform.js';
import { EveChildInheritProperties as _EveChildInheritPrope } from './EveChildInheritProperties.js';
import { EveChildUpdateParams as _EveChildUpdateParams } from '../EveChildUpdateParams.js';
import { EveComponentType } from '../EveComponentTypes.js';
import { Origin } from '../../generated/eve/child/enums.js';
import { Tr2RenderReason, TR2SHADERMODEL } from '../../generated/trinityCore/enums.js';
import { Tr2Lod } from '@carbonenginejs/runtime-utils/const/trinity';
import '../../core/rawData/Tr2PerObjectData.js';
import { createChildPerObjectRecords, inheritParentPerObjectData, stampChildTransforms } from '../perObjectData/childPerObjectRecords.js';

let _initProto, _initClass, _init_displayFilter, _init_extra_displayFilter, _init_objects, _init_extra_objects, _init_transformModifiers, _init_extra_transformModifiers, _init_curveSets, _init_extra_curveSets, _init_worldTransform, _init_extra_worldTransform, _init_mute, _init_extra_mute, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_localTransform, _init_extra_localTransform, _init_staticTransform, _init_extra_staticTransform, _init_alwaysOn, _init_extra_alwaysOn, _init_updateOnDisplay, _init_extra_updateOnDisplay, _init_attachments, _init_extra_attachments, _init_observers, _init_extra_observers, _init_fxAttributes, _init_extra_fxAttributes, _init_lights, _init_extra_lights, _init_controllers, _init_extra_controllers, _init_inheritProperties, _init_extra_inheritProperties, _init_useSRT, _init_extra_useSRT, _init_useStaticRotation, _init_extra_useStaticRotation, _init_useStaticScale, _init_extra_useStaticScale, _init_animationOwner, _init_extra_animationOwner, _init_origin, _init_extra_origin, _init_isPlacementRoot, _init_extra_isPlacementRoot;

// Module scratch (read-only zero vector; container recursion forbids mutable
// module scratch here - see GetBoundingSphere).
const ZERO_VEC3 = vec3.create();

/**
 * Space-object child that groups other children under one transform, owning
 * their curve sets, controllers, observers, lights, attachments and transform
 * modifiers, and gating them on a display-quality filter.
 */
let _EveChildContainer;
new class extends _identity {
  static [class EveChildContainer extends _EveChildTransform {
    static {
      ({
        e: [_init_displayFilter, _init_extra_displayFilter, _init_objects, _init_extra_objects, _init_transformModifiers, _init_extra_transformModifiers, _init_curveSets, _init_extra_curveSets, _init_worldTransform, _init_extra_worldTransform, _init_mute, _init_extra_mute, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_localTransform, _init_extra_localTransform, _init_staticTransform, _init_extra_staticTransform, _init_alwaysOn, _init_extra_alwaysOn, _init_updateOnDisplay, _init_extra_updateOnDisplay, _init_attachments, _init_extra_attachments, _init_observers, _init_extra_observers, _init_fxAttributes, _init_extra_fxAttributes, _init_lights, _init_extra_lights, _init_controllers, _init_extra_controllers, _init_inheritProperties, _init_extra_inheritProperties, _init_useSRT, _init_extra_useSRT, _init_useStaticRotation, _init_extra_useStaticRotation, _init_useStaticScale, _init_extra_useStaticScale, _init_animationOwner, _init_extra_animationOwner, _init_origin, _init_extra_origin, _init_isPlacementRoot, _init_extra_isPlacementRoot, _initProto],
        c: [_EveChildContainer, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildContainer",
        family: "eve/child"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, type.enum("DisplayQualityModifier")], 16, "displayFilter"], [[io, io.persist, void 0, type.list("IEveSpaceObjectChild")], 16, "objects"], [[io, io.persist, void 0, type.list("IEveChildTransformModifier")], 16, "transformModifiers"], [[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.read, type, type.mat4], 16, "worldTransform"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "mute"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.mat4], 16, "localTransform"], [[io, io.persist, type, type.boolean], 16, "staticTransform"], [[io, io.persist, type, type.boolean], 16, "alwaysOn"], [[io, io.persist, type, type.boolean], 16, "updateOnDisplay"], [[io, io.persist, void 0, type.list("IEveSpaceObjectAttachment")], 16, "attachments"], [[io, io.persist, void 0, type.list("TriObserverLocal")], 16, "observers"], [[io, io.persist, void 0, type.list("IEveFxAttribute")], 16, "fxAttributes"], [[io, io.persist, void 0, type.list("Tr2Light")], 16, "lights"], [[io, io.persist, void 0, type.list("ITr2Controller")], 16, "controllers"], [[io, io.persist, void 0, type.objectRef("EveChildInheritProperties")], 16, "inheritProperties"], [[io, io.persist, type, type.boolean], 16, "useSRT"], [[io, io.persist, type, type.boolean], 16, "useStaticRotation"], [[io, io.persist, type, type.boolean], 16, "useStaticScale"], [[io, io.persist, void 0, type.objectRef("ITr2GrannyAnimationOwner")], 16, "animationOwner"], [[io, io.persist, type, type.int32, void 0, type.enum("Origin")], 16, "origin"], [[io, io.persist, type, type.boolean], 16, "isPlacementRoot"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Registry re-registration on display/displayFilter changes is engine-owned; the mute fan-out side effect is ported.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "Setup"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetOrigin"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetAlwaysOn"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsAlwaysOn"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDisplayQualityModifier"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMute"], [[carbon, carbon.method, impl, impl.implemented], 18, "MuteChildren"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddTransformModifier"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddObserver"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddController"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "HandleControllerEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartControllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetProceduralContainerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEffectChildByName"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddToEffectChildrenList"], [[carbon, carbon.method, impl, impl.implemented], 18, "RemoveFromEffectChildrenList"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetAnimationOwner"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetIsPlacementRoot"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddAttachment"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearAttachments"], [[carbon, carbon.method, impl, impl.implemented], 18, "Empty"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.adapted, void 0, impl.reason("The GPU bone ring buffer, task-group dispatch, per-object VS/PS struct refresh, and the Granny bone-list override are engine/animation seams; the CPU update fan-out is ported.")], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocalToWorldTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "ChangeLOD"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLights"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("GPU ring-buffer offsets have no CPU derivation and keep their defaults; every CPU-known field is filled.")], 18, "GetPerObjectData"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasRenderables"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reads the Tr2Renderer shader-model global; the browser runtime stamps EveChildContainer.shaderModel (default TR2SM_3_0_DEPTH, the DX11 depth path EVE ships).")], 18, "IsRendering"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsUpdating"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "PlayCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "PlayAllCurveSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopAllCurveSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurveSetDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRangeDuration"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The bool + float& out-param pair collapses to value-or-null in JS.")], 18, "GetControllerValueByName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetWorldVelocity"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetOwnerMaxSpeed"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetInheritProperties"], [[carbon, carbon.method, impl, impl.implemented], 18, "FindSoundEmitter"]], 0, void 0, _EveChildTransform));
    }
    displayFilter = (_initProto(this), _init_displayFilter(this, 5));
    objects = (_init_extra_displayFilter(this), _init_objects(this, []));
    transformModifiers = (_init_extra_objects(this), _init_transformModifiers(this, []));
    curveSets = (_init_extra_transformModifiers(this), _init_curveSets(this, []));
    worldTransform = (_init_extra_curveSets(this), _init_worldTransform(this, mat4.create()));
    mute = (_init_extra_worldTransform(this), _init_mute(this, false));
    display = (_init_extra_mute(this), _init_display(this, true));
    name = (_init_extra_display(this), _init_name(this, ""));
    translation = (_init_extra_name(this), _init_translation(this, vec3.create()));
    rotation = (_init_extra_translation(this), _init_rotation(this, quat.create()));
    scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));
    localTransform = (_init_extra_scaling(this), _init_localTransform(this, mat4.create()));
    staticTransform = (_init_extra_localTransform(this), _init_staticTransform(this, false));
    alwaysOn = (_init_extra_staticTransform(this), _init_alwaysOn(this, false));
    updateOnDisplay = (_init_extra_alwaysOn(this), _init_updateOnDisplay(this, true));
    attachments = (_init_extra_updateOnDisplay(this), _init_attachments(this, []));
    observers = (_init_extra_attachments(this), _init_observers(this, []));
    fxAttributes = (_init_extra_observers(this), _init_fxAttributes(this, []));
    lights = (_init_extra_fxAttributes(this), _init_lights(this, []));
    controllers = (_init_extra_lights(this), _init_controllers(this, []));
    inheritProperties = (_init_extra_controllers(this), _init_inheritProperties(this, null));
    useSRT = (_init_extra_inheritProperties(this), _init_useSRT(this, true));
    useStaticRotation = (_init_extra_useSRT(this), _init_useStaticRotation(this, false));
    useStaticScale = (_init_extra_useStaticRotation(this), _init_useStaticScale(this, false));

    // SOF-authored placement values; persisted so the values interchange
    // reproduces Carbon's hidden container placement state.
    animationOwner = (_init_extra_useStaticScale(this), _init_animationOwner(this, null));
    origin = (_init_extra_animationOwner(this), _init_origin(this, 0));
    isPlacementRoot = (_init_extra_origin(this), _init_isPlacementRoot(this, false));
    #controllerVariables = (_init_extra_isPlacementRoot(this), new Map());

    // Carbon m_worldVelocity/m_ownerMaxSpeed/m_activationStrength/m_hasUpdated:
    // runtime-only frame state (never persisted; Carbon keeps them out of the
    // Blue surface too).
    #worldVelocity = vec3.create();
    #ownerMaxSpeed = 0;
    #activationStrength = 1;

    /** m_vsData / m_psData - this container's PERSISTENT per-object pair. */
    #perObjectData = createChildPerObjectRecords();

    /** Carbon's local `lastWorldTransform`, kept across frames here. */
    #lastWorldTransform = mat4.create();
    #hasUpdated = false;

    /**
     * Links every authored controller that is not already linked to this
     * container, so controller variables and events reach them.
     */
    Initialize() {
      for (const controller of this.controllers) {
        if (!controller?.IsLinked?.()) {
          controller?.Link?.(this);
        }
      }
      return true;
    }

    /** Carbon EveChildContainer::OnModified (cpp:76-88): display/displayFilter
     * changes re-register with the scene component registry (engine-owned,
     * omitted); a mute change fans out to children and observers. The value
     * argument follows the repo's OnModified duck (field name or field value). */
    OnModified(value = null) {
      if (value === "mute" || value === this.mute) {
        this.MuteChildren();
      }
      return true;
    }

    /**
     * Applies the authored scale/rotation/translation through the shared child
     * transform setup and returns the rebuilt local transform; lowestLodVisible is
     * accepted for signature parity only.
     */
    Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null) {
      return super.Setup(scale, rotation, translation, lowestLodVisible);
    }

    /**
     * Returns the authored container name, which GetEffectChildByName matches
     * against on the parent side.
     */
    GetName() {
      return this.name;
    }

    /** Sets the authored container name, coercing nullish to the empty string. */
    SetName(name) {
      this.name = String(name ?? "");
    }

    /**
     * Records whether this container's placement was authored in space or by SOF
     * (the Origin enum).
     */
    SetOrigin(origin) {
      this.origin = Number(origin) | 0;
    }

    /** Stores the always-on flag that IsAlwaysOn reports to the owner. */
    SetAlwaysOn(alwaysOn) {
      this.alwaysOn = !!alwaysOn;
    }

    /** Reports the authored always-on flag. */
    IsAlwaysOn() {
      return this.alwaysOn;
    }

    /**
     * Sets the display-quality filter that IsRendering tests the current shader
     * model against, which in turn gates every update and render path on this
     * container.
     */
    SetDisplayQualityModifier(filter) {
      this.displayFilter = Number(filter) | 0;
    }

    /**
     * Sets the mute flag and, only when it changes, pushes it down to the
     * contained children and local observers.
     */
    SetMute(mute) {
      const next = !!mute;
      if (next !== this.mute) {
        this.mute = next;
        this.MuteChildren();
      }
    }

    /**
     * Pushes this container's current mute flag onto every contained child and
     * local observer - it mutates their state, not the container's.
     */
    MuteChildren() {
      for (const child of this.objects) {
        child?.SetMute?.(this.mute);
      }
      for (const observer of this.observers) {
        observer?.SetMute?.(this.mute);
      }
    }

    /**
     * Appends a transform modifier; modifiers fold over the container's world
     * transform in insertion order on each async update.
     */
    AddTransformModifier(modifier) {
      this.transformModifiers.push(modifier);
    }

    /**
     * Appends a local audio observer, which is re-placed from the container's
     * world transform on every sync update.
     */
    AddObserver(observer) {
      this.observers.push(observer);
    }

    /**
     * Appends a controller, links it to this container, and replays every
     * controller variable set so far onto it so it starts in sync.
     */
    AddController(controller) {
      this.controllers.push(controller);
      controller?.Link?.(this);
      for (const [name, value] of this.#controllerVariables) {
        controller?.SetVariable?.(name, value);
      }
    }

    /**
     * Records a named float variable, pushes it to every controller on this
     * container, and recurses into the contained children; the recorded value is
     * also replayed onto controllers and children added later.
     */
    SetControllerVariable(name, value) {
      const key = String(name ?? "");
      const next = Number(value);
      this.#controllerVariables.set(key, next);
      for (const controller of this.controllers) {
        controller?.SetVariable?.(key, next);
      }
      for (const child of this.objects) {
        child?.SetControllerVariable?.(key, next);
      }
    }

    /**
     * Fires a named controller event on every controller here and recurses into
     * the contained children.
     */
    HandleControllerEvent(name) {
      const eventName = String(name ?? "");
      for (const controller of this.controllers) {
        controller?.HandleEvent?.(eventName);
      }
      for (const child of this.objects) {
        child?.HandleControllerEvent?.(eventName);
      }
    }

    /** Starts every controller here and recurses into the contained children. */
    StartControllers() {
      for (const controller of this.controllers) {
        controller?.Start?.();
      }
      for (const child of this.objects) {
        child?.StartControllers?.();
      }
    }

    /**
     * Forwards a procedural container variable to the contained children; a plain
     * container holds none of its own.
     */
    SetProceduralContainerVariable(name, value) {
      for (const child of this.objects) {
        child?.SetProceduralContainerVariable?.(name, value);
      }
    }

    /**
     * Returns the first direct child whose GetName()/name matches, or null; the
     * search does not recurse into nested containers.
     */
    GetEffectChildByName(name) {
      const target = String(name ?? "");
      for (const child of this.objects) {
        if ((child?.GetName?.() ?? child?.name ?? "") === target) {
          return child;
        }
      }
      return null;
    }

    /**
     * Appends a child and replays every controller variable set so far onto it,
     * then returns that same child.
     */
    AddToEffectChildrenList(child) {
      this.objects.push(child);
      for (const [name, value] of this.#controllerVariables) {
        child?.SetControllerVariable?.(name, value);
      }
      return child;
    }

    /** Removes a child by identity and reports whether it was present. */
    RemoveFromEffectChildrenList(child) {
      const index = this.objects.indexOf(child);
      if (index !== -1) {
        this.objects.splice(index, 1);
        return true;
      }
      return false;
    }

    /**
     * Forwards a shader option to every contained child and attachment; the
     * container compiles nothing itself.
     */
    SetShaderOption(name, value) {
      for (const child of this.objects) {
        child?.SetShaderOption?.(name, value);
      }
      for (const attachment of this.attachments) {
        attachment?.SetShaderOption?.(name, value);
      }
    }

    /**
     * Stores the Granny animation owner supplied by SOF placement; the bone-list
     * override that would consume it awaits the JS animation seam.
     */
    SetAnimationOwner(animationOwner) {
      this.animationOwner = animationOwner ?? null;
    }

    /**
     * Flags this container as a SOF placement root - authored placement state,
     * persisted for interchange parity, with no consumer inside the container
     * itself.
     */
    SetIsPlacementRoot(isPlacementRoot) {
      this.isPlacementRoot = !!isPlacementRoot;
    }

    /**
     * Appends an attachment; attachments are the only thing a container renders
     * itself (HasRenderables) and the only thing GetBatches submits.
     */
    AddAttachment(attachment) {
      this.attachments.push(attachment);
    }

    /**
     * Drops every attachment, which also stops the container from contributing any
     * renderable of its own.
     */
    ClearAttachments() {
      this.attachments.length = 0;
    }

    /**
     * Reports whether the container owns nothing at all - no children, lights,
     * attachments, controllers, curve sets, transform modifiers or observers.
     */
    Empty() {
      return this.objects.length === 0 && this.lights.length === 0 && this.attachments.length === 0 && this.controllers.length === 0 && this.curveSets.length === 0 && this.transformModifiers.length === 0 && this.observers.length === 0;
    }

    /**
     * Sync-side frame update (Carbon EveChildContainer::UpdateSyncronous,
     * cpp:496-518): gate on IsUpdating, remember the owner max speed, then
     * recurse into the children with childParent params rebased onto this
     * container's world transform, and refresh the local observers.
     * @param {Object} updateContext - frame context (EveUpdateContext)
     * @param {EveChildUpdateParams} params
     */
    UpdateSyncronous(updateContext, params) {
      if (!this.IsUpdating()) {
        return;
      }
      this.#ownerMaxSpeed = Number(params?.ownerMaxSpeed) || 0;
      const newParams = _EveChildContainer.#DeriveChildParams(params);
      newParams.isVisible = params?.isVisible !== false && this.display;
      newParams.childParent = this;
      mat4.copy(newParams.localToWorldTransform, this.worldTransform);
      for (const child of this.objects) {
        child?.UpdateSyncronous?.(updateContext, newParams);
      }
      for (const observer of this.observers) {
        observer?.Update?.(this.worldTransform);
      }
    }

    /**
     * Per-frame async update (Carbon EveChildContainer::UpdateAsyncronous +
     * DoUpdateAsyncronous, cpp:520-641): rebuild the world transform from the
     * parent, tick the controllers, fold the transform modifiers, then recurse
     * into the children with childParent params, update the curve sets and fx
     * attributes, and refresh light/attachment bone state. Carbon's wrapper
     * advances the GPU bone ring buffer and may dispatch the body onto the
     * placement task group (cpp:522-538) - both engine-owned, so the JS port
     * runs the DoUpdateAsyncronous body inline behind the same IsUpdating gate.
     * @param {Object} updateContext - frame context (EveUpdateContext), threaded to modifiers
     * @param {EveChildUpdateParams} params - localToWorldTransform + boneCount/bones
     * @returns {Float32Array} worldTransform
     */
    UpdateAsyncronous(updateContext, params) {
      if (!this.IsUpdating()) {
        return this.worldTransform;
      }
      const parentTransform = params?.localToWorldTransform;

      // Carbon captures the OUTGOING transform before rebuilding.
      mat4.copy(this.#lastWorldTransform, this.worldTransform);
      if (parentTransform && parentTransform.length === 16) {
        this.UpdateTransform(parentTransform);
      }

      // Carbon cpp:576-589: inherit the hull's per-object values, rebase the clip
      // data by this child's translation, then stamp our own transforms.
      inheritParentPerObjectData(this.#perObjectData, params?.spaceObjectParent, this.translation);
      stampChildTransforms(this.#perObjectData, this.worldTransform, this.#lastWorldTransform);
      const frequency = params?.controllerUpdateFrequency ?? 0.5;
      for (const controller of this.controllers) {
        controller?.Update?.(frequency);
      }

      // Carbon's DoUpdateAsyncronous overrides boneCount/bones from this
      // container's own animation controller here (Tr2GrannyAnimationUtils::
      // GetBoneList, cpp:556-559) before folding modifiers. AttachToBone already
      // consumes an explicitly threaded params palette; overriding that palette
      // from the animation controller remains deferred until the Granny
      // bone-list API is ported.
      const boneCount = params?.boneCount ?? 0;
      const bones = params?.bones ?? null;
      applyTransformModifiers(this, updateContext, boneCount, bones);
      this.#activationStrength = Number(params?.activationStrength ?? 1);

      // Carbon (cpp:568-590): when attachments exist the per-object VS/PS
      // structs are refreshed from the parent. This port retains persistent
      // RawData and returns it from GetPerObjectData; no live-object serializer
      // indirection is involved.

      const newParams = _EveChildContainer.#DeriveChildParams(params);
      newParams.isVisible = params?.isVisible !== false && this.display;
      newParams.childParent = this;
      newParams.boneCount = boneCount;
      newParams.bones = bones;
      mat4.copy(newParams.localToWorldTransform, this.worldTransform);

      // Carbon (cpp:599-610): a space-object-rooted container samples the
      // owner's world velocity; nested containers inherit it via params.
      if (params?.spaceObjectParent) {
        if (!params.childParent) {
          const velocity = params.spaceObjectParent.GetWorldVelocity?.(this.#worldVelocity) ?? params.spaceObjectParent.worldVelocity;
          if (velocity && velocity !== this.#worldVelocity) {
            vec3.copy(this.#worldVelocity, velocity);
          }
          vec3.copy(newParams.worldVelocity, this.#worldVelocity);
        } else {
          vec3.copy(this.#worldVelocity, params.worldVelocity ?? ZERO_VEC3);
        }
      }
      for (const child of this.objects) {
        child?.UpdateAsyncronous?.(updateContext, newParams);
      }

      // Carbon (cpp:617-624): container-owned curve sets tick with the frame
      // time as BOTH realTime and simTime.
      if (this.curveSets.length) {
        const time = Number(updateContext?.GetTime?.() ?? updateContext?.currentTime ?? updateContext?.time ?? 0);
        for (const curveSet of this.curveSets) {
          curveSet?.Update?.(time, time);
        }
      }
      for (const fxAttribute of this.fxAttributes) {
        fxAttribute?.UpdateAsyncronous?.(updateContext, newParams);
      }
      for (const light of this.lights) {
        light?.SetBoneMatrix?.(bones, boneCount);
      }
      for (const attachment of this.attachments) {
        attachment?.UpdateLights?.(this.worldTransform, bones, boneCount, this.#activationStrength, 0);
      }
      this.#hasUpdated = true;
      return this.worldTransform;
    }

    /**
     * Frame visibility fan-out (Carbon EveChildContainer::UpdateVisibility,
     * cpp:379-410): gate on display/IsUpdating, recurse into the children with
     * the unchanged parent transform/LOD, then refresh attachment visibility
     * against this container's world transform.
     * @param {Object} updateContext - frame context (frustum ducks)
     * @param {Float32Array} parentTransform
     * @param {Number} parentLod - parent Tr2Lod level
     * @returns {Boolean} whether the fan-out ran
     */
    UpdateVisibility(updateContext, parentTransform = null, parentLod = Tr2Lod.TR2_LOD_HIGH) {
      if (!this.display) {
        return false;
      }
      if (!this.IsUpdating()) {
        return false;
      }
      for (const child of this.objects) {
        child?.UpdateVisibility?.(updateContext, parentTransform, parentLod);
      }
      if (this.HasRenderables()) {
        // cpp:398-409 - the container has no updater of its own; the palette
        // comes from whichever object owns the animation.
        const {
          bones,
          boneCount
        } = getBoneList(this.animationOwner?.GetAnimationController?.());
        for (const attachment of this.attachments) {
          attachment?.UpdateVisibility?.(updateContext, this.worldTransform, bones, boneCount);
        }
      }
      return true;
    }

    /** Carbon EveChildContainer::GetRenderables (cpp:412-432): the container
     * itself renders only when it owns attachments; children always recurse. */
    GetRenderables(out = []) {
      if (!this.display || !this.#hasUpdated) {
        return out;
      }
      if (!this.IsRendering()) {
        return out;
      }
      if (this.HasRenderables()) {
        out.push(this);
      }
      for (const child of this.objects) {
        child?.GetRenderables?.(out);
      }
      return out;
    }

    /** Carbon EveChildContainer::GetBoundingSphere (cpp:434-452): the union of
     * the children's spheres (BoundingSphereSetOrUpdate -> sph3.union). The
     * child sphere is a per-call local rather than module scratch because
     * containers nest - a shared scratch would be clobbered between recursion
     * levels; this is a bounds query, not the per-frame update hot path. */
    GetBoundingSphere(out = vec4.create(), _query = 0) {
      if (!this.IsUpdating()) {
        return false;
      }
      const childSphere = vec4.create();
      let success = false;
      for (const child of this.objects) {
        if (child?.GetBoundingSphere?.(childSphere)) {
          if (success) {
            sph3.union(out, out, childSphere);
          } else {
            vec4.copy(out, childSphere);
          }
          success = true;
        }
      }
      return success;
    }

    /** Carbon EveChildContainer::GetLocalToWorldTransform (cpp:644-647); the
     * optional out follows the EveChildInstancedMeshes copy-out shape. */
    GetLocalToWorldTransform(out = null) {
      if (out) {
        return mat4.copy(out, this.worldTransform);
      }
      return this.worldTransform;
    }

    /** Carbon EveChildContainer::ChangeLOD (cpp:649-655): fan-out only. */
    ChangeLOD(lod) {
      for (const child of this.objects) {
        child?.ChangeLOD?.(lod);
      }
    }

    /** Carbon EveChildContainer::GetLights (cpp:657-675): each light is added
     * with the container world transform and the average basis-length scaling
     * ((|X| + |Y| + |Z|) / 3 of the world basis rows - single-matrix reads, no
     * composition). The light manager is duck-typed. */
    GetLights(lightManager) {
      if (!this.display || !this.#hasUpdated) {
        return;
      }
      if (!this.IsRendering()) {
        return;
      }
      const m = this.worldTransform;
      const scaling = (Math.hypot(m[0], m[1], m[2]) + Math.hypot(m[4], m[5], m[6]) + Math.hypot(m[8], m[9], m[10])) / 3;
      for (const light of this.lights) {
        light?.AddLight?.(lightManager, m, scaling);
      }
    }

    /** Carbon EveChildContainer::GetBatches (cpp:1134-1143): attachments only,
     * gated on display, the NORMAL render reason, and a non-zero activation
     * strength. Returns whether any batch was committed (JS addition; Carbon
     * returns void). */
    GetBatches(batches, batchType, perObjectData, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL) {
      if (!this.display || reason !== Tr2RenderReason.TR2RENDERREASON_NORMAL || this.#activationStrength === 0) {
        return false;
      }
      let committed = false;
      for (const attachment of this.attachments) {
        committed = attachment?.GetBatches?.(batches, batchType, perObjectData, reason) === true || committed;
      }
      return committed;
    }

    /** Carbon EveChildContainer::HasTransparentBatches (cpp:1145-1148). */
    HasTransparentBatches() {
      return false;
    }

    /** Carbon EveChildContainer::GetSortValue (cpp:1150-1153). */
    GetSortValue() {
      return 0;
    }

    /**
     * Carbon EveChildContainer::GetPerObjectData (cpp:1180-1203): uploads the
     * animation owner's bone palette, then hands back a handle over this
     * container's two PERSISTENT buffers. The ring offsets are GPU addresses with
     * no CPU derivation and keep their defaults; the bone COUNT is CPU-known.
     */
    GetPerObjectData(_accumulator = null) {
      const updater = this.animationOwner?.animationUpdater ?? this.animationUpdater;
      if (updater?.IsInitialized?.()) {
        this.#perObjectData.vs.SetIndex("boneOffsets", 2, [updater.GetMeshBoneCount?.() ?? 0]);
      }
      return {
        vs: this.#perObjectData.vs,
        ps: this.#perObjectData.ps
      };
    }

    /** Carbon EveChildContainer::HasRenderables (cpp:1129-1132): the container
     * renders only for its attachments. */
    HasRenderables() {
      return this.attachments.length > 0;
    }

    /** Carbon EveChildContainer::IsRendering (cpp:334-362): whether the current
     * shader model passes this container's display filter. */
    IsRendering() {
      const settings = _EveChildContainer.shaderModel;
      const filter = _EveChildContainer.DisplayQualityModifier;
      if (settings === TR2SHADERMODEL.TR2SM_AUTHORING && this.displayFilter !== filter.ONLY_REFLECTIONS) {
        return true;
      }
      switch (this.displayFilter) {
        case filter.SHADER_LOW:
          return settings === TR2SHADERMODEL.TR2SM_3_0_LO;
        case filter.SHADER_LOWMID:
          return settings <= TR2SHADERMODEL.TR2SM_3_0_HI;
        case filter.SHADER_MED:
          return settings === TR2SHADERMODEL.TR2SM_3_0_HI;
        case filter.SHADER_HIGHMID:
          return settings >= TR2SHADERMODEL.TR2SM_3_0_HI;
        case filter.SHADER_HIGH:
          return settings === TR2SHADERMODEL.TR2SM_3_0_DEPTH;
        case filter.SHADER_ALL:
          return true;
        case filter.ONLY_REFLECTIONS:
          return false;
      }
      return false;
    }

    /** Carbon EveChildContainer::IsUpdating (cpp:364-367). */
    IsUpdating() {
      return (this.display || !this.updateOnDisplay) && (this.IsRendering() || this.displayFilter === _EveChildContainer.DisplayQualityModifier.ONLY_REFLECTIONS);
    }

    /** Carbon EveChildContainer::RegisterComponents (cpp:258-284): LightOwner
     * when lights are authored, then forwards the contained objects and the
     * attachments. Gate m_display && IsUpdating(). */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.display && this.IsUpdating()) {
        if (this.lights.length) {
          registry.RegisterComponent(EveComponentType.LightOwner, this);
        }
        for (const object of this.objects) {
          object?.Register?.(registry);
        }
        for (const attachment of this.attachments) {
          attachment?.Register?.(registry);
        }
      }
    }

    /** Carbon EveChildContainer::UnRegisterComponents (cpp:290-311): forwards
     * the contained objects and attachments only (own components were already
     * removed by EveEntity::UnRegister, EveEntity.cpp:90); no display/IsUpdating
     * re-check. */
    UnRegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        for (const object of this.objects) {
          object?.UnRegister?.(registry);
        }
        for (const attachment of this.attachments) {
          attachment?.UnRegister?.(registry);
        }
      }
    }

    /** Carbon EveChildContainer::PlayCurveSet (cpp:682-712): named own sets play
     * (or play a named range); children recurse via the curve-set-owner duck. */
    PlayCurveSet(name, rangeName = "") {
      if (!this.IsUpdating()) {
        return;
      }
      const target = String(name ?? "");
      for (const curveSet of this.curveSets) {
        if ((curveSet?.GetName?.() ?? curveSet?.name) !== target) {
          continue;
        }
        if (rangeName) {
          curveSet.PlayTimeRange?.(rangeName);
        } else {
          curveSet.ResetTimeRange?.();
          curveSet.Play?.();
        }
      }
      for (const child of this.objects) {
        child?.PlayCurveSet?.(target, rangeName);
      }
    }

    /** Carbon EveChildContainer::StopCurveSet (cpp:746-768). */
    StopCurveSet(name) {
      if (!this.IsUpdating()) {
        return;
      }
      const target = String(name ?? "");
      for (const curveSet of this.curveSets) {
        if ((curveSet?.GetName?.() ?? curveSet?.name) === target) {
          curveSet.Stop?.();
        }
      }
      for (const child of this.objects) {
        child?.StopCurveSet?.(target);
      }
    }

    /** Carbon EveChildContainer::UpdateCurveSet (cpp:770-786): samples matching
     * own and child sets at an explicit time (both clocks, as Carbon does). */
    UpdateCurveSet(name, time) {
      const target = String(name ?? "");
      for (const curveSet of this.curveSets) {
        if ((curveSet?.GetName?.() ?? curveSet?.name) === target) {
          curveSet.Update?.(time, time);
        }
      }
      for (const child of this.objects) {
        child?.UpdateCurveSet?.(target, time);
      }
    }

    /** Carbon EveChildContainer::PlayAllCurveSets (cpp:714-728): children
     * first, then every own set. */
    PlayAllCurveSets() {
      for (const child of this.objects) {
        child?.PlayAllCurveSets?.();
      }
      for (const curveSet of this.curveSets) {
        curveSet?.Play?.();
      }
    }

    /** Carbon EveChildContainer::StopAllCurveSets (cpp:730-744). */
    StopAllCurveSets() {
      for (const child of this.objects) {
        child?.StopAllCurveSets?.();
      }
      for (const curveSet of this.curveSets) {
        curveSet?.Stop?.();
      }
    }

    /** Carbon EveChildContainer::GetCurveSetDuration (cpp:788-813): maximum
     * GetMaxCurveDuration over matching own and child sets. */
    GetCurveSetDuration(name) {
      if (!this.IsUpdating()) {
        return 0;
      }
      const target = String(name ?? "");
      let duration = 0;
      for (const curveSet of this.curveSets) {
        if ((curveSet?.GetName?.() ?? curveSet?.name) === target) {
          duration = Math.max(duration, Number(curveSet.GetMaxCurveDuration?.() ?? 0));
        }
      }
      for (const child of this.objects) {
        duration = Math.max(duration, Number(child?.GetCurveSetDuration?.(target) ?? 0));
      }
      return duration;
    }

    /** Carbon EveChildContainer::GetRangeDuration (cpp:815-840): maximum named
     * range duration over matching own and child sets. */
    GetRangeDuration(name, rangeName) {
      if (!this.IsUpdating()) {
        return 0;
      }
      const target = String(name ?? "");
      let duration = 0;
      for (const curveSet of this.curveSets) {
        if ((curveSet?.GetName?.() ?? curveSet?.name) === target) {
          duration = Math.max(duration, Number(curveSet.GetRangeDuration?.(rangeName) ?? 0));
        }
      }
      for (const child of this.objects) {
        duration = Math.max(duration, Number(child?.GetRangeDuration?.(target, rangeName) ?? 0));
      }
      return duration;
    }

    /** Carbon EveChildContainer::GetControllerValueByName (cpp:1083-1098):
     * Carbon returns bool with a float& out; the JS port returns the value or
     * null when no controller exposes the named float variable. */
    GetControllerValueByName(name) {
      const key = String(name ?? "");
      for (const controller of this.controllers) {
        const value = controller?.GetFloatVariableByName?.(key);
        if (value !== undefined && value !== null) {
          return Number(value);
        }
      }
      return null;
    }

    /** Carbon EveChildContainer::GetWorldVelocity (cpp:1012-1015). */
    GetWorldVelocity(out = vec3.create()) {
      return vec3.copy(out, this.#worldVelocity);
    }

    /** Carbon EveChildContainer::GetOwnerMaxSpeed (cpp:1073-1076). */
    GetOwnerMaxSpeed() {
      return this.#ownerMaxSpeed;
    }

    /** Carbon EveChildContainer::SetInheritProperties (cpp:1017-1040): lazily
     * creates the property holder, then fans the color set out to children and
     * lights. */
    SetInheritProperties(colorSet) {
      if (!this.inheritProperties) {
        this.inheritProperties = new _EveChildInheritPrope();
      }
      this.inheritProperties.SetProperties(colorSet);
      for (const child of this.objects) {
        child?.SetInheritProperties?.(colorSet);
      }
      for (const light of this.lights) {
        light?.SetInheritProperties?.(colorSet);
      }
    }

    /** Carbon EveChildContainer::FindSoundEmitter (cpp:1042-1066): named local
     * observers first, then duck-typed recursion into the children. */
    FindSoundEmitter(name) {
      const target = String(name ?? "");
      for (const observer of this.observers) {
        if (observer?.name === target) {
          return typeof observer.GetObserver === "function" ? observer.GetObserver() : observer.observer ?? null;
        }
      }
      for (const child of this.objects) {
        const emitter = child?.FindSoundEmitter?.(target);
        if (emitter) {
          return emitter;
        }
      }
      return null;
    }

    // Copies the caller's params into a fresh child-facing record (Carbon copies
    // EveChildUpdateParams by value, cpp:505/592). Allocated per call like
    // EveSpaceObject2's child fan-out - container recursion makes a module
    // scratch record unsafe.

    /**
     * Copies the caller's update params into a fresh child-facing record (Carbon
     * passes EveChildUpdateParams by value, cpp:505/592); allocated per call
     * because container recursion makes a shared module scratch record unsafe.
     */

    // Carbon reads Tr2Renderer::GetShaderModel() (a renderer global); the
    // browser runtime stamps it here. TR2SM_3_0_DEPTH is the DX11 depth path
    // EVE ships, so every quality-gated container renders by default.
  }];
  #DeriveChildParams(params) {
    const next = new _EveChildUpdateParams();
    if (params) {
      next.spaceObjectParent = params.spaceObjectParent ?? null;
      next.childParent = params.childParent ?? null;
      next.boneCount = params.boneCount ?? 0;
      next.bones = params.bones ?? null;
      next.ownerMaxSpeed = Number(params.ownerMaxSpeed) || 0;
      next.activationStrength = Number(params.activationStrength ?? 1);
      next.controllerUpdateFrequency = Number(params.controllerUpdateFrequency ?? 0.5);
      next.isVisible = params.isVisible !== false;
      if (params.localToWorldTransform?.length === 16) {
        mat4.copy(next.localToWorldTransform, params.localToWorldTransform);
      }
      if (params.worldVelocity) {
        vec3.copy(next.worldVelocity, params.worldVelocity);
      }
    }
    return next;
  }
  shaderModel = TR2SHADERMODEL.TR2SM_3_0_DEPTH;
  DisplayQualityModifier = Object.freeze({
    ONLY_REFLECTIONS: 6,
    SHADER_ALL: 5,
    SHADER_HIGHMID: 3,
    SHADER_LOWMID: 1,
    SHADER_HIGH: 4,
    SHADER_MED: 2,
    SHADER_LOW: 0
  });
  Origin = Origin;
  constructor() {
    super(_EveChildContainer), _initClass();
  }
}();

export { _EveChildContainer as EveChildContainer };
//# sourceMappingURL=EveChildContainer.js.map
