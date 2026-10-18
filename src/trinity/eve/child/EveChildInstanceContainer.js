// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstanceContainer.h
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { ITr2ControllerOwner } from "../../controllers/ITr2ControllerOwner.js";
import { INotify } from "../../../global/blue/INotify.js";
import { ITr2CurveSetOwner } from "../../curves/ITr2CurveSetOwner.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { CjsSchema, meta, type, blue } from "#schema";
import { quat } from "#math/quat";
import { EveChildTransform } from "./EveChildTransform.js";
import { Origin } from "../../generated/eve/child/enums.js";
import { EveChildUpdateParams } from "../EveChildUpdateParams.js";
import { Tr2Lod } from "../EveLODHelper.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { EveChildContainer } from "./EveChildContainer.js";
import { EveChildInstanceTransform } from "./EveChildInstanceTransform.js";
import { EveChildModifierAttachToBone } from "./modifiers/EveChildModifierAttachToBone.js";
import { EveSpaceObject2 } from "../spaceObject/EveSpaceObject2.js";
import { IShaderConfigurer } from "../../shader/IShaderConfigurer.js";
import { EveEntity } from "../EveEntity.js";
import { Tr2QuadRenderer } from "../../core/Tr2QuadRenderer/index.js";
import { be, IsMatch } from "#blue";
import { IEveEffectChildrenOwner } from "./IEveEffectChildrenOwner.js";

/** A child that instantiates a source template across a list of authored or locator-driven transforms, forwarding controller and registration calls to the instances. */
@blue.define("EveChildInstanceContainer")
@blue.inherit(ITr2CurveSetOwner, INotify, IListNotify, ITr2ControllerOwner)
@blue.interface(EveSpaceObjectChild, IEveSpaceObjectChild, ITr2CurveSetOwner, INotify, IEveEffectChildrenOwner, ITr2ControllerOwner, IListNotify, EveEntity, IShaderConfigurer)
@blue.inherit(IEveEffectChildrenOwner)
export class EveChildInstanceContainer extends EveChildTransform
{

  /** m_translation (Vector3) [READWRITE, PERSIST] - EveChildInstanceContainer_Blue.cpp:30 */
  @blue.readwrite
  @blue.persist
  @type.vec3
  translation = vec3.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] - EveChildInstanceContainer_Blue.cpp:31 */
  @blue.readwrite
  @blue.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_localTransform (Matrix) [READWRITE, PERSIST] (EveChildInstanceContainer_Blue.cpp:33) */
  @blue.readwrite
  @blue.persist
  @type.mat4
  localTransform = mat4.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] - EveChildInstanceContainer_Blue.cpp:32 */
  @blue.readwrite
  @blue.persist
  @type.quat
  rotation = quat.create();

  _controllerVariables = new Map();

  /** Native non-persisted edit-mode gate (cpp:43). */
  disableEditMode = false;

  // Carbon m_hasUpdated: set by UpdateAsyncronous, gates GetRenderables.
  _hasUpdated = false;

  // Carbon m_ownerMaxSpeed, captured from the sync params each frame.
  _ownerMaxSpeed = 0;

  // Carbon m_worldVelocity, sampled from a space-object-rooted parent.
  _worldVelocity = vec3.create();

  /** m_transformModifiers (PIEveChildTransformModifierVector) [READ, PERSIST, NOTIFY] */
  @blue.notify
  @blue.read
  @blue.persist
  @type.list("IEveChildTransformModifier")
  transformModifiers = [];

  /** m_transforms (PEveChildInstanceTransformStructureList) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.structList("EveChildInstanceTransform")
  transforms = [];

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  display = true;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_isAlwaysOn (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  alwaysOn = false;

  /** m_inheritProperties (EveChildInheritPropertiesPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveChildInheritProperties")
  inheritProperties = null;

  /** m_reset (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  reset = true;

  /** m_instances (PIEveSpaceObjectChildVector) [READ] */
  @blue.read
  @type.list("IEveSpaceObjectChild")
  instances = [];

  /** m_locatorSetName (BlueSharedString) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.string
  locatorSet = "";

  /**
   * m_source (EveSpaceObjectChildPtr, protected, h:154), persisted under its
   * exposed name by MAP_ATTRIBUTE "source" PERSISTONLY
   * (EveChildInstanceContainer_Blue.cpp:58). Readers write it directly,
   * bypassing the setter; OnModified then requests recreation.
   */
  @blue.attribute("source")
  @blue.persistOnly
  @type.rootRef("IEveSpaceObjectChild")
  _source = null;

  /**
   * Carbon MAP_PROPERTY "source" over GetSource/SetSource
   * (EveChildInstanceContainer_Blue.cpp:59): the setter moves child ownership
   * and the source's edit-mode registration to the replacement.
   */
  @blue.property()
  @type.rootRef("IEveSpaceObjectChild")
  @meta.implemented
  get source()
  {
    return this.GetSource();
  }

  /** Transfers child ownership and edit-mode registration to the replacement. */
  @meta.implemented
  set source(value)
  {
    this.SetSource(value);
  }

  /** m_origin (Origin - enum Origin) [READ] */
  @blue.read
  @type.int32
  @type.enum("trinity.EveSpaceObjectChild.Origin")
  origin = 0;

  /** Carbon EveChildInstanceContainer::GetOwnerMaxSpeed (cpp:362-365). */
  @blue.method
  @meta.implemented
  GetOwnerMaxSpeed()
  {
    return this._ownerMaxSpeed;
  }

  /** Propagates the owning space object to the source and live instances. */
  @blue.method
  @meta.implemented
  SetOwner(owner)
  {
    if (this.GetOwner() === owner) return;
    super.SetOwner(owner);
    for (const child of this.instances) child.SetOwner(owner);
    if (this._source) this._source.SetOwner(owner);
  }

  /** Propagates a modular part tag to the source and live instances. */
  @blue.method
  @meta.implemented
  SetPartTag(tag)
  {
    const next = Number(tag) >>> 0;
    if (this.GetPartTag() === next) return;
    super.SetPartTag(next);
    for (const child of this.instances) child.SetPartTag(next);
    if (this._source) this._source.SetPartTag(next);
  }

  /** Carbon EveChildInstanceContainer.cpp:160-166: modifiers invalidate distributed instances. */
  @blue.method
  @meta.implemented
  OnListModified(_event, _key = 0, _key2 = 0, _value = null, list = null)
  {
    if (list === this.transformModifiers) this.reset = true;
  }

  /**
   * Carbon EveChildInstanceContainer::OnModified (cpp:61-72): a new source or
   * locator set recreates the instances on the next update; a display change
   * re-registers with the scene component registry.
   *
   * @param {*} [value=null] The modified member, by exposed name.
   * @returns {boolean} Always true.
   */
  @blue.method
  @meta.implemented
  OnModified(value = null)
  {
    // Blue's `locatorSet` is m_locatorSetName.
    if (IsMatch(value, "source") || IsMatch(value, "locatorSet"))
    {
      this.reset = true;
    }
    if (IsMatch(value, "display"))
    {
      this.ReRegister();
    }
    return true;
  }

  /** Replaces the source and requests native instance recreation (cpp:116). */
  @blue.method
  @meta.implemented
  SetSourceEffect(sourceEffect)
  {
    this.SetSource(sourceEffect);
    this.reset = true;
  }

  /** Returns the authored source (cpp:122). */
  @blue.method
  @meta.implemented
  GetSource()
  {
    return this._source;
  }

  /** Transfers child ownership and the source's edit-mode registration (cpp:128). */
  @blue.method
  @meta.implemented
  SetSource(source)
  {
    const registry = this.GetComponentRegistry();
    CjsSchema.cast(this._source, EveEntity)?.UnRegister(registry);
    this.UnregisterChild(this._source);
    this._source = source;
    this.RegisterChild(source);
    if (!this.instances.length && !this.disableEditMode)
      CjsSchema.cast(source, EveEntity)?.Register(registry);
  }

  /** Retains an authored transform and immediately creates its instance (cpp:146). */
  @blue.method
  @meta.implemented
  AddInstanceTransform(scale, rotation, translation, boneIndex = -1)
  {
    const transform = new EveChildInstanceTransform();
    vec3.copy(transform.scale, scale);
    quat.copy(transform.rotation, rotation);
    vec3.copy(transform.translation, translation);
    transform.boneIndex = boneIndex;
    this.transforms.push(transform);
    this.CreateInstance(scale, rotation, translation, boneIndex);
    this.reset = false;
  }

  /** Recreates locator instances first, followed by authored transforms (cpp:194). */
  @blue.method
  @meta.implemented
  CreateInstances(parent)
  {
    this.ClearInstanceList();
    if (!this._source) return;
    if (this.locatorSet)
    {
      const spaceObject = CjsSchema.cast(parent, EveSpaceObject2);
      const locators = spaceObject?.GetLocatorsForSet(this.locatorSet);
      if (locators) for (const locator of locators)
        this.CreateInstance(EveChildInstanceContainer._unitScale, locator.direction, locator.position, locator.boneIndex);
    }
    for (const transform of this.transforms)
      this.CreateInstance(transform.scale, transform.rotation, transform.translation, transform.boneIndex);
  }

  /** Carbon GetEffectChildByName (cpp:513-517): none; the instances are not named children. */
  @blue.method
  @meta.implemented
  GetEffectChildByName(_name)
  {
    return null;
  }

  /** Carbon AddToEffectChildrenList (cpp:519-522): does nothing. */
  @blue.method
  @meta.implemented
  AddToEffectChildrenList(_child)
  {
  }

  /** Carbon RemoveFromEffectChildrenList (cpp:524-527): does nothing. */
  @blue.method
  @meta.implemented
  RemoveFromEffectChildrenList(_child)
  {
  }

  /** Copies the source with Blue's copier, retaining native wrapper/registration order (cpp:234). */
  @blue.method
  @meta.implemented
  CreateInstance(scale, rotation, translation, boneIndex = -1)
  {
    if (!this._source) return;
    const translationParent = new EveChildContainer();
    const instance = be.classes.CopyTo(this._source, null);
    if (!instance) return;
    for (const modifier of this.transformModifiers) instance.AddTransformModifier(modifier);
    translationParent.AddToEffectChildrenList(instance);
    translationParent.Setup(scale, rotation, translation, Tr2Lod.TR2_LOD_LOW);
    translationParent.Initialize();
    for (const [name, value] of this._controllerVariables) translationParent.SetControllerVariable(name, value);
    translationParent.StartControllers();
    let root = translationParent;
    if (boneIndex >= 0)
    {
      root = new EveChildContainer();
      const modifier = new EveChildModifierAttachToBone();
      modifier.SetBoneIndex(boneIndex);
      root.AddTransformModifier(modifier);
      root.AddToEffectChildrenList(translationParent);
    }
    root.RegisterWithQuadRenderer(Tr2QuadRenderer.Instance());
    root.Register(this.GetComponentRegistry());
    root.SetOwner(this.GetOwner());
    root.SetParent(this);
    root.SetPartTag(this.GetPartTag());
    this.instances.push(root);
  }

  /** Updates an existing root; an absent list entry is ignored (cpp:301). */
  @blue.method
  @meta.implemented
  UpdateInstance(index, scale, rotation, translation)
  {
    const instance = this.instances[Number(index) >>> 0];
    if (instance) instance.Setup(scale, rotation, translation, Tr2Lod.TR2_LOD_LOW);
  }

  /** Unregisters components and detaches children before clearing (cpp:339). */
  @blue.method
  @meta.implemented
  ClearInstanceList()
  {
    this.UnRegisterComponents();
    this.UnregisterChildren(this.instances);
    this.instances.length = 0;
  }

  /**
   * Carbon PopFront (EveChildInstanceContainer.cpp:346-360): removes the oldest
   * instance, unregistering it first when this container is in a registry.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  PopFront()
  {
    if (this.instances.length)
    {
      const front = CjsSchema.cast(this.instances[0], EveEntity);
      if (front && this.IsInRegistry())
      {
        front.UnRegister(this.GetComponentRegistry());
      }
      this.UnregisterChild(this.instances[0]);
      this.instances.splice(0, 1);
    }
  }

  /** Selects whether an empty container exposes its source (cpp:333). */
  @blue.method
  @meta.implemented
  DisableEditMode(disable)
  {
    this.disableEditMode = disable;
    this.ReRegister();
  }

  /** Sets one instance variable, preserving the donor boundary bug (cpp:557-566). */
  @blue.method
  @meta.adapted
  SetControllerVariableForInstance(index, name, value)
  {
    index = Number(index) >>> 0;
    // Carbon bug: cpp:559 uses >, not >=. JS throws at size instead of native undefined access.
    if (index > this.instances.length) return;
    this.instances[index].SetControllerVariable(name, value);
  }

  /** Sends one instance event; JS throws at the donor's invalid size boundary (cpp:568-577). */
  @blue.method
  @meta.adapted
  HandleControllerEventForInstance(index, name)
  {
    index = Number(index) >>> 0;
    // Carbon bug: cpp:570 admits index == size, then dereferences past the vector.
    if (index > this.instances.length) return;
    this.instances[index].HandleControllerEvent(name);
  }

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  HandleControllerEvent(name)
  {
    this._RunOnInstances(instance => instance.HandleControllerEvent(name));
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name);
    const next = Number(value);
    this._source?.SetControllerVariable(key, next);
    this._controllerVariables.set(key, next);
    this._RunOnInstances(instance => instance.SetControllerVariable(key, next));
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  StartControllers()
  {
    this._RunOnInstances(instance => instance.StartControllers());
  }

  /** Carbon EveChildInstanceContainer::PlayCurveSet (cpp:579-588): every curve-set-owning instance plays it. */
  @blue.method
  @meta.implemented
  PlayCurveSet(name, rangeName = "")
  {
    this._RunOnInstances(instance => {
      const owner = CjsSchema.cast(instance, ITr2CurveSetOwner);
      if (owner) owner.PlayCurveSet(name, rangeName);
    });
  }

  /** Carbon EveChildInstanceContainer::StopCurveSet (cpp:590-600). */
  @blue.method
  @meta.implemented
  StopCurveSet(name)
  {
    this._RunOnInstances(instance => {
      const owner = CjsSchema.cast(instance, ITr2CurveSetOwner);
      if (owner) owner.StopCurveSet(name);
    });
  }

  /** Carbon EveChildInstanceContainer::UpdateCurveSet (cpp:602-611). */
  @blue.method
  @meta.implemented
  UpdateCurveSet(name, time)
  {
    this._RunOnInstances(instance => {
      const owner = CjsSchema.cast(instance, ITr2CurveSetOwner);
      if (owner) owner.UpdateCurveSet(name, time);
    });
  }

  /** Carbon EveChildInstanceContainer::GetCurveSetDuration (cpp:613-623): the source template answers. */
  @blue.method
  @meta.implemented
  GetCurveSetDuration(name)
  {
    const owner = CjsSchema.cast(this._source, ITr2CurveSetOwner);
    return owner ? owner.GetCurveSetDuration(name) : 0;
  }

  /** Carbon EveChildInstanceContainer::GetRangeDuration (cpp:625-635): the source template answers. */
  @blue.method
  @meta.implemented
  GetRangeDuration(name, rangeName)
  {
    const owner = CjsSchema.cast(this._source, ITr2CurveSetOwner);
    return owner ? owner.GetRangeDuration(name, rangeName) : 0;
  }

  /** Carbon EveChildInstanceContainer::PlayAllCurveSets (cpp:637-646): only container instances are asked. */
  @blue.method
  @meta.implemented
  PlayAllCurveSets()
  {
    this._RunOnInstances(instance => {
      const container = CjsSchema.cast(instance, EveChildContainer);
      if (container) container.PlayAllCurveSets();
    });
  }

  /** Carbon EveChildInstanceContainer::StopAllCurveSets (cpp:648-657): only container instances are asked. */
  @blue.method
  @meta.implemented
  StopAllCurveSets()
  {
    this._RunOnInstances(instance => {
      const container = CjsSchema.cast(instance, EveChildContainer);
      if (container) container.StopAllCurveSets();
    });
  }

  /**
   * Forwards a shader option to the instances, or to the editable source when
   * no instances exist (Carbon EveChildInstanceContainer.cpp:490-493).
   * @param {string} name Shader option name.
   * @param {string} value Shader option value.
   */
  @blue.method
  @meta.implemented
  SetShaderOption(name, value)
  {
    this._RunOnInstances(instance => instance.SetShaderOption(name, value));
  }

  /** Carbon EveChildInstanceContainer::RunOnInstances (cpp:318-331): with no
   * instances, the source template stands in - but only while edit mode is
   * enabled. */
  _RunOnInstances(func)
  {
    if (!this.instances.length && this._source && !this.disableEditMode)
    {
      func(this._source);
      return;
    }
    for (const instance of this.instances)
    {
      if (instance) func(instance);
    }
  }

  /** Carbon copies the incoming params before overriding (cpp:404-407,
   * 429-432); the duck-tolerant reads mirror EveChildContainer, because the
   * turret ambient path passes a plain object literal, not a full params. */
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

  /** Recreates pending instances, captures owner speed, and forwards native child params (cpp:388-410). */
  @blue.method
  @meta.implemented
  UpdateSyncronous(updateContext, params)
  {
    if (!this.display) return;

    if (this.reset)
    {
      this.CreateInstances(params?.spaceObjectParent ?? null);
      this.reset = false;
    }
    this._ownerMaxSpeed = Number(params?.ownerMaxSpeed) || 0;

    const newParams = EveChildInstanceContainer._DeriveChildParams(params);
    newParams.isVisible = (params?.isVisible !== false) && this.display;
    newParams.childParent = this;
    mat4.copy(newParams.localToWorldTransform, this.worldTransform);

    this._RunOnInstances(child => child.UpdateSyncronous(updateContext, newParams));
  }

  /** Carbon EveChildInstanceContainer::UpdateAsyncronous (cpp:418-443):
   * rebuild the world transform from the parent, fan out with childParent
   * params, sample the owner's world velocity when space-object rooted, and
   * arm GetRenderables. The Matrix-overload declaration at header:64 has no
   * definition - it exists only to un-hide the base overload under C++ name
   * hiding, so JS ports ONE method. */
  @blue.method
  @meta.implemented
  UpdateAsyncronous(updateContext, params)
  {
    if (!this.display) return;

    const parentTransform = params?.localToWorldTransform;
    if (parentTransform && parentTransform.length === 16)
    {
      this.UpdateTransform(parentTransform);
    }

    const newParams = EveChildInstanceContainer._DeriveChildParams(params);
    newParams.isVisible = (params?.isVisible !== false) && this.display;
    newParams.childParent = this;
    mat4.copy(newParams.localToWorldTransform, this.worldTransform);

    this._RunOnInstances(child => child.UpdateAsyncronous(updateContext, newParams));

    if (params?.spaceObjectParent && !params.childParent)
    {
      params.spaceObjectParent.GetWorldVelocity(this._worldVelocity);
    }

    this._hasUpdated = true;
  }

  /** Carbon EveChildInstanceContainer::UpdateVisibility (cpp:378-386): the
   * display gate, then the parent transform and LOD pass through UNCHANGED -
   * unlike the update pair, which rebase onto this container's transform. */
  @blue.method
  @meta.implemented
  UpdateVisibility(updateContext, parentTransform = null, parentLod = Tr2Lod.TR2_LOD_HIGH)
  {
    if (!this.display) return;

    this._RunOnInstances(child => child.UpdateVisibility(updateContext, parentTransform, parentLod));
  }

  /** Carbon EveChildInstanceContainer::GetRenderables (cpp:367-375): gated on
   * display AND a completed async update; the std::vector& out-param becomes
   * the returned array. */
  @blue.method
  @meta.implemented
  GetRenderables(out = [])
  {
    if (!this.display || !this._hasUpdated) return out;

    this._RunOnInstances(child => child.GetRenderables(out));
    return out;
  }

  /** Carbon EveChildInstanceContainer::RegisterWithQuadRenderer (cpp:467-473):
   * the shared source registers once for every instance. */
  @blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (this._source) this._source.RegisterWithQuadRenderer(quadRenderer);
  }

  /** Carbon EveChildInstanceContainer::AddQuadsToQuadRenderer (cpp:475-478). */
  @blue.method
  @meta.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    this._RunOnInstances(child => child.AddQuadsToQuadRenderer(frustum, quadRenderer));
  }

  /** Carbon EveChildInstanceContainer::RegisterComponents (cpp:83-103):
   * forwards the instances; with no instances (and edit mode enabled) the source
   * template registers instead. Gate IsInRegistry() && m_display. */
  @blue.method
  @meta.implemented
  RegisterComponents()
  {
    if (this.IsInRegistry() && this.display)
    {
      const registry = this.GetComponentRegistry();
      for (const instance of this.instances)
      {
        instance?.Register(registry);
      }

      if (!this.instances.length && !this.disableEditMode)
      {
        this._source?.Register(registry);
      }
    }
  }

  /** Carbon EveChildInstanceContainer::UnRegisterComponents (cpp:105-122):
   * forwards the instances and the source; no display re-check. */
  @blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    if (this.IsInRegistry())
    {
      const registry = this.GetComponentRegistry();
      for (const instance of this.instances)
      {
        instance?.UnRegister(registry);
      }
      this._source?.UnRegister(registry);
    }
  }

  static _unitScale = vec3.fromValues(1, 1, 1);

  static Origin = Origin;

}

// EveChildInstanceContainer_Blue.cpp: native exposure; unported contracts: IShaderConfigurer.
