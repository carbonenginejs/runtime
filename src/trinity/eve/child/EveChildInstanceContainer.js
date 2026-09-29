// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstanceContainer.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, edit, type, CjsSchema } from "#schema";
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
import { EveEntity } from "../EveEntity.js";
import { Tr2QuadRenderer } from "../../core/Tr2QuadRenderer/index.js";
import { blue } from "#blue";

/** A child that instantiates a source template across a list of authored or locator-driven transforms, forwarding controller and registration calls to the instances. */
@type.define({ className: "EveChildInstanceContainer", family: "eve/child" })
export class EveChildInstanceContainer extends EveChildTransform
{

  /** m_translation (Vector3) [READWRITE, PERSIST] - EveChildInstanceContainer_Blue.cpp:30 */
  @edit.readwrite
  @edit.persist
  @type.vec3
  translation = vec3.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] - EveChildInstanceContainer_Blue.cpp:31 */
  @edit.readwrite
  @edit.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_rotation (Quaternion) [READWRITE, PERSIST] - EveChildInstanceContainer_Blue.cpp:32 */
  @edit.readwrite
  @edit.persist
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
  @edit.notify
  @edit.read
  @edit.persist
  @type.list("IEveChildTransformModifier")
  transformModifiers = [];

  /** m_transforms (PEveChildInstanceTransformStructureList) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveChildInstanceTransform")
  transforms = [];

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.boolean
  display = true;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_isAlwaysOn (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  alwaysOn = false;

  /** m_inheritProperties (EveChildInheritPropertiesPtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.model("EveChildInheritProperties")
  inheritProperties = null;

  /** m_reset (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  reset = true;

  /** m_instances (PIEveSpaceObjectChildVector) [READ] */
  @edit.read
  @type.list("IEveSpaceObjectChild")
  instances = [];

  /** m_locatorSetName (BlueSharedString) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  locatorSet = "";

  /** m_source (IEveSpaceObjectChildPtr) [PERSISTONLY] */
  @edit.readwrite
  @edit.persistOnly
  @type.model("IEveSpaceObjectChild")
  source = null;

  /** m_origin (Origin - enum Origin) [READ] */
  @edit.read
  @type.int32
  @type.enum("trinity.EveSpaceObjectChild.Origin")
  origin = 0;

  /** Carbon EveChildInstanceContainer::GetOwnerMaxSpeed (cpp:362-365). */
  @carbon.method
  @impl.implemented
  GetOwnerMaxSpeed()
  {
    return this._ownerMaxSpeed;
  }

  /** Propagates the owning space object to the source and live instances. */
  @carbon.method
  @impl.implemented
  SetOwner(owner)
  {
    if (this.GetOwner() === owner) return;
    super.SetOwner(owner);
    for (const child of this.instances) child.SetOwner(owner);
    if (this.source) this.source.SetOwner(owner);
  }

  /** Propagates a modular part tag to the source and live instances. */
  @carbon.method
  @impl.implemented
  SetPartTag(tag)
  {
    const next = Number(tag) >>> 0;
    if (this.GetPartTag() === next) return;
    super.SetPartTag(next);
    for (const child of this.instances) child.SetPartTag(next);
    if (this.source) this.source.SetPartTag(next);
  }

  /** Replaces the source and requests native instance recreation (cpp:116). */
  @carbon.method
  @impl.implemented
  SetSourceEffect(sourceEffect)
  {
    this.SetSource(sourceEffect);
    this.reset = true;
  }

  /** Returns the authored source (cpp:122). */
  @carbon.method
  @impl.implemented
  GetSource()
  {
    return this.source;
  }

  /** Transfers child ownership and the source's edit-mode registration (cpp:128). */
  @carbon.method
  @impl.implemented
  SetSource(source)
  {
    const registry = this.GetComponentRegistry();
    CjsSchema.cast(this.source, EveEntity)?.UnRegister(registry);
    this.UnregisterChild(this.source);
    this.source = source;
    this.RegisterChild(source);
    if (!this.instances.length && !this.disableEditMode)
      CjsSchema.cast(source, EveEntity)?.Register(registry);
  }

  /** Retains an authored transform and immediately creates its instance (cpp:146). */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  CreateInstances(parent)
  {
    this.ClearInstanceList();
    if (!this.source) return;
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

  /** Copies the source with Blue's copier, retaining native wrapper/registration order (cpp:234). */
  @carbon.method
  @impl.implemented
  CreateInstance(scale, rotation, translation, boneIndex = -1)
  {
    if (!this.source) return;
    const translationParent = new EveChildContainer();
    const instance = blue.classes.CopyTo(this.source);
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
  @carbon.method
  @impl.implemented
  UpdateInstance(index, scale, rotation, translation)
  {
    const instance = this.instances[Number(index) >>> 0];
    if (instance) instance.Setup(scale, rotation, translation, Tr2Lod.TR2_LOD_LOW);
  }

  /** Unregisters components and detaches children before clearing (cpp:339). */
  @carbon.method
  @impl.implemented
  ClearInstanceList()
  {
    this.UnRegisterComponents();
    this.UnregisterChildren(this.instances);
    this.instances.length = 0;
  }

  /** Selects whether an empty container exposes its source (cpp:333). */
  @carbon.method
  @impl.implemented
  DisableEditMode(disable)
  {
    this.disableEditMode = disable;
    this.ReRegister();
  }

  /** Sets one instance variable, preserving the donor boundary bug (cpp:557-566). */
  @carbon.method
  @impl.adapted
  SetControllerVariableForInstance(index, name, value)
  {
    index = Number(index) >>> 0;
    // Carbon bug: cpp:559 uses >, not >=. JS throws at size instead of native undefined access.
    if (index > this.instances.length) return;
    this.instances[index].SetControllerVariable(name, value);
  }

  /** Sends one instance event; JS throws at the donor's invalid size boundary (cpp:568-577). */
  @carbon.method
  @impl.adapted
  HandleControllerEventForInstance(index, name)
  {
    index = Number(index) >>> 0;
    // Carbon bug: cpp:570 admits index == size, then dereferences past the vector.
    if (index > this.instances.length) return;
    this.instances[index].HandleControllerEvent(name);
  }

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    this._RunOnInstances(instance => instance.HandleControllerEvent(name));
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name);
    const next = Number(value);
    this.source?.SetControllerVariable(key, next);
    this._controllerVariables.set(key, next);
    this._RunOnInstances(instance => instance.SetControllerVariable(key, next));
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    this._RunOnInstances(instance => instance.StartControllers());
  }

  /** Carbon EveChildInstanceContainer::RunOnInstances (cpp:318-331): with no
   * instances, the source template stands in - but only while edit mode is
   * enabled. */
  _RunOnInstances(func)
  {
    if (!this.instances.length && this.source && !this.disableEditMode)
    {
      func(this.source);
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform = null, parentLod = Tr2Lod.TR2_LOD_HIGH)
  {
    if (!this.display) return;

    this._RunOnInstances(child => child.UpdateVisibility(updateContext, parentTransform, parentLod));
  }

  /** Carbon EveChildInstanceContainer::GetRenderables (cpp:367-375): gated on
   * display AND a completed async update; the std::vector& out-param becomes
   * the returned array. */
  @carbon.method
  @impl.implemented
  GetRenderables(out = [])
  {
    if (!this.display || !this._hasUpdated) return out;

    this._RunOnInstances(child => child.GetRenderables(out));
    return out;
  }

  /** Carbon EveChildInstanceContainer::RegisterWithQuadRenderer (cpp:467-473):
   * the shared source registers once for every instance. */
  @carbon.method
  @impl.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (this.source) this.source.RegisterWithQuadRenderer(quadRenderer);
  }

  /** Carbon EveChildInstanceContainer::AddQuadsToQuadRenderer (cpp:475-478). */
  @carbon.method
  @impl.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    this._RunOnInstances(child => child.AddQuadsToQuadRenderer(frustum, quadRenderer));
  }

  /** Carbon EveChildInstanceContainer::RegisterComponents (cpp:83-103):
   * forwards the instances; with no instances (and edit mode enabled) the source
   * template registers instead. Gate IsInRegistry() && m_display. */
  @carbon.method
  @impl.implemented
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
        this.source?.Register(registry);
      }
    }
  }

  /** Carbon EveChildInstanceContainer::UnRegisterComponents (cpp:105-122):
   * forwards the instances and the source; no display re-check. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    if (this.IsInRegistry())
    {
      const registry = this.GetComponentRegistry();
      for (const instance of this.instances)
      {
        instance?.UnRegister(registry);
      }
      this.source?.UnRegister(registry);
    }
  }

  static _unitScale = vec3.fromValues(1, 1, 1);

  static Origin = Origin;

}
