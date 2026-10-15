// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildContainer.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildContainer.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildContainer_Blue.cpp
import { INotify } from "../../../global/blue/INotify.js";
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { EveEntity } from "../EveEntity.js";
import { IInitialize } from "#blue/IInitialize";
import { BLUELISTEVENT } from "#consts/blue";
import { addChild, removeChild, clearChildren } from "../../../global/blue/children.js";
import { mat4 } from "#math/mat4";
import { IEveInheritPropertiesOwner } from "../IEveInheritPropertiesOwner.js";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { getBoneList } from "../../core/animation/Tr2GrannyAnimation.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { Tr2RingBuffer, Tr2RingBufferOffsets } from "../../core/device/Tr2RingBuffer/index.js";
import { vec4 } from "#math/vec4";
import { CjsSchema, meta, type, blue } from "#schema";
import { EveChildTransform, applyTransformModifiers } from "./EveChildTransform.js";
import { EveChildInheritProperties } from "./EveChildInheritProperties.js";
import { EveChildUpdateParams } from "../EveChildUpdateParams.js";
import { EveComponentType } from "../EntityComponents.js";
import { Origin } from "../../generated/eve/child/enums.js";
import { Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import { TR2SHADERMODEL } from "#consts/graphics";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { Tr2Lod } from "../EveLODHelper.js";
import { Tr2PerObjectData } from "../../core/rawData/perObjectData/Tr2PerObjectData.js";
import {
  createChildPerObjectRecords,
  inheritParentPerObjectData,
  stampChildTransforms
} from "../perObjectData/childPerObjectRecords.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import { ITr2CurveSetOwner } from "../../curves/ITr2CurveSetOwner.js";
import { ITr2SoundEmitterOwner } from "../ITr2SoundEmitterOwner.js";
import { ITr2ControllerOwner } from "../../controllers/ITr2ControllerOwner.js";
import { ITr2ActionController } from "../../controllers/ITr2Controller/ITr2ActionController.js";
import { IsMatch, be, EnumRegistrationType } from "#blue";
import { IEveEffectChildrenOwner } from "./IEveEffectChildrenOwner.js";

// Module scratch (read-only zero vector; container recursion forbids mutable
// module scratch here - see GetBoundingSphere).
const ZERO_VEC3 = vec3.create();


/**
 * Space-object child that groups other children under one transform, owning
 * their curve sets, controllers, observers, lights, attachments and transform
 * modifiers, and gating them on a display-quality filter.
 */
@blue.define("EveChildContainer")
@blue.inherit(ITr2Renderable, ITr2CurveSetOwner, IInitialize, ITr2SoundEmitterOwner, ITr2ControllerOwner, IEveInheritPropertiesOwner)
@blue.inherit(IInitialize, IListNotify, INotify)
@blue.interface(EveEntity, EveSpaceObjectChild, IEveSpaceObjectChild, ITr2CurveSetOwner, IInitialize, IListNotify, INotify, IEveEffectChildrenOwner, ITr2SoundEmitterOwner, ITr2ControllerOwner, IEveInheritPropertiesOwner, ITr2Renderable)
@blue.inherit(IEveEffectChildrenOwner)
export class EveChildContainer extends EveChildTransform
{
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.EveChildContainer.DisplayQualityModifier")
  displayFilter = 5;

  @blue.read
  @blue.persist
  @type.list("IEveSpaceObjectChild")
  objects = [];

  @blue.read
  @blue.persist
  @type.list("IEveChildTransformModifier")
  transformModifiers = [];

  @blue.read
  @blue.persist
  @type.list("TriCurveSet")
  curveSets = [];

  @blue.read
  @type.mat4
  worldTransform = mat4.create();

  @blue.notify
  @blue.readwrite
  @type.boolean
  mute = false;

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  display = true;

  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.readwrite
  @blue.persist
  @type.vec3
  translation = vec3.create();

  @blue.readwrite
  @blue.persist
  @type.quat
  rotation = quat.create();

  @blue.readwrite
  @blue.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @blue.readwrite
  @blue.persist
  @type.mat4
  localTransform = mat4.create();

  @blue.readwrite
  @blue.persist
  @type.boolean
  staticTransform = false;

  @blue.readwrite
  @blue.persist
  @type.boolean
  alwaysOn = false;

  @blue.readwrite
  @blue.persist
  @type.boolean
  updateOnDisplay = true;

  @blue.read
  @blue.persist
  @type.list("IEveSpaceObjectAttachment")
  attachments = [];

  @blue.read
  @blue.persist
  @type.list("TriObserverLocal")
  observers = [];

  @blue.read
  @blue.persist
  @type.list("IEveFxAttribute")
  fxAttributes = [];

  @blue.read
  @blue.persist
  @type.list("Tr2Light")
  lights = [];

  @blue.read
  @blue.persist
  @type.list("ITr2Controller")
  controllers = [];

  @blue.readwrite
  @blue.persist
  @type.rootRef("EveChildInheritProperties")
  inheritProperties = null;

  @blue.readwrite
  @blue.persist
  @type.boolean
  useSRT = true;

  @blue.readwrite
  @blue.persist
  @type.boolean
  useStaticRotation = false;

  @blue.readwrite
  @blue.persist
  @type.boolean
  useStaticScale = false;

  // SOF-authored placement values; persisted so the values interchange
  // reproduces Carbon's hidden container placement state.
  /**
   * Animation owner supplying this container's parent bone transforms.
   * Carbon animationOwner (EveChildContainer.h:209).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {ITr2GrannyAnimationOwner|null}
   */
  @meta.adapted
  @blue.read
  @blue.persist
  @type.rootRef("ITr2GrannyAnimationOwner")
  animationOwner = null;

  /**
   * Origin mode used to place this child container.
   * Carbon origin (EveChildContainer.h:206).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {number}
   */
  @meta.adapted
  @blue.read
  @blue.persist
  @type.int32
  @type.enum("trinity.EveSpaceObjectChild.Origin")
  origin = 0;

  @blue.persist
  @type.boolean
  isPlacementRoot = false;

  _controllerVariables = new Map();

  // Carbon m_worldVelocity/m_ownerMaxSpeed/m_activationStrength/m_hasUpdated:
  // runtime-only frame state (never persisted; Carbon keeps them out of the
  // Blue surface too).
  _worldVelocity = vec3.create();

  _ownerMaxSpeed = 0;

  _activationStrength = 1;

  /** m_vsData / m_psData - this container's PERSISTENT per-object pair. */
  _perObjectData = createChildPerObjectRecords();

  /** Carbon m_boneOffsets: where the animation owner's palette landed in the bone ring, this frame and last. */
  _boneOffsets = new Tr2RingBufferOffsets();

  /** Carbon's local `lastWorldTransform`, kept across frames here. */
  _lastWorldTransform = mat4.create();

  _hasUpdated = false;

  /** Blue read-only property alias for IsRendering. */
  get isRendering()
  {
    return this.IsRendering();
  }

  /** Blue read-only property alias for IsUpdating. */
  get isUpdating()
  {
    return this.IsUpdating();
  }

  /**
   * Links every authored controller that is not already linked to this
   * container, so controller variables and events reach them.
   */
  @blue.method
  @meta.adapted
  Initialize()
  {
    this.RegisterChildren(this.objects);
    for (const controller of this.controllers)
    {
      if (!controller.IsLinked())
      {
        controller.Link(this);
      }
    }
    return true;
  }

  /**
   * Carbon EveChildContainer::OnModified (cpp:76-88): display/displayFilter
   * changes re-register with the scene component registry; a mute notification
   * fans out to children and observers.
   */
  @blue.method
  @meta.implemented
  OnModified(value = null)
  {
    if (IsMatch(value, "display") || IsMatch(value, "displayFilter"))
    {
      this.ReRegister();
    }
    if (IsMatch(value, "mute"))
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
  @blue.method
  @meta.implemented
  Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null)
  {
    return super.Setup(scale, rotation, translation, lowestLodVisible);
  }

  /**
   * Returns the authored container name, which GetEffectChildByName matches
   * against on the parent side.
   */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the authored container name, coercing nullish to the empty string. */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Records whether this container's placement was authored in space or by SOF
   * (the Origin enum).
   */
  @blue.method
  @meta.implemented
  SetOrigin(origin)
  {
    this.origin = Number(origin) | 0;
  }

  /** Stores the always-on flag that IsAlwaysOn reports to the owner. */
  @blue.method
  @meta.implemented
  SetAlwaysOn(alwaysOn)
  {
    this.alwaysOn = !!alwaysOn;
  }

  /** Reports the authored always-on flag. */
  @blue.method
  @meta.implemented
  IsAlwaysOn()
  {
    return this.alwaysOn;
  }

  /**
   * Sets the display-quality filter that IsRendering tests the current shader
   * model against, which in turn gates every update and render path on this
   * container.
   */
  @blue.method
  @meta.implemented
  SetDisplayQualityModifier(filter)
  {
    this.displayFilter = Number(filter) | 0;
  }

  /**
   * Sets the mute flag and, only when it changes, pushes it down to the
   * contained children and local observers.
   */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  MuteChildren()
  {
    for (const child of this.objects)
    {
      child.SetMute(this.mute);
    }
    for (const observer of this.observers)
    {
      observer.SetMute(this.mute);
    }
  }

  /**
   * Appends a transform modifier; modifiers fold over the container's world
   * transform in insertion order on each async update.
   */
  @blue.method
  @meta.implemented
  AddTransformModifier(modifier)
  {
    this.transformModifiers.push(modifier);
  }

  /**
   * Appends a local audio observer, which is re-placed from the container's
   * world transform on every sync update.
   */
  @blue.method
  @meta.implemented
  AddObserver(observer)
  {
    this.observers.push(observer);
  }

  /**
   * Appends a controller, links it to this container, and replays every
   * controller variable set so far onto it so it starts in sync.
   */
  @blue.method
  @meta.adapted
  AddController(controller)
  {
    // The link and the variable replay are the INSERTED arm (cpp:119-128).
    addChild(this, "controllers", controller, { listNotify: this });
  }

  /**
   * Records a named float variable, pushes it to every controller on this
   * container, and recurses into the contained children; the recorded value is
   * also replayed onto controllers and children added later.
   */
  @blue.method
  @meta.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name ?? "");
    const next = Number(value);
    this._controllerVariables.set(key, next);
    for (const controller of this.controllers)
    {
      controller.SetVariable(key, next);
    }
    for (const child of this.objects)
    {
      child.SetControllerVariable(key, next);
    }
  }

  /**
   * Fires a named controller event on every controller here and recurses into
   * the contained children.
   */
  @blue.method
  @meta.implemented
  HandleControllerEvent(name)
  {
    const eventName = String(name ?? "");
    for (const controller of this.controllers)
    {
      controller.HandleEvent(eventName);
    }
    for (const child of this.objects)
    {
      child.HandleControllerEvent(eventName);
    }
  }

  /** Starts every controller here and recurses into the contained children. */
  @blue.method
  @meta.implemented
  StartControllers()
  {
    for (const controller of this.controllers)
    {
      controller.Start();
    }
    for (const child of this.objects)
    {
      child.StartControllers();
    }
  }

  /**
   * Forwards a procedural container variable to the contained children; a plain
   * container holds none of its own.
   */
  @blue.method
  @meta.implemented
  SetProceduralContainerVariable(name, value)
  {
    for (const child of this.objects)
    {
      child.SetProceduralContainerVariable(name, value);
    }
  }

  /**
   * Returns the first direct child whose GetName()/name matches, or null; the
   * search does not recurse into nested containers.
   */
  @blue.method
  @meta.implemented
  GetEffectChildByName(name)
  {
    const target = String(name ?? "");
    for (const child of this.objects)
    {
      if (child.GetName() === target)
      {
        return child;
      }
    }
    return null;
  }

  /**
   * Carbon OnListModified (EveChildContainer.cpp:113-215), the owner reacting
   * to its own lists. Carbon installs itself on four of them at cpp:42-45.
   *
   * Controllers link and replay the recorded variables on insert, unlink on
   * remove, unlink every one on unload. Objects go through the shared
   * child-registration helper AND, when this container is in a registry,
   * register or unregister as entities; attachments do the entity half only.
   * A newly inserted object also receives the inherited properties.
   */
  @blue.method
  @meta.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    const masked = event & BLUELISTEVENT.BELIST_EVENTMASK;
    const loading = (event & BLUELISTEVENT.BELIST_LOADING) !== 0;

    if (list === this.controllers && !loading)
    {
      if (masked === BLUELISTEVENT.BELIST_INSERTED && value)
      {
        value.Link(this);
        for (const [ name, variable ] of this._controllerVariables) value.SetVariable(name, variable);
      }
      else if (masked === BLUELISTEVENT.BELIST_REMOVED && value) value.Unlink();
      else if (masked === BLUELISTEVENT.BELIST_UNLOADSTART)
      {
        for (const controller of this.controllers) controller.Unlink();
      }
    }
    else if (list === this.objects && !loading)
    {
      // Carbon's shared HandleChildrenListModified (EveSpaceObjectChild.h:340-367).
      if (masked === BLUELISTEVENT.BELIST_INSERTED && value) this.RegisterChild(value);
      else if (masked === BLUELISTEVENT.BELIST_REMOVED && value) this.UnregisterChild(value);
      else if (masked === BLUELISTEVENT.BELIST_UNLOADSTART)
      {
        for (const child of this.objects) this.UnregisterChild(child);
      }

      if (masked === BLUELISTEVENT.BELIST_INSERTED && value)
      {
        for (const [ name, variable ] of this._controllerVariables) value.SetControllerVariable(name, variable);
      }

      this._NotifyEntityRegistration(masked, value, this.objects);
    }

    if (list === this.attachments && !loading)
    {
      this._NotifyEntityRegistration(masked, value, this.attachments);
    }

    if (list === this.objects && masked === BLUELISTEVENT.BELIST_INSERTED && this.inheritProperties
      && CjsSchema.cast(value, IEveInheritPropertiesOwner))
    {
      value.SetInheritProperties(this.inheritProperties.GetProperties());
    }
    if (list === this.lights && masked === BLUELISTEVENT.BELIST_INSERTED && this.inheritProperties
      && CjsSchema.cast(value, IEveInheritPropertiesOwner))
    {
      value.SetInheritProperties(this.inheritProperties.GetProperties());
    }
    if (list === this.lights)
    {
      const registry = this.GetComponentRegistry();
      if (registry)
      {
        if (masked === BLUELISTEVENT.BELIST_UNLOADSTART || (masked === BLUELISTEVENT.BELIST_REMOVED && !this.lights.length))
        {
          registry.UnRegisterComponent(EveComponentType.LightOwner, this);
        }
        else if (masked === BLUELISTEVENT.BELIST_INSERTED && this.lights.length === 1)
        {
          registry.RegisterComponent(EveComponentType.LightOwner, this);
        }
      }
    }
  }

  /**
   * Carbon cpp:148-177 and cpp:180-210, identical for objects and attachments:
   * entity registration only matters while this container is itself registered.
   */
  _NotifyEntityRegistration(masked, value, members)
  {
    if (!this.IsInRegistry()) return;
    const registry = this.GetComponentRegistry();
    if (!registry) return;

    // Carbon casts to EveEntityPtr before registering (cpp:152-176).
    if (masked === BLUELISTEVENT.BELIST_INSERTED)
    {
      const entity = CjsSchema.cast(value, EveEntity);
      if (entity) entity.Register(registry);
    }
    else if (masked === BLUELISTEVENT.BELIST_REMOVED)
    {
      const entity = CjsSchema.cast(value, EveEntity);
      if (entity) entity.UnRegister(registry);
    }
    else if (masked === BLUELISTEVENT.BELIST_UNLOADSTART)
    {
      for (const member of members)
      {
        const entity = CjsSchema.cast(member, EveEntity);
        if (entity) entity.UnRegister(registry);
      }
    }
  }

  /**
   * Appends a child. The registration, the variable replay and the inherited
   * properties are the INSERTED arm's, reached through the managed mutation.
   *
   * Adapted: A JavaScript array has no notify slot, so the owner drives the notification
   * through the shared child service rather than the list driving it.
   */
  @blue.method
  @meta.adapted
  AddToEffectChildrenList(child)
  {
    addChild(this, "objects", child, { listNotify: this });
    return child;
  }

  /**
   * Removes a child by identity; the unregistration is the REMOVED arm's.
   *
   * Adapted: A JavaScript array has no notify slot, so the owner drives the notification
   * through the shared child service rather than the list driving it.
   */
  @blue.method
  @meta.adapted
  RemoveFromEffectChildrenList(child)
  {
    return removeChild(this, "objects", child, { listNotify: this });
  }

  /**
   * Forwards a shader option to every contained child and attachment; the
   * container compiles nothing itself.
   */
  @blue.method
  @meta.implemented
  SetShaderOption(name, value)
  {
    for (const child of this.objects)
    {
      child.SetShaderOption(name, value);
    }
    for (const attachment of this.attachments)
    {
      if (!attachment) continue;
      attachment.SetShaderOption(name, value);
    }
  }

  /**
   * Stores the Granny animation owner supplied by SOF placement; the bone-list
   * override that would consume it awaits the JS animation seam.
   */
  @blue.method
  @meta.implemented
  SetAnimationOwner(animationOwner)
  {
    this.animationOwner = animationOwner ?? null;
  }

  /**
   * Flags this container as a SOF placement root - authored placement state,
   * persisted for interchange parity, with no consumer inside the container
   * itself.
   */
  @blue.method
  @meta.implemented
  SetIsPlacementRoot(isPlacementRoot)
  {
    this.isPlacementRoot = !!isPlacementRoot;
  }

  /**
   * Appends an attachment; attachments are the only thing a container renders
   * itself (HasRenderables) and the only thing GetBatches submits.
   */
  @blue.method
  @meta.implemented
  AddAttachment(attachment)
  {
    // Registering the attachment as an entity is the hook (cpp:180-210).
    addChild(this, "attachments", attachment, { listNotify: this });
  }

  /**
   * Drops every attachment, which also stops the container from contributing any
   * renderable of its own.
   */
  @blue.method
  @meta.implemented
  ClearAttachments()
  {
    this.attachments.length = 0;
  }

  /**
   * Reports whether the container owns nothing at all - no children, lights,
   * attachments, controllers, curve sets, transform modifiers or observers.
   */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  UpdateSyncronous(updateContext, params)
  {
    if (!this.IsUpdating())
    {
      return;
    }

    this._ownerMaxSpeed = Number(params?.ownerMaxSpeed) || 0;

    const newParams = EveChildContainer._DeriveChildParams(params);
    newParams.isVisible = (params?.isVisible !== false) && this.display;
    newParams.childParent = this;
    mat4.copy(newParams.localToWorldTransform, this.worldTransform);

    for (const child of this.objects)
    {
      child.UpdateSyncronous(updateContext, newParams);
    }
    for (const observer of this.observers)
    {
      observer.Update(this.worldTransform);
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
   *
   * Adapted: The GPU bone ring buffer, task-group dispatch, per-object VS/PS struct refresh,
   * and the Granny bone-list override are engine/animation seams; the CPU update fan-out is
   * ported.
   *
   * @param {Object} updateContext - frame context (EveUpdateContext), threaded to modifiers
   * @param {EveChildUpdateParams} params - localToWorldTransform + boneCount/bones
   * @returns {Float32Array} worldTransform
   */
  @blue.method
  @blue.contextual(["camera"])
  @meta.adapted
  UpdateAsyncronous(updateContext, params)
  {
    // Carbon cpp:516: re-arm the once-per-frame palette upload, before the gate.
    this._boneOffsets.AdvanceFrame();

    if (!this.IsUpdating())
    {
      return this.worldTransform;
    }

    const parentTransform = params?.localToWorldTransform;

    // Carbon captures the OUTGOING transform before rebuilding.
    mat4.copy(this._lastWorldTransform, this.worldTransform);

    if (parentTransform && parentTransform.length === 16)
    {
      this.UpdateTransform(parentTransform);
    }

    // Carbon cpp:576-589: inherit the hull's per-object values, rebase the clip
    // data by this child's translation, then stamp our own transforms.
    inheritParentPerObjectData(this._perObjectData, params?.spaceObjectParent, this.translation);
    stampChildTransforms(this._perObjectData, this.worldTransform, this._lastWorldTransform);

    const frequency = params?.controllerUpdateFrequency ?? 0.5;
    for (const controller of this.controllers)
    {
      controller.Update(frequency);
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

    this._activationStrength = Number(params?.activationStrength ?? 1);

    // Carbon (cpp:568-590): when attachments exist the per-object VS/PS
    // structs are refreshed from the parent. This port retains persistent
    // RawData and returns it from GetPerObjectData; no live-object serializer
    // indirection is involved.

    const newParams = EveChildContainer._DeriveChildParams(params);
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
        params.spaceObjectParent.GetWorldVelocity(this._worldVelocity);
        vec3.copy(newParams.worldVelocity, this._worldVelocity);
      }
      else
      {
        vec3.copy(this._worldVelocity, params.worldVelocity ?? ZERO_VEC3);
      }
    }

    for (const child of this.objects)
    {
      child.UpdateAsyncronous(updateContext, newParams);
    }

    // Carbon (cpp:617-624): container-owned curve sets tick with the frame
    // time as BOTH realTime and simTime.
    if (this.curveSets.length)
    {
      const time = updateContext.GetTime();
      for (const curveSet of this.curveSets)
      {
        curveSet.Update__RealTimeSimTime(time, time, updateContext.renderContext);
      }
    }

    for (const fxAttribute of this.fxAttributes)
    {
      fxAttribute.UpdateAsyncronous(updateContext, newParams);
    }

    for (const light of this.lights)
    {
      light.SetBoneMatrix(bones, boneCount);
    }

    for (const attachment of this.attachments)
    {
      if (!attachment) continue;
      attachment.UpdateLights(this.worldTransform, bones, boneCount, this._activationStrength, 0);
    }

    this._hasUpdated = true;
    return this.worldTransform;
  }

  /**
   * Frame visibility fan-out (Carbon EveChildContainer::UpdateVisibility,
   * cpp:379-410): gate on display/IsUpdating, recurse into the children with
   * the unchanged parent transform/LOD, then refresh attachment visibility
   * against this container's world transform.
   * @param {EveUpdateContext} updateContext - frame context
   * @param {Float32Array} parentTransform
   * @param {Number} parentLod - parent Tr2Lod level
   * @returns {Boolean} whether the fan-out ran
   */
  @blue.method
  @meta.implemented
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
      child.UpdateVisibility(updateContext, parentTransform, parentLod);
    }

    if (this.HasRenderables())
    {
      // cpp:398-409 - the container has no updater of its own; the palette
      // comes from whichever object owns the animation.
      const { bones, boneCount } = getBoneList(this.animationOwner ? this.animationOwner.GetAnimationController() : null);

      for (const attachment of this.attachments)
      {
        if (!attachment) continue;
        attachment.UpdateVisibility(updateContext, this.worldTransform, bones, boneCount);
      }
    }
    return true;
  }

  /** Carbon EveChildContainer::GetRenderables (cpp:412-432): the container
   * itself renders only when it owns attachments; children always recurse. */
  @blue.method
  @meta.implemented
  GetRenderables(out = [])
  {
    if (!this.display || !this._hasUpdated)
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
      child.GetRenderables(out);
    }
    return out;
  }

  /** Carbon EveChildContainer::GetBoundingSphere (cpp:434-452): the union of
   * the children's spheres (BoundingSphereSetOrUpdate -> sph3.union). The
   * child sphere is a per-call local rather than module scratch because
   * containers nest - a shared scratch would be clobbered between recursion
   * levels; this is a bounds query, not the per-frame update hot path. */
  @blue.method
  @meta.implemented
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
      if (child.GetBoundingSphere(childSphere))
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

  /** Carbon EveChildContainer::RegisterWithQuadRenderer (cpp:448-458): the
   * children's quad effects, then the attachments'. */
  @blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    for (const child of this.objects)
    {
      child.RegisterWithQuadRenderer(quadRenderer);
    }
    for (const attachment of this.attachments)
    {
      attachment.RegisterWithQuadRenderer(quadRenderer);
    }
  }

  /** Carbon EveChildContainer::AddQuadsToQuadRenderer (cpp:460-488): the
   * children add theirs, then the attachments in world space at full
   * activation, posed by the animation owner's bones. */
  @blue.method
  @meta.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (!this.display || !this._hasUpdated)
    {
      return;
    }
    if (!this.IsRendering())
    {
      return;
    }
    for (const child of this.objects)
    {
      child.AddQuadsToQuadRenderer(frustum, quadRenderer);
    }
    if (this.attachments.length)
    {
      const { bones, boneCount } = getBoneList(this.animationOwner ? this.animationOwner.GetAnimationController() : null);
      for (const attachment of this.attachments)
      {
        attachment.AddToQuadRenderer(quadRenderer, this.worldTransform, 1.0, 0.0, bones, boneCount);
      }
    }
  }

  /**
   * Carbon GetLocalToWorldTransform( Matrix& ) (EveChildContainer.cpp:644-647): copies the world transform into out, and returns out.
   * @param {mat4} out - receives the transform
   * @returns {mat4} out
   */
  @blue.method
  @meta.implemented
  GetLocalToWorldTransform(out)
  {
    return mat4.copy(out, this.worldTransform);
  }

  /** Carbon EveChildContainer::ChangeLOD (cpp:649-655): fan-out only. */
  @blue.method
  @meta.implemented
  ChangeLOD(lod)
  {
    for (const child of this.objects)
    {
      child.ChangeLOD(lod);
    }
  }

  /** Carbon EveChildContainer::GetLights (cpp:657-675): each light is added
   * with the container world transform and the average basis-length scaling
   * ((|X| + |Y| + |Z|) / 3 of the world basis rows - single-matrix reads, no
   * composition). Lights are submitted through the supplied manager. */
  @blue.method
  @meta.implemented
  GetLights(lightManager)
  {
    if (!this.display || !this._hasUpdated)
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
      light.AddLight(lightManager, m, scaling);
    }
  }

  /** Carbon EveChildContainer::GetBatches (cpp:1134-1143): attachments only,
   * gated on display, the NORMAL render reason, and a non-zero activation
   * strength. Returns whether any batch was committed (JS addition; Carbon
   * returns void). */
  @blue.method
  @meta.implemented
  GetBatches(batches, batchType, perObjectData, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    if (!this.display || reason !== Tr2RenderReason.TR2RENDERREASON_NORMAL || this._activationStrength === 0)
    {
      return false;
    }

    let committed = false;
    for (const attachment of this.attachments)
    {
      if (!attachment) continue;
      committed = attachment.GetBatches(batches, batchType, perObjectData, reason) === true || committed;
    }
    return committed;
  }

  /** Carbon EveChildContainer::HasTransparentBatches (cpp:1145-1148). */
  @blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon EveChildContainer::GetSortValue (cpp:1150-1153). */
  @blue.method
  @meta.implemented
  GetSortValue()
  {
    return 0;
  }

  /**
   * Carbon EveChildContainer::GetPerObjectData (cpp:1198-1221): uploads the
   * animation owner's bone palette to the BoneTransforms ring and stamps
   * [current offset, previous offset, bone count], then hands back this
   * container's two PERSISTENT buffers. Before any upload the offsets are
   * INVALID_OFFSET, Carbon's no-draw state. Adapted: Carbon allocates a pooled
   * handle where this port returns the records directly.
   */
  @blue.method
  @meta.adapted
  GetPerObjectData(_accumulator = null)
  {
    if (this.animationOwner)
    {
      const animation = this.animationOwner.GetAnimationController();
      if (animation && animation.IsInitialized())
      {
        const boneCount = animation.GetMeshBoneCount();
        this._perObjectData.vs.SetIndex("boneOffsets", 2, [ boneCount ]);
        const ring = Tr2RingBuffer.GetInstance("Float4x3", 48, Tr2RenderContext_GetMainThreadRenderContext());
        this._boneOffsets.UploadTransforms(ring, animation.GetMeshBoneMatrixList(), boneCount);
      }
    }
    this._perObjectData.vs.SetIndex("boneOffsets", 0, [ this._boneOffsets.GetCurrentFrameOffset() ]);
    this._perObjectData.vs.SetIndex("boneOffsets", 1, [ this._boneOffsets.GetPreviousFrameOffset() ]);

    return { vs: this._perObjectData.vs, ps: this._perObjectData.ps };
  }

  /** Carbon EveChildContainer::HasRenderables (cpp:1129-1132): the container
   * renders only for its attachments. */
  @blue.method
  @meta.implemented
  HasRenderables()
  {
    return this.attachments.length > 0;
  }

  /**
   * Carbon EveChildContainer::IsRendering (cpp:337-362): whether the renderer's
   * current shader model passes this container's display filter.
   *
   * @returns {boolean} Whether the container renders at the current shader model.
   */
  @blue.method
  @meta.implemented
  IsRendering()
  {
    const settings = Tr2Renderer.GetShaderModel();
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
  @blue.method
  @meta.implemented
  IsUpdating()
  {
    return (this.display || !this.updateOnDisplay) &&
      (this.IsRendering() || this.displayFilter === EveChildContainer.DisplayQualityModifier.ONLY_REFLECTIONS);
  }

  /** Carbon EveChildContainer::RegisterComponents (cpp:258-284): LightOwner
   * when lights are authored, then forwards the contained objects and the
   * attachments. Gate m_display && IsUpdating(). */
  @blue.method
  @meta.implemented
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
        const entity = CjsSchema.cast(object, EveEntity);
        if (entity) entity.Register(registry);
      }

      for (const attachment of this.attachments)
      {
        const entity = CjsSchema.cast(attachment, EveEntity);
        if (entity) entity.Register(registry);
      }
    }
  }

  /** Carbon EveChildContainer::UnRegisterComponents (cpp:290-311): forwards
   * the contained objects and attachments only (own components were already
   * removed by EveEntity::UnRegister, EveEntity.cpp:90); no display/IsUpdating
   * re-check. */
  @blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const object of this.objects)
      {
        const entity = CjsSchema.cast(object, EveEntity);
        if (entity) entity.UnRegister(registry);
      }

      for (const attachment of this.attachments)
      {
        const entity = CjsSchema.cast(attachment, EveEntity);
        if (entity) entity.UnRegister(registry);
      }
    }
  }

  /** Carbon EveChildContainer::PlayCurveSet (cpp:682-712): named own sets play
   * (or play a named range); curve-set-owning children are asked too. */
  @blue.method
  @meta.implemented
  PlayCurveSet(name, rangeName = "")
  {
    if (!this.IsUpdating())
    {
      return;
    }

    const target = String(name ?? "");
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() !== target)
      {
        continue;
      }
      if (rangeName)
      {
        curveSet.PlayTimeRange(rangeName);
      }
      else
      {
        curveSet.ResetTimeRange();
        curveSet.Play();
      }
    }

    for (const child of this.objects)
    {
      const owner = CjsSchema.cast(child, ITr2CurveSetOwner);
      if (owner) owner.PlayCurveSet(target, rangeName);
    }
  }

  /** Carbon EveChildContainer::StopCurveSet (cpp:746-768). */
  @blue.method
  @meta.implemented
  StopCurveSet(name)
  {
    if (!this.IsUpdating())
    {
      return;
    }

    const target = String(name ?? "");
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() === target)
      {
        curveSet.Stop();
      }
    }

    for (const child of this.objects)
    {
      const owner = CjsSchema.cast(child, ITr2CurveSetOwner);
      if (owner) owner.StopCurveSet(target);
    }
  }

  /** Carbon EveChildContainer::UpdateCurveSet (cpp:770-786): samples matching
   * own and child sets at an explicit time (both clocks, as Carbon does). */
  @blue.method
  @meta.implemented
  UpdateCurveSet(name, time, renderContext = null)
  {
    const target = String(name ?? "");
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() === target)
      {
        curveSet.Update__RealTimeSimTime(time, time, renderContext);
      }
    }

    for (const child of this.objects)
    {
      const owner = CjsSchema.cast(child, ITr2CurveSetOwner);
      if (owner) owner.UpdateCurveSet(target, time, renderContext);
    }
  }

  /** Carbon EveChildContainer::PlayAllCurveSets (cpp:714-728): children
   * first, then every own set. */
  @blue.method
  @meta.implemented
  PlayAllCurveSets()
  {
    for (const child of this.objects)
    {
      const owner = CjsSchema.cast(child, ITr2CurveSetOwner);
      if (owner) owner.PlayAllCurveSets();
    }
    for (const curveSet of this.curveSets)
    {
      curveSet.Play();
    }
  }

  /** Carbon EveChildContainer::StopAllCurveSets (cpp:730-744). */
  @blue.method
  @meta.implemented
  StopAllCurveSets()
  {
    for (const child of this.objects)
    {
      const owner = CjsSchema.cast(child, ITr2CurveSetOwner);
      if (owner) owner.StopAllCurveSets();
    }
    for (const curveSet of this.curveSets)
    {
      curveSet.Stop();
    }
  }

  /** Carbon EveChildContainer::GetCurveSetDuration (cpp:788-813): maximum
   * GetMaxCurveDuration over matching own and child sets. */
  @blue.method
  @meta.implemented
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
      if (curveSet.GetName() === target)
      {
        duration = Math.max(duration, curveSet.GetMaxCurveDuration());
      }
    }

    for (const child of this.objects)
    {
      const owner = CjsSchema.cast(child, ITr2CurveSetOwner);
      if (owner) duration = Math.max(duration, owner.GetCurveSetDuration(target));
    }
    return duration;
  }

  /** Carbon EveChildContainer::GetRangeDuration (cpp:809-834): maximum named
   * range duration over matching own and child sets. */
  @blue.method
  @meta.implemented
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
      if (curveSet.GetName() === target)
      {
        duration = Math.max(duration, curveSet.GetRangeDuration(rangeName));
      }
    }

    for (const child of this.objects)
    {
      const owner = CjsSchema.cast(child, ITr2CurveSetOwner);
      if (owner) duration = Math.max(duration, owner.GetRangeDuration(target, rangeName));
    }
    return duration;
  }

  /**
   * Carbon EveChildContainer::GetControllerValueByName (cpp:1077-1092):
   * Carbon returns bool with a float& out; the JS port returns the value or
   * null when no action controller exposes the named float variable. The native
   * ITr2ActionController cast filters controllers before the required getter call.
   *
   * Adapted: The bool + float& out-param pair collapses to value-or-null in JS.
   */
  @blue.method
  @meta.adapted
  GetControllerValueByName(name)
  {
    const key = String(name ?? "");
    for (const candidate of this.controllers)
    {
      const controller = CjsSchema.cast(candidate, ITr2ActionController);
      if (!controller) continue;
      const value = controller.GetFloatVariableByName(key);
      if (value !== undefined && value !== null)
      {
        return value;
      }
    }
    return null;
  }

  /** Carbon EveChildContainer::GetWorldVelocity (cpp:1012-1015). */
  @blue.method
  @meta.implemented
  GetWorldVelocity(out = vec3.create())
  {
    return vec3.copy(out, this._worldVelocity);
  }

  /** Carbon EveChildContainer::GetOwnerMaxSpeed (cpp:1073-1076). */
  @blue.method
  @meta.implemented
  GetOwnerMaxSpeed()
  {
    return this._ownerMaxSpeed;
  }

  /** Propagates the owning space object through the complete child subtree. */
  @blue.method
  @meta.implemented
  SetOwner(owner)
  {
    if (this.GetOwner() === owner) return;
    super.SetOwner(owner);
    for (const child of this.objects) child.SetOwner(owner);
  }

  /** Propagates a modular part tag through the complete child subtree. */
  @blue.method
  @meta.implemented
  SetPartTag(tag)
  {
    const next = Number(tag) >>> 0;
    if (this.GetPartTag() === next) return;
    super.SetPartTag(next);
    for (const child of this.objects) child.SetPartTag(next);
  }

  /** Collects locator sets owned by nested children in object-local space. */
  @blue.method
  @meta.implemented
  CollectOwnedLocatorSets(parentTransform, out)
  {
    const childToObject = mat4.create();
    mat4.multiply(childToObject, parentTransform, this.RebuildLocalTransform());
    for (const child of this.objects) child.CollectOwnedLocatorSets(childToObject, out);
  }

  /** Collects geometry owned by nested children in object-local space. */
  @blue.method
  @meta.implemented
  CollectOwnedGeometry(type, parentTransform, out, areaPool)
  {
    const childToObject = mat4.create();
    mat4.multiply(childToObject, parentTransform, this.RebuildLocalTransform());
    for (const child of this.objects) child.CollectOwnedGeometry(type, childToObject, out, areaPool);
  }

  /** Carbon EveChildContainer::SetInheritProperties (cpp:1017-1040): lazily
   * creates the property holder, then fans the color set out to children and
   * lights. */
  @blue.method
  @meta.implemented
  SetInheritProperties(colorSet)
  {
    if (!this.inheritProperties)
    {
      this.inheritProperties = new EveChildInheritProperties();
    }
    this.inheritProperties.SetProperties(colorSet);

    for (const child of this.objects)
    {
      if (CjsSchema.cast(child, IEveInheritPropertiesOwner)) child.SetInheritProperties(colorSet);
    }
    for (const light of this.lights)
    {
      if (CjsSchema.cast(light, IEveInheritPropertiesOwner)) light.SetInheritProperties(colorSet);
    }
  }

  /**
   * Searches named local observers, then children implementing ITr2SoundEmitterOwner.
   * Carbon FindSoundEmitter (EveChildContainer.cpp:1036-1060).
   *
   * @param {string} name Observer name.
   * @returns {ITr2AudEmitter|null} The first matching emitter, or null.
   */
  @blue.method
  @meta.implemented
  FindSoundEmitter(name)
  {
    const target = String(name ?? "");
    for (const observer of this.observers)
    {
      if (observer.name === target)
      {
        return observer.GetObserver();
      }
    }

    for (const child of this.objects)
    {
      const owner = CjsSchema.cast(child, ITr2SoundEmitterOwner);
      if (owner)
      {
        const emitter = owner.FindSoundEmitter(target);
        if (emitter) return emitter;
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
  static _DeriveChildParams(params)
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

  static DisplayQualityModifier = {
    ONLY_REFLECTIONS: 6,
    SHADER_ALL: 5,
    SHADER_HIGHMID: 3,
    SHADER_LOWMID: 1,
    SHADER_HIGH: 4,
    SHADER_MED: 2,
    SHADER_LOW: 0
  };

  static Origin = Origin;

}

// Registered as Carbon registers it (trinity/trinity/Eve/SpaceObject/Children/EveChildContainer_Blue.cpp:24).
be.enums.Create("trinity.EveChildContainer.DisplayQualityModifier", EveChildContainer.DisplayQualityModifier, {
  exposedName: "SetShader", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "None_", value: EveChildContainer.DisplayQualityModifier.SHADER_ALL, description: "Visible to users with all shader settings" },
    { name: "Medium_and_High", value: EveChildContainer.DisplayQualityModifier.SHADER_HIGHMID, description: "Visible for users with shader settings on Medium or High" },
    { name: "Low_and_Medium", value: EveChildContainer.DisplayQualityModifier.SHADER_LOWMID, description: "Visible for users with shader settings on Low or Medium" },
    { name: "High", value: EveChildContainer.DisplayQualityModifier.SHADER_HIGH, description: "Only visible for users with shader settings on High" },
    { name: "Medium", value: EveChildContainer.DisplayQualityModifier.SHADER_MED, description: "Only visible for users with shader settings on Medium" },
    { name: "Low", value: EveChildContainer.DisplayQualityModifier.SHADER_LOW, description: "Only visible for users with shader settings on Low" },
    { name: "Only Reflections", value: EveChildContainer.DisplayQualityModifier.ONLY_REFLECTIONS, description: "Only visible in the reflections" }
  ]
});


// EveChildContainer_Blue.cpp: native exposure; unported contracts: ITr2LightOwner, IShaderConfigurer, IEveSpaceObjectAttachmentOwner.
