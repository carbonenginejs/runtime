// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildContainer.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildContainer.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildContainer_Blue.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { sph3 } from "@carbonenginejs/runtime-utils/sph3";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { getBoneList } from "../../trinityCore/Tr2GrannyAnimation.js";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { EveChildTransform, applyTransformModifiers } from "./EveChildTransform.js";
import { EveChildInheritProperties } from "./EveChildInheritProperties.js";
import { EveChildUpdateParams } from "../EveChildUpdateParams.js";
import { EveComponentType } from "../EveComponentTypes.js";
import { Origin } from "../../generated/eve/child/enums.js";
import { Tr2RenderReason, TR2SHADERMODEL } from "../../generated/trinityCore/enums.js";
import { Tr2Lod } from "../EveLODHelper.js";
import { Tr2PerObjectData } from "../../trinityCore/Tr2PerObjectData.js";
import {
  createChildPerObjectRecords,
  inheritParentPerObjectData,
  stampChildTransforms
} from "../perObjectData/childPerObjectRecords.js";

// Module scratch (read-only zero vector; container recursion forbids mutable
// module scratch here - see GetBoundingSphere).
const ZERO_VEC3 = vec3.create();


/**
 * Space-object child that groups other children under one transform, owning
 * their curve sets, controllers, observers, lights, attachments and transform
 * modifiers, and gating them on a display-quality filter.
 */
@type.define({ className: "EveChildContainer", family: "eve/child" })
export class EveChildContainer extends EveChildTransform
{
  @io.notify
  @io.persist
  @type.int32
  @schema.enum("DisplayQualityModifier")
  displayFilter = 5;

  @io.persist
  @type.list("IEveSpaceObjectChild")
  objects = [];

  @io.persist
  @type.list("IEveChildTransformModifier")
  transformModifiers = [];

  @io.persist
  @type.list("TriCurveSet")
  curveSets = [];

  @io.read
  @type.mat4
  worldTransform = mat4.create();

  @io.notify
  @io.readwrite
  @type.boolean
  mute = false;

  @io.notify
  @io.persist
  @type.boolean
  display = true;

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.vec3
  translation = vec3.create();

  @io.persist
  @type.quat
  rotation = quat.create();

  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @io.persist
  @type.mat4
  localTransform = mat4.create();

  @io.persist
  @type.boolean
  staticTransform = false;

  @io.persist
  @type.boolean
  alwaysOn = false;

  @io.persist
  @type.boolean
  updateOnDisplay = true;

  @io.persist
  @type.list("IEveSpaceObjectAttachment")
  attachments = [];

  @io.persist
  @type.list("TriObserverLocal")
  observers = [];

  @io.persist
  @type.list("IEveFxAttribute")
  fxAttributes = [];

  @io.persist
  @type.list("Tr2Light")
  lights = [];

  @io.persist
  @type.list("ITr2Controller")
  controllers = [];

  @io.persist
  @type.objectRef("EveChildInheritProperties")
  inheritProperties = null;

  @io.persist
  @type.boolean
  useSRT = true;

  @io.persist
  @type.boolean
  useStaticRotation = false;

  @io.persist
  @type.boolean
  useStaticScale = false;

  // SOF-authored placement values; persisted so the values interchange
  // reproduces Carbon's hidden container placement state.
  @io.persist
  @type.objectRef("ITr2GrannyAnimationOwner")
  animationOwner = null;

  @io.persist
  @type.int32
  @schema.enum("Origin")
  origin = 0;

  @io.persist
  @type.boolean
  isPlacementRoot = false;

  #controllerVariables = new Map();

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
  @carbon.method
  @impl.adapted
  Initialize()
  {
    for (const controller of this.controllers)
    {
      if (!controller?.IsLinked?.())
      {
        controller?.Link?.(this);
      }
    }
    return true;
  }

  /** Carbon EveChildContainer::OnModified (cpp:76-88): display/displayFilter
   * changes re-register with the scene component registry (engine-owned,
   * omitted); a mute change fans out to children and observers. The value
   * argument follows the repo's OnModified duck (field name or field value). */
  @carbon.method
  @impl.adapted
  @impl.reason("Registry re-registration on display/displayFilter changes is engine-owned; the mute fan-out side effect is ported.")
  OnModified(value = null)
  {
    if (value === "mute" || value === this.mute)
    {
      this.MuteChildren();
    }
    return true;
  }

  /**
   * Applies the authored scale/rotation/translation through the shared child
   * transform setup and returns the rebuilt local transform; lowestLodVisible is
   * accepted for signature parity only.
   */
  @carbon.method
  @impl.implemented
  Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null)
  {
    return super.Setup(scale, rotation, translation, lowestLodVisible);
  }

  /**
   * Returns the authored container name, which GetEffectChildByName matches
   * against on the parent side.
   */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the authored container name, coercing nullish to the empty string. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Records whether this container's placement was authored in space or by SOF
   * (the Origin enum).
   */
  @carbon.method
  @impl.implemented
  SetOrigin(origin)
  {
    this.origin = Number(origin) | 0;
  }

  /** Stores the always-on flag that IsAlwaysOn reports to the owner. */
  @carbon.method
  @impl.implemented
  SetAlwaysOn(alwaysOn)
  {
    this.alwaysOn = !!alwaysOn;
  }

  /** Reports the authored always-on flag. */
  @carbon.method
  @impl.implemented
  IsAlwaysOn()
  {
    return this.alwaysOn;
  }

  /**
   * Sets the display-quality filter that IsRendering tests the current shader
   * model against, which in turn gates every update and render path on this
   * container.
   */
  @carbon.method
  @impl.implemented
  SetDisplayQualityModifier(filter)
  {
    this.displayFilter = Number(filter) | 0;
  }

  /**
   * Sets the mute flag and, only when it changes, pushes it down to the
   * contained children and local observers.
   */
  @carbon.method
  @impl.implemented
  SetMute(mute)
  {
    const next = !!mute;
    if (next !== this.mute)
    {
      this.mute = next;
      this.MuteChildren();
    }
  }

  /**
   * Pushes this container's current mute flag onto every contained child and
   * local observer - it mutates their state, not the container's.
   */
  @carbon.method
  @impl.implemented
  MuteChildren()
  {
    for (const child of this.objects)
    {
      child?.SetMute?.(this.mute);
    }
    for (const observer of this.observers)
    {
      observer?.SetMute?.(this.mute);
    }
  }

  /**
   * Appends a transform modifier; modifiers fold over the container's world
   * transform in insertion order on each async update.
   */
  @carbon.method
  @impl.implemented
  AddTransformModifier(modifier)
  {
    this.transformModifiers.push(modifier);
  }

  /**
   * Appends a local audio observer, which is re-placed from the container's
   * world transform on every sync update.
   */
  @carbon.method
  @impl.implemented
  AddObserver(observer)
  {
    this.observers.push(observer);
  }

  /**
   * Appends a controller, links it to this container, and replays every
   * controller variable set so far onto it so it starts in sync.
   */
  @carbon.method
  @impl.adapted
  AddController(controller)
  {
    this.controllers.push(controller);
    controller?.Link?.(this);
    for (const [name, value] of this.#controllerVariables)
    {
      controller?.SetVariable?.(name, value);
    }
  }

  /**
   * Records a named float variable, pushes it to every controller on this
   * container, and recurses into the contained children; the recorded value is
   * also replayed onto controllers and children added later.
   */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name ?? "");
    const next = Number(value);
    this.#controllerVariables.set(key, next);
    for (const controller of this.controllers)
    {
      controller?.SetVariable?.(key, next);
    }
    for (const child of this.objects)
    {
      child?.SetControllerVariable?.(key, next);
    }
  }

  /**
   * Fires a named controller event on every controller here and recurses into
   * the contained children.
   */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    const eventName = String(name ?? "");
    for (const controller of this.controllers)
    {
      controller?.HandleEvent?.(eventName);
    }
    for (const child of this.objects)
    {
      child?.HandleControllerEvent?.(eventName);
    }
  }

  /** Starts every controller here and recurses into the contained children. */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    for (const controller of this.controllers)
    {
      controller?.Start?.();
    }
    for (const child of this.objects)
    {
      child?.StartControllers?.();
    }
  }

  /**
   * Forwards a procedural container variable to the contained children; a plain
   * container holds none of its own.
   */
  @carbon.method
  @impl.implemented
  SetProceduralContainerVariable(name, value)
  {
    for (const child of this.objects)
    {
      child?.SetProceduralContainerVariable?.(name, value);
    }
  }

  /**
   * Returns the first direct child whose GetName()/name matches, or null; the
   * search does not recurse into nested containers.
   */
  @carbon.method
  @impl.implemented
  GetEffectChildByName(name)
  {
    const target = String(name ?? "");
    for (const child of this.objects)
    {
      if ((child?.GetName?.() ?? child?.name ?? "") === target)
      {
        return child;
      }
    }
    return null;
  }

  /**
   * Appends a child and replays every controller variable set so far onto it,
   * then returns that same child.
   */
  @carbon.method
  @impl.adapted
  AddToEffectChildrenList(child)
  {
    this.objects.push(child);
    for (const [name, value] of this.#controllerVariables)
    {
      child?.SetControllerVariable?.(name, value);
    }
    return child;
  }

  /** Removes a child by identity and reports whether it was present. */
  @carbon.method
  @impl.implemented
  RemoveFromEffectChildrenList(child)
  {
    const index = this.objects.indexOf(child);
    if (index !== -1)
    {
      this.objects.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Forwards a shader option to every contained child and attachment; the
   * container compiles nothing itself.
   */
  @carbon.method
  @impl.implemented
  SetShaderOption(name, value)
  {
    for (const child of this.objects)
    {
      child?.SetShaderOption?.(name, value);
    }
    for (const attachment of this.attachments)
    {
      attachment?.SetShaderOption?.(name, value);
    }
  }

  /**
   * Stores the Granny animation owner supplied by SOF placement; the bone-list
   * override that would consume it awaits the JS animation seam.
   */
  @carbon.method
  @impl.implemented
  SetAnimationOwner(animationOwner)
  {
    this.animationOwner = animationOwner ?? null;
  }

  /**
   * Flags this container as a SOF placement root - authored placement state,
   * persisted for interchange parity, with no consumer inside the container
   * itself.
   */
  @carbon.method
  @impl.implemented
  SetIsPlacementRoot(isPlacementRoot)
  {
    this.isPlacementRoot = !!isPlacementRoot;
  }

  /**
   * Appends an attachment; attachments are the only thing a container renders
   * itself (HasRenderables) and the only thing GetBatches submits.
   */
  @carbon.method
  @impl.implemented
  AddAttachment(attachment)
  {
    this.attachments.push(attachment);
  }

  /**
   * Drops every attachment, which also stops the container from contributing any
   * renderable of its own.
   */
  @carbon.method
  @impl.implemented
  ClearAttachments()
  {
    this.attachments.length = 0;
  }

  /**
   * Reports whether the container owns nothing at all - no children, lights,
   * attachments, controllers, curve sets, transform modifiers or observers.
   */
  @carbon.method
  @impl.implemented
  Empty()
  {
    return this.objects.length === 0 &&
      this.lights.length === 0 &&
      this.attachments.length === 0 &&
      this.controllers.length === 0 &&
      this.curveSets.length === 0 &&
      this.transformModifiers.length === 0 &&
      this.observers.length === 0;
  }

  /**
   * Sync-side frame update (Carbon EveChildContainer::UpdateSyncronous,
   * cpp:496-518): gate on IsUpdating, remember the owner max speed, then
   * recurse into the children with childParent params rebased onto this
   * container's world transform, and refresh the local observers.
   * @param {Object} updateContext - frame context (EveUpdateContext)
   * @param {EveChildUpdateParams} params
   */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext, params)
  {
    if (!this.IsUpdating())
    {
      return;
    }

    this.#ownerMaxSpeed = Number(params?.ownerMaxSpeed) || 0;

    const newParams = EveChildContainer.#DeriveChildParams(params);
    newParams.isVisible = (params?.isVisible !== false) && this.display;
    newParams.childParent = this;
    mat4.copy(newParams.localToWorldTransform, this.worldTransform);

    for (const child of this.objects)
    {
      child?.UpdateSyncronous?.(updateContext, newParams);
    }
    for (const observer of this.observers)
    {
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
  @carbon.method
  @carbon.contextual(["camera"])
  @impl.adapted
  @impl.reason("The GPU bone ring buffer, task-group dispatch, per-object VS/PS struct refresh, and the Granny bone-list override are engine/animation seams; the CPU update fan-out is ported.")
  UpdateAsyncronous(updateContext, params)
  {
    if (!this.IsUpdating())
    {
      return this.worldTransform;
    }

    const parentTransform = params?.localToWorldTransform;

    // Carbon captures the OUTGOING transform before rebuilding.
    mat4.copy(this.#lastWorldTransform, this.worldTransform);

    if (parentTransform && parentTransform.length === 16)
    {
      this.UpdateTransform(parentTransform);
    }

    // Carbon cpp:576-589: inherit the hull's per-object values, rebase the clip
    // data by this child's translation, then stamp our own transforms.
    inheritParentPerObjectData(this.#perObjectData, params?.spaceObjectParent, this.translation);
    stampChildTransforms(this.#perObjectData, this.worldTransform, this.#lastWorldTransform);

    const frequency = params?.controllerUpdateFrequency ?? 0.5;
    for (const controller of this.controllers)
    {
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
    // structs are refreshed from the parent - GPU constant-buffer seam; the
    // per-object record carries the live object reference instead
    // (GetPerObjectData).

    const newParams = EveChildContainer.#DeriveChildParams(params);
    newParams.isVisible = (params?.isVisible !== false) && this.display;
    newParams.childParent = this;
    newParams.boneCount = boneCount;
    newParams.bones = bones;
    mat4.copy(newParams.localToWorldTransform, this.worldTransform);

    // Carbon (cpp:599-610): a space-object-rooted container samples the
    // owner's world velocity; nested containers inherit it via params.
    if (params?.spaceObjectParent)
    {
      if (!params.childParent)
      {
        const velocity = params.spaceObjectParent.GetWorldVelocity?.(this.#worldVelocity) ??
          params.spaceObjectParent.worldVelocity;
        if (velocity && velocity !== this.#worldVelocity)
        {
          vec3.copy(this.#worldVelocity, velocity);
        }
        vec3.copy(newParams.worldVelocity, this.#worldVelocity);
      }
      else
      {
        vec3.copy(this.#worldVelocity, params.worldVelocity ?? ZERO_VEC3);
      }
    }

    for (const child of this.objects)
    {
      child?.UpdateAsyncronous?.(updateContext, newParams);
    }

    // Carbon (cpp:617-624): container-owned curve sets tick with the frame
    // time as BOTH realTime and simTime.
    if (this.curveSets.length)
    {
      const time = Number(updateContext?.GetTime?.() ?? updateContext?.currentTime ?? updateContext?.time ?? 0);
      for (const curveSet of this.curveSets)
      {
        curveSet?.Update?.(time, time);
      }
    }

    for (const fxAttribute of this.fxAttributes)
    {
      fxAttribute?.UpdateAsyncronous?.(updateContext, newParams);
    }

    for (const light of this.lights)
    {
      light?.SetBoneMatrix?.(bones, boneCount);
    }

    for (const attachment of this.attachments)
    {
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
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform = null, parentLod = Tr2Lod.TR2_LOD_HIGH)
  {
    if (!this.display)
    {
      return false;
    }
    if (!this.IsUpdating())
    {
      return false;
    }

    for (const child of this.objects)
    {
      child?.UpdateVisibility?.(updateContext, parentTransform, parentLod);
    }

    if (this.HasRenderables())
    {
      // cpp:398-409 - the container has no updater of its own; the palette
      // comes from whichever object owns the animation.
      const { bones, boneCount } = getBoneList(this.animationOwner?.GetAnimationController?.());

      for (const attachment of this.attachments)
      {
        attachment?.UpdateVisibility?.(updateContext, this.worldTransform, bones, boneCount);
      }
    }
    return true;
  }

  /** Carbon EveChildContainer::GetRenderables (cpp:412-432): the container
   * itself renders only when it owns attachments; children always recurse. */
  @carbon.method
  @impl.implemented
  GetRenderables(out = [])
  {
    if (!this.display || !this.#hasUpdated)
    {
      return out;
    }
    if (!this.IsRendering())
    {
      return out;
    }

    if (this.HasRenderables())
    {
      out.push(this);
    }

    for (const child of this.objects)
    {
      child?.GetRenderables?.(out);
    }
    return out;
  }

  /** Carbon EveChildContainer::GetBoundingSphere (cpp:434-452): the union of
   * the children's spheres (BoundingSphereSetOrUpdate -> sph3.union). The
   * child sphere is a per-call local rather than module scratch because
   * containers nest - a shared scratch would be clobbered between recursion
   * levels; this is a bounds query, not the per-frame update hot path. */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(out = vec4.create(), _query = 0)
  {
    if (!this.IsUpdating())
    {
      return false;
    }

    const childSphere = vec4.create();
    let success = false;
    for (const child of this.objects)
    {
      if (child?.GetBoundingSphere?.(childSphere))
      {
        if (success)
        {
          sph3.union(out, out, childSphere);
        }
        else
        {
          vec4.copy(out, childSphere);
        }
        success = true;
      }
    }
    return success;
  }

  /** Carbon EveChildContainer::GetLocalToWorldTransform (cpp:644-647); the
   * optional out follows the EveChildInstancedMeshes copy-out shape. */
  @carbon.method
  @impl.implemented
  GetLocalToWorldTransform(out = null)
  {
    if (out)
    {
      return mat4.copy(out, this.worldTransform);
    }
    return this.worldTransform;
  }

  /** Carbon EveChildContainer::ChangeLOD (cpp:649-655): fan-out only. */
  @carbon.method
  @impl.implemented
  ChangeLOD(lod)
  {
    for (const child of this.objects)
    {
      child?.ChangeLOD?.(lod);
    }
  }

  /** Carbon EveChildContainer::GetLights (cpp:657-675): each light is added
   * with the container world transform and the average basis-length scaling
   * ((|X| + |Y| + |Z|) / 3 of the world basis rows - single-matrix reads, no
   * composition). The light manager is duck-typed. */
  @carbon.method
  @impl.implemented
  GetLights(lightManager)
  {
    if (!this.display || !this.#hasUpdated)
    {
      return;
    }
    if (!this.IsRendering())
    {
      return;
    }

    const m = this.worldTransform;
    const scaling = (
      Math.hypot(m[0], m[1], m[2]) +
      Math.hypot(m[4], m[5], m[6]) +
      Math.hypot(m[8], m[9], m[10])
    ) / 3;

    for (const light of this.lights)
    {
      light?.AddLight?.(lightManager, m, scaling);
    }
  }

  /** Carbon EveChildContainer::GetBatches (cpp:1134-1143): attachments only,
   * gated on display, the NORMAL render reason, and a non-zero activation
   * strength. Returns whether any batch was committed (JS addition; Carbon
   * returns void). */
  @carbon.method
  @impl.implemented
  GetBatches(batches, batchType, perObjectData, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    if (!this.display || reason !== Tr2RenderReason.TR2RENDERREASON_NORMAL || this.#activationStrength === 0)
    {
      return false;
    }

    let committed = false;
    for (const attachment of this.attachments)
    {
      committed = attachment?.GetBatches?.(batches, batchType, perObjectData, reason) === true || committed;
    }
    return committed;
  }

  /** Carbon EveChildContainer::HasTransparentBatches (cpp:1145-1148). */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon EveChildContainer::GetSortValue (cpp:1150-1153). */
  @carbon.method
  @impl.implemented
  GetSortValue()
  {
    return 0;
  }

  /**
   * Carbon EveChildContainer::GetPerObjectData (cpp:1180-1203): uploads the
   * animation owner's bone palette, then hands back a handle over this
   * container's two PERSISTENT buffers. The ring offsets are GPU addresses with
   * no CPU derivation and keep their defaults; the bone COUNT is CPU-known.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("GPU ring-buffer offsets have no CPU derivation and keep their defaults; every CPU-known field is filled.")
  GetPerObjectData(_accumulator = null)
  {
    const updater = this.animationOwner?.animationUpdater ?? this.animationUpdater;

    if (updater?.IsInitialized?.())
    {
      this.#perObjectData.vs.SetIndex("boneOffsets", 2, [ updater.GetMeshBoneCount?.() ?? 0 ]);
    }

    return { vs: this.#perObjectData.vs, ps: this.#perObjectData.ps };
  }

  /** Carbon EveChildContainer::HasRenderables (cpp:1129-1132): the container
   * renders only for its attachments. */
  @carbon.method
  @impl.implemented
  HasRenderables()
  {
    return this.attachments.length > 0;
  }

  /** Carbon EveChildContainer::IsRendering (cpp:334-362): whether the current
   * shader model passes this container's display filter. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads the Tr2Renderer shader-model global; the browser runtime stamps EveChildContainer.shaderModel (default TR2SM_3_0_DEPTH, the DX11 depth path EVE ships).")
  IsRendering()
  {
    const settings = EveChildContainer.shaderModel;
    const filter = EveChildContainer.DisplayQualityModifier;

    if (settings === TR2SHADERMODEL.TR2SM_AUTHORING && this.displayFilter !== filter.ONLY_REFLECTIONS)
    {
      return true;
    }

    switch (this.displayFilter)
    {
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
  @carbon.method
  @impl.implemented
  IsUpdating()
  {
    return (this.display || !this.updateOnDisplay) &&
      (this.IsRendering() || this.displayFilter === EveChildContainer.DisplayQualityModifier.ONLY_REFLECTIONS);
  }

  /** Carbon EveChildContainer::RegisterComponents (cpp:258-284): LightOwner
   * when lights are authored, then forwards the contained objects and the
   * attachments. Gate m_display && IsUpdating(). */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display && this.IsUpdating())
    {
      if (this.lights.length)
      {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }

      for (const object of this.objects)
      {
        object?.Register?.(registry);
      }

      for (const attachment of this.attachments)
      {
        attachment?.Register?.(registry);
      }
    }
  }

  /** Carbon EveChildContainer::UnRegisterComponents (cpp:290-311): forwards
   * the contained objects and attachments only (own components were already
   * removed by EveEntity::UnRegister, EveEntity.cpp:90); no display/IsUpdating
   * re-check. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const object of this.objects)
      {
        object?.UnRegister?.(registry);
      }

      for (const attachment of this.attachments)
      {
        attachment?.UnRegister?.(registry);
      }
    }
  }

  /** Carbon EveChildContainer::PlayCurveSet (cpp:682-712): named own sets play
   * (or play a named range); children recurse via the curve-set-owner duck. */
  @carbon.method
  @impl.implemented
  PlayCurveSet(name, rangeName = "")
  {
    if (!this.IsUpdating())
    {
      return;
    }

    const target = String(name ?? "");
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName?.() ?? curveSet?.name) !== target)
      {
        continue;
      }
      if (rangeName)
      {
        curveSet.PlayTimeRange?.(rangeName);
      }
      else
      {
        curveSet.ResetTimeRange?.();
        curveSet.Play?.();
      }
    }

    for (const child of this.objects)
    {
      child?.PlayCurveSet?.(target, rangeName);
    }
  }

  /** Carbon EveChildContainer::StopCurveSet (cpp:746-768). */
  @carbon.method
  @impl.implemented
  StopCurveSet(name)
  {
    if (!this.IsUpdating())
    {
      return;
    }

    const target = String(name ?? "");
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName?.() ?? curveSet?.name) === target)
      {
        curveSet.Stop?.();
      }
    }

    for (const child of this.objects)
    {
      child?.StopCurveSet?.(target);
    }
  }

  /** Carbon EveChildContainer::UpdateCurveSet (cpp:770-786): samples matching
   * own and child sets at an explicit time (both clocks, as Carbon does). */
  @carbon.method
  @impl.implemented
  UpdateCurveSet(name, time)
  {
    const target = String(name ?? "");
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName?.() ?? curveSet?.name) === target)
      {
        curveSet.Update?.(time, time);
      }
    }

    for (const child of this.objects)
    {
      child?.UpdateCurveSet?.(target, time);
    }
  }

  /** Carbon EveChildContainer::PlayAllCurveSets (cpp:714-728): children
   * first, then every own set. */
  @carbon.method
  @impl.implemented
  PlayAllCurveSets()
  {
    for (const child of this.objects)
    {
      child?.PlayAllCurveSets?.();
    }
    for (const curveSet of this.curveSets)
    {
      curveSet?.Play?.();
    }
  }

  /** Carbon EveChildContainer::StopAllCurveSets (cpp:730-744). */
  @carbon.method
  @impl.implemented
  StopAllCurveSets()
  {
    for (const child of this.objects)
    {
      child?.StopAllCurveSets?.();
    }
    for (const curveSet of this.curveSets)
    {
      curveSet?.Stop?.();
    }
  }

  /** Carbon EveChildContainer::GetCurveSetDuration (cpp:788-813): maximum
   * GetMaxCurveDuration over matching own and child sets. */
  @carbon.method
  @impl.implemented
  GetCurveSetDuration(name)
  {
    if (!this.IsUpdating())
    {
      return 0;
    }

    const target = String(name ?? "");
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName?.() ?? curveSet?.name) === target)
      {
        duration = Math.max(duration, Number(curveSet.GetMaxCurveDuration?.() ?? 0));
      }
    }

    for (const child of this.objects)
    {
      duration = Math.max(duration, Number(child?.GetCurveSetDuration?.(target) ?? 0));
    }
    return duration;
  }

  /** Carbon EveChildContainer::GetRangeDuration (cpp:815-840): maximum named
   * range duration over matching own and child sets. */
  @carbon.method
  @impl.implemented
  GetRangeDuration(name, rangeName)
  {
    if (!this.IsUpdating())
    {
      return 0;
    }

    const target = String(name ?? "");
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName?.() ?? curveSet?.name) === target)
      {
        duration = Math.max(duration, Number(curveSet.GetRangeDuration?.(rangeName) ?? 0));
      }
    }

    for (const child of this.objects)
    {
      duration = Math.max(duration, Number(child?.GetRangeDuration?.(target, rangeName) ?? 0));
    }
    return duration;
  }

  /** Carbon EveChildContainer::GetControllerValueByName (cpp:1083-1098):
   * Carbon returns bool with a float& out; the JS port returns the value or
   * null when no controller exposes the named float variable. */
  @carbon.method
  @impl.adapted
  @impl.reason("The bool + float& out-param pair collapses to value-or-null in JS.")
  GetControllerValueByName(name)
  {
    const key = String(name ?? "");
    for (const controller of this.controllers)
    {
      const value = controller?.GetFloatVariableByName?.(key);
      if (value !== undefined && value !== null)
      {
        return Number(value);
      }
    }
    return null;
  }

  /** Carbon EveChildContainer::GetWorldVelocity (cpp:1012-1015). */
  @carbon.method
  @impl.implemented
  GetWorldVelocity(out = vec3.create())
  {
    return vec3.copy(out, this.#worldVelocity);
  }

  /** Carbon EveChildContainer::GetOwnerMaxSpeed (cpp:1073-1076). */
  @carbon.method
  @impl.implemented
  GetOwnerMaxSpeed()
  {
    return this.#ownerMaxSpeed;
  }

  /** Carbon EveChildContainer::SetInheritProperties (cpp:1017-1040): lazily
   * creates the property holder, then fans the color set out to children and
   * lights. */
  @carbon.method
  @impl.implemented
  SetInheritProperties(colorSet)
  {
    if (!this.inheritProperties)
    {
      this.inheritProperties = new EveChildInheritProperties();
    }
    this.inheritProperties.SetProperties(colorSet);

    for (const child of this.objects)
    {
      child?.SetInheritProperties?.(colorSet);
    }
    for (const light of this.lights)
    {
      light?.SetInheritProperties?.(colorSet);
    }
  }

  /** Carbon EveChildContainer::FindSoundEmitter (cpp:1042-1066): named local
   * observers first, then duck-typed recursion into the children. */
  @carbon.method
  @impl.implemented
  FindSoundEmitter(name)
  {
    const target = String(name ?? "");
    for (const observer of this.observers)
    {
      if (observer?.name === target)
      {
        return typeof observer.GetObserver === "function"
          ? observer.GetObserver()
          : observer.observer ?? null;
      }
    }

    for (const child of this.objects)
    {
      const emitter = child?.FindSoundEmitter?.(target);
      if (emitter)
      {
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
  static #DeriveChildParams(params)
  {
    const next = new EveChildUpdateParams();
    if (params)
    {
      next.spaceObjectParent = params.spaceObjectParent ?? null;
      next.childParent = params.childParent ?? null;
      next.boneCount = params.boneCount ?? 0;
      next.bones = params.bones ?? null;
      next.ownerMaxSpeed = Number(params.ownerMaxSpeed) || 0;
      next.activationStrength = Number(params.activationStrength ?? 1);
      next.controllerUpdateFrequency = Number(params.controllerUpdateFrequency ?? 0.5);
      next.isVisible = params.isVisible !== false;
      if (params.localToWorldTransform?.length === 16)
      {
        mat4.copy(next.localToWorldTransform, params.localToWorldTransform);
      }
      if (params.worldVelocity)
      {
        vec3.copy(next.worldVelocity, params.worldVelocity);
      }
    }
    return next;
  }

  // Carbon reads Tr2Renderer::GetShaderModel() (a renderer global); the
  // browser runtime stamps it here. TR2SM_3_0_DEPTH is the DX11 depth path
  // EVE ships, so every quality-gated container renders by default.
  static shaderModel = TR2SHADERMODEL.TR2SM_3_0_DEPTH;

  static DisplayQualityModifier = Object.freeze({
    ONLY_REFLECTIONS: 6,
    SHADER_ALL: 5,
    SHADER_HIGHMID: 3,
    SHADER_LOWMID: 1,
    SHADER_HIGH: 4,
    SHADER_MED: 2,
    SHADER_LOW: 0
  });

  static Origin = Origin;

}
